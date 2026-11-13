# Heaven Index data on Fantasy cards

Fantasy Core continues to supply the selected tournament, market membership,
prices, eligibility, locked team IDs, and scoring. Heaven Index supplies the
Fantasy card labels and images. The MGL Teams & Rosters pages and MGL database
are separate and are not changed by this integration.

## Server configuration

Set `HSE_BASE_URL` to the approved HTTPS Heaven Index origin and
`HSE_API_SECRET` to the Heaven Index service API credential on MGL's server.
Neither variable is public. Use the existing credential setup for that
environment; do not reuse the Fantasy Core website key for Heaven Index.

The website sends deduplicated player and locked team IDs in groups of up to 100
to `GET /api/v1/media` with `entityType=players` or `entityType=teams`. A media
batch is accepted only when its response accounts for the requested IDs, has no
duplicates, and returns the correct entity type. The website fetches those records
with a 60-second revalidation interval, so updates need no manual MGL roster edits.

Deploy the accompanying Heaven Index changes to the authenticated media endpoint
to supply `professionalName`, current `ign`, known name/IGN history, and
`teamName` alongside the existing `avatarUrl` and `logoUrl`. The older contract
supports image lookup by exact ID, but lacks current labels. When current labels
or aliases are available, at least one comparable professional name or IGN must
agree with the market. No images are matched by name alone. Team branding comes
from the market's locked team ID even after a player changes teams.

If the record, image, or lookup is unavailable, a card retains its Core labels,
silhouette, or crest initials as applicable. Failed image loads also fall back.
Older embedded raster photos are supported up to 2 MB of encoded data; use the
Heaven Index image uploader for larger originals and public storage delivery.
Core squad and transfer operations can still proceed without media. The Home
Fantasy teaser and signed-out landing use a sample squad before a market exists;
animated points on those previews are illustrative.

## Live acceptance

Once MGL has an assigned Core tournament with a published market, use one player
with a Heaven Index portrait and one without. Verify the professional name and
current IGN on both cards, the portrait on the first, the silhouette on the
second, and each locked team's name and crest. Update a test portrait in Heaven
Index and check that it appears on a subsequent refresh. Check the market, squad,
transfer preview and dashboard, and confirm MGL roster pages still display their
own data.
