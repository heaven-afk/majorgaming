> Login update: Supabase Auth now verifies administrator passwords and sessions. No custom password-hash/session-secret configuration is needed. See [ADMIN_LOGIN.md](ADMIN_LOGIN.md).

> Administrator access now uses owner-approved email/password login. See [Administrator login setup](ADMIN_LOGIN.md). The former browser API-key entry screen has been replaced.

# Website API management and admin dashboard

Fantasy Core is a shared fantasy engine consumed by independent esports websites. Each website owns its Manager accounts, registration, passwords, sessions, and user interface. Core keeps external participation references and fantasy records. Heaven Stat Engine supplies competitive data.

## Isolation contract

Every integration has a permanent slug, deployment environment, website URL, access status, identity trust configuration, separate API and PROFILE credentials, request limits, and exclusive tournament assignments. Production always requires website identity; legacy environment keys cannot authorize website data without it. For local development, set `FANTASY_REQUIRE_SITE=true` to enforce the same behavior. Platform administrator and HSE/cron routes retain their own authorization checks.

Websites share the versioned `/api/v1` route implementation. Their credentials and tournament grants define separate API connections; copying an API key to another website slug fails. Creating a website does not duplicate or change the frozen scoring/pricing engines.

A tournament belongs to exactly one website. Unassigned tournaments are invisible to website callers. Lists, histories, market reads, scores, squads, points, chips, transfers, and standings enforce the website boundary. Reusing the same external Manager `sub` on two websites creates independent participation references. Display-name uniqueness is scoped to a website. There are no Manager passwords or login endpoints in the admin dashboard.

API credentials are server-side secrets. The partner website's backend sends:

```http
X-Fantasy-Site: mgl
X-Fantasy-Api-Key: <website API credential>
```

Manager operations also require `Authorization: Bearer <website-issued JWT>`. JWT verification uses that website's issuer and JWKS/public PEM; algorithms RS256 or EdDSA; audience `fantasy-core`; required `iss`, `aud`, `sub`, `displayName`, `iat`, `exp`; clock tolerance 60 seconds. Browser code on the partner website must call its own backend rather than receive Core service keys.

Display-name sync uses a different PROFILE credential:

```http
PUT /api/v1/managers/{externalManagerId}/profile
X-Fantasy-Site: mgl
X-Fantasy-Service-Key: <website PROFILE credential>
Content-Type: application/json

{"displayName":"Example Manager"}
```

PROFILE credentials cannot access fantasy operations; API credentials cannot sync profiles. Responses return external Manager IDs. Internal namespaced references never grant access to another participant's records.

## Dashboard

The root page is now the platform administrator workspace, with Overview, Website APIs, Tournaments, Markets, Processing, Activity log, and Integration guide navigation. It replaces the former mixed operator/Manager portal. Manager screens belong on the consuming websites.

Sign in with an explicitly configured administrator account. An HttpOnly session cookie authenticates dashboard requests; the platform API key is never sent from dashboard JavaScript. It reads protected admin APIs and displays real records or explicit loading/error/empty states. No demo website registry is seeded by the production app.

Website management supports registration, identity settings, per-minute quotas, DRAFT/ACTIVE/SUSPENDED status, credential registration/revocation, exclusive tournament assignment, and recent request metadata. ACTIVE requires identity verification and an unexpired API credential. An ACTIVE label describes configured access, not partner uptime. Last traffic is observed accepted-credential traffic; absent requests show "No traffic yet". Revoked/expired keys are individually labeled; production additionally requires `production_enabled=true` in the approved deployment configuration. The dashboard does not open that gate.

Market actions generate drafts, publish/open, lock, and close windows. Processing actions mark READY matchdays complete and process COMPLETED/FAILED matchdays. Consequential operation dialogs identify the selected tournament/matchday before submission. The server remains authoritative for lifecycle transitions.

Overview operation lists are capped at 500 rows, audits at 50 and per-website traffic at 25. This first dashboard does not include operator SSO/RBAC, historical analytics, or bulk reassignment. Existing platform admin authorization applies to all operators. Assignment removal/reassignment is deliberately not offered: moving an active tournament requires a reviewed data migration.

## Admin API

All operations below require `X-Fantasy-Admin-Key` and are uncached. Website keys cannot access them.

- `GET /api/v1/admin/overview`: registry, tournament ownership, market/matchday summaries, redacted configuration audit.
- `GET /api/v1/admin/websites`: website directory; add `?siteId={id}` for one integration and recent traffic.
- `POST /api/v1/admin/websites`: `{ "action": "...", "siteId": "...", "data": {...} }`. `siteId` is omitted for CREATE.

