"use client";

import { useActionState } from "react";
import { goLive } from "@/lib/admin/actions/fantasy";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";

/** The Go live button, with what it does or what's still missing beside it. */
export default function FantasyLaunch({ tournamentId, live, ready }: {
  tournamentId: string;
  live: boolean;
  ready: boolean;
}) {
  const [state, submit, pending] = useActionState(goLive, {});
  return <form action={submit} className="ad-fx-launch" data-ready={ready ? "" : undefined}>
    <input type="hidden" name="tournamentId" value={tournamentId} />
    <div>
      <strong>{live ? copy.launchLive : ready ? copy.launchReadyTitle : copy.launchPending}</strong>
      {!live && <p>{ready ? copy.launchNote : copy.launchUnavailable}</p>}
    </div>
    {!live && <button className="ad-btn ad-btn--primary" disabled={pending || !ready}>
      {pending ? copy.goingLive : copy.goLive}
    </button>}
    {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
    {state.notice && <p className="ad-alert ad-alert--ok" role="status">{state.notice}</p>}
  </form>;
}
