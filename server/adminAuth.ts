import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { UserRole } from "../app/workspaceTypes.ts";

export type AdminIdentity = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
};

const ADMIN_COOKIE = "promach_admin_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;
const PASSWORD_KEY_BYTES = 64;

type SessionPayload = AdminIdentity & {
  expiresAt: number;
  version: 2;
};

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function sessionSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD ||
    ""
  );
}

function signature(value: string): string {
  return createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
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

function parseIdentity(token: string | null): AdminIdentity | null {
  if (!token || !sessionSecret()) return null;
  const [encoded, submittedSignature, extra] = token.split(".");
  if (!encoded || !submittedSignature || extra) return null;
  if (!safeEqual(submittedSignature, signature(encoded))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (
      payload.version !== 2 ||
      !payload.id ||
      !payload.username ||
      !payload.name ||
      !payload.email ||
      !payload.role ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return {
      id: payload.id,
      username: payload.username,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_BYTES).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  try {
    const actual = scryptSync(password, salt, PASSWORD_KEY_BYTES).toString("hex");
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createAdminSessionToken(identity: AdminIdentity): string {
  if (!sessionSecret()) {
    throw new Error(
      "Authentication is not configured. Set AUTH_SECRET or ADMIN_PASSWORD.",
    );
  }
  const payload: SessionPayload = {
    ...identity,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    version: 2,
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

export function adminIdentityFromCookieHeader(
  cookieHeader: string | null,
): AdminIdentity | null {
  return parseIdentity(cookieValue(cookieHeader, ADMIN_COOKIE));
}

export function adminIdentity(request: Request): AdminIdentity | null {
  return adminIdentityFromCookieHeader(request.headers.get("cookie"));
}