| Action | data |
| --- | --- |
| CREATE | `slug`, `name`, `websiteUrl`; optional `issuer`, `jwksUrl`, `publicKeyPem`, `readLimit`, `writeLimit`. Starts DRAFT. |
| UPDATE | Any mutable CREATE setting except slug; optional `status` (DRAFT/ACTIVE/SUSPENDED). Empty issuer/JWKS/public PEM clears it, subject to ACTIVE readiness. |
| REGISTER_KEY | `name`, `purpose` (API/PROFILE), `key` (32–512 characters from approved secret manager), optional future `expiresAt`. Raw key is write-only. |
| REVOKE_KEY | `credentialId`. Idempotently marks the key revoked. |
| ASSIGN_TOURNAMENT | `tournamentId`. Rejects another website's ownership; repeat assignment to the same website is harmless. |

Core stores SHA256 hashes, never raw API credentials. Directory, audit, and usage responses exclude both raw credentials and hashes. Rotation: register a replacement, update the partner's server secret, verify traffic, then revoke the old credential. Website-level quotas are shared across rotated keys. Suspension blocks new website requests. Request logging stores method, route template, response status, and timestamps, excluding bodies, tokens, keys, and external Manager IDs. Traffic records are retained for 30 days.

## Migration and rollout

1. Apply earlier chip/MGL and Transfer Rules migrations in their existing order, then `src/db/migrations/20261028_website_integrations.sql` with the database owner's migration connection. For an empty database, `src/db/schema.sql` contains the full schema. Do not replay earlier migrations that recreate global display-name indexes after website-scoped names are in use.
2. Configure the approved staging deployment, service-role connection, admin key, and HSE credentials. Keep production closed. Registry tables/functions are service-only and RLS-protected.
3. Register each website in the matching deployment environment; provide that website's actual issuer/JWKS or public PEM. Register secrets from the approved secret manager and assign its tournaments. Nothing in local fixtures establishes a real MGL connection.
4. Existing legacy Manager references are not automatically assigned or renamed. Before connecting an existing tournament, migrate any prior legacy participation references with an explicit, audited mapping to the owning website. The new leaderboard excludes unowned legacy references. Never infer website ownership from a display name.
5. Activate staging connections, set `FANTASY_SITE_SLUG` in the smoke/performance environment, and run the updated staging scripts. `MGL_READ_KEY` and `MGL_SERVICE_KEY` are script input aliases for the website registry's API/PROFILE credentials. They are not a production authorization fallback.
6. Verify two real staging websites cannot cross-read/write, validate public-key rotation, suspension/revocation, transfers, and deployment latency. Only then deliberately open each production website gate in the approved project. No live provisioning, migration, secret delivery, production activation, or staging latency measurement was performed locally.

## Local validation

- `npm run test:websites`: isolated website credentials, tokens, namespaced participants, display-name uniqueness, filtered lists/standings, profile-purpose separation, quotas, suspension/revocation, private registry and redacted activity.
- `npm run test:websites-db`: PostgreSQL/PGlite migration replay, readiness, exclusive ownership, cross-site squad trigger, suspension, leaderboard separation, transactional audit rollback, service-only privileges.
- `npm run test:all`: existing engine/API/chip/transfer/database/HTTP tests plus the website suites.
- `npm run build`: Next production compilation.
- Browser QA uses `MGL_UI_PREVIEW=true` with the isolated test harness. Sandbox website records exist only in that disposable memory process, never the application seed path.

## Readiness update — 29 October 2026

The configured Supabase project responds to read-only schema probes. Legacy Core tables are available; website-isolation, transfer and deployment-marker tables are not yet available. Its environment is unclassified and no migrations were applied. Review the [staging rollout package](rollout/README.md). Website PEM validation now accepts actual RSA public keys of at least 2048 bits or Ed25519 keys; malformed/unsupported/private keys are rejected before persistence. The overview queries are verified against PostgreSQL, credential last-use metadata supplies persistent last-traffic timestamps, and setup dialogs support keyboard focus containment/restoration.

## Vercel Hobby scheduling

The default cron schedule is once daily (`0 0 * * *`, UTC), compatible with Vercel Hobby. Vercel may invoke it within the scheduled hour; this is not a precise matchday refresh timer. Faster updates can use the existing authenticated HSE webhook or an administrator-triggered sync. Do not configure a sub-daily Vercel cron on Hobby; that prevents deployment. The cron still requires CRON_SECRET, a configured environment and database, and does not apply schema migrations.
