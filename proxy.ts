import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminIdentity } from "./server/adminAuth.ts";

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (requestedPath !== "/") {
    loginUrl.searchParams.set("next", requestedPath);
  }
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest): Response {
  const { pathname, searchParams } = request.nextUrl;
  const identity = adminIdentity(request);
  const clientSigningRequest =
    (pathname === "/" && searchParams.has("sign")) ||
    pathname.startsWith("/api/client/");
  const publicAuthenticationRequest =
    pathname === "/api/auth/login" || pathname === "/api/auth/logout";

  if (clientSigningRequest || publicAuthenticationRequest) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return identity
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (identity) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Your administrator session has expired. Sign in again." },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  return loginRedirect(request);
}

export const config = {
  matcher: ["/", "/login", "/api/:path*"],
};
