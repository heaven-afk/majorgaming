/**
 * Reads MGL's records from Supabase: `league_snapshot()` returns every event, table, team,
 * person, registration and kill row the public pages show, and `site_content()` the published
 * news stories and the staff (both in `supabase/migrations/`), in the shapes of
 * `src/data/types.ts` and `src/data/staff.ts`.
 *
 * Uses the publishable key: the public site only ever reads, and row level security allows
 * nothing else. Server only.
 *
 * `readLeague` and `readContent` are cached with no expiry under the tags in `TAGS`; an admin
 * save clears its tag (`updateTag`), and the next visit reads the database again.
 */

import { cacheLife, cacheTag } from "next/cache";
import type { StaffRecord } from "@/data/staff";
import type { EntryRecord, EventRecord, KillRecord, PersonRecord, StoryRecord, TeamRecord } from "@/data/types";
import { registrationOf, today } from "./registration";

export type League = { events: EventRecord[]; teams: TeamRecord[]; people: PersonRecord[]; entries: EntryRecord[]; kills: KillRecord[] };

type Snapshot = Omit<League, "events"> & {
  events: (Omit<EventRecord, "matches"> & { matchesPlayed?: number; matchesTotal?: number; kind?: string })[];
};

/** Drops empty values, so optional fields are left out exactly as in the record types. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null && v !== false)
        .map(([k, v]) => [k, clean(v)]),
    ) as T;
  }
  return value;
}

/** Calls one of the read functions with the publishable key. */
async function rpc<T>(name: string): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set to read the database.");

  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`Reading ${name} from Supabase failed: ${res.status} ${await res.text()}`);
  return clean((await res.json()) as T);
}

export async function loadLeague(): Promise<League> {
  const data = await rpc<Snapshot>("league_snapshot");
  return {
    ...data,
    events: data.events.map(({ matchesPlayed, matchesTotal, kind, description, details, ...e }) => ({
      ...e,
      ...(kind === "season" ? { ranked: true } : {}),
      ...(description?.length ? { description } : {}),
      ...(details?.length ? { details } : {}),
      ...(matchesTotal !== undefined ? { matches: { played: matchesPlayed ?? 0, total: matchesTotal } } : {}),
    })),
  };
}

export function loadContent() {
  return rpc<{ stories: StoryRecord[]; staff: StaffRecord[] }>("site_content");
}

/** Cache tags: what an admin save clears. */
export const TAGS = { league: "league", content: "content" } as const;

export async function readLeague() {
  "use cache";
  cacheTag(TAGS.league);
  // Hourly, so registration opens and closes on its dates without anyone saving.
  cacheLife("hours");
  const data = await loadLeague();
  const day = today();
  return { ...data, events: data.events.map((e) => ({ ...e, registration: registrationOf(e, day) })) };
}

export async function readContent() {
  "use cache";
  cacheTag(TAGS.content);
  cacheLife("max");
  return loadContent();
}
