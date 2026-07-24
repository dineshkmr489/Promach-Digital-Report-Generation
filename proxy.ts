import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminIdentity, basicAuthRequired } from "./server/adminAuth.ts";

export function proxy(request: NextRequest): Response {
  const { pathname, searchParams } = request.nextUrl;
  const publicClientRequest =
    (pathname === "/" && searchParams.has("sign")) ||
    pathname.startsWith("/api/client/");

  if (publicClientRequest || adminIdentity(request)) {
    return NextResponse.next();
  }
  return basicAuthRequired();
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
