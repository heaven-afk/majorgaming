# Instructions for the Fantasy Core Agent

**Read this whole file before you change anything.**
**Audience:** the coding agent working in the partner's Heaven Index and Fantasy Core repositories, working with the partner.
**Written by:** the MGL website team.

---

## 0. Your goal

Make Fantasy Core ready for the MGL website to integrate with, quickly and reliably, with nothing left for MGL to guess. At the end you deliver a complete integration package (section 7). The MGL team should be able to start building screens against it without waiting on a single unanswered question.

Work in this order: fix what blocks integration first, then fill the spec gaps, then deliver the package.

---

## 1. Context you need

Three systems work together:

| System | Owner | Job |
|---|---|---|
| **Heaven Index** | Partner | Records all event data: kills, team placements, players. Source of truth. |
| **Fantasy Core** | Partner (you) | Reads selected data from Heaven Index. Calculates fantasy points, player prices, manager budgets, matchday status. Holds all fantasy admin (completion, pricing, scoring). |
| **MGL website** | MGL | Manager accounts, logins, display names, every screen managers and fans see. Calls Fantasy Core from its own server. Calculates nothing. |

**Rules that are settled:**
- MGL owns manager accounts and passwords. Fantasy Core never stores or checks passwords.
- Managers are shown to fans by their **MGL display name**, never by a raw ID.
- MGL does not need admin access to Fantasy Core. Completion, pricing and scoring stay with the partner.
- The Fantasy Core API spec is in `docs/integrations/fantasy-core-api.md`. Treat it as the starting point. Where it is wrong, incomplete or contradicts itself, fix it and record the fix.

---

## 2. Task A: Trust managers who log in on MGL

Today the squad endpoints expect a `Bearer` token that the API doesn't define. Implement this:

- MGL signs a token for each logged-in manager. You verify it. You never issue manager tokens yourself.
- **Algorithm:** asymmetric only (RS256 or EdDSA). Reject `none` and any HMAC algorithm.
- **Key source:** MGL publishes a JWKS endpoint. Fetch and cache it. Refresh the cache when it sees an unknown `kid`. Also accept a PEM public key from an environment variable as a fallback.
- **Required claims:** `iss` = configured MGL issuer, `aud` = `fantasy-core`, `sub` = MGL user ID, `displayName`, `iat`, `exp`.
- **Clock skew:** allow 60 seconds.
- **Apply to:** `POST /api/v1/squads` and `GET /api/v1/squads/me`.
- **Tests required:** valid token, expired token, bad signature, wrong audience, wrong issuer, missing `sub`, `alg: none`.

If you think a different method is better, do not replace this one silently. Write your proposal in `DECISIONS.md` and wait for MGL to agree.

---

## 3. Task B: Manager display names

- Add a **service-to-service** endpoint: `PUT /api/v1/managers/:managerId/profile`.
  - Authenticated with an MGL service credential (not a manager token, not the partner read key).
  - Body: `{ "displayName": "..." }`.
  - Validation: 3–20 characters, letters, numbers, spaces, `_` and `-` only. Unique, case-insensitive. Return `409` if taken.
  - Idempotent: the same call twice gives the same result.
- The leaderboard response must include `displayName` for each entry.
- If a manager has no display name yet, return `displayName: null`. Do not invent one.
- Don't return emails, phone numbers, or any other personal data.

---

## 4. Task C: Fill and fix the spec gaps

Each item below needs a real answer in the code, the OpenAPI spec and `DECISIONS.md`. If it's a rule only the partner can decide, propose a default, mark it **PROPOSED**, and say so in the package.

1. **Transfers:** free transfers per window, and the penalty for extra transfers. Expose the remaining free transfers in `GET /api/v1/squads/me`.
2. **Chips:** the full `activeChip` enum (for example `none`, `benchBoost`, `tripleCaptain`), when each can be used, and how many times. Return a `400` for unknown values.
3. **Role rules:** state clearly whether each squad needs exactly one of each role, or whether roles can repeat. Enforce the rule and return a clear `422` message.
4. **Season standings:** add `GET /api/v1/seasons/:tournamentId/leaderboard`, which gives the overall ranking across all matchdays.
5. **Scoring inputs:** the stats used for points must be confirmed and documented: player kills, team placement, kill share, kill contribution. Expose these in the matchday scoring response. Keep the weights and formulas private, as the spec says.
6. **Price timing:** document exactly when prices change. Once per matchday, or after each event? Give the lock time rule.
7. **Completion states:** document how a matchday moves through `DISCOVERED`, `READY`, `PROCESSING`, `COMPLETED` and `PROCESSED`. Confirm completion can be triggered manually, and say who can do it.
8. **Player history:** document and implement `GET /api/v1/players/history` (without a player ID).
9. **Response examples:** the example for `GET /api/v1/squads/me` is cut off with `...`. Give the full response.
10. **Real base URL:** replace the `api.fantasycore.example.com` placeholder everywhere with the real staging and production URLs.

