import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import StaffForm, { type StaffValues } from "@/components/admin/StaffForm";
import { deleteStaff, saveStaff } from "@/lib/admin/actions/content";
import { countryCodes } from "@/lib/admin/countries";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/admin/supabase";

async function Editor({ params, searchParams }: PageProps<"/admin/staff/[slug]">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const [person] = await db<(StaffValues & { id: string })[]>(admin.token, `staff?slug=eq.${encodeURIComponent(slug)}&select=*`);
  if (!person) notFound();

  return (
    <>
      <header className="ad-head">
        <div>
          <Link href="/admin/staff" className="ad-back">
            ← Staff
          </Link>
          <h1>{person.name}</h1>
          <p>
            {person.role} · {person.grp}
          </p>
        </div>
      </header>
      <StaffForm action={saveStaff.bind(null, person.id)} values={person} countries={countryCodes} saved={Boolean(query.saved)} />
      <section className="ad-danger">
        <header>
          <h2>Remove from staff</h2>
          <p>Deletes them from the Staff page for good. To hide them for now, archive them instead.</p>
        </header>
        <ActionForm
          action={async () => {
            "use server";
            await deleteStaff(person.id);
            return {};
          }}
          submit="Remove"
          pending="Removing…"
          tone="danger"
          confirm={`Remove ${person.name} from staff?`}
        />
      </section>
    </>
  );
}

export default function StaffAdminPage(props: PageProps<"/admin/staff/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Staff">
        <Suspense fallback={<AdminLoading />}>
          <Editor {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
