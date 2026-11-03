/**
 * Who is signed in to MGL Fantasy. Managers sign in with Supabase Auth like admins do, but keep
 * their own two cookies, so being a manager never touches the admin session (or the reverse).
 * `src/proxy.ts` refreshes the access token on /fantasy pages. Server only.
 */

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, DbError, userOf, type AuthUser, type Session } from "@/lib/admin/supabase";
import { cookieOptions } from "@/lib/admin/session";
import { preview } from "./preview";

export const MANAGER_COOKIES = { access: "mgl_mat", refresh: "mgl_mrt", preview: "mgl_preview" } as const;

/** `displayName` is null until they've picked one (or theirs was taken by the time they confirmed). */
export type Manager = { id: string; email?: string; displayName: string | null; token: string; preview?: boolean };

/** Fantasy Core's display-name rule, which the database repeats. */
export const DISPLAY_NAME = /^[A-Za-z0-9 _-]{3,20}$/;

export async function storeManagerSession(session: Session) {
  const jar = await cookies();
  jar.set(MANAGER_COOKIES.access, session.accessToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
  jar.set(MANAGER_COOKIES.refresh, session.refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearManagerSession() {
  const jar = await cookies();
  jar.delete(MANAGER_COOKIES.access);
  jar.delete(MANAGER_COOKIES.refresh);
  jar.delete(MANAGER_COOKIES.preview);
}

type Row = { display_name: string };

/** The manager row for a signed-in user; creates it from the name given at sign-up the first time. */
export async function ensureManagerRow(token: string, user: AuthUser): Promise<string | null> {
  const rows = await db<Row[]>(token, `managers?user_id=eq.${user.id}&select=display_name`);
  if (rows.length) return rows[0].display_name;
  const wanted = String(user.user_metadata?.display_name ?? "").trim();
  if (!DISPLAY_NAME.test(wanted)) return null;
  try {
    await db(token, "managers", { method: "POST", body: { user_id: user.id, display_name: wanted } });
    return wanted;
  } catch (err) {
    // Someone took the name between sign-up and confirming: they pick another on Account.
    if (err instanceof DbError && err.status === 409) return null;
    throw err;
  }
}

/** The signed-in manager for this request, or undefined. */
export const getManager = cache(async (): Promise<Manager | undefined> => {
  const jar = await cookies();
  if (preview && jar.get(MANAGER_COOKIES.preview)) return { id: "preview-manager", email: "preview@mgl.test", displayName: "Preview Manager", token: "preview", preview: true };
  const token = jar.get(MANAGER_COOKIES.access)?.value;
  if (!token) return undefined;
  const user = await userOf(token).catch(() => undefined);
  if (!user) return undefined;
  const rows = await db<Row[]>(token, `managers?user_id=eq.${user.id}&select=display_name`).catch((err) => {
    // Before the managers migration runs, everyone simply has no name yet.
    if (err instanceof DbError && err.status === 404) return [];
    throw err;
  });
  return { id: user.id, email: user.email, displayName: rows[0]?.display_name ?? null, token };
});

/** For pages and actions that need a manager: the manager, or off to sign in (and back after). */
export async function requireManager(next = "/fantasy") {
  const manager = await getManager();
  if (!manager) redirect(`/fantasy/login?next=${encodeURIComponent(next)}`);
  return manager;
}
