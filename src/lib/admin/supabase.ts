/**
 * The admin's line to Supabase, over its plain HTTP APIs (Auth and the REST API), so the site
 * needs no client library. Every write goes out with the signed-in admin's own access token:
 * row level security (`is_admin()` in the migrations) is what allows it, not this code.
 * Server only.
 */

export type Session = { accessToken: string; refreshToken: string; expiresAt: number };
export type AuthUser = { id: string; email?: string };

export const COOKIES = { access: "mgl_at", refresh: "mgl_rt" } as const;

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.");
  return { url, key };
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number; user: AuthUser };

async function token(grant: "password" | "refresh_token", body: Record<string, string>): Promise<Session | { error: string }> {
  const { url, key } = env();
  const res = await fetch(`${url}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (data as { error_description?: string; msg?: string }).error_description ?? (data as { msg?: string }).msg ?? "Sign-in failed." };
  const t = data as TokenResponse;
  return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: Math.floor(Date.now() / 1000) + t.expires_in };
}

export const signInWithPassword = (email: string, password: string) => token("password", { email, password });
export const refreshSession = (refreshToken: string) => token("refresh_token", { refresh_token: refreshToken });

export async function signOutSession(accessToken: string) {
  const { url, key } = env();
  await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" }).catch(() => {});
}

/** The user an access token belongs to, checked with Supabase (not just decoded). */
export async function userOf(accessToken: string): Promise<AuthUser | undefined> {
  const { url, key } = env();
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!res.ok) return undefined;
  return (await res.json()) as AuthUser;
}

/** When an access token expires (seconds since 1970), read from the token itself. */
export function expiryOf(accessToken: string) {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    return payload.exp ?? 0;
  } catch {
    return 0;
  }
}

export class DbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * One REST API call as the signed-in admin. `path` is the table (or `rpc/...`) with its query,
 * e.g. `events?slug=eq.season-11&select=*`.
 */
export async function db<T = unknown>(accessToken: string, path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string; details?: string };
    throw new DbError(data.message ?? `Database error ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
