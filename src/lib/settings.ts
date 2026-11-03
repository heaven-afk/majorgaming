/**
 * The site's settings for this request: what the admin saved on the Settings page, with the
 * defaults from `src/content/settings.ts` filling anything not saved. Server only.
 */

import { cache } from "react";
import { defaultSettings, NETWORKS, type Figure, type Settings } from "@/content/settings";
import { readSettings } from "./db";

const text = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
const figure = (v: unknown, fallback: Figure): Figure => {
  const f = (v ?? {}) as Partial<Figure>;
  return { value: Number.isFinite(f.value) ? Number(f.value) : fallback.value, suffix: text(f.suffix, fallback.suffix) };
};

/** Turns a saved row into full settings; also used by the admin to fill its form. */
export function settingsFrom(saved: Record<string, unknown>): Settings {
  const d = defaultSettings;
  const socials = (saved.socials ?? {}) as Record<string, unknown>;
  const community = Array.isArray(saved.community) ? saved.community : [];
  const stats = (saved.stats ?? {}) as Record<string, unknown>;
  return {
    discord: text(saved.discord, d.discord) || d.discord,
    socials: Object.fromEntries(NETWORKS.map((n) => [n, text(socials[n], d.socials[n])])) as Settings["socials"],
    community: [text(community[0], d.community[0]), text(community[1], d.community[1])],
    stats: { squads: figure(stats.squads, d.stats.squads), matches: figure(stats.matches, d.stats.matches), players: figure(stats.players, d.stats.players) },
  };
}

export const getSettings = cache(async () => settingsFrom(await readSettings()));
