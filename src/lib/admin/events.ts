/**
 * Events in the admin: list, read one, save, delete. Reads go straight to the database (never
 * the public cache), as the signed-in admin. Server only.
 */

import { db } from "./supabase";

export type EventStatus = "upcoming" | "live" | "final";
export type RegistrationState = "closed" | "soon" | "open" | "full";

/** An `events` row, as the admin edits it. */
export type EventRow = {
  id: string;
  slug: string;
  name: string;
  series: string;
  kind: "season" | "other";
  number: number | null;
  status: EventStatus;
  format: "tiers" | "single";
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  registration_state: RegistrationState;
  registration_opens: string | null;
  registration_closes: string | null;
  registration_url: string | null;
  registration_note: string | null;
  poster_url: string | null;
  poster_alt: string | null;
  poster_width: number | null;
  poster_height: number | null;
  summary: string | null;
  description: string[];
  details: { label: string; value: string }[];
  matches_played: number | null;
  matches_total: number | null;
  kill_table_size: number | null;
  promote: number | null;
  relegate: number | null;
  updated_at: string;
};

export type TableRow = { id: string; name: string; tier: number | null; sort: number; standings: { count: number }[] };

/** What the events list shows for each event. */
export type EventSummary = Pick<EventRow, "id" | "slug" | "name" | "series" | "kind" | "sort_order" | "status" | "registration_state" | "start_date" | "end_date" | "poster_url" | "updated_at"> & {
  event_tables: { count: number }[];
  entries: { count: number }[];
};

export function listEvents(token: string) {
  return db<EventSummary[]>(
    token,
    "events?select=id,slug,name,series,kind,sort_order,status,registration_state,start_date,end_date,poster_url,updated_at,event_tables(count),entries(count)&order=sort_order.asc",
  );
}

export async function getEvent(token: string, slug: string) {
  const rows = await db<(EventRow & { event_tables: TableRow[]; entries: { count: number }[] })[]>(token, `events?slug=eq.${encodeURIComponent(slug)}&select=*,event_tables(id,name,tier,sort,standings(count)),entries(count)`);
  const event = rows[0];
  if (!event) return undefined;
  event.event_tables.sort((a, b) => a.sort - b.sort);
  return event;
}

/**
 * The ranked season the admin works on (Teams, Results, the dashboard): the newest season with
 * squads registered, else the newest season. A new season takes over once squads are brought in.
 */
export async function currentSeason(token: string) {
  const rows = await db<(EventRow & { event_tables: TableRow[]; entries: { count: number }[] })[]>(token, "events?kind=eq.season&select=*,event_tables(id,name,tier,sort,standings(count)),entries(count)&order=sort_order.asc");
  const season = rows.find((e) => (e.entries[0]?.count ?? 0) > 0) ?? rows[0];
  season?.event_tables.sort((a, b) => a.sort - b.sort);
  return season;
}

export async function slugTaken(token: string, slug: string, exceptId?: string) {
  const rows = await db<{ id: string }[]>(token, `events?slug=eq.${encodeURIComponent(slug)}&select=id`);
  return rows.some((r) => r.id !== exceptId);
}

type Placed = { id: string; kind: string; number: number | null; start_date: string | null; sort_order: number };

/**
 * Where an event belongs in the newest-first list, so adding a past event (say Season 8) never
 * makes it the latest: seasons go by their number, other events by start date, and an event
 * with neither goes to the top as the newest.
 */
export async function placeFor(token: string, event: { id?: string; kind: string; number: number | null; start_date: string | null }): Promise<number> {
  const all = (await db<Placed[]>(token, "events?select=id,kind,number,start_date,sort_order&order=sort_order.asc")).filter((e) => e.id !== event.id);
  const olderThan = (e: Placed) =>
    event.kind === "season" && e.kind === "season" && event.number !== null && e.number !== null
      ? e.number < event.number
      : event.start_date && e.start_date
        ? e.start_date < event.start_date
        : undefined;
  const between = (a?: Placed, b?: Placed) => (!a ? (b ? b.sort_order - 10 : 0) : !b ? a.sort_order + 10 : b.sort_order - a.sort_order >= 2 ? Math.floor((a.sort_order + b.sort_order) / 2) : undefined);

  const comparable = all.map((e, i) => ({ i, older: olderThan(e) })).filter((x) => x.older !== undefined);
  if (!comparable.length) return between(undefined, all[0])!;
  const firstOlder = comparable.find((x) => x.older);
  const at = firstOlder ? firstOlder.i : comparable[comparable.length - 1].i + 1;
  const sort = between(all[at - 1], all[at]);
  if (sort !== undefined) return sort;
  // No room between the two: space every event out again, then place it.
  for (const [i, e] of all.entries()) await db(token, `events?id=eq.${e.id}`, { method: "PATCH", body: { sort_order: i * 10 } });
  return placeFor(token, event);
}

export type EventInput = Omit<EventRow, "id" | "sort_order" | "updated_at" | "promote" | "relegate"> & Partial<Pick<EventRow, "promote" | "relegate">>;

export async function createEvent(token: string, input: EventInput) {
  const sort_order = await placeFor(token, input);
  const [row] = await db<EventRow[]>(token, "events", { method: "POST", body: { ...input, sort_order }, prefer: "return=representation" });
  return row;
}

export async function updateEvent(token: string, id: string, input: Partial<EventInput> & { sort_order?: number }) {
  const [row] = await db<EventRow[]>(token, `events?id=eq.${id}`, { method: "PATCH", body: input, prefer: "return=representation" });
  return row;
}

export function deleteEvent(token: string, id: string) {
  return db(token, `events?id=eq.${id}`, { method: "DELETE" });
}

/**
 * Makes the event's tables match its format: "Tier 1" to "Tier N", or one "Overall". Tables that
 * would go away are only removed while they have no results; otherwise the save stops with a
 * message instead of losing standings.
 */
export async function syncTables(token: string, eventId: string, format: "tiers" | "single", tiers: number) {
  const existing = await db<TableRow[]>(token, `event_tables?event_id=eq.${eventId}&select=id,name,tier,sort,standings(count)`);
  const wanted = format === "tiers" ? Array.from({ length: tiers }, (_, i) => ({ name: `Tier ${i + 1}`, tier: i + 1, sort: i })) : [{ name: "Overall", tier: null, sort: 0 }];

  const extra = existing.filter((t) => !wanted.some((w) => w.name === t.name));
  const withResults = extra.filter((t) => (t.standings[0]?.count ?? 0) > 0);
  if (withResults.length) return { error: `${withResults.map((t) => t.name).join(", ")} already ${withResults.length === 1 ? "has" : "have"} results, so the tables can't be reduced. Clear those results first.` };

  for (const t of extra) await db(token, `event_tables?id=eq.${t.id}`, { method: "DELETE" });
  const missing = wanted.filter((w) => !existing.some((t) => t.name === w.name));
  if (missing.length) await db(token, "event_tables", { method: "POST", body: missing.map((w) => ({ ...w, event_id: eventId })) });
  return {};
}
