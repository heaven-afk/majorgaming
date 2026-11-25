import test from "node:test";
import assert from "node:assert/strict";
import { MGL_ORIGIN, siteOrigin } from "../src/lib/site-url.mjs";

test("production callbacks ignore old Vercel configuration and the requesting host", () => {
  for (const requestOrigin of [undefined, "https://mglwebsite.vercel.app", "https://branch-preview.vercel.app", "https://untrusted.example", "http://localhost:3101"]) {
    assert.equal(siteOrigin({ nodeEnv: "production", requestOrigin, configuredOrigin: "https://mglwebsite.vercel.app" }), MGL_ORIGIN);
  }
});
test("development callbacks preserve local browser sessions", () => {
  for (const requestOrigin of ["http://localhost:3101", "http://127.0.0.1:3000", "http://[::1]:3000", "http://192.168.1.120:3101"]) {
    assert.equal(siteOrigin({ nodeEnv: "development", requestOrigin }), requestOrigin);
  }
});
test("malformed and unrelated origins cannot become email destinations", () => {
  for (const requestOrigin of ["https://untrusted.example", "http://localhost.evil.example", "http://10.evil.example", "http://192.168.evil.example", "javascript:alert(1)", "http://user:pass@localhost:3101", "http://localhost:3101/unexpected", "http://localhost:3101?redirect=elsewhere", "null"]) {
    assert.equal(siteOrigin({ nodeEnv: "development", requestOrigin, configuredOrigin: MGL_ORIGIN }), MGL_ORIGIN);
  }
});
test("only local configured fallback origins are used outside production", () => {
  assert.equal(siteOrigin({ nodeEnv: "development", configuredOrigin: "http://localhost:3000" }), "http://localhost:3000");
  assert.equal(siteOrigin({ nodeEnv: "development", configuredOrigin: "https://mglwebsite.vercel.app" }), MGL_ORIGIN);
});
