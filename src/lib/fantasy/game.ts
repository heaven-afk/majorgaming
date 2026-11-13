/**
 * What the fantasy screens read and do, on top of the Fantasy Core client: the current
 * tournament and matchday, the market with Heaven Index profiles, a manager's squad, points and
 * chips, the standings, and saving a lineup or making a transfer. Fantasy Core decides every
 * price, rule and point; MGL only shows them. Server only.
 */

import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getLeague } from "@/lib/league";
import {
  FantasyCoreError,
  getFantasyChips,
  getFantasyLeaderboard,
  getFantasyManagerPoints,
  getFantasyMarket,
  getFantasyMatchdays,
  getFantasySeasonLeaderboard,
  getFantasySquad,
  getFantasyTournaments,
  saveFantasySquad,
  syncFantasyProfile,
  transferFantasyPlayer,
  type FantasyChip,
  type FantasyMarket,
  type FantasyMatchday,
  type FantasyRole,
  type FantasyTournament,
} from "./client";
import { fantasyIdentity } from "./identity";
import { preview, previewLeaderboard, previewMarket, previewMatchdays, previewStore, previewTournaments, PREVIEW_SCORING_POINTS, type PreviewSquad } from "./preview";
import type { Manager } from "./session";
import { currentTournament, currentMatchday, marketIsOpen } from "./lifecycle.mjs";
import { parseFantasyResponse } from "./responses.mjs";
import { loadIndexMedia } from "./index-media.mjs";
import { fantasy } from "@/content/site";

export const ROLES: FantasyRole[] = ["Fragger", "IGL", "Support", "Anchor"];
export const BUDGET = 100;
export const PER_TEAM = 2;

export type Player = {
  id: string;
  name: string;
  ign: string | null;
  price: number;
  eligible: boolean;
  /** `key` is Fantasy Core's team id, which the two-per-team rule counts by. */
  team: { key: string; name: string; logo?: string };
  /** An exact-ID Heaven Index portrait; absent when none can be verified. */
  photo?: string;
};

export type Lineup = {
  starters: { playerId: string; role: FantasyRole }[];
  sub: string;
  captain: string;
  chip: FantasyChip;
  updatedAt?: string | null;
};

export type Matchday = FantasyMatchday;

export type Game =
  | { state: "off" }
  | { state: "error"; message: string }
  | {
      state: "ready";
      tournament: FantasyTournament;
      /** Every tournament on MGL Fantasy: MGL's own and the ones other rankings host here. */
      tournaments: FantasyTournament[];
      matchdays: Matchday[];
      /** The matchday squads are picked for now: the open one, else the latest. */
      current: Matchday;
      /** True while squads and transfers can be changed. */
      open: boolean;
      market: { status: FantasyMarket["status"] | "UNPUBLISHED"; players: Player[] };
    };

/** Plain words for whatever Fantasy Core said no with. Its own reason shows when it gave one. */
export function coreMessage(err: unknown) {
  if (!(err instanceof FantasyCoreError)) return "Something went wrong. Try again.";
  const reason = typeof err.body?.error === "string" && err.body.error.length < 200 ? err.body.error : undefined;
  if (err.status === 0) return "Fantasy couldn't be reached. Check you're online and try again.";
  if (err.status === 401 || err.status === 403) return "Your session ran out. Sign in again.";
  if (err.status === 429) return `Too many requests. Try again${err.retryAfter ? ` in ${err.retryAfter} seconds` : " in a moment"}.`;
  if (err.status === 503) return "MGL Fantasy is offline for a moment. Try again shortly.";
  if (err.status >= 500) return "Fantasy had a problem on its side. Try again.";
  return reason ?? "That didn't go through. Check your squad and try again.";
}

async function enrich(market: FantasyMarket): Promise<Player[]> {
  const sampleTeams = preview ? (await getLeague()).teamBySlug : undefined;
  const index = preview ? undefined : await loadIndexMedia(market.players, {
    baseUrl: process.env.HSE_BASE_URL,
    apiKey: process.env.HSE_API_SECRET,
  });
  return market.players.map((p) => {
    const key = p.teamIdAtLock ?? `solo:${p.playerId}`;
    const team = p.teamIdAtLock ? (index?.teams.get(key) ?? sampleTeams?.(key)) : undefined;
    const profile = index?.players.get(p.playerId);
    return { id: p.playerId, name: profile?.name || p.playerName, ign: profile?.ign || p.ign, price: p.price, eligible: p.isEligible, team: { key, name: team?.name || p.teamIdAtLock || "No team", logo: team?.logo }, photo: profile?.photo };
  });
}

