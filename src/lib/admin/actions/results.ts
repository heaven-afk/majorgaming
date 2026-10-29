"use server";

import { updateTag } from "next/cache";
import { TAGS } from "@/lib/db";
import { resolvePeople, resolveTeam, checkIds } from "../ids";
import { deleteIds, insertMany, keepVersion, killsOf, listEntries, standingsOf, type Effects, type KillRow, type StandingRow } from "../league";
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
    if (file instanceof File && file.size > 4 * 1024 * 1024) return { error: "That file is over 4 MB. Save a copy with just the table, or paste the rows." };
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

/**
 * Registers the squads a sheet named that aren't in the event yet; returns each row's entry, and
 * the registrations and teams it had to create (for Undo).
 */
async function entriesFor(token: string, eventId: string, squads: (Squad & { tier: number | null })[]) {
  const existing = await listEntries(token, eventId);
  const byTeam = new Map(existing.map((e) => [e.team_id, e.id]));
  const ids: string[] = [];
  const created = new Map<string, string>();
  const newEntries: string[] = [];
  const newTeams: string[] = [];
  for (const s of squads) {
    if (s.entryId) {
      ids.push(s.entryId);
      continue;
    }
    const value = s.team ?? "";
    let teamId = created.get(value);
    if (!teamId) {
      teamId = await resolveTeam(token, value);
      if (value.startsWith("new:")) newTeams.push(teamId);
      created.set(value, teamId);
    }
    let entryId = byTeam.get(teamId);
    if (!entryId) {
      const [t] = await db<{ name: string; tag: string | null }[]>(token, `teams?id=eq.${teamId}&select=name,tag`);
      const [e] = await db<{ id: string }[]>(token, "entries", { method: "POST", body: { event_id: eventId, team_id: teamId, tier: s.tier, team_name: t.name, team_tag: t.tag }, prefer: "return=representation" });
      entryId = e.id;
      newEntries.push(entryId);
      byTeam.set(teamId, entryId);
    }
    ids.push(entryId);
  }
  return { ids, newEntries, newTeams };
}

const undoNote = (kept: "full" | "rows" | false) =>
  kept === "full" ? "" : kept === "rows" ? " (Undo will put back the rows only: run the results_history_effects migration so it also reverses roster and name changes.)" : " (Undo isn't set up yet, so this can't be undone.)";

/**
 * Writes standings tables from an upload. Each table becomes exactly the uploaded rows, in the
 * uploaded order: rows are upserted first and leftovers removed after, so a failure part-way
 * never leaves a table empty.
 */
