import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { removeEvent, saveEvent } from "@/app/admin/actions";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import DeleteEvent from "@/components/admin/DeleteEvent";
import EventForm from "@/components/admin/EventForm";
import { league } from "@/content/site";
import { getEvent } from "@/lib/admin/events";
import { requireAdmin } from "@/lib/admin/session";

async function Editor({ params, searchParams }: PageProps<"/admin/events/[slug]">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const event = await getEvent(admin.token, slug);
  if (!event) notFound();
  const { event_tables: tables, entries, ...row } = event;
  const tierTables = tables.filter((t) => t.tier !== null).length;
  const results = tables.reduce((n, t) => n + (t.standings[0]?.count ?? 0), 0);

  return (
    <>
      <header className="ad-head">
        <div>
          <Link href="/admin" className="ad-back">
            ← Events
          </Link>
          <h1>{event.name}</h1>
          <p>
            {tables.length} {tables.length === 1 ? "table" : "tables"} · {results} result rows
          </p>
        </div>
        <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className="ad-btn ad-btn--quiet">
          Open event page
        </a>
      </header>
      <EventForm action={saveEvent.bind(null, event.id)} event={row} tiers={tierTables || league.tiers} saved={Boolean(query.saved)} />
      <DeleteEvent action={removeEvent.bind(null, event.id)} name={event.name} squads={entries[0]?.count ?? 0} />
    </>
  );
}

export default function EditEventPage(props: PageProps<"/admin/events/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Events">
        <Suspense fallback={<AdminLoading />}>
          <Editor {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
