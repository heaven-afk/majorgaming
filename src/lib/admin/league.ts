/**
 * Teams, people, registrations and results in the admin. Reads go straight to the database as
 * the signed-in admin (never the public cache). Server only.
 */

import { nameKey } from "@/lib/slug";
import { db } from "./supabase";

// Teams --------------------------------------------------------------------------------------

export type TeamRow = { id: string; slug: string; name: string; tag: string | null; clan: string | null; logo_url: string | null; archived_at: string | null };
type EventRef = { id: string; slug: string; name: string; sort_order: number; status: string };

export function listTeams(token: string) {
  return db<(TeamRow & { entries: { tier: number | null; event: EventRef }[] })[]>(token, "teams?select=id,slug,name,tag,clan,logo_url,archived_at,entries(tier,event:events(id,slug,name,sort_order,status))&order=name.asc");
}

export async function getTeam(token: string, slug: string) {
  const [team] = await db<(TeamRow & { entries: { id: string; tier: number | null; event: EventRef; entry_players: { count: number }[] }[] })[]>(
    token,
    `teams?slug=eq.${encodeURIComponent(slug)}&select=*,entries(id,tier,event:events(id,slug,name,sort_order,status),entry_players(count))`,
  );
  team?.entries.sort((a, b) => a.event.sort_order - b.event.sort_order);
  return team;
}

// People -------------------------------------------------------------------------------------

export type PersonRow = { id: string; slug: string; name: string; ign: string | null; country: string | null; photo_url: string | null; archived_at: string | null };

/** A page of people, searched by name or in-game name. */
export async function listPeople(token: string, q: string, page: number, size = 60) {
  const term = q.replace(/[,()*%]/g, " ").trim();
  const filter = term ? `&or=(name.ilike.*${encodeURIComponent(term)}*,ign.ilike.*${encodeURIComponent(term)}*,slug.ilike.*${encodeURIComponent(term)}*)` : "";
  const rows = await db<(PersonRow & { entry_players: { entry: { team_name: string; event: { sort_order: number } } }[] })[]>(
    token,
    `people?select=id,slug,name,ign,country,photo_url,archived_at,entry_players(entry:entries(team_name,event:events(sort_order)))${filter}&order=name.asc&limit=${size + 1}&offset=${page * size}`,
  );
  return { rows: rows.slice(0, size), more: rows.length > size };
}

export async function getPerson(token: string, slug: string) {
  const [person] = await db<
    (PersonRow & {
      entry_players: { captain: boolean; entry: { tier: number | null; team_name: string; team: { slug: string }; event: EventRef } }[];
      kill_rows: { kills: number; entry: { event: EventRef } }[];
    })[]
  >(token, `people?slug=eq.${encodeURIComponent(slug)}&select=*,entry_players(captain,entry:entries(tier,team_name,team:teams(slug),event:events(id,slug,name,sort_order,status))),kill_rows(kills,entry:entries(event:events(id,slug,name,sort_order,status)))`);
  person?.entry_players.sort((a, b) => a.entry.event.sort_order - b.entry.event.sort_order);
  return person;
}

/** Everyone, light: for the player pickers. */
export function peopleIndex(token: string) {
  return db<{ id: string; name: string; ign: string | null; slug: string }[]>(token, "people?select=id,name,ign,slug&archived_at=is.null&order=name.asc");
}

export function teamsIndex(token: string) {
  return db<{ id: string; name: string; tag: string | null; slug: string }[]>(token, "teams?select=id,name,tag,slug&archived_at=is.null&order=name.asc");
}

// Registrations ------------------------------------------------------------------------------

export type EntryPlayer = { id: string; person_id: string; sort: number; role: string | null; captain: boolean; person: { name: string; slug: string; ign: string | null; photo_url: string | null } };
export type EntryRow = {
  id: string;
  event_id: string;
  team_id: string;
  tier: number | null;
  team_name: string;
  team_tag: string | null;
  team: { slug: string; name: string; tag: string | null; logo_url: string | null };
  /** Typed on the registration; managers aren't players. */
  manager: string | null;
  entry_players: EntryPlayer[];
};

const ENTRY = "id,event_id,team_id,tier,manager,team_name,team_tag,team:teams(slug,name,tag,logo_url),entry_players(id,person_id,sort,role,captain,person:people(name,slug,ign,photo_url))";

export async function listEntries(token: string, eventId: string) {
  const rows = await db<EntryRow[]>(token, `entries?event_id=eq.${eventId}&select=${ENTRY}&order=tier.asc.nullslast,team_name.asc`);
  for (const r of rows) r.entry_players.sort((a, b) => a.sort - b.sort);
  return rows;
}

export async function getEntry(token: string, eventId: string, teamSlug: string) {
  const rows = await listEntries(token, eventId);
  return rows.find((r) => r.team.slug === teamSlug);
}

