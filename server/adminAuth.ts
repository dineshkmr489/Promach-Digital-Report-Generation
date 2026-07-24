import { timingSafeEqual } from "node:crypto";

export type AdminIdentity = {
  name: string;
  email: string;
};

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function credentials(request: Request): { username: string; password: string } | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function adminIdentity(request: Request): AdminIdentity | null {
  const configuredUsername = process.env.ADMIN_USERNAME?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!configuredUsername || !configuredPassword) return null;

  const submitted = credentials(request);
  if (
    !submitted ||
    !safeEqual(submitted.username, configuredUsername) ||
    !safeEqual(submitted.password, configuredPassword)
  ) {
    return null;
  }

  return {
    name: process.env.ADMIN_NAME?.trim() || "Promach Admin",
    email: process.env.ADMIN_EMAIL?.trim() || "admin@promach.local",
  };
}

export function basicAuthRequired(): Response {
  return new Response("Promach administrator authentication required.", {
    status: 401,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "www-authenticate": 'Basic realm="Promach Admin", charset="UTF-8"',
    },
  });
}
