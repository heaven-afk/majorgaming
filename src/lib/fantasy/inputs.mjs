const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const id = value => typeof value === "string" && /^[\w-]{1,100}$/.test(value);
const roles = ["Fragger", "IGL", "Support", "Anchor"];

/** Structural checks only: Fantasy Core decides prices, eligibility and game rules. */
export function validLineupInput(value) {
  if (!record(value) || !Array.isArray(value.starters) || value.starters.length !== 4 ||
      !id(value.sub) || !id(value.captain) || ![null, "triple_captain", "bench_boost"].includes(value.chip)) return false;
  if (!value.starters.every(p => record(p) && id(p.playerId) && roles.includes(p.role))) return false;
  const ids = [...value.starters.map(p => p.playerId), value.sub];
  return new Set(ids).size === 5 && new Set(value.starters.map(p => p.role)).size === 4 &&
    value.starters.some(p => p.playerId === value.captain);
}

export function validTransferInput(value, key) {
  return record(value) && id(value.playerOutId) && id(value.playerInId) && value.playerOutId !== value.playerInId &&
    typeof value.useFreeTransferChip === "boolean" && typeof key === "string" && /^[a-zA-Z0-9._:-]{8,128}$/.test(key) &&
    (value.expectedSquadUpdatedAt === undefined || (typeof value.expectedSquadUpdatedAt === "string" &&
      /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value.expectedSquadUpdatedAt) && Number.isFinite(Date.parse(value.expectedSquadUpdatedAt))));
}
