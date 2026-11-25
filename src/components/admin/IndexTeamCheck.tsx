"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import type { CheckedTeam, TeamCheck } from "@/lib/index-results/match";

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const NOTE: Record<CheckedTeam["how"], string> = {
  none: "No match found",
  close: "Close spelling, check this one",
  name: "Same name",
  saved: "Matched before",
};

/**
 * Every team in the Heaven Index tournament beside its MGL team, to correct before linking.
 * Sits inside the link form: it sends `tournament` and `matches`. Nothing is saved until then.
 */
export default function IndexTeamCheck({ check, tableName, relink, busy, onCancel }: {
  check: TeamCheck; tableName: string; relink: boolean; busy: boolean; onCancel: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const teamOf = (row: CheckedTeam) => picked[row.id] ?? row.teamId ?? "";
  // Grouped once, by what was found: rows don't jump about while they're being fixed.
  const rows = [...check.teams].sort((a, b) => a.name.localeCompare(b.name));
  const unsure = rows.filter((row) => row.how === "none" || row.how === "close");
  const sure = rows.filter((row) => row.how === "name" || row.how === "saved");
  const nameOf = new Map(check.options.map((o) => [o.id, o.name]));
  const here = check.options.filter((o) => o.here);
  const others = check.options.filter((o) => !o.here);

  const used = new Map<string, CheckedTeam[]>();
  for (const row of rows) {
    const id = teamOf(row);
    if (id) used.set(id, [...(used.get(id) ?? []), row]);
  }
  const clash = (row: CheckedTeam) => used.get(teamOf(row))?.find((other) => other.id !== row.id);
  const clashes = rows.filter(clash).length;
  const matched = rows.filter((row) => teamOf(row)).length;
  const toCheck = rows.filter((row) => row.how === "close" && picked[row.id] === undefined).length;
  const missing = here.filter((o) => !used.has(o.id));
  const matches = JSON.stringify(Object.fromEntries(rows.map((row) => [row.id, teamOf(row) || null])));

  const list = (group: CheckedTeam[]) => (
    <ul className="ad-match__list">
      {group.map((row) => {
        const id = teamOf(row);
        const changed = picked[row.id] !== undefined;
        const twin = clash(row);
        const tone = twin ? "error" : !changed && (row.how === "close" || row.how === "none") ? "amber" : id ? "ok" : undefined;
        return (
          <li key={row.id} data-tone={tone}>
            <span className="ad-match__team">
              <strong>{row.name}</strong>
              <small>{changed ? (id ? "Picked by you" : "Left without an MGL team") : NOTE[row.how]}</small>
            </span>
            <span className="ad-match__arrow" aria-hidden>
              <Icon name="arrow" size={16} />
            </span>
            <span className="ad-match__pick">
              <select
                aria-label={`MGL team for ${row.name}`}
                aria-invalid={twin ? true : undefined}
                value={id}
                onChange={(e) => setPicked((p) => ({ ...p, [row.id]: e.target.value }))}
              >
                <option value="">Not an MGL team</option>
                {here.length > 0 && (
                  <optgroup label={`In ${tableName}`}>
                    {here.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Other MGL teams">
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              {twin ? (
                <small data-tone="error">
                  {nameOf.get(id)} is also picked for {twin.name}
                </small>
              ) : (
                id && here.length > 0 && !here.some((o) => o.id === id) && <small data-tone="amber">Not registered in {tableName}</small>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="ad-match">
      <input type="hidden" name="tournament" value={check.tournament.id} />
      <input type="hidden" name="matches" value={matches} />
      <header className="ad-card__head">
        <div>
          <h2>Check the teams</h2>
          <p>Each team in {check.tournament.name}, with the MGL team it is.</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="ad-card__empty">
          Heaven Index hasn&apos;t sent any teams for this tournament yet, so there is nothing to check. You can link it now, and check the teams here once they arrive.
        </p>
      ) : (
        <>
          <div className="ad-match__progress" role="status">
            <p>
              <strong>
                {matched} of {count(rows.length, "team")} matched
              </strong>
              {toCheck > 0 && <span data-tone="amber">{toCheck === 1 ? "1 close spelling" : `${toCheck} close spellings`} to check</span>}
              {matched < rows.length && <span data-tone="amber">{rows.length - matched} without an MGL team</span>}
              {clashes > 0 && <span data-tone="error">The same MGL team is picked twice</span>}
            </p>
            <i aria-hidden style={{ "--done": matched / rows.length } as React.CSSProperties} />
          </div>
          {unsure.length > 0 && (
            <section>
              <h3>
                Needs a look <small>{unsure.length}</small>
              </h3>
              {list(unsure)}
            </section>
          )}
          {sure.length > 0 && (
            <section>
              <h3>
                Matched <small>{sure.length}</small>
              </h3>
              {list(sure)}
            </section>
          )}
          {missing.length > 0 && (
            <details className="ad-more">
              <summary>
                {count(missing.length, "MGL team")} in {tableName} not in this tournament
              </summary>
              <div>
                <p className="ad-note">{missing.map((o) => o.name).join(", ")}</p>
              </div>
            </details>
          )}
        </>
      )}

      <div className="ad-savebar">
        <p className="ad-savebar__msg" data-tone={clashes > 0 ? "error" : undefined}>
          {clashes > 0 ? "Each MGL team can be matched once." : "Nothing changes until you confirm."}
        </p>
        <div className="ad-savebar__actions">
          <button type="button" className="ad-btn ad-btn--quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="ad-btn ad-btn--primary" name="operation" value="link" disabled={busy || clashes > 0}>
            {busy ? "Saving…" : rows.length === 0 ? "Link without checking" : relink ? "Confirm teams" : "Confirm and link"}
          </button>
        </div>
      </div>
    </div>
  );
}