/** Preview: Tier 1's current rosters as the market. */
async function previewPlayers() {
  const { activeTeams, profileOf } = await getLeague();
  return activeTeams
    .filter((t) => t.tier === 1)
    .flatMap((t) => profileOf(t.slug)!.roster.slice(0, 5).map((l) => ({ id: l.person.slug, name: l.person.name, ign: l.person.ign ?? null, team: t.slug })));
}

/** A tournament's status from Fantasy Core, in three words the screens use. */
export function tournamentState(t: FantasyTournament): "live" | "soon" | "done" {
  if (/conclud|complete|archiv|final|ended/i.test(t.status)) return "done";
  if (/upcoming|draft|scheduled|pending|soon/i.test(t.status)) return "soon";
  return "live";
}

/** The tournament MGL plays now, its matchdays and market. Once per request. */
export const getGame = cache(async (): Promise<Game> => {
  // Whether the market is open depends on the time now, so this is worked out per request.
  await connection();
  if (!preview && !process.env.FANTASY_CORE_URL) return { state: "off" };
  try {
    const { tournaments } = preview ? previewTournaments() : await getFantasyTournaments();
    // One in play first, then the next one coming, then the latest.
    const tournament = currentTournament(tournaments) as FantasyTournament | undefined;
    if (!tournament) return { state: "off" };
    const { matchdays } = preview ? previewMatchdays() : await getFantasyMatchdays(tournament.id);
    const current = currentMatchday(matchdays) as Matchday | undefined;
    if (!current) return { state: "off" };

    let market: FantasyMarket | undefined;
    try {
      market = preview ? previewMarket(await previewPlayers(), current.matchdayNumber) : await getFantasyMarket(tournament.id, current.matchdayNumber);
    } catch (err) {
      // No published prices yet for this matchday.
      if (!(err instanceof FantasyCoreError && err.status === 404)) throw err;
    }
    const open = marketIsOpen(market, current);
    return {
      state: "ready",
      tournament,
      tournaments,
      matchdays,
      current,
      open,
      market: market ? { status: market.status, players: await enrich(market) } : { status: "UNPUBLISHED", players: [] },
    };
  } catch (err) {
    return { state: "error", message: coreMessage(err) };
  }
});

// ---------- A manager's squad ----------

/** A five-minute token Fantasy Core trusts, saying who this manager is. Never sent to the browser. */
function tokenFor(manager: Manager) {
  if (!manager.displayName) throw new Error("Pick a display name first.");
  return fantasyIdentity().signManager({ userId: manager.id, displayName: manager.displayName });
}

type CoreSquad = {
  starters: { playerId: string; role: FantasyRole; isCaptain: boolean }[];
  substitute: { playerId: string } | null;
  captainPlayerId: string;
  activeChip: FantasyChip;
  updatedAt: string | null;
};

const lineupOf = (s: CoreSquad | PreviewSquad): Lineup => ({
  starters: s.starters.map((p) => ({ playerId: p.playerId, role: p.role })),
  sub: s.substitute?.playerId ?? "",
  captain: ("captainPlayerId" in s && s.captainPlayerId) || s.starters.find((p) => p.isCaptain)?.playerId || "",
  chip: s.activeChip,
  updatedAt: s.updatedAt,
});

export type Mine = {
  /** This matchday's squad, if they've picked one. */
  squad: Lineup | null;
  /** Last matchday's squad, which they can carry over for free, when they have none yet. */
  previous: Lineup | null;
  points: { scoring: number; adjustments: number; total: number };
  chips: { triple_captain: boolean; bench_boost: boolean; free_transfer: boolean };
};

