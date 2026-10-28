"use server";

import { updateTag } from "next/cache";
import { TAGS } from "@/lib/db";
import { resolvePeople, resolveTeam } from "../ids";
import { deleteIds, insertMany, keepVersion, killsOf, listEntries, standingsOf, type KillRow, type StandingRow } from "../league";
import { requireAdmin } from "../session";
import { db } from "../supabase";
import { readDelimited, readUpload, type Sheet } from "../sheet";

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
// The columns a version keeps (everything but the row id).
function standingCopy(row: StandingRow): Omit<StandingRow, "id"> {
  const copy: Partial<StandingRow> = { ...row };
  delete copy.id;
  return copy as Omit<StandingRow, "id">;
}
function killCopy(row: KillRow): Omit<KillRow, "id"> {
  const copy: Partial<KillRow> = { ...row };
  delete copy.id;
  return copy as Omit<KillRow, "id">;
}

export type ReadResult = { sheets?: Sheet[]; error?: string };

/** An uploaded file or pasted text, as rows, for the browser to preview. Nothing is saved. */
export async function readSheet(form: FormData): Promise<ReadResult> {
  await requireAdmin();
  try {
    const file = form.get("file");
    if (file instanceof File && file.size > 0) return { sheets: await readUpload(file) };
    const text = String(form.get("text") ?? "");
    if (text.trim()) return { sheets: readDelimited(text) };
    return { error: "Upload a sheet or paste its rows." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "That sheet couldn't be read." };
  }
}

export type SaveResult = { ok?: string; error?: string };

/** A squad in a results row: an existing registration, or a team to register (picked or new). */
type Squad = { entryId?: string; team?: string };

export type StandingsPayload = {
  tables: {
    tableId: string;
    tier: number | null;
    rows: (Squad & { placement: number; kills: number; bonus: number; wins: number | null; matches: number | null; move: number | null })[];
  }[];
};

/** Registers the squads a sheet named that aren't in the event yet; returns each row's entry. */
async function entriesFor(token: string, eventId: string, squads: (Squad & { tier: number | null })[]) {
  const existing = await listEntries(token, eventId);
  const byTeam = new Map(existing.map((e) => [e.team_id, e.id]));
  const out: string[] = [];
  const created = new Map<string, string>();
  for (const s of squads) {
    if (s.entryId) {
      out.push(s.entryId);
      continue;
    }
    const value = s.team ?? "";
    const teamId = created.get(value) ?? (await resolveTeam(token, value));
    created.set(value, teamId);
    let entryId = byTeam.get(teamId);
    if (!entryId) {
      const [t] = await db<{ name: string; tag: string | null }[]>(token, `teams?id=eq.${teamId}&select=name,tag`);
      const [e] = await db<{ id: string }[]>(token, "entries", { method: "POST", body: { event_id: eventId, team_id: teamId, tier: s.tier, team_name: t.name, team_tag: t.tag }, prefer: "return=representation" });
      entryId = e.id;
      byTeam.set(teamId, entryId);
    }
    out.push(entryId);
  }
  return out;
}

/**
 * Writes standings tables from an upload. Each table becomes exactly the uploaded rows, in the
 * uploaded order: rows are upserted first and leftovers removed after, so a failure part-way
 * never leaves a table empty.
 */
