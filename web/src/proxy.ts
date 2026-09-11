import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";

// Uses the edge-safe config only (no Credentials provider, no Prisma
// import) — Proxy (formerly Middleware, renamed in Next.js 16) runs in
// the Edge runtime and can only validate the existing session
// cookie/JWT, not query the database.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login");
  // "/" is the public marketing landing page (src/components/landing-page.tsx) —
  // signed-out visitors see it, signed-in visitors get bounced to /overview below.
  const isPublicRoute = pathname === "/" || isAuthRoute;

  if (!isLoggedIn && !isPublicRoute) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/overview", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // "images" excluded too — public/images/* backs the landing page's hero
  // screenshot and must load for signed-out visitors.
  matcher: ["/((?!api/auth|_next/static|_next/image|images|favicon.ico).*)"],
};
