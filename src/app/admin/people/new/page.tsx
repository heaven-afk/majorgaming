import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import TeamForm from "@/components/admin/TeamForm";
import { savePerson } from "@/lib/admin/actions/teams";
import { countryCodes } from "@/lib/admin/countries";

export default function NewPersonPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Players">
        <header className="ad-head">
          <div>
            <Link href="/admin/people" className="ad-back">
              ← Players
            </Link>
            <h1>New player</h1>
            <p>Players are also created when you type a new name into a roster or a kill sheet.</p>
          </div>
        </header>
        <TeamForm kind="person" action={savePerson.bind(null, null)} countries={countryCodes} />
      </AdminShell>
    </Suspense>
  );
}
