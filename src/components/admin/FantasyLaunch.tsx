"use client";

import { useActionState } from "react";
import { goLive } from "@/lib/admin/actions/fantasy";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";

export default function FantasyLaunch({ tournamentId, live, ready }: {
  tournamentId: string;
  live: boolean;
  ready: boolean;
}) {
  const [state, submit, pending] = useActionState(goLive, {});
  return <form action={submit} className="ad-fx-controls">
    <input type="hidden" name="tournamentId" value={tournamentId} />
    <p><strong>{live ? copy.launchLive : copy.launchPending}</strong></p>
    {!live && <>
      <p>{ready ? copy.launchNote : copy.launchUnavailable}</p>
      <button className="ad-btn ad-btn--primary" disabled={pending || !ready}>
        {pending ? copy.goingLive : copy.goLive}
      </button>
    </>}
    {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
    {state.notice && <p className="ad-alert ad-alert--ok" role="status">{state.notice}</p>}
  </form>;
}
