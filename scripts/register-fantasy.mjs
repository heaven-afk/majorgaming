/** Operator utility: credentials stay in ignored local config and request headers. */
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicKey, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { createFantasySigner } from "../src/lib/fantasy/signing.mjs";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const log = { info() {}, error() {} };
const root = process.cwd();
const mgl = { ...loadEnvConfig(root, false, log).combinedEnv };
const core = loadEnvConfig("C:/Users/USER/Documents/Projects/Heaven_fantasy_codm", false, log, true).parsedEnv;
const apply = process.argv.includes("--apply");

try {
  const origin = mgl.FANTASY_CORE_URL;
  if (origin !== "https://heavenfantasy-br-codm.vercel.app") throw new Error("Review the approved Core destination before using another origin.");
  if (!core?.FANTASY_ADMIN_API_KEY) throw new Error("The existing Core administrator credential is missing.");
  const identity = createFantasySigner({ issuer: mgl.FANTASY_JWT_ISSUER, privateKeyPem: mgl.FANTASY_JWT_PRIVATE_KEY });
  const publicKeyPem = createPublicKey({ key: identity.jwks.keys[0], format: "jwk" }).export({ type: "spki", format: "pem" });
  async function admin(body) {
    const res = await fetch(`${origin}/api/v1/admin/websites`, {
      method: body ? "POST" : "GET",
      headers: { "x-fantasy-admin-key": core.FANTASY_ADMIN_API_KEY, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Core registry request failed (HTTP ${res.status}).`);
    return res.json();
  }
  let directory = await admin();
  if (directory.environment !== "production") throw new Error("Unexpected Core deployment environment.");
  let site = directory.websites.find((entry) => entry.slug === mgl.FANTASY_SITE_SLUG);
  if (!apply) {
    console.log(JSON.stringify({ mode: "review", environment: directory.environment, slug: mgl.FANTASY_SITE_SLUG, existingSite: Boolean(site), issuer: mgl.FANTASY_JWT_ISSUER, actions: ["Register DRAFT website and public signing key", "Register separate API and PROFILE credentials", "Preserve website status and closed production gate"] }));
    process.exit(0);
  }
  if (!site) {
    const created = await admin({ action: "CREATE", data: { slug: mgl.FANTASY_SITE_SLUG, name: "Major Gaming League", websiteUrl: mgl.FANTASY_JWT_ISSUER, issuer: mgl.FANTASY_JWT_ISSUER, publicKeyPem } });
    site = { id: created.siteId, credentials: [] };
  } else if (site.issuer !== mgl.FANTASY_JWT_ISSUER || !site.hasPublicKey) {
    throw new Error("Existing MGL trust differs; review it before replacing any signing keys.");
  }
  let contents = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const [purpose, name] of [["API", "FANTASY_PARTNER_API_KEY"], ["PROFILE", "FANTASY_PROFILE_API_KEY"]]) {
    const credentialName = `MGL website ${purpose}`;
    const existing = site.credentials.find((entry) => entry.name === credentialName && entry.state === "ACTIVE");
    if (existing && !mgl[name]) throw new Error("An existing credential has no matching local secret; rotate it explicitly.");
    if (existing) continue;
    const key = mgl[name] || randomBytes(48).toString("base64url");
    if (!mgl[name]) {
      const line = `${name}=${key}`;
      const re = new RegExp(`^${name}=.*$`, "m");
      contents = re.test(contents) ? contents.replace(re, () => line) : `${contents.trimEnd()}\n${line}\n`;
      // Persist before registering so a network interruption cannot lose the secret.
      writeFileSync(new URL("../.env.local", import.meta.url), contents, { mode: 0o600 });
    }
    await admin({ action: "REGISTER_KEY", siteId: site.id, data: { name: credentialName, purpose, key } });
  }
  // Activation is a separate operation requiring explicit production approval.
  directory = await admin();
  const result = directory.websites.find((entry) => entry.id === site.id);
  console.log(JSON.stringify({ slug: result.slug, status: result.status, apiCredential: result.hasApiCredential, profileCredential: result.hasProfileCredential, signingTrust: result.identityConfigured, productionEnabled: result.productionEnabled, assignedTournaments: result.tournaments.length }));
} catch (error) {
  console.error(`Connection setup stopped: ${error.message}`);
  process.exitCode = 1;
}
