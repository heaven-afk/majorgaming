# MGL custom domain

MGL's primary public origin is `https://www.majorgamingleague.com`.
The apex domain redirects there. Heaven Index and Fantasy Core remain separate
services at their existing origins; do not replace their API base URLs with MGL's.

## Production configuration

1. **Vercel → MGL developers → majorgaming → Environment Variables:** set
   `NEXT_PUBLIC_SITE_URL=https://www.majorgamingleague.com` in Production.
   For a coordinated Fantasy identity cutover, also set
   `FANTASY_JWT_ISSUER=https://www.majorgamingleague.com`. Keep the existing
   `FANTASY_JWT_PRIVATE_KEY`; do not generate or rotate keys for a domain change.
   Redeploy Production after changing the variables.
2. **Fantasy Core → Website APIs → mgl:** set Website URL to the primary origin.
   Coordinate the issuer with MGL's deployed `FANTASY_JWT_ISSUER`; an issuer is an
   exact token identifier, and changing only one side rejects manager requests.
   Once MGL serves its existing public key successfully, set JWKS URL to
   `https://www.majorgamingleague.com/.well-known/jwks.json`. Preserve the existing
   public PEM, credentials, status, production gate and tournament assignments.
3. **MGL Supabase → Authentication → URL Configuration:** set Site URL to the
   primary origin. Add the exact redirect
   `https://www.majorgamingleague.com/fantasy/welcome` for confirmations and resets,
   and `https://www.majorgamingleague.com/admin/login` for admin sign-up.
   Keep localhost redirects for local development. Keep existing redirects until
   previously issued email links have expired.
4. **Heaven Index Supabase → Vault:** update only `mgl_results_webhook_url` to
   `https://www.majorgamingleague.com/api/index-results/webhook`. The SQL in
   `scripts/sql/heaven-index-custom-domain.sql` updates the existing value without
   reading or changing the signing secret. Run this in Heaven Index, not MGL.
5. Update any external scheduler targeting MGL to
   `https://www.majorgamingleague.com/api/cron/index-results`; keep its existing
   bearer credential. Relative in-project cron paths need no change.

`FANTASY_CORE_URL`, `HSE_BASE_URL`, all Supabase URLs, and Heaven Index's own
`NEXT_PUBLIC_APP_URL` continue to point to their respective services.

## Verification

- Apex returns a redirect to www; www returns HTTP 200 over HTTPS.
- Public JWKS returns HTTP 200 with the existing RSA key, not HTTP 503.
- Core's registered issuer exactly matches the deployed MGL issuer.
- `npm run fantasy:check` succeeds with the existing MGL website credential.
- An unsigned webhook request returns 401, rather than a missing-config 503.
- Verify the Supabase URL settings and Vault destination in their dashboards.
- Exercise real sign-in/reset and signed results delivery in the agreed demo;
  do not start an event or change scores simply to test this URL cutover.

## Observed state, 2026-11-17

The primary domain returned HTTP 200 and the apex redirected correctly. Core's
MGL Website URL was updated and verified. Its issuer remains
`https://mglwebsite.vercel.app` pending the coordinated production cutover.
The custom-domain JWKS endpoint returned HTTP 503 (signing configuration absent
or invalid). Hosted Vercel variables, Supabase Auth URLs and Heaven Index Vault
changes remain unverified: Windows browser input/capture failed and this workspace
has no authenticated Vercel CLI or Supabase management token. Local site URL,
source defaults and metadata now use www. This is not a completed hosted cutover.
The authenticated Core catalog read succeeds (zero tournaments assigned), and an
unsigned POST to the custom-domain webhook returns 401. TypeScript and targeted
ESLint pass. Source changes remain uncommitted.

Vault SQL follows [Supabase's documented secret-update function](https://supabase.com/docs/guides/database/vault#updating-secrets).
