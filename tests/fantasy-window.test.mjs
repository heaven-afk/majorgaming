import test from "node:test";
import assert from "node:assert/strict";
import { currentTournament, currentMatchday, marketIsOpen, windowActionAllowed } from "../src/lib/fantasy/lifecycle.mjs";
import { executeWindowControl } from "../src/lib/fantasy/window-control.mjs";
import { createFantasyTransport } from "../src/lib/fantasy/transport.mjs";
import { createFantasySigner } from "../src/lib/fantasy/signing.mjs";
import { generateKeyPairSync } from "node:crypto";

const now = Date.parse("2026-11-05T12:00:00Z");
const day = (overrides = {}) => ({ tournamentId: "cup", matchdayNumber: 1, expectedMatches: 6, matchesPlayed: 0, marketStatus: "DRAFT", fantasyStatus: "READY", submissionDeadline: "2026-11-06T12:00:00Z", processedAt: null, ...overrides });
const input = () => ({ tournamentId: "cup", matchdayNumber: 1, action: "open", expectedStatus: "DRAFT", expectedDeadline: day().submissionDeadline, confirm: true });
function fixture() {
  const calls = [];
  const state = { configured: true, preview: false, tournaments: [{ id: "cup", status: "ACTIVE" }], matchdays: [day()], market: { tournamentId: "cup", matchdayNumber: 1, status: "DRAFT", players: Array.from({ length: 5 }, () => ({ isEligible: true })) } };
  const deps = {
    requireAdmin: async () => { calls.push("auth"); return { id: "operator", role: "owner" }; },
    readCurrent: async () => { calls.push("read"); return state; },
    signAdmin: id => { calls.push(`sign:${id}`); return "scoped-token"; },
    sendWindow: async (token, tournamentId, matchdayNumber, action) => { calls.push(`send:${token}`); return { success: true, tournamentId, matchdayNumber, status: { open: "OPEN", lock: "LOCKED", close: "CLOSED" }[action] }; },
    now: () => now,
  };
  return { calls, state, deps };
}

test("one current tournament and the first draft matchday are chosen without a manager switcher", () => {
  assert.equal(currentTournament([{ id: "old", status: "CONCLUDED" }, { id: "cup", status: "ACTIVE" }, { id: "next", status: "UPCOMING" }]).id, "cup");
  assert.equal(currentMatchday([day({ matchdayNumber: 3 }), day({ matchdayNumber: 1 }), day({ matchdayNumber: 2 })]).matchdayNumber, 1);
  assert.equal(currentMatchday([day(), day({ matchdayNumber: 2, marketStatus: "OPEN" })]).matchdayNumber, 2);
});

test("missing, expired and processed deadlines close manager selection; played drafts cannot go live", () => {
  assert.equal(marketIsOpen({ status: "OPEN" }, day({ marketStatus: "OPEN" }), now), true);
  for (const override of [{ submissionDeadline: null }, { submissionDeadline: "invalid" }, { submissionDeadline: "2026-11-05T12:00:00Z" }, { fantasyStatus: "PROCESSED" }]) assert.equal(marketIsOpen({ status: "OPEN" }, day({ marketStatus: "OPEN", ...override }), now), false);
  assert.equal(windowActionAllowed(day({ matchesPlayed: 1 }), "open", now), false);
  assert.equal(windowActionAllowed(day({ marketStatus: "CLOSED" }), "open", now), false);
});

test("go live authenticates first, reads fresh state and uses the server's admin identity", async () => {
  const { calls, deps } = fixture();
  assert.equal((await executeWindowControl({ ...input(), userId: "attacker", permissions: ["all"] }, deps)).status, "OPEN");
  assert.deepEqual(calls, ["auth", "read", "sign:operator", "send:scoped-token"]);
});

test("anonymous and manager callers cannot read admin state or mint a privileged token", async () => {
  for (const identity of [undefined, { id: "manager", role: "manager" }]) {
    const f = fixture(); f.deps.requireAdmin = async () => identity;
    await assert.rejects(executeWindowControl(input(), f.deps), /Administrator/);
    assert.deepEqual(f.calls, []);
  }
});

test("unconfirmed, cross-tournament, changed-deadline and stale-state requests never send a write", async () => {
  for (const changes of [{ confirm: false }, { tournamentId: "other" }, { matchdayNumber: 2 }, { expectedDeadline: null }, { expectedStatus: "OPEN" }, { action: "process" }]) {
    const f = fixture(); await assert.rejects(executeWindowControl({ ...input(), ...changes }, f.deps));
    assert.ok(!f.calls.some(c => c.startsWith("sign:") || c.startsWith("send:")));
  }
});

test("preview, missing configuration, expired windows and insufficient players cannot go live", async () => {
  for (const change of [s => { s.preview = true; }, s => { s.configured = false; }, s => { s.matchdays[0].submissionDeadline = "2026-11-01T00:00:00Z"; }, s => { s.market.players.pop(); }, s => { s.tournaments[0].status = "CONCLUDED"; }]) {
    const f = fixture(); change(f.state); await assert.rejects(executeWindowControl(input(), f.deps));
    assert.ok(!f.calls.some(c => c.startsWith("send:")));
  }
});

test("Core refusals are preserved and wrong confirmations are never reported as success", async () => {
  const f = fixture(); f.deps.sendWindow = async () => { throw new Error("Core rejected transition"); };
  await assert.rejects(executeWindowControl(input(), f.deps), /Core rejected/);
  f.deps.sendWindow = async () => ({ success: true, tournamentId: "other", matchdayNumber: 1, status: "OPEN" });
  await assert.rejects(executeWindowControl(input(), f.deps), /did not confirm/);
});

test("only the dedicated short-lived admin signer adds window permissions", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signer = createFantasySigner({ issuer: "https://mgl.example.test", privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) });
  const claims = token => JSON.parse(Buffer.from(token.split(".")[1], "base64url"));
  assert.equal(claims(signer.signManager({ userId: "manager", displayName: "Manager One", permissions: ["fantasy:windows:manage"] })).permissions, undefined);
  const admin = claims(signer.signWindowAdmin({ userId: "operator", permissions: ["all"] }));
  assert.deepEqual(admin.permissions, ["fantasy:windows:manage"]);
  assert.equal(admin.exp - admin.iat, 300);
});

test("window transport requires a token, strict input, no caching and no platform admin key", async () => {
  let calls = 0;
  const request = createFantasyTransport({ baseUrl: "https://core.example.test", siteSlug: "mgl", apiKey: "website-key", fetcher: async (_, opts) => {
    calls++; assert.equal(opts.method, "POST"); assert.equal(opts.cache, "no-store"); assert.equal(opts.headers["X-Fantasy-Admin-Key"], undefined); assert.equal(opts.headers.Authorization, "Bearer admin-token"); return Response.json({ success: true });
  } });
  await request("/api/v1/markets/cup/window", { token: "admin-token", body: { action: "open", matchdayNumber: 1 } });
  await assert.rejects(request("/api/v1/markets/cup/window", { body: { action: "open", matchdayNumber: 1 } }));
  await assert.rejects(request("/api/v1/markets/cup/window", { token: "admin-token", body: { action: "open", matchdayNumber: 1, permissions: ["all"] } }));
  assert.equal(calls, 1);
});
