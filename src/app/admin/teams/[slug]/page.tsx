import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EntryForm from "@/components/admin/EntryForm";
import MergeForm from "@/components/admin/MergeForm";
import TeamForm from "@/components/admin/TeamForm";
import { Icon } from "@/components/Icons";
import { removeEntry, saveEntry } from "@/lib/admin/actions/entries";
import { deleteTeam, mergeTeam, saveTeam } from "@/lib/admin/actions/teams";
import { currentSeason } from "@/lib/admin/events";
import { getEntry, getTeam, peopleIndex, playerOptions, rosterPlaces, teamsIndex } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

/**
 * One team: its squad in the current season first (tier, manager, roster, saved straight to
 * that season), then its name and logo, then every event it played, each roster kept as it was.
 */
async function Editor({ params, searchParams }: PageProps<"/admin/teams/[slug]">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const [team, season] = await Promise.all([getTeam(admin.token, slug), currentSeason(admin.token)]);
  if (!team) notFound();
  const [entry, teams, people, places] = await Promise.all([season ? getEntry(admin.token, season.id, slug) : undefined, teamsIndex(admin.token), peopleIndex(admin.token), season ? rosterPlaces(admin.token, season.id) : new Map()]);
  const others = teams.filter((t) => t.id !== team.id);
  const tiers = season?.format === "tiers" ? season.event_tables.filter((t) => t.tier !== null).length : 0;
  const back = `/admin/teams/${team.slug}`;
  const past = team.entries.filter((e) => e.event.id !== season?.id);

  return (
    <>
      <header className="ad-head ad-head--team">
        <div>
          <Link href={entry?.tier ? `/admin/teams?tier=${entry.tier}` : "/admin/teams"} className="ad-back">
            ← Teams
          </Link>
          <div className="ad-head__title">
            <span className="ad-row__crest ad-row__crest--lg" aria-hidden>
              {team.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                <img src={team.logo_url} alt="" />
              ) : (
                team.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <h1>{team.name}</h1>
          </div>
          <p>
            {season && (entry ? `${season.name}${entry.tier ? ` · Tier ${entry.tier}` : " · no tier yet"} · ${entry.entry_players.length} players` : `Not in ${season.name}`)}
            {team.archived_at && " · Archived"}
          </p>
        </div>
        <a href={`/teams/${team.slug}`} target="_blank" rel="noreferrer" className="ad-btn ad-btn--quiet">
          Open on the site
        </a>
      </header>

      {query.removed && (
        <p className="ad-alert ad-alert--ok" role="status">
          Removed from {season?.name}. Their past events are unchanged.
        </p>
      )}

      {season && (
        <EntryForm
          key={entry?.id ?? "new"}
          action={saveEntry.bind(null, season.slug, season.id, entry?.id ?? null)}
          eventSort={season.sort_order}
          tiers={tiers}
          teams={[]}
          people={playerOptions(people, places, entry?.id)}
          fixedTeam={team.id}
          back={back}
          title={entry ? `In ${season.name}` : `Add to ${season.name}`}
          entry={
            entry && {
              team: entry.team_id,
              tier: entry.tier,
              manager: entry.manager,
              tag: entry.team_tag,
              players: entry.entry_players.map((p) => ({ value: p.person_id, label: p.person.name, role: p.role ?? "", captain: p.captain })),
            }
          }
          saved={Boolean(query.saved)}
        />
      )}

      <TeamForm
        kind="team"
        action={saveTeam.bind(null, team.id)}
        values={{ name: team.name, slug: team.slug, tag: team.tag, clan: team.clan, image: team.logo_url, archived: Boolean(team.archived_at) }}
      />

      <section className="ad-section">
        <header>
          <h2>Where they&apos;ve played</h2>
          <p>Each event keeps the roster that played it, so past events show their own squad on the site. Open one to correct it.</p>
        </header>
        {past.length ? (
          <ul className="ad-rows">
            {past.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/events/${e.event.slug}/squads/${team.slug}`} className="ad-row ad-row--flat">
                  <span className="ad-row__main">
                    <strong>{e.event.name}</strong>
                    <span>
                      {e.tier ? `Tier ${e.tier} · ` : ""}
                      {e.entry_players[0]?.count ?? 0} players
                    </span>
                  </span>
                  <Icon name="chevron" size={16} className="ad-row__go" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ad-note">{entry ? `${season?.name} is their first event.` : "Not registered for any event yet."}</p>
        )}
      </section>

      <section className="ad-danger">
        <header>
          <h2>Remove or merge</h2>
          <p>Merging moves every registration, result and kill row to the other team, keeps this name as an alias, then deletes this one.</p>
        </header>
        {entry && season && (
          <ActionForm
            action={async () => {
              "use server";
              return removeEntry(season.slug, entry.id, back);
            }}
            submit={`Remove from ${season.name}`}
            pending="Removing…"
            tone="danger"
            confirm={`Remove ${team.name} from ${season.name}? Only possible while they have no results there. The team and its past events stay.`}
          />
        )}
        <MergeForm action={mergeTeam.bind(null, team.id)} options={others.map((t) => ({ value: t.id, label: t.name, sub: t.tag ?? undefined }))} noun="team" />
        {team.entries.length === 0 && (
          <ActionForm
            action={async () => {
              "use server";
              await deleteTeam(team.id);
              return {};
            }}
            submit="Delete team"
            pending="Deleting…"
            tone="danger"
            confirm={`Delete ${team.name}? It has no registrations, so nothing else is affected.`}
          />
        )}
      </section>
    </>
  );
}

export default function TeamAdminPage(props: PageProps<"/admin/teams/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Teams">
        <Suspense fallback={<AdminLoading />}>
          <Editor {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
