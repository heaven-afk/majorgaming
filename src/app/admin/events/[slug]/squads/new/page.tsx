import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import SquadEditor from "@/components/admin/SquadEditor";

async function Editor({ params }: PageProps<"/admin/events/[slug]/squads/new">) {
  const { slug } = await params;
  return <SquadEditor slug={slug} />;
}

export default function NewSquadPage(props: PageProps<"/admin/events/[slug]/squads/new">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Events">
        <Suspense fallback={<AdminLoading />}>
          <Editor {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
