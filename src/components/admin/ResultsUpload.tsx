"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { readSheet, saveKills, saveStandings, type KillsPayload, type SaveResult, type StandingsPayload } from "@/lib/admin/actions/results";
import { findHeader, guessColumns, key, match, num, ROLE_LABELS, tierOfName, type Candidate, type Role, type Sheet } from "@/lib/admin/columns";

export type UploadEntry = { id: string; teamId: string; name: string; tier: number | null; keys: string[]; roster: { personId: string; name: string; keys: string[] }[] };
export type UploadTeam = { id: string; name: string; keys: string[] };
export type UploadPerson = { id: string; name: string; ign: string | null; keys: string[] };
type Table = { id: string; name: string; tier: number | null };

type Mode = "standings" | "kills";
type Config = { header?: number; cols: Partial<Record<Role, number>>; target: string };

const WANTED: Record<Mode, Role[]> = {
  standings: ["team", "tier", "placement", "killpts", "kills", "bonus", "total", "wins", "matches", "move"],
  kills: ["player", "ign", "team", "tier", "kills", "matches", "group"],
};
// Columns assumed when pasted rows have no header.
const FALLBACK: Record<Mode, Role[]> = { standings: ["team", "placement", "killpts", "total"], kills: ["player", "team", "kills", "matches"] };
const SHEET_LIMIT = 4 * 1024 * 1024;
const SKIP_NAMES = new Set(["total", "totals", "grandtotal", "sum", "average"]);

/** Squad as a sheet names it: a registration, a team to register, a new team, or skipped. */
type SquadPick = { kind: "entry"; id: string; close?: boolean } | { kind: "team"; id: string; close?: boolean } | { kind: "new" } | { kind: "skip" };

/**
 * Reads a standings or kill sheet of any layout, previews it matched to squads and players, and
 * saves it. With `table` it works on that one tab: standings go into that table, kill rows
 * replace only that tier's, and rows for other tiers are left out.
 */
