"use server";

import { updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { uploadImage } from "@/lib/admin/cloudinary";
import { createEvent, deleteEvent, getEvent, recordMedia, slugTaken, syncTables, updateEvent, type EventInput } from "@/lib/admin/events";
import { adminOf, clearSession, requireAdmin, storeSession } from "@/lib/admin/session";
import { COOKIES, DbError, signInWithPassword, signOutSession } from "@/lib/admin/supabase";
import { cookies } from "next/headers";
import { TAGS } from "@/lib/db";

export type FormState = { error?: string; fields?: Record<string, string>; saved?: number };

// Sign-in ------------------------------------------------------------------------------------

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const session = await signInWithPassword(email, password);
  if ("error" in session) return { error: "That email and password don't match an account." };
  // Signed in, but not on the admin list: don't keep the session.
  if (!(await adminOf(session.accessToken))) {
    await signOutSession(session.accessToken);
    return { error: "This account isn't an MGL admin. Ask the owner to add you." };
  }
  await storeSession(session);
  redirect("/admin");
}

export async function signOut() {
  const token = (await cookies()).get(COOKIES.access)?.value;
  if (token) await signOutSession(token);
  await clearSession();
  redirect("/admin/login");
}

// Events -------------------------------------------------------------------------------------

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (form: FormData, key: string) => {
  const v = String(form.get(key) ?? "").trim();
  return v || null;
};

function count(form: FormData, key: string, fields: Record<string, string>, label: string, min = 0) {
  const v = text(form, key);
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) fields[key] = `${label} must be a whole number${min ? ` of at least ${min}` : ""}.`;
  return n;
}

function date(form: FormData, key: string, fields: Record<string, string>) {
  const v = text(form, key);
  if (v !== null && !DATE.test(v)) fields[key] = "Use a full date.";
  return v;
}

