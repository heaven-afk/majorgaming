"use client";

import { useState } from "react";
import type { CheckedTeam, TeamCheck } from "@/lib/index-results/match";

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const ORDER: Record<CheckedTeam["how"], number> = { none: 0, close: 1, name: 2, saved: 3 };
const NOTE: Record<CheckedTeam["how"], string> = {
  none: "No match found",
  close: "Close spelling. Check this one",
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
  // Ordered once, by what was found: rows don't jump about while they're being fixed.
  const rows = [...check.teams].sort((a, b) => ORDER[a.how] - ORDER[b.how] || a.name.localeCompare(b.name));
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

  return (
    <div className="ad-check">
      <input type="hidden" name="tournament" value={check.tournament.id} />
      <input type="hidden" name="matches" value={matches} />
      <h3>
        Check the teams in {check.tournament.name}
      </h3>

      {rows.length === 0 ? (
        <p className="ad-note">
          Heaven Index hasn&apos;t sent any teams for this tournament yet, so there is nothing to check. You can link it now, and check the teams here once they arrive.
        </p>
      ) : (
        <>
          <div className="ad-summary" role="status">
            <strong>
              {matched} of {count(rows.length, "team")} matched
            </strong>
            {toCheck > 0 && <span data-tone="amber">{toCheck === 1 ? "1 close spelling" : `${toCheck} close spellings`} to check</span>}
            {matched < rows.length && <span data-tone="error">{rows.length - matched} without an MGL team</span>}
            {clashes > 0 && <span data-tone="error">The same MGL team is picked twice</span>}
          </div>
          <div className="ad-preview">
            <table>
              <thead>
                <tr>
                  <th>Heaven Index team</th>
                  <th>MGL team</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const id = teamOf(row);
                  const changed = picked[row.id] !== undefined;
                  const twin = clash(row);
                  return (
                    <tr key={row.id} data-issue={twin ? "" : undefined}>
                      <td>
                        <span className="ad-preview__sheet">{row.name}</span>
                        <span className="ad-preview__move" data-tone={!changed && row.how !== "name" && row.how !== "saved" ? "amber" : undefined}>
                          {changed ? (id ? "Picked by you" : "Left without an MGL team") : NOTE[row.how]}
                        </span>
                      </td>
                      <td>
                        <select
                          aria-label={`MGL team for ${row.name}`}
                          aria-invalid={twin ? true : undefined}
                          value={id}
                          data-tone={!changed && (row.how === "close" || row.how === "none") ? "amber" : undefined}
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
                        {id && !here.some((o) => o.id === id) && <span className="ad-preview__move" data-tone="amber">Not registered in {tableName}</span>}
                        {twin && (
                          <small className="ad-preview__issue">
                            {nameOf.get(id)} is also picked for {twin.name}
                          </small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {missing.length > 0 && (
            <details className="ad-check__missing">
              <summary>
                {count(missing.length, "MGL team")} in {tableName} not in this tournament
              </summary>
              <p className="ad-note">{missing.map((o) => o.name).join(", ")}</p>
            </details>
          )}
        </>
      )}

      <div className="ad-check__actions">
        <button className="ad-btn ad-btn--primary" name="operation" value="link" disabled={busy || clashes > 0}>
          {busy ? "Linking…" : rows.length === 0 ? "Link without checking" : relink ? "Confirm teams" : "Confirm and link"}
        </button>
        <button type="button" className="ad-btn ad-btn--quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
