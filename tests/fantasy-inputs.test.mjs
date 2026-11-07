import test from "node:test";
import assert from "node:assert/strict";
import { validLineupInput, validTransferInput } from "../src/lib/fantasy/inputs.mjs";

const lineup = () => ({ starters: ["Fragger", "IGL", "Support", "Anchor"].map((role, i) => ({ playerId: `p${i}`, role })), sub: "p4", captain: "p0", chip: null });

test("browser squad submissions reject malformed structures without throwing", () => {
  for (const value of [null, undefined, [], {}, { starters: null }, { ...lineup(), starters: [null, {}, {}, {}] }]) assert.equal(validLineupInput(value), false);
  assert.equal(validLineupInput(lineup()), true);
  for (const override of [{ sub: "p0" }, { captain: "p4" }, { chip: "free_transfer" }, { chip: {} }]) assert.equal(validLineupInput({ ...lineup(), ...override }), false);
  const value = lineup(); value.starters[1].role = "Fragger"; assert.equal(validLineupInput(value), false);
});

test("transfer submissions enforce distinct players, boolean chip choice and valid retry/version fields", () => {
  const value = { playerOutId: "p1", playerInId: "p2", useFreeTransferChip: false };
  assert.equal(validTransferInput(value, "retry-key-1"), true);
  assert.equal(validTransferInput({ ...value, expectedSquadUpdatedAt: "2026-11-05T12:00:00Z" }, "retry-key-1"), true);
  for (const input of [null, {}, { ...value, playerInId: "p1" }, { ...value, useFreeTransferChip: "false" }, { ...value, expectedSquadUpdatedAt: {} }, { ...value, expectedSquadUpdatedAt: "yesterday" }]) assert.equal(validTransferInput(input, "retry-key-1"), false);
  assert.equal(validTransferInput(value, ""), false);
});
