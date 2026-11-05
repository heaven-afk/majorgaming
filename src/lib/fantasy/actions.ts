"use server";

/**
 * Everything a manager does: join, sign in and out, reset a password, rename, save a lineup and
 * make a transfer. Identity always comes from the session cookie, never from the form.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, DbError, publicRpc, sendPasswordReset, signInWithPassword, signOutSession, signUp, updatePassword, userOf } from "@/lib/admin/supabase";
import { FantasyCoreError } from "./client";
import { coreMessage, getGame, makeTransfer, saveLineup, syncName, type Lineup, type Receipt, type TransferInput } from "./game";
import { preview } from "./preview";
import { validLineupInput, validTransferInput } from "./inputs.mjs";
import { clearManagerSession, DISPLAY_NAME, ensureManagerRow, getManager, MANAGER_COOKIES, storeManagerSession } from "./session";

export type AuthState = { error?: string; fields?: Record<string, string>; sent?: string; saved?: number };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFLINE = "Couldn't reach the sign-in service. Check you're online and try again.";

/** Only ever back to a fantasy page. */
const safeNext = (next: string) => (/^\/fantasy(\/[\w-]*)*(\?[\w=&-]*)?$/.test(next) ? next : "/fantasy");

async function origin() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

async function nameTaken(name: string) {
  try {
    return await publicRpc<boolean>("display_name_taken", { name });
  } catch {
    throw new Error("Manager accounts aren't switched on yet. Try again later.");
  }
}

function checkName(name: string, fields: Record<string, string>) {
  if (!DISPLAY_NAME.test(name)) fields.displayName = "Use 3 to 20 letters, numbers, spaces, hyphens or underscores.";
}

export async function join(_: AuthState, form: FormData): Promise<AuthState> {
  const displayName = text(form, "displayName").replace(/\s+/g, " ");
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const fields: Record<string, string> = {};
  checkName(displayName, fields);
  if (!EMAIL.test(email)) fields.email = "Enter a valid email address.";
  if (password.length < 8) fields.password = "Use at least 8 characters.";
  if (Object.keys(fields).length) return { fields };
  try {
    if (await nameTaken(displayName)) return { fields: { displayName: "That name is taken. Try another." } };
  } catch (err) {
    return { error: (err as Error).message };
  }

  const res = await signUp(email, password, { display_name: displayName }, `${await origin()}/fantasy/welcome`);
  if ("error" in res) {
    if (res.offline) return { error: OFFLINE };
    if (/registered|exists/i.test(res.error)) return { fields: { email: "There's already an account with this email. Sign in instead." } };
    if (/password/i.test(res.error)) return { fields: { password: res.error } };
    return { error: res.error };
  }
  // Email confirmation is on, so this is the usual path: check your inbox.
  if (!res.session) return { sent: email };
  await startSession(res.session.accessToken, res.session.refreshToken);
  redirect("/fantasy?welcome=1");
}

/** Keeps a session and makes sure the manager row (and Fantasy Core's copy of the name) exists. */
async function startSession(accessToken: string, refreshToken: string) {
  const user = await userOf(accessToken);
  if (!user) throw new Error("That sign-in link has expired.");
  await storeManagerSession({ accessToken, refreshToken, expiresAt: 0 });
  const name = await ensureManagerRow(accessToken, user).catch(() => null);
  if (name) await syncName(user.id, name).catch(() => {});
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const session = await signInWithPassword(email, password);
  if ("error" in session) {
    if (session.offline) return { error: OFFLINE };
    if (/confirm/i.test(session.error)) return { error: "Confirm your email first: open the link we sent you." };
    return { error: "That email and password don't match an account." };
  }
  await startSession(session.accessToken, session.refreshToken);
  redirect(safeNext(text(form, "next")));
}

/** The link in a confirmation or reset email lands with the session in the address; this keeps it. */
export async function adoptSession(accessToken: string, refreshToken: string, type: string): Promise<{ error: string } | undefined> {
  if (!accessToken || !refreshToken) return { error: "That link is missing its details. Request a new one." };
  try {
    await startSession(accessToken, refreshToken);
  } catch {
    return { error: "That link has expired. Sign in, or request a new one." };
  }
  redirect(type === "recovery" ? "/fantasy/reset" : "/fantasy?welcome=1");
}

export async function signOut() {
  const token = (await cookies()).get(MANAGER_COOKIES.access)?.value;
  if (token) await signOutSession(token);
  await clearManagerSession();
  redirect("/fantasy");
}