export async function saveStandings(eventId: string, payload: StandingsPayload): Promise<SaveResult> {
  const admin = await requireAdmin();
  checkIds(eventId, payload.tables.map((t) => [t.tableId, t.rows.map((r) => [r.entryId, r.team])]));
  try {
    let written = 0;
    let kept: "full" | "rows" | false = "full";
    const current = await standingsOf(admin.token, eventId);
    for (const table of payload.tables) {
      const before = current.filter((s) => s.table_id === table.tableId);
      const { ids: entryIds, newEntries, newTeams } = await entriesFor(admin.token, eventId, table.rows.map((r) => ({ ...r, tier: table.tier })));
      const k = await keepVersion(admin.token, { event_id: eventId, table_id: table.tableId, kind: "standings", tier: table.tier, rows: before.map(standingCopy), summary: `${count(before.length, "squad")} before an upload of ${table.rows.length}`, created_by: admin.id, effects: { newEntries, newTeams } });
      if (k !== "full") kept = kept === false ? false : k;
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
    return { ok: `Saved ${count(written, "squad")}. Live on the site.${undoNote(kept)}` };
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
  checkIds(eventId, payload.rows.map((r) => [r.entryId, r.team, r.person]));
  try {
    const { ids: entryIds, newEntries, newTeams } = await entriesFor(admin.token, eventId, payload.rows);
    const people = await resolvePeople(admin.token, payload.rows.map((r) => r.person));
    const newPeople = [...new Set(people.filter((p, i) => payload.rows[i].person.startsWith("new:") && p))];
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

    // One row per player: a player listed twice keeps their higher count.
    const best = new Map<string, number>();
    people.forEach((p, i) => {
      if (!best.has(p) || payload.rows[i].kills > payload.rows[best.get(p)!].kills) best.set(p, i);
    });

    // Roster places: anyone missing from theirs joins it, anyone on another squad moves.
    const entries = await listEntries(admin.token, eventId);
    const onRoster = new Map(entries.flatMap((e) => e.entry_players.map((p) => [p.person_id, e.id] as const)));
    const place = new Map(entries.flatMap((e) => e.entry_players.map((p) => [p.person_id, p] as const)));
    const missing = [...best].filter(([p]) => !onRoster.has(p)).map(([p, i]) => ({ entry_id: entryIds[i], event_id: eventId, person_id: p, sort: 100 + i }));
    const moved = [...best].filter(([p, i]) => onRoster.has(p) && entryIds[i] && onRoster.get(p) !== entryIds[i]);
    // While the event is upcoming or live, the teams' own rosters follow the sheet too; a
    // finished event's sheet never changes who is on a team now.
    const [{ status }] = await db<{ status: string }[]>(admin.token, `events?id=eq.${eventId}&select=status`);
    const joined = [...missing.map((m) => ({ person_id: m.person_id, entry_id: m.entry_id, sort: m.sort })), ...moved.map(([person_id, i]) => ({ person_id, entry_id: entryIds[i], sort: 100 + i }))];
    const teamsNow =
      status !== "final" && joined.length
        ? await db<{ person_id: string; team_id: string; sort: number; role: string | null; captain: boolean }[]>(admin.token, `team_players?person_id=in.(${joined.map((j) => j.person_id).join(",")})&select=person_id,team_id,sort,role,captain`)
        : [];

    // A sheet without in-game names keeps what this event's rows already had, else the profile's.
    const prior = new Map((await killsOf(admin.token, eventId)).map((k) => [k.person_id, k.ign]));
    const rows = [...best].map(([person_id, i]) => ({ event_id: eventId, entry_id: entryIds[i] || onRoster.get(person_id), person_id, ign: igns.get(person_id) ?? prior.get(person_id) ?? stored.get(person_id) ?? null, kills: payload.rows[i].kills, matches: payload.rows[i].matches, grp: payload.rows[i].group }));
    const tierOf = new Map(entries.map((e) => [e.id, e.tier]));
    const inScope = (k: { entry_id: string }) => payload.scope === "all" || tierOf.get(k.entry_id) === payload.scope;
    const before = (await killsOf(admin.token, eventId)).filter(inScope);

    // Kept before anything changes: the rows replaced, and everything else as it is now.
    const effects: Effects = {
      newEntries,
      newTeams,
      newPeople,
      people: renamed.map(([id]) => ({ id, ign: stored.get(id) ?? null })),
      roster: joined.map((j) => {
        const was = place.get(j.person_id);
        return { person_id: j.person_id, entry_id: was ? onRoster.get(j.person_id)! : null, sort: was?.sort ?? 0, role: was?.role ?? null, captain: was?.captain ?? false };
      }),
      teamRoster: status !== "final" ? joined.map((j) => ({ person_id: j.person_id, rows: teamsNow.filter((t) => t.person_id === j.person_id).map((t) => ({ team_id: t.team_id, sort: t.sort, role: t.role, captain: t.captain })) })) : [],
    };
    const kept = await keepVersion(admin.token, { event_id: eventId, table_id: null, kind: "kills", tier: payload.scope === "all" ? null : payload.scope, rows: before.map(killCopy), summary: `${count(before.length, "player")} before an upload of ${best.size}`, created_by: admin.id, effects });

    for (const [id, ign] of renamed) await db(admin.token, `people?id=eq.${id}`, { method: "PATCH", body: { ign } });
    if (missing.length) await insertMany(admin.token, "entry_players", missing, "return=minimal");
    for (const [person_id, i] of moved) {
      await db(admin.token, `entry_players?event_id=eq.${eventId}&person_id=eq.${person_id}`, { method: "PATCH", body: { entry_id: entryIds[i], sort: 100 + i, captain: false } });
    }
    if (status !== "final" && joined.length) {
      const teamOf = new Map((await db<{ id: string; team_id: string }[]>(admin.token, `entries?event_id=eq.${eventId}&select=id,team_id`)).map((e) => [e.id, e.team_id]));
      await db(admin.token, `team_players?person_id=in.(${joined.map((j) => j.person_id).join(",")})`, { method: "DELETE" });
      await insertMany(admin.token, "team_players", joined.map((j) => ({ team_id: teamOf.get(j.entry_id), person_id: j.person_id, sort: j.sort })), "return=minimal");
    }
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
    return { ok: `Saved ${count(rows.length, "player")}.${added} Live on the site.${undoNote(kept)}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The kill table couldn't be saved." };
  }
}

/** Empties one standings table, keeping what it had so it can be put back. */
export async function clearTable(eventId: string, tableId: string, tier: number | null): Promise<SaveResult> {
  const admin = await requireAdmin();
  checkIds(eventId, tableId);
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
  checkIds(eventId, versionId);
  try {
    const [version] = await db<{ id: string; table_id: string | null; kind: "standings" | "kills"; tier: number | null; rows: Record<string, unknown>[]; created_at: string }[]>(admin.token, `results_history?id=eq.${versionId}&event_id=eq.${eventId}&select=id,table_id,kind,tier,rows,created_at`);
    if (!version) return { error: "That version is no longer kept." };
    // What else the upload changed: only reversed for the newest upload of this table or tier.
    const effects = await db<{ effects: Effects | null }[]>(admin.token, `results_history?id=eq.${versionId}&select=effects`).then((r) => r[0]?.effects ?? null).catch(() => null);
    const scope = version.kind === "standings" ? `table_id=eq.${version.table_id}` : version.tier === null ? "tier=is.null" : `tier=eq.${version.tier}`;
    const [newest] = await db<{ id: string }[]>(admin.token, `results_history?event_id=eq.${eventId}&kind=eq.${version.kind}&${scope}&select=id&order=created_at.desc&limit=1`);
    const latest = newest?.id === version.id;
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
    const reversed = latest && effects ? await reverse(admin.token, eventId, effects) : 0;
    await db(admin.token, `results_history?id=eq.${version.id}`, { method: "DELETE" });
    updateTag(TAGS.league);
    const extra = reversed ? ` Roster, team and name changes from that upload were reversed too (${count(reversed, "change")}).` : effects && !latest ? " Roster and name changes were left as they are, because later uploads came after it." : "";
    return { ok: `Put back ${count(rows.length, version.kind === "standings" ? "squad" : "player")}.${extra} Live on the site.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "That version couldn't be put back." };
  }
}

/**
 * Puts back what an upload changed besides its rows: roster places, team rosters and in-game
 * names as they were, and removes the registrations, teams and players it created, once nothing
 * else uses them. Returns how many changes it reversed.
 */
type Counted = { count: number }[] | { count: number } | null;
/** A related-row count: a list for one-to-many links, a single object for one-to-one (a player's team place). */
const counted = (c: Counted) => (Array.isArray(c) ? (c[0]?.count ?? 0) : (c?.count ?? 0));

async function reverse(token: string, eventId: string, fx: Effects) {
  let n = 0;
  for (const p of fx.people ?? []) {
    await db(token, `people?id=eq.${p.id}`, { method: "PATCH", body: { ign: p.ign } });
    n++;
  }
  const entryIds = new Set((await db<{ id: string }[]>(token, `entries?event_id=eq.${eventId}&select=id`)).map((e) => e.id));
  for (const r of fx.roster ?? []) {
    await db(token, `entry_players?event_id=eq.${eventId}&person_id=eq.${r.person_id}`, { method: "DELETE" });
    if (r.entry_id && entryIds.has(r.entry_id)) await db(token, "entry_players", { method: "POST", body: { entry_id: r.entry_id, event_id: eventId, person_id: r.person_id, sort: r.sort, role: r.role, captain: r.captain } });
    n++;
  }
  for (const t of fx.teamRoster ?? []) {
    await db(token, `team_players?person_id=eq.${t.person_id}`, { method: "DELETE" });
    // A captain put back where the team has since named another stays a plain player.
    for (const row of t.rows) await db(token, "team_players", { method: "POST", body: { ...row, person_id: t.person_id } }).catch(() => db(token, "team_players", { method: "POST", body: { ...row, person_id: t.person_id, captain: false } }).catch(() => {}));
    n++;
  }
  // Created records go only when the restore left them unused.
  for (const id of fx.newEntries ?? []) {
    const [e] = await db<{ standings: Counted; kill_rows: Counted }[]>(token, `entries?id=eq.${id}&select=standings(count),kill_rows(count)`);
    if (e && !counted(e.standings) && !counted(e.kill_rows)) {
      await db(token, `entries?id=eq.${id}`, { method: "DELETE" });
      n++;
    }
  }
  for (const id of fx.newTeams ?? []) {
    const [t] = await db<{ entries: Counted; team_players: Counted }[]>(token, `teams?id=eq.${id}&select=entries(count),team_players(count)`);
    if (t && !counted(t.entries) && !counted(t.team_players)) {
      await db(token, `teams?id=eq.${id}`, { method: "DELETE" });
      n++;
    }
  }
  for (const id of fx.newPeople ?? []) {
    const [p] = await db<{ kill_rows: Counted; entry_players: Counted; team_players: Counted }[]>(token, `people?id=eq.${id}&select=kill_rows(count),entry_players(count),team_players(count)`);
    if (p && !counted(p.kill_rows) && !counted(p.entry_players) && !counted(p.team_players)) {
      await db(token, `people?id=eq.${id}`, { method: "DELETE" });
      n++;
    }
  }
  return n;
}
