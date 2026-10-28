import Link from "next/link";
import { Suspense } from "react";
import { saveEvent } from "@/app/admin/actions";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EventForm from "@/components/admin/EventForm";
import { league } from "@/content/site";

export default function NewEventPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Events">
        <header className="ad-head">
          <div>
            <Link href="/admin/events" className="ad-back">
              ← Events
            </Link>
            <h1>New event</h1>
            <p>Start with the basics; registrations and results come after it&apos;s created.</p>
          </div>
        </header>
        <EventForm action={saveEvent.bind(null, null)} tiers={league.tiers} />
      </AdminShell>
    </Suspense>
  );
}
