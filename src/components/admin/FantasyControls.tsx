"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { manageFantasyWindow } from "@/lib/admin/actions/fantasy";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";
import type { FantasyMatchday } from "@/lib/fantasy/client";

type Action = "open" | "lock" | "close";
export function FantasyControls({ tournamentId, day, available }: { tournamentId: string; day: FantasyMatchday; available: Record<Action, boolean> }) {
  const router = useRouter();
  const [state, submit, pending] = useActionState(manageFantasyWindow, {});
  const [action, setAction] = useState<Action>(() => (["open", "lock", "close"] as Action[]).find(a => available[a]) ?? "open");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => { if (state.saved) router.refresh(); }, [state.saved, router]);
  return <form action={submit} className="ad-fx-controls">
    <input type="hidden" name="tournamentId" value={tournamentId} />
    <input type="hidden" name="matchdayNumber" value={day.matchdayNumber} />
    <input type="hidden" name="expectedStatus" value={day.marketStatus ?? ""} />
    <input type="hidden" name="expectedDeadline" value={day.submissionDeadline ?? ""} />
    <input type="hidden" name="action" value={action} />
    <div className="ad-fx-actions" role="group" aria-label={copy.controls}>
      {(["open", "lock", "close"] as Action[]).map(a => <button key={a} type="button" className="ad-btn" aria-pressed={a === action} disabled={pending || !available[a]} onClick={() => { setAction(a); setConfirmed(false); }}>{copy.actions[a]}</button>)}
    </div>
    {available[action] ? <>
      <p>{copy.effects[action]}</p>
      <label className="ad-fx-confirm"><input type="checkbox" name="confirm" value="yes" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={pending} /><span>{copy.confirmation}</span></label>
      <button className="ad-btn ad-btn--primary" disabled={pending || !confirmed}>{pending ? copy.working : copy.actions[action]}</button>
    </> : <p>{copy.controlsOff}</p>}
    {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
    {state.notice && <p className="ad-alert ad-alert--ok" role="status">{state.notice}</p>}
  </form>;
}
