import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type AdminIdentity = {
  name: string;
  email: string;
};

const ADMIN_COOKIE = "promach_admin_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;

type SessionPayload = {
  subject: string;
  expiresAt: number;
};

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function configuredUsername(): string {
  return process.env.ADMIN_USERNAME?.trim() ?? "";
}

function configuredPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

function sessionSecret(): string {
  return process.env.AUTH_SECRET?.trim() || configuredPassword();
}

function signature(value: string): string {
  return createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

function cookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === name) {
      return entry.slice(separator + 1).trim();
    }
  }
  return null;
}

function secureRequest(request: Request): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  return forwardedProtocol === "https" || new URL(request.url).protocol === "https:";
}

function cookieAttributes(request: Request, maxAge: number): string {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secureRequest(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): boolean {
  const expectedUsername = configuredUsername();
  const expectedPassword = configuredPassword();
  if (!expectedUsername || !expectedPassword || !sessionSecret()) return false;
  return (
    safeEqual(username, expectedUsername) &&
    safeEqual(password, expectedPassword)
  );
}

export function createAdminSessionToken(): string {
  const username = configuredUsername();
  const secret = sessionSecret();
  if (!username || !secret) {
    throw new Error(
      "Administrator authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, and AUTH_SECRET.",
    );
  }
  const payload: SessionPayload = {
    subject: username,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function adminSessionCookie(
  request: Request,
  token: string,
): string {
  return `${ADMIN_COOKIE}=${token}; ${cookieAttributes(
    request,
    SESSION_DURATION_SECONDS,
  )}`;
}

export function clearAdminSessionCookie(request: Request): string {
  return `${ADMIN_COOKIE}=; ${cookieAttributes(request, 0)}`;
}

export function adminIdentity(request: Request): AdminIdentity | null {
  const token = cookieValue(request, ADMIN_COOKIE);
  const username = configuredUsername();
  if (!token || !username || !sessionSecret()) return null;

  const [encoded, submittedSignature, extra] = token.split(".");
  if (!encoded || !submittedSignature || extra) return null;
  if (!safeEqual(submittedSignature, signature(encoded))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (
      payload.subject !== username ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    name: process.env.ADMIN_NAME?.trim() || "Promach Admin",
    email: process.env.ADMIN_EMAIL?.trim() || "admin@promach.local",
  };
}
