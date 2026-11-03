/**
 * The settings the admin can change (Settings page), and what the site uses until they're set.
 * Stored as one row in `site_settings` and read with `getSettings()` in `src/lib/settings.ts`.
 * Everything else stays in the content files.
 */

export const NETWORKS = ["x", "instagram", "youtube", "tiktok"] as const;
export type Network = (typeof NETWORKS)[number];

export const networkLabels: Record<Network, string> = { x: "X", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" };

/** A number Home shows, e.g. 480 with "+" after it. */
export type Figure = { value: number; suffix: string };

export type Settings = {
  /** Where every "Join the Discord" button goes, and where registration goes when an event has no link of its own. */
  discord: string;
  /** Empty hides that network's icon. */
  socials: Record<Network, string>;
  /** The two short lines beside the faces at the top of Home. */
  community: [string, string];
  /** The About section's number tiles (the first, ranked seasons, comes from the data). */
  stats: { squads: Figure; matches: Figure; players: Figure };
};

export const defaultSettings: Settings = {
  discord: "https://discord.gg/your-invite",
  socials: { x: "", instagram: "", youtube: "", tiktok: "" },
  community: ["2,000+ ranked players", "across the AF region."],
  stats: {
    squads: { value: 480, suffix: "+" },
    matches: { value: 1200, suffix: "+" },
    players: { value: 2000, suffix: "+" },
  },
};

/** Words on the admin's Settings page. */
export const settingsCopy = {
  title: "Settings",
  lede: "Links and numbers used across the site. Changes go live within seconds.",
  links: {
    title: "Links",
    lede: "The Discord invite is used by every Join the Discord button. Leave a social empty to hide its icon.",
    discord: "Discord invite link",
    discordHint: "e.g. https://discord.gg/mgl",
  },
  community: {
    title: "Top of Home",
    lede: "The two short lines beside the faces at the top of the home page. Keep each one short so it stays on one line.",
    first: "First line",
    second: "Second line",
  },
  stats: {
    title: "About numbers",
    lede: "The number tiles in the About section. Ranked seasons is counted from your events; set the other three here.",
    squads: "Squads ranked",
    matches: "Matches played",
    players: "Players in the community",
    suffix: "After the number",
    suffixHint: "e.g. + or K",
  },
  idle: "Changes show on the site as soon as you save.",
} as const;
