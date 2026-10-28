import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icons";
import { registrationOptions, statusOptions } from "@/content/admin";
import { league } from "@/content/site";
import { currentSeason, listEvents } from "@/lib/admin/events";
import { listEntries } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

const label = <T extends { value: string; label: string }>(options: readonly T[], value: string) => options.find((o) => o.value === value)?.label ?? value;

async function Dashboard() {
  const admin = await requireAdmin();
  const [season, events] = await Promise.all([currentSeason(admin.token), listEvents(admin.token)]);
  const entries = season ? await listEntries(admin.token, season.id) : [];
  const players = entries.reduce((n, e) => n + e.entry_players.length, 0);
  const tiers = season?.event_tables.filter((t) => t.tier !== null) ?? [];
  const withResults = tiers.filter((t) => (t.standings[0]?.count ?? 0) > 0).length;
  const noRoster = entries.filter((e) => e.entry_players.length === 0).length;

  const actions = [
    season && { href: `/admin/events/${season.slug}/results`, icon: "upload", title: "Upload results", text: `Collation or kill sheet for ${season.name}` },
    season && { href: "/admin/teams/new", icon: "squad", title: "Add a team", text: `Add a team to ${season.name}` },
    { href: "/admin/events/new", icon: "calendar", title: "New event", text: "A season or a special event" },
    { href: "/admin/news/new", icon: "news", title: "Write a story", text: "News, recaps and updates" },
  ].filter((a): a is { href: string; icon: string; title: string; text: string } => Boolean(a));

  return (
    <>
      <header className="ad-head">
        <div>
          <h1>Dashboard</h1>
          <p>{season ? `Working on ${season.name}. Teams and Results open on it; other events are under Events.` : "No ranked season yet. Create one under Events."}</p>
        </div>
        {season && (
          <div className="ad-head__actions">
            <span className="ad-chip" data-tone={season.status}>
              {label(statusOptions, season.status)}
            </span>
            <span className="ad-chip" data-tone={`reg-${season.registration_state}`}>
              Registration {label(registrationOptions, season.registration_state).toLowerCase()}
            </span>
          </div>
        )}
      </header>

      {season && (
        <>
          <ul className="ad-stats">
            <li>
              <span>Squads</span>
              <strong>{entries.length}</strong>
              <small>in {season.name}</small>
            </li>
            <li>
              <span>Players</span>
              <strong>{players}</strong>
              <small>on rosters{noRoster ? ` · ${noRoster} squads with none` : ""}</small>
            </li>
            <li>
              <span>Results in</span>
              <strong>
                {withResults}
                <em>/{tiers.length || 1}</em>
              </strong>
              <small>{tiers.length ? "tiers" : "tables"}</small>
            </li>
            <li>
              <span>Events</span>
              <strong>{events.length}</strong>
              <small>on record</small>
            </li>
          </ul>

          {tiers.length > 0 && (
            <section className="ad-card">
              <header className="ad-card__head">
                <div>
                  <h2>{season.name} tiers</h2>
                  <p>A full tier is {league.squadsPerTier} squads.</p>
                </div>
                <Link href="/admin/teams" className="ad-btn ad-btn--quiet">
                  All teams
                </Link>
              </header>
              <ul className="ad-tierlist">
                {tiers.map((t, i) => {
                  const n = entries.filter((e) => e.tier === t.tier).length;
                  const over = n - league.squadsPerTier;
                  const results = (t.standings[0]?.count ?? 0) > 0;
                  return (
                    <li key={t.id}>
                      <Link href={`/admin/teams?tier=${t.tier}`} className="ad-tierlist__name">
                        <strong>{t.name}</strong>
                        <span data-tone={over > 0 ? "amber" : undefined}>
                          {n} / {league.squadsPerTier}
                          {over > 0 && ` · ${over} over`}
                        </span>
                      </Link>
                      <span className="ad-meter" aria-hidden>
                        <span style={{ width: `${Math.min(100, (n / league.squadsPerTier) * 100)}%` }} data-tone={over > 0 ? "amber" : undefined} />
                      </span>
                      <Link href={`/admin/events/${season.slug}/results?tab=${i + 1}`} className="ad-tierlist__results" data-done={results ? "" : undefined}>
                        {results ? <Icon name="check" size={14} /> : null}
                        {results ? "Results in" : "No results"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <ul className="ad-actions">
        {actions.map((a) => (
          <li key={a.href}>
            <Link href={a.href}>
              <span className="ad-actions__icon">
                <Icon name={a.icon} size={20} />
              </span>
              <strong>{a.title}</strong>
              <small>{a.text}</small>
            </Link>
          </li>
        ))}
      </ul>

      <section className="ad-card">
        <header className="ad-card__head">
          <div>
            <h2>Events</h2>
            <p>Newest first. Each has its own squads and results.</p>
          </div>
          <Link href="/admin/events" className="ad-btn ad-btn--quiet">
            All events
          </Link>
        </header>
        <ul className="ad-mini">
          {events.slice(0, 5).map((e) => (
            <li key={e.id}>
              <Link href={`/admin/events/${e.slug}`}>
                <strong>{e.name}</strong>
                <span>{e.entries[0]?.count ?? 0} squads</span>
                <span className="ad-chip" data-tone={e.status}>
                  {label(statusOptions, e.status)}
                </span>
                <Icon name="chevron" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function AdminHome() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Dashboard">
        <Suspense fallback={<AdminLoading />}>
          <Dashboard />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
