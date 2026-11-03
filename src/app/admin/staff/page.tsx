import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icons";
import { STAFF_GROUPS } from "@/content/admin";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/admin/supabase";

type Row = { id: string; slug: string; name: string; role: string; grp: string; country: string | null; photo_url: string | null; sort: number; spotlight: unknown; archived_at: string | null };

async function Staff({ searchParams }: { searchParams: PageProps<"/admin/staff">["searchParams"] }) {
  const [admin, query] = await Promise.all([requireAdmin(), searchParams]);
  const staff = await db<Row[]>(admin.token, "staff?select=id,slug,name,role,grp,country,photo_url,sort,spotlight,archived_at&order=sort.asc,name.asc");
  return (
    <>
      {query.deleted && (
        <p className="ad-alert ad-alert--ok" role="status">
          Removed from staff.
        </p>
      )}
      {staff.length === 0 && <p className="ad-empty">No staff yet.</p>}
      {STAFF_GROUPS.map((group) => {
        const people = staff.filter((s) => s.grp === group);
        if (!people.length) return null;
        return (
          <section key={group} className="ad-group">
            <h2>
              {group} <small>{people.length}</small>
            </h2>
            <ul className="ad-rows">
              {people.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/staff/${s.slug}`} className="ad-row" data-off={s.archived_at ? "" : undefined}>
                    <span className="ad-row__crest ad-row__crest--round" aria-hidden>
                      {s.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                        <img src={s.photo_url} alt="" />
                      ) : (
                        s.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span className="ad-row__main">
                      <strong>
                        {s.name}
                        {s.country && <Flag code={s.country} className="ad-row__flag" />}
                        {Boolean(s.spotlight) && <small className="ad-row__tag">Spotlight</small>}
                        {s.archived_at && <small className="ad-row__tag">Archived</small>}
                      </strong>
                      <span>{s.role}</span>
                    </span>
                    <Icon name="chevron" size={16} className="ad-row__go" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

export default function StaffAdmin(props: PageProps<"/admin/staff">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Staff">
        <header className="ad-head">
          <div>
            <h1>Staff</h1>
            <p>The people who run MGL, as the Staff page shows them.</p>
          </div>
          <Link href="/admin/staff/new" className="ad-btn ad-btn--primary">
            <Icon name="plus" size={16} /> Add a person
          </Link>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <Staff searchParams={props.searchParams} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
