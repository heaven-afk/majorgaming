import Link from "next/link";

const TABS = [
  { href: "", label: "Details" },
  { href: "/squads", label: "Squads" },
  { href: "/results", label: "Results" },
] as const;

/** Back link, title and the Details / Squads / Results switch at the top of every event page. */
export default function EventTabs({ slug, name, active, note, children }: { slug: string; name: string; active: (typeof TABS)[number]["label"]; note?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="ad-head ad-head--event">
      <div>
        <Link href="/admin/events" className="ad-back">
          ← Events
        </Link>
        <h1>{name}</h1>
        {note && <p>{note}</p>}
      </div>
      {children}
      <nav className="ad-subnav" aria-label="Event">
        {TABS.map((t) => (
          <Link key={t.label} href={`/admin/events/${slug}${t.href}`} aria-current={t.label === active ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
