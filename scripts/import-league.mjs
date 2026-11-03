/**
 * One-time import: copies the records in `src/data/` (events, tables, teams, people,
 * registrations, rosters, kill rows, news stories and staff) into the Supabase tables from
 * `supabase/migrations/`.
 *
 *   node scripts/import-league.mjs           dry run: prints what it would write
 *   node scripts/import-league.mjs --apply   writes it
 *
 * Safe to re-run: teams, people, stories and staff are upserted by slug, and each imported
 * event is deleted and written again, which takes its tables, registrations, rosters and
 * results with it.
 * Reads the secret key from `.env.local`; it never leaves this machine.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const root = new URL("..", import.meta.url);
const apply = process.argv.includes("--apply");

const env = Object.fromEntries(
  readFileSync(new URL(".env.local", root), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");

// The data files are TypeScript; jiti (already installed with the toolchain) loads them.
const base = new URL("x.js", root).pathname.replace(/^\/(\w:)/, "$1");
const jiti = createRequire(import.meta.url)("jiti")(base, { interopDefault: true, alias: { "@": base.replace(/x\.js$/, "src") } });
const { events } = jiti("../src/data/events.ts");
const { teams, people, entries } = jiti("../src/data/teams.ts");
const { kills } = jiti("../src/data/kills.ts");
const { stories } = jiti("../src/data/news.ts");
const { staff } = jiti("../src/data/staff.ts");

async function rest(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** Inserts rows in batches and returns what was written. */
async function insert(table, rows, { onConflict } = {}) {
  const out = [];
  for (let i = 0; i < rows.length; i += 500) {
    const q = onConflict ? `${table}?on_conflict=${onConflict}` : table;
    const prefer = `return=representation${onConflict ? ",resolution=merge-duplicates" : ""}`;
    out.push(...(await rest(q, { method: "POST", body: rows.slice(i, i + 500), prefer })));
  }
  return out;
}

const n = (v) => (v === undefined ? null : v);

// Build every row first, so a dry run reports problems without writing anything.
const problems = [];
const teamBySlug = new Map(teams.map((t) => [t.slug, t]));
const personSlugs = new Set(people.map((p) => p.slug));
const entryKey = (event, team) => `${event}|${team}`;
const entrySet = new Set(entries.map((e) => entryKey(e.event, e.team)));

for (const e of entries) {
  if (!teamBySlug.has(e.team)) problems.push(`entry ${e.event}: unknown team ${e.team}`);
  for (const l of e.lineup) if (!personSlugs.has(l.player)) problems.push(`entry ${e.event}/${e.team}: unknown player ${l.player}`);
}
for (const ev of events)
  for (const t of ev.tables) for (const r of t.rows) if (!entrySet.has(entryKey(ev.slug, r.team))) problems.push(`${ev.slug} ${t.name}: ${r.team} has no registration`);
for (const k of kills) {
  if (!entrySet.has(entryKey(k.event, k.team))) problems.push(`kills ${k.event}: ${k.team} has no registration`);
  if (!personSlugs.has(k.player)) problems.push(`kills ${k.event}: unknown player ${k.player}`);
}
const seen = new Map();
for (const e of entries)
  for (const l of e.lineup) {
    const key = `${e.event}|${l.player}`;
    if (seen.has(key)) problems.push(`${e.event}: ${l.player} is on ${seen.get(key)} and ${e.team}`);
    seen.set(key, e.team);
  }

