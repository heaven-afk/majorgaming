"use client";

import { useActionState } from "react";
import { manageTransfers } from "@/lib/admin/actions/fantasy";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";
import type { FantasyMatchday } from "@/lib/fantasy/client";

const lagosInput = (value?: string | null) => value
  ? new Date(Date.parse(value) + 3600000).toISOString().slice(0, 16)
  : "";
const lagosTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/** One matchday's transfer window: where it stands, then its open and close times. */
export default function TransferWindow({ day, disabled, now }: { day: FantasyMatchday; disabled: boolean; now: number }) {
  const [state, submit, pending] = useActionState(manageTransfers, {});
  const opens = Date.parse(day.transfersOpenAt ?? "");
  const close = Math.min(Date.parse(day.transfersCloseAt ?? ""), Date.parse(day.matchdayStartsAt ?? ""));
  const status = !Number.isFinite(opens) ? { label: copy.window.unset, tone: "muted" }
    : now < opens ? { label: copy.window.scheduled, tone: "amber" }
    : Number.isFinite(close) && now < close ? { label: copy.window.open, tone: "ok" }
    : { label: copy.window.closed, tone: "muted" };
  return <form action={submit} className="ad-fx-window">
    <input type="hidden" name="tournamentId" value={day.tournamentId}/>
    <input type="hidden" name="matchdayNumber" value={day.matchdayNumber}/>
    <header>
      <h3>{copy.matchday} {day.matchdayNumber}</h3>
      <span className="ad-fx-pill" data-tone={status.tone}><i aria-hidden />{status.label}</span>
    </header>
    <div className="ad-fx-window__fields">
      <label className="ad-field">
        <span>{copy.transfersOpen}</span>
        <input type="datetime-local" name="opensAt" defaultValue={lagosInput(day.transfersOpenAt)} required disabled={disabled || pending}/>
      </label>
      <label className="ad-field">
        <span>{copy.transfersClose}</span>
        <input type="datetime-local" name="closesAt" defaultValue={lagosInput(day.transfersCloseAt)} required disabled={disabled || pending}/>
      </label>
    </div>
    {Number.isFinite(close) && <p className="ad-fx-small">{copy.effectiveClose} {lagosTime.format(close)} (Lagos)</p>}
    <div className="ad-fx-actions">
      <button className="ad-btn ad-btn--primary" name="action" value="save" disabled={disabled || pending}>{pending ? copy.saving : copy.saveTransfers}</button>
      {day.transfersOpenAt && <button className="ad-btn ad-btn--quiet" name="action" value="close" formNoValidate disabled={disabled || pending}>{copy.closeTransfers}</button>}
    </div>
    {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
    {state.notice && <p className="ad-alert ad-alert--ok" role="status">{state.notice}</p>}
  </form>;
}
