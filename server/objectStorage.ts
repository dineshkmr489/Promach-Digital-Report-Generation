import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

const DEFAULT_REGION = "ap-southeast-1";
const DEFAULT_BUCKET = "digi-repo-gen";
const FILE_LINK_SECONDS = 60 * 60;

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export type StoredObject = {
  body: ArrayBuffer;
  contentType: string;
  etag: string | null;
};

export type StorageObjectRecord = {
  key: string;
  versionId: string;
  isLatest: boolean;
  sizeBytes: number;
  lastModified: string;
  etag: string;
  storageClass: string;
};

function region(): string {
  return process.env.AWS_REGION?.trim() || DEFAULT_REGION;
}

function bucket(): string {
  return process.env.S3_BUCKET?.trim() || DEFAULT_BUCKET;
}

function credentials(): AwsCredentials {
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_ROOT_ACCESS_KEY?.trim() ||
    "";
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_ROOT_SECRET_ACCESS_KEY?.trim() ||
    "";
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 credentials are unavailable. Configure an EC2 IAM role or AWS access-key environment variables.",
    );
  }
  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env.AWS_SESSION_TOKEN?.trim() || undefined,
  };
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function signingKey(secret: string, date: string, awsRegion: string): Buffer {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, awsRegion);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function encodedObjectPath(key: string): string {
  return `/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function objectKey(reference: string): string | null {
  const prefix = `s3://${bucket()}/`;
  if (!reference.startsWith(prefix)) return null;
  const key = reference.slice(prefix.length);
  return key && !key.includes("..") ? key : null;
}

function accessSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || "";
  if (!secret) {
    throw new Error("AUTH_SECRET is required to issue private file links.");
  }
  return secret;
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
  );
}

