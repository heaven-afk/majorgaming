import { Suspense } from "react";
import AdminShell, { AdminLoading, OwnerOnly } from "@/components/admin/AdminShell";
import AdminsManager from "@/components/admin/AdminsManager";
import { Icon } from "@/components/Icons";
import { adminsCopy as copy } from "@/content/admins";
import { addAdmin, listAdmins, removeAdmin, setAdminRole } from "@/lib/admin/actions/admins";
import { isOwner, requireAdmin } from "@/lib/admin/session";
import "./admins.css";

async function Manager() {
  const admin = await requireAdmin();
  if (!isOwner(admin)) return <OwnerOnly />;
  const { ready, admins } = await listAdmins();
  if (!ready)
    return (
      <p className="ad-alert ad-alert--error" role="alert">
        <Icon name="warning" size={14} /> {copy.notReady}
      </p>
    );
  return <AdminsManager admins={admins} me={admin.id} actions={{ add: addAdmin, role: setAdminRole, remove: removeAdmin }} />;
}

export default function AdminsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Admins">
        <header className="ad-head">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.lede}</p>
          </div>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <Manager />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
