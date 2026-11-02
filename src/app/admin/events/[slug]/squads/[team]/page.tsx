import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import SquadEditor from "@/components/admin/SquadEditor";

async function Editor({ params, searchParams }: PageProps<"/admin/events/[slug]/squads/[team]">) {
  const [{ slug, team }, query] = await Promise.all([params, searchParams]);
  return <SquadEditor slug={slug} team={team} saved={Boolean(query.saved)} />;
}

export default function SquadPage(props: PageProps<"/admin/events/[slug]/squads/[team]">) {
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
