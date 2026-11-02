import Link from "next/link";
import { statusOptions } from "@/content/admin";
import type { EventRow, TableRow } from "@/lib/admin/events";

const TABS = [
  { href: "", label: "Details" },
  { href: "/squads", label: "Teams" },
  { href: "/results", label: "Results" },
] as const;

type Tabbed = Pick<EventRow, "slug" | "name" | "status" | "kind"> & { event_tables: TableRow[]; entries: { count: number }[] };

/**
 * Back link, title and the Details / Teams / Results switch at the top of every event page.
 * Each tab says where it stands, so it's clear what's done and what's next.
 */
export default function EventTabs({ event, active, note, children }: { event: Tabbed; active: (typeof TABS)[number]["label"]; note?: React.ReactNode; children?: React.ReactNode }) {
  const teams = event.entries[0]?.count ?? 0;
  const tables = event.event_tables.length;
  const done = event.event_tables.filter((t) => (t.standings[0]?.count ?? 0) > 0).length;
  const status = statusOptions.find((s) => s.value === event.status)?.label ?? event.status;
  const state: Record<(typeof TABS)[number]["label"], string> = {
    Details: `${event.kind === "season" ? "Ranked season" : "Special event"} · ${status}`,
    Teams: teams ? `${teams} ${teams === 1 ? "team" : "teams"} in` : "None picked yet",
    Results: !tables ? "No tables" : tables === 1 ? (done ? "Uploaded" : "Nothing yet") : `${done} of ${tables} tiers`,
  };

  return (
    <header className="ad-head ad-head--event">
      <div>
        <Link href="/admin/events" className="ad-back">
          ← Events
        </Link>
        <div className="ad-head__title">
          <h1>{event.name}</h1>
          <span className="ad-chip" data-tone={event.status}>
            {status}
          </span>
        </div>
        {note && <p>{note}</p>}
      </div>
      {children}
      <nav className="ad-steps" aria-label="Event">
        {TABS.map((t) => (
          <Link key={t.label} href={`/admin/events/${event.slug}${t.href}`} aria-current={t.label === active ? "page" : undefined}>
            <strong>{t.label}</strong>
            <small>{state[t.label]}</small>
          </Link>
        ))}
      </nav>
    </header>
  );
}
