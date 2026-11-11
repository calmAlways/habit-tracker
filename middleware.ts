import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, parseSessionCookie } from "./lib/session";
import { APP_ORIGIN } from "./lib/env";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/manifest.webmanifest",
]);

const PUBLIC_PREFIXES = ["/_next/", "/icons/", "/favicon"];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    if (origin !== APP_ORIGIN()) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Invalid origin" } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const cookie = parseSessionCookie(request.headers.get("cookie"));
  const session = cookie ? await verifySession(cookie) : null;
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.webmanifest$).*)"],
};
