import { FantasyCoreError } from "./transport.mjs";

// Decode the fields MGL consumes, rejecting malformed data and dropping extra fields.
const invalid = () => { throw new FantasyCoreError("Fantasy Core returned an invalid response.", 502); };
const string = (v) => typeof v === "string" && v.length <= 4096 ? v : invalid();
const id = (v) => typeof v === "string" && /^[\w-]{1,200}$/.test(v) ? v : invalid();
const number = (v) => typeof v === "number" && Number.isFinite(v) ? v : invalid();
const integer = (v) => Number.isSafeInteger(v) && v >= 0 ? v : invalid();
const positive = (v) => Number.isSafeInteger(v) && v > 0 ? v : invalid();
const nonnegative = (v) => number(v) >= 0 ? v : invalid();
const boolean = (v) => typeof v === "boolean" ? v : invalid();
const literal = (...values) => (v) => values.includes(v) ? v : invalid();
const nullable = (read) => (v) => v === null ? null : read(v);
const optional = (read) => (v) => v === undefined ? undefined : read(v);
const timestamp = (v) => typeof v === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v)) ? v : invalid();
const array = (read) => (v) => Array.isArray(v) && v.length <= 10000 ? v.map(read) : invalid();
const object = (fields) => (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return invalid();
  const out = {};
  for (const [key, read] of Object.entries(fields)) {
    const value = read(v[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
};
const marketStatus = literal("DRAFT", "OPEN", "LOCKED", "CLOSED");
const role = literal("Fragger", "IGL", "Support", "Anchor");
const chip = literal(null, "triple_captain", "bench_boost");
const matchday = object({
  tournamentId: id, matchdayNumber: positive, expectedMatches: integer, matchesPlayed: integer,
  fantasyStatus: literal("DISCOVERED", "READY", "COMPLETED", "PROCESSING", "PROCESSED", "FAILED"),
  marketStatus: nullable(marketStatus), submissionDeadline: nullable(timestamp), processedAt: nullable(timestamp),
});
const squad = object({
  id, tournamentId: id, matchdayNumber: positive, captainPlayerId: id, activeChip: chip,
  starters: array(object({ playerId: id, role, isCaptain: boolean })),
  substitute: nullable(object({ playerId: id })), updatedAt: nullable(timestamp),
});
const points = object({ tournamentId: id, scoringPoints: number, transferAdjustmentPoints: number, totalFantasyPoints: number });
const schemas = {
  tournaments: object({ count: integer, tournaments: array(object({ id, name: string, status: string, createdAt: nullable(timestamp) })) }),
  matchdays: object({ tournamentId: id, count: integer, matchdays: array(matchday) }),
  market: object({
    tournamentId: id, matchdayNumber: positive, status: marketStatus, pricingVersion: string,
    lockTime: nullable(timestamp), pricesFrozenAt: nullable(timestamp),
    players: array(object({ playerId: id, playerName: string, ign: nullable(string), teamIdAtLock: nullable(id), price: nonnegative, isEligible: boolean })),
  }),
  squad,
  ownSquad: object({ squad }),
  savedSquad: object({ success: literal(true), squad }),
  chips: object({ tournamentId: id, matchdayNumber: positive, chips: object({
    triple_captain: object({ available: boolean }), bench_boost: object({ available: boolean }), free_transfer: object({ available: boolean }),
  }) }),
  points,
  standings: object({
    tournamentId: id, matchdayNumber: optional(positive), totalCount: integer, nextCursor: nullable(string),
    leaderboard: array(object({ rank: positive, managerId: id, displayName: nullable(string), totalScore: number, scoringPoints: number, transferAdjustmentPoints: number })),
  }),
  transfer: object({ penaltyApplied: literal(0, 4), usedFreeTransferChip: boolean, remainingCredits: nonnegative, managerPoints: points }),
  profile: object({ managerId: id, displayName: string, updatedAt: nullable(timestamp) }),
  window: object({ success: literal(true), tournamentId: id, matchdayNumber: positive, status: marketStatus }),
  validation: object({ valid: boolean, validationMode: literal("authoritative"), tournamentId: id, matchdayNumber: positive, marketStatus, totalCost: number, remainingBudget: number, errors: array(string) }),
};

/** Context checks prevent accepting an otherwise valid response for another tournament/day. */
export function parseFantasyResponse(kind, value, expected = {}) {
  if (!schemas[kind]) return invalid();
  const result = schemas[kind](value);
  const scoped = result.squad ?? result.managerPoints ?? result;
  if (expected.tournamentId !== undefined && scoped.tournamentId !== expected.tournamentId) return invalid();
  if (expected.matchdayNumber !== undefined && scoped.matchdayNumber !== expected.matchdayNumber) return invalid();
  if (expected.managerId !== undefined && result.managerId !== expected.managerId) return invalid();
  if (expected.displayName !== undefined && result.displayName !== expected.displayName) return invalid();
  const s = kind === "squad" ? result : result.squad;
  if (s && (s.starters.length !== 4 || new Set(s.starters.map(p => p.playerId)).size !== 4 ||
      new Set(s.starters.map(p => p.role)).size !== 4 || !s.starters.some(p => p.playerId === s.captainPlayerId) ||
      !s.substitute || s.starters.some(p => p.playerId === s.substitute.playerId))) return invalid();
  return result;
}
