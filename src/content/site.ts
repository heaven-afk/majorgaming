import { events, featuredEvent, killTablesOf, latestSeason, league } from "@/lib/league";

const { tiers: TIERS, squadsPerTier: SQUADS_PER_TIER } = league;
import { additionalCommunityAvatars, communityAvatars, heroImages } from "./visual-assets";

// Each section shows its own characters, so the same four faces don't repeat down the page.
const [farah, ghost] = communityAvatars;
const [mantaRay, urbanTracker, nikto, krueger] = additionalCommunityAvatars;

/**
 * All copy, links and images for the site. SAMPLE content: replace with real MGL details.
 */

export const site = {
  name: "Major Gaming League",
  short: "MGL",
  discord: "https://discord.gg/your-invite",
};

/** Pages not built yet point nowhere for now. */
export const nav = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Teams", href: "/teams" },
  { label: "News", href: "/news" },
  { label: "Staff", href: "/staff" },
  { label: "Stats", href: "#" },
];

export const socials = [
  { label: "X", href: "#", icon: "x" },
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "YouTube", href: "#", icon: "youtube" },
  { label: "TikTok", href: "#", icon: "tiktok" },
] as const;

export const cta = { label: "Join the Discord", href: site.discord };

/** Registration happens on Discord. While open, the hero button asks squads to register. */
export const registration = { open: true, label: "Register your squad", href: site.discord };

export const hero = {
  community: {
    avatars: communityAvatars,
    /** Two short lines; each stays on one line. */
    text: ["2,000+ ranked players", "across the AF region."],
  },
  /** First line ends with the MGL mark and the italic accent; the remaining lines follow. */
  title: { first: "Africa’s", accent: "top", rest: ["CODM BR org."] },
  lede: "MGL is the ranking organization behind the highest-level ranked events in Call of Duty: Mobile Battle Royale across Africa. Registered squads compete through each season, and every match moves the rankings.",
  /** What MGL covers. Placeholder row, shown as small icons along the bottom of the panel. */
  features: [
    { icon: "parachute", label: "Battle royale" },
    { icon: "trophy", label: "Events" },
    { icon: "squad", label: "Teams" },
    { icon: "chart", label: "Rankings" },
    { icon: "crosshair", label: "Stats" },
    { icon: "crown", label: "Champions" },
    { icon: "calendar", label: "Seasons" },
    { icon: "fantasy", label: "Fantasy" },
    { icon: "discord", label: "Discord community" },
  ],
  /** Right panel. The arrival image glitches over to the return image and back. */
  images: {
    drop: { src: heroImages.arrival.src, alt: heroImages.arrival.alt, focus: [0.62, 0.4] },
    after: { src: heroImages.return.src, alt: "", focus: [0.5, 0.55] },
  },
  chips: ["compete", "ranked"],
};

/** About MGL. Statement tokens: plain text, an inline image chip, or the italic accent. */
export const about = {
  label: "About MGL",
  meta: "Ranked CODM BR · AF region",
  statement: [
    { text: "MGL is where Africa’s best" },
    { chip: "avatars", avatars: [mantaRay, nikto, krueger] },
    { text: "Call of Duty: Mobile squads get ranked. Structured tiers, verified results and seasons where every match" },
    { chip: "image", src: "/images/about/island-chip.webp" },
    { text: "counts. Reach the top here, and everyone knows you" },
    { accent: "earned it." },
  ],
  image: {
    src: "/images/about/squad.webp",
    alt: "A four-person squad standing ready on the airfield at sunset",
    caption: "Ranked by MGL",
    sub: "Every match counts",
  },
  /** SAMPLE numbers: replace with real figures. */
  stats: [
    { value: latestSeason.number ?? events.length, suffix: "", label: "Ranked seasons", icon: "trophy" },
    { value: 480, suffix: "+", label: "Squads ranked", icon: "squad" },
    { value: 1200, suffix: "+", label: "Matches played", icon: "crosshair" },
    { value: 2000, suffix: "+", label: "Players in the community", icon: "discord" },
  ],
} as const;

