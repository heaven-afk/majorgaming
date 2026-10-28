# MGL data model, import and admin plan

How MGL's league data fits together, how it moves from the hardcoded files into a database once, and how the admin dashboard manages it after that.

Status: proposal, written 2026-10-28, still under discussion. The owner has created a Supabase project (keys in the git-ignored `.env.local`), but no schema or migration is applied until this model and the admin dashboard are agreed. Nothing here changes the Fantasy rules in AGENTS.md section 5: fantasy data stays with the partner.

---

## 1. The idea in one paragraph

Everything connects through **registrations**. A team registers for an event with a roster (one list of players, any size) and a manager, and gets placed in a tier. Results then hang off those registrations. Team history, player history, transfers and the current Teams page are never typed in separately. They are all read from the registrations. So the admin's job each event is: create the event, register the squads, enter the results. Every page updates from that.

---

## 2. Entities

| Table | One row is | Key fields |
|---|---|---|
| `league_settings` | how MGL runs today (single row) | tiers, squads_per_tier, discord_url |
| `teams` | a squad, kept once forever | slug, name, tag, clan, country, logo, archived_at |
| `people` | a player or manager, kept once forever | slug, ign, country, photo, archived_at |
| `events` | a season, mixed event, partner event… | slug, name, series, number, status (upcoming / live / final), start_date, matches_played, matches_total, registration (see section 5a) |
| `event_tables` | one standings table in an event | event_id, name ("Tier 1", "Overall"), tier, sort |
| `entries` | a team's registration for one event | event_id, team_id, tier, manager_id, team_name_at_event |
| `entry_players` | one player on that registration's roster | entry_id, person_id, role, captain, ign_at_event, joined_at, left_at |
| `standings` | one row of a table | table_id, entry_id, placement_pts, kill_pts, move |
| `kill_rows` | one player's kills in one event | event_id, entry_player_id (player + the team they played for), kills |
| `stories` | a news article | slug, title, category, date, author, excerpt, cover, body (JSON blocks), published_at |
| `aliases` | another spelling of a team or player | kind (team / person), target_id, alias |
| `external_ids` | the partner's ID for our team or player | kind, target_id, system ("heaven-index"), external_id |
| `admins` | who can use the dashboard | user_id, role (owner / editor) |

All tables also get `id` (uuid), `created_at`, `updated_at`. Slugs are for URLs; IDs are what rows point at, so renaming a team never breaks a link.

The code today already has these shapes: each file in `src/data/` is one future table (`types.ts` describes them). The one deliberate change in the database: a standings row points at an **entry**, not straight at a team. That guarantees every team on a results table was registered for that event, and lets the table show the name the team used at the time.

---

## 3. How the pieces connect

```
teams ─┐                    ┌─ people (manager)
       └──< entries >───────┤
events ─┘     │             └─< entry_players >── people (players)
   │          │
   └──< event_tables ──< standings >── entries
```

What each page reads:

- **Events page and event pages:** events → tables → standings → entries → teams; the kill table (top 20 by kills) reads kill rows → registered players → people and teams.
- **Teams page:** the entries of the latest event that has registrations, grouped by tier. Teams that skip an event drop off the page but keep their profile and history.
- **Team page:** the team; its newest entry (tier, manager, roster); every entry it ever had ("Where they've played").
- **Player page (later):** every `entry_players` row for that person. A player who moved teams shows each team in order. That *is* the transfer history; no separate transfers table.
- **Home standings and honours:** the featured event's first table.

### Rules the database enforces

- One entry per team per event (`unique(event_id, team_id)`).
- A person plays for one team per event (`unique(event_id, person_id)`, `event_id` copied onto `entry_players` for this).
- A standings row's entry must belong to the same event as its table.
- A roster is one list with no fixed size. No starter/substitute split.
- Exactly zero or one captain per entry.

### Names change; history shouldn't

CODM squads rename and players change IGNs. The current name lives on `teams` / `people`. The name used at an event is snapshotted on the entry (`team_name_at_event`, `ign_at_event`). Old tables keep reading as they did, and profiles show the current name with "previously …" where it differs.

### Deleting without breaking history

- A team or person with any entry is **archived**, not deleted: hidden from the Teams page and search, still shown on old tables. A true delete is offered only when nothing points at it.
- Deleting an event deletes its tables, standings and entries, after a confirm that says how many rows go with it.
- Duplicates (the same player typed twice) get a **merge** action: pick the one to keep, everything pointing at the other moves over, the other's names become aliases.

---

## 4. The one-time import

Goal: get Seasons 9 and 10, the Mixed Event Season 4 and the Carry1st Event, with their teams and rosters, into the database once, cleanly, and be able to re-run it safely until it's right.

