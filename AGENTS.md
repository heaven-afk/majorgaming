# AGENTS.md — Project Brief & Working Rules

> Shared instructions for every person and AI agent (Claude, Codex, etc.) working on this project.
> **Read this whole file before doing anything. Update the "Status" section before you finish a session.**

---

## 1. What this project is

The website for **MGL (Major Gaming League)**, a Call of Duty: Mobile Battle Royale organization that hosts ranked BR events, tournaments, and seasons. The brand is provisional. Name, colours and fonts will be replaced later, so keep them in design tokens.

## 2. Design bar (non-negotiable)

- **World-class, premium UI.** Nothing mid, nothing substandard, nothing template-looking.
- **Immersive and well animated.** Cinematic moments, smooth scrolling, deliberate motion. Design direction to be set with the owner in the rebuild.
- **NO generic esports theme.** No neon green, electric blue, neon-on-black gamer looks, slashed or angled shapes everywhere, glitch effects, HUD overlays, stock esports fonts, or red/black "tactical" defaults.
- Feel of a top-tier product or editorial brand: refined typography, generous craft in details.
- **Perfectly mobile responsive.** Design every page at 375 px first. 16 px side gutter. No horizontal scroll.
- Best possible UX: fast, accessible, polished interactions and states (loading, empty, error). Honour `prefers-reduced-motion`.

## 3. Site map

