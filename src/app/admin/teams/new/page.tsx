import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EntryForm from "@/components/admin/EntryForm";
import { league } from "@/content/site";
import { saveTeamRoster } from "@/lib/admin/actions/teams";
import { peopleIndex, playerOptions, teamPlaces, teamsIndex } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

/**
 * Adding a team: its name, current tier, manager and roster, owned by the team. It joins an
 * event when it's locked in on that event's Squads tab. Logo and clan go on the team's page.
 */
async function AddTeam() {
  const admin = await requireAdmin();
  const [teams, people, places] = await Promise.all([teamsIndex(admin.token), peopleIndex(admin.token), teamPlaces(admin.token)]);
  return (
    <EntryForm
      action={saveTeamRoster.bind(null, null)}
      tiers={league.tiers}
      teams={teams.map((t) => ({ value: t.id, label: t.name, sub: t.tag ?? undefined }))}
      people={playerOptions(people, places)}
      title="Team"
      lede="Type the team's name. A team already on record shows up to pick, so you don't add it twice. Its tier is where it plays now; any number of teams can be in a tier."
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