function oneOf<T extends string>(form: FormData, key: string, options: readonly T[], fallback: T): T {
  const v = String(form.get(key) ?? "");
  return (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Reads the editor form into an `events` row, with a message per field that's wrong. */
function readEvent(form: FormData) {
  const fields: Record<string, string> = {};
  const name = text(form, "name");
  if (!name) fields.name = "Give the event a name.";
  const slug = text(form, "slug")?.toLowerCase() ?? null;
  if (!slug) fields.slug = "Add the web address.";
  else if (!SLUG.test(slug)) fields.slug = "Lowercase letters, numbers and single dashes only.";
  const series = text(form, "series");
  if (!series) fields.series = "Add the series, e.g. MGL Season.";

  const format = oneOf(form, "format", ["tiers", "single"] as const, "tiers");
  const tiers = format === "tiers" ? count(form, "tiers", fields, "Tiers", 1) : null;
  if (format === "tiers" && tiers === null) fields.tiers = "How many tiers?";
  if (tiers !== null && tiers > 12) fields.tiers = "Up to 12 tiers.";

  const start_date = date(form, "start_date", fields);
  const end_date = date(form, "end_date", fields);
  if (start_date && end_date && end_date < start_date) fields.end_date = "The event can't end before it starts.";
  const registration_opens = date(form, "registration_opens", fields);
  const registration_closes = date(form, "registration_closes", fields);
  if (registration_opens && registration_closes && registration_closes < registration_opens) fields.registration_closes = "Registration can't close before it opens.";

  const registration_url = text(form, "registration_url");
  if (registration_url && !/^https?:\/\/\S+$/.test(registration_url)) fields.registration_url = "Use a full link starting with https://";

  const matches_played = count(form, "matches_played", fields, "Matches played");
  const matches_total = count(form, "matches_total", fields, "Matches in total");
  if (matches_played !== null && matches_total !== null && matches_played > matches_total) fields.matches_played = "More matches played than in total.";

  // Paragraphs are separated by a blank line.
  const description = String(form.get("description") ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const labels = form.getAll("detail_label").map((v) => String(v).trim());
  const values = form.getAll("detail_value").map((v) => String(v).trim());
  const details = labels.map((label, i) => ({ label, value: values[i] ?? "" })).filter((d) => d.label || d.value);
  if (details.some((d) => !d.label || !d.value)) fields.details = "Each detail needs a label and a value.";

  const input: EventInput = {
    name: name!,
    slug: slug!,
    series: series!,
    kind: oneOf(form, "kind", ["season", "other"] as const, "other"),
    number: count(form, "number", fields, "Number", 1),
    status: oneOf(form, "status", ["upcoming", "live", "final"] as const, "upcoming"),
    format,
    start_date,
    end_date,
    registration_state: oneOf(form, "registration_state", ["closed", "soon", "open", "full"] as const, "closed"),
    registration_opens,
    registration_closes,
    registration_url,
    registration_note: text(form, "registration_note"),
    poster_url: null,
    poster_alt: text(form, "poster_alt"),
    poster_width: null,
    poster_height: null,
    summary: text(form, "summary"),
    description,
    details,
    matches_played,
    matches_total,
    kill_table_size: count(form, "kill_table_size", fields, "Kill table size", 1),
  };
  return { input, tiers: tiers ?? 1, fields };
}

function fail(err: unknown): FormState {
  if (err instanceof DbError && /duplicate key/.test(err.message)) return { error: "Another event already uses that web address." };
  return { error: err instanceof Error ? err.message : "Something went wrong. Try again." };
}

export async function saveEvent(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { input, tiers, fields } = readEvent(form);
  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };

  try {
    if (await slugTaken(admin.token, input.slug, id ?? undefined)) return { error: "Check the highlighted fields.", fields: { slug: "Another event already uses this address." } };

    // The poster: keep it, replace it with an upload, or remove it.
    const current = id ? await getEvent(admin.token, String(form.get("current_slug") ?? input.slug)) : undefined;
    const poster = form.get("poster");
    const { poster_alt, ...rest } = input;
    let posterFields: Pick<EventInput, "poster_url" | "poster_alt" | "poster_width" | "poster_height"> = {
      poster_url: current?.poster_url ?? null,
      poster_width: current?.poster_width ?? null,
      poster_height: current?.poster_height ?? null,
      poster_alt,
    };
    if (poster instanceof File && poster.size > 0) {
      const up = await uploadImage(poster, "mgl/events");
      await recordMedia(admin.token, { url: up.url, public_id: up.publicId, kind: "event", alt: poster_alt ?? input.name, width: up.width, height: up.height, created_by: admin.id }).catch(() => {});
      posterFields = { poster_url: up.url, poster_width: up.width, poster_height: up.height, poster_alt };
    } else if (form.get("remove_poster") === "on") {
      posterFields = { poster_url: null, poster_width: null, poster_height: null, poster_alt: null };
    }

    const row = id ? await updateEvent(admin.token, id, { ...rest, ...posterFields }) : await createEvent(admin.token, { ...rest, ...posterFields });
    if (!row) return { error: "The event wasn't found. It may have been deleted." };
    const synced = await syncTables(admin.token, row.id, input.format, tiers);
    updateTag(TAGS.league);
    if (synced.error) return { error: `Saved, but: ${synced.error}`, fields: { tiers: synced.error } };
    if (!id || (current && current.slug !== row.slug)) redirect(`/admin/events/${row.slug}?saved=1`);
    return { saved: Date.now() };
  } catch (err) {
    unstable_rethrow(err); // the redirect
    return fail(err);
  }
}

export async function removeEvent(id: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (String(form.get("confirm") ?? "").trim() !== String(form.get("expected") ?? "")) return { error: "Type the event's name exactly to delete it." };
  try {
    await deleteEvent(admin.token, id);
  } catch (err) {
    return fail(err);
  }
  updateTag(TAGS.league);
  redirect("/admin?deleted=1");
}
