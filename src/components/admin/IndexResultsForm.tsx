"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { checkIndexTeams, updateIndexResults } from "@/lib/admin/actions/index-results";
import type { IndexEvent } from "@/lib/index-results/contract";
import type { TeamCheck } from "@/lib/index-results/match";
import { Field, type FormState } from "./Form";
import IndexTeamCheck from "./IndexTeamCheck";
import IndexResults from "../events/IndexResults";

const title = (status: string) => status.charAt(0).toUpperCase() + status.slice(1).replace(/[_-]/g, " ");

/**
 * A table's live results. Connected: what's linked, how its teams match and what can be done.
 * Not connected: pick a tournament, check its teams, confirm. Nothing saves before Confirm.
 */
export default function IndexResultsForm({ slug, tableId, tableName, status, events, current, enabled, legacy, teams, savedName, savedStatus, syncedAt, message }: {
  slug: string; tableId: string; tableName: string; status: string; events: IndexEvent[]; current?: string; enabled: boolean; legacy: boolean;
  /** In the saved results: teams sent, matched to an MGL team, and not checked by anyone yet. */
  teams: { sent: number; matched: number; unchecked: number };
  savedName?: string; savedStatus?: string; syncedAt?: string | null; message?: string;
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
  const live = status === "live";
  const router = useRouter();
  useEffect(() => { if (state.saved) router.refresh(); }, [state.saved, router]);
  const syncTime = syncedAt && new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(syncedAt));

  function checkTeams(id: string) {
    if (!id) {
      setCheck(undefined);
      setCheckError("Choose a tournament first.");
      return;
    }
    startCheck(async () => {
      const result = await checkIndexTeams(slug, tableId, id).catch(() => ({ check: undefined, error: "Could not check the teams. Try again." }));
      setCheck(result.check);
      setCheckError(result.error);
    });
  }

  const picker = events.length > 0 && (
    <div className="ad-feed__pick">
      <Field name="index-tournament" label="Tournament">
        <select id="f-index-tournament" value={tournament} disabled={busy} onChange={event => { setTournament(event.target.value); setCheckError(undefined); }}>
          <option value="">Choose a tournament</option>
          {events.map(event => <option key={event.id} value={event.id}>{event.name} · {title(event.status)}{event.startDate ? " · " + event.startDate.slice(0, 10) : ""}</option>)}
        </select>
      </Field>
      <button type="button" className={"ad-btn " + (enabled ? "ad-btn--quiet" : "ad-btn--primary")} disabled={busy || !tournament} onClick={() => checkTeams(tournament)}>
        {checking ? "Checking teams…" : "Check teams"}
      </button>
    </div>
  );
  const alerts = (
    <>
      {message && <p className="ad-alert ad-alert--error">{message}</p>}
      {checkError && <p className="ad-alert ad-alert--error" role="alert">{checkError}</p>}
      {state.error && <p className="ad-alert ad-alert--error" role="alert">{state.error}</p>}
      {state.notice && !check && <p className="ad-alert ad-alert--ok" role="status"><Icon name="check" size={14} /> {state.notice}</p>}
    </>
  );

  return (
    <div className="ad-results">
      <form action={action} className="ad-card ad-feed">
        {check ? (
          <>
            {alerts}
            <IndexTeamCheck key={JSON.stringify(check)} check={check} tableName={tableName} relink={enabled && check.tournament.id === current} busy={saving} onCancel={() => setCheck(undefined)} />
          </>
        ) : enabled ? (
          <>
            <header className="ad-card__head">
              <div>
                <div className="ad-feed__name">
                  <h2>{savedName ?? "Heaven Index tournament"}</h2>
                  {savedStatus && <span className="ad-chip">{title(savedStatus)}</span>}
                </div>
                <p>
                  {live ? "Connected to Heaven Index. New scores come in by themselves." : status === "upcoming" ? "Connected to Heaven Index. Shows on the site once the event’s status is Live." : "Connected to Heaven Index. The event is finished, so the site shows its spreadsheets."}
                  {!live && syncTime && ` Last updated ${syncTime} WAT.`}
                </p>
              </div>
              <div className="ad-card__actions">
                <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="sync">Refresh now</button>
              </div>
            </header>
            {alerts}
            <div className="ad-feed__teams" data-tone={teams.unchecked > 0 ? "amber" : undefined}>
              <dl>
                <div><dt>Teams</dt><dd>{teams.sent}</dd></div>
                <div><dt>Matched</dt><dd>{teams.matched}</dd></div>
                <div data-tone={teams.unchecked > 0 ? "amber" : undefined}><dt>To check</dt><dd>{teams.unchecked}</dd></div>
              </dl>
              <div className="ad-feed__check">
                <p>
                  {teams.sent === 0 ? "No teams have been sent yet. They’ll show here once they’re entered in Heaven Index." : teams.unchecked > 0 ? `${teams.unchecked === 1 ? "1 team hasn’t" : `${teams.unchecked} teams haven’t`} been checked against MGL’s teams yet.` : "Every team has been checked."}
                </p>
                <button type="button" className={"ad-btn " + (teams.unchecked > 0 ? "ad-btn--primary" : "ad-btn--quiet")} disabled={busy} onClick={() => checkTeams(current ?? "")}>
                  {checking ? "Checking teams…" : teams.unchecked > 0 ? "Check teams" : "Review matches"}
                </button>
              </div>
            </div>
            <details className="ad-more">
              <summary>Change or disconnect <small>Use another tournament, or go back to spreadsheets</small></summary>
              <div className="ad-feed__change">
                {picker}
                <div className="ad-feed__off">
                  <p>Show {tableName}’s spreadsheets on the site instead. The connection can be set up again any time.</p>
                  <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="manual">Use spreadsheets</button>
                </div>
              </div>
            </details>
          </>
        ) : (
          <>
            <header className="ad-card__head">
              <div>
                <h2>{legacy ? "Connected for the whole event" : `Connect ${tableName}`}</h2>
                <p>
                  {legacy ? `Every table uses ${savedName ?? "one tournament"}. Choosing one for ${tableName} switches to a tournament per table; the others show their spreadsheets until you connect them.` : "Scores come in from Heaven Index by themselves during the event, so there is nothing to upload."}
                </p>
              </div>
              {legacy && (
                <div className="ad-card__actions">
                  <button className="ad-btn ad-btn--quiet" disabled={busy} name="operation" value="manual-legacy">Use spreadsheets for the event</button>
                </div>
              )}
            </header>
            {alerts}
            {picker && (
              <>
                <ol className="ad-feed__steps">
                  <li>Choose the tournament</li>
                  <li>Check its teams against MGL’s</li>
                  <li>Confirm</li>
                </ol>
                {picker}
              </>
            )}
            {!legacy && savedName && <p className="ad-note">Last connected to {savedName}{syncTime && `, updated ${syncTime} WAT`}.</p>}
          </>
        )}
      </form>
      {live && (enabled || legacy) && !check && (
        <details className="ad-card ad-versions ad-feed__preview" open>
          <summary>
            <strong>{tableName} on the site</strong>
            <small>What visitors see right now.</small>
          </summary>
          <IndexResults slug={slug} live adminTable={tableName} refreshKey={state.saved} />
        </details>
      )}
    </div>
  );
}
