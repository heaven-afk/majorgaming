import "server-only";
import { db, DbError } from "@/lib/admin/supabase";
import { readLeague } from "@/lib/db";
import { eventSlug, parseIndexSnapshot, type IndexSnapshot, type MglTeamRef, type PublicIndexResults } from "./contract";
import type { TeamMatches } from "./match";
import { indexSnapshot, IndexResultsError } from "./client";

export type ResultLink = {
  id: string; table_id: string | null;
  event_id: string; tournament_id: string; enabled: boolean;
  snapshot: IndexSnapshot | null; synced_at: string | null; attempt_at: string | null;
  /** Missing until the team matches migration is applied, so links are read with `select=*`. */
  team_matches?: TeamMatches;
};
type EventRef = { id: string; slug: string; status: "upcoming" | "live" | "final" };

async function service<T>(path: string, init: {method?: string; body?: unknown; prefer?: string} = {}): Promise<T> {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !origin) throw new Error("The results database connection is unavailable.");
  const response = await fetch(new URL("/rest/v1/" + path, origin), {
    method: init.method ?? "GET",
    headers: {
      apikey: key, "Content-Type": "application/json",
      ...(key.startsWith("eyJ") ? { Authorization: "Bearer " + key } : {}),
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // Both PostgREST's missing-table response and old database schemas can occur during rollout.
    if (body.code === "PGRST204") throw new DbError("Apply the team matches database migration first.", response.status);
    throw new DbError(body.code === "PGRST205" || body.code === "42P01" ? "Apply the live results database migration first." : "The results database request failed.", response.status);
  }
  return (response.status === 204 || response.headers.get("content-length") === "0" ? undefined : await response.json()) as T;
}

export async function getAdminLinks(token: string, eventId: string): Promise<ResultLink[]> {
  try {
    return await db<ResultLink[]>(token, "event_index_results?select=*&event_id=eq." + eventId);
  } catch (error) {
    if (error instanceof DbError && error.status === 404) {
      throw new DbError("Apply the live results database migration first.", 404);
    }
    throw error;
  }
}

/** Every match confirmed on any link, to suggest again. The newest link wins. */
export async function confirmedMatches(token: string): Promise<TeamMatches> {
  const links = await db<ResultLink[]>(token, "event_index_results?select=*&order=synced_at.asc.nullsfirst");
  return Object.assign({}, ...links.map(link => link.team_matches ?? {}));
}

/** Explicit table choices take precedence over a legacy event-wide link. */
export function activeIndexLinks(links: ResultLink[]) {
  const scoped = links.some(link => link.table_id !== null);
  return links.filter(link => link.enabled && (scoped ? link.table_id !== null : link.table_id === null));
}

export async function setIndexLink(eventId: string, tableId: string, snapshot: IndexSnapshot, matches: TeamMatches) {
  const now = new Date().toISOString();
  await service("event_index_results?on_conflict=event_id,table_id", {
    method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: { event_id: eventId, table_id: tableId, tournament_id: snapshot.event.id, enabled: true, snapshot, team_matches: matches, synced_at: now, attempt_at: now },
  });
}

export async function switchToManualResults(link: ResultLink) {
  await service("event_index_results?id=eq." + link.id, {
    method: "PATCH", prefer: "return=minimal",
    body: { enabled: false, attempt_at: null },
  });
}

export async function acceptIndexNotification(id: string) {
  const rows = await service<{ id: string }[]>("index_results_notifications?on_conflict=id", {
    method: "POST", prefer: "resolution=ignore-duplicates,return=representation", body: { id },
  });
  return rows.length > 0;
}

export async function releaseIndexNotification(id: string) {
  await service("index_results_notifications?id=eq." + id, { method: "DELETE" });
}

async function liveLinks() {
  return service<(ResultLink & { events: EventRef })[]>(
    "event_index_results?select=*,events!inner(id,slug,status)&events.status=eq.live"
  );
}

export async function syncIndexTournament(tournamentId: string) {
  // Re-read after a competing write and fetch fresh source data before trying again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const links = await liveLinks();
    const scoped = new Set(links.filter(link => link.table_id !== null).map(link => link.event_id));
    const targets = links.filter(link => link.enabled && link.tournament_id === tournamentId &&
      (link.table_id !== null || !scoped.has(link.event_id)));
    if (!targets.length) return;

    let snapshot: IndexSnapshot;
    try {
      snapshot = await indexSnapshot(tournamentId);
    } catch (error) {
      if (!(error instanceof IndexResultsError && error.status === 404)) throw error;
      const paused = await Promise.all(targets.map(link => pauseIndexLink(link, link.attempt_at)));
      if (paused.every(Boolean)) return;
      continue;
    }
    const saved = await Promise.all(targets.map(link => saveIndexRefresh(link, snapshot, link.attempt_at)));
    if (saved.every(Boolean)) return;
  }
  throw new Error("The results changed during sync.");
}

export async function saveIndexRefresh(link: ResultLink, snapshot: IndexSnapshot, attempt: string | null) {
  const condition = new URLSearchParams({
    id: "eq." + link.id, tournament_id: "eq." + link.tournament_id,
    enabled: "eq.true", attempt_at: attempt ? "eq." + attempt : "is.null",
    synced_at: link.synced_at ? "eq." + link.synced_at : "is.null",
  });
  const [saved] = await service<ResultLink[]>("event_index_results?" + condition, {
    method: "PATCH", prefer: "return=representation",
    body: { snapshot, synced_at: new Date().toISOString() },
  });
  return saved;
}