/** The team's most recent registration before this event, to copy its roster from. */
export async function previousEntry(token: string, teamId: string, beforeSort: number) {
  const rows = await db<(EntryRow & { event: { sort_order: number; name: string } })[]>(token, `entries?team_id=eq.${teamId}&select=${ENTRY},event:events!inner(sort_order,name)&event.sort_order=gt.${beforeSort}`);
  rows.sort((a, b) => a.event.sort_order - b.event.sort_order);
  const prev = rows[0];
  prev?.entry_players.sort((a, b) => a.sort - b.sort);
  return prev;
}

// Who is on which squad ------------------------------------------------------------------------

/** Each player's squad in an event: a player is on one squad per event. */
export async function rosterPlaces(token: string, eventId: string) {
  const rows = await db<{ person_id: string; entry_id: string; entry: { team_name: string } }[]>(token, `entry_players?event_id=eq.${eventId}&select=person_id,entry_id,entry:entries(team_name)`);
  return new Map(rows.map((r) => [r.person_id, { entry: r.entry_id, team: r.entry.team_name }]));
}

/** Players for a roster picker: anyone on another squad in the event says so ("On Vortex One"). */
export function playerOptions(people: { id: string; name: string; ign: string | null }[], places: Map<string, { entry: string; team: string }>, entryId?: string) {
  return people.map((p) => {
    const at = places.get(p.id);
    return { value: p.id, label: p.name, sub: at && at.entry !== entryId ? `On ${at.team}` : (p.ign ?? undefined) };
  });
}

/** Results a registration has (kill rows with any kills or matches): removing it would delete them. */
export async function resultsOf(token: string, entryId: string) {
  const [row] = await db<{ standings: { count: number }[]; kill_rows: { count: number }[] }[]>(token, `entries?id=eq.${entryId}&select=standings(count),kill_rows(count)&kill_rows.or=(kills.gt.0,matches.gt.0)`);
  return { standings: row?.standings[0]?.count ?? 0, kills: row?.kill_rows[0]?.count ?? 0 };
}

// Aliases: other spellings that point at a team or person, used when matching sheets ---------

export async function aliasesOf(token: string, kind: "team" | "person") {
  const rows = await db<{ alias: string; target_id: string }[]>(token, `aliases?kind=eq.${kind}&select=alias,target_id`);
  return new Map(rows.map((r) => [nameKey(r.alias), r.target_id]));
}

export async function addAlias(token: string, kind: "team" | "person", targetId: string, alias: string) {
  if (!nameKey(alias)) return;
  await db(token, "aliases", { method: "POST", body: { kind, target_id: targetId, alias } }).catch(() => {});
}

// Results ------------------------------------------------------------------------------------

export type StandingRow = { id: string; table_id: string; entry_id: string; placement: number; kills: number; bonus: number; wins: number | null; matches: number | null; move: number | null; sort: number };
export type KillRow = { id: string; entry_id: string; person_id: string; ign: string | null; kills: number; matches: number | null; grp: string | null };

export function standingsOf(token: string, eventId: string) {
  return db<StandingRow[]>(token, `standings?event_id=eq.${eventId}&select=*&order=sort.asc`);
}

export function killsOf(token: string, eventId: string) {
  return db<KillRow[]>(token, `kill_rows?event_id=eq.${eventId}&select=id,entry_id,person_id,ign,kills,matches,grp&order=kills.desc`);
}

// Undo: the rows an upload replaced, kept in results_history ----------------------------------

export type HistoryRow = { id: string; table_id: string | null; kind: "standings" | "kills"; tier: number | null; summary: string | null; created_at: string };

/** Versions to go back to, newest first; `ready` is false until the history table exists. */
export async function historyOf(token: string, eventId: string) {
  try {
    const rows = await db<HistoryRow[]>(token, `results_history?event_id=eq.${eventId}&select=id,table_id,kind,tier,summary,created_at&order=created_at.desc&limit=200`);
    return { ready: true, rows };
  } catch {
    return { ready: false, rows: [] as HistoryRow[] };
  }
}

/** Keeps the rows about to be replaced. Returns false when undo isn't set up yet, so uploads still work. */
export async function keepVersion(token: string, version: { event_id: string; table_id: string | null; kind: "standings" | "kills"; tier: number | null; rows: unknown[]; summary: string; created_by: string }) {
  try {
    await db(token, "results_history", { method: "POST", body: version });
    return true;
  } catch {
    return false;
  }
}

/** Inserts in batches of 500 (the REST API's comfortable size). */
export async function insertMany<T>(token: string, table: string, rows: unknown[], prefer = "return=representation") {
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += 500) out.push(...((await db<T[]>(token, table, { method: "POST", body: rows.slice(i, i + 500), prefer })) ?? []));
  return out;
}

/** `id=in.(...)` filters, in chunks so the address stays short. */
export async function deleteIds(token: string, table: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += 100) await db(token, `${table}?id=in.(${ids.slice(i, i + 100).join(",")})`, { method: "DELETE" });
}