export async function forgot(_: AuthState, form: FormData): Promise<AuthState> {
  const email = text(form, "email").toLowerCase();
  if (!EMAIL.test(email)) return { fields: { email: "Enter a valid email address." } };
  const res = await sendPasswordReset(email, `${await origin()}/fantasy/welcome`);
  if ("error" in res && res.offline) return { error: OFFLINE };
  // Same answer whether or not the account exists.
  return { sent: email };
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const manager = await getManager();
  if (!manager || manager.preview) return { error: "That reset link has expired. Request a new one." };
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { fields: { password: "Use at least 8 characters." } };
  const res = await updatePassword(manager.token, password);
  if ("error" in res) return res.offline ? { error: OFFLINE } : { fields: { password: res.error } };
  redirect("/fantasy?reset=1");
}

export async function rename(_: AuthState, form: FormData): Promise<AuthState> {
  const manager = await getManager();
  if (!manager) return { error: "Sign in again." };
  const displayName = text(form, "displayName").replace(/\s+/g, " ");
  const fields: Record<string, string> = {};
  checkName(displayName, fields);
  if (Object.keys(fields).length) return { fields };
  if (displayName === manager.displayName) {
    try { await syncName(manager.id, displayName); return { saved: Date.now() }; }
    catch (err) { return { error: coreMessage(err) }; }
  }
  if (manager.preview) return { error: "The preview manager can't be renamed." };

  const before = manager.displayName;
  const write = (name: string) =>
    before
      ? db(manager.token, `managers?user_id=eq.${manager.id}`, { method: "PATCH", body: { display_name: name } })
      : db(manager.token, "managers", { method: "POST", body: { user_id: manager.id, display_name: name } });
  try {
    await write(displayName);
  } catch (err) {
    if (err instanceof DbError && err.status === 409) return { fields: { displayName: "That name is taken. Try another." } };
    return { error: "Couldn't save your name. Try again." };
  }
  try {
    await syncName(manager.id, displayName);
  } catch (err) {
    // Keep MGL and Fantasy Core in step: put the old name back.
    if (before) await write(before).catch(() => {});
    if (err instanceof FantasyCoreError && err.status === 409) return { fields: { displayName: "That name is taken. Try another." } };
    return { error: coreMessage(err) };
  }
  return { saved: Date.now() };
}

/** Dev only: signs in as the preview manager. */
export async function previewSignIn() {
  if (!preview) return;
  (await cookies()).set(MANAGER_COOKIES.preview, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/fantasy");
}

// ---------- Playing ----------

export type PlayResult = { ok: true; receipt?: Receipt } | { ok: false; error: string; retry?: boolean };

async function playing() {
  const manager = await getManager();
  if (!manager) return { error: "Sign in again." } as const;
  if (!manager.displayName) return { error: "Pick a display name on your account first." } as const;
  const game = await getGame();
  if (game.state !== "ready") return { error: "MGL Fantasy isn't running right now." } as const;
  if (!game.open) return { error: "Transfers are closed for this matchday." } as const;
  return { manager, game };
}

export async function saveSquad(lineup: Lineup): Promise<PlayResult> {
  if (!validLineupInput(lineup)) return { ok: false, error: "That squad isn't complete. Fill every role and pick a captain." };
  const ctx = await playing();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  try {
    await saveLineup(ctx.manager, ctx.game, { starters: lineup.starters.map(({ playerId, role }) => ({ playerId, role })), sub: lineup.sub, captain: lineup.captain, chip: lineup.chip });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof FantasyCoreError ? coreMessage(err) : "Couldn't save your squad. Try again." };
  }
}

export async function transfer(input: TransferInput, key: string): Promise<PlayResult> {
  if (!validTransferInput(input, key))
    return { ok: false, error: "That transfer isn't valid." };
  const ctx = await playing();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  try {
    const clean: TransferInput = { playerOutId: input.playerOutId, playerInId: input.playerInId, useFreeTransferChip: input.useFreeTransferChip };
    if (input.expectedSquadUpdatedAt) clean.expectedSquadUpdatedAt = input.expectedSquadUpdatedAt;
    return { ok: true, receipt: await makeTransfer(ctx.manager, ctx.game, clean, key) };
  } catch (err) {
    // No answer (timeout, dropped connection, server error): the same key makes a retry safe.
    const unknown = !(err instanceof FantasyCoreError) || err.status === 0 || err.status >= 500;
    return { ok: false, error: err instanceof FantasyCoreError ? coreMessage(err) : (err as Error).message, retry: unknown };
  }
}
