/**
 * The one place pages read MGL's records from. League records (events, tables, teams, people,
 * registrations, kills) and news come from Supabase through `db.ts`, cached until an admin save
 * clears them. Pages call `await getLeague()` and read what they need from it.
 * Server only: browser components import types from here, never values.
 */

import { cache } from "react";
import { registration as registrationCopy, site } from "@/content/site";
import { additionalCommunityAvatars, communityAvatars, communityAvatarsSetThree, referenceBasedCommunityAvatars } from "@/content/visual-assets";
import type { EventRecord, KillRecord, LineupRecord, PersonRecord, StoryRecord, TableRecord, TeamRecord } from "@/data/types";
import { readContent, readLeague, type League as Records } from "./db";

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

/** One line about an event's size, e.g. "2 tiers · 50 squads". */
export function sizeOf(event: LeagueEvent) {
  const tiered = event.tables.every((t) => t.tier);
  const tables = tiered ? `${event.tables.length} ${event.tables.length === 1 ? "tier" : "tiers"}` : `${event.tables.length} ${event.tables.length === 1 ? "table" : "tables"}`;
  return `${tables} · ${event.squads} squads`;
}

/** Players without a photo get one of the 40 character avatars, picked from their slug so it never changes. */
const AVATARS = [...communityAvatars, ...additionalCommunityAvatars, ...communityAvatarsSetThree, ...referenceBasedCommunityAvatars].map((a) => a.src);
const avatarOf = (slug: string) => AVATARS[[...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATARS.length];

/** Everything the pages read, built from the stored records. */
function build({ events: eventRecords, teams: teamRecords, people, entries, kills: killRecords }: Records, storyRecords: StoryRecord[]) {
  const teamMap = new Map(teamRecords.map((t) => [t.slug, t]));

  function rank(table: TableRecord): Table {
    const rows = table.rows
      .map((r): Row => {
        const team = teamMap.get(r.team);
        const bonus = r.bonus ?? 0;
        // Each event shows the name the team had then; only the pro names of players are shared.
        return { slug: r.team, name: r.teamName ?? team?.name ?? r.team, tag: (r.teamName ? r.teamTag : team?.tag) ?? undefined, placement: r.placement, kills: r.kills, bonus, total: r.placement + r.kills + bonus, move: r.move };
      })
      // Stable: squads level on points keep the order the results sheet ranked them in.
      .sort((a, b) => b.total - a.total);
    return { name: table.name, short: table.tier ? `T${table.tier}` : table.name, tier: table.tier, rows };
  }

  /** Newest first: by start date where known, otherwise in the order they were entered. */
  const events: LeagueEvent[] = eventRecords
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.startDate && b.e.startDate ? b.e.startDate.localeCompare(a.e.startDate) : a.i - b.i))
    .map(({ e }) => {
      const tables = e.tables.map(rank);
      // Registered squads: some events only published their top squads' points.
      const registered = entries.filter((r) => r.event === e.slug).length;
      return { ...e, tables, squads: Math.max(registered, tables.reduce((n, t) => n + t.rows.length, 0)), champion: tables[0]?.rows[0] };
    });

  function eventBySlug(slug: string) {
    return events.find((e) => e.slug === slug);
  }

  /** The event Home and the Events page lead with: the live one, otherwise the newest finished. */
  const featuredEvent = events.find((e) => e.status === "live") ?? events.find((e) => e.status === "final") ?? events[0];

  /** Events announced but not started, soonest first. */
  const upcomingEvents = events.filter((e) => e.status === "upcoming").reverse();

  /**
   * The event taking registrations, which every register button and status pill on the site
   * follows: an upcoming event whose registration is open (its dates already applied), a ranked
   * season first. Between events the buttons fall back to the Discord.
   */
  const openNow = upcomingEvents.filter((e) => e.registration === "open");
  const registering = openNow.find((e) => e.ranked) ?? openNow[0];
  const registration = registering
    ? { open: true, event: registering, label: registrationCopy.label, href: registering.registrationUrl ?? site.discord, note: registering.registrationNote }
    : { open: false, event: undefined, label: registrationCopy.label, href: site.discord, note: undefined };

  /** The newest finished MGL Season: names the honours and the next season to register for. */
  const latestSeason = events.find((e) => e.series === "MGL Season" && e.status === "final") ?? featuredEvent;

  /**
   * An event's kill tables, each its top players by kills (20 unless the event sets its own): one per
   * group where the kill sheet has them (the Mixed Event's men and women), otherwise one per
   * standings table, a player counting in the tier their squad registered in. Empty until the event
   * has a kill sheet.
   */
  function killTablesOf(event: LeagueEvent): KillTable[] {
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
              // The in-game name from this event's own sheet, not today's.
              ign: k.ign ?? undefined,
              photo: person?.photo,
              country: person?.country,
              team: { slug: k.team, name: k.teamName ?? team?.name ?? k.team, tag: (k.teamName ? k.teamTag : team?.tag) ?? undefined },
              kills: k.kills,
              matches: k.matches,
            };
          }),
        };
      })
      .filter((t) => t.rows.length > 0);
  }

  // ---------- Teams ----------

  const teams = teamRecords;

  function teamBySlug(slug: string) {
    return teamMap.get(slug);
  }

  const personMap = new Map(people.map((p): [string, PersonRecord] => [p.slug, { ...p, photo: p.photo ?? avatarOf(p.slug) }]));
  function personBySlug(slug: string) {
    return personMap.get(slug);
  }

  /**
   * The latest ranked season with teams locked in: the Teams page lists its teams, by the tier
   * they play in it. When the next season's teams are locked in, it takes over by itself.
   */
  const registered = (e: { slug: string }) => entries.some((r) => r.event === e.slug);
  const activeEvent = events.find((e) => e.ranked && registered(e)) ?? events[0];
  const seasonTier = new Map(entries.filter((r) => r.event === activeEvent.slug).map((r) => [r.team, r.tier]));

  /** A team's registration for one event, with its people resolved. */
  function entryOf(team: string, event: string) {
    const entry = entries.find((r) => r.team === team && r.event === event);
    if (!entry) return undefined;
    return { ...entry, manager: entry.manager ? { name: entry.manager } : undefined, roster: resolve(entry.lineup) };
  }

  /** Every event a team registered for, newest first, with the tier it played in. */
  function eventsOf(team: string) {
    return events.flatMap((e) => {
      const entry = entries.find((r) => r.team === team && r.event === e.slug);
      return entry ? [{ event: e, tier: entry.tier }] : [];
    });
  }

  const resolve = (lineup: LineupRecord[]) => lineup.map((l) => ({ ...l, person: personBySlug(l.player) ?? ({ slug: l.player, name: l.player, photo: avatarOf(l.player) } as PersonRecord) }));

  /**
   * What a team is now: its manager and roster, owned by the team and edited in the admin with
   * no season involved (events keep the roster that played them), and its tier in the latest
   * ranked season. A team not in that season isn't ranked.
   */
  function profileOf(slug: string) {
    const team = teamMap.get(slug);
    if (!team) return undefined;
    const tier = seasonTier.get(slug) ?? undefined;
    return { tier, ranked: seasonTier.has(slug), manager: team.manager ? { name: team.manager } : undefined, roster: resolve(team.roster ?? []) };
  }

  /** The directory: the latest ranked season's teams, by their tier in it, then by name. */
  const activeTeams: DirectoryTeam[] = teamRecords
    .filter((t) => seasonTier.has(t.slug) && !t.archived)
    .map((t) => {
      const faces = (t.roster ?? []).slice(0, 4).map((l) => {
        const person = personBySlug(l.player);
        return { name: person?.name ?? l.player, photo: person?.photo };
      });
      return { slug: t.slug, name: t.name, tag: t.tag, tier: seasonTier.get(t.slug) ?? undefined, players: t.roster?.length ?? 0, faces };
    })
    .sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.name.localeCompare(b.name));

  // News: newest first.
  const stories = [...storyRecords].sort((a, b) => b.date.localeCompare(a.date));
  const storyBySlug = (slug: string) => stories.find((s) => s.slug === slug);

  return {
    events,
    eventBySlug,
    featuredEvent,
    upcomingEvents,
    registration,
    latestSeason,
    killTablesOf,
    teams,
    teamBySlug,
    personBySlug,
    activeEvent,
    entryOf,
    eventsOf,
    profileOf,
    activeTeams,
    stories,
    storyBySlug,
  };
}

export type LeagueData = ReturnType<typeof build>;

/** The league for this request: read from the cache (or the database), built once per request. */
export const getLeague = cache(async () => {
  const [league, content] = await Promise.all([readLeague(), readContent()]);
  return build(league, content.stories);
});

export function readingTime(story: StoryRecord) {
  const text = story.body.map((b) => ("p" in b ? b.p : "h" in b ? b.h : "quote" in b ? b.quote : b.list.join(" "))).join(" ");
  return Math.max(1, Math.round(text.split(/\s+/).length / 220));
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export function formatDate(iso: string) {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}
