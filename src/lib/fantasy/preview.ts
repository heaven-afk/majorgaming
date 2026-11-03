/**
 * Preview mode: sample Fantasy Core answers so the fantasy screens can be built and checked on a
 * laptop that has no Fantasy Core keys. On only when FANTASY_PREVIEW=1 outside production; never
 * on the live site. Players are real MGL players from the current season; prices, managers and
 * points are SAMPLE. Squads and transfers live in memory until the dev server restarts.
 */

import "server-only";
import type { FantasyMarket, FantasyMatchday, FantasyRole, FantasyTournament } from "./client";

export const preview = process.env.FANTASY_PREVIEW === "1" && process.env.NODE_ENV !== "production";

const TOURNAMENT: FantasyTournament = { id: "preview-season-11", name: "MGL Season 11", status: "ACTIVE", createdAt: "2026-11-01T00:00:00Z" };
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

// SAMPLE: two tournaments hosted for other rankings, to show fantasy isn't only MGL's seasons.
const HOSTED: FantasyTournament[] = [
  { id: "preview-west-africa-open", name: "West Africa Open", status: "UPCOMING", createdAt: "2026-11-02T00:00:00Z" },
  { id: "preview-ranked-cup", name: "Pan-African Ranked Cup", status: "CONCLUDED", createdAt: "2026-09-01T00:00:00Z" },
];
export const previewTournaments = () => ({ count: 3, tournaments: [TOURNAMENT, ...HOSTED] });

export function previewMatchdays(): { tournamentId: string; count: number; matchdays: FantasyMatchday[] } {
  const md = (n: number, market: FantasyMatchday["marketStatus"], status: FantasyMatchday["fantasyStatus"], deadline: string | null): FantasyMatchday => ({
    tournamentId: TOURNAMENT.id, matchdayNumber: n, expectedMatches: 6, matchesPlayed: status === "PROCESSED" ? 6 : 0, fantasyStatus: status, marketStatus: market, submissionDeadline: deadline, processedAt: status === "PROCESSED" ? day(n - 4) : null,
  });
  return { tournamentId: TOURNAMENT.id, count: 3, matchdays: [md(1, "CLOSED", "PROCESSED", day(-6)), md(2, "CLOSED", "PROCESSED", day(-3)), md(3, "OPEN", "DISCOVERED", day(2.2))] };
}

/** The market from real players: `players` is (id, name, ign, team) from the league. */
export function previewMarket(players: { id: string; name: string; ign: string | null; team: string }[], matchdayNumber: number): FantasyMarket {
  const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return {
    tournamentId: TOURNAMENT.id, matchdayNumber, status: "OPEN", pricingVersion: "preview", lockTime: day(2.2), pricesFrozenAt: day(-6),
    players: players.map((p) => ({ playerId: p.id, playerName: p.name, ign: p.ign, teamIdAtLock: p.team, price: 6 + (hash(p.id) % 41) / 2, isEligible: hash(p.id) % 17 !== 0 })),
  };
}

// The preview manager's squad, by matchday.
type Slot = { playerId: string; role: FantasyRole; isCaptain: boolean; isViceCaptain: boolean; cost: number };
export type PreviewSquad = { starters: Slot[]; substitute: { playerId: string; role: FantasyRole; cost: number }; activeChip: null | "triple_captain" | "bench_boost"; updatedAt: string };
export const previewStore: { squads: Map<number, PreviewSquad>; adjustments: number; freeTransfer: "AVAILABLE" | "USED"; chipsUsed: Set<string>; receipts: Map<string, unknown> } =
  ((globalThis as { __mglFantasyPreview?: never }).__mglFantasyPreview ??= { squads: new Map(), adjustments: 0, freeTransfer: "AVAILABLE", chipsUsed: new Set(), receipts: new Map() } as never);

export const PREVIEW_SCORING_POINTS = 142;

const NAMES = ["Kairo", "Baba Fragz", "Lagos Lion", "Accra Ace", "Nairobi Ninja", "Zed Hunter", "Tobi FC", "The Drop", "Hot Zone", "Last Circle", "Ama Snipes", "Kofi Kills", "Chidi IGL", "Moremi", "Zaria Zone", "Dune Rider", "Cape Crew", "Ibadan Eagle", "Sahel Smoke", "Kano Kings", "Ruby Rush", "Delta Drop", "Abuja Aim", "Volta Vibes"];

/** SAMPLE managers, with the preview manager placed among them. */
export function previewLeaderboard(me: { id: string; name: string; total: number } | undefined, matchdayNumber?: number) {
  const rows = NAMES.map((name, i) => ({ managerId: `sample-${i}`, displayName: i === 7 ? null : name, scoringPoints: matchdayNumber ? 74 - i * 2 : 231 - i * 6, transferAdjustmentPoints: i % 5 === 0 ? -4 : 0 }));
  if (me && !matchdayNumber) rows.push({ managerId: me.id, displayName: me.name, scoringPoints: PREVIEW_SCORING_POINTS, transferAdjustmentPoints: me.total - PREVIEW_SCORING_POINTS });
  const ranked = rows
    .map((r) => ({ ...r, totalScore: r.scoringPoints + r.transferAdjustmentPoints }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((r, i) => ({ rank: i + 1, ...r }));
  return { tournamentId: TOURNAMENT.id, matchdayNumber, count: ranked.length, totalCount: ranked.length, leaderboard: ranked, nextCursor: null, updatedAt: new Date().toISOString(), dataVersion: "preview" };
}
