import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { pickMedia } from "@/lib/admin/actions/media";

async function Library() {
  return <MediaLibrary media={await pickMedia()} />;
}

export default function MediaAdmin() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Media">
        <header className="ad-head">
          <div>
            <h1>Media</h1>
            <p>Every image uploaded in the admin, kept here so it can be picked again instead of uploaded twice.</p>
          </div>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <Library />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
