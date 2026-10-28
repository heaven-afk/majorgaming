/**
 * The one place pages read MGL's records from. League records (events, tables, teams, people,
 * registrations, kills) and news come from Supabase through `db.ts`, read once per build.
 * Server only: browser components import types from here, never values.
 */

import { additionalCommunityAvatars, communityAvatars, communityAvatarsSetThree, referenceBasedCommunityAvatars } from "@/content/visual-assets";
import type { EventRecord, KillRecord, PersonRecord, StoryRecord, TableRecord, TeamRecord } from "@/data/types";
import { loadContent, loadLeague } from "./db";

const [{ events: eventRecords, teams: teamRecords, people, entries, kills: killRecords }, { stories: storyRecords }] = await Promise.all([loadLeague(), loadContent()]);

/** How many players a kill table shows, unless the event sets its own. */
const KILL_TABLE_SIZE = 20;
export type { StoryRecord as Story, TeamRecord as Team };

/** A standings row with its team resolved and its total added. */
export type Row = {
  slug: string;
  name: string;
  tag?: string;
  placement: number;
  kills: number;
  /** Points added or taken off by the admins (penalties are negative). */
  bonus: number;
  total: number;
  move?: number;
};

/** A table sorted by total points. */
export type Table = { name: string; short: string; tier?: number; rows: Row[] };

/** `champion` is the top of the first table; events still to come have no tables, so no champion. */
export type LeagueEvent = Omit<EventRecord, "tables"> & { tables: Table[]; squads: number; champion?: Row };

const teamMap = new Map(teamRecords.map((t) => [t.slug, t]));

function rank(table: TableRecord): Table {
  const rows = table.rows
    .map((r): Row => {
      const team = teamMap.get(r.team);
      const bonus = r.bonus ?? 0;
      return { slug: r.team, name: team?.name ?? r.team, tag: team?.tag, placement: r.placement, kills: r.kills, bonus, total: r.placement + r.kills + bonus, move: r.move };
    })
    // Stable: squads level on points keep the order the results sheet ranked them in.
    .sort((a, b) => b.total - a.total);
  return { name: table.name, short: table.tier ? `T${table.tier}` : table.name, tier: table.tier, rows };
}

/** Newest first: by start date where known, otherwise in the order they were entered. */
export const events: LeagueEvent[] = eventRecords
  .map((e, i) => ({ e, i }))
  .sort((a, b) => (a.e.startDate && b.e.startDate ? b.e.startDate.localeCompare(a.e.startDate) : a.i - b.i))
  .map(({ e }) => {
    const tables = e.tables.map(rank);
    // Registered squads: some events only published their top squads' points.
    const registered = entries.filter((r) => r.event === e.slug).length;
    return { ...e, tables, squads: Math.max(registered, tables.reduce((n, t) => n + t.rows.length, 0)), champion: tables[0]?.rows[0] };
  });

export function eventBySlug(slug: string) {
  return events.find((e) => e.slug === slug);
}

/** The event Home and the Events page lead with: the live one, otherwise the newest finished. */
export const featuredEvent = events.find((e) => e.status === "live") ?? events.find((e) => e.status === "final") ?? events[0];

/** Events announced but not started, soonest first. */
export const upcomingEvents = events.filter((e) => e.status === "upcoming").reverse();

/** The newest finished MGL Season: names the honours and the next season to register for. */
export const latestSeason = events.find((e) => e.series === "MGL Season" && e.status === "final") ?? featuredEvent;

/** One line about an event's size, e.g. "2 tiers · 50 squads". */
export function sizeOf(event: LeagueEvent) {
  const tiered = event.tables.every((t) => t.tier);
  const tables = tiered ? `${event.tables.length} ${event.tables.length === 1 ? "tier" : "tiers"}` : `${event.tables.length} ${event.tables.length === 1 ? "table" : "tables"}`;
  return `${tables} · ${event.squads} squads`;
}

/** One kill table row, with its player and team resolved and tied players sharing a rank. */
export type Fragger = {
  rank: number;
  slug: string;
  /** Professional name. */
  name: string;
  ign?: string;
  photo?: string;
  country?: string;
  team: { slug: string; name: string; tag?: string };
  kills: number;
  matches?: number;
};

/** One tier's top fraggers. */
export type KillTable = { name: string; short: string; rows: Fragger[] };

/**
 * An event's kill tables, each its top players by kills (20 unless the event sets its own): one per
 * group where the kill sheet has them (the Mixed Event's men and women), otherwise one per
 * standings table, a player counting in the tier their squad registered in. Empty until the event
 * has a kill sheet.
 */
