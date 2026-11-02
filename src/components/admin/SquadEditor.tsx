import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "./ActionForm";
import EntryForm from "./EntryForm";
import { removeEntry, saveEntry } from "@/lib/admin/actions/entries";
import { getEvent } from "@/lib/admin/events";
import { getEntry, peopleIndex, playerOptions, rosterPlaces, teamsIndex } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/admin/supabase";

/** Shared by "Add team" (no team in the address) and editing a team's registration for an event. */
export default async function SquadEditor({ slug, team, saved }: { slug: string; team?: string; saved?: boolean }) {
  const admin = await requireAdmin();
  const event = await getEvent(admin.token, slug);
  if (!event) notFound();
  const [entry, teams, people, places, registered] = await Promise.all([team ? getEntry(admin.token, event.id, team) : undefined, teamsIndex(admin.token), peopleIndex(admin.token), rosterPlaces(admin.token, event.id), db<{ team_id: string }[]>(admin.token, `entries?event_id=eq.${event.id}&select=team_id`)]);
  if (team && !entry) notFound();
  // Teams already in the event can't be added twice.
  const inEvent = new Set(registered.map((r) => r.team_id));
  const tiers = event.format === "tiers" ? event.event_tables.filter((t) => t.tier !== null).length : 0;

  return (
    <>
      <header className="ad-head">
        <div>
          <Link href={`/admin/events/${slug}/squads`} className="ad-back">
            ← {event.name} squads
          </Link>
          <h1>{entry ? entry.team.name : "Add team"}</h1>
          <p>{entry ? `${event.name}${entry.tier ? ` · Tier ${entry.tier}` : ""}` : `For ${event.name}.`}</p>
        </div>
        {entry && (
          <Link href={`/admin/teams/${entry.team.slug}`} className="ad-btn ad-btn--quiet">
            Team details
          </Link>
        )}
      </header>
      <EntryForm
        action={saveEntry.bind(null, slug, event.id, entry?.id ?? null)}
        eventSort={event.sort_order}
        tiers={tiers}
        teams={teams.filter((t) => !inEvent.has(t.id)).map((t) => ({ value: t.id, label: t.name, sub: t.tag ?? undefined }))}
        people={playerOptions(people, places, entry?.id)}
        entry={
          entry && {
            team: entry.team_id,
            tier: entry.tier,
            manager: entry.manager,
            tag: entry.team_tag,
            players: entry.entry_players.map((p) => ({ value: p.person_id, label: p.person.name, role: p.role ?? "", captain: p.captain })),
          }
        }
        saved={saved}
      />
      {entry && (
        <section className="ad-danger">
          <header>
            <h2>Remove from {event.name}</h2>
            <p>Takes the squad out of this event, with its standings and kill rows here. The team and its players stay on record.</p>
          </header>
          <ActionForm action={async () => {
            "use server";
            return removeEntry(slug, entry.id);
          }} submit="Remove squad" pending="Removing…" tone="danger" confirm={`Remove ${entry.team.name} from ${event.name}?`} />
        </section>
      )}
    </>
  );
}

