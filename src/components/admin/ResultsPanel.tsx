"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { clearTable, restoreVersion, type SaveResult } from "@/lib/admin/actions/results";
import ResultsUpload, { type UploadEntry, type UploadPerson, type UploadTeam } from "./ResultsUpload";

type Table = { id: string; name: string; tier: number | null };
export type PanelStanding = { squad: string; slug: string; placement: number; kills: number; bonus: number; matches: number | null };
export type PanelKill = { player: string; squad: string; kills: number; matches: number | null; group: string | null };
export type PanelVersion = { id: string; kind: "standings" | "kills"; tier: number | null; summary: string | null; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Upload for every tier at once: a sheet with a tab per tier, or one list with a Tier column.
 * Each row goes to its own tier's table; kill rows replace the whole event's.
 */
export function AllTiersUpload({ eventId, tables, entries, teams, people }: { eventId: string; tables: Table[]; entries: UploadEntry[]; teams: UploadTeam[]; people: UploadPerson[] }) {
  const [open, setOpen] = useState<"standings" | "kills" | null>(null);
  return (
    <section className="ad-card ad-alltiers">
      <header className="ad-card__head">
        <div>
          <h2>Have one sheet with every tier?</h2>
          <p>Upload it here instead of tier by tier: a tab per tier, or one list with a Tier column. Each team&apos;s row goes to its own tier.</p>
        </div>
        <div className="ad-card__actions">
          <button type="button" className="ad-btn ad-btn--quiet" onClick={() => setOpen(open === "standings" ? null : "standings")} aria-expanded={open === "standings"}>
            <Icon name="upload" size={16} /> Standings sheet
          </button>
          <button type="button" className="ad-btn ad-btn--quiet" onClick={() => setOpen(open === "kills" ? null : "kills")} aria-expanded={open === "kills"}>
            <Icon name="upload" size={16} /> Kill sheet
          </button>
        </div>
      </header>
      {open && (
        <div className="ad-card__upload">
          <ResultsUpload key={open} mode={open} eventId={eventId} tables={tables} entries={entries} teams={teams} people={people} onDone={() => setOpen(null)} />
        </div>
      )}
    </section>
  );
}

/**
 * One results tab (a tier, or the event's one table): its standings and kill table as they are
 * live, an upload for each, and the versions an upload replaced, to put back.
 */
export default function ResultsPanel({
  eventId,
  tables,
  table,
  entries,
  teams,
  people,
  standings,
  kills,
  versions,
  undoReady,
}: {
  eventId: string;
  tables: Table[];
  table: Table;
  entries: UploadEntry[];
  teams: UploadTeam[];
  people: UploadPerson[];
  standings: PanelStanding[];
  kills: PanelKill[];
  versions: PanelVersion[];
  undoReady: boolean;
}) {
  const [open, setOpen] = useState<"standings" | "kills" | null>(null);
  const [message, setMessage] = useState<SaveResult>({});
  const [busy, start] = useTransition();
  const router = useRouter();
  const groups = kills.some((k) => k.group);
  const lastStandings = versions.find((v) => v.kind === "standings");
  const lastKills = versions.find((v) => v.kind === "kills");

  function run(action: () => Promise<SaveResult>, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    start(async () => {
      const result = await action();
      setMessage(result);
      if (result.ok) router.refresh();
    });
  }
  const restore = (v: PanelVersion) => run(() => restoreVersion(eventId, v.id), `Put back the ${v.kind === "standings" ? "standings" : "kill table"} from ${when(v.created_at)}? What's there now is kept, so you can switch back.`);

  return (
    <div className="ad-results">
      {message.error && <p className="ad-alert ad-alert--error" role="alert">{message.error}</p>}
      {message.ok && (
        <p className="ad-alert ad-alert--ok" role="status">
          <Icon name="check" size={14} /> {message.ok}
        </p>
      )}

      {/* Standings ---------------------------------------------------------------------- */}
      <section className="ad-card">
        <header className="ad-card__head">
          <div>
            <h2>{table.name} standings</h2>
            <p>{standings.length ? `${standings.length} teams, ranked by total points` : "Nothing uploaded yet. Comes from the collation sheet."}</p>
          </div>
          <div className="ad-card__actions">
            {lastStandings && (
              <button type="button" className="ad-btn ad-btn--quiet" disabled={busy} onClick={() => restore(lastStandings)}>
                <Icon name="undo" size={16} /> Undo last upload
              </button>
            )}
            <button type="button" className="ad-btn ad-btn--primary" onClick={() => setOpen(open === "standings" ? null : "standings")} aria-expanded={open === "standings"}>
              <Icon name="upload" size={16} /> {standings.length ? "Upload a new version" : "Upload standings"}
            </button>
          </div>
        </header>
        {open === "standings" && (
          <div className="ad-card__upload">
            <ResultsUpload mode="standings" eventId={eventId} tables={tables} table={table} entries={entries} teams={teams} people={people} onDone={() => setOpen(null)} />
          </div>
        )}
        {standings.length > 0 ? (
          <div className="ad-standings">
            <table>
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Team</th>
                  <th className="num">Place pts</th>
                  <th className="num">Kill pts</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.slug}>
                    <td className="num ad-standings__rank">{i + 1}</td>
                    <td>
                      <a href={`/admin/teams/${s.slug}`}>{s.squad}</a>
                    </td>
                    <td className="num">{s.placement}</td>
                    <td className="num">{s.kills}</td>
                    <td className="num">
                      <strong>{s.placement + s.kills + s.bonus}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          open !== "standings" && <p className="ad-card__empty">Upload the collation sheet for {table.name}. Any layout works: you&apos;ll check every row before anything is saved. Points are taken from the sheet as they are.</p>
        )}
        {standings.length > 0 && (
          <button type="button" className="ad-card__clear" disabled={busy} onClick={() => run(() => clearTable(eventId, table.id, table.tier), `Empty the ${table.name} standings? You can undo it.`)}>
            Clear this table
          </button>
        )}
      </section>

      {/* Kill table --------------------------------------------------------------------- */}
      <section className="ad-card">
        <header className="ad-card__head">
          <div>
            <h2>{table.name} kill table</h2>
            <p>{kills.length ? `${kills.length} players${kills[0] ? ` · most kills ${kills[0].kills}` : ""}` : "Nothing uploaded yet. Comes from the kill sheet."}</p>
          </div>
          <div className="ad-card__actions">
            {lastKills && (
              <button type="button" className="ad-btn ad-btn--quiet" disabled={busy} onClick={() => restore(lastKills)}>
                <Icon name="undo" size={16} /> Undo last upload
              </button>
            )}
            <button type="button" className="ad-btn ad-btn--primary" onClick={() => setOpen(open === "kills" ? null : "kills")} aria-expanded={open === "kills"}>
              <Icon name="upload" size={16} /> {kills.length ? "Upload a new version" : "Upload kills"}
            </button>
          </div>
        </header>
        {open === "kills" && (
          <div className="ad-card__upload">
            <ResultsUpload mode="kills" eventId={eventId} tables={tables} table={table} entries={entries} teams={teams} people={people} onDone={() => setOpen(null)} />
          </div>
        )}
        {kills.length > 0 ? (
          <div className="ad-standings">
            <table>
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Player</th>
                  {groups && <th>Table</th>}
                  <th className="num">Kills</th>
                  <th className="num">Matches</th>
                </tr>
              </thead>
              <tbody>
                {kills.map((k, i) => (
                  <tr key={`${k.player}-${i}`}>
                    <td className="num ad-standings__rank">{i + 1}</td>
                    <td>
                      {k.player}
                      <small>{k.squad}</small>
                    </td>
                    {groups && <td>{k.group}</td>}
                    <td className="num">
                      <strong>{k.kills}</strong>
                    </td>
                    <td className="num">{k.matches ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          open !== "kills" && <p className="ad-card__empty">Upload the kill sheet for {table.name}: player, team and kills, in any order. Players missing from their team&apos;s roster are added to it, and the preview shows who moves before you save.</p>
        )}
      </section>

      {/* Versions ----------------------------------------------------------------------- */}
      {!undoReady ? (
        <p className="ad-note ad-results__note">
          <Icon name="warning" size={14} /> Undo isn&apos;t switched on yet: run <code>supabase/migrations/20261029090000_results_history.sql</code> in the Supabase SQL editor once.
        </p>
      ) : (
        versions.length > 0 && (
          <details className="ad-card ad-versions">
            <summary>
              <strong>Earlier versions</strong>
              <small>Every upload keeps what it replaced, so any of them can be put back.</small>
            </summary>
            <ul>
              {versions.map((v) => (
                <li key={v.id}>
                  <span>
                    <strong>{v.kind === "standings" ? "Standings" : v.tier === null && tables.length > 1 ? "Kill table, all tiers" : "Kill table"}</strong>
                    <small>
                      {when(v.created_at)} · {v.summary}
                    </small>
                  </span>
                  <button type="button" className="ad-btn ad-btn--quiet" disabled={busy} onClick={() => restore(v)}>
                    Put back
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )
      )}
    </div>
  );
}