export function killTablesOf(event: LeagueEvent): KillTable[] {
  const all = killRecords.filter((k) => k.event === event.slug);
  const tierOf = new Map(entries.filter((r) => r.event === event.slug).map((r) => [r.team, r.tier]));
  const groups = [...new Set(all.flatMap((k) => k.group ?? []))];
  const splits = groups.length
    ? groups.map((g) => ({ name: g, short: g, keep: (k: KillRecord) => k.group === g }))
    : event.tables.map((t) => ({ name: t.name, short: t.short, keep: (k: KillRecord) => t.tier === undefined || tierOf.get(k.team) === t.tier }));
  return splits
    .map((split) => {
      const rows = all
        .filter(split.keep)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, event.killTableSize ?? KILL_TABLE_SIZE);
      return {
        name: split.name,
        short: split.short,
        rows: rows.map((k): Fragger => {
          const person = personBySlug(k.player);
          const team = teamMap.get(k.team);
          return {
            rank: rows.findIndex((r) => r.kills === k.kills) + 1,
            slug: k.player,
            name: person?.name ?? k.player,
            ign: person?.ign,
            photo: person?.photo,
            country: person?.country,
            team: { slug: k.team, name: team?.name ?? k.team, tag: team?.tag },
            kills: k.kills,
            matches: k.matches,
          };
        }),
      };
    })
    .filter((t) => t.rows.length > 0);
}

// ---------- Teams ----------

export const teams = teamRecords;

export function teamBySlug(slug: string) {
  return teamMap.get(slug);
}

/** Players without a photo get one of the 40 character avatars, picked from their slug so it never changes. */
const AVATARS = [...communityAvatars, ...additionalCommunityAvatars, ...communityAvatarsSetThree, ...referenceBasedCommunityAvatars].map((a) => a.src);
const avatarOf = (slug: string) => AVATARS[[...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATARS.length];

const personMap = new Map(people.map((p): [string, PersonRecord] => [p.slug, { ...p, photo: p.photo ?? avatarOf(p.slug) }]));
export function personBySlug(slug: string) {
  return personMap.get(slug);
}

/** The newest event with registrations: its squads are the ones on the Teams page. */
export const activeEvent = events.find((e) => entries.some((r) => r.event === e.slug)) ?? events[0];

/** A team's registration for one event, with its people resolved. */
export function entryOf(team: string, event: string) {
  const entry = entries.find((r) => r.team === team && r.event === event);
  if (!entry) return undefined;
  return {
    ...entry,
    manager: entry.manager ? personBySlug(entry.manager) : undefined,
    roster: entry.lineup.map((l) => ({ ...l, person: personBySlug(l.player) ?? ({ slug: l.player, name: l.player, photo: avatarOf(l.player) } as PersonRecord) })),
  };
}

/** Every event a team registered for, newest first, with the tier it played in. */
export function eventsOf(team: string) {
  return events.flatMap((e) => {
    const entry = entries.find((r) => r.team === team && r.event === e.slug);
    return entry ? [{ event: e, tier: entry.tier }] : [];
  });
}

/** A team's newest registration. */
export function latestEntryOf(team: string) {
  const latest = eventsOf(team)[0];
  return latest ? entryOf(team, latest.event.slug) : undefined;
}

/** One squad in the directory: light enough to hand to the browser for search and filters. */
export type DirectoryTeam = {
  slug: string;
  name: string;
  tag?: string;
  tier?: number;
  players: number;
  /** The first few players on the roster, for the card's face row: a portrait, or initials. */
  faces: { name: string; photo?: string }[];
};

/** The squads registered for the active event, tier by tier, then by name. */
export const activeTeams: DirectoryTeam[] = entries
  .filter((r) => r.event === activeEvent.slug)
  .map((r) => {
    const team = teamMap.get(r.team);
    const faces = r.lineup.slice(0, 4).map((l) => {
      const person = personBySlug(l.player);
      return { name: person?.name ?? l.player, photo: person?.photo };
    });
    return { slug: r.team, name: team?.name ?? r.team, tag: team?.tag, tier: r.tier, players: r.lineup.length, faces };
  })
  .sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.name.localeCompare(b.name));

// ---------- News ----------

/** Newest first. */
export const stories = [...storyRecords].sort((a, b) => b.date.localeCompare(a.date));

export function storyBySlug(slug: string) {
  return stories.find((s) => s.slug === slug);
}

export function readingTime(story: StoryRecord) {
  const text = story.body.map((b) => ("p" in b ? b.p : "h" in b ? b.h : "quote" in b ? b.quote : b.list.join(" "))).join(" ");
  return Math.max(1, Math.round(text.split(/\s+/).length / 220));
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export function formatDate(iso: string) {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}
