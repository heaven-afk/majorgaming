import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import MergeForm from "@/components/admin/MergeForm";
import TeamForm from "@/components/admin/TeamForm";
import { deletePerson, mergePerson, savePerson } from "@/lib/admin/actions/teams";
import { countryCodes } from "@/lib/admin/countries";
import { getPerson, peopleIndex } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

async function Editor({ params, searchParams }: PageProps<"/admin/people/[slug]">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const person = await getPerson(admin.token, slug);
  if (!person) notFound();
  const others = (await peopleIndex(admin.token)).filter((p) => p.id !== person.id);
  const killsBy = new Map(person.kill_rows.map((k) => [k.entry.event.id, k.kills]));

  return (
    <>
      <header className="ad-head">
        <div>
          <Link href="/admin/people" className="ad-back">
            ← Players
          </Link>
          <h1>{person.name}</h1>
          <p>
            {person.entry_players.length} {person.entry_players.length === 1 ? "event" : "events"} on record
          </p>
        </div>
      </header>
      <TeamForm
        kind="person"
        action={savePerson.bind(null, person.id)}
        values={{ name: person.name, slug: person.slug, ign: person.ign, country: person.country, image: person.photo_url, archived: Boolean(person.archived_at) }}
        countries={countryCodes}
        saved={Boolean(query.saved)}
      />

      <section className="ad-section">
        <header>
          <h2>Squads</h2>
          <p>Where they&apos;ve played. Change a roster from the squad&apos;s page.</p>
        </header>
        {person.entry_players.length ? (
          <ul className="ad-rows">
            {person.entry_players.map((p) => (
              <li key={p.entry.event.id}>
                <Link href={`/admin/events/${p.entry.event.slug}/squads/${p.entry.team.slug}`} className="ad-row ad-row--flat">
                  <span className="ad-row__main">
                    <strong>
                      {p.entry.team_name}
                      {p.captain && <small className="ad-row__tag">Captain</small>}
                    </strong>
                    <span>
                      {p.entry.event.name}
                      {p.entry.tier ? ` · Tier ${p.entry.tier}` : ""}
                      {killsBy.has(p.entry.event.id) ? ` · ${killsBy.get(p.entry.event.id)} kills` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ad-note">Not on any roster yet.</p>
        )}
      </section>

      <section className="ad-danger">
        <header>
          <h2>Duplicate of another player?</h2>
          <p>Merging moves their roster places, kill rows and managed squads to the other player, keeps this name as an alias, then deletes this one.</p>
        </header>
        <MergeForm action={mergePerson.bind(null, person.id)} options={others.map((p) => ({ value: p.id, label: p.name, sub: p.ign ?? undefined }))} noun="player" />
        {person.entry_players.length === 0 && person.kill_rows.length === 0 && (
          <ActionForm
            action={async () => {
              "use server";
              await deletePerson(person.id);
              return {};
            }}
            submit="Delete player"
            pending="Deleting…"
            tone="danger"
            confirm={`Delete ${person.name}?`}
          />
        )}
      </section>
    </>
  );
}

export default function PersonAdminPage(props: PageProps<"/admin/people/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Players">
        <Suspense fallback={<AdminLoading />}>
          <Editor {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
