import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import StoryForm, { type StoryValues } from "@/components/admin/StoryForm";
import { deleteStory, saveStory } from "@/lib/admin/actions/content";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/admin/supabase";

async function Editor({ params, searchParams }: PageProps<"/admin/news/[slug]">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const [story] = await db<(StoryValues & { id: string })[]>(admin.token, `stories?slug=eq.${encodeURIComponent(slug)}&select=*`);
  if (!story) notFound();

  return (
    <>
      <header className="ad-head">
        <div>
          <Link href="/admin/news" className="ad-back">
            ← News
          </Link>
          <h1>{story.title}</h1>
          <p>{story.status === "published" ? "Published" : "Draft"}</p>
        </div>
        {story.status === "published" && (
          <a href={`/news/${story.slug}`} target="_blank" rel="noreferrer" className="ad-btn ad-btn--quiet">
            Open story
          </a>
        )}
      </header>
      <StoryForm action={saveStory.bind(null, story.id)} values={story} saved={Boolean(query.saved)} />
      <section className="ad-danger">
        <header>
          <h2>Delete story</h2>
          <p>Takes it off the site for good. To hide it for now, set it back to Draft instead.</p>
        </header>
        <ActionForm
          action={async () => {
            "use server";
            await deleteStory(story.id);
            return {};
          }}
          submit="Delete story"
          pending="Deleting…"
          tone="danger"
          confirm={`Delete “${story.title}”? This can't be undone.`}
        />
      </section>
    </>
  );
}

export default function StoryAdminPage(props: PageProps<"/admin/news/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="News">
        <Suspense fallback={<AdminLoading />}>
          <Editor {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
