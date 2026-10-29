import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icons";
import { adminCopy, registrationOptions, statusOptions } from "@/content/admin";
import { listEvents } from "@/lib/admin/events";
import { requireAdmin } from "@/lib/admin/session";
import { dateRange } from "@/lib/dates";

const copy = adminCopy.events;
const label = <T extends { value: string; label: string }>(options: readonly T[], value: string) => options.find((o) => o.value === value)?.label ?? value;

async function EventList({ searchParams }: { searchParams: PageProps<"/admin/events">["searchParams"] }) {
  const [admin, query] = await Promise.all([requireAdmin(), searchParams]);
  const events = await listEvents(admin.token);
  return (
    <>
      {query.deleted && (
        <p className="ad-alert ad-alert--ok" role="status">
          {copy.deleted}
        </p>
      )}
      {events.length === 0 ? (
        <p className="ad-empty">{copy.empty}</p>
      ) : (
        <ul className="ad-events">
          {events.map((e) => {
            const dates = dateRange(e.start_date ?? undefined, e.end_date ?? undefined);
            const tables = e.event_tables[0]?.count ?? 0;
            const squads = e.entries[0]?.count ?? 0;
            return (
              <li key={e.id}>
                <Link href={`/admin/events/${e.slug}`} className="ad-event">
                  <span className="ad-event__poster">
                    {e.poster_url ? <Image src={e.poster_url} alt="" fill sizes="64px" /> : <Icon name="trophy" size={20} />}
                  </span>
                  <span className="ad-event__main">
                    <strong>{e.name}</strong>
                    <span>
                      {e.series}
                      {dates && ` · ${dates}`}
                    </span>
                  </span>
                  <span className="ad-event__chips">
                    <span className="ad-chip" data-tone={e.status}>
                      {label(statusOptions, e.status)}
                    </span>
                    {e.registration_state !== "closed" && (
                      <span className="ad-chip" data-tone={`reg-${e.registration_state}`}>
                        Registration {label(registrationOptions, e.registration_state).toLowerCase()}
                      </span>
                    )}
                  </span>
                  <span className="ad-event__counts">
                    {tables} {tables === 1 ? "table" : "tables"} · {squads} {squads === 1 ? "team" : "teams"}
                  </span>
                  <Icon name="chevron" size={16} className="ad-event__go" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function EventsAdmin(props: PageProps<"/admin/events">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Events">
        <header className="ad-head">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.lede}</p>
          </div>
          <Link href="/admin/events/new" className="ad-btn ad-btn--primary">
            <Icon name="plus" size={16} />
            {copy.create}
          </Link>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <EventList searchParams={props.searchParams} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
