"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { FormState } from "@/components/admin/Form";
import { adminsCopy as copy, ROLES, type AdminRole } from "@/content/admins";
import { requireOwner } from "../session";
import { db, DbError, signOutSession, signUp } from "../supabase";

export type AdminRow = { user_id: string; email: string; role: AdminRole; created_at: string; last_sign_in_at: string | null };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roleOf = (value: FormDataEntryValue | null): AdminRole | undefined => (ROLES as readonly string[]).includes(String(value)) ? (value as AdminRole) : undefined;

/** Every admin with their email, for the Admins page. `ready` is false until the migration is run. */
export async function listAdmins(): Promise<{ ready: boolean; admins: AdminRow[] }> {
  const owner = await requireOwner();
  try {
    return { ready: true, admins: await db<AdminRow[]>(owner.token, "rpc/admin_list", { method: "POST", body: {} }) };
  } catch (err) {
    // PostgREST answers 404 for a function that doesn't exist yet.
    if (err instanceof DbError && err.status === 404) return { ready: false, admins: [] };
    throw err;
  }
}

/** Runs one of the admin functions and turns its answer into the form's message. */
async function run(fn: string, body: Record<string, unknown>, done: (result: string) => string | undefined): Promise<FormState> {
  try {
    const owner = await requireOwner();
    const result = await db<string>(owner.token, `rpc/${fn}`, { method: "POST", body });
    revalidatePath("/admin/admins");
    const ok = done(result);
    if (ok) return { saved: Date.now(), notice: ok };
    return { error: copy.results[result as keyof typeof copy.results] as string ?? copy.results.failed };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof DbError && err.status === 404) return { error: copy.notReady };
    return { error: err instanceof DbError ? copy.results.failed : err instanceof Error ? err.message : copy.results.failed };
  }
}

/**
 * Adds an admin. With a password, the owner creates their login too: an account is made through
 * Supabase's sign-up (email confirmation is off, so it works at once) and the session it returns
 * is ended straight away. Without one, the email must already have an account.
 */
export async function addAdmin(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = roleOf(form.get("role"));
  if (!EMAIL.test(email)) return { error: copy.results.badEmail, fields: { email: copy.results.badEmail } };
  if (password && password.length < 8) return { error: copy.results.shortPassword, fields: { password: copy.results.shortPassword } };
  if (!role) return { error: copy.results.failed };

  let existed = false;
  if (password) {
    try {
      await requireOwner();
    } catch (err) {
      unstable_rethrow(err);
      return { error: err instanceof Error ? err.message : copy.results.failed };
    }
    const made = await signUp(email, password, {}, `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://mglwebsite.vercel.app"}/admin/login`);
    if ("error" in made) {
      // An account with this email already exists: add it as it is, keeping its own password.
      if (made.status === 422 || /already/i.test(made.error)) existed = true;
      else return { error: made.offline ? copy.results.failed : made.error, fields: made.offline ? undefined : { password: made.error } };
    } else if (made.session) {
      await signOutSession(made.session.accessToken);
    }
  }

  return run("admin_add", { target_email: email, new_role: role }, (r) =>
    r === "added" ? (password && !existed ? copy.results.created(email) : existed ? copy.results.addedExisting(email) : copy.results.added(email)) : undefined,
  );
}

export async function setAdminRole(_: FormState, form: FormData): Promise<FormState> {
  const target = String(form.get("user") ?? "");
  const role = roleOf(form.get("role"));
  if (!UUID.test(target) || !role) return { error: copy.results.failed };
  return run("admin_set_role", { target, new_role: role }, (r) => (r === "updated" ? copy.results.updated : undefined));
}

export async function removeAdmin(_: FormState, form: FormData): Promise<FormState> {
  const target = String(form.get("user") ?? "");
  if (!UUID.test(target)) return { error: copy.results.failed };
  return run("admin_remove", { target }, (r) => (r === "removed" ? copy.results.removed : undefined));
}
