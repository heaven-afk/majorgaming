import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EntryForm from "@/components/admin/EntryForm";
import MergeForm from "@/components/admin/MergeForm";
import TeamForm from "@/components/admin/TeamForm";
import { Icon } from "@/components/Icons";
import { league } from "@/content/site";
import { deleteTeam, mergeTeam, saveTeam, saveTeamRoster } from "@/lib/admin/actions/teams";
import { getTeam, peopleIndex, playerOptions, teamPlaces, teamsIndex } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

/**
 * One team: what it is now (tier, manager, roster, owned by the team with no season involved),
 * then its name and logo, then every event it played, each keeping the roster that played it.
 */
async function Editor({ params, searchParams }: PageProps<"/admin/teams/[slug]">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const team = await getTeam(admin.token, slug);
  if (!team) notFound();
  const [teams, people, places] = await Promise.all([teamsIndex(admin.token), peopleIndex(admin.token), teamPlaces(admin.token)]);
  const others = teams.filter((t) => t.id !== team.id);
  const past = team.entries;

  return (
    <>
      <header className="ad-head ad-head--team">
        <div>
          <Link href={team.tier ? `/admin/teams?tier=${team.tier}` : "/admin/teams?tier=none"} className="ad-back">
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
            {team.tier ? `Tier ${team.tier}` : "No tier"} · {team.team_players.length} {team.team_players.length === 1 ? "player" : "players"}
            {team.archived_at && " · Archived"}
          </p>
        </div>
        <a href={`/teams/${team.slug}`} target="_blank" rel="noreferrer" className="ad-btn ad-btn--quiet">
          Open on the site
        </a>
      </header>

      <EntryForm
        key={team.id}
        action={saveTeamRoster.bind(null, team.id)}
        tiers={league.tiers}
        teams={[]}
        people={playerOptions(people, places, team.id)}
        fixedTeam={team.id}
        title="Tier and manager"
        lede="Where the team plays now and who runs it. Upcoming and live events follow any change here; finished events keep the roster that played them."
        submit="Save changes"
        entry={{
          team: team.id,
          tier: team.tier,
          manager: team.manager,
          tag: team.tag,
          players: team.team_players.map((p) => ({ value: p.person_id, label: p.person.name, role: p.role ?? "", captain: p.captain })),
        }}
        saved={Boolean(query.saved)}
      />

      <TeamForm
        kind="team"
        action={saveTeam.bind(null, team.id)}
        values={{ name: team.name, slug: team.slug, tag: team.tag, clan: team.clan, image: team.logo_url, archived: Boolean(team.archived_at) }}
      />

      <section className="ad-section">
        <header>
          <h2>Where they&apos;ve played</h2>
          <p>Each event keeps the roster that played it. Open one to correct it.</p>
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
          <p className="ad-note">Not in any event yet. Add them from an event&apos;s Teams tab.</p>
        )}
      </section>

      <section className="ad-danger">
        <header>
          <h2>Remove or merge</h2>
          <p>Merging moves every registration, result and kill row to the other team, keeps this name as an alias, then deletes this one.</p>
        </header>
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
