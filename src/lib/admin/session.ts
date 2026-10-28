/**
 * Who is signed in to the admin. The session lives in two httpOnly cookies (access and refresh
 * token); `src/proxy.ts` refreshes the access token before it runs out. Server only.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { COOKIES, db, userOf, type Session } from "./supabase";

export type Admin = { id: string; email?: string; role: "owner" | "editor"; token: string };

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Stores a fresh session. Server Functions and Route Handlers only. */
export async function storeSession(session: Session) {
  const jar = await cookies();
  jar.set(COOKIES.access, session.accessToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
  jar.set(COOKIES.refresh, session.refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIES.access);
  jar.delete(COOKIES.refresh);
}

/** The admin an access token belongs to, or undefined (expired, or not on the admin list). */
export async function adminOf(token: string): Promise<Admin | undefined> {
  const user = await userOf(token);
  if (!user) return undefined;
  const rows = await db<{ role: Admin["role"] }[]>(token, `admins?user_id=eq.${user.id}&select=role`).catch(() => []);
  if (!rows.length) return undefined;
  return { id: user.id, email: user.email, role: rows[0].role, token };
}

/** The signed-in admin for this request, or undefined. */
export const getAdmin = cache(async (): Promise<Admin | undefined> => {
  const token = (await cookies()).get(COOKIES.access)?.value;
  return token ? adminOf(token) : undefined;
});

/** For admin pages and actions: the admin, or off to the sign-in page. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
