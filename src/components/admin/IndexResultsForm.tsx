"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateIndexResults } from "@/lib/admin/actions/index-results";
import type { IndexEvent } from "@/lib/index-results/contract";
import { Field, type FormState } from "./Form";

export default function IndexResultsForm({ slug, tableId, events, current, enabled, legacy, savedName, syncedAt, completed, message }: {
  slug: string; tableId: string; events: IndexEvent[]; current?: string; enabled: boolean; legacy: boolean; savedName?: string;
  syncedAt?: string | null; completed: boolean; message?: string;
}) {
  const [state, action, busy] = useActionState(updateIndexResults.bind(null, slug, tableId), {} as FormState);
  const router = useRouter();
  useEffect(() => { if (state.saved) router.refresh(); }, [state.saved, router]);
  const syncTime = syncedAt && new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(syncedAt));

  return (
    <form action={action}>
      <p><strong>{legacy ? "Using the previous event-wide link" : enabled ? "Heaven Index selected" : "Manual results selected"}</strong>
        {savedName && <> · {savedName}{completed && " · Final in Heaven Index"}</>}
      </p>
      {syncTime && <p>Last saved {syncTime} WAT</p>}
      {message && <p>{message}</p>}
      {events.length > 0 && (
        <Field name="index-tournament" label="Heaven Index tournament">
          <select id="f-index-tournament" name="tournament" defaultValue={events.some(event => event.id === current) ? current : ""}>
            <option value="">Choose a tournament</option>
            {events.map(event => <option key={event.id} value={event.id}>{event.name} · {event.status}{event.startDate ? " · " + event.startDate.slice(0, 10) : ""}</option>)}
          </select>
        </Field>
      )}
      <div className="ad-fx-actions">
        {events.length > 0 && <button className="ad-btn" disabled={busy} name="operation" value="link">Link and import</button>}
        {enabled && <button className="ad-btn" disabled={busy} name="operation" value="sync">Sync now</button>}
        {enabled && <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="manual">Show manual results</button>}
        {legacy && <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="manual-legacy">Switch event to manual results</button>}
      </div>
      {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
    </form>
  );
}