export const howItWorks = {
  label: "How MGL works",
  title: { before: "Three steps to the", accent: "top." },
  steps: [
    {
      title: "Register on Discord",
      body: "When registration opens, post your squad in the MGL Discord: team, manager, captain and all four players.",
    },
    {
      title: "Get placed in your tier",
      body: "Every registered squad is placed in its designated tier, so you compete against teams at your level from day one.",
    },
    {
      title: "Climb the rankings",
      body: "Every match earns points. Rise through the standings and strive to be the best team in Africa.",
    },
  ],
  /**
   * Looping step illustrations. Team names are real MGL teams; players, handles and numbers
   * are made up for the demo.
   */
  demo: {
    register: {
      category: "Tier 1",
      channel: "registration",
      announce: "Registration is open. Post your squad using the format below.",
      author: "Vortex · Manager",
      avatar: urbanTracker,
      /** The registration post, shown compact: team details, then one line per player. */
      fields: [
        { label: "Team Name", value: "Vortex One" },
        { label: "Clan Name", value: "Vortex" },
        { label: "Team Manager", value: "@Kairo", mention: true },
        { label: "Team Captain", value: "@Zeal", mention: true },
        { label: "Team Tag", value: ".vtx" },
      ],
      players: [
        { slot: "P1", ign: "Zeal.vtx", country: "NG" },
        { slot: "P2", ign: "Nova.vtx", country: "NG" },
        { slot: "P3", ign: "Rook.vtx", country: "GH" },
        { slot: "P4", ign: "Kira.vtx", country: "KE" },
      ],
      embed: { title: "Registration received", detail: "Vortex One · 4 players", status: "Awaiting tier placement" },
      locked: "Thread closed and locked by MGL",
      readOnly: "Channel is read-only.",
    },
    placement: {
      tiers: ["Tier 1", "Tier 2", "Tier 3"],
      /** A full tier is 25 squads. Each starts one short; the loop's squad fills it. */
      capacity: 25,
      seated: [24, 24, 24],
      /** Each loop places one squad in its tier (1-based). */
      squads: [
        { name: "Vortex One", tier: 1 },
        { name: "Goat Esport", tier: 2 },
        { name: "Developers", tier: 3 },
      ],
    },
    climb: {
      label: "Tier 1 standings",
      squad: "Vortex One",
      start: 352,
      /** Points gained per match as the squad climbs. */
      gains: [32, 22, 21],
      rivals: [
        { name: "Kyzon Esport", pts: 412 },
        { name: "Goat Esport", pts: 398 },
        { name: "Developers", pts: 371 },
        { name: "Main Characters OG", pts: 330 },
      ],
    },
  },
} as const;

/**
 * Tier 1 standings on Home: the live season while one is running, otherwise the latest final
 * table. Rows come from `src/data/events.ts`, read through `src/lib/league.ts`.
 */
export const standings = {
  live: featuredEvent.status === "live",
  label: `${featuredEvent.tables[0].name} standings`,
  season: featuredEvent.name,
  title: {
    final: { before: `${featuredEvent.name}’s`, accent: "top ten." },
    live: { before: `${featuredEvent.name},`, accent: "live." },
  },
  stage: featuredEvent.matches
    ? featuredEvent.status === "live"
      ? `Match ${featuredEvent.matches.played} of ${featuredEvent.matches.total}`
      : `Final standings · ${featuredEvent.matches.total} matches`
    : featuredEvent.status === "live"
      ? "Live standings"
      : "Final standings",
  columns: { placement: "Placement pts", kills: "Kill pts", total: "Total" },
  /** Tag beside the first-placed team. */
  leader: { final: "Champions", live: "Leading" },
  more: { label: "Full standings", href: "/events#standings" },
};

/**
 * Last season's three top fraggers in Tier 1, from its kill sheet. Portraits are decorative
 * in-game operators until players have photos; flags show once players have countries.
 */
const OPERATORS = ["/images/players/ghost.webp", "/images/players/captain-price.webp", "/images/players/soap.webp"];
const HONOURS = ["Top fragger", "Runner-up", "Third place"];
const fraggers = killTablesOf(latestSeason)[0]?.rows.slice(0, 3) ?? [];

export const honours = {
  label: `${latestSeason.name} honours`,
  title: { before: `${latestSeason.name}’s`, accent: "finest." },
  lede: `The three deadliest players in ${latestSeason.tables[0].name}, by kills across the season.`,
  players: fraggers.map((p, i) => ({
    rank: i + 1,
    name: p.name,
    team: p.team.name,
    country: p.country,
    honour: HONOURS[i],
    image: OPERATORS[i],
    stats: [
      { label: "Kills", value: p.kills },
      { label: "Matches", value: p.matches ?? 0 },
      { label: "Kills / match", value: p.matches ? Math.round((p.kills / p.matches) * 10) / 10 : 0 },
    ],
  })),
};

