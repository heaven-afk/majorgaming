import { createRequire } from "node:module";
import { createFantasyTransport } from "../src/lib/fantasy/transport.mjs";

// Use the same env loading as Next.js; existing process variables take precedence.
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());

try {
  const request = createFantasyTransport({
    baseUrl: process.env.FANTASY_CORE_URL,
    siteSlug: process.env.FANTASY_SITE_SLUG,
    apiKey: process.env.FANTASY_PARTNER_API_KEY,
  });
  const data = await request("/api/v1/tournaments", { fresh: true });
  if (!Array.isArray(data?.tournaments) || !Number.isInteger(data?.count) ||
      data.tournaments.some((item) => typeof item.id !== "string" || typeof item.name !== "string")) {
    throw new Error("Tournament response does not match the supplied v1 contract.");
  }
  console.log(`PASS: authenticated Fantasy Core connection; ${data.tournaments.length} tournaments returned.`);
  console.log("Next: check the assigned tournament, profile credential and MGL signing trust in Website APIs.");
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
