import "server-only";
import { createFantasyTransport } from "./transport.mjs";

export { FantasyCoreError } from "./transport.mjs";

export type MarketStatus = "DRAFT" | "OPEN" | "LOCKED" | "CLOSED";
export type FantasyRole = "Fragger" | "Support" | "Anchor" | "IGL";
export type FantasyTournament = { id: string; name: string; status: string; createdAt: string | null };
export type FantasyMatchday = {
  tournamentId: string;
  matchdayNumber: number;
  expectedMatches: number;
  matchesPlayed: number;
  fantasyStatus: "DISCOVERED" | "READY" | "COMPLETED" | "PROCESSING" | "PROCESSED" | "FAILED";
  marketStatus: MarketStatus | null;
  submissionDeadline: string | null;
  processedAt: string | null;
};
export type FantasyMarket = {
  tournamentId: string;
  matchdayNumber: number;
  status: MarketStatus;
  pricingVersion: string;
  lockTime: string | null;
  pricesFrozenAt: string | null;
  players: {
    playerId: string;
    playerName: string;
    ign: string | null;
    teamIdAtLock: string | null;
    price: number;
    isEligible: boolean;
  }[];
};
export type SquadSelection = {
  starters: { playerId: string; role: FantasyRole; isCaptain?: boolean }[];
  substitute: { playerId: string; role?: FantasyRole | "bench" };
  captainPlayerId?: string;
};
export type FantasyChip = null | "triple_captain" | "bench_boost";

function id(value: string) {
  // Restrict path segments rather than allowing URL dot-segment normalization.
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error("Invalid Fantasy Core ID.");
  return value;
}

function matchday(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Matchday must be a positive integer.");
  return value;
}

function request() {
  // Lazy config: builds and unrelated pages work before Fantasy Core is connected.
  return createFantasyTransport({
    baseUrl: process.env.FANTASY_CORE_URL,
    siteSlug: process.env.FANTASY_SITE_SLUG,
    apiKey: process.env.FANTASY_PARTNER_API_KEY,
    profileKey: process.env.FANTASY_PROFILE_API_KEY,
  });
}

// Types reflect Heaven_fantasy_codm's current website contract; verify against OpenAPI
// before building screens. These assertions are not runtime schema validation.
export async function getFantasyTournaments(): Promise<{ count: number; tournaments: FantasyTournament[] }> {
  return request()("/api/v1/tournaments");
}

export async function getFantasyMatchdays(tournamentId: string): Promise<{ tournamentId: string; count: number; matchdays: FantasyMatchday[] }> {
  return request()(`/api/v1/tournaments/${id(tournamentId)}/matchdays`);
}

export async function getFantasyMarket(tournamentId: string, day: number): Promise<FantasyMarket> {
  return request()(`/api/v1/markets/${id(tournamentId)}`, { query: { matchday: matchday(day) } });
}

// Never use cached market state to authorize a save. Core validates current prices
// and lock state on each validation; actual manager saves need verified MGL sessions.
export async function validateFantasySquad(tournamentId: string, day: number, squad: SquadSelection): Promise<unknown> {
  return request()("/api/v1/squads/validate", {
    body: { tournamentId: id(tournamentId), matchdayNumber: matchday(day), squad },
  });
}

// Detailed DTOs remain unknown until runtime response schemas are wired into screens.
export async function getFantasyScores(tournamentId: string, day: number): Promise<unknown> {
  return request()("/api/v1/scoring/matchday", { query: { tournamentId: id(tournamentId), matchday: matchday(day) } });
}

export async function getFantasyLeaderboard(tournamentId: string, day: number, cursor?: string): Promise<unknown> {
  return request()(`/api/v1/leaderboards/${id(tournamentId)}`, { query: { matchday: matchday(day), limit: 50, cursor } });
}

export async function getFantasySeasonLeaderboard(tournamentId: string, cursor?: string): Promise<unknown> {
  return request()(`/api/v1/seasons/${id(tournamentId)}/leaderboard`, { query: { limit: 50, cursor } });
}

// Internal server helpers only. Tokens must be minted from a verified MGL session;
// there is deliberately no public handler accepting a manager ID or JWT from a form.
export async function syncFantasyProfile(managerId: string, displayName: string): Promise<unknown> {
  if (!/^[A-Za-z0-9 _-]{3,20}$/.test(displayName) || displayName !== displayName.trim()) {
    throw new Error("Display name must be 3–20 letters, numbers, spaces, underscores or hyphens.");
  }
  return request()(`/api/v1/managers/${id(managerId)}/profile`, { profile: true, body: { displayName } });
}

export async function getFantasySquad(token: string, tournamentId: string, day: number): Promise<unknown> {
  return request()("/api/v1/squads/me", { token, query: { tournamentId: id(tournamentId), matchday: matchday(day) } });
}

export async function getFantasyChips(token: string, tournamentId: string, day: number): Promise<unknown> {
  return request()("/api/v1/squads/chips", { token, query: { tournamentId: id(tournamentId), matchday: matchday(day) } });
}

export async function saveFantasySquad(token: string, tournamentId: string, day: number, squad: SquadSelection, activeChip: FantasyChip = null): Promise<unknown> {
  return request()("/api/v1/squads", { token, body: { tournamentId: id(tournamentId), matchdayNumber: matchday(day), squad, activeChip } });
}

export async function getFantasyManagerPoints(token: string, tournamentId: string): Promise<unknown> {
  return request()("/api/v1/managers/me/points", { token, query: { tournamentId: id(tournamentId) } });
}

export async function transferFantasyPlayer(token: string, idempotencyKey: string, input: {
  tournamentId: string; matchdayNumber: number; playerOutId: string; playerInId: string;
  useFreeTransferChip: boolean; expectedSquadUpdatedAt?: string;
}): Promise<unknown> {
  id(input.tournamentId);
  matchday(input.matchdayNumber);
  // Preserve this exact key and body if a request has an unknown outcome.
  return request()("/api/v1/transfers", { token, idempotencyKey, body: input });
}
