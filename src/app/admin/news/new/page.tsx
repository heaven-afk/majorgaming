import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import StoryForm from "@/components/admin/StoryForm";
import { saveStory } from "@/lib/admin/actions/content";

export default function NewStoryPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="News">
        <header className="ad-head">
          <div>
            <Link href="/admin/news" className="ad-back">
              ← News
            </Link>
            <h1>New story</h1>
            <p>Starts as a draft. Publish it when it&apos;s ready.</p>
          </div>
        </header>
        <StoryForm action={saveStory.bind(null, null)} />
      </AdminShell>
    </Suspense>
  );
}
