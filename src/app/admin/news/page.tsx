import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icons";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/admin/supabase";
import { formatDate } from "@/lib/dates";

type Row = { id: string; slug: string; title: string; category: string; status: string; published_on: string | null; cover_url: string | null; updated_at: string };

async function Stories({ searchParams }: { searchParams: PageProps<"/admin/news">["searchParams"] }) {
  const [admin, query] = await Promise.all([requireAdmin(), searchParams]);
  const stories = await db<Row[]>(admin.token, "stories?select=id,slug,title,category,status,published_on,cover_url,updated_at&order=published_on.desc.nullsfirst,updated_at.desc");
  return (
    <>
      {query.deleted && (
        <p className="ad-alert ad-alert--ok" role="status">
          Story deleted.
        </p>
      )}
      {stories.length === 0 ? (
        <p className="ad-empty">No stories yet. Write the first one.</p>
      ) : (
        <ul className="ad-events">
          {stories.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/news/${s.slug}`} className="ad-event ad-event--story">
                <span className="ad-event__poster ad-event__poster--wide">
                  {s.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                    <img src={s.cover_url} alt="" />
                  ) : (
                    <Icon name="hash" size={18} />
                  )}
                </span>
                <span className="ad-event__main">
                  <strong>{s.title}</strong>
                  <span>
                    {s.category}
                    {s.published_on && ` · ${formatDate(s.published_on)}`}
                  </span>
                </span>
                <span className="ad-event__chips">
                  <span className="ad-chip" data-tone={s.status === "published" ? "final" : "upcoming"}>
                    {s.status === "published" ? "Published" : "Draft"}
                  </span>
                </span>
                <span className="ad-event__counts" />
                <Icon name="chevron" size={16} className="ad-event__go" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function NewsAdmin(props: PageProps<"/admin/news">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="News">
        <header className="ad-head">
          <div>
            <h1>News</h1>
            <p>Announcements, recaps and features. Drafts stay here until you publish them.</p>
          </div>
          <Link href="/admin/news/new" className="ad-btn ad-btn--primary">
            <Icon name="plus" size={16} /> New story
          </Link>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <Stories searchParams={props.searchParams} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
