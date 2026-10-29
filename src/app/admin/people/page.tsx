import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icons";
import { listPeople } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

async function People({ searchParams }: { searchParams: PageProps<"/admin/people">["searchParams"] }) {
  const [admin, query] = await Promise.all([requireAdmin(), searchParams]);
  const q = typeof query.q === "string" ? query.q : "";
  const page = Math.max(0, Number(query.page) || 0);
  const { rows, more } = await listPeople(admin.token, q, page);
  const link = (p: number) => `/admin/people?${new URLSearchParams({ ...(q ? { q } : {}), ...(p ? { page: String(p) } : {}) })}`;

  return (
    <>
      {query.deleted && (
        <p className="ad-alert ad-alert--ok" role="status">
          Player deleted.
        </p>
      )}
      <form className="ad-search" action="/admin/people">
        <input type="search" name="q" defaultValue={q} placeholder="Search by name or in-game name" aria-label="Search players" />
        <button className="ad-btn ad-btn--quiet">Search</button>
      </form>
      {rows.length === 0 ? (
        <p className="ad-empty">No players match.</p>
      ) : (
        <ul className="ad-rows">
          {rows.map((p) => {
            const latest = [...p.entry_players].sort((a, b) => a.entry.event.sort_order - b.entry.event.sort_order)[0];
            return (
              <li key={p.id}>
                <Link href={`/admin/people/${p.slug}`} className="ad-row">
                  <span className="ad-row__crest ad-row__crest--round" aria-hidden>
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                      <img src={p.photo_url} alt="" />
                    ) : (
                      p.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="ad-row__main">
                    <strong>
                      {p.name}
                      {p.country && <Flag code={p.country} className="ad-row__flag" />}
                      {p.archived_at && <small className="ad-row__tag">Archived</small>}
                    </strong>
                    <span>
                      {p.ign && p.ign !== p.name ? `${p.ign} · ` : ""}
                      {latest ? latest.entry.team_name : "No team yet"}
                      {p.entry_players.length > 1 && ` · ${p.entry_players.length} events`}
                    </span>
                  </span>
                  <Icon name="chevron" size={16} className="ad-row__go" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {(page > 0 || more) && (
        <nav className="ad-pager" aria-label="Pages">
          {page > 0 ? (
            <Link className="ad-btn ad-btn--quiet" href={link(page - 1)}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="ad-note">Page {page + 1}</span>
          {more ? (
            <Link className="ad-btn ad-btn--quiet" href={link(page + 1)}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

export default function PeopleAdmin(props: PageProps<"/admin/people">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Players">
        <header className="ad-head">
          <div>
            <Link href="/admin/teams" className="ad-back">
              ← Teams
            </Link>
            <h1>Players</h1>
            <p>Everyone on a roster or a kill table. Photos, countries and in-game names live here.</p>
          </div>
          <Link href="/admin/people/new" className="ad-btn ad-btn--primary">
            <Icon name="plus" size={16} /> New player
          </Link>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <People searchParams={props.searchParams} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
