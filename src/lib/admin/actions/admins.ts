"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { FormState } from "@/components/admin/Form";
import { adminsCopy as copy, ROLES, type AdminRole } from "@/content/admins";
import { requireOwner } from "../session";
import { db, DbError } from "../supabase";

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

/** Grants privileges to the exact account the owner selected in Supabase Auth. */
export async function addAdmin(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const target = String(form.get("userId") ?? "").trim();
  const role = roleOf(form.get("role"));
  if (!EMAIL.test(email)) return { error: copy.results.badEmail, fields: { email: copy.results.badEmail } };
  if (!UUID.test(target)) return { error: copy.results.badUserId, fields: { userId: copy.results.badUserId } };
  if (!role) return { error: copy.results.failed };

  return run("admin_add_account", { target, target_email: email, new_role: role }, (result) =>
    result === "added" ? copy.results.added(email) : undefined,
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
