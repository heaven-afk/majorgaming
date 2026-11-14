import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EventTabs from "@/components/admin/EventTabs";
import ResultsPanel, { AllTiersUpload } from "@/components/admin/ResultsPanel";
import IndexResultsPanel from "@/components/admin/IndexResultsPanel";
import { key } from "@/lib/admin/columns";
import { getEvent } from "@/lib/admin/events";
import { aliasesOf, historyOf, killsOf, listEntries, peopleIndex, standingsOf, teamsIndex } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

/** Every spelling a record answers to: its name, tag or in-game name, and its old names. */
function keysOf(id: string, names: (string | null | undefined)[], aliases: Map<string, string>) {
  const keys = names.filter((n): n is string => Boolean(n)).map(key).filter((k) => k.length > 1);
  for (const [alias, target] of aliases) if (target === id) keys.push(alias);
  return [...new Set(keys)];
}

async function Results({ params, searchParams }: PageProps<"/admin/events/[slug]/results">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const event = await getEvent(admin.token, slug);
  if (!event) notFound();
  const [entries, teams, people, teamAliases, personAliases, standings, kills, history] = await Promise.all([
    listEntries(admin.token, event.id),
    teamsIndex(admin.token),
    peopleIndex(admin.token),
    aliasesOf(admin.token, "team"),
    aliasesOf(admin.token, "person"),
    standingsOf(admin.token, event.id),
    killsOf(admin.token, event.id),
    historyOf(admin.token, event.id),
  ]);

  const tables = event.event_tables.map((t) => ({ id: t.id, name: t.name, tier: t.tier }));
  if (!tables.length) {
    return (
      <>
        <EventTabs event={event} active="Results" />
        <p className="ad-empty">
          This event has no tables yet. Set its format under{" "}
          <Link className="ad-link" href={`/admin/events/${slug}`}>
            Details
          </Link>
          .
        </p>
      </>
    );
  }
  const index = Math.min(Math.max(Number(query.tab) || 1, 1), tables.length) - 1;
  const table = tables[index];

  const uploadEntries = entries.map((e) => ({
    id: e.id,
    teamId: e.team_id,
    name: e.team.name,
    tier: e.tier,
    keys: keysOf(e.team_id, [e.team.name, e.team_name, e.team.tag, e.team_tag], teamAliases),
    // Players match on their pro name and its old spellings only: in-game names change.
    roster: e.entry_players.map((p) => ({ personId: p.person_id, name: p.person.name, keys: keysOf(p.person_id, [p.person.name], personAliases) })),
  }));
  const uploadTeams = teams.map((t) => ({ id: t.id, name: t.name, keys: keysOf(t.id, [t.name, t.tag], teamAliases) }));
  const uploadPeople = people.map((p) => ({ id: p.id, name: p.name, ign: p.ign, keys: keysOf(p.id, [p.name], personAliases) }));

  const entryById = new Map(entries.map((e) => [e.id, e]));
  const personName = new Map(entries.flatMap((e) => e.entry_players.map((p) => [p.person_id, p.person.name] as const)));
  const nameOf = new Map(people.map((p) => [p.id, p.name]));

  // This tab's rows: the table's standings, and the kill rows of squads in its tier.
  const tableRows = standings
    .filter((s) => s.table_id === table.id)
    .map((s) => ({ s, e: entryById.get(s.entry_id) }))
    .filter((x) => x.e)
    .map(({ s, e }) => ({ squad: e!.team.name, slug: e!.team.slug, placement: s.placement, kills: s.kills, bonus: s.bonus, matches: s.matches }));
  const inTab = (entryId: string) => table.tier === null || entryById.get(entryId)?.tier === table.tier;
  const killRows = kills
    .filter((k) => inTab(k.entry_id))
    .map((k) => ({ player: personName.get(k.person_id) ?? nameOf.get(k.person_id) ?? "Unknown player", squad: entryById.get(k.entry_id)?.team.name ?? "", kills: k.kills, matches: k.matches, group: k.grp }));
  // Kill versions from an all-tiers upload (no tier) show on every tab: putting one back restores every tier.
  const versions = history.rows.filter((v) => (v.kind === "standings" ? v.table_id === table.id : v.tier === table.tier || v.tier === null)).slice(0, 10);

  const squadsIn = (tier: number | null) => (tier === null ? entries.length : entries.filter((e) => e.tier === tier).length);

  return (
    <>
      <EventTabs event={event} active="Results" />
      <p className="ad-lede">
        Upload the standings (collation) sheet and the kill sheet {tables.length > 1 ? "for each tier " : ""}as they come in. You check every row before it saves; each upload replaces only what it covers, goes live within seconds, and can be undone.
      </p>

      {tables.length > 1 && <AllTiersUpload eventId={event.id} tables={tables} entries={uploadEntries} teams={uploadTeams} people={uploadPeople} />}

      {tables.length > 1 && (
        <nav className="ad-tiers" aria-label="Tables">
          {tables.map((t, i) => {
            const done = standings.some((s) => s.table_id === t.id);
            return (
              <Link key={t.id} href={`/admin/events/${slug}/results?tab=${i + 1}`} aria-current={i === index ? "page" : undefined} scroll={false}>
                <strong>{t.name}</strong>
                <small>
                  {squadsIn(t.tier)} teams · {done ? "uploaded" : "no results yet"}
                </small>
              </Link>
            );
          })}
        </nav>
      )}

      <Suspense key={table.id} fallback={<p>Loading Heaven Index connection…</p>}>
        <IndexResultsPanel event={event} table={table} token={admin.token} />
      </Suspense>
      <ResultsPanel
        key={table.id}
        eventId={event.id}
        tables={tables}
        table={table}
        entries={uploadEntries}
        teams={uploadTeams}
        people={uploadPeople}
        standings={tableRows}
        kills={killRows}
        versions={versions}
        undoReady={history.ready}
      />
    </>
  );
}

export default function ResultsPage(props: PageProps<"/admin/events/[slug]/results">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Events">
        <Suspense fallback={<AdminLoading />}>
          <Results {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