export async function getMine(manager: Manager, game: Extract<Game, { state: "ready" }>): Promise<Mine> {
  const md = game.current.matchdayNumber;
  if (preview) {
    const s = previewStore.squads.get(md);
    const prev = previewStore.squads.get(md - 1);
    return {
      squad: s ? lineupOf(s) : null,
      previous: !s && prev ? lineupOf(prev) : null,
      points: { scoring: PREVIEW_SCORING_POINTS, adjustments: previewStore.adjustments, total: PREVIEW_SCORING_POINTS + previewStore.adjustments },
      chips: { triple_captain: !previewStore.chipsUsed.has("triple_captain"), bench_boost: !previewStore.chipsUsed.has("bench_boost"), free_transfer: previewStore.freeTransfer === "AVAILABLE" },
    };
  }

  const token = tokenFor(manager);
  const id = game.tournament.id;
  let squad: Lineup | null = null;
  let previous: Lineup | null = null;
  try {
    const own = (await getFantasySquad(token, id, md)) as { squad: CoreSquad };
    squad = lineupOf(own.squad);
  } catch (err) {
    if (!(err instanceof FantasyCoreError && err.status === 404)) throw err;
    const prev = (err.body as { previousSquad?: unknown } | null)?.previousSquad;
    if (prev) {
      const valid = parseFantasyResponse("squad", prev, { tournamentId: id }) as CoreSquad & { matchdayNumber: number };
      if (valid.matchdayNumber >= md) throw new FantasyCoreError("Fantasy Core returned an invalid carry-forward squad.", 502);
      previous = lineupOf(valid);
    }
  }
  const [points, chips] = await Promise.all([
    getFantasyManagerPoints(token, id) as Promise<{ scoringPoints: number; transferAdjustmentPoints: number; totalFantasyPoints: number }>,
    getFantasyChips(token, id, md) as Promise<{ chips: Record<"triple_captain" | "bench_boost" | "free_transfer", { available: boolean }> }>,
  ]);
  return {
    squad,
    previous,
    points: { scoring: points.scoringPoints, adjustments: points.transferAdjustmentPoints, total: points.totalFantasyPoints },
    chips: { triple_captain: chips.chips.triple_captain.available, bench_boost: chips.chips.bench_boost.available, free_transfer: chips.chips.free_transfer.available },
  };
}