/**
 * MGL Fantasy teaser. The rules shown follow the Fantasy Core spec (four starters with roles
 * plus a sub, 100-credit budget, captain scores double). SAMPLE squad, prices and points.
 */
export const fantasy = {
  label: "MGL Fantasy",
  status: "Coming soon",
  title: { before: "Pick your four.", accent: "Beat the managers." },
  lede: "Build a squad of four ranked players and a sub inside a 100-credit budget, name your captain for double points, and score from their real kills and placements every matchday.",
  features: [
    { icon: "fantasy", title: "100 credits", body: "Every player carries a price. Spend it well." },
    { icon: "crown", title: "Captain scores 2×", body: "Back one player to carry your matchday." },
    { icon: "chart", title: "Live matchday points", body: "Points land as the kills and placements do." },
  ],
  cta: { label: "Get notified on Discord", href: site.discord },
  board: {
    manager: "kairo",
    squadName: "Kairo’s Squad",
    matchday: "Matchday 3",
    budget: 100,
    startRank: 1204,
    hint: "Tap a player to make them captain",
    players: [
      { ign: "Sable", team: "Kyzon Esport", role: "Fragger", price: 26.5, image: nikto.src },
      { ign: "Havoc", team: "Vortex One", role: "IGL", price: 21.0, image: urbanTracker.src },
      { ign: "Juno", team: "Goat Esport", role: "Anchor", price: 18.0, image: krueger.src },
      { ign: "Nova", team: "Developers", role: "Support", price: 17.5, image: mantaRay.src },
    ],
    sub: { ign: "Rook", team: "Main Characters OG", role: "Support", price: 14.0 },
    /** Points events played on a loop: which player (index) scores how much, and why. */
    events: [
      { player: 0, pts: 6, label: "3 kills" },
      { player: 2, pts: 4, label: "2 kills" },
      { player: 1, pts: 8, label: "Top 5" },
      { player: 0, pts: 12, label: "Booyah" },
      { player: 3, pts: 4, label: "Assist streak" },
      { player: 2, pts: 6, label: "3 kills" },
    ],
  },
};

/** Home FAQ. Answers drafted from what MGL has shared so far; the owner should confirm them. */
export const faq = {
  label: "FAQ",
  title: { before: "Questions,", accent: "answered." },
  lede: "The short version of how MGL runs. Anything else, the Discord is the place to ask.",
  ask: {
    title: "Still unsure?",
    body: "Staff and squads are in the Discord every day.",
    label: "Ask on Discord",
    href: site.discord,
    faces: [ghost, urbanTracker, farah, nikto],
  },
  items: [
    {
      q: "How do we register a squad?",
      a: "When registration opens, the team manager posts the squad in the registration thread on the MGL Discord, using the format pinned there. Staff review every post before the thread is locked.",
    },
    {
      q: "What do we need to register?",
      a: "Team name, clan name, team tag, a manager and a captain, plus all four players with their professional name, in-game name, UID, Discord, country and device.",
    },
    {
      q: "How are squads placed in tiers?",
      a: `MGL runs ${TIERS} tiers and places every registered squad in its designated one, so you compete against teams at your level. A full tier is ${SQUADS_PER_TIER} squads.`,
    },
    {
      q: "How are points scored?",
      a: "Every match earns placement points for where your squad finishes and kill points for every elimination. Your total across the season decides your place in the standings.",
    },
    {
      q: "Where do results and standings go up?",
      a: "Standings are published on the Events page of the MGL site and announced in the Discord after every match day. Every past season’s tables stay there too.",
    },
    {
      q: "What is MGL Fantasy?",
      a: "A fantasy game for fans and managers: pick four ranked players and a sub inside a budget, choose a captain, and score from their real performances. It is coming soon.",
    },
  ],
};

