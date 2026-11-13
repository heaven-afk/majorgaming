import test from "node:test";
import assert from "node:assert/strict";
import { loadIndexMedia } from "../src/lib/fantasy/index-media.mjs";

const config = { baseUrl: "https://index.example", apiKey: "test-key" };
const image = "https://cdn.example/portrait.webp";
const player = { playerId: "p1", playerName: "Old Name", ign: "Old IGN", teamIdAtLock: "locked-team" };
const row = (type, id, fields = {}) => ({ entityType: type, entityId: id, ...fields });
const body = (media, missingIds = []) => Response.json({ version: 1, media, missingIds });

test("uses stable IDs, current labels, known aliases and the locked team's logo", async () => {
  const result = await loadIndexMedia([player], { ...config, fetcher: async (url, init) => {
    assert.equal(url.origin, config.baseUrl);
    assert.equal(url.pathname, "/api/v1/media");
    assert.equal(init.headers["x-api-key"], config.apiKey);
    assert.equal(init.redirect, "error");
    if (url.searchParams.get("entityType") === "players") {
      assert.equal(url.searchParams.get("ids"), "p1");
      return body([row("players", "p1", { professionalName: "New Name", professionalNameAliases: ["Old Name"], ign: "New IGN", avatarUrl: image, teamId: "new-team" })]);
    }
    assert.equal(url.searchParams.get("ids"), "locked-team");
    return body([row("teams", "locked-team", { teamName: "Locked Team", logoUrl: image })]);
  } });
  assert.deepEqual(result.players.get("p1"), { name: "New Name", ign: "New IGN", photo: image });
  assert.deepEqual([...result.teams], [["locked-team", { name: "Locked Team", logo: image }]]);
});

test("same names never attach another ID, and conflicting labels reject a portrait", async () => {
  for (const suspect of [
    row("players", "different-id", { professionalName: player.playerName, avatarUrl: image }),
    row("players", "p1", { professionalName: "Other Name", ign: "Other IGN", avatarUrl: image }),
    row("teams", "p1", { professionalName: player.playerName, avatarUrl: image }),
  ]) {
    const result = await loadIndexMedia([player], { ...config, fetcher: async url => url.searchParams.get("entityType") === "players" ? body([suspect]) : body([], ["locked-team"]) });
    assert.equal(result.players.size, 0);
  }
});

test("missing, malformed or failed media keeps fallback cards available", async () => {
  for (const reply of [
    () => body([], ["p1"]),
    () => body([row("players", "p1"), row("players", "p1", { avatarUrl: image })]),
    () => body([row("players", "p1", { avatarUrl: "javascript:alert(1)" })]),
    () => { throw new Error("offline"); },
  ]) {
    const result = await loadIndexMedia([player], { ...config, fetcher: async url => url.searchParams.get("entityType") === "players" ? reply() : body([], ["locked-team"]) });
    assert.equal(result.players.get("p1")?.photo, undefined);
  }
});

test("deduplicates IDs and batches large markets within Heaven Index's limit", async () => {
  const players = Array.from({ length: 102 }, (_, i) => ({ ...player, playerId: `p${i}`, teamIdAtLock: null }));
  const sizes = [];
  await loadIndexMedia([...players, players[0]], { ...config, fetcher: async url => {
    const ids = url.searchParams.get("ids").split(",");
    sizes.push(ids.length);
    return body([], ids);
  } });
  assert.deepEqual(sizes.sort((a, b) => a - b), [2, 100]);
});

test("accepts existing embedded raster photos but rejects active or oversized data URLs", async () => {
  const embedded = "data:image/png;base64,iVBORw0KGgo=";
  for (const [avatarUrl, expected] of [
    [embedded, embedded],
    ["data:image/svg+xml;base64,PHN2Zz4=", undefined],
    ["data:image/png;base64," + "A".repeat(2_000_000), undefined],
  ]) {
    const result = await loadIndexMedia([{ ...player, teamIdAtLock: null }], { ...config, fetcher: async () => body([row("players", "p1", { avatarUrl })]) });
    assert.equal(result.players.get("p1").photo, expected);
  }
});
