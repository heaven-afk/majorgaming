import "server-only";
import { db, DbError } from "@/lib/admin/supabase";
import { readLeague } from "@/lib/db";
import { eventSlug, parseIndexSnapshot, type IndexSnapshot, type PublicIndexResults } from "./contract";
import { indexSnapshot, IndexResultsError } from "./client";

export type ResultLink = {
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

export async function getAdminLink(token: string, eventId: string): Promise<ResultLink | undefined> {
  try {
    const [link] = await db<ResultLink[]>(token, "event_index_results?event_id=eq." + eventId);
    return link;
  } catch (error) {
    if (error instanceof DbError && error.status === 404) {
      throw new DbError("Apply the live results database migration first.", 404);
    }
    throw error;
  }
}

export async function setIndexLink(eventId: string, snapshot: IndexSnapshot) {
  const now = new Date().toISOString();
  await service("event_index_results?on_conflict=event_id", {
    method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: { event_id: eventId, tournament_id: snapshot.event.id, enabled: true, snapshot, synced_at: now, attempt_at: now },
  });
}

export async function useManualResults(eventId: string) {
  await service("event_index_results?event_id=eq." + eventId, {
    method: "PATCH", prefer: "return=minimal",
    body: { enabled: false, attempt_at: null },
  });
}

export async function saveIndexRefresh(link: ResultLink, snapshot: IndexSnapshot, attempt: string | null) {
  const condition = new URLSearchParams({
    event_id: "eq." + link.event_id, tournament_id: "eq." + link.tournament_id,
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

async function logosFor(snapshot: IndexSnapshot | null): Promise<Record<string, string>> {
  if (!snapshot?.tables.some(table => table.teams.length)) return {};
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
  for (const table of snapshot.tables) {
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
  const [claim] = await service<{attempt_at: string}[]>("rpc/claim_event_index_refresh", {
    method: "POST", body: { target: event.id, source: link.tournament_id },
  });
  if (!claim) return link;
  try {
    const snapshot = await indexSnapshot(link.tournament_id);
    return (await saveIndexRefresh(link, snapshot, claim.attempt_at)) ?? link;
  } catch (error) {
    if (error instanceof IndexResultsError && error.status === 404) {
      const condition = new URLSearchParams({
        event_id: "eq." + link.event_id, tournament_id: "eq." + link.tournament_id,
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
  const [link] = await service<ResultLink[]>("event_index_results?event_id=eq." + event.id + "&enabled=eq.true");
  if (!link) return null;
  const current = await refreshIndexLink(event, link).catch(() => link);
  if (!current.enabled) return null;
  const snapshot = current.snapshot ? parseIndexSnapshot(current.snapshot, current.tournament_id) : null;
  return { snapshot, syncedAt: current.synced_at, refresh: canRefresh(event, current), mglLogos: await logosFor(snapshot) };
}

export async function syncLiveIndexResults() {
  const links = await service<(ResultLink & { events: EventRef })[]>(
    "event_index_results?select=*,events!inner(id,slug,status)&enabled=eq.true&events.status=eq.live"
  );
  const eligible = links.filter(link => !link.snapshot?.completed);
  const results = await Promise.allSettled(eligible.map(link => refreshIndexLink(link.events, link)));
  return {
    checked: results.length,
    failed: results.filter(result => result.status === "rejected").length,
  };
}
