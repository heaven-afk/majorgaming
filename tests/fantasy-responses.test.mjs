import test from "node:test";
import assert from "node:assert/strict";
import { parseFantasyResponse } from "../src/lib/fantasy/responses.mjs";

const market = () => ({ tournamentId: "cup", matchdayNumber: 1, status: "OPEN", pricingVersion: "V1.0", lockTime: null, pricesFrozenAt: "2026-11-01T00:00:00Z", players: [{ playerId: "p1", playerName: "Player One", ign: null, teamIdAtLock: "team", price: 10, isEligible: true }] });
const squad = () => ({ id: "s1", tournamentId: "cup", matchdayNumber: 1, captainPlayerId: "p1", activeChip: null, updatedAt: null, starters: ["Fragger", "IGL", "Support", "Anchor"].map((role, i) => ({ playerId: `p${i + 1}`, role, isCaptain: i === 0 })), substitute: { playerId: "p5" } });

test("market responses are checked, scoped and reduced to the public fields MGL needs", () => {
  const raw = market(); raw.privateCredential = "must-not-escape"; raw.players[0].internalNotes = "private";
  const data = parseFantasyResponse("market", raw, { tournamentId: "cup", matchdayNumber: 1 });
  assert.equal(data.privateCredential, undefined);
  assert.equal(data.players[0].internalNotes, undefined);
  assert.equal(data.players[0].price, 10);
  assert.throws(() => parseFantasyResponse("market", raw, { tournamentId: "other" }));
  assert.throws(() => parseFantasyResponse("market", raw, { matchdayNumber: 2 }));
});

test("malformed prices, flags, dates, arrays and market states fail safely", () => {
  for (const mutate of [m => { m.players[0].price = "10"; }, m => { m.players[0].price = -1; }, m => { m.players[0].price = Infinity; }, m => { m.players[0].isEligible = "true"; }, m => { m.players = null; }, m => { m.lockTime = "tomorrow"; }, m => { m.status = "LIVE"; }]) {
    const data = market(); mutate(data);
    assert.throws(() => parseFantasyResponse("market", data), error => error.status === 502 && !error.message.includes("private"));
  }
});

test("current and carry-forward squads require a complete, distinct lineup and real captain", () => {
  assert.equal(parseFantasyResponse("ownSquad", { squad: squad() }, { tournamentId: "cup", matchdayNumber: 1 }).squad.captainPlayerId, "p1");
  for (const mutate of [s => { s.starters.pop(); }, s => { s.starters[1].playerId = "p1"; }, s => { s.starters[1].role = "Fragger"; }, s => { s.captainPlayerId = "p5"; }, s => { s.substitute = null; }, s => { s.substitute.playerId = "p1"; }, s => { s.activeChip = "unlimited"; }]) {
    const value = squad(); mutate(value); assert.throws(() => parseFantasyResponse("squad", value));
  }
});

test("chips and points cannot silently invent missing values or accept numeric strings", () => {
  assert.throws(() => parseFantasyResponse("chips", { tournamentId: "cup", matchdayNumber: 1, chips: { triple_captain: { available: true } } }));
  assert.throws(() => parseFantasyResponse("points", { tournamentId: "cup", scoringPoints: "142", transferAdjustmentPoints: 0, totalFantasyPoints: 142 }));
  assert.deepEqual(parseFantasyResponse("points", { tournamentId: "cup", scoringPoints: 142, transferAdjustmentPoints: -4, totalFantasyPoints: 138 }), { tournamentId: "cup", scoringPoints: 142, transferAdjustmentPoints: -4, totalFantasyPoints: 138 });
});

test("standings retain unnamed managers and validate pagination and score breakdowns", () => {
  const page = { tournamentId: "cup", totalCount: 1, nextCursor: null, leaderboard: [{ rank: 1, managerId: "manager-one", displayName: null, totalScore: 138, scoringPoints: 142, transferAdjustmentPoints: -4 }] };
  assert.equal(parseFantasyResponse("standings", page, { tournamentId: "cup" }).leaderboard[0].displayName, null);
  assert.throws(() => parseFantasyResponse("standings", { ...page, nextCursor: {} }));
  assert.throws(() => parseFantasyResponse("standings", page, { matchdayNumber: 2 }));
});

test("transfer receipts, profile echoes and window confirmations are bound to their request", () => {
  const receipt = { penaltyApplied: 4, usedFreeTransferChip: false, remainingCredits: 9, managerPoints: { tournamentId: "cup", scoringPoints: 142, transferAdjustmentPoints: -4, totalFantasyPoints: 138 } };
  assert.equal(parseFantasyResponse("transfer", receipt, { tournamentId: "cup" }).penaltyApplied, 4);
  assert.throws(() => parseFantasyResponse("transfer", receipt, { tournamentId: "other" }));
  assert.throws(() => parseFantasyResponse("transfer", { ...receipt, penaltyApplied: 0.5 }));
  assert.throws(() => parseFantasyResponse("profile", { managerId: "someone-else", displayName: "Manager One", updatedAt: null }, { managerId: "one" }));
  assert.throws(() => parseFantasyResponse("profile", { managerId: "one", displayName: "Old Name", updatedAt: null }, { managerId: "one", displayName: "New Name" }));
  assert.throws(() => parseFantasyResponse("window", { success: false, tournamentId: "cup", matchdayNumber: 1, status: "OPEN" }));
});
