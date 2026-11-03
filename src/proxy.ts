/**
 * Keeps people signed in: before an admin or fantasy page renders, swaps an access token that has
 * run out (or is about to) for a fresh one, using the refresh token. Admins and fantasy managers
 * keep separate cookies. The rest of the public site is untouched.
 */

import { NextResponse, type NextRequest } from "next/server";
import { COOKIES, expiryOf, refreshSession } from "@/lib/admin/supabase";

const MANAGER = { access: "mgl_mat", refresh: "mgl_mrt" };

export async function proxy(request: NextRequest) {
  const admin = request.nextUrl.pathname.startsWith("/admin");
  const names = admin ? COOKIES : MANAGER;
  const access = request.cookies.get(names.access)?.value;
  const refresh = request.cookies.get(names.refresh)?.value;
  const signIn = request.nextUrl.pathname === "/admin/login";
  // Signed out: admins go to their sign-in page; fantasy pages work signed out.
  if (!refresh) return signIn || !admin ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));
  if (access && expiryOf(access) - Date.now() / 1000 > 60) return NextResponse.next();

  const session = await refreshSession(refresh);
  // Supabase out of reach: keep the session and let the page try (it shows its error card if
  // it can't load). Only a refresh token Supabase actually refuses signs them out.
  if ("error" in session && session.offline) return NextResponse.next();
  if ("error" in session) {
    // A fantasy page renders signed out, so it must not see the dead token either.
    if (!admin) request.cookies.delete([names.access, names.refresh]);
    const response = admin && !signIn ? NextResponse.redirect(new URL("/admin/login", request.url)) : NextResponse.next({ request: { headers: request.headers } });
    response.cookies.delete(names.access);
    response.cookies.delete(names.refresh);
    return response;
  }

  // The page rendering now reads the new tokens; the browser stores them for next time.
  request.cookies.set(names.access, session.accessToken);
  request.cookies.set(names.refresh, session.refreshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(names.access, session.accessToken, { ...options, maxAge: 60 * 60 * 24 * 7 });
  response.cookies.set(names.refresh, session.refreshToken, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = { matcher: ["/admin/:path*", "/fantasy/:path*", "/fantasy"] };
