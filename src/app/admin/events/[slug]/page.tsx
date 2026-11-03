import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { removeEvent, saveEvent } from "@/app/admin/actions";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import DeleteEvent from "@/components/admin/DeleteEvent";
import EventForm from "@/components/admin/EventForm";
import EventTabs from "@/components/admin/EventTabs";
import { Icon } from "@/components/Icons";
import { league } from "@/content/site";
import { getEvent } from "@/lib/admin/events";
import { requireAdmin } from "@/lib/admin/session";

async function Editor({ params, searchParams }: PageProps<"/admin/events/[slug]">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const event = await getEvent(admin.token, slug);
  if (!event) notFound();
  const { event_tables: tables, entries, ...row } = event;
  const tierTables = tables.filter((t) => t.tier !== null).length;

  return (
    <>
      <EventTabs event={event} active="Details">
        <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className="ad-btn ad-btn--quiet">
          View on the site
        </a>
      </EventTabs>
      {query.created && (
        <section className="ad-next" role="status">
          <h2>
            <Icon name="check" size={16} /> {event.name} is created
          </h2>
          <ol>
            <li>
              <span>
                Pick the teams taking part
                <small>{event.kind === "season" ? "Last season's teams start ticked, each in its tier." : "Tick the teams that registered."}</small>
              </span>
              <Link href={`/admin/events/${event.slug}/squads`} className="ad-btn ad-btn--primary">
                Pick teams
              </Link>
            </li>
            <li>
              <span>
                Set up registration and the event page
                <small>Dates, register link, poster and write-up, further down this page.</small>
              </span>
            </li>
            <li>
              <span>
                Upload results once matches are played
                <small>On the Results tab, a sheet per tier or one for every tier.</small>
              </span>
            </li>
          </ol>
        </section>
      )}
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
