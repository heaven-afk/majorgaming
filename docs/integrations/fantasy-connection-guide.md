# Connecting MGL to Heaven Fantasy Core

Updated 2026-11-03 after reading the actual fantasy project at
`C:/Users/USER/Documents/Projects/Heaven_fantasy_codm`. Work stays on
`feature/fantasy-integration`; nothing has been committed, pushed or deployed.

Latest connection state (2026-11-03): MGL is registered in the live Core registry
as `mgl`, DRAFT. Separate API/PROFILE credentials and the public signing trust are
configured; raw credentials are stored only in ignored `.env.local`. No tournaments
have been assigned. `productionEnabled` remains false. The read check returns 403
while DRAFT. Automatic approval review requires explicit production-activation
approval before changing that state; hosted MGL configuration is also pending.

## What is ready locally

MGL has a server-only API client with website identity and separate API/PROFILE
credentials; reads for tournaments, matchdays, markets and standings; authoritative
validation; and private helpers for squad saves, chips, manager points and transfers.
Public reads cache for 15 seconds (5 seconds for standings); private reads and
writes are uncached. Transfers require a stable idempotency key and are not
automatically retried. Core remains authoritative for prices, costs and points.

MGL also has an RS256 signer issuing five-minute manager tokens and a public-key
route at `/.well-known/jwks.json`. It publishes only public RSA fields. Until a
signing key is configured, it returns a safe 503. No public token-issuance route
exists. The signing helper must receive identity from a verified MGL session.

The signer was checked directly against the actual Fantasy Core verifier with an
ephemeral local test key: valid identity accepted and wrong issuer rejected.
This does not prove the deployed Core has registered MGL's trust settings.

## 1. Finish the Core deployment configuration

The latest `fantasy-core/environments.json` records:

- Production URL: `https://heavenfantasy-br-codm.vercel.app`.
- Core database upgrade applied and verified on 2026-11-02.
- Deployment classification pending, MGL production access CLOSED.
- Staging NOT_PROVISIONED.

In the fantasy project's Vercel production environment, configure
`FANTASY_ENV=production` and redeploy, as its environment record requires. Do not
label the existing production database as staging. Public health is
`GET /api/v1/health`; a live health request from this workspace failed to connect,
so current uptime is unverified. Keep MGL access closed until acceptance.

For acceptance testing, provision separate staging hosting/database and use
staging keys. The source project includes its migration, seed and smoke tools.

## 2. Prepare the MGL signing identity

In PowerShell:

```powershell
Set-Location C:\Users\USER\Documents\Projects\mglwebsite\temp_repo
git branch --show-current
```

Expected: `feature/fantasy-integration`.

Set `FANTASY_JWT_ISSUER` in the ignored `.env.local` to the exact public HTTPS
address for the MGL environment being connected. The setup utility can default
to `NEXT_PUBLIC_SITE_URL` if the issuer is absent. Then run:

```powershell
npm run fantasy:setup-identity
```

This creates a 3072-bit RSA key in the existing ignored `.env.local`, preserves
other settings and refuses to overwrite an existing signing key. It prints no
key or token. Restart the local server afterward. Do not send the private key
through chat or commit it. The utility was run on 2026-11-03: the local signing
identity is ready with issuer `https://mglwebsite.vercel.app`. The live Core health
check also returned HTTP 200. Registry access is pending explicit approval to use
the existing administrator credential with the hosted Core; no remote registry
configuration has been performed yet.

For the matching hosted MGL environment, add `FANTASY_JWT_ISSUER` and
`FANTASY_JWT_PRIVATE_KEY` through Vercel's secret settings. The private-key value
supports actual PEM newlines or literal `\n` sequences. Redeploy this branch to
make the new JWKS route reachable. Keep staging and production keys separate.

## 3. Register MGL in the Core dashboard

Sign in to the fantasy admin dashboard with the existing approved administrator
account, then open **Website APIs**:

1. Create or select MGL. Confirm its permanent slug (use `mgl` if creating it).
2. Set its website URL and issuer to the MGL environment's real public address.
3. Set its JWKS URL to that address plus `/.well-known/jwks.json`.
   It must be reachable by Core and return the public key matching MGL's signer.
   Vercel preview protection can block this request; use a reachable test deployment
   or configure the public PEM fallback through the dashboard.
4. Register one **API** credential and one separate **PROFILE** credential.
   Generate/store the values in the approved secret manager and transfer them
   directly into MGL's server environment. Core stores hashes, so retain the raw
   values securely when registering them. MGL does not need the platform admin key.
5. Assign the intended sandbox tournament to MGL. A tournament belongs to exactly
   one website. Review any legacy participants before assigning existing events.
6. Activate the staging website once trust and credentials are ready.

Production has a separate per-website `production_enabled` gate. The dashboard's
ACTIVE status does not open it. Follow the operator's reviewed production rollout
after acceptance; do not bypass that gate for a connectivity check.

## 4. Configure and check MGL's connection

Fill these in the existing `temp_repo/.env.local`:

```dotenv
FANTASY_CORE_URL=
FANTASY_SITE_SLUG=
FANTASY_PARTNER_API_KEY=
FANTASY_PROFILE_API_KEY=
```

Use the matching staging Core HTTPS origin without `/api/v1`, the registered
slug, and the matching API/PROFILE values. Use the same variables in the matching
MGL Vercel environment; none should use a `NEXT_PUBLIC_` prefix. Restart/redeploy
after changes, then run locally:

```powershell
npm run fantasy:check
```

The command sends the site slug and API key, checks the tournament response, and
prints only a count. An empty catalog can mean no tournament is assigned. HTTP
401/403 points to credentials, website status or trust; 503 can mean incomplete
deployment configuration or closed production access; 429 requires waiting for
the retry interval. A passing catalog check verifies reads only.

## 5. Finish MGL manager accounts and screens

Core already implements token verification and name syncing. The remaining MGL
application work is manager registration/login, verified sessions and persistent
profiles, followed by the fantasy screens. Supabase Auth is a candidate because
the MGL database is already there; it has not been implemented or configured by
this change. Never use Core's administrator account as a manager account.

After MGL verifies a manager session, load that user's persistent ID/display name,
sync the profile using the PROFILE helper, and issue a token with the internal
signer. Invoke private API helpers on the server; never accept manager identity
or admin permissions from browser form fields. Browser handlers still need input
validation, same-origin/CSRF protection and request limits before being exposed.
The server helper functions alone do not implement authentication.

Use the current [OpenAPI](fantasy-core/openapi.yaml) to add runtime response
validation and public DTOs when building screens. Show `displayName`, with an
unnamed state when null, never a raw manager ID. Respect `submissionDeadline`
and authoritative window state on submission. Scoring chips are `null`,
`triple_captain` and `bench_boost`; the separate Free Transfer waiver applies to
one replacement. All replacements go through `/transfers`, preserving the exact
body and idempotency key on unknown-outcome retries. Read receipts and totals
from Core; never deduct points or price players on MGL.

Website administrators can eventually manage their tournament windows through
the scoped [window API](fantasy-core/WEBSITE_TRANSFER_WINDOWS.md), after MGL has
verified administrator sessions. This preparation deliberately issues only
ordinary manager tokens, without window-management permissions.

## 6. Accept staging before production

Test profile-name conflicts, valid/expired/bad tokens, cross-manager and cross-site
isolation, squad validation, market closure, chip usage, transfer penalties,
idempotent retries, pagination, missing names and rate limits. Run the fantasy
project's staging smoke/performance scripts with its staging configuration.

After acceptance, register separate production credentials and signing trust,
enable the production website through the operator's approved rollout, redeploy
MGL and verify the complete manager flow. Local tests and a catalog connection
are preparation, not a claim that live gameplay is ready.
