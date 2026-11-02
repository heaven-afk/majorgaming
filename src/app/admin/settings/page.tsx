import { Suspense } from "react";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import SettingsForm from "@/components/admin/SettingsForm";
import { Icon } from "@/components/Icons";
import { settingsCopy as copy } from "@/content/settings";
import { savedSettings, saveSettings } from "@/lib/admin/actions/settings";
import { settingsFrom } from "@/lib/settings";

async function Editor() {
  const saved = await savedSettings();
  return (
    <>
      {!saved.ready && (
        <p className="ad-alert ad-alert--error" role="alert">
          <Icon name="warning" size={14} /> Settings can&apos;t be saved yet: run <code>supabase/migrations/20261029160000_site_settings.sql</code> in the Supabase SQL editor once. The site shows the values below until then.
        </p>
      )}
      <SettingsForm action={saveSettings} values={settingsFrom(saved.data)} />
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Settings">
        <header className="ad-head">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.lede}</p>
          </div>
        </header>
        <Suspense fallback={<AdminLoading />}>
          <Editor />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
