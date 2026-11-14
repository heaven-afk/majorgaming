import "server-only";
import { db, DbError } from "@/lib/admin/supabase";
import { readLeague } from "@/lib/db";
import { eventSlug, parseIndexSnapshot, type IndexSnapshot, type PublicIndexResults } from "./contract";
import { indexSnapshot, IndexResultsError } from "./client";

export type ResultLink = {
  id: string; table_id: string | null;
  event_id: string; tournament_id: string; enabled: boolean;
  snapshot: IndexSnapshot | null; synced_at: string | null; attempt_at: string | null;
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
    throw new DbError(body.code === "PGRST205" || body.code === "42P01" ? "Apply the live results database migration first." : "The results database request failed.", response.status);
  }
  return (response.status === 204 || response.headers.get("content-length") === "0" ? undefined : await response.json()) as T;
}

export async function getAdminLinks(token: string, eventId: string): Promise<ResultLink[]> {
  try {
    return await db<ResultLink[]>(token, "event_index_results?select=id,event_id,table_id,tournament_id,enabled,snapshot,synced_at,attempt_at&event_id=eq." + eventId);
  } catch (error) {
    if (error instanceof DbError && error.status === 404) {
      throw new DbError("Apply the live results database migration first.", 404);
    }
    throw error;
  }
}

/** Explicit table choices take precedence over a legacy event-wide link. */
export function activeIndexLinks(links: ResultLink[]) {
  const scoped = links.some(link => link.table_id !== null);
  return links.filter(link => link.enabled && (scoped ? link.table_id !== null : link.table_id === null));
}

export async function setIndexLink(eventId: string, tableId: string, snapshot: IndexSnapshot) {
  const now = new Date().toISOString();
  await service("event_index_results?on_conflict=event_id,table_id", {
    method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: { event_id: eventId, table_id: tableId, tournament_id: snapshot.event.id, enabled: true, snapshot, synced_at: now, attempt_at: now },
  });
}

export async function useManualResults(link: ResultLink) {
  await service("event_index_results?id=eq." + link.id, {
    method: "PATCH", prefer: "return=minimal",
    body: { enabled: false, attempt_at: null },
  });
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

const canRefresh = (event: EventRef, link: ResultLink) => event.status === "live" && link.enabled && !link.snapshot?.completed;

async function logosFor(tables: IndexSnapshot["tables"]): Promise<Record<string, string>> {
  if (!tables.some(table => table.teams.length)) return {};
  const league = await readLeague().catch(() => null);
  if (!league) return {};
  const normalize = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const byName = new Map<string, string | null>();
  for (const team of league.teams) {
    const name = normalize(team.name);
    // A duplicate name is ambiguous, even if only one record has a logo.
    byName.set(name, byName.has(name) ? null : team.logo ?? null);
  }
  const logos = new Map<string, string>();
  for (const table of tables) {
    for (const team of table.teams) {
      const logo = byName.get(normalize(team.name));
      if (logo) logos.set(team.name, logo);
    }
  }
  return Object.fromEntries(logos);
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
      const condition = new URLSearchParams({
        id: "eq." + link.id, tournament_id: "eq." + link.tournament_id,
        enabled: "eq.true", attempt_at: "eq." + claim.attempt_at,
        synced_at: link.synced_at ? "eq." + link.synced_at : "is.null",
      });
      const [paused] = await service<ResultLink[]>("event_index_results?" + condition, {
        method: "PATCH", prefer: "return=representation", body: { enabled: false },
      });
      return paused ?? link;
    }
    // The public read keeps its last good snapshot; the scheduler reports the failure.
    throw error;
  }
}

export async function getPublicIndexResults(slug: string): Promise<PublicIndexResults | null> {
  if (!eventSlug.test(slug) || slug.length > 180 || !process.env.SUPABASE_SECRET_KEY) return null;
  const [event] = await service<EventRef[]>("events?select=id,slug,status&slug=eq." + slug);
  if (!event || event.status === "upcoming") return null;
  const links = activeIndexLinks(await service<ResultLink[]>("event_index_results?select=id,event_id,table_id,tournament_id,enabled,snapshot,synced_at,attempt_at&event_id=eq." + event.id));
  if (!links.length) return null;
  const [tables, refreshed] = await Promise.all([
    service<{ id: string; name: string }[]>("event_tables?select=id,name&event_id=eq." + event.id + "&order=sort.asc"),
    Promise.all(links.map(link => refreshIndexLink(event, link).catch(() => link))),
  ]);
  const names = new Map(tables.map((table, index) => [table.id, { name: table.name, index }]));
  refreshed.sort((a, b) => (names.get(a.table_id ?? "")?.index ?? 0) - (names.get(b.table_id ?? "")?.index ?? 0));
  const sources: PublicIndexResults["sources"] = refreshed.flatMap(link => {
    const table = link.table_id ? names.get(link.table_id)?.name : null;
    if (!link.enabled || !link.snapshot || table === undefined) return [];
    try {
      return [{ table, snapshot: parseIndexSnapshot(link.snapshot, link.tournament_id), syncedAt: link.synced_at, refresh: canRefresh(event, link) }];
    } catch { return []; }
  });
  return { sources, mglLogos: await logosFor(sources.flatMap(source => source.snapshot.tables)) };
}

export async function syncLiveIndexResults() {
  const links = await service<(ResultLink & { events: EventRef })[]>(
    "event_index_results?select=*,events!inner(id,slug,status)&events.status=eq.live"
  );
  const scoped = new Set(links.filter(link => link.table_id !== null).map(link => link.event_id));
  const eligible = links.filter(link => link.enabled && !link.snapshot?.completed && (link.table_id !== null || !scoped.has(link.event_id)));
  const results = await Promise.allSettled(eligible.map(link => refreshIndexLink(link.events, link)));
  return {
    checked: results.length,
    failed: results.filter(result => result.status === "rejected").length,
  };
}
