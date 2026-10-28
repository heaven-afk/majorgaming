/**
 * Home copy built from the league data: the Tier 1 standings, last season's honours and the
 * About stats. Server components only; everything else is in `site.ts`.
 */

import { events, featuredEvent, killTablesOf, latestSeason } from "@/lib/league";
import { additionalCommunityAvatars } from "./visual-assets";

const [mantaRay, , nikto, krueger] = additionalCommunityAvatars;

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
