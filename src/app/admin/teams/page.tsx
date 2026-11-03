import Link from "next/link";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icons";
import { league } from "@/content/site";
import { deleteTeam } from "@/lib/admin/actions/teams";
import { key } from "@/lib/admin/columns";
import { listTeams } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

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
  const teams = await listTeams(admin.token);
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const tab = typeof query.tier === "string" ? query.tier : "1";

  const row = (t: (typeof teams)[number]): Row => {
    const last = [...t.entries].sort((a, b) => a.event.sort_order - b.event.sort_order)[0];
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      tag: t.tag,
      logo: t.logo_url,
      players: t.team_players.length,
      captain: t.team_players.find((p) => p.captain)?.person.name,
      manager: t.manager,
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
        <TeamTable rows={found.map(row)} kind="squads" empty="No teams match. Check the spelling, or add the team." />
      </>
    );
  }

  const active = teams.filter((t) => !t.archived_at);
  const inTier = (tier: number) => active.filter((t) => t.tier === tier);
  const noTier = active.filter((t) => !t.tier);
  const archived = teams.filter((t) => t.archived_at);
  const tiers = Array.from({ length: league.tiers }, (_, i) => i + 1);
  const list = tab === "none" ? noTier : tab === "archived" ? archived : inTier(Number(tab));

  return (
    <>
      {query.deleted && (
        <p className="ad-alert ad-alert--ok" role="status">
          Team deleted.
        </p>
      )}
      <Search q="" />
      <nav className="ad-tiers" aria-label="Tiers">
        {tiers.map((t) => (
          <Link key={t} href={`/admin/teams?tier=${t}`} aria-current={tab === String(t) ? "page" : undefined} scroll={false}>
            <strong>Tier {t}</strong>
            <small>{inTier(t).length} teams</small>
          </Link>
        ))}
        <Link href="/admin/teams?tier=none" aria-current={tab === "none" ? "page" : undefined} scroll={false}>
          <strong>No tier</strong>
          <small>{noTier.length} teams</small>
        </Link>
        {archived.length > 0 && (
          <Link href="/admin/teams?tier=archived" aria-current={tab === "archived" ? "page" : undefined} scroll={false}>
            <strong>Archived</strong>
            <small>{archived.length}</small>
          </Link>
        )}
      </nav>
      <p className="ad-note ad-count">
        {tab === "none"
          ? "Teams with no current tier: teams from special events only, and teams that haven't played a ranked season lately. Give one a tier on its page."
          : tab === "archived"
            ? "Hidden from the site's Teams page and from pickers. Past results stay."
            : `Teams whose current tier is ${tab}. A tier can hold any number of teams; an event takes ${league.squadsPerTier} per tier, picked on its Teams tab.`}
      </p>
      <TeamTable rows={list.map(row)} kind="squads" empty={tab === "none" || tab === "archived" ? "None." : `No teams in Tier ${tab}. Add one, or give a team this tier on its page.`} />
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

function Head() {
  return (
    <header className="ad-head">
      <div>
        <h1>Teams</h1>
        <p>Every team, by its current tier. Edit a team to change its roster, manager, tier or name; events still to come follow.</p>
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
