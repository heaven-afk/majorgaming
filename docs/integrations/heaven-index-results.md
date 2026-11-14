# Heaven Index live results

Admin → Events → Results lets staff choose a Heaven Index tournament and import
its standings. The picker includes past, current and upcoming tournaments whose
organizer is Major Gaming League. Linking applies to that MGL event only.

Heaven Index uses its own scoring rules and rank order. MGL displays each
competition group separately, with team names and logos, matches, events
(matchdays), team kills, placement and total points, and player kill rankings.
The latest saved snapshot is stored in MGL's database. Sheet uploads are kept
separately and can be restored to the public view with **Show manual results**.

1. Deploy Heaven Index's `GET /api/v1/mgl/results` and set a dedicated
   `MGL_RESULTS_API_KEY` server variable there. This key does not grant access
   to the rest of the Heaven Index API. The endpoint checks organizer ownership
   on both listing and direct reads. Case and whitespace differences are allowed.
2. Apply `20261114120000_index_results.sql` to MGL's Supabase database. Deploy MGL
   with the same `MGL_RESULTS_API_KEY`, its existing `SUPABASE_SECRET_KEY`, and
   `HSE_BASE_URL` pointing to the Heaven Index deployment. Keep the keys server only.
3. In MGL admin, pick an existing event and link its Heaven Index tournament.
   Confirm the public table matches the Heaven Index standings and that an
   event from a different organizer does not appear in the picker.
4. Mark the MGL event Live. Visitors' pages check every 30 seconds. All visitors
   share a database refresh limit of one upstream request per event per minute.
   For refreshes even when nobody is watching, configure a scheduler to call
   `GET /api/cron/index-results` with `Authorization: Bearer <CRON_SECRET>` at
   the desired interval supported by your hosting plan.
5. Finish the event in Heaven Index and mark the MGL event Final. MGL refreshes
   the linked results before saving the status if it has no completed snapshot. The
   saved table remains visible in the archive. **Sync now** can import a later
   correction. A temporary outage keeps the last good results. A response from
   the feed explicitly reporting that the tournament is no longer available
   to MGL pauses the link and shows manual results instead.