export async function saveStandings(eventId: string, payload: StandingsPayload): Promise<SaveResult> {
  const admin = await requireAdmin();
  try {
    let written = 0;
    let undo = true;
    const current = await standingsOf(admin.token, eventId);
    for (const table of payload.tables) {
      const before = current.filter((s) => s.table_id === table.tableId);
      undo = (await keepVersion(admin.token, { event_id: eventId, table_id: table.tableId, kind: "standings", tier: table.tier, rows: before.map(standingCopy), summary: `${count(before.length, "squad")} before an upload of ${table.rows.length}`, created_by: admin.id })) && undo;
      const entryIds = await entriesFor(admin.token, eventId, table.rows.map((r) => ({ ...r, tier: table.tier })));
      if (new Set(entryIds).size !== entryIds.length) return { error: "A squad appears twice in one table. Remove the extra row and try again." };
      const rows = table.rows.map((r, i) => ({
        table_id: table.tableId,
        event_id: eventId,
        entry_id: entryIds[i],
        placement: r.placement,
        kills: r.kills,
        bonus: r.bonus,
        wins: r.wins,
        matches: r.matches,
        move: r.move,
        sort: i,
      }));
      if (rows.length) await insertMany(admin.token, "standings?on_conflict=table_id,entry_id", rows, "resolution=merge-duplicates,return=minimal");
      const keep = new Set(entryIds);
      await deleteIds(
        admin.token,
        "standings",
        current.filter((s) => s.table_id === table.tableId && !keep.has(s.entry_id)).map((s) => s.id),
      );
      written += rows.length;
    }
    updateTag(TAGS.league);
    return { ok: `Saved ${count(written, "squad")}. Live on the site.${undo ? "" : " (Undo isn't set up yet, so this can't be undone.)"}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The results couldn't be saved." };
  }
}

export type KillsPayload = {
  /** Which rows the upload replaces: the whole event, or one tier's squads. */
  scope: "all" | number;
  rows: (Squad & { tier: number | null; person: string; ign?: string; kills: number; matches: number | null; group: string | null })[];
};

/**
 * Writes kill rows. Players are matched in the browser; new names are created here. The sheet
 * says who played for whom, so anyone not on that squad's roster yet is added to it, and anyone
 * still listed on another squad (a roster that wasn't updated) moves to it. The rows in scope
 * that the upload doesn't name are removed.
 */
export async function saveKills(eventId: string, payload: KillsPayload): Promise<SaveResult> {
  const admin = await requireAdmin();
  try {
    const entryIds = await entriesFor(admin.token, eventId, payload.rows);
    const people = await resolvePeople(admin.token, payload.rows.map((r) => r.person));
    // In-game names. Each kill row keeps the one the player had in this event, so later changes
    // never rewrite it. A player's profile (what rosters show) takes the sheet's name as their
    // current one, unless a newer event already has them: adding an old season changes nothing.
    const igns = new Map<string, string>();
    payload.rows.forEach((r, i) => r.ign && people[i] && igns.set(people[i], r.ign.replace(/\s+/g, " ").trim()));
    const ids = [...new Set(people.filter(Boolean))];
    const [{ sort_order: here }] = await db<{ sort_order: number }[]>(admin.token, `events?id=eq.${eventId}&select=sort_order`);
    const stored = new Map<string, string | null>();
    const newer = new Set<string>();
    for (let i = 0; i < ids.length; i += 150) {
      const chunk = ids.slice(i, i + 150).join(",");
      for (const p of await db<{ id: string; ign: string | null }[]>(admin.token, `people?id=in.(${chunk})&select=id,ign`)) stored.set(p.id, p.ign);
      for (const k of await db<{ person_id: string; event: { sort_order: number } }[]>(admin.token, `kill_rows?person_id=in.(${chunk})&event_id=neq.${eventId}&select=person_id,event:events(sort_order)`)) {
        if (k.event.sort_order < here) newer.add(k.person_id);
      }
    }
    const renamed = [...igns].filter(([id, ign]) => stored.get(id) !== ign && !newer.has(id));
    for (const [id, ign] of renamed) await db(admin.token, `people?id=eq.${id}`, { method: "PATCH", body: { ign } });

    // One row per player: a player listed twice keeps their higher count.
    const best = new Map<string, number>();
    people.forEach((p, i) => {
      if (!best.has(p) || payload.rows[i].kills > payload.rows[best.get(p)!].kills) best.set(p, i);
    });

    // Roster places for anyone missing from theirs.
    const entries = await listEntries(admin.token, eventId);
    const onRoster = new Map(entries.flatMap((e) => e.entry_players.map((p) => [p.person_id, e.id] as const)));
    const missing = [...best].filter(([p]) => !onRoster.has(p)).map(([p, i]) => ({ entry_id: entryIds[i], event_id: eventId, person_id: p, sort: 100 + i }));
    if (missing.length) await insertMany(admin.token, "entry_players", missing, "return=minimal");
    const moved = [...best].filter(([p, i]) => onRoster.has(p) && entryIds[i] && onRoster.get(p) !== entryIds[i]);
    for (const [person_id, i] of moved) {
      await db(admin.token, `entry_players?event_id=eq.${eventId}&person_id=eq.${person_id}`, { method: "PATCH", body: { entry_id: entryIds[i], sort: 100 + i, captain: false } });
    }

    // A sheet without in-game names keeps what this event's rows already had, else the profile's.
    const prior = new Map((await killsOf(admin.token, eventId)).map((k) => [k.person_id, k.ign]));
    const rows = [...best].map(([person_id, i]) => ({ event_id: eventId, entry_id: entryIds[i] || onRoster.get(person_id), person_id, ign: igns.get(person_id) ?? prior.get(person_id) ?? stored.get(person_id) ?? null, kills: payload.rows[i].kills, matches: payload.rows[i].matches, grp: payload.rows[i].group }));
    const tierOf = new Map(entries.map((e) => [e.id, e.tier]));
    const inScope = (k: { entry_id: string }) => payload.scope === "all" || tierOf.get(k.entry_id) === payload.scope;
    const before = (await killsOf(admin.token, eventId)).filter(inScope);
    const undo = await keepVersion(admin.token, { event_id: eventId, table_id: null, kind: "kills", tier: payload.scope === "all" ? null : payload.scope, rows: before.map(killCopy), summary: `${count(before.length, "player")} before an upload of ${best.size}`, created_by: admin.id });
    if (rows.length) await insertMany(admin.token, "kill_rows?on_conflict=event_id,person_id", rows, "resolution=merge-duplicates,return=minimal");
    await deleteIds(
      admin.token,
      "kill_rows",
      before.filter((k) => !best.has(k.person_id)).map((k) => k.id),
    );
    updateTag(TAGS.league);
    const added =
      (missing.length ? ` ${missing.length} ${missing.length === 1 ? "player was" : "players were"} added to their squad's roster.` : "") +
      (moved.length ? ` ${moved.length} ${moved.length === 1 ? "player was" : "players were"} moved to the squad the sheet lists them under.` : "") +
      (renamed.length ? ` ${renamed.length} in-game ${renamed.length === 1 ? "name was" : "names were"} updated.` : "");
    return { ok: `Saved ${count(rows.length, "player")}.${added} Live on the site.${undo ? "" : " (Undo isn't set up yet, so this can't be undone.)"}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The kill table couldn't be saved." };
  }
}

/** Empties one standings table, keeping what it had so it can be put back. */
export async function clearTable(eventId: string, tableId: string, tier: number | null): Promise<SaveResult> {
  const admin = await requireAdmin();
  const before = (await standingsOf(admin.token, eventId)).filter((s) => s.table_id === tableId);
  await keepVersion(admin.token, { event_id: eventId, table_id: tableId, kind: "standings", tier, rows: before.map(standingCopy), summary: `${count(before.length, "squad")} before the table was cleared`, created_by: admin.id });
  await db(admin.token, `standings?table_id=eq.${tableId}`, { method: "DELETE" });
  updateTag(TAGS.league);
  return { ok: "Table cleared." };
}

/**
 * Puts a kept version back: the table (or the tier's kill rows) becomes exactly what it was.
 * What's there now is kept as a version first, so a restore can itself be undone. Rows for
 * squads removed from the event since are left out.
 */
export async function restoreVersion(eventId: string, versionId: string): Promise<SaveResult> {
  const admin = await requireAdmin();
  try {
    const [version] = await db<{ id: string; table_id: string | null; kind: "standings" | "kills"; tier: number | null; rows: Record<string, unknown>[] }[]>(admin.token, `results_history?id=eq.${versionId}&event_id=eq.${eventId}&select=id,table_id,kind,tier,rows`);
    if (!version) return { error: "That version is no longer kept." };
    const entries = await listEntries(admin.token, eventId);
    const live = new Set(entries.map((e) => e.id));
    const rows = version.rows.filter((r) => live.has(String(r.entry_id)));

    if (version.kind === "standings" && version.table_id) {
      const now = (await standingsOf(admin.token, eventId)).filter((s) => s.table_id === version.table_id);
      await keepVersion(admin.token, { event_id: eventId, table_id: version.table_id, kind: "standings", tier: version.tier, rows: now.map(standingCopy), summary: `${count(now.length, "squad")} before an undo`, created_by: admin.id });
      await db(admin.token, `standings?table_id=eq.${version.table_id}`, { method: "DELETE" });
      if (rows.length) await insertMany(admin.token, "standings", rows, "return=minimal");
    } else {
      const tierOf = new Map(entries.map((e) => [e.id, e.tier]));
      const now = (await killsOf(admin.token, eventId)).filter((k) => version.tier === null || tierOf.get(k.entry_id) === version.tier);
      await keepVersion(admin.token, { event_id: eventId, table_id: null, kind: "kills", tier: version.tier, rows: now.map(killCopy), summary: `${count(now.length, "player")} before an undo`, created_by: admin.id });
      await deleteIds(admin.token, "kill_rows", now.map((k) => k.id));
      if (rows.length) await insertMany(admin.token, "kill_rows?on_conflict=event_id,person_id", rows, "resolution=merge-duplicates,return=minimal");
    }
    await db(admin.token, `results_history?id=eq.${version.id}`, { method: "DELETE" });
    updateTag(TAGS.league);
    return { ok: `Put back ${count(rows.length, version.kind === "standings" ? "squad" : "player")}. Live on the site.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "That version couldn't be put back." };
  }
}
