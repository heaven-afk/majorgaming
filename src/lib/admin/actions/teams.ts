"use server";

import { updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { FormState } from "@/components/admin/Form";
import { TAGS } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { resolvePeople, resolveTeam } from "../ids";
import { addAlias } from "../league";
import { readRoster, writeTeamRoster } from "../roster";
import { requireAdmin } from "../session";
import { DbError, db } from "../supabase";
import { imageFrom } from "../upload";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").replace(/\s+/g, " ").trim() || null;

function failed(err: unknown): FormState {
  unstable_rethrow(err);
  if (err instanceof DbError && /duplicate key/.test(err.message)) return { error: "Check the highlighted fields.", fields: { slug: "Another record already uses this address." } };
  return { error: err instanceof Error ? err.message : "Something went wrong. Try again." };
}

function readNameSlug(form: FormData, fields: Record<string, string>) {
  const name = text(form, "name");
  if (!name) fields.name = "Add a name.";
  const slug = (text(form, "slug") ?? slugify(name ?? "")).toLowerCase();
  if (!slug || !SLUG.test(slug)) fields.slug = "Lowercase letters, numbers and single dashes only.";
  return { name: name ?? "", slug };
}

// Teams --------------------------------------------------------------------------------------

export async function saveTeam(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const fields: Record<string, string> = {};
  const { name, slug } = readNameSlug(form, fields);
  const tag = text(form, "tag");
  if (tag && tag.length > 12) fields.tag = "Keep the tag to 12 characters.";
  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };

  try {
    const [current] = id ? await db<{ name: string; slug: string }[]>(admin.token, `teams?id=eq.${id}&select=name,slug`) : [];
    const logo = await imageFrom(form, "logo", admin, { folder: "mgl/teams", kind: "team", alt: name });
    const body = {
      name,
      slug,
      tag,
      clan: text(form, "clan"),
      archived_at: form.get("archived") === "on" ? new Date().toISOString() : null,
      ...(logo !== undefined ? { logo_url: logo?.url ?? null } : {}),
    };
    const [row] = id
      ? await db<{ id: string; slug: string }[]>(admin.token, `teams?id=eq.${id}`, { method: "PATCH", body, prefer: "return=representation" })
      : await db<{ id: string; slug: string }[]>(admin.token, "teams", { method: "POST", body, prefer: "return=representation" });
    // The old name keeps matching in sheet uploads.
    if (current && current.name !== name) await addAlias(admin.token, "team", row.id, current.name);
    // Finished events keep the name the team had then. A spelling fix can correct them too.
    if (current) {
      const open = await db<{ id: string }[]>(admin.token, "events?status=neq.final&select=id");
      const where = form.get("fix_past") === "on" ? "" : open.length ? `&event_id=in.(${open.map((e) => e.id).join(",")})` : null;
      if (where !== null) await db(admin.token, `entries?team_id=eq.${row.id}${where}`, { method: "PATCH", body: { team_name: name, team_tag: tag } });
    }
    updateTag(TAGS.league);
    if (!id || current?.slug !== row.slug) redirect(`/admin/teams/${row.slug}?saved=1`);
    return { saved: Date.now() };
  } catch (err) {
    return failed(err);
  }
}

/**
 * Saves what a team owns now: its current tier, manager and roster. No season is involved: the
 * team's squads in upcoming or live events follow, finished events keep the roster that played.
 * With no team id (Add team) the team is picked or created from the form first.
 */
export async function saveTeamRoster(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const fields: Record<string, string> = {};
  const team = id ?? String(form.get("team") ?? "");
  if (!team) fields.team = "Type the team's name.";
  const tierRaw = String(form.get("tier") ?? "");
  const tier = tierRaw ? Number(tierRaw) : null;
  const manager = text(form, "manager");
  if (manager && manager.length > 80) fields.manager = "Keep the manager's name under 80 characters.";
  const filled = readRoster(form);
  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };
  if (new Set(filled.map((x) => x.p)).size !== filled.length) return { error: "The same player is on the roster twice." };

  try {
    const teamId = id ?? (await resolveTeam(admin.token, team, text(form, "tag")));
    const ids = await resolvePeople(admin.token, filled.map((x) => x.p));
    const [row] = await db<{ slug: string }[]>(admin.token, `teams?id=eq.${teamId}`, { method: "PATCH", body: { tier, manager }, prefer: "return=representation" });
    const moved = await writeTeamRoster(admin.token, teamId, ids.map((person_id, i) => ({ person_id, role: filled[i].role, captain: filled[i].captain })));
    updateTag(TAGS.league);
    if (!id) redirect(`/admin/teams/${row.slug}?saved=1`);
    return { saved: Date.now(), notice: moved.length ? `Saved. Moved here: ${moved.map((m) => `${m.name} (from ${m.from})`).join(", ")}.` : undefined };
  } catch (err) {
    return failed(err);
  }
}

/**
 * Folds a duplicate team into another: its registrations move over (and with them its results
 * and kill rows), its name becomes an alias, and the duplicate is deleted.
 */
