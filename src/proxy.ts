import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";

// Optimistic, cookie-only check per Next.js guidance: Proxy runs on every
// request (including prefetches), so it must stay cheap and must never be
// the only line of defense. Every Server Action and page below still calls
// getSession() and re-checks role/ownership against the database — this
// is just the fast "are you even logged in, and is this the right role"
// redirect so a signed-out or wrong-role user never sees the shell flash.
const RECRUITER_PREFIX = "/recruiter";
const PORTAL_PREFIX = "/portal";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith(RECRUITER_PREFIX) || pathname.startsWith(PORTAL_PREFIX);
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith(RECRUITER_PREFIX) && session.role !== "RECRUITER") {
    return NextResponse.redirect(new URL("/portal", request.url));
  }
  if (pathname.startsWith(PORTAL_PREFIX) && session.role !== "CLIENT") {
    return NextResponse.redirect(new URL("/recruiter", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/recruiter/:path*", "/portal/:path*"],
};