const rosterRows = entries.reduce((s, e) => s + e.lineup.length, 0);
const standingRows = events.reduce((s, e) => s + e.tables.reduce((m, t) => m + t.rows.length, 0), 0);
console.log(`${events.length} events, ${teams.length} teams, ${people.length} people, ${entries.length} registrations, ${rosterRows} roster places, ${standingRows} standings rows, ${kills.length} kill rows, ${stories.length} stories, ${staff.length} staff`);
if (problems.length) {
  console.log(`\n${problems.length} problems:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (!apply) {
  console.log("\nDry run: nothing written. Run with --apply to write.");
  process.exit(0);
}

const teamRows = await insert("teams", teams.map((t) => ({ slug: t.slug, name: t.name, tag: n(t.tag), clan: n(t.clan), logo_url: n(t.logo) })), { onConflict: "slug" });
const teamId = new Map(teamRows.map((t) => [t.slug, t.id]));
const personRows = await insert("people", people.map((p) => ({ slug: p.slug, name: p.name, ign: n(p.ign), country: n(p.country), photo_url: n(p.photo) })), { onConflict: "slug" });
const personId = new Map(personRows.map((p) => [p.slug, p.id]));

await rest(`events?slug=in.(${events.map((e) => e.slug).join(",")})`, { method: "DELETE" });
const eventRows = await insert(
  "events",
  events.map((e, i) => ({
    slug: e.slug,
    name: e.name,
    series: e.series,
    kind: e.series === "MGL Season" ? "season" : "other",
    number: n(e.number),
    status: e.status,
    format: e.tables.length && e.tables.every((t) => t.tier) ? "tiers" : "single",
    sort_order: i * 10,
    start_date: n(e.startDate),
    end_date: n(e.endDate),
    registration_state: e.registration ?? "closed",
    registration_opens: n(e.registrationOpens),
    registration_closes: n(e.registrationCloses),
    poster_url: n(e.poster?.src),
    poster_alt: n(e.poster?.alt),
    poster_width: n(e.poster?.width),
    poster_height: n(e.poster?.height),
    summary: n(e.summary),
    description: e.description ?? [],
    details: e.details ?? [],
    matches_played: n(e.matches?.played),
    matches_total: n(e.matches?.total),
    kill_table_size: n(e.killTableSize),
  })),
);
const eventId = new Map(eventRows.map((e) => [e.slug, e.id]));

const tableRows = await insert(
  "event_tables",
  events.flatMap((e) => e.tables.map((t, i) => ({ event_id: eventId.get(e.slug), name: t.name, tier: n(t.tier), sort: i }))),
);
const tableId = new Map(tableRows.map((t) => [`${t.event_id}|${t.name}`, t.id]));

const entryRows = await insert(
  "entries",
  entries.map((e) => ({
    event_id: eventId.get(e.event),
    team_id: teamId.get(e.team),
    tier: n(e.tier),
    manager: e.manager ?? null,
    team_name: teamBySlug.get(e.team).name,
    team_tag: n(teamBySlug.get(e.team).tag),
  })),
);
const entryId = new Map(entryRows.map((r) => [`${r.event_id}|${r.team_id}`, r.id]));
const entryOf = (event, team) => entryId.get(`${eventId.get(event)}|${teamId.get(team)}`);

await insert(
  "entry_players",
  entries.flatMap((e) =>
    e.lineup.map((l, i) => ({
      entry_id: entryOf(e.event, e.team),
      event_id: eventId.get(e.event),
      person_id: personId.get(l.player),
      sort: i,
      role: n(l.role),
      captain: Boolean(l.captain),
    })),
  ),
);

await insert(
  "standings",
  events.flatMap((e) =>
    e.tables.flatMap((t) =>
      t.rows.map((r, i) => ({
        table_id: tableId.get(`${eventId.get(e.slug)}|${t.name}`),
        event_id: eventId.get(e.slug),
        entry_id: entryOf(e.slug, r.team),
        placement: r.placement,
        kills: r.kills,
        bonus: r.bonus ?? 0,
        wins: n(r.wins),
        matches: n(r.matches),
        move: n(r.move),
        sort: i,
      })),
    ),
  ),
);

await insert(
  "kill_rows",
  kills.map((k) => ({
    event_id: eventId.get(k.event),
    entry_id: entryOf(k.event, k.team),
    person_id: personId.get(k.player),
    kills: k.kills,
    matches: n(k.matches),
    grp: n(k.group),
  })),
);

await insert(
  "stories",
  stories.map((st) => ({
    slug: st.slug,
    title: st.title,
    category: st.category,
    published_on: st.date,
    status: "published",
    author_name: st.author.name,
    author_role: st.author.role,
    excerpt: st.excerpt,
    cover_url: st.cover.src,
    cover_alt: st.cover.alt,
    cover_width: st.cover.width,
    cover_height: st.cover.height,
    body: st.body,
  })),
  { onConflict: "slug" },
);

await insert(
  "staff",
  staff.map((m) => ({
    slug: m.slug,
    name: m.name,
    role: m.role,
    grp: m.group,
    country: n(m.country),
    photo_url: n(m.photo),
    socials: m.socials ?? {},
    sort: m.order,
    spotlight: n(m.spotlight),
  })),
  { onConflict: "slug" },
);

console.log("\nWritten.");