**Done for Season 10 (2026-10-28).** The owner's two workbooks (team collation and player kill data, one sheet per tier) go through `scripts/season-sheets.py`, which writes `src/data/season-10.ts` in exactly these record shapes. The kill sheet lists every registered player with their team, so it gave full rosters, not just top fraggers. The same script, pointed at the database instead of a file, is the start of `scripts/import.ts`. Name fixes found: two kill-sheet spellings mapped to the team sheet; two Tier 5 squads with players but no standings row.

### Step 1. Results sheets first (they also give us the teams)

The owner sends the Excel results for each event. Every team that appears in a results sheet becomes a team record, and its row becomes that team's registration for that event (with the tier from the sheet) plus its standings row. So one set of files gives events, teams, registrations and results together.

Before importing, I read each sheet and list:
- the team names found, with near-duplicates flagged ("Kyzon Esports" vs "Kyzon Esport") for the owner to confirm as one team or two;
- which columns hold placement points, kill points and totals, and anything the sheet doesn't have.

### Step 2. Rosters

The **kill sheets** come with the results: every row names a player, the team they played for and their kills. So each kill row also places that player on that team's roster for the event. For many squads that already fills most of the roster; the import reports, per team, which players the kill sheets gave and how many more the roster sheet needs. Kill sheets only list the top fraggers, so rosters still need their own sheet for everyone else:

| event | team | player | role | captain |
|---|---|---|---|---|

One row per player; as many rows per team as it has players. Teams are matched to the ones the results created, by name. Managers go in a short second sheet (event, team, manager). Optional extras: team tag, clan, country; player country; logos and photos in a folder named after the team or player. Whatever isn't ready can be added later in the admin; the import doesn't need everything at once.

### Step 3. Run the import script (`scripts/import.ts`, to be written)

1. **Read and validate** every sheet: required fields, numbers are numbers, tiers within range, country codes valid.
2. **Resolve names**: match each team and player name against names and aliases, ignoring case and spacing. Anything that doesn't match exactly gets a report line instead of silently creating a second team.
3. **Dry run** by default: prints what it would create, update and skip, and every problem. Nothing is written.
4. **Write** with `--apply`, in one transaction (all or nothing). Upserts by slug, so re-running after fixing a sheet updates rows instead of duplicating them.
5. **Check** afterwards: every standings row has a registration, every registration has a team, counts per event match the sheets.

After this, everything is managed in the admin. The import is not run again for these events; the admin's own upload (section 5) covers future bulk work.

### Step 4. Switch the site over

Only `src/lib/league.ts` changes: its functions read from Supabase instead of `src/data/*`, returning the same shapes. No page or component changes. Then `src/data/sample.ts` (the placeholder generator) and the hardcoded records are deleted.

---

## 5. The admin dashboard

Owner and editors sign in (Supabase Auth); the public site never writes. Every save revalidates only the pages it affects (cache tags such as `event:season-10`, `team:kyzon-esport`), so changes show within seconds without a redeploy.

