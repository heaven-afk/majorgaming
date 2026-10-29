import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EventTabs from "@/components/admin/EventTabs";
import LineupForm, { type LineupRow } from "@/components/admin/LineupForm";
import { Icon } from "@/components/Icons";
import { league } from "@/content/site";
import { lockLineup } from "@/lib/admin/actions/entries";
import { getEvent, listEvents } from "@/lib/admin/events";
import { listEntries, listTeams, type EntryRow } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

/** One registered squad. Finished events often have no rosters on record (the sheets never had them), so only current ones flag it. */
function SquadRow({ e, slug, past }: { e: EntryRow; slug: string; past: boolean }) {
  const captain = e.entry_players.find((p) => p.captain);
  return (
    <li>
      <Link href={`/admin/events/${slug}/squads/${e.team.slug}`} className="ad-row">
        <span className="ad-row__crest" aria-hidden>
          {e.team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
            <img src={e.team.logo_url} alt="" />
          ) : (
            e.team.name.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="ad-row__main">
          <strong>{e.team.name}</strong>
          <span>
            {e.entry_players.length ? `${e.entry_players.length} ${e.entry_players.length === 1 ? "player" : "players"}` : past ? "Roster not on record" : "No players yet"}
            {captain && ` · Captain ${captain.person.name}`}
            {e.manager && ` · Manager ${e.manager}`}
          </span>
        </span>
        {e.entry_players.length === 0 && !past && (
          <span className="ad-chip" data-tone="upcoming">
            No roster
          </span>
        )}
        <Icon name="chevron" size={16} className="ad-row__go" />
      </Link>
    </li>
  );
}

async function Squads({ params, searchParams }: PageProps<"/admin/events/[slug]/squads">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const event = await getEvent(admin.token, slug);
  if (!event) notFound();
  const open = event.status !== "final";
  const [entries, events, teams] = await Promise.all([listEntries(admin.token, event.id), listEvents(admin.token), open ? listTeams(admin.token) : Promise.resolve([])]);
  const maxTier = event.format === "tiers" ? event.event_tables.filter((t) => t.tier !== null).length : 0;
  const ranked = event.kind === "season";

  const byTier = new Map<number | null, EntryRow[]>();
  for (const e of entries) byTier.set(e.tier, [...(byTier.get(e.tier) ?? []), e]);
  const groups = [...byTier].sort(([a], [b]) => (a ?? 99) - (b ?? 99));

  // Upcoming or live: every team, ticked to lock it in. A new ranked season starts with last
  // season's teams ticked, each in its current tier.
  const last = ranked ? events.find((e) => e.kind === "season" && e.sort_order > event.sort_order && (e.entries[0]?.count ?? 0) > 0) : undefined;
  const lastTier = new Map(teams.flatMap((t) => t.entries.filter((x) => x.event.id === last?.id).map((x) => [t.id, x.tier] as const)));
  const registered = new Map(entries.map((e) => [e.team_id, e]));
  const rows: LineupRow[] = teams
    .filter((t) => !t.archived_at || registered.has(t.id))
    .map((t) => {
      const entry = registered.get(t.id);
      const tier = entry ? entry.tier : ranked && t.tier && t.tier <= maxTier ? t.tier : null;
      const played = lastTier.has(t.id);
      const newest = [...t.entries].sort((a, b) => a.event.sort_order - b.event.sort_order)[0];
      return {
        teamId: t.id,
        name: t.name,
        tag: t.tag,
        logo: t.logo_url,
        players: entry ? entry.entry_players.length : t.team_players.length,
        note: last ? (played ? `Played ${last.name}${lastTier.get(t.id) ? `, Tier ${lastTier.get(t.id)}` : ""}` : `Not in ${last.name}`) : newest ? `Last played ${newest.event.name}` : "No events yet",
        tier,
        checked: Boolean(entry) || (entries.length === 0 && played),
        registered: Boolean(entry),
      };
    });

  return (
    <>
      <EventTabs event={event} active="Teams">
        {!open && (
          <Link href={`/admin/events/${slug}/squads/new`} className="ad-btn ad-btn--primary">
            <Icon name="plus" size={16} /> Add team
          </Link>
        )}
      </EventTabs>

      {query.removed && (
        <p className="ad-alert ad-alert--ok" role="status">
          Team taken out of the event.
        </p>
      )}

      {open ? (
        <>
          <p className="ad-lede">
            Tick every team taking part{maxTier ? `, up to ${league.squadsPerTier} in each tier` : ""}, then save. Each team brings the roster on its team page, and keeps following it until the event is finished.
            {entries.length === 0 && last ? ` Teams from ${last.name} start ticked.` : ""}
          </p>
          <LineupForm action={lockLineup.bind(null, slug, event.id)} tiers={maxTier} cap={league.squadsPerTier} rows={rows} ranked={ranked} />
        </>
      ) : entries.length === 0 ? (
        <p className="ad-empty">No teams on record for this event.</p>
      ) : (
        <p className="ad-lede">This event is finished, so its teams are kept as they played. Open one to correct its roster.</p>
      )}
      {!open &&
        entries.length > 0 &&
        groups.map(([tier, list]) => (
          <section key={tier ?? "none"} className="ad-group">
            <h2>
              {tier ? `Tier ${tier}` : maxTier ? "No tier yet" : "Teams"} <small>{list.length}</small>
            </h2>
            <ul className="ad-rows">
              {list.map((e) => (
                <SquadRow key={e.id} e={e} slug={slug} past />
              ))}
            </ul>
          </section>
        ))}
    </>
  );
}

export default function SquadsPage(props: PageProps<"/admin/events/[slug]/squads">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Events">
        <Suspense fallback={<AdminLoading />}>
          <Squads {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