---

## 5. Task D: Rate limits and speed

- Find out why the gateway limit is 120 requests per minute, and whether it's still needed. Put your findings in `DECISIONS.md`.
- Propose and configure a **dedicated limit for the MGL key**, sized for:
  - Normal browsing traffic, cached on MGL's side.
  - Live matchdays, when the leaderboard is refreshed often.
- Ask first before removing any limit that protects the system. Limits can be reasoned about, but must not be dropped quietly.
- Every read endpoint must support:
  - `ETag` and `If-None-Match`, returning `304 Not Modified` when nothing changed.
  - `updatedAt` in the response, so MGL can tell when data changed.
  - `Cache-Control` headers that say how long a response can be cached.
- The leaderboard must support pagination (`limit` and `cursor`) for large events.
- Set a performance target and measure it on staging:
  - Read endpoints: p95 under 300 ms.
  - Squad submission: p95 under 800 ms.
- Expose `X-RateLimit-*` headers on every response, as the spec says.

---

## 6. Task E: Environments, keys and testing

- **Staging environment:** create it now, with its own base URL, database and keys.
- **Production environment:** create it, but don't open it to MGL until we say go.
- **Keys:** generate separate keys for staging and production, one for each MGL service. Don't put key values in the repo, in chat, or in logs.
- **Config template:** provide `.env.example` with variable names only, no values. Example names: `FANTASY_API_KEY`, `FANTASY_BASE_URL`, `MGL_JWKS_URL`, `MGL_ISSUER`, `MGL_SERVICE_KEY`.
- **Health check:** `GET /api/v1/health` returns service status and the data version (no auth needed).
- **Seed data:** load a sandbox tournament with matchdays, players, prices and 3 to 5 test managers on staging. MGL needs this to test without live events.
- **Smoke test script:** write a runnable script that calls every endpoint in order, using the staging key, and prints pass or fail for each. Include a manager token test once Task A is done.

---

## 7. What you deliver

Put everything in one place and give MGL the list below.

- [ ] **Updated OpenAPI 3 spec** (`openapi.yaml`) covering every endpoint, schema, error code and rate-limit header. MGL will generate types from this.
- [ ] **Manager token verification** (Task A), with the tests listed.
- [ ] **Display-name sync endpoint and leaderboard change** (Task B), with tests.
- [ ] **Answers to every item in Task C**, in `DECISIONS.md`. Mark anything you proposed as **PROPOSED**.
- [ ] **Rate-limit findings and the new MGL limit** (Task D), with the reasoning.
- [ ] **Staging environment:** base URL, JWKS URL, seeded sandbox data.
- [ ] **Production environment:** base URL, ready but closed.
- [ ] **`.env.example`** with variable names only.
- [ ] **Smoke test script**, and its output on staging.
- [ ] **Changelog** of anything that breaks the existing spec.
- [ ] **Key delivery:** send the staging keys to MGL through a secure channel. Never paste keys in chat or commit them.

---

## 8. Done means

- The smoke test passes on staging for every endpoint.
- A squad submitted with an MGL-signed token is accepted. A squad with a bad token is rejected.
- The leaderboard returns display names.
- Read endpoints meet the performance targets, and return `ETag` and `Cache-Control`.
- `DECISIONS.md` has no unanswered Task C items. Anything still open is clearly marked **PROPOSED** and waiting on MGL.

---

## 9. Security rules (non-negotiable)

- Never commit secrets, tokens or keys to any repository.
- Never log full tokens, keys or personal data.
- Keys go through your secret manager, not files in the repo.
- If you find a security weakness while working, report it to MGL first, then fix it.
