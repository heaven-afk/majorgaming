/**
 * MGL's events, newest first, until the admin and database exist. Each event's results (tables,
 * registrations, kills) are generated from the owner's sheets into `generated/` by
 * `scripts/league-data.py`; this file only names and orders the events.
 *
 * The order is assumed: the events have no start dates yet.
 */

import { carry1stEvent } from "./generated/carry1st-event";
import { mixedEventSeason4 } from "./generated/mixed-event-season-4";
import { season10 } from "./generated/season-10";
import { season9 } from "./generated/season-9";
import type { EventRecord, EventResults, LeagueRecord } from "./types";

export const league: LeagueRecord = { tiers: 5, squadsPerTier: 25 };

/** Events still to come have no results yet. */
type Event = Omit<EventRecord, "tables" | "matches"> & { results?: EventResults };

const none: EventResults = { tables: [], entries: [], kills: [] };

const records: Event[] = [
  { slug: "season-10", name: "Season 10", series: "MGL Season", number: 10, status: "final", results: season10 },
  { slug: "carry1st-event", name: "Carry1st Event", series: "Carry1st", status: "final", results: carry1stEvent },
  // Two men and two women per squad. Only the top 10 squads' points were published.
  { slug: "mixed-event-season-4", name: "Mixed Event Season 4", series: "Mixed Event", number: 4, status: "final", killTableSize: 10, results: mixedEventSeason4 },
  { slug: "season-9", name: "Season 9", series: "MGL Season", number: 9, status: "final", results: season9 },
];

export const events: EventRecord[] = records.map(({ results = none, ...e }) => ({
  ...e,
  tables: results.tables,
  ...(results.matches ? { matches: { played: results.matches, total: results.matches } } : {}),
}));

/** Every event's results, by event slug, for the registrations and kill rows. */
export const results = records.map((e) => ({ event: e.slug, ...(e.results ?? none) }));
