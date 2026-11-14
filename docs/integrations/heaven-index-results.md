# Heaven Index live results

Admin → Events → Results lets staff choose a Heaven Index tournament and import
its standings. The picker includes past, current and upcoming tournaments whose
organizer is Major Gaming League. Each Results tier or Overall table can link
to its own Heaven Index tournament. Unlinked tiers show their manual results.

Heaven Index uses its own scoring rules and rank order. MGL displays each
competition group separately, with team names, matches, events
(matchdays), team kills, placement and total points, and player kill rankings.
The latest saved snapshot is stored in MGL's database. Sheet uploads are kept
separately and can be restored to the public view with **Show manual results**.
Team logos come from the MGL team registry. Imported rows use a logo when the
team name uniquely matches a record in that registry.

1. Deploy Heaven Index's `GET /api/v1/mgl/results` and set a dedicated
   `MGL_RESULTS_API_KEY` server variable there. This key does not grant access
   to the rest of the Heaven Index API. The endpoint checks organizer ownership
   on both listing and direct reads. Case and whitespace differences are allowed.
2. Apply `20261114120000_index_results.sql` and then
   `20261114150000_index_results_by_tier.sql` to MGL's Supabase database. Deploy MGL
   with the same `MGL_RESULTS_API_KEY`, its existing `SUPABASE_SECRET_KEY`, and
   `HSE_BASE_URL` pointing to the Heaven Index deployment. Keep the keys server only.
3. In MGL admin, open an event's Results tab, select a tier, choose its Heaven
   Index tournament, and click **Link and import**. Repeat for each tier.
   Confirm the public table matches the Heaven Index standings and that an
   event from a different organizer does not appear in the picker.
4. Mark the MGL event Live. Enable push delivery using the steps below. As a
   fallback, open public and admin pages check every 30 seconds and share a
   limit of one upstream polling request per linked table per minute.
   For fallback refreshes even when nobody is watching, configure a scheduler to call
   `GET /api/cron/index-results` with `Authorization: Bearer <CRON_SECRET>` at
   the desired interval supported by your hosting plan.
5. When the MGL event leaves Live, the public page shows its official manual
   tables. Imported snapshots remain saved. Publishing a snapshot as official
   results is deferred. During a live event, a temporary outage keeps the last
   good results. If the feed explicitly reports that the tournament is no
   longer available to MGL, the link pauses and the manual results appear.

Existing event-wide links remain visible until the first tier is linked.
An existing link for an event with one table is assigned to that table by the
migration. Previous imports and manual uploads are retained.

## Push delivery

1. In **MGL Supabase**, apply `20261114160000_index_results_realtime.sql` after
   the tier migration. It adds a public Realtime table containing only event
   slugs and revision IDs. Imported snapshots remain in the protected results table.
2. Set a new random `MGL_RESULTS_WEBHOOK_SECRET` in MGL’s server environment.
   Use at least 32 characters and keep the existing results API key separate.
   Deploy the updated MGL app and the updated Heaven Index results endpoint.
3. In **Heaven Index Supabase → Vault**, create a secret named
   `mgl_results_webhook_url` with the full HTTPS URL of MGL’s
   `/api/index-results/webhook` endpoint. Create another Vault secret named
   `mgl_results_webhook_secret` with the same value as MGL’s
   `MGL_RESULTS_WEBHOOK_SECRET`. Apply `supabase-mgl-results-push.sql` from
   the Heaven Index repository in that project's SQL Editor.
4. Open the public event standings and the linked tier in MGL Admin. Save a
   score change in a linked live tournament in Heaven Index and check both
   screens. A new revision should arrive without reloading either page.

Heaven Index queues a signed notification after a committed score change.
MGL checks the timestamp and signature, rejects duplicate notifications, and
fetches the latest standings using the organizer-scoped API. The saved
snapshot then triggers a Realtime notification to both screens for MGL events
marked Live. Publishing those live results as official results is a separate
workflow. Delivery can
take several seconds. Disconnected browsers catch up on reconnect or through
the fallback refresh.