/** Saves a lineup: the first squad, a carried-over one, or new roles, captain or chip. */
export async function saveLineup(manager: Manager, game: Extract<Game, { state: "ready" }>, lineup: Lineup) {
  const md = game.current.matchdayNumber;
  const squad = {
    starters: lineup.starters.map((s) => ({ playerId: s.playerId, role: s.role, isCaptain: s.playerId === lineup.captain })),
    substitute: { playerId: lineup.sub, role: "bench" as const },
    captainPlayerId: lineup.captain,
  };
  if (preview) {
    const price = new Map(game.market.players.map((p) => [p.id, p.price]));
    const before = previewStore.squads.get(md);
    if (before?.activeChip) previewStore.chipsUsed.delete(before.activeChip);
    if (lineup.chip) previewStore.chipsUsed.add(lineup.chip);
    previewStore.squads.set(md, {
      starters: squad.starters.map((s) => ({ ...s, isViceCaptain: false, cost: price.get(s.playerId) ?? 0 })),
      substitute: { playerId: lineup.sub, role: ROLES[0], cost: price.get(lineup.sub) ?? 0 },
      activeChip: lineup.chip,
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  await syncName(manager.id, manager.displayName!);
  await saveFantasySquad(tokenFor(manager), game.tournament.id, md, squad, lineup.chip);
}

export type TransferInput = { playerOutId: string; playerInId: string; useFreeTransferChip: boolean; expectedSquadUpdatedAt?: string };
export type Receipt = { penaltyApplied: number; usedFreeTransferChip: boolean; remainingCredits: number; total: number };

/** One player out, one in. `key` stays the same on a retry, so it can never charge twice. */
export async function makeTransfer(manager: Manager, game: Extract<Game, { state: "ready" }>, input: TransferInput, key: string): Promise<Receipt> {
  const md = game.current.matchdayNumber;
  if (preview) {
    const done = previewStore.receipts.get(key) as Receipt | undefined;
    if (done) return done;
    const s = previewStore.squads.get(md);
    if (!s) throw new Error("Pick a squad first.");
    const price = new Map(game.market.players.map((p) => [p.id, p.price]));
    const slot = s.starters.find((p) => p.playerId === input.playerOutId) ?? (s.substitute.playerId === input.playerOutId ? s.substitute : undefined);
    if (!slot) throw new Error("That player isn't in your squad.");
    slot.playerId = input.playerInId;
    slot.cost = price.get(input.playerInId) ?? 0;
    const free = input.useFreeTransferChip && previewStore.freeTransfer === "AVAILABLE";
    if (free) previewStore.freeTransfer = "USED";
    else previewStore.adjustments -= 4;
    s.updatedAt = new Date().toISOString();
    const spent = [...s.starters, s.substitute].reduce((n, p) => n + p.cost, 0);
    const receipt = { penaltyApplied: free ? 0 : 4, usedFreeTransferChip: free, remainingCredits: BUDGET - spent, total: PREVIEW_SCORING_POINTS + previewStore.adjustments };
    previewStore.receipts.set(key, receipt);
    return receipt;
  }
  await syncName(manager.id, manager.displayName!);
  const r = (await transferFantasyPlayer(tokenFor(manager), key, { tournamentId: game.tournament.id, matchdayNumber: md, ...input })) as {
    penaltyApplied: number; usedFreeTransferChip: boolean; remainingCredits: number; managerPoints: { totalFantasyPoints: number };
  };
  return { penaltyApplied: r.penaltyApplied, usedFreeTransferChip: r.usedFreeTransferChip, remainingCredits: r.remainingCredits, total: r.managerPoints.totalFantasyPoints };
}

/** Tells Fantasy Core a manager's display name. Throws a FantasyCoreError 409 when it's taken there. */
export async function syncName(managerId: string, displayName: string) {
  if (preview) return;
  await syncFantasyProfile(managerId, displayName);
}

// ---------- Standings ----------

export type Standing = { rank: number; managerId: string; name: string | null; total: number; scoring: number; adjustments: number };
export type Standings = { rows: Standing[]; totalCount: number; nextCursor: string | null };

/** The season table, or one matchday's when `matchday` is given. 50 a page. */
export async function getStandings(game: Extract<Game, { state: "ready" }>, opts: { matchday?: number; cursor?: string; me?: Manager } = {}): Promise<Standings> {
  type Ranking = { rank: number; managerId: string; displayName: string | null; totalScore: number; scoringPoints: number; transferAdjustmentPoints: number };
  let data: { leaderboard: Ranking[]; totalCount: number; nextCursor: string | null };
  if (preview) {
    const me = opts.me?.displayName ? { id: opts.me.id, name: opts.me.displayName, total: PREVIEW_SCORING_POINTS + previewStore.adjustments } : undefined;
    data = previewLeaderboard(me, opts.matchday);
  } else {
    data = (await (opts.matchday ? getFantasyLeaderboard(game.tournament.id, opts.matchday, opts.cursor) : getFantasySeasonLeaderboard(game.tournament.id, opts.cursor))) as typeof data;
  }
  return {
    rows: data.leaderboard.map((r) => ({ rank: r.rank, managerId: r.managerId, name: r.displayName, total: r.totalScore, scoring: r.scoringPoints, adjustments: r.transferAdjustmentPoints })),
    totalCount: data.totalCount,
    nextCursor: data.nextCursor,
  };
}

// ---------- Landing ----------

/**
 * Five players for the landing page's cards: the market's priciest when there is one, otherwise
 * the explicitly illustrative squad. Roles are only for show.
 */
export async function getShowcase(game: Game) {
  const roles = [...ROLES, "Sub"] as const;
  if (game.state === "ready" && game.market.players.length) {
    const top = [...game.market.players].filter((p) => p.eligible).sort((a, b) => b.price - a.price);
    // One per team, so the cards show the league's spread, and a five a manager could afford:
    // the dearest players that still leave room for the rest inside the budget.
    const cheapest = Math.min(...top.map((p) => p.price));
    const picks: typeof top = [];
    let spent = 0;
    for (const p of top) {
      if (picks.length === 5) break;
      if (picks.some((q) => q.team.key === p.team.key) || spent + p.price + (4 - picks.length) * cheapest > BUDGET) continue;
      picks.push(p);
      spent += p.price;
    }
    return picks.map((p, i) => ({ name: p.name, ign: p.ign, team: p.team.name, logo: p.team.logo, photo: p.photo, price: p.price, role: roles[i] }));
  }
  return [...fantasy.board.players, { ...fantasy.board.sub, name: fantasy.board.sub.ign }].map((p, i) => ({ ...p, role: roles[i] }));
}
