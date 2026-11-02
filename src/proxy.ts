/**
 * Keeps an admin signed in: before an admin page renders, swaps an access token that has run
 * out (or is about to) for a fresh one, using the refresh token. The public site is untouched.
 */

import { NextResponse, type NextRequest } from "next/server";
import { COOKIES, expiryOf, refreshSession } from "@/lib/admin/supabase";

export async function proxy(request: NextRequest) {
  const access = request.cookies.get(COOKIES.access)?.value;
  const refresh = request.cookies.get(COOKIES.refresh)?.value;
  const signIn = request.nextUrl.pathname === "/admin/login";
  // Signed out: straight to the sign-in page.
  if (!refresh) return signIn ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));
  if (access && expiryOf(access) - Date.now() / 1000 > 60) return NextResponse.next();

  const session = await refreshSession(refresh);
  // Supabase out of reach: keep the session and let the page try (it shows its error card if
  // it can't load). Only a refresh token Supabase actually refuses signs the admin out.
  if ("error" in session && session.offline) return NextResponse.next();
  if ("error" in session) {
    const response = signIn ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete(COOKIES.access);
    response.cookies.delete(COOKIES.refresh);
    return response;
  }

  // The page rendering now reads the new tokens; the browser stores them for next time.
  request.cookies.set(COOKIES.access, session.accessToken);
  request.cookies.set(COOKIES.refresh, session.refreshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(COOKIES.access, session.accessToken, { ...options, maxAge: 60 * 60 * 24 * 7 });
  response.cookies.set(COOKIES.refresh, session.refreshToken, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = { matcher: "/admin/:path*" };
