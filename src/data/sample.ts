/**
 * PLACEHOLDER generator. Fills the tables and rosters we don't have real data for yet, from a
 * fixed seed so pages stay the same between builds. Delete this file once every table and
 * roster in `events.ts` and `teams.ts` is real (or once they come from the database).
 */

import type { StandingRecord } from "./types";

export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashOf(text: string) {
  return [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
}

export function shuffle<T>(list: T[], rand: () => number) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function slugOf(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const STEMS = [
  "Atlas", "Ember", "Lumen", "Nomad", "Zenith", "Halo", "Savanna", "Obsidian", "Tempest", "Echo",
  "Kairo", "Solace", "Harmattan", "Baobab", "Kilima", "Monsoon", "Ivory", "Delta", "Meridian", "Noble",
  "Aurora", "Granite", "Copper", "Falcon", "Mamba", "Cobalt", "Orbit", "Pulse", "Summit", "Horizon",
  "Titan", "Lodestar", "Nimbus", "Saber", "Bastion", "Kraken", "Pyre", "Sierra", "Basalt", "Cedar",
  "Tundra", "Mirage", "Quartz", "Raven", "Sentinel", "Vertex",
];
const SUFFIXES = ["Esports", "Gaming", "Squad", "Club", "Collective"];
/** Placeholder squad names, one per stem so no two read alike. */
export const PLACEHOLDER_TEAMS = STEMS.map((s, i) => `${s} ${SUFFIXES[i % SUFFIXES.length]}`);

/** Points for squads already in finishing order, counting down from `top`. */
export function sampleRows(teams: string[], top: number, seed: number): StandingRecord[] {
  const rand = random(seed);
  let total = top;
  return teams.map((name) => {
    total -= 6 + Math.round(rand() * 14);
    const placement = Math.round(total * (0.46 + rand() * 0.06));
    return { team: slugOf(name), placement, kills: total - placement };
  });
}
