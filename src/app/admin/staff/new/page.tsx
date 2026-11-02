import Link from "next/link";
import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import StaffForm from "@/components/admin/StaffForm";
import { saveStaff } from "@/lib/admin/actions/content";
import { countryCodes } from "@/lib/admin/countries";

export default function NewStaffPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Staff">
        <header className="ad-head">
          <div>
            <Link href="/admin/staff" className="ad-back">
              ← Staff
            </Link>
            <h1>Add a person</h1>
            <p>They appear on the Staff page once saved.</p>
          </div>
        </header>
        <StaffForm action={saveStaff.bind(null, null)} countries={countryCodes} />
      </AdminShell>
    </Suspense>
  );
}
