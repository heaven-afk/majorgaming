import Link from "next/link";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icons";
import { league } from "@/content/site";
import { removeEntry } from "@/lib/admin/actions/entries";
import { deleteTeam } from "@/lib/admin/actions/teams";
import { key } from "@/lib/admin/columns";
import { currentSeason } from "@/lib/admin/events";
import { listEntries, listTeams } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/admin/supabase";

/** One line of the list: a squad in the season, or a team on record. */
type Row = {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  logo: string | null;
  players?: number;
  captain?: string;
  manager?: string | null;
  /** Other teams: the last event they played. */
  last?: string;
  /** A remove or delete button, only where nothing would be lost. */
  remove?: { label: string; confirm: string; action: () => Promise<{ error?: string }> };
};

function Crest({ name, logo }: { name: string; logo: string | null }) {
  return (
    <span className="ad-row__crest" aria-hidden>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
        <img src={logo} alt="" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

/**
 * Teams as a table on wide screens (team, players, captain, manager, actions) and as cards with
 * the same buttons on phones. Opening a team edits its roster, tier, manager, name and logo.
 */
function TeamTable({ rows, kind, empty }: { rows: Row[]; kind: "squads" | "teams"; empty: string }) {
  if (!rows.length) return <p className="ad-empty">{empty}</p>;
  return (
    <div className="ad-ttable" data-kind={kind}>
      <div className="ad-ttable__head" aria-hidden>
        <span>Team</span>
        {kind === "squads" ? (
          <>
            <span>Players</span>
            <span>Captain</span>
            <span>Manager</span>
          </>
        ) : (
          <span>Last played</span>
        )}
        <span />
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.id} className="ad-ttable__row">
            <Link href={`/admin/teams/${r.slug}`} className="ad-ttable__team">
              <Crest name={r.name} logo={r.logo} />
              <span>
                <strong>{r.name}</strong>
                {r.tag && <small className="ad-row__tag">{r.tag}</small>}
              </span>
            </Link>
            {kind === "squads" ? (
              <>
                <span className="ad-ttable__cell" data-label="Players">
                  {r.players ? (
                    r.players
                  ) : (
                    <span className="ad-chip" data-tone="upcoming">
                      No roster
                    </span>
                  )}
                </span>
                <span className="ad-ttable__cell" data-label="Captain">
                  {r.captain ?? <span className="ad-ttable__none">–</span>}
                </span>
                <span className="ad-ttable__cell" data-label="Manager">
                  {r.manager ?? <span className="ad-ttable__none">–</span>}
                </span>
              </>
            ) : (
              <span className="ad-ttable__cell" data-label="Last played">
                {r.last ?? <span className="ad-ttable__none">No events yet</span>}
              </span>
            )}
            <span className="ad-ttable__actions">
              <Link href={`/admin/teams/${r.slug}`} className="ad-btn ad-btn--quiet">
                Edit
              </Link>
              {r.remove && <ActionForm action={r.remove.action} submit={r.remove.label} pending="…" tone="quiet" confirm={r.remove.confirm} className="ad-ttable__remove" />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Teams({ searchParams }: { searchParams: PageProps<"/admin/teams">["searchParams"] }) {
  const [admin, query] = await Promise.all([requireAdmin(), searchParams]);
  const [season, teams] = await Promise.all([currentSeason(admin.token), listTeams(admin.token)]);
  const [entries, withResults] = season
    ? await Promise.all([
        listEntries(admin.token, season.id),
        db<{ id: string; standings: { count: number }[]; kill_rows: { count: number }[] }[]>(admin.token, `entries?event_id=eq.${season.id}&select=id,standings(count),kill_rows(count)&kill_rows.or=(kills.gt.0,matches.gt.0)`),
      ])
    : [[], []];
  const played = new Set(withResults.filter((r) => (r.standings[0]?.count ?? 0) + (r.kill_rows[0]?.count ?? 0) > 0).map((r) => r.id));

  const q = typeof query.q === "string" ? query.q.trim() : "";
  const tiers = season?.event_tables.filter((t) => t.tier !== null).map((t) => t.tier!) ?? [];
  const inSeason = new Set(entries.map((e) => e.team_id));
  const others = teams.filter((t) => !t.archived_at && !inSeason.has(t.id));
  const archived = teams.filter((t) => t.archived_at);
  const tab = typeof query.tier === "string" ? query.tier : String(tiers[0] ?? "other");

  const teamRow = (t: (typeof teams)[number]): Row => {
    const last = [...t.entries].sort((a, b) => a.event.sort_order - b.event.sort_order)[0];
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      tag: t.tag,
      logo: t.logo_url,
      last: last ? `${last.event.name}${last.tier ? `, Tier ${last.tier}` : ""}` : undefined,
      // A team with no events at all has nothing to lose.
      remove: t.entries.length
        ? undefined
        : {
            label: "Delete",
            confirm: `Delete ${t.name}? It has played no events, so nothing else is affected.`,
            action: async () => {
              "use server";
              await deleteTeam(t.id);
              return {};
            },
          },
    };
  };
  const squadRow = (e: (typeof entries)[number]): Row => ({
    id: e.id,
    slug: e.team.slug,
    name: e.team.name,
    tag: e.team.tag,
    logo: e.team.logo_url,
    players: e.entry_players.length,
    captain: e.entry_players.find((p) => p.captain)?.person.name,
    manager: e.manager,
    // Squads with results stay: removing them would delete their standings and kills.
    remove:
      season && !played.has(e.id)
        ? {
            label: "Remove",
            confirm: `Remove ${e.team.name} from ${season.name}? They have no results there yet. The team and its past events stay.`,
            action: async () => {
              "use server";
              return removeEntry(season.slug, e.id, `/admin/teams?tier=${e.tier ?? "none"}`);
            },
          }
        : undefined,
  });

  // A search looks across every team, whatever the tab.
  if (q) {
    const k = key(q);
    const found = teams.filter((t) => key(t.name).includes(k) || (t.tag && key(t.tag).includes(k)));
    return (
      <>
        <Search q={q} />
        <p className="ad-note ad-count">
          {found.length} {found.length === 1 ? "team" : "teams"} matching “{q}” ·{" "}
          <Link className="ad-link" href="/admin/teams">
            Clear
          </Link>
        </p>
        <TeamTable rows={found.map(teamRow)} kind="teams" empty="No teams match. Check the spelling, or add the team." />
      </>
    );
  }

  const tierList = (tier: number) => entries.filter((e) => e.tier === tier);
  const noTier = entries.filter((e) => e.tier === null);
  const list = tab === "other" ? others : tab === "archived" ? archived : null;
  const tierNumber = Number(tab);
  const current = list || tab === "none" ? null : tierList(tierNumber);
  const over = current ? current.length - league.squadsPerTier : 0;

  return (
    <>
      {query.deleted && (
        <p className="ad-alert ad-alert--ok" role="status">
          Team deleted.
        </p>
      )}
      {query.removed && (
        <p className="ad-alert ad-alert--ok" role="status">
          Squad removed from {season?.name}. The team and its past events are unchanged.
        </p>
      )}
      <Search q="" />
      <nav className="ad-tiers" aria-label="Tiers">
        {tiers.map((t) => {
          const n = tierList(t).length;
          return (
            <Link key={t} href={`/admin/teams?tier=${t}`} aria-current={tab === String(t) ? "page" : undefined} scroll={false}>
              <strong>Tier {t}</strong>
              <small data-tone={n > league.squadsPerTier ? "amber" : undefined}>
                {n} / {league.squadsPerTier}
              </small>
            </Link>
          );
        })}
        {noTier.length > 0 && (
          <Link href="/admin/teams?tier=none" aria-current={tab === "none" ? "page" : undefined} scroll={false}>
            <strong>No tier</strong>
            <small data-tone="amber">{noTier.length}</small>
          </Link>
        )}
        <Link href="/admin/teams?tier=other" aria-current={tab === "other" ? "page" : undefined} scroll={false}>
          <strong>Other teams</strong>
          <small>{others.length}</small>
        </Link>
        {archived.length > 0 && (
          <Link href="/admin/teams?tier=archived" aria-current={tab === "archived" ? "page" : undefined} scroll={false}>
            <strong>Archived</strong>
            <small>{archived.length}</small>
          </Link>
        )}
      </nav>

      {tab === "none" ? (
        <>
          <p className="ad-alert ad-alert--warn">These squads are in {season?.name} without a tier. Edit each one and pick its tier.</p>
          <TeamTable rows={noTier.map(squadRow)} kind="squads" empty="" />
        </>
      ) : list ? (
        <>
          <p className="ad-note ad-count">{tab === "other" ? `Teams not in ${season?.name ?? "the current season"}: special-event squads and teams from earlier seasons. Their past results stay on the site.` : "Hidden from the site's Teams page and from pickers. Past results stay."}</p>
          <TeamTable rows={list.map(teamRow)} kind="teams" empty={tab === "other" ? "Every team is in the current season." : "No archived teams."} />
        </>
      ) : (
        <>
          {over > 0 && (
            <p className="ad-alert ad-alert--warn" role="status">
              <Icon name="warning" size={14} /> Tier {tierNumber} has {current!.length} squads, {over} more than a full tier. Move the extra squads to another tier from their team page.
            </p>
          )}
          <TeamTable rows={current!.map(squadRow)} kind="squads" empty={`No teams in Tier ${tierNumber} yet. Add one, or bring squads over from the last season under Events → Squads.`} />
        </>
      )}
    </>
  );
}

function Search({ q }: { q: string }) {
  return (
    <form className="ad-search" action="/admin/teams">
      <input type="search" name="q" defaultValue={q} placeholder="Search every team by name or tag" aria-label="Search teams" />
      <button className="ad-btn ad-btn--quiet">Search</button>
    </form>
  );
}

async function Head() {
  const admin = await requireAdmin();
  const season = await currentSeason(admin.token);
  return (
    <header className="ad-head">
      <div>
        <h1>Teams</h1>
        <p>{season ? `${season.name} teams, by tier. Edit a team to change its roster, manager, tier or name.` : "Every team on record."}</p>
      </div>
      <div className="ad-head__actions">
        <Link href="/admin/teams/new" className="ad-btn ad-btn--primary">
          <Icon name="plus" size={16} /> Add team
        </Link>
      </div>
    </header>
  );
}

export default function TeamsAdmin(props: PageProps<"/admin/teams">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Teams">
        <Suspense fallback={<AdminLoading />}>
          <Head />
          <Teams searchParams={props.searchParams} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
