"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkIndexTeams, updateIndexResults } from "@/lib/admin/actions/index-results";
import type { IndexEvent } from "@/lib/index-results/contract";
import type { TeamCheck } from "@/lib/index-results/match";
import { Field, type FormState } from "./Form";
import IndexTeamCheck from "./IndexTeamCheck";
import IndexResults from "../events/IndexResults";

export default function IndexResultsForm({ slug, tableId, tableName, live, upcoming, events, current, enabled, legacy, unchecked, savedName, syncedAt, completed, message }: {
  slug: string; tableId: string; events: IndexEvent[]; current?: string; enabled: boolean; legacy: boolean; savedName?: string;
  /** Teams in the saved results that no one has checked against MGL yet. */
  unchecked: number;
  tableName: string; live: boolean; upcoming: boolean;
  syncedAt?: string | null; completed: boolean; message?: string;
}) {
  const [tournament, setTournament] = useState(events.some(event => event.id === current) ? current ?? "" : "");
  const [check, setCheck] = useState<TeamCheck>();
  const [checkError, setCheckError] = useState<string>();
  const [checking, startCheck] = useTransition();
  const [state, action, saving] = useActionState(async (previous: FormState, form: FormData) => {
    const next = await updateIndexResults(slug, tableId, previous, form);
    if (next.saved) setCheck(undefined);
    return next;
  }, {} as FormState);
  const busy = saving || checking;
  const router = useRouter();
  useEffect(() => { if (state.saved) router.refresh(); }, [state.saved, router]);
  const syncTime = syncedAt && new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(syncedAt));

  function checkTeams() {
    if (!tournament) {
      setCheck(undefined);
      setCheckError("Choose a tournament first.");
      return;
    }
    startCheck(async () => {
      const result = await checkIndexTeams(slug, tableId, tournament).catch(() => ({ check: undefined, error: "Could not check the teams. Try again." }));
      setCheck(result.check);
      setCheckError(result.error);
    });
  }

  return (
    <>
    <form action={action} className="ad-index">
      <p><strong>{legacy ? "Using the previous event-wide link" : enabled ? "Heaven Index selected" : "Manual results selected"}</strong>
        {savedName && <> · {savedName}{completed && " · Final in Heaven Index"}</>}
      </p>
      {syncTime && (upcoming || !live) && <p>Last saved {syncTime} WAT</p>}
      {message && <p>{message}</p>}
      {unchecked > 0 && !check && (
        <p className="ad-alert ad-alert--warn">
          {unchecked === 1 ? "1 team in these results hasn’t" : unchecked + " teams in these results haven’t"} been checked against MGL’s teams. Press Check teams.
        </p>
      )}
      {events.length > 0 && (
        <Field name="index-tournament" label="Heaven Index tournament">
          <select id="f-index-tournament" value={tournament} disabled={busy} onChange={event => { setTournament(event.target.value); setCheck(undefined); setCheckError(undefined); }}>
            <option value="">Choose a tournament</option>
            {events.map(event => <option key={event.id} value={event.id}>{event.name} · {event.status}{event.startDate ? " · " + event.startDate.slice(0, 10) : ""}</option>)}
          </select>
        </Field>
      )}
      {check && <IndexTeamCheck key={JSON.stringify(check)} check={check} tableName={tableName} relink={enabled && check.tournament.id === current} busy={saving} onCancel={() => setCheck(undefined)} />}
      {!check && <div className="ad-check__actions">
        {events.length > 0 && <button type="button" className="ad-btn ad-btn--primary" disabled={busy} onClick={checkTeams}>{checking ? "Checking teams…" : "Check teams"}</button>}
        {enabled && <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="sync">Sync now</button>}
        {enabled && <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="manual">Show manual results</button>}
        {legacy && <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="manual-legacy">Switch event to manual results</button>}
      </div>}
      {checkError && <p className="ad-alert ad-alert--error" role="alert">{checkError}</p>}
      {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
    </form>
    {live && <IndexResults slug={slug} live adminTable={tableName} refreshKey={state.saved} />}
    </>
  );
}
