/**
 * Reads MGL's records from Supabase: `league_snapshot()` returns every event, table, team,
 * person, registration and kill row the public pages show, and `site_content()` the published
 * news stories and the staff (both in `supabase/migrations/`), in the shapes of
 * `src/data/types.ts` and `src/data/staff.ts`.
 *
 * Uses the publishable key: the public site only ever reads, and row level security allows
 * nothing else. Server only; `src/lib/league.ts` is the one caller.
 */

import type { StaffRecord } from "@/data/staff";
import type { EntryRecord, EventRecord, KillRecord, PersonRecord, StoryRecord, TeamRecord } from "@/data/types";

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
    events: data.events.map(({ matchesPlayed, matchesTotal, kind: _kind, description, details, ...e }) => ({
      ...e,
      ...(description?.length ? { description } : {}),
      ...(details?.length ? { details } : {}),
      ...(matchesTotal !== undefined ? { matches: { played: matchesPlayed ?? 0, total: matchesTotal } } : {}),
    })),
  };
}

let content: Promise<{ stories: StoryRecord[]; staff: StaffRecord[] }> | undefined;

/** News and staff, read once and shared by `league.ts` (news) and `staff.ts`. */
export function loadContent() {
  content ??= rpc("site_content");
  return content;
}
