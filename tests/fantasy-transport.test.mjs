import test from "node:test";
import assert from "node:assert/strict";
import { createFantasyTransport, FantasyCoreError } from "../src/lib/fantasy/transport.mjs";

const config = { baseUrl: "https://fantasy.example.test", siteSlug: "mgl", apiKey: "test-key" };

test("rejects missing credentials and unsafe base URLs before making requests", () => {
  assert.throws(() => createFantasyTransport({}), FantasyCoreError);
  for (const baseUrl of ["http://example.test", "https://a:b@example.test", "https://example.test/api/v1", "https://example.test/?key=value"]) {
    assert.throws(() => createFantasyTransport({ ...config, baseUrl }), FantasyCoreError);
  }
});

test("sends site and key in headers, blocks redirects and follows Core read cache duration", async () => {
  const request = createFantasyTransport({ ...config, fetcher: async (url, options) => {
    assert.equal(url.toString(), "https://fantasy.example.test/api/v1/markets/season_11?matchday=2");
    assert.equal(options.headers["x-fantasy-api-key"], "test-key");
    assert.equal(options.headers["X-Fantasy-Site"], "mgl");
    assert.equal(options.redirect, "error");
    assert.deepEqual(options.next, { revalidate: 15 });
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ status: "OPEN" });
  } });
  assert.deepEqual(await request("/api/v1/markets/season_11", { query: { matchday: 2 } }), { status: "OPEN" });
});

test("profile credentials use PUT and are isolated from the API credential", async () => {
  const request = createFantasyTransport({ ...config, profileKey: "test-profile-key", fetcher: async (_url, options) => {
    assert.equal(options.method, "PUT");
    assert.equal(options.headers["x-fantasy-service-key"], "test-profile-key");
    assert.equal(options.headers["x-fantasy-api-key"], undefined);
    assert.equal(options.cache, "no-store");
    return Response.json({ displayName: "Manager One" });
  } });
  await request("/api/v1/managers/one/profile", { profile: true, body: { displayName: "Manager One" } });
  await assert.rejects(request("/api/v1/tournaments", { profile: true }));
});

test("manager reads bypass caching and transfers preserve their idempotency key", async () => {
  const request = createFantasyTransport({ ...config, fetcher: async (_url, options) => {
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    if (options.method === "POST") assert.equal(options.headers["Idempotency-Key"], "transfer-0001");
    return Response.json({ success: true });
  } });
  await request("/api/v1/squads/me", { token: "test-token" });
  await request("/api/v1/transfers", { token: "test-token", body: {}, idempotencyKey: "transfer-0001" });
  await assert.rejects(request("/api/v1/transfers", { token: "test-token", body: {} }));
  await assert.rejects(request("/api/v1/squads/me"));
});

test("validation sends authoritative input uncached and does not retry writes", async () => {
  let calls = 0;
  const body = { tournamentId: "season_11", matchdayNumber: 2, squad: {} };
  const request = createFantasyTransport({ ...config, fetcher: async (_url, options) => {
    calls++;
    assert.equal(options.method, "POST");
    assert.equal(options.cache, "no-store");
    assert.equal(options.next, undefined);
    assert.deepEqual(JSON.parse(options.body), body);
    return Response.json({ error: "private upstream details test-key" }, { status: 422 });
  } });
  await assert.rejects(request("/api/v1/squads/validate", { body }), (error) => {
    assert.equal(error.status, 422);
    assert.ok(!error.message.includes("test-key"));
    return true;
  });
  assert.equal(calls, 1);
});

test("rate limit status and Retry-After survive without exposing partner response bodies", async () => {
  const request = createFantasyTransport({ ...config, fetcher: async () =>
    new Response("test-key", { status: 429, headers: { "Retry-After": "30" } }) });
  await assert.rejects(request("/api/v1/tournaments"), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.retryAfter, "30");
    assert.ok(!error.message.includes("test-key"));
    return true;
  });
});

test("rejects arbitrary URLs, admin access and traversal before sending credentials", async () => {
  const request = createFantasyTransport({ ...config, fetcher: async () => assert.fail("must not fetch") });
  for (const path of ["https://other.test", "//other.test", "/api/v1/admin/reset", "/api/v1/squads/me", "/api/v1/markets/../admin", "/api/v1/tournaments?key=x"]) {
    await assert.rejects(request(path), FantasyCoreError);
  }
});

test("network failures and invalid JSON produce safe errors", async () => {
  const network = createFantasyTransport({ ...config, fetcher: async () => { throw new Error("test-key"); } });
  await assert.rejects(network("/api/v1/tournaments"), /could not be reached or timed out/);
  const invalid = createFantasyTransport({ ...config, fetcher: async () => new Response("<html>upstream error</html>") });
  await assert.rejects(invalid("/api/v1/tournaments"), /invalid JSON/);
});
