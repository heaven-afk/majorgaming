# MGL custom domain

MGL's primary public origin is `https://www.majorgamingleague.com`.
The apex domain redirects there. Heaven Index and Fantasy Core remain separate
services at their existing origins; do not replace their API base URLs with MGL's.

## Search identity and icons (2026-11-25)

Public Home, Teams, Events, News, Staff and Fantasy pages declare their own
canonical paths under the www metadata base, including individual team, event
and published news pages. Never put the homepage canonical in the root layout:
that would incorrectly identify every child page as the homepage.

`/sitemap.xml` lists public pages and current database records using only the
custom domain. `/robots.txt` points to that sitemap and excludes Admin, API and
private/account entry paths. This is crawler guidance, not access control.

The browser ICO, 96px PNG search icon and 180px Apple home-screen icon all use
the existing MGL vector mark on a light plate for contrast. Regenerate them with
`node scripts/generate-brand-icons.mjs` after an approved logo change.

Production inspection on 2026-11-25 found the legacy Vercel homepage still
returning 200, with robots and sitemap returning 404 on www. Deploy the branch
changes before claiming these are fixed on the hosted site. Then submit the www
sitemap and request homepage reindexing in Google Search Console. Search engines
choose when to recrawl and update their displayed domain/favicon.

## Browser and email redirects

`src/lib/site-url.mjs` owns MGL's public origin. Production confirmation/reset
callbacks and admin sign-up callbacks always use the custom domain, even when
the request comes from an old Vercel host, a preview, or a stale public-site
environment value. Local development alone can return to loopback/private LAN
origins. Social metadata uses the same canonical origin.

`next.config.ts` permanently redirects browser-facing pages on the legacy
`mglwebsite.vercel.app` host to www, preserving the requested path and query.
API, public-key and Next.js asset paths remain compatible with existing server
clients while their configured URLs migrate; signed webhook delivery must not
depend on a client following an HTTP redirect. Vercel branch preview pages
remain available for review; their production email callbacks use www. Existing
relative application redirects stay on the canonical host once a visitor arrives
there. Deploy this code before expecting the old alias to redirect.

Local HTTP verification returned 308 with the exact custom-domain destinations
for `/admin/login`, `/teams/goat-esport`, and
`/fantasy/welcome?type=recovery&next=account`.

Hosted Supabase URL Configuration still requires a separate save. The dashboard
was stuck in its shell loader on 2026-11-19, then timed out on reload. No Supabase
management credential is connected, so its settings could not be read or changed.
The owner subsequently confirmed saving the custom-domain Site URL and callback
URLs, and removing the previous URL, on 2026-11-19. That is owner-confirmed
completion; an independent dashboard read and real email-link acceptance have
not been performed here. Do not ask the owner to repeat the completed save.

## Production configuration

On 2026-11-19 the owner confirmed the Fantasy variables were missing in Vercel.
The existing API/PROFILE credentials and RSA key were verified against Core's
active MGL registration. Core's issuer and JWKS were aligned to www, preserving
the existing PEM key, status, access gate and tournament assignments. An ignored
local import file is prepared at `.local/deployment/mgl-fantasy-production.env`.
It contains secrets: import only into MGL's intended Vercel Production project,
never commit it or paste its contents into chat. Set both API keys and the private
key to Secret; public origins and the website slug can use Config. Import and
redeployment are pending; browser control could not verify the native browser URL.

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
