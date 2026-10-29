/**
 * The shapes of MGL's records. Each type is one future database table, so the one-time import
 * and the admin dashboard can create, edit and delete records without changing any page.
 * Records point at each other by slug (`team`, `event`), like foreign keys.
 */

/** League-wide settings: how MGL is organised right now. */
export type LeagueRecord = {
  /** Tiers MGL runs today. */
  tiers: number;
  squadsPerTier: number;
};

export type EventStatus = "upcoming" | "live" | "final";

/** One event: a league season, a mixed event, a partner event… */
export type EventRecord = {
  slug: string;
  /** Full name, e.g. "Season 10" or "Carry1st Event". */
  name: string;
  /** Which run of events it belongs to, e.g. "MGL Season", "Mixed Event". */
  series: string;
  /** A ranked season (tiers, promotion): the Teams page follows the newest one. */
  ranked?: boolean;
  /** Its number within the series, when it has one. */
  number?: number;
  status: EventStatus;
  /** ISO dates (YYYY-MM-DD), each shown only once it is set. Events sort newest first by start date. */
  registrationOpens?: string;
  registrationCloses?: string;
  startDate?: string;
  endDate?: string;
  /** Where to register (the Discord thread or a form); the Discord when empty. */
  registrationUrl?: string;
  /** A line shown with the register button, e.g. "Tiers 3 to 5 only". */
  registrationNote?: string;
  /** Where registration stands, for events still to come (worked out from the dates when set). */
  registration?: "soon" | "open" | "closed" | "full";
  /** Featured poster, portrait or landscape; uploaded in the admin. */
  poster?: { src: string; alt: string; width: number; height: number };
  /** A short line for cards, then the event's write-up as paragraphs. */
  summary?: string;
  description?: string[];
  /** Any other facts the admins add, in order, e.g. { label: "Prize pool", value: "$1,000" }. */
  details?: { label: string; value: string }[];
  /** Matches played and scheduled, when known. */
  matches?: { played: number; total: number };
  /** One table per tier (or a single table for events without tiers). */
  tables: TableRecord[];
  /** How many players each kill table shows (default 20). */
  killTableSize?: number;
};

/** An event's results as the import produces them: tables, registrations and kill rows. */
export type EventResults = {
  matches?: number;
  tables: TableRecord[];
  entries: Omit<EntryRecord, "event">[];
  kills: Omit<KillRecord, "event">[];
};

export type TableRecord = {
  /** Shown on the tab, e.g. "Tier 1" or "Overall". */
  name: string;
  tier?: number;
  rows: StandingRecord[];
};

export type StandingRecord = {
  /** Team slug. */
  team: string;
  /** The team's name and tag as they were in this event (kept when it registered), so a later rename never rewrites it. */
  teamName?: string;
  teamTag?: string | null;
  /** Points from finishing positions. */
  placement: number;
  /** Points from eliminations. */
  kills: number;
  /** Points added or (when negative) taken off by the admins: penalties, bonuses. */
  bonus?: number;
  /** Matches won and played, when the results sheet has them. */
  wins?: number;
  matches?: number;
  /** While an event is live: places gained (+) or lost (−) since the last match day. */
  move?: number;
};

/**
 * One row of an event's kill table: a player, the team they played for in that event, and
 * their kills across the event. Events list their top 20. The team here also confirms which
 * squad a player belonged to, so kill sheets help fill rosters during the import.
 */
export type KillRecord = {
  /** Event slug. */
  event: string;
  /** Person slug. */
  player: string;
  /** The in-game name the player had in this event, from its kill sheet. Null when it had none. */
  ign?: string | null;
  /** Team slug. */
  team: string;
  /** The team's name and tag as they were in this event (kept when it registered), so a later rename never rewrites it. */
  teamName?: string;
  teamTag?: string | null;
  kills: number;
  /** Matches the player played in the event, when the kill sheet has them. */
  matches?: number;
  /** Events with separate kill tables, like the Mixed Event's "Men" and "Women"; otherwise by tier. */
  group?: string;
};

export type TeamRecord = {
  slug: string;
  name: string;
  tag?: string;
  clan?: string;
  /** Logo image path, once teams have them. Teams have no country: their players can come from anywhere. */
  logo?: string;
  /** What the team is now, owned by the team (events keep their own copy): its current tier (none if unranked), manager and roster. */
  tier?: number | null;
  manager?: string | null;
  roster?: LineupRecord[];
  archived?: boolean;
};

export type Role = "IGL" | "Fragger" | "Support" | "Anchor";

/** One person: a player or a manager. Kept once, across every team and event they appear in. */
export type PersonRecord = {
  slug: string;
  /** Professional name, shown everywhere. */
  name: string;
  /** In-game name, when it differs from the professional name. */
  ign?: string;
  /** ISO 3166 two-letter code. Left out until the owner adds countries; pages then hide the flag. */
  country?: string;
  /** Portrait image path. */
  photo?: string;
};

/** One player on a registered roster. A roster is one list, with no limit on its size. */
export type LineupRecord = {
  /** Person slug. */
  player: string;
  role?: Role;
  captain?: boolean;
};

/**
 * A squad's registration for one event: the registration thread post, stored. It records the
 * tier the squad was placed in, its manager and its whole lineup for that event, so a team's
 * history and a player's history both come from these records, one per team per event.
 */
export type EntryRecord = {
  /** Event slug. */
  event: string;
  /** Team slug. */
  team: string;
  /** The team's name and tag as they were in this event (kept when it registered), so a later rename never rewrites it. */
  teamName?: string;
  teamTag?: string | null;
  tier?: number;
  /** The manager's name, typed on the registration (managers aren't players). */
  manager?: string;
  lineup: LineupRecord[];
};

export type Block = { p: string } | { h: string } | { quote: string; by?: string } | { list: string[] };

export type StoryRecord = {
  slug: string;
  title: string;
  category: "Announcement" | "Season recap" | "Feature" | "Update";
  /** ISO date. */
  date: string;
  author: { name: string; role: string };
  excerpt: string;
  cover: { src: string; width: number; height: number; alt: string };
  body: Block[];
};