async function signedS3Request(
  method: "GET" | "PUT" | "DELETE",
  key: string,
  body: Uint8Array = new Uint8Array(),
  contentType?: string,
  query: Record<string, string> = {},
): Promise<Response> {
  const awsRegion = region();
  const targetBucket = bucket();
  const host = `${targetBucket}.s3.${awsRegion}.amazonaws.com`;
  const path = encodedObjectPath(key);
  const canonicalQuery = Object.entries(query)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${awsEncode(name)}=${awsEncode(value)}`)
    .join("&");
  const url = `https://${host}${path}${canonicalQuery ? `?${canonicalQuery}` : ""}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const awsCredentials = credentials();
  const signedHeaders = [
    "host",
    "x-amz-content-sha256",
    "x-amz-date",
    ...(contentType ? ["content-type"] : []),
    ...(awsCredentials.sessionToken ? ["x-amz-security-token"] : []),
  ].sort();
  const headerValues: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headerValues["content-type"] = contentType;
  if (awsCredentials.sessionToken) {
    headerValues["x-amz-security-token"] = awsCredentials.sessionToken;
  }
  const canonicalHeaders = signedHeaders
    .map((name) => `${name}:${headerValues[name].trim()}\n`)
    .join("");
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");
  const scope = `${date}/${awsRegion}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = createHmac(
    "sha256",
    signingKey(awsCredentials.secretAccessKey, date, awsRegion),
  )
    .update(stringToSign)
    .digest("hex");
  const headers = new Headers(headerValues);
  headers.set(
    "authorization",
    `AWS4-HMAC-SHA256 Credential=${awsCredentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`,
  );
  const uploadBody = new ArrayBuffer(body.byteLength);
  new Uint8Array(uploadBody).set(body);
  const response = await fetch(url, {
    method,
    headers,
    body: method === "PUT" ? uploadBody : undefined,
  });
  if (!response.ok) {
    throw new Error(`S3 ${method} failed with status ${response.status}.`);
  }
  return response;
}

function safeSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "file";
}

export async function storeDataUrl(
  dataUrl: string,
  prefix: string,
  filename: string,
): Promise<string> {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("The uploaded file data is invalid.");
  const bytes = Buffer.from(match[2], "base64");
  const extension =
    match[1] === "image/png"
      ? "png"
      : match[1] === "image/webp"
        ? "webp"
        : match[1] === "application/pdf"
          ? "pdf"
          : "jpg";
  const baseName = safeSegment(filename.replace(/\.[^.]+$/, ""));
  const key = `${prefix}/${randomUUID()}-${baseName}.${extension}`;
  await signedS3Request("PUT", key, bytes, match[1]);
  return `s3://${bucket()}/${key}`;
}

export async function storeBytes(
  bytes: Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  await signedS3Request("PUT", key, bytes, contentType);
  return `s3://${bucket()}/${key}`;
}

export async function deleteStoredObject(reference: string): Promise<void> {
  const key = objectKey(reference);
  if (!key) return;
  await signedS3Request("DELETE", key);
}

export async function readStoredObject(key: string): Promise<StoredObject> {
  if (!key || key.includes("..")) throw new Error("Invalid S3 object key.");
  const response = await signedS3Request("GET", key);
  return {
    body: await response.arrayBuffer(),
    contentType:
      response.headers.get("content-type") || "application/octet-stream",
    etag: response.headers.get("etag"),
  };
}

function xmlValue(xml: string, name: string): string {
  const match = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`).exec(xml);
  return match?.[1]
    ?.replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'") ?? "";
}

export async function listStoredObjects(): Promise<StorageObjectRecord[]> {
  const objects: StorageObjectRecord[] = [];
  let keyMarker = "";
  let versionIdMarker = "";
  do {
    const response = await signedS3Request(
      "GET",
      "",
      new Uint8Array(),
      undefined,
      {
        "encoding-type": "url",
        "max-keys": "1000",
        versions: "",
        ...(keyMarker ? { "key-marker": keyMarker } : {}),
        ...(versionIdMarker
          ? { "version-id-marker": versionIdMarker }
          : {}),
      },
    );
    const xml = await response.text();
    for (const match of xml.matchAll(/<Version>([\s\S]*?)<\/Version>/g)) {
      const item = match[1];
      const encodedKey = xmlValue(item, "Key");
      objects.push({
        key: decodeURIComponent(encodedKey),
        versionId: xmlValue(item, "VersionId"),
        isLatest: xmlValue(item, "IsLatest") === "true",
        sizeBytes: Number(xmlValue(item, "Size")) || 0,
        lastModified: xmlValue(item, "LastModified"),
        etag: xmlValue(item, "ETag").replaceAll('"', ""),
        storageClass: xmlValue(item, "StorageClass") || "STANDARD",
      });
    }
    const isTruncated = xmlValue(xml, "IsTruncated") === "true";
    keyMarker = isTruncated
      ? decodeURIComponent(xmlValue(xml, "NextKeyMarker"))
      : "";
    versionIdMarker = isTruncated
      ? xmlValue(xml, "NextVersionIdMarker")
      : "";
  } while (keyMarker);
  return objects.sort((left, right) =>
    right.lastModified.localeCompare(left.lastModified),
  );
}

export function storageReferenceToAccessPath(reference: string): string {
  const key = objectKey(reference);
  if (!key) return reference;
  const encodedKey = Buffer.from(key, "utf8").toString("base64url");
  const expires = Math.floor(Date.now() / 1_000) + FILE_LINK_SECONDS;
  const signature = createHmac("sha256", accessSecret())
    .update(`${encodedKey}.${expires}`)
    .digest("base64url");
  return `/api/files/${encodedKey}?expires=${expires}&signature=${signature}`;
}

export function verifyStorageAccess(
  encodedKey: string,
  expiresValue: string | null,
  submittedSignature: string | null,
): string | null {
  const expires = Number(expiresValue);
  if (
    !encodedKey ||
    !Number.isInteger(expires) ||
    expires < Math.floor(Date.now() / 1_000) ||
    !submittedSignature
  ) {
    return null;
  }
  const expected = createHmac("sha256", accessSecret())
    .update(`${encodedKey}.${expires}`)
    .digest("base64url");
  if (!safeEqual(expected, submittedSignature)) return null;
  try {
    const key = Buffer.from(encodedKey, "base64url").toString("utf8");
    return key && !key.includes("..") ? key : null;
  } catch {
    return null;
  }
}