export const footer = {
  title: { before: "Your squad belongs", accent: "at the top." },
  lede: "Registration runs through the MGL Discord. Join the community, follow every season and be ready when the next one opens.",
  /** The closing scene: a circle that opens over the artwork as the page ends. */
  scene: {
    image: {
      wide: { src: "/images/footer/final-circle-wide.webp", width: 1672, height: 941, focus: [0.24, 0.53] as const },
      tall: { src: "/images/footer/final-circle-tall.webp", width: 1086, height: 1448, focus: [0.43, 0.67] as const },
      alt: "Two teammates bump fists on a hilltop above a sunlit island, inside the final circle.",
    },
    circle: "Final circle",
    arrived: "You made it",
    status: { open: "Registration open", closed: "Next season soon" },
  },
  columns: [
    {
      title: "Explore",
      links: [
        { label: "Home", href: "/" },
        { label: "Events", href: "/events" },
        { label: "Teams", href: "/teams" },
        { label: "News", href: "/news" },
        { label: "Staff", href: "/staff" },
        { label: "Stats", href: "#" },
      ],
    },
    {
      title: "Compete",
      links: [
        { label: "How MGL works", href: "/#about" },
        { label: "Standings", href: "/events#standings" },
        { label: "Fantasy", href: "/#fantasy" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
  ],
  legal: "Call of Duty is a trademark of Activision. MGL is an independent organization and is not affiliated with Activision.",
  tagline: "Africa’s top CODM BR org.",
  /** Copyright year; a fixed value keeps the page fully static. */
  year: 2026,
};

/**
 * The Events page: what is happening now, the featured event's tables, and the archive of past
 * events. Events and their tables live in `src/data/events.ts`, read through `src/lib/league.ts`.
 */
export const eventsPage = {
  label: "Events",
  title: { before: "Seasons and", accent: "special events." },
  lede: `MGL runs ranked Battle Royale in ${TIERS} tiers of ${SQUADS_PER_TIER} squads, plus special events.`,
  facts: [
    { value: String(TIERS), label: "Tiers" },
    { value: String(SQUADS_PER_TIER), label: "Squads a tier" },
    { value: String(events.filter((e) => e.status === "final").length), label: "Events on record" },
    { value: String(events.reduce((n, e) => n + e.tables.length, 0)), label: "Final tables" },
  ],
  /** The "Now" card. Which state shows follows the data: a live event, open registration, or the break. */
  now: {
    label: "Now",
    live: { status: "Live", body: "Standings update after every match day.", cta: "Live standings" },
    registration: {
      status: "Registration open",
      title: (n: number) => `Season ${n}`,
      body: `Registration is open on the MGL Discord. Squads are placed into ${TIERS} tiers of ${SQUADS_PER_TIER} before the first match day.`,
      cta: "Register your squad",
    },
    offseason: {
      status: "Between seasons",
      title: (n: number) => `Season ${n}`,
      body: "The next season is being prepared. Join the Discord to hear the moment registration opens.",
      cta: "Join the Discord",
    },
  },
  standings: {
    label: "Standings",
    title: { final: { before: (name: string) => `${name},`, accent: "final." }, live: { before: (name: string) => `${name},`, accent: "live." } },
    tablesLabel: "Choose a table",
    showAll: (n: number) => `Show all ${n} squads`,
    showLess: "Show top ten",
  },
  archive: {
    label: "Archive",
    title: { before: "Past", accent: "events." },
    lede: "Every finished event on record, with its final tables.",
    latest: "Latest",
    champions: (table: string) => `${table} champions`,
    open: "View tables",
  },
  event: {
    back: "All events",
    /** Heading over the tables on an event page, where the event is already named above. */
    tables: { many: { before: "Table by", accent: "table." }, one: { before: "The final", accent: "table." } },
    title: { final: { many: "final tables.", one: "final table." }, live: "live standings." },
    facts: { champions: "Champions", leader: "Leading", squads: "Squads", tables: "Tables", tiers: "Tiers", matches: "Matches" },
    more: "More events",
    newer: "Newer",
    older: "Older",
    /** The event's top fraggers, under its tables. */
    kills: {
      label: "Kill table",
      title: { before: "The top", accent: "fraggers." },
      meta: (n: number, event: string, split?: "tier" | "group") => `Top ${n}${split === "tier" ? " per tier" : split === "group" ? " each" : ""} · ${event}`,
      tablesLabel: "Choose a tier",
      unit: "kills",
      podium: ["Most kills", "Second", "Third"],
      rest: "Places 4 to 20",
    },
  },
};