async function pauseIndexLink(link: ResultLink, attempt: string | null) {
  const condition = new URLSearchParams({
    id: "eq." + link.id, tournament_id: "eq." + link.tournament_id,
    enabled: "eq.true", attempt_at: attempt ? "eq." + attempt : "is.null",
    synced_at: link.synced_at ? "eq." + link.synced_at : "is.null",
  });
  const [paused] = await service<ResultLink[]>("event_index_results?" + condition, {
    method: "PATCH", prefer: "return=representation", body: { enabled: false },
  });
  return paused;
}

const canRefresh = (event: EventRef, link: ResultLink) => event.status === "live" && link.enabled && !link.snapshot?.completed;

/** The MGL team for each Heaven Index team on a link: the confirmed match, else a unique exact name. */
async function teamsFor(links: ResultLink[]): Promise<Map<string, Record<string, MglTeamRef>>> {
  const ids = [...new Set(links.flatMap(link => Object.values(link.team_matches ?? {}).filter(id => id !== null)))];
  const [matched, league] = await Promise.all([
    ids.length
      ? service<{ id: string; slug: string; name: string; logo_url: string | null }[]>("teams?select=id,slug,name,logo_url&id=in.(" + ids.join(",") + ")").catch(() => [])
      : [],
    readLeague().catch(() => null),
  ]);
  const byId = new Map(matched.map(({ id, slug, name, logo_url }) => [id, { slug, name, ...(logo_url ? { logo: logo_url } : {}) }]));
  const normalize = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const byName = new Map<string, MglTeamRef | null>();
  for (const { slug, name, logo } of league?.teams ?? []) {
    const label = normalize(name);
    // A duplicate name is ambiguous, even if only one record has a logo.
    byName.set(label, byName.has(label) ? null : { slug, name, ...(logo ? { logo } : {}) });
  }
  return new Map(links.map(link => {
    const teams: [string, MglTeamRef][] = [];
    const matches = link.team_matches ?? {};
    for (const { id, name } of link.snapshot?.tables.flatMap(table => table.teams) ?? []) {
      const confirmed = Object.hasOwn(matches, id) ? matches[id] : undefined;
      // An admin said this one has no MGL team: don't guess.
      if (confirmed === null) continue;
      const team = (confirmed && byId.get(confirmed)) || byName.get(normalize(name));
      if (team) teams.push([id, team]);
    }
    return [link.id, Object.fromEntries(teams)];
  }));
}

export async function refreshIndexLink(event: EventRef, link: ResultLink) {
  if (!canRefresh(event, link)) return link;
  if (link.attempt_at && Date.now() - Date.parse(link.attempt_at) < 60_000) return link;
  const [claim] = await service<{attempt_at: string}[]>("rpc/claim_index_table_refresh", {
    method: "POST", body: { target_link: link.id, source: link.tournament_id },
  });
  if (!claim) return link;
  try {
    const snapshot = await indexSnapshot(link.tournament_id);
    return (await saveIndexRefresh(link, snapshot, claim.attempt_at)) ?? link;
  } catch (error) {
    if (error instanceof IndexResultsError && error.status === 404) {
      const paused = await pauseIndexLink(link, claim.attempt_at);
      return paused ?? link;
    }
    // The public read keeps its last good snapshot; the scheduler reports the failure.
    throw error;
  }
}

export async function getPublicIndexResults(slug: string): Promise<PublicIndexResults | null> {
  if (!eventSlug.test(slug) || slug.length > 180 || !process.env.SUPABASE_SECRET_KEY) return null;
  const [event] = await service<EventRef[]>("events?select=id,slug,status&slug=eq." + slug);
  if (!event || event.status !== "live") return null;
  const links = activeIndexLinks(await service<ResultLink[]>("event_index_results?select=*&event_id=eq." + event.id));
  if (!links.length) return null;
  const [tables, refreshed] = await Promise.all([
    service<{ id: string; name: string }[]>("event_tables?select=id,name&event_id=eq." + event.id + "&order=sort.asc"),
    Promise.all(links.map(link => refreshIndexLink(event, link).catch(() => link))),
  ]);
  const names = new Map(tables.map((table, index) => [table.id, { name: table.name, index }]));
  refreshed.sort((a, b) => (names.get(a.table_id ?? "")?.index ?? 0) - (names.get(b.table_id ?? "")?.index ?? 0));
  const shown = refreshed.flatMap(link => {
    const table = link.table_id ? names.get(link.table_id)?.name : null;
    if (!link.enabled || !link.snapshot || table === undefined) return [];
    try {
      return [{ table, link, snapshot: parseIndexSnapshot(link.snapshot, link.tournament_id) }];
    } catch { return []; }
  });
  const teams = await teamsFor(shown.map(({ link, snapshot }) => ({ ...link, snapshot })));
  const sources: PublicIndexResults["sources"] = shown.map(({ table, link, snapshot }) => {
    // Visitors get the results; the list of entered teams is only for the admin's check.
    delete snapshot.registeredTeams;
    return { table, snapshot, syncedAt: link.synced_at, refresh: canRefresh(event, link), teams: teams.get(link.id) };
  });
  return { sources, mglLogos: {} };
}

export async function syncLiveIndexResults() {
  const links = await liveLinks();
  const expiry = encodeURIComponent(new Date(Date.now() - 86_400_000).toISOString());
  await service("index_results_notifications?received_at=lt." + expiry, { method: "DELETE" }).catch(() => {});
  const scoped = new Set(links.filter(link => link.table_id !== null).map(link => link.event_id));
  const eligible = links.filter(link => link.enabled && !link.snapshot?.completed && (link.table_id !== null || !scoped.has(link.event_id)));
  const results = await Promise.allSettled(eligible.map(link => refreshIndexLink(link.events, link)));
  return {
    checked: results.length,
    failed: results.filter(result => result.status === "rejected").length,
  };
}
