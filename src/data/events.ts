/**
 * MGL's events and their tables, hand-entered until the admin and database exist. Newest first.
 *
 * Season 10 is real: every tier's results come from the owner's sheets, through
 * `season-10.ts`. The other events are real events with PLACEHOLDER rows, filled with made-up
 * squads so no real team is shown with results it never had. To enter a real table, generate
 * its file with `scripts/season-sheets.py` (or write rows like
 * `{ team: "kyzon-esport", placement: 286, kills: 312 }`) and add any new team to `teams.ts`.
 */

import { PLACEHOLDER_TEAMS, random, sampleRows, shuffle } from "./sample";
import { season10Tables } from "./season-10";
import type { EventRecord, LeagueRecord, TableRecord } from "./types";

export const league: LeagueRecord = { tiers: 5, squadsPerTier: 25 };

/** Matches played, from the most any squad played across the event's tables. */
function matchesOf(tables: TableRecord[]) {
  const most = Math.max(0, ...tables.flatMap((t) => t.rows.map((r) => r.matches ?? 0)));
  return most ? { played: most, total: most } : undefined;
}

// PLACEHOLDER: which squads fill each table, so the same squad never sits in two tiers at once.
const pool = shuffle(PLACEHOLDER_TEAMS, random(11));
const tier1 = pool.slice(0, 20);
const tier2 = pool.slice(20, 45);
const order = (names: string[], seed: number) => shuffle(names, random(seed));

export const events: EventRecord[] = [
  {
    slug: "season-10",
    name: "Season 10",
    series: "MGL Season",
    number: 10,
    status: "final",
    matches: matchesOf(season10Tables),
    tables: season10Tables,
  },
  {
    slug: "carry1st-event",
    name: "Carry1st Event",
    series: "Carry1st",
    status: "final",
    tables: [
      { name: "Tier 1", tier: 1, rows: sampleRows(order(tier1, 201), 610, 201) },
      { name: "Tier 2", tier: 2, rows: sampleRows(order(tier2, 202), 540, 202) },
    ],
  },
  {
    slug: "mixed-event-season-4",
    name: "Mixed Event Season 4",
    series: "Mixed Event",
    number: 4,
    status: "final",
    tables: [{ name: "Overall", rows: sampleRows(order([...tier1.slice(0, 10), ...tier2.slice(0, 10)], 301), 580, 301) }],
  },
  {
    slug: "season-9",
    name: "Season 9",
    series: "MGL Season",
    number: 9,
    status: "final",
    tables: [{ name: "Tier 1", tier: 1, rows: sampleRows(order(tier1, 401), 600, 401) }],
  },
];
