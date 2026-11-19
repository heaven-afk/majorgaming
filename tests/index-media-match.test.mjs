import test from "node:test";
import assert from "node:assert/strict";
import { planMedia } from "../scripts/lib/index-media-match.mjs";
const base = () => ({ teams: [], people: [], aliases: [], indexTeams: [], indexPlayers: [] });
const person = (id, name, ign = "") => ({ id, name, ign, photo_url: null });
const player = (id, name, photo = "photo", extra = {}) => ({ id, professional_name: name, photo_url: photo, ...extra });

test("copies a unique team name, accounting for case/spacing and recorded aliases only", () => {
  const s = base(); s.teams = [{ id: "m", name: "Goat Esport", logo_url: null }];
  s.indexTeams = [{ id: "h", team_name: " GOAT ESPORT ", logo_url: "logo" }];
  assert.equal(planMedia(s).plans.length, 1);
  s.indexTeams[0].team_name = "Goat Esports";
  assert.equal(planMedia(s).plans.length, 0);
  s.indexTeams[0].identityNames = ["Goat Esport"];
  assert.equal(planMedia(s).plans.length, 1);
});
test("preserves MGL images and archived records", () => {
  const s = base(); s.people = [{ ...person("a", "Ali"), photo_url: "admin-photo" }, { ...person("b", "Maus"), archived_at: "date" }];
  s.indexPlayers = [player("x", "Ali"), player("y", "Maus")];
  assert.equal(planMedia(s).plans.length, 0);
});
test("a source without a photo still makes a duplicate name ambiguous", () => {
  const s = base(); s.people = [person("a", "Demon")];
  s.indexPlayers = [player("x", "Demon"), player("y", "Demon", "")];
  assert.equal(planMedia(s).plans.length, 0);
});
test("an exact IGN disambiguates a duplicate professional name", () => {
  const s = base(); s.people = [person("a", "Demon", "FW Demon")];
  s.indexPlayers = [player("x", "Demon", "photo", { ign_history: ["FW Demon"] }), player("y", "Demon", "other")];
  assert.equal(planMedia(s).plans[0].sourceId, "x");
});
test("one source cannot fill multiple MGL identities", () => {
  const s = base(); s.people = [person("a", "Maus"), person("b", "MAUS")];
  s.indexPlayers = [player("x", "Maus")];
  assert.equal(planMedia(s).plans.length, 0);
});
test("professional aliases match; an IGN alone never establishes identity", () => {
  const s = base(); s.people = [person("a", "FatherAli", "ign"), person("b", "Another", "ign")];
  s.indexPlayers = [player("x", "Father Ali", "photo", { professionalNameAliases: ["FatherAli"], ign: "ign" })];
  assert.deepEqual(planMedia(s).plans.map(x => x.id), ["a"]);
});
test("an explicitly reviewed source ID resolves duplicate teams without weakening automatic matching", () => {
  const s = base(); s.teams = [{ id: "m", name: "Narcissist", logo_url: null }];
  s.indexTeams = [{ id: "current", team_name: "NARCISSISTS", identityNames: ["Narcissist"], logo_url: "logo" }, { id: "legacy", team_name: "Narcissist", logo_url: "" }];
  assert.equal(planMedia(s).plans.length, 0);
  assert.equal(planMedia(s, { confirmedTeams: [{ id: "m", sourceId: "current" }] }).plans[0].sourceId, "current");
  s.indexTeams[0].identityNames = []; s.indexTeams[0].team_name = "Unrelated team";
  assert.throws(() => planMedia(s, { confirmedTeams: [{ id: "m", sourceId: "current" }] }));
});
test("confirmed mappings reject duplicate destinations and unknown records", () => {
  assert.throws(() => planMedia(base(), { confirmedTeams: [{ id: "missing", sourceId: "missing" }] }));
  assert.throws(() => planMedia(base(), { confirmedTeams: [{ id: "a", sourceId: "x" }, { id: "b", sourceId: "x" }] }));
});
