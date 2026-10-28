/**
 * Teams, people and event registrations, hand-entered until the one-time import and the admin.
 *
 * Season 10 is real (`season-10.ts`): 124 squads, their rosters from the kill sheet, players by
 * professional name. Nobody has a country or photo yet, so pages show initials and no flag.
 *
 * PLACEHOLDER: the squads in the other events' tables are made up, and so are their rosters,
 * generated from a fixed seed. Replace them with real records as their sheets arrive; pages need
 * no changes.
 */

import { events } from "./events";
import { hashOf, PLACEHOLDER_TEAMS, random, slugOf } from "./sample";
import { season10Entries, season10People, season10Teams } from "./season-10";
import type { EntryRecord, LineupRecord, PersonRecord, TeamRecord } from "./types";

const HANDLES = [
  "Kofi", "Zuri", "Ayo", "Dami", "Femi", "Tobi", "Kwame", "Esi", "Amara", "Chidi", "Obi", "Sefu",
  "Bayo", "Imani", "Jabari", "Nia", "Tamu", "Uzo", "Yaw", "Zola", "Ace", "Vex", "Kade", "Lynx",
  "Mako", "Riven", "Sol", "Wren", "Xan", "Cruz", "Drift", "Flint", "Kilo", "Mav", "Nyx", "Oro",
  "Pike", "Rogue", "Shade", "Talon", "Viper", "Volt", "Quill", "Rafe", "Sage", "Taz", "Pax", "Bash",
];

const real = new Set(season10Teams.map((t) => t.slug));
const placeholderPeople: PersonRecord[] = [];
const taken = new Set(season10People.map((p) => p.slug));

/** A made-up player whose slug never clashes with a real one. */
function person(rand: () => number): string {
  const base = HANDLES[Math.floor(rand() * HANDLES.length)];
  const name = [`${base}`, `${base}${Math.floor(rand() * 90) + 10}`, `x${base}`, `${base}X`].find((n) => !taken.has(slugOf(n))) ?? `${base}${taken.size}`;
  taken.add(slugOf(name));
  placeholderPeople.push({ slug: slugOf(name), name });
  return slugOf(name);
}

const placeholderSlugs = [...new Set(events.flatMap((e) => e.tables.flatMap((t) => t.rows.map((r) => r.team))))].filter((s) => !real.has(s));
const placeholderTeams: TeamRecord[] = placeholderSlugs.map((slug) => ({
  slug,
  name: PLACEHOLDER_TEAMS.find((n) => slugOf(n) === slug) ?? slug,
}));

/** Each made-up squad's roster: four to six players. */
const lineups = new Map<string, LineupRecord[]>(
  placeholderTeams.map((team) => {
    const rand = random(hashOf(`${team.name} roster`));
    return [team.slug, Array.from({ length: 4 + Math.floor(rand() * 3) }, () => ({ player: person(rand) }))];
  }),
);

export const teams: TeamRecord[] = [...season10Teams, ...placeholderTeams];
export const people: PersonRecord[] = [...season10People, ...placeholderPeople];

/** One registration per squad per event it appears in, in the tier it played. */
export const entries: EntryRecord[] = [
  ...season10Entries,
  ...events
    .filter((e) => e.slug !== "season-10")
    .flatMap((e) => e.tables.flatMap((t) => t.rows.map((r) => ({ event: e.slug, team: r.team, tier: t.tier, lineup: lineups.get(r.team) ?? [] })))),
];