export default function ResultsUpload({ mode, eventId, tables, table, entries, teams, people, onDone }: { mode: Mode; eventId: string; tables: Table[]; table?: Table; entries: UploadEntry[]; teams: UploadTeam[]; people: UploadPerson[]; onDone?: () => void }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [active, setActive] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [tabGroups, setTabGroups] = useState(false);
  const locked = table ? (table.tier === null ? "all" : String(table.tier)) : undefined;
  const [scope, setScope] = useState<string>(locked ?? "all");
  const [text, setText] = useState("");
  const [message, setMessage] = useState<SaveResult>({});
  const [reading, startRead] = useTransition();
  const [saving, startSave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const entryCandidates: Candidate[] = useMemo(() => entries.map((e) => ({ id: e.id, keys: e.keys })), [entries]);
  const teamCandidates: Candidate[] = useMemo(() => teams.map((t) => ({ id: t.id, keys: t.keys })), [teams]);
  const peopleCandidates: Candidate[] = useMemo(() => people.map((p) => ({ id: p.id, keys: p.keys })), [people]);
  const entryOfTeam = useMemo(() => new Map(entries.map((e) => [e.teamId, e])), [entries]);
  const ignOf = useMemo(() => new Map(people.map((p) => [p.id, p.ign])), [people]);
  /** Which squad each player is on in this event now. */
  const squadOf = useMemo(() => new Map(entries.flatMap((e) => e.roster.map((p) => [p.personId, e] as const))), [entries]);
  /** What saving does to a player's roster place: joins the squad's roster, or moves from another squad. */
  const placeChange = (r: { person: string; squad: SquadPick }): { kind: "join" } | { kind: "move"; from: string } | undefined => {
    if (!r.person || r.person === "skip" || r.person.startsWith("new:")) return r.person.startsWith("new:") ? { kind: "join" } : undefined;
    const now = squadOf.get(r.person);
    const target = r.squad.kind === "entry" ? r.squad.id : null;
    if (!now) return { kind: "join" };
    return now.id === target ? undefined : { kind: "move", from: now.name };
  };
  /** The in-game name on record, when the sheet has a different one for a player already on record. */
  const oldIgn = (r: { person: string; ign: string }) => {
    if (!r.ign || r.person === "skip" || r.person.startsWith("new:")) return undefined;
    const before = ignOf.get(r.person) ?? "";
    return before === r.ign.replace(/\s+/g, " ").trim() ? undefined : before;
  };
  const tierTables = useMemo(() => new Map(tables.filter((t) => t.tier !== null).map((t) => [t.tier!, t])), [tables]);

  function load(result: { sheets?: Sheet[]; error?: string }) {
    if (result.error || !result.sheets) return setMessage({ error: result.error ?? "That sheet couldn't be read." });
    const usable = result.sheets.filter((s) => s.rows.length);
    if (!usable.length) return setMessage({ error: "The sheet is empty." });
    const cfg = usable.map((s): Config => {
      const header = findHeader(s.rows);
      const cols = guessColumns(header === undefined ? undefined : s.rows[header], WANTED[mode], FALLBACK[mode]);
      const tier = tierOfName(s.name);
      // Locked to one tab: a sheet named for another tier is skipped.
      if (table) return { header, cols, target: tier !== undefined && table.tier !== null && tier !== table.tier ? "skip" : mode === "kills" ? "include" : table.id };
      const target =
        mode === "kills"
          ? "include"
          : cols.tier !== undefined && tables.length > 1
            ? "split"
            : tier !== undefined && tierTables.has(tier)
              ? tierTables.get(tier)!.id
              : tables.length === 1 || usable.length === 1
                ? tables[0]?.id ?? "skip"
                : "skip";
      return { header, cols, target };
    });
    setSheets(usable);
    setConfigs(cfg);
    setActive(0);
    setOverrides({});
    setMessage({});
    // Kill tables: one tab per tier replaces only that tier; tabs like "Men" / "Women" are groups.
    const tiers = [...new Set(usable.map((s) => tierOfName(s.name)).filter((t) => t !== undefined))];
    setScope(locked ?? (mode === "kills" && tiers.length === 1 && usable.length === 1 ? String(tiers[0]) : "all"));
    setTabGroups(mode === "kills" && usable.length > 1 && tiers.length === 0);
  }

  function read(form: FormData) {
    // Sheets go through the server, which takes up to 4 MB (the host's limit).
    const file = form.get("file");
    if (file instanceof File && file.size > SHEET_LIMIT) return setMessage({ error: "That file is over 4 MB, usually from pictures or extra tabs. Save a copy with just the table, or copy the rows and paste them below." });
    startRead(async () => load(await readSheet(form).catch(() => ({ error: "The sheet didn't reach the server. Check you're online and try again." }))));
  }

  // The preview ------------------------------------------------------------------------------

  type Row = {
    key: string;
    sheet: number;
    team: string;
    squad: SquadPick;
    tier: number | null;
    tableId?: string;
    placement: number;
    killpts: number;
    bonus: number;
    total?: number;
    wins: number | null;
    matches: number | null;
    move: number | null;
    player: string;
    ign: string;
    kills: number;
    group: string | null;
    person: string;
    personClose?: boolean;
    issue?: string;
    /** In another tier than the tab being uploaded: shown, never saved. */
    outside?: boolean;
  };

  const rows: Row[] = useMemo(() => {
    if (!sheets) return [];
    const out: Row[] = [];
    sheets.forEach((sheet, si) => {
      const cfg = configs[si];
      if (!cfg || cfg.target === "skip") return;
      const c = cfg.cols;
      const cell = (r: string[], role: Role) => (c[role] === undefined ? "" : (r[c[role]!] ?? "").trim());
      sheet.rows.forEach((r, ri) => {
        if (cfg.header !== undefined && ri <= cfg.header) return;
        const team = cell(r, "team");
        const player = cell(r, "player");
        if (mode === "standings" ? !team || SKIP_NAMES.has(key(team)) : !player || SKIP_NAMES.has(key(player))) return;
        const rk = `${si}:${ri}`;

        // Which table, and which tier.
        let tier: number | null = null;
        let tableId: string | undefined;
        const tierCell = num(cell(r, "tier"));
        if (mode === "standings" && table) {
          // A sheet with every tier in it: only this tab's rows.
          if (table.tier !== null && tierCell !== undefined && tierCell !== table.tier) return;
          tableId = table.id;
          tier = table.tier;
        } else if (mode === "standings") {
          if (cfg.target === "split") {
            tier = num(cell(r, "tier")) ?? null;
            tableId = tier !== null ? tierTables.get(tier)?.id : undefined;
          } else {
            tableId = cfg.target;
            tier = tables.find((t) => t.id === tableId)?.tier ?? null;
          }
        } else tier = num(cell(r, "tier")) ?? tierOfName(sheet.name) ?? null;

        // The squad.
        const o = overrides[`${rk}:team`];
        let squad: SquadPick;
        if (o) squad = o === "new" ? { kind: "new" } : o === "skip" ? { kind: "skip" } : o.startsWith("e:") ? { kind: "entry", id: o.slice(2) } : { kind: "team", id: o.slice(2) };
        else if (!team) squad = { kind: "skip" };
        else {
          const e = match(team, entryCandidates);
          const t = e ? undefined : match(team, teamCandidates);
          const registered = t && entryOfTeam.get(t.id);
          squad = e ? { kind: "entry", ...e } : registered ? { kind: "entry", id: registered.id, close: t.close } : t ? { kind: "team", ...t } : { kind: "new" };
        }
        const entry = squad.kind === "entry" ? entries.find((x) => x.id === squad.id) : undefined;
        if (mode === "kills" && entry?.tier) tier = entry.tier;
        const outside = mode === "kills" && table?.tier != null && tier !== null && tier !== table.tier;
        if (mode === "kills" && table?.tier != null && tier === null) tier = table.tier;

        // Points come straight from the sheet's own columns; nothing is worked out here. The
        // Total column is only a check that the row adds up.
        const placement = num(cell(r, "placement")) ?? 0;
        const killpts = num(cell(r, "killpts")) ?? 0;
        const total = num(cell(r, "total"));
        const bonus = num(cell(r, "bonus")) ?? 0;
        let issue: string | undefined;
        if (mode === "standings" && total !== undefined && placement + killpts + bonus !== total) issue = `Place + kill + bonus is ${placement + killpts + bonus}, the sheet's total is ${total}`;
        if (mode === "standings" && !tableId) issue = tier === null ? "No tier" : `No Tier ${tier} table`;

        // The player (kill tables).
        let person = "";
        let personClose: boolean | undefined;
        const ign = cell(r, "ign");
        if (mode === "kills") {
          const po = overrides[`${rk}:player`];
          if (po) person = po;
          else {
            // The pro name decides who it is; an in-game name column is only stored for new players.
            const rosterMatch = entry && match(player, entry.roster.map((p) => ({ id: p.personId, keys: p.keys })));
            const anyone = rosterMatch ? undefined : match(player, peopleCandidates);
            if (rosterMatch) {
              person = rosterMatch.id;
              personClose = rosterMatch.close;
            } else if (anyone && !anyone.close) person = anyone.id;
            else person = `new:${player}`;
          }
          if (num(cell(r, "kills")) === undefined) issue = "No kills number";
          if (outside) issue = `A Tier ${tier} team: upload it on the Tier ${tier} tab`;
        }

        const group = mode === "kills" ? (cell(r, "group") || (tabGroups ? sheet.name : "")) || null : null;
        out.push({
          key: rk,
          sheet: si,
          team,
          squad,
          tier,
          tableId,
          placement,
          killpts,
          bonus,
          total,
          wins: num(cell(r, "wins")) ?? null,
          matches: num(cell(r, "matches")) ?? null,
          move: num(cell(r, "move")) ?? null,
          player,
          ign,
          kills: num(cell(r, "kills")) ?? 0,
          group,
          person,
          personClose,
          issue,
          outside,
        });
      });
    });
    return out;
  }, [sheets, configs, overrides, tabGroups, mode, table, entries, entryCandidates, teamCandidates, peopleCandidates, entryOfTeam, tables, tierTables]);

  const missingPoints = mode === "standings" && configs.some((c) => c.target !== "skip" && (c.cols.killpts === undefined || c.cols.placement === undefined));
  const live = rows.filter((r) => !r.outside && r.squad.kind !== "skip" && !(mode === "standings" && !r.tableId) && !(mode === "kills" && r.person === "skip"));
  const counts = {
    newTeams: live.filter((r) => r.squad.kind === "new").length,
    toRegister: live.filter((r) => r.squad.kind === "team").length,
    close: live.filter((r) => (r.squad.kind === "entry" || r.squad.kind === "team") && r.squad.close).length,
    newPeople: mode === "kills" ? live.filter((r) => r.person.startsWith("new:")).length : 0,
    igns: mode === "kills" ? live.filter((r) => oldIgn(r) !== undefined).length : 0,
    moves: mode === "kills" ? live.filter((r) => placeChange(r)?.kind === "move").length : 0,
    joins: mode === "kills" ? live.filter((r) => placeChange(r)?.kind === "join").length : 0,
    issues: rows.filter((r) => r.issue && !r.outside).length,
    outside: rows.filter((r) => r.outside).length,
  };

  function save() {
    const squadOf = (r: Row) => (r.squad.kind === "entry" ? { entryId: r.squad.id } : r.squad.kind === "team" ? { team: r.squad.id } : { team: `new:${r.team}` });
    startSave(async () => {
      let result: SaveResult;
      if (mode === "standings") {
        const byTable = new Map<string, StandingsPayload["tables"][number]>();
        for (const r of live) {
          const t = byTable.get(r.tableId!) ?? { tableId: r.tableId!, tier: r.tier, rows: [] };
          t.rows.push({ ...squadOf(r), placement: r.placement, kills: r.killpts, bonus: r.bonus, wins: r.wins, matches: r.matches, move: r.move });
          byTable.set(r.tableId!, t);
        }
        // Ranked by total, ties in sheet order, so a sheet listed by team name still reads right.
        for (const t of byTable.values()) t.rows = t.rows.map((x, i) => ({ x, i })).sort((a, b) => b.x.placement + b.x.kills + b.x.bonus - (a.x.placement + a.x.kills + a.x.bonus) || a.i - b.i).map(({ x }) => x);
        result = await saveStandings(eventId, { tables: [...byTable.values()] });
      } else {
        const payload: KillsPayload = {
          scope: scope === "all" ? "all" : Number(scope),
          rows: live.filter((r) => !r.issue).map((r) => ({ ...squadOf(r), tier: r.tier, person: r.person, ign: r.ign || undefined, kills: r.kills, matches: r.matches, group: r.group })),
        };
        result = await saveKills(eventId, payload);
      }
      setMessage(result);
      if (result.ok) {
        setSheets(null);
        onDone?.();
        router.refresh();
      }
    });
  }

  // Rendering ------------------------------------------------------------------------------

  if (!sheets) {
    return (
      <div className="ad-upload">
        <form
          className="ad-upload__source"
          onSubmit={(e) => {
            e.preventDefault();
            read(new FormData(e.currentTarget));
          }}
        >
          <button type="button" className="ad-upload__drop" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (!f) return;
            const data = new FormData();
            data.set("file", f);
            read(data);
          }}>
            <Icon name="plus" size={20} />
            <strong>{reading ? "Reading…" : "Choose a sheet"}</strong>
            <small>Excel (.xlsx) or CSV, any layout. Drop it here or tap to choose. Nothing saves until you&apos;ve checked the preview.</small>
          </button>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            hidden
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
          <details className="ad-upload__paste">
            <summary>Or paste rows from Excel or Google Sheets</summary>
            <textarea name="text" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "standings" ? "Team\tPlace Pts\tKill Pts\tTotal" : "Player\tTeam\tKills\tMatches"} />
            <button type="button" className="ad-btn ad-btn--quiet" disabled={!text.trim() || reading} onClick={() => {
              const data = new FormData();
              data.set("text", text);
              read(data);
            }}>
              Read pasted rows
            </button>
          </details>
        </form>
        {message.error && <p className="ad-alert ad-alert--error" role="alert">{message.error}</p>}
        {message.ok && <p className="ad-alert ad-alert--ok" role="status"><Icon name="check" size={14} /> {message.ok}</p>}
      </div>
    );
  }

  const cfg = configs[active];
  const sheet = sheets[active];
  const header = cfg.header === undefined ? undefined : sheet.rows[cfg.header];
  const width = Math.max(...sheet.rows.slice(0, 40).map((r) => r.length));
  const setCfg = (patch: Partial<Config>) => setConfigs((all) => all.map((x, i) => (i === active ? { ...x, ...patch } : x)));
  const colName = (i: number) => header?.[i] || `Column ${String.fromCharCode(65 + (i % 26))}`;
  const shown = rows.filter((r) => r.sheet === active);

  return (
    <div className="ad-upload">
      {sheets.length > 1 && (
        <div className="ad-tabs" role="tablist" aria-label="Sheets in the file">
          {sheets.map((s, i) => (
            <button key={s.name + i} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)} data-off={configs[i].target === "skip" ? "" : undefined}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="ad-upload__config">
        <label className="ad-field">
          <span>{mode === "standings" ? "Put these rows into" : "Use this tab"}</span>
          <select value={cfg.target} onChange={(e) => setCfg({ target: e.target.value })}>
            {table ? (
              <option value={mode === "kills" ? "include" : table.id}>{mode === "kills" ? "Yes" : table.name}</option>
            ) : mode === "standings" ? (
              <>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                {tables.length > 1 && <option value="split">Split by its Tier column</option>}
              </>
            ) : (
              <option value="include">Yes</option>
            )}
            <option value="skip">Skip this tab</option>
          </select>
        </label>
        <label className="ad-field">
          <span>Row with the column names</span>
          <select
            value={cfg.header ?? -1}
            onChange={(e) => {
              const h = Number(e.target.value);
              setCfg({ header: h < 0 ? undefined : h, cols: guessColumns(h < 0 ? undefined : sheet.rows[h], WANTED[mode], FALLBACK[mode]) });
            }}
          >
            <option value={-1}>None, rows start straight away</option>
            {sheet.rows.slice(0, 20).map((r, i) => (
              <option key={i} value={i}>
                Row {i + 1}: {r.filter(Boolean).slice(0, 4).join(" · ").slice(0, 60)}
              </option>
            ))}
          </select>
        </label>
        {mode === "standings" && (cfg.cols.killpts === undefined || cfg.cols.placement === undefined) && (
          <p className="ad-alert ad-alert--error ad-upload__wide" role="alert">
            Pick the {cfg.cols.placement === undefined ? "Placement pts" : "Kill pts"} column below. Points are taken from the sheet as they are, never worked out.
          </p>
        )}
        {mode === "kills" && !table && (
          <label className="ad-field">
            <span>This sheet replaces</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">The whole event&apos;s kill table</option>
              {tables
                .filter((t) => t.tier !== null)
                .map((t) => (
                  <option key={t.id} value={String(t.tier)}>
                    Only {t.name} teams
                  </option>
                ))}
            </select>
          </label>
        )}
        {mode === "kills" && sheets.length > 1 && (
          <label className="ad-check">
            <input type="checkbox" checked={tabGroups} onChange={(e) => setTabGroups(e.target.checked)} />
            <span>Separate kill tables per sheet (e.g. Men and Women)</span>
          </label>
        )}
      </div>

      <fieldset className="ad-columns">
        <legend>Match the columns</legend>
        <p className="ad-note">Matched from the column names. If one is wrong, pick the right column; the rows below update as you do.</p>
        <div>
          {WANTED[mode]
            .filter((role) => !(mode === "standings" && role === "tier" && cfg.target !== "split" && !table))
            .map((role) => (
              <label key={role} className="ad-field">
                <span>{ROLE_LABELS[role]}</span>
                <select
                  value={cfg.cols[role] ?? -1}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const cols = { ...cfg.cols };
                    if (v < 0) delete cols[role];
                    else cols[role] = v;
                    setCfg({ cols });
                  }}
                >
                  <option value={-1}>Not in sheet</option>
                  {Array.from({ length: width }, (_, i) => (
                    <option key={i} value={i}>
                      {colName(i)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </div>
      </fieldset>

      <div className="ad-summary" role="status">
        <strong>
          {live.length} {mode === "standings" ? "teams" : "players"} ready to save
        </strong>
        {counts.close > 0 && <span data-tone="amber">{counts.close} close spellings to check</span>}
        {counts.toRegister > 0 && <span>{counts.toRegister} teams will be added to this event</span>}
        {counts.newTeams > 0 && <span data-tone="amber">{counts.newTeams} new teams</span>}
        {counts.newPeople > 0 && <span>{counts.newPeople} new players</span>}
        {counts.igns > 0 && <span>{counts.igns} in-game names will update</span>}
        {counts.moves > 0 && <span data-tone="amber">{counts.moves} players will move team</span>}
        {counts.joins > 0 && <span>{counts.joins} players will join a roster</span>}
        {counts.issues > 0 && <span data-tone="error">{counts.issues} rows need a look</span>}
        {counts.outside > 0 && <span>{counts.outside} from other tiers, left out</span>}
      </div>

      <div className="ad-preview">
        <table>
          <thead>
            <tr>
              {mode === "kills" && <th>Player</th>}
              <th>Team</th>
              {mode === "standings" ? (
                <>
                  <th className="num">Place pts</th>
                  <th className="num">Kill pts</th>
                  <th className="num">Bonus</th>
                  <th className="num">Total</th>
                </>
              ) : (
                <>
                  <th className="num">Kills</th>
                  <th className="num">Matches</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const entry = r.squad.kind === "entry" ? entries.find((e) => e.id === (r.squad as { id: string }).id) : undefined;
              const squadValue = r.squad.kind === "entry" ? `e:${r.squad.id}` : r.squad.kind === "team" ? `t:${r.squad.id}` : r.squad.kind;
              const close = (r.squad.kind === "entry" || r.squad.kind === "team") && r.squad.close;
              return (
                <tr key={r.key} data-skip={r.outside || r.squad.kind === "skip" || r.person === "skip" ? "" : undefined} data-issue={r.issue ? "" : undefined}>
                  {mode === "kills" && (
                    <td>
                      <span className="ad-preview__sheet">{r.player}</span>
                      {(() => {
                        const change = placeChange(r);
                        if (!change) return null;
                        return change.kind === "move" ? (
                          <span className="ad-preview__move" data-tone="amber">
                            Moves to this team from {change.from}
                          </span>
                        ) : (
                          <span className="ad-preview__move">Added to this team&apos;s roster</span>
                        );
                      })()}
                      {oldIgn(r) !== undefined && (
                        <span className="ad-preview__ign">
                          IGN {oldIgn(r) ? <s>{oldIgn(r)}</s> : null}
                          {oldIgn(r) ? " → " : ""}
                          {r.ign}
                        </span>
                      )}
                      <select
                        aria-label={`Player for ${r.player}`}
                        value={r.person}
                        data-tone={r.person.startsWith("new:") ? "new" : r.personClose ? "amber" : undefined}
                        onChange={(e) => setOverrides((o) => ({ ...o, [`${r.key}:player`]: e.target.value }))}
                      >
                        <option value={`new:${r.player}`}>Add as a new player</option>
                        <option value="skip">Leave this row out</option>
                        {(entry?.roster ?? []).map((p) => (
                          <option key={p.personId} value={p.personId}>
                            {p.name}
                          </option>
                        ))}
                        {!entry?.roster.some((p) => p.personId === r.person) && !r.person.startsWith("new:") && r.person !== "skip" && (
                          <option value={r.person}>{people.find((p) => p.id === r.person)?.name ?? "On record"}</option>
                        )}
                      </select>
                    </td>
                  )}
                  <td>
                    {mode === "standings" && <span className="ad-preview__sheet">{r.team}</span>}
                    <select aria-label={`Squad for ${r.team}`} value={squadValue} data-tone={r.squad.kind === "new" ? "new" : close ? "amber" : undefined} onChange={(e) => setOverrides((o) => ({ ...o, [`${r.key}:team`]: e.target.value }))}>
                      <option value="new">Add as a new team “{r.team}”</option>
                      <option value="skip">Leave this row out</option>
                      <optgroup label="In this event">
                        {entries.map((e) => (
                          <option key={e.id} value={`e:${e.id}`}>
                            {e.name}
                            {e.tier ? ` · Tier ${e.tier}` : ""}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Other teams (adds them to this event)">
                        {teams
                          .filter((t) => !entryOfTeam.has(t.id))
                          .map((t) => (
                            <option key={t.id} value={`t:${t.id}`}>
                              {t.name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                    {r.issue && <small className="ad-preview__issue">{r.issue}</small>}
                  </td>
                  {mode === "standings" ? (
                    <>
                      <td className="num">{r.placement}</td>
                      <td className="num">{r.killpts}</td>
                      <td className="num">{r.bonus || ""}</td>
                      <td className="num">
                        <strong>{r.placement + r.killpts + r.bonus}</strong>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="num">
                        <strong>{r.kills}</strong>
                      </td>
                      <td className="num">{r.matches ?? ""}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="ad-note ad-preview__empty">No rows read from this sheet. Check the header row and the {mode === "standings" ? "Team" : "Player"} column.</p>}
      </div>

      {message.error && <p className="ad-alert ad-alert--error" role="alert">{message.error}</p>}
      <div className="ad-savebar">
        <p className="ad-savebar__msg">
          {mode === "standings" ? (table ? `Saving replaces the ${table.name} standings with the rows above.` : "Saving replaces these standings with the rows above.") : scope === "all" ? "Saving replaces the whole event's kill table." : `Saving replaces the Tier ${scope} kill table.`} You can undo it.
        </p>
        <div className="ad-savebar__actions">
          <button type="button" className="ad-btn ad-btn--quiet" onClick={() => (setSheets(null), onDone?.())}>
            Cancel
          </button>
          <button type="button" className="ad-btn ad-btn--primary" disabled={saving || live.length === 0 || missingPoints} onClick={save}>
            {saving ? "Saving…" : `Save ${live.length} ${live.length === 1 ? "row" : "rows"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
