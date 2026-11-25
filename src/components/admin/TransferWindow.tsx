"use client";

import { useActionState } from "react";
import { manageTransfers } from "@/lib/admin/actions/fantasy";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";
import type { FantasyMatchday } from "@/lib/fantasy/client";

const lagosInput = (value?: string | null) => value
  ? new Date(Date.parse(value) + 3600000).toISOString().slice(0, 16)
  : "";
const lagosTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default function TransferWindow({ day, disabled }: { day: FantasyMatchday; disabled: boolean }) {
  const [state, submit, pending] = useActionState(manageTransfers, {});
  const close = Math.min(Date.parse(day.transfersCloseAt ?? ""), Date.parse(day.matchdayStartsAt ?? ""));
  return <form action={submit} className="ad-fx-controls">
    <input type="hidden" name="tournamentId" value={day.tournamentId}/>
    <input type="hidden" name="matchdayNumber" value={day.matchdayNumber}/>
    <h3>{copy.matchday} {day.matchdayNumber}</h3>
    {Number.isFinite(close) && <p>{copy.effectiveClose} · {lagosTime.format(close)}</p>}
    <label>{copy.transfersOpen} <input type="datetime-local" name="opensAt" defaultValue={lagosInput(day.transfersOpenAt)} required disabled={disabled || pending}/></label>
    <label>{copy.transfersClose} <input type="datetime-local" name="closesAt" defaultValue={lagosInput(day.transfersCloseAt)} required disabled={disabled || pending}/></label>
    <div className="ad-fx-actions">
      <button className="ad-btn ad-btn--primary" name="action" value="save" disabled={disabled || pending}>{copy.saveTransfers}</button>
      {day.transfersOpenAt && <button className="ad-btn" name="action" value="close" formNoValidate disabled={disabled || pending}>{copy.closeTransfers}</button>}
    </div>
    {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
    {state.notice && <p className="ad-alert ad-alert--ok" role="status">{state.notice}</p>}
  </form>;
}
