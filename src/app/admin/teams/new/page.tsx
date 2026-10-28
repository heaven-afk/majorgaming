import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EntryForm from "@/components/admin/EntryForm";
import TeamForm from "@/components/admin/TeamForm";
import { saveEntry } from "@/lib/admin/actions/entries";
import { saveTeam } from "@/lib/admin/actions/teams";
import { currentSeason } from "@/lib/admin/events";
import { peopleIndex, playerOptions, rosterPlaces, teamsIndex } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/admin/supabase";

/**
 * Adding a team puts it straight into the current season: name, tier, manager and roster in one
 * form. Logo and clan are set on the team's page afterwards. Without a season it's just the team.
 */
async function AddTeam() {
  const admin = await requireAdmin();
  const season = await currentSeason(admin.token);
  if (!season) return <TeamForm kind="team" action={saveTeam.bind(null, null)} />;
  const [teams, people, places, registered] = await Promise.all([
    teamsIndex(admin.token),
    peopleIndex(admin.token),
    rosterPlaces(admin.token, season.id),
    db<{ team_id: string }[]>(admin.token, `entries?event_id=eq.${season.id}&select=team_id`),
  ]);
  const inSeason = new Set(registered.map((r) => r.team_id));
  const tiers = season.format === "tiers" ? season.event_tables.filter((t) => t.tier !== null).length : 0;
  return (
    <EntryForm
      action={saveEntry.bind(null, season.slug, season.id, null)}
      eventSort={season.sort_order}
      tiers={tiers}
      teams={teams.filter((t) => !inSeason.has(t.id)).map((t) => ({ value: t.id, label: t.name, sub: t.tag ?? undefined }))}
      people={playerOptions(people, places)}
      back="team"
      title={`Team in ${season.name}`}
    />
  );
}

export default function NewTeamPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Teams">
        <header className="ad-head">
          <div>
            <Link href="/admin/teams" className="ad-back">
              ← Teams
            </Link>
            <h1>Add team</h1>
            <p>Its name, tier, manager and roster. Add the logo on the team&apos;s page after saving.</p>
          </div>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <AddTeam />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