| Page | Contents | Managed via |
|---|---|---|
| **Home** | Landing page **including the About section** for the organization | Admin |
| **Staff** (separate page) | Core staff / organization team members | Admin |
| **Events** (was "Tournaments & Rankings", renamed 2026-10-28) | Live standings when an event is running; archive of past seasons/tournaments with results / points tables | Admin |
| **Teams & Rosters** | Registered teams with logos and tier, searchable; per-season. Team detail page shows roster + manager | Admin |
| **News** | Updates, announcements, blogs/articles | Admin |
| **Stats** | Player & team statistics (from partner's stats tool API — details TBD) | Partner API |
| **Fantasy** | FPL-style fantasy game for managers (biggest build — **done last**) | Fantasy Core API |
| **Admin dashboard** | Manages the content pages above | — |

Note: "Staff" (the organization's own people) is distinct from "Teams" (competing esports teams).

## 4. Build order

1. **Front-facing core first:** Home (+About), Staff, News, Teams & Rosters, Events — with the admin needed to manage them.
2. **API-dependent features later:** Stats, then Fantasy. **Do not start these until the open API questions are discussed with the project owner.**

## 5. Integrations

Three systems work together. The owner's partner runs the first two; MGL runs the third.

| System | Owner | Job |
|---|---|---|
| **Heaven Index** | Partner | Stats engine. Records all event data: kills, team placements, players. Source of truth. |
| **Fantasy Core** | Partner | Reads selected data from Heaven Index. Calculates fantasy points, player prices, manager budgets, matchday status. Holds all fantasy admin. |
| **MGL website** | MGL | Manager accounts and logins, manager display names, all screens. Shows Fantasy Core numbers. Calculates nothing. |

**Ownership rules:**
- All game logic and game admin (completion, pricing, scoring) belongs to the partner. MGL does **not** build a fantasy admin.
- Manager accounts, logins and display names live on MGL. Passwords are stored only on MGL.
- Managers are shown by their MGL display name everywhere, including leaderboards. Never by raw ID.

**Fantasy Core API** — spec in `docs/integrations/fantasy-core-api.md`.
- Partner API key is **server-side only**; never expose it to the browser.
- Instructions for the partner's coding agent: `docs/handover/fantasy-agent-instructions.md`. Open items there (manager trust method, display names, staging access, spec gaps, rate limit) must be agreed before fantasy screens are built.
- Older handover brief (superseded): `docs/handover/fantasy-partner-brief.md`.

**Stats API** (partner's other tool) — docs not yet provided.

**Database (MGL site):** Supabase (owner created the project 2026-10-28; project ref `wrcfcsrhaesvtmsqjnfw`). URL, publishable key, secret and service role keys and the direct connection string are in the git-ignored `.env.local`; only `NEXT_PUBLIC_*` values may reach the browser. **No schema or migration yet** (owner, 2026-10-28): the data model and admin dashboards are still being discussed. Plan in `docs/DATA-MODEL.md`. A Supabase access token was not provided.

## 6. Tech stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4. Scaffolded.
- **Motion (planned):** GSAP with ScrollTrigger, and Lenis for smooth scrolling. Three.js only for a hero that runs well on phones.
- **Fonts:** to be decided in the rebuild.
- **Database and login (proposed, not yet confirmed):** Supabase. See section 5.
- **Hosting (proposed):** Vercel.

Next.js 16 has breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

## 7. Working rules for agents

- Keep this file the source of truth. If a decision is made, record it here (or in `docs/DECISIONS.md` once it exists).
- Before ending a session, update **Status** below: what was done, what's in progress, what's next, blockers.
- Never commit secrets (API keys, tokens, database passwords) to the repo.
- Design and copy must stay in tokens and content files, so the brand can be replaced later without rewriting components.

---

## Status

- **Bright Final Circle footer assets — 2026-10-28:** Owner requested two bright, hopeful footer directions showing the safe zone and two different CODM characters with a “made it to the finals” feeling. Created “We Made It” (pointing toward the zone) and “The Next Stage” (celebratory fist bump), each in landscape and portrait using Scylla and Alex Mason. Four PNG originals and WebP copies are in `public/images/footer/concepts/`, prefixed `bright-01-made-it` and `bright-02-next-stage`; paired paths/dimensions in `manifest.json`, full prompts in `PROMPTS.md`. Use the matching portrait file on mobile. No new option selected or applied to the footer yet.

- **Earlier Final Circle backgrounds — rejected 2026-10-28:** The owner rejected the three dark backgrounds. Their PNG/WebP project files and stale manifest/prompts were deleted as requested; replaced by the bright options below.

- **Additional character avatars — 2026-10-28:** Generated four new square CODM character headshots in parallel: Manta Ray, Urban Tracker, Nikto and Krueger. Original PNGs and 256px WebP versions are in `public/images/avatars/`. Full prompts are in `PROMPTS-SET-02.md`; `additionalCommunityAvatars` in `src/content/visual-assets.ts` exports their paths. First avatar set and active page layout are unchanged.

- **Selected hero pair and community avatars — 2026-10-27:** Owner chose portrait `04-portrait-parachute.png` and `07-portrait-squad-return.png`. Selected PNG and web-ready WebP copies are in `public/images/hero/` as `arrival` and `return`. Four separate character headshots (Farah, Ghost, Captain Price, Soap) were generated in parallel; original PNGs and 256px WebP avatars are in `public/images/avatars/`, with full prompts in `PROMPTS.md`. Asset paths are exported by `src/content/visual-assets.ts`. Intended for a decorative community/member avatar stack; the suggested 2K+ count is still design copy, not verified membership data. No page redesign or hero layout was implemented in this asset-preparation step.

- **Portrait hero assets — 2026-10-27:** Owner approved the hopeful parachute direction and requested portrait assets for a two-column text/image hero. Created `04-portrait-parachute.png` preserving the lead jumper and two distant parachutists, and three four-person COD-styled squad scenes with a slightly darker post-match mood: `05-portrait-squad-overlook.png`, `06-portrait-squad-front.png`, `07-portrait-squad-return.png`. Files and `PROMPTS-PORTRAITS.md` are in `public/images/hero-concepts/`. Artwork only; no page implementation requested.

- **Latest request — hero artwork only:** On 2026-10-27 the owner redirected work to image assets: at least three calm, bright, hopeful, positive game-related hero variations that can work on a dark background. Further page rebuilding is out of scope for this request. Three original landscape concepts are saved in `public/images/hero-concepts/`: `01-daybreak.png`, `02-above-it-all.png`, `03-next-chapter.png`. Full prompts and compositing guidance are in `public/images/hero-concepts/PROMPTS.md`. No concept has been applied to the site.

**Phase:** Home, Events, Teams and News built in first pass on hardcoded data shaped like the future database. Awaiting owner review, real event tables and rosters, and the database choice.

- **League facts (owner, 2026-10-28):** MGL runs 5 tiers of 25 squads. The last finished season is Season 10; the next is Season 11.
**Last updated:** 2026-10-28

- **Hero (current) — 2026-10-27:** Built to match an owner-supplied reference layout exactly (dark frame, two nav pills, two rounded panels side by side, stacked on phones). Files: `src/components/Nav.tsx`, `src/components/hero/` (`Hero.tsx`, `MeshGradient.tsx`, `GlitchImage.tsx`, `glitchSound.ts`), `src/components/Icons.tsx`, `src/components/brand/Mark.tsx`, `src/lib/gl.ts`. Copy and links in `src/content/site.ts`; colours, mesh colours and fonts (Inter Tight + Instrument Serif italic accent) in `src/app/globals.css` and `layout.tsx`.
  - Nav: logo + Home, Events, Teams, News, Stats (Stats still `#`); socials (X, Instagram, YouTube, TikTok, all `#` for now); main button "Join the Discord".
  - Left panel: animated WebGL mesh gradient in brand colours with grain, avatar stack (Farah, Ghost, Price, Soap) with a two-line community line, title "Africa's [mark] *top* / CODM BR org." (two lines on every screen, sized to fit), description, "Register your squad" (Discord, only while `registration.open`), icon row (placeholder, owner undecided).
  - Right panel: `arrival` glitches into `return` and back every few seconds and on hover (WebGL tear, RGB split, block swap), chips "compete" and "ranked". A synthesised heavy glitch sound is on by default, starts on the visitor's first tap/click/key (browsers block audio before that; scrolls don't count, so it keeps listening and the button reads "Tap for sound" until it is live), stops when the hero leaves the screen, and has a mute toggle remembered per browser. On desktop the button reads "Click for sound": browsers never allow sound before a click or key press, and mouse moves and wheel scrolls do not count.
  - Owner positioning for copy: MGL is one of Africa's (AF region) top CODM BR ranking organizations, runs the highest-level ranked events, tiered, with a registration process. Not "squad up with randoms".
- **About + How MGL works (current) — 2026-10-27:** Second Home section, below the hero, in the same dark bento language. Files: `src/components/about/` (`About.tsx`, `AboutMotion.tsx`, `Odometer.tsx`, `Crest.tsx`, `StepRegister.tsx`, `StepPlacement.tsx`, `StepClimb.tsx`), `src/components/motion/` (`SmoothScroll.tsx` = Lenis on the GSAP ticker, `useStages.ts` = looping stage timer that runs only on screen). Copy and demo data in `about` and `howItWorks` in `src/content/site.ts`; images `public/images/about/`.
  - About: statement that lights up word by word on scroll, with inline avatar and island chips; squad photo that opens like an aperture with parallax; four stat tiles whose digits roll in (last tile amber).
  - How MGL works: "Three steps to the *top.*" with the register button (follows `registration.open`), then three cards with live looping illustrations: 01 Discord registration chat (typing, bot confirms), 02 squads dropping into their tier (light mesh card), 03 a squad climbing the Tier 1 standings to first.
  - Step 01 follows MGL's real Discord registration format (Tier 1 > registration thread: Team Name, Clan Name, Team Manager, Team Captain, Team Tag, then P1 to P4), shown compact, then the bot confirms and the thread locks. Step 02: a full tier is 25 squads; each tier sits at 24/25 and the placed squad fills it. Team names are real MGL teams (Vortex One, Kyzon Esport, Goat Esport, Developers, Main Characters OG).
  - SAMPLE: the four stat numbers (5 seasons, 480+ squads, 1,200+ matches, 2,000+ players), and the players, handles and points in the illustrations. Replace the stats with real figures.
  - Reduced motion: no smooth scroll or scroll effects, illustrations rest on their final frame.
- **Standings + Season honours — 2026-10-27:** Third and fourth Home sections. `src/components/standings/Standings.tsx` and `src/components/honours/` (`Honours.tsx`, `HonourCard.tsx`); data in `standings` and `honours` in `src/content/site.ts`; scroll motion for every Home section now lives in `src/components/motion/Scene.tsx` (driven by data attributes).
  - Standings (third design, 2026-10-28; the owner asked for something calm and sweet after the race-lane version): Tier 1 top ten in one dark tile as a quiet table, sorted by total. The top three share one soft rounded surface with small medal-tinted rank badges (gold, silver, bronze); the leader has a gentle warm wash and a "Champions" tag (`standings.leader`, "Leading" when live). Places 4 to 10 follow on hairline dividers. Columns: #, Team, Placement pts, Kill pts, Total, with the gap to the leader in small type under each total. Phones show #, Team and Total, with "286 place · 312 kill" under the name and the leader's tag on its own line. No bars, glows or crowns. Classes are `ladder__*` (the How MGL works climb illustration already uses `board__*`). Set `standings.live: true` during a season to show the live pill, the live title and per-row movement (`move`); otherwise it shows last season's final table.
  - Season honours: last season's top three players as collectible cards (2nd, 1st raised, 3rd on desktop; swipeable on phones, 1st first). Medal-toned rotating foil border, big serif rank numeral, honour chip, team, country flag (`src/components/Flag.tsx`, package `country-flag-icons`, ISO code in content) and three stats that roll in; cards tilt with a light under the mouse and a slow light sweep otherwise. Portraits are the COD operator renders in `public/images/players/`.
  - SAMPLE: all standings numbers, the five non-real team names (Nightfall, Onyx Esports, Sahara Kings, Phantom X, Rift Gaming), and the three players and their stats.
- **League data (current) — 2026-10-28:** All league records live in `src/data/` as plain records shaped like future database tables: `types.ts` (the shapes), `events.ts`, `teams.ts` (teams, people, registrations), `news.ts`, and `sample.ts` (placeholder generator, delete once real data is in). `src/lib/league.ts` is the only reader; pages and components never import `src/data`. When the database lands only `league.ts` changes. Full plan (entities, rules, one-time import from sheet templates, admin workflows, Heaven Index question) in `docs/DATA-MODEL.md`.
  - Registrations connect everything: an `EntryRecord` is one team's registration for one event (tier, manager, roster, captain). A roster is one list of players of any size; there is no starter/substitute split (owner, 2026-10-28). Team history, a player's teams and the Teams page are all derived from entries; nothing is typed twice.
  - Events on record (owner, 2026-10-28): Season 10 (Tiers 1 to 5), Carry1st Event, Mixed Event Season 4, Season 9. All "final". Their order is assumed (no start dates yet).
  - **Season 10 is real (2026-10-28)**, from the owner's sheets `MGL S10 TEAM COLLATION.xlsx` and `MGL S10 PLAYER KILL DATA.xlsx`. `scripts/season-sheets.py` (standard library only, run with `python -I`) turns them into `src/data/season-10.ts`: 124 teams, 5 tier tables (122 rows: placement pts, kill pts, bonus, wins, matches), 764 players, 764 kill rows, and one registration per squad whose roster is every player the kill sheet lists for it. Don't hand-edit that file; fix the sheet and rerun: `python -I scripts/season-sheets.py season-10 <teams.xlsx> <kills.xlsx> src/data/season-10.ts`. Choices made: team names set in title case from the sheets' capitals (acronyms like OG, ZL, MC, GITG kept; mixed-case names kept as typed); kill-sheet spellings mapped to the team sheet (`21 RAVENGERS` → 21 Revengers, one `VANGUARD` row → Vanguard Esports); Apex Legion and Resilient Genenis (Tier 5) are on the kill sheet only, so they have rosters but no standings row; the same professional name on two squads is treated as two players (second gets a team-suffixed slug); a player listed twice on one squad is kept once. Players are shown by **professional name**, with the IGN beside it where it differs. No countries or photos in the sheets, so flags are hidden and initials stand in for portraits.
  - Totals are placement + kill + bonus, matching the sheet's Total Pts (bonus is negative for penalties). The bonus is stored but not shown: the owner asked for no adjustment column and no gap-to-leader under totals (2026-10-28).
  - PLACEHOLDER: the Carry1st Event, Mixed Event Season 4 and Season 9 tables, and their squads and rosters, are made up (`sample.ts`; no real team is given results it never had). Replace by running the generator on their sheets.
- **Events page — 2026-10-28:** "Tournaments" renamed to "Events" (`/events`). Copy in `eventsPage` in `src/content/site.ts`.
  - `/events`: intro tile ("Every event, *every table.*") beside a "Now" card that follows the data (live event, registration open, or between events); the featured event's tables with a tab per table (hidden when there is one); then "Past *events.*": one large card per finished event led by its name (last word in the serif accent), series label, "Latest" chip on the newest, size chips (tiers or tables, squads, matches when known) and the champion. One column on phones, two from 760px.
  - `/events/[event]` (`src/app/events/[event]/page.tsx`, all prebuilt, unknown slugs 404): back link, title, facts (champions linked to the team, squads, tiers or tables, matches when known), every table, newer and older event cards. Streams inside `<Suspense>` as Cache Components requires.
  - Shared `src/components/standings/Ladder.tsx` (Home and Events; team names link to team pages); `EventTables.tsx` switches tables; `EventArchive.tsx` exports `EventCard`.
- **Teams — 2026-10-28:** A directory, not a results page (owner: no points, champions or rankings on Teams, and no event or season dropdown). Teams have **no country**: a squad's players come from different countries, so only players carry one (owner, 2026-10-28). `/teams` lists the squads registered for the latest event that has registrations, grouped by tier, with search and a tier filter. Cards (`TeamCard.tsx`) are tiles, 2 across on phones, 3 from 900px, 4 from 1200px: crest and arrow on top, name large, tag chip (no clan), then a row of roster faces and the player count (owner liked the faces; three smaller faces on phones so the row stays on one line). `/teams/[team]`: crest, name, tag, clan; facts (tier, players, events played, first event on record); "The *roster.*": every registered player in one grid, then manager, captain, clan and tag; "Where they’ve *played.*"; more squads from the same tier. Copy in `src/content/teams.ts`. Crests are generated initials until teams have logos.
- **News — 2026-10-28:** `/news` (category filter, lead story, grid) and `/news/[slug]` (byline, cover, prose blocks, sticky share/copy-link, "Keep *reading.*"). Six draft stories in `src/data/news.ts`, covers in `public/images/news/`, copy in `src/content/news.ts`. All story text is SAMPLE for the owner to replace or approve.
- **Kill tables — 2026-10-28:** Every event page shows "The top *fraggers.*" under its standings: the event's top 20 players by kills (owner, 2026-10-28). Top three as cards (photo, medal-tinted rank, name, flag, team link, kills in large serif), places 4 to 20 as a list, two columns from 900px. Kill tables are **per tier**: a tab per tier (same switch as the standings), top 20 each, a player counting in the tier their squad registered in. Players without photos show their initials (large serif monogram on the podium cards). Data: `KillRecord` (event, player, team, kills, matches) in `src/data/types.ts`, rows in `src/data/kills.ts` (Season 10 real; other events PLACEHOLDER), read through `killTablesOf(event)` in `src/lib/league.ts`; client component `src/components/events/KillTable.tsx`, styles `.kt*` at the end of `globals.css`, copy `eventsPage.event.kills`.
- **Home honours — 2026-10-28:** "Season 10’s *finest.*" now shows Season 10 Tier 1's real top three fraggers (from `killTablesOf`, in `honours` in `site.ts`): name, team, kills, matches, kills per match; no flag until players have countries. Portraits are still decorative operator renders. The Home standings are Season 10 Tier 1's real top ten. The Fantasy board, How MGL works illustrations and news stories still use SAMPLE players (Sable, Havoc, Juno…).
- **Staff page — 2026-10-28:** `/staff`, in the nav and footer after News. Intro tile ("The people behind *the league.*", faces, facts), "Running *the league.*" opens with the founder's spotlight (owner, 2026-10-28: the founder gets more, with a bio): large portrait beside role chip, big name, a serif pull-quote, a short bio, facts (started MGL, seasons run from the data, home) and socials, on a warm amber-edged card; any staff record with `spotlight` {quote, bio[], since} gets this treatment. Then the other leaders as portrait cards (wider crop when there are one or two), then "Match day, *every day.*" with Operations, Media and Community groups as compact cards (photo or initials, name, role, flag, social buttons). Data `src/data/staff.ts` (13 PLACEHOLDER staff with invented handles, and an invented founder quote, bio and start year; `StaffRecord` type lives there), access `src/lib/staff.ts`, copy `src/content/staff.ts`, components `src/components/staff/`, styles in `src/app/staff/staff.css` (`sf-` prefix, imported by the page). Needs the real staff list (names or handles, roles, groups, photos, socials) from the owner; managed in the admin later.
- **Stats:** not started. Waits for the partner's stats API docs (owner chose Teams and News first). Nav link stays `#`.
- **Footer artwork and avatar mix — 2026-10-28:** Owner chose the fist-bump scene (concept `bright-02-next-stage`, Scylla and Alex Mason) for the Final circle. Copies are `public/images/footer/final-circle-wide.webp` (desktop, 900px and up) and `final-circle-tall.webp` (phones), served through one `<picture>`; each has a focus point in `footer.scene.image` in `site.ts`, and the circle opens from that point wherever the crop puts it. Desktop: squad on the left, closing copy on the right. Phones: the artwork sits at the top of a panel that grows with its copy, and the title starts just below their faces. `daybreak.webp` is no longer used. Home now spreads all eight character avatars: hero Farah, Ghost, Price, Soap; About chip Manta Ray, Nikto, Krueger; registration chat Urban Tracker; Fantasy board Nikto, Urban Tracker, Krueger, Manta Ray; FAQ Ghost, Urban Tracker, Farah, Nikto (chosen in `site.ts`).
- **Fantasy teaser, FAQ, footer — 2026-10-28:** Last three Home sections. Home order is now Hero, About + How MGL works, Standings, Honours, Fantasy, FAQ, footer.
  - Fantasy (`src/components/fantasy/`): light mesh panel, "Pick your four. *Beat the managers.*" with a "Coming soon" pill, three feature lines and a Discord notify button. Beside it a live squad board follows the Fantasy Core rules (4 starters with roles, sub, 100 credits, captain 2×): matchday points land on players one by one, the captain's double, score and manager rank tick up, then it loops. Visitors can tap any player to make them captain. All names, prices and points are SAMPLE; real screens wait on the partner items below.
  - FAQ (`src/components/faq/`): six questions in an accordion (one open at a time, numbered, amber edge when open) beside a sticky "Still unsure? Ask on Discord" card. Answers are draft copy for the owner to confirm.
  - Footer (`src/components/footer/`, "Final circle"): a full-bleed scene using the fist-bump art (see "Footer artwork" above). Outside a ringed circle the scene is dimmed like the storm; as the visitor scrolls, the scene pins in the middle of the screen and the circle opens to reveal the full image, like a battle royale zone in reverse. A chip on the ring reads "Final circle", then "You made it". Registration status pill, the closing line "Your squad belongs *at the top.*", register and Discord buttons, then link columns, legal line, back to top, and "Major Gaming League" in giant type whose letters rise out of the bottom edge and fade into the dark. A first emblem-assembly footer was replaced at the owner's request.
- Shared motion helpers: `src/components/motion/Ticker.tsx` (counting numbers), `Scene.tsx` also takes `as="footer"` and drives `[data-letters]`; `SmoothScroll.tsx` exports `scrollToTop()`.
- Logo: owner's MGL mark traced to vector, `public/brand/mgl-mark.svg` (source PNG beside it) and `src/components/brand/markPaths.ts` (M, G, L as separate paths).
- Dev quirk: Turbopack sometimes keeps serving an old `globals.css` after edits. Restart the dev server if a CSS change doesn't show. A `@media (max-width: …)` block added on 2026-10-28 never reached the compiled CSS even after restarts; write styles mobile-first with `min-width` queries like the rest of the file.
- All earlier design directions (v1 to v5) were deleted at the owner's request and must not be revived.
- Owner feedback from the rejected rounds, to respect in the rebuild: a true near-black dark theme (no tinted "nearly dark" bases like walnut); feels like esports but by a better designer, with no generic esports tropes; no device or phone mockups; headings in proportion, not oversized; not bare and not newspaper-like; game-related, quality visuals; distinct, flowing motion rather than one fade everywhere; no calendar; Tier 1 standings as a well-designed table with icons, top three as a podium; no news or staff sections on Home; the register button shows only while registration is live and links to Discord.
- Kept: `docs/integrations/` and `docs/handover/` (fantasy API and partner instructions), `.claude/launch.json`.
- Dev server runs on the LAN (`npm run dev -- -H 0.0.0.0 -p 3000`, also the `mgl-site` entry in `.claude/launch.json`); phone URL http://192.168.0.136:3000 (the IP changes between networks; it was 192.168.1.136 before). `allowedDevOrigins` in `next.config.ts` must list the laptop's current Wi-Fi IP, then restart the dev server, or the phone gets the page without its JavaScript and nothing animates.
- Git: pushed to https://github.com/heaven-afk/majorgaming (private), branch `main` (first commit 2026-10-28). Commit only when the owner asks. `.gitignore` keeps out `.env*` (except `.env.example`, names only), build output, local tool settings and raw Excel sheets.
- Next: owner sends the sheets for the other three events (same format as Season 10, run `scripts/season-sheets.py`); I map them, create teams and registrations from them and report team names to confirm; then a roster sheet (event, team, player, role, captain) and managers. Then design the admin dashboard (events, registration controls, registrations and rosters, results, kill tables, teams, people, staff, news) on the hardcoded data, and only then apply the schema and import (`docs/DATA-MODEL.md` sections 4, 5, 5a, 7).
- Pending from owner: team and kill sheets for Carry1st Event, Mixed Event Season 4 and Season 9; player countries and photos (optional); confirm the two name fixes and that same-name players on different squads are different people; the real staff list (handles, roles, groups, photos, socials) and the founder's real bio, quote and start year; real Discord and social links, community count, real About numbers (seasons, squads ranked, matches, players), real tables for Season 10 (Tiers 1–2), Carry1st Event (Tiers 1–2), Mixed Event Season 4 and Season 9 (Tier 1), split into placement and kill points if available; start dates or order of those events; whether Mixed Event Season 4 is one overall table; rosters per event (starters, subs, manager); team logos and player photos; Season 10 top three players (with photos and countries if wanted), how many tiers and matches past seasons had, confirmation of the FAQ answers, colours and domain, past-season data, go-ahead on the database choice.
- Registration controls (planned, `docs/DATA-MODEL.md` 5a): per-event state (closed / soon / open / full), dates, link, tiers, note, set in the admin. The hero button, How MGL works button, Events "Now" card and footer pill/buttons all read it. Today they read `registration` in `src/content/site.ts` (open/closed only).
- Pending from partner: manager trust method, display names on leaderboard, staging URL and key, spec gaps (agent instructions section 4), rate limit.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
