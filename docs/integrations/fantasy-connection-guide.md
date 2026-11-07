# MGL / Fantasy Core connection and operations

Updated 2026-11-05. Work is delivered on `feature/fantasy-integration`.
MGL consumes one current tournament at a time. There is no manager tournament switcher.

## Responsibilities

- Heaven Index supplies match results to Fantasy Core.
- Fantasy Core owns tournament assignments, players, pricing, deadlines, market state,
  scoring, chips, transfer penalties and standings.
- MGL owns manager accounts, verified sessions, display names and the public screens.
- MGL administrators can operate their assigned tournament's current market through
  the scoped Core window API. MGL never needs Core's platform administrator key.

The last recorded live read check (2026-11-03) succeeded after MGL was activated,
with zero assigned tournaments. That is historical evidence, not a verification of
current hosted configuration. Earlier DRAFT/closed-access instructions are superseded.
Production credentials, trust and deployment must be checked in the owner's correct
hosting account. This implementation session does not change hosted accounts.

## Server configuration

Configure the following in the intended MGL deployment, without a `NEXT_PUBLIC_` prefix:

- `FANTASY_CORE_URL`: the approved Core HTTPS origin, without `/api/v1`.
- `FANTASY_SITE_SLUG`: the registered website slug, currently `mgl`.
- `FANTASY_PARTNER_API_KEY`: the website's API-purpose credential.
- `FANTASY_PROFILE_API_KEY`: its separate PROFILE-purpose credential.
- `FANTASY_JWT_ISSUER`: MGL's exact registered public HTTPS issuer.
- `FANTASY_JWT_PRIVATE_KEY`: its RSA signing private key, server-side only.

Register the matching issuer and public JWKS/PEM in Fantasy Core. MGL publishes
only public RSA fields at `/.well-known/jwks.json`. Private keys must not be shared
in chat or committed. The existing `fantasy:setup-identity` command refuses to
replace a signing identity; do not run it to fix a missing hosted environment value.

The admin page shows presence/signing-format checks without displaying values.
Configured is not a claim that every credential is accepted remotely. An actual
Core read and acceptance flow establish that.

`npm run fantasy:check` checks the catalog with the local server credential. A
passing catalog check proves neither profile syncing nor manager gameplay.

## Prepare the one tournament in Core

The Core operator assigns the intended tournament to MGL and prepares its matchdays,
players, draft market and a future submission deadline. Mark completed tournaments
appropriately so the current-tournament selection is unambiguous. Do not assign
legacy tournaments without reviewing their participants and ownership.

MGL displays the live tournament first, otherwise the next upcoming one. The current
matchday follows the open market, an unprocessed locked matchday, or the first
unplayed matchday. No tournament or matchday is fabricated if Core returns none.

## Admin → Fantasy → Go live

A verified MGL owner/editor opens `/admin/fantasy`. The page displays the current
Core tournament, matchday, eligible-player count, deadline in Africa/Lagos time,
market status, scoring status, matchday history and connection readiness.

1. Check the tournament, matchday and deadline.
2. Select **Go live** and confirm the displayed target.
3. MGL rechecks the administrator session and reads uncached Core state. A changed
   tournament, status or deadline requires refreshing instead of submitting stale data.
4. The server signs a five-minute JWT containing only `fantasy:windows:manage` and
   calls `POST /api/v1/markets/{tournamentId}/window` with `action: open`.
5. Core validates ownership, lifecycle, deadline and pricing, then publishes/freezes
   its official prices. Only Core's confirmed OPEN response is treated as success.
6. MGL invalidates public fantasy caches so the public screens use the new state.

**Lock market** stops changes; **Close matchday** closes the market. Expired or
played drafts cannot be opened from MGL. Core remains authoritative and may reject
transitions. There is no automatic retry of a window mutation. After an unknown
outcome, refresh and inspect Core's current state before retrying.

Going live opens squad selection and transfers. It does not import results, mark
matches complete, trigger scoring, create tournaments or change deployment access.
Those operations remain in Fantasy Core. Automatic dashboard refresh reads Core's
published points; it does not make an unconfigured results webhook or processing
job start running.

## Manager flow

Supabase verifies manager sign-up/login, sessions and password reset. Manager cookies
are separate from admin cookies; browser input cannot choose the manager identity.
Display names are stored in MGL and synced using the PROFILE credential before
squad/transfer writes. Missing profile configuration is an error rather than a
silent successful sync. Same-name retries can retry a failed profile sync.

Managers select four distinct starters with all four roles, a distinct substitute,
a starting captain and optionally Triple Captain or Bench Boost. Core validates
prices, eligibility and every save. Replacements use `/transfers`, retaining the
same Idempotency-Key/body after an unknown outcome. Free Transfer and penalties are
Core-owned. MGL never submits a score or deducts real manager points itself.

A missing/expired deadline closes selection. The squad UI also disables changes
when the deadline arrives, without discarding the draft; the server/Core recheck
on submission. Dashboard and standings refresh every 30 seconds while visible.
Squad drafts and account forms are not periodically refreshed.

## Response validation and verification

All responses consumed by the screens are runtime-decoded, reduced to the fields
MGL needs and scoped to their requested tournament/matchday. This includes current
and carry-forward squads, points, chips, standings, profile echoes and transfer/window
receipts. A malformed response produces a safe failure, not invented zero scores
or a successful action message. Browser squad/transfer payloads are also checked.

`npm run test:fantasy` covers transport/auth claims, response contracts, admin window
authorization, stale-state rejection, deadlines, distinct lineups and retry fields.
Run TypeScript and the production build as well. These are local checks, not a
claim of live acceptance. Use the [acceptance checklist](fantasy-acceptance.md).

`FANTASY_PREVIEW=1` enables development-only sample gameplay. It is always disabled
in production. Preview scores/prices/managers and memory-only saves/transfers do
not establish a real Core connection. Preview cannot invoke live admin controls.