| Area | What it does |
|---|---|
| **Events** | Create, edit, delete. Set status (upcoming → live → final). Add tables (one per tier, or one "Overall"). |
| **Registrations** (inside an event) | Register a squad: pick or create the team, pick the tier and the manager, add its players (any number), mark the captain. "Copy from last event" pre-fills the roster, so a returning squad takes seconds. Add or remove a player at any time; a change during an event records `joined_at` / `left_at` instead of rewriting the past. |
| **Kill table** (inside an event) | Enter or upload the event's kill sheet: player, team, kills. A player not on that team's roster yet is offered to be added to it. The public page shows the top 20. |
| **Results** (inside an event table) | Enter placement and kill points per squad in a grid, or paste or upload a CSV in the `standings` format. Live events also take the movement since the last match day. |
| **Teams** | Search, edit details and logo, archive, merge duplicates, see every registration. |
| **People** | Same for players and managers: edit, photo, archive, merge, see every team they've played for. |
| **News** | Write and edit stories in blocks (paragraph, heading, quote, list), cover image, publish now or later. |
| **Registration** | See 5a. |
| **League settings** | Tiers, squads per tier, Discord link. |
| **Import** | Upload the same templates later for bulk work (a new season's registrations, a results sheet). Same validation and dry run as the script. |

Every change is logged (who, what, when) so mistakes can be traced and undone.

---

## 5a. Registration controls

Registration belongs to an event: "Season 11 registration is open" is a fact about Season 11. Each event carries:

| Field | Meaning |
|---|---|
| `registration_state` | `closed` (default), `soon`, `open`, `full` |
| `registration_opens_at` / `registration_closes_at` | optional dates; the site can switch from soon to open to closed on its own at these times, or the admin flips it by hand |
| `registration_url` | where the button goes (today the Discord registration channel) |
| `registration_tiers` | optional: which tiers are taking squads (e.g. only Tiers 3–5 open) |
| `registration_note` | optional one-liner shown with it ("Tier 1 by invitation") |

The admin gets one panel per event: a state switch, the dates, the link, the tiers, the note, and a preview of how the public pages will look in that state. Only one event can be open (or soon) at a time; opening another asks to close the first.

Every public spot that mentions registration reads this one place, through `src/lib/league.ts` (today they read `registration` in `src/content/site.ts`, which becomes this):

| Where | Open | Soon | Closed / full |
|---|---|---|---|
| Hero button | "Register your squad" → registration link | "Registration opens [date]" | "Join the Discord" |
| How MGL works button | Register | Opens [date] | Join the Discord |
| Events page "Now" card | Registration open for [event], dates, button | Opening soon, date | Live event or "between events" |
| Footer status pill and buttons | "Registration open" + register button | "Opens soon" | "Registration closed", Discord only |
| News | the story announcing it can link to the same state | | |

Copy for each state stays in the content files, so wording changes never touch components.

## 5b. Owner decisions, 2026-10-28

Everything runs from the website and its admin. No Heaven Index dependency, and no public accounts or forms for managers or captains: squads keep registering on Discord and staff bring them in.

- **Teams and rosters are one always-current list.** Staff edit a team's roster at any time. A team that stops playing is **archived**, not deleted: it leaves the Teams page and pickers, its past results stay. Delete only for mistakes that never played; otherwise archive or merge.
- **Each event keeps its own copy** of a team's name and roster when the team is added to it, so later changes never rewrite past tables.
- **New season check-in:** when an MGL Season is created, every active team shows "Not registered yet"; staff tick squads in as they register. A team that misses a season stays active for one more season, then can be archived in bulk.
- **Two kinds of event:** *MGL Season* (ranked; drives the active team list, tiers and the Teams page) and *Other event* (Carry1st, Mixed Events…; shows in Events and team history only). Format is **tiers** (any number) or **one table**. An event can be created with just name, kind and dates; format and teams are added later. Status upcoming → live → final.
- **Teams page** shows the teams in the current MGL Season.
- **Tiers stay manual for now.** Staff set and change any team's tier in the admin. Later: a promotion/relegation setting per ranked season (e.g. top 3 of each tier up, bottom 3 down) that suggests or applies the moves when results are marked final, always overridable by hand.
- **After the import**, teams keep their Season 10 tiers until the next season.
- **Promotion and relegation are part of the admin build** (not later): a setting per ranked season (e.g. top 3 of each tier up, bottom 3 down) applied when results are marked final, every move editable by hand.
- **No points rules or penalty reasons.** Results arrive as the collation sheet uploaded each day; the site stores and shows the sheet's placement, kill and bonus points and totals as they are.
- **Media library** in the admin: every uploaded image (team logos, player and staff photos, news covers) goes to Cloudinary and into one library, so any image can be picked again instead of re-uploaded. The character avatars are in the library too; players without a photo get one of them by default.
- **New events, step by step:** create (settings filled in from the last season), flip the registration switch (the site only shows open / soon / closed and links to Discord), tick returning squads or paste new Discord registration posts (parsed from the fixed format), enter results per match or upload the sheets (the site computes points from the event's points rules; penalties per squad with a reason), mark final.

## 6. Results: typed in, or from Heaven Index?

Heaven Index (the partner's stats engine) already records placements and kills. Two options:

- **A. MGL enters results** through the admin (grid or CSV). Works now, needs nothing from the partner.
- **B. Results come from Heaven Index.** MGL keeps events, teams, people and registrations; standings are pulled from the partner and matched to our teams through `external_ids`. No double entry, but it depends on the stats API docs we don't have yet.

Plan: build A first (needed for the past events anyway); add B when the stats API is known, using `external_ids` so neither side renames anything. To decide with the owner and partner together with the Stats page.

---

## 7. Order of work

1. Agree this model (in progress).
2. Owner sends the Excel results; I map them and report team names to confirm.
3. Owner fills the roster sheet (and managers).
4. Design and build the admin dashboard (events, registration controls, registrations and rosters, results, teams, people, news) on the hardcoded data first, so its screens are agreed before anything touches the database.
5. Apply the schema to Supabase, run the import (dry run until clean), switch `src/lib/league.ts` over, delete the placeholder data.
6. Heaven Index link for results (with Stats).

## 8. Questions for the owner

- The Excel results and kill sheets for Carry1st Event, Mixed Event Season 4 and Season 9 (Season 10 is in).
- Player countries, if wanted; until then flags stay hidden.
- The start date (or at least the order) of those four events.
- Is Mixed Event Season 4 one overall table, or split some other way?
- Rosters for each event (every player, any number) and the manager.
- Do teams or players have photos and logos to upload?
- Who besides the owner should have admin access?
