import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// The site's own TypeScript: "@/..." and extensionless imports point at src/*.ts.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) return next(pathToFileURL(resolve("src", specifier.slice(2) + ".ts")).href, context);
    if (specifier.startsWith(".") && !/\.\w+$/.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});
const { checkTeams, parseMatches, teamsIn, uncheckedTeams } = await import("../src/lib/index-results/match.ts");
const { parseIndexSnapshot } = await import("../src/lib/index-results/contract.ts");
const { liveTables } = await import("../src/lib/index-results/standings.ts");

const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const mgl = (id, name, { here = true, also = [] } = {}) => ({ id, name, here, keys: [key(name), ...also.map(key)] });
const row = (id, name, rank = 1) => ({ id, name, rank, matches: 1, events: 1, kills: 0, placementPoints: 0, totalPoints: 0 });
const payload = (extra = {}) => ({
  version: 1, organizer: "Major Gaming League", completed: false, tables: [],
  event: { id: "t1", name: "MOCK TEST", status: "setup", startDate: null }, ...extra,
});
const one = (name, teams, saved) => checkTeams([{ id: "h", name }], teams, saved)[0];

test("matches the same name however it is spaced or capitalised", () => {
  assert.deepEqual(one(" VORTEX  one ", [mgl("m", "Vortex One")]), { id: "h", name: " VORTEX  one ", teamId: "m", how: "name" });
});
test("uses tags and old names, and marks close spellings as a guess", () => {
  assert.equal(one("VX1", [mgl("m", "Vortex One", { also: ["VX1"] })]).how, "name");
  const close = one("Goat Esports", [mgl("m", "Goat Esport")]);
  assert.deepEqual([close.teamId, close.how], ["m", "close"]);
});
test("leaves a team unmatched when nothing is close", () => {
  assert.equal(one("Nightfall", [mgl("m", "Vortex One")]).teamId, null);
});
test("a full name anywhere in the league beats a close spelling in the tier", () => {
  assert.equal(one("Goat Esports", [mgl("near", "Goat Esport"), mgl("real", "Goat Esports", { here: false })]).teamId, "real");
});
test("a full name beats another team's tag", () => {
  assert.equal(one("Legion", [mgl("a", "Apex Legion", { also: ["Legion"] }), mgl("b", "Legion")]).teamId, "b");
});
test("a name shared by two MGL teams goes to the one in the tier, else to nobody", () => {
  assert.equal(one("Vanguard", [mgl("a", "Vanguard", { here: false }), mgl("b", "Vanguard")]).teamId, "b");
  assert.equal(one("Vanguard", [mgl("a", "Vanguard"), mgl("b", "Vanguard")]).teamId, null);
});
test("never suggests one MGL team twice", () => {
  const rows = checkTeams([{ id: "x", name: "Goat Esport" }, { id: "y", name: "Goat Esports" }], [mgl("m", "Goat Esport")]);
  assert.deepEqual(rows.map((r) => r.teamId), ["m", null]);
  const same = checkTeams([{ id: "x", name: "Goat" }, { id: "y", name: "GOAT" }], [mgl("m", "Goat")]);
  assert.deepEqual(same.map((r) => r.teamId), [null, null]);
});
test("a confirmed match comes first, unless that MGL team is gone", () => {
  const teams = [mgl("m", "Goat Esport"), mgl("n", "Kingpins")];
  assert.deepEqual([one("Goat Esport", teams, { h: "n" }).teamId, one("Goat Esport", teams, { h: "n" }).how], ["n", "saved"]);
  assert.equal(one("Goat Esport", teams, { h: "gone" }).teamId, "m");
  assert.equal(one("Goat Esport", teams, { h: null }).teamId, "m");
});

test("reads registered teams before anyone has played, and without repeats", () => {
  const s = parseIndexSnapshot(payload({
    registeredTeams: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }],
    tables: [{ id: null, name: "Overall", teams: [row("b", "Beta"), row("c", "Gamma", 2)], players: [] }],
  }), "t1");
  assert.deepEqual(teamsIn(s).map((t) => t.id), ["a", "b", "c"]);
});
test("today's feed still reads, and an unreadable team list never drops live results", () => {
  assert.equal("registeredTeams" in parseIndexSnapshot(payload(), "t1"), false);
  for (const registeredTeams of [null, {}, [{ id: "a" }], [{ id: "a", name: "A" }, { id: "a", name: "B" }], [{ id: "a b", name: "A" }]]) {
    assert.deepEqual(teamsIn(parseIndexSnapshot(payload({ registeredTeams }), "t1")), []);
  }
});

const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
test("only usable matches are accepted from the browser", () => {
  const ids = new Set([A, B]);
  assert.deepEqual(parseMatches(JSON.stringify({ h1: A, h2: null }), ids), { h1: A, h2: null });
  assert.deepEqual(parseMatches("{}", ids), {});
  for (const bad of [undefined, "", "[]", "null", "{", JSON.stringify({ "a b": A }), JSON.stringify({ h: "x" }), JSON.stringify({ h: 1 }),
    JSON.stringify({ h: "33333333-3333-4333-8333-333333333333" }), JSON.stringify({ h1: A, h2: A })]) {
    assert.equal(parseMatches(bad, ids), undefined, String(bad));
  }
});
test("teams nobody has checked, or whose MGL team is gone, are counted", () => {
  const s = parseIndexSnapshot(payload({ registeredTeams: ["a", "b", "c", "d"].map((id) => ({ id, name: id })) }), "t1");
  assert.deepEqual(uncheckedTeams(s, { a: A, b: null, c: B }, new Set([A])).map((t) => t.id), ["c", "d"]);
});
const entered = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }, { id: "c", name: "Gamma" }];
const table = (id, teams, players = []) => ({ id, name: "Group " + id, teams, players });
const show = (extra) => liveTables(parseIndexSnapshot(payload({ registeredTeams: entered, ...extra }), "t1"))
  .map((t) => [t.teams.map((x) => x.id), t.waiting.map((x) => x.id)]);
test("shows the entered teams before any results, even if empty tables are sent", () => {
  assert.deepEqual(show({}), [[[], ["a", "b", "c"]]]);
  assert.deepEqual(show({ tables: [table("g1", []), table("g2", [])] }), [[[], ["a", "b", "c"]]]);
  assert.deepEqual(show({ registeredTeams: undefined }), [[[], []]]);
});
test("player kills from Heaven Index are never shown: kill tables come from spreadsheets", () => {
  const kills = [{ id: "p1", rank: 1, name: "Ace", team: "Alpha", matches: 1, events: 1, kills: 9 }];
  assert.deepEqual(show({ tables: [table(null, [], kills)] }), [[[], ["a", "b", "c"]]]);
  const shown = liveTables(parseIndexSnapshot(payload({ tables: [table(null, [row("a", "Alpha")], kills)] }), "t1"));
  assert.deepEqual(shown.map((t) => t.players), [[]]);
});
test("teams still to play follow the ranked ones in an overall table, once each", () => {
  assert.deepEqual(show({ tables: [table(null, [row("b", "Beta")])] }), [[["b"], ["a", "c"]]]);
});
test("never guesses a group, and a finished event only shows results", () => {
  assert.deepEqual(show({ tables: [table("g1", [row("a", "Alpha")]), table("g2", [])] }), [[["a"], []]]);
  assert.deepEqual(show({ tables: [table("g1", [row("a", "Alpha")])] }), [[["a"], []]]);
  assert.deepEqual(show({ completed: true, tables: [table(null, [row("a", "Alpha")])] }), [[["a"], []]]);
  assert.deepEqual(show({ completed: true }), [[[], []]]);
});