export async function mergeTeam(id: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const into = String(form.get("into") ?? "");
  if (!into || into === id) return { error: "Pick the team to merge into." };
  try {
    const [dup] = await db<{ name: string; entries: { event_id: string }[] }[]>(admin.token, `teams?id=eq.${id}&select=name,entries(event_id)`);
    const [target] = await db<{ slug: string; entries: { event_id: string; event: { name: string } }[] }[]>(admin.token, `teams?id=eq.${into}&select=slug,entries(event_id,event:events(name))`);
    if (!dup || !target) return { error: "One of the teams wasn't found." };
    const clash = target.entries.filter((e) => dup.entries.some((d) => d.event_id === e.event_id));
    if (clash.length) return { error: `Both teams are registered for ${clash.map((c) => c.event.name).join(", ")}. Remove one of those registrations first.` };
    // Merging fixes a duplicate, so its registrations take the right team's name.
    const [right] = await db<{ name: string; tag: string | null }[]>(admin.token, `teams?id=eq.${into}&select=name,tag`);
    await db(admin.token, `entries?team_id=eq.${id}`, { method: "PATCH", body: { team_id: into, team_name: right.name, team_tag: right.tag } });
    // The duplicate's current players join the right team (its captain stays the captain).
    await db(admin.token, `team_players?team_id=eq.${id}`, { method: "PATCH", body: { team_id: into, captain: false, sort: 100 } });
    await db(admin.token, `aliases?kind=eq.team&target_id=eq.${id}`, { method: "PATCH", body: { target_id: into } });
    await addAlias(admin.token, "team", into, dup.name);
    await db(admin.token, `teams?id=eq.${id}`, { method: "DELETE" });
    updateTag(TAGS.league);
    redirect(`/admin/teams/${target.slug}?saved=1`);
  } catch (err) {
    return failed(err);
  }
}

/** Only a team with no registrations can be deleted; others are archived. */
export async function deleteTeam(id: string) {
  const admin = await requireAdmin();
  await db(admin.token, `teams?id=eq.${id}`, { method: "DELETE" });
  updateTag(TAGS.league);
  redirect("/admin/teams?deleted=1");
}

// People -------------------------------------------------------------------------------------

export async function savePerson(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const fields: Record<string, string> = {};
  const { name, slug } = readNameSlug(form, fields);
  const country = text(form, "country")?.toUpperCase() ?? null;
  if (country && !/^[A-Z]{2}$/.test(country)) fields.country = "Pick a country from the list.";
  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };

  try {
    const [current] = id ? await db<{ name: string; slug: string }[]>(admin.token, `people?id=eq.${id}&select=name,slug`) : [];
    const photo = await imageFrom(form, "photo", admin, { folder: "mgl/people", kind: "person", alt: name });
    const body = {
      name,
      slug,
      ign: text(form, "ign"),
      country,
      archived_at: form.get("archived") === "on" ? new Date().toISOString() : null,
      ...(photo !== undefined ? { photo_url: photo?.url ?? null } : {}),
    };
    const [row] = id
      ? await db<{ id: string; slug: string }[]>(admin.token, `people?id=eq.${id}`, { method: "PATCH", body, prefer: "return=representation" })
      : await db<{ id: string; slug: string }[]>(admin.token, "people", { method: "POST", body, prefer: "return=representation" });
    if (current && current.name !== name) await addAlias(admin.token, "person", row.id, current.name);
    updateTag(TAGS.league);
    if (!id || current?.slug !== row.slug) redirect(`/admin/people/${row.slug}?saved=1`);
    return { saved: Date.now() };
  } catch (err) {
    return failed(err);
  }
}

/** Folds a duplicate player into another: roster places, kill rows and managed squads move over. */
export async function mergePerson(id: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const into = String(form.get("into") ?? "");
  if (!into || into === id) return { error: "Pick the player to merge into." };
  try {
    const [dup] = await db<{ name: string; entry_players: { event_id: string }[]; kill_rows: { event_id: string }[] }[]>(admin.token, `people?id=eq.${id}&select=name,entry_players(event_id),kill_rows(event_id)`);
    const [target] = await db<{ slug: string; entry_players: { event_id: string }[]; kill_rows: { event_id: string }[] }[]>(admin.token, `people?id=eq.${into}&select=slug,entry_players(event_id),kill_rows(event_id)`);
    if (!dup || !target) return { error: "One of the players wasn't found." };
    const clash = (a: { event_id: string }[], b: { event_id: string }[]) => a.some((x) => b.some((y) => y.event_id === x.event_id));
    if (clash(dup.entry_players, target.entry_players) || clash(dup.kill_rows, target.kill_rows)) return { error: "Both players appear in the same event. Remove one of them from that event first." };
    await db(admin.token, `entry_players?person_id=eq.${id}`, { method: "PATCH", body: { person_id: into } });
    await db(admin.token, `kill_rows?person_id=eq.${id}`, { method: "PATCH", body: { person_id: into } });
    await db(admin.token, `aliases?kind=eq.person&target_id=eq.${id}`, { method: "PATCH", body: { target_id: into } });
    await addAlias(admin.token, "person", into, dup.name);
    await db(admin.token, `people?id=eq.${id}`, { method: "DELETE" });
    updateTag(TAGS.league);
    redirect(`/admin/people/${target.slug}?saved=1`);
  } catch (err) {
    return failed(err);
  }
}

export async function deletePerson(id: string) {
  const admin = await requireAdmin();
  await db(admin.token, `people?id=eq.${id}`, { method: "DELETE" });
  updateTag(TAGS.league);
  redirect("/admin/people?deleted=1");
}
