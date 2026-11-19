# One-time team logos and player photos

Requested 2026-11-19. This operator import copies Heaven Index images into MGL's
existing Cloudinary account, adds them to MGL's Media library, and fills only
empty `teams.logo_url` and `people.photo_url` fields. It changes no names, IGNs,
rosters, event entries, statistics, permissions, Fantasy records or Fantasy code.
There is no background job, browser dependency on Heaven Index, or automatic
future import. MGL Admin's existing team/player image fields own later changes.

## Matching

- Compare professional/team names and recorded aliases, with case, Unicode
  normalization, invisible formatting marks and whitespace normalized.
- Do not infer identities from similar spellings, team tags or IGNs alone.
- Search the complete source registry, including records with no images, so
  duplicates cannot silently select the only record that happens to have a photo.
- An exact current/historical IGN can disambiguate duplicate professional names.
- Reject multiple MGL records pointing to one source identity, archived records,
  missing images and existing MGL images.
- Check the original MGL update timestamp and empty image field again at write
  time, so an administrator's intervening edit is preserved.

The reviewed snapshot contained 215 MGL teams and 860 MGL players, with no saved
images. Heaven Index had 240 teams (49 logos) and 1,026 players (31 photos).
The conservative plan identified 33 team logos and 29 player photos. Two MGL
players named DEMON could not be resolved to the Index photo confidently and
were excluded. Five other source logos have competing source identities for
Primal Packs, Main Characters OG, Ciao Hunters X, Narcissist and Remedium
Invictus; these require an explicit identity decision before importing.

The import completed with all 62 assignments and no transfer errors. Every URL was
verified in its target record, the Media library, and the public `league_snapshot`
response. Record counts, names, IGNs, aliases and rosters were verified unchanged.
The completion journal prevents another apply.

## Operator commands

From the MGL project root, using its existing ignored `.env.local`:

```powershell
node scripts/sync-index-media.mjs --refresh --index-root C:/Users/USER/Documents/Projects/PersonalStatengine/heaven-stat-engine
node scripts/sync-index-media.mjs
# Review .local/index-media/review.csv before writing.
node scripts/sync-index-media.mjs --apply
```

The source project environment supplies its existing read credential; MGL's
environment supplies its existing Supabase server and Cloudinary credentials.
Credentials are never printed or stored in the reports. The scripts accept only
the known two Supabase project origins. No Index write is performed.

Snapshot, review CSV, original image references and a durable per-record journal
are kept under ignored `.local/index-media/`. The journal records the previous
image, imported URL, image hash, source ID and resulting MGL timestamp. Uploaded
assets have deterministic, content-specific IDs and `overwrite=false`. A partial
failure can resume without replacing completed images; after successful completion
the import refuses another apply. Do not erase that journal to run ongoing syncs.

Only raster files up to 10 MB are accepted; embedded player photos are decoded,
and remote images are downloaded from the observed source storage hosts. Images
are uploaded as files, rather than assigning Heaven Index URLs to MGL records.
Cloudinary's signed replies are verified before assigning an image.

## Visibility and future changes

Admin teams/players and the public league read the same MGL image fields. Public
pages can briefly retain the earlier cached version; an existing admin save
invalidates the league cache, or the regular cache refresh picks up the import.
The first live check confirmed Vortex One's imported logo on its public team page.
Subsequent Goat Esport and Developers requests still served stale page HTML.
Browser automation could not force an admin save because it could not verify the
active browser URL. Saving any team in MGL Admin refreshes the shared league cache;
otherwise the existing hourly revalidation picks up all copied images.
No redeploy is required for the database image assignments.

Future replacements use MGL Admin → Teams/Players → image upload or Media library.
Fantasy continues using its own Heaven Index media integration independently.

Matching regression tests:

```powershell
node --test tests/index-media-match.test.mjs
```

## Confirmed corrections, 2026-11-19

At the owner's request, resolved the logo-bearing Heaven Index records for
Narcissist, Remedium Invictus, Ciao Hunters X and Main Characters OG. Each had an
older competing source record without a logo. Their four images were copied and
verified in MGL's image fields and Media library; other team records stayed
unchanged. MGL now has 37 copied logos and 29 copied player photos.

The original completed journal is preserved. Explicit corrections use a separate
named batch and a reviewed JSON array of `{ "id": "MGL team ID", "sourceId":
"Heaven Index team ID" }`. Both records must exist and their names/recorded aliases
must corroborate the mapping; source and target IDs cannot repeat. Existing MGL
images and concurrent edits remain protected.

```powershell
node scripts/sync-index-media.mjs --batch named-teams-20261119 --confirmed-teams .local/index-media/confirmed-teams.json --refresh --index-root C:/Users/USER/Documents/Projects/PersonalStatengine/heaven-stat-engine
node scripts/sync-index-media.mjs --batch named-teams-20261119 --confirmed-teams .local/index-media/confirmed-teams.json --apply
```

The correction journal, plan and verification are under
`.local/index-media/named-teams-20261119/`. Do not rerun this completed batch.
Initial production page checks returned cached HTML without the four new logos;
an existing Admin save, ordinary cache revalidation or the pending homepage
deployment refreshes their public display. Fantasy is independent of this import.

The owner subsequently authorized Primal Packs. Its logo-bearing source record
`xJxtUKNTUpNmChdrdvDv` was copied using the separate completed
`primal-packs-20261119` batch. MGL now has 38 copied team logos. The refreshed
player audit still finds 31 available source photos and 29 copied: DEMON remains
unresolved between two MGL identities (both IGNs appear in Index history), while
GENIUS has no matching MGL professional name/alias or IGN. No player records were
created, merged or assigned by these team corrections.
