"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { key } from "@/lib/admin/columns";
import { SaveBar, submitWith, useSavedToast, type FormState } from "./Form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export type LineupRow = {
  teamId: string;
  name: string;
  tag: string | null;
  logo: string | null;
  players: number;
  /** A short line under the name, e.g. "Played Season 10, Tier 2". */
  note?: string;
  tier: number | null;
  checked: boolean;
  registered: boolean;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * An event's teams: a tab per tier listing every team that plays there, ticked to take part.
 * Each tier counts its ticks against a full tier; a team can be moved to another tier from its
 * row. The save bar says what saving changes before it's pressed. Events without tiers are one
 * list with a search.
 */
export default function LineupForm({ action, tiers, cap, rows, ranked }: { action: Action; tiers: number; cap: number; rows: LineupRow[]; ranked: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const toast = useSavedToast(state);
  const [picks, setPicks] = useState(() => new Map(rows.map((r) => [r.teamId, { checked: r.checked, tier: r.tier }])));
  const [tab, setTab] = useState<number | null>(tiers ? 1 : null);
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const n = new Map<number | null, { ticked: number; all: number }>();
    for (const r of rows) {
      const p = picks.get(r.teamId)!;
      const c = n.get(p.tier) ?? { ticked: 0, all: 0 };
      c.all += 1;
      if (p.checked) c.ticked += 1;
      n.set(p.tier, c);
    }
    return n;
  }, [rows, picks]);
  const over = tiers ? Array.from({ length: tiers }, (_, i) => i + 1).filter((t) => (counts.get(t)?.ticked ?? 0) > cap) : [];
  const unplaced = counts.get(null)?.all ?? 0;

  // What saving would change.
  const change = useMemo(() => {
    let ticked = 0, joining = 0, leaving = 0, moving = 0;
    for (const r of rows) {
      const p = picks.get(r.teamId)!;
      if (p.checked) ticked += 1;
      if (p.checked && !r.registered) joining += 1;
      if (!p.checked && r.registered) leaving += 1;
      if (p.checked && r.registered && p.tier !== r.tier) moving += 1;
    }
    return { ticked, joining, leaving, moving };
  }, [rows, picks]);

  const k = key(q);
  // A search looks through every tier; otherwise the open tab's teams.
  const shown = rows.filter((r) => (k ? key(r.name).includes(k) || (r.tag && key(r.tag).includes(k)) : !tiers || picks.get(r.teamId)!.tier === tab));
  const set = (teamId: string, patch: Partial<{ checked: boolean; tier: number | null }>) => setPicks((all) => new Map(all).set(teamId, { ...all.get(teamId)!, ...patch }));
  const setAll = (checked: boolean) => setPicks((all) => new Map([...all].map(([id, p]) => [id, shown.some((r) => r.teamId === id) && (!checked || !tiers || p.tier) ? { ...p, checked } : p])));
  const tabCount = tab === null ? undefined : counts.get(tab);

  const summary = [
    plural(change.ticked, "team") + " taking part",
    change.joining && `${change.joining} joining`,
    change.moving && `${change.moving} changing tier`,
    change.leaving && `${change.leaving} leaving`,
  ].filter(Boolean);

  return (
    <form className="ad-form ad-lineup" onSubmit={submitWith(formAction, startTransition)} noValidate>
      {[...picks]
        .filter(([, p]) => p.checked && (!tiers || p.tier))
        .map(([id, p]) => (
          <input key={id} type="hidden" name="pick" value={`${id}:${p.tier ?? 0}`} />
        ))}

      {tiers > 0 && (
        <nav className="ad-tiers" aria-label="Tiers">
          {Array.from({ length: tiers }, (_, i) => i + 1).map((t) => {
            const c = counts.get(t) ?? { ticked: 0, all: 0 };
            return (
              <button key={t} type="button" onClick={() => (setTab(t), setQ(""))} aria-current={!k && tab === t ? "page" : undefined}>
                <strong>Tier {t}</strong>
                <small data-tone={c.ticked > cap ? "amber" : undefined}>
                  {c.ticked} of {cap} places
                </small>
              </button>
            );
          })}
          {unplaced > 0 && (
            <button type="button" onClick={() => (setTab(null), setQ(""))} aria-current={!k && tab === null ? "page" : undefined}>
              <strong>No tier</strong>
              <small>{plural(unplaced, "team")}</small>
            </button>
          )}
        </nav>
      )}

      <div className="ad-lineup__tools">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tiers ? "Search every tier" : "Search teams"} aria-label="Search teams" />
        <button type="button" className="ad-btn ad-btn--quiet" onClick={() => setAll(true)}>
          Tick all
        </button>
        <button type="button" className="ad-btn ad-btn--quiet" onClick={() => setAll(false)}>
          Untick all
        </button>
      </div>
      <p className="ad-note ad-lineup__hint">
        {k
          ? `Teams matching “${q}” in every tier.`
          : tiers > 0 && tab === null
            ? "Teams without a tier. Choose one on a row to place it, then tick it."
            : tiers > 0
              ? `Every team that plays in Tier ${tab}${tabCount ? ` (${tabCount.all})` : ""}. Tick the ones taking part.${ranked ? " Moving a team to another tier changes its tier when you save." : ""}`
              : "Tick the teams taking part."}
      </p>

      {shown.length ? (
        <ul className="ad-lineup__list">
          {shown.map((r) => {
            const p = picks.get(r.teamId)!;
            return (
              <li key={r.teamId} data-on={p.checked ? "" : undefined}>
                <label className="ad-check ad-lineup__pick">
                  <input type="checkbox" checked={p.checked} onChange={(e) => set(r.teamId, { checked: e.target.checked })} disabled={tiers > 0 && !p.tier} />
                  <span className="ad-row__crest" aria-hidden>
                    {r.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                      <img src={r.logo} alt="" />
                    ) : (
                      r.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="ad-lineup__name">
                    <strong>
                      {r.name}
                      {r.tag && <small className="ad-row__tag">{r.tag}</small>}
                    </strong>
                    <small>
                      {plural(r.players, "player")}
                      {r.note && ` · ${r.note}`}
                    </small>
                  </span>
                  {r.registered && !p.checked && <span className="ad-chip" data-tone="leaving">Leaving</span>}
                  {!r.registered && p.checked && <span className="ad-chip" data-tone="upcoming">Joining</span>}
                </label>
                {tiers > 0 && (
                  <label className="ad-lineup__tier">
                    <span>Tier</span>
                    <select aria-label={`Tier for ${r.name}`} value={p.tier ?? ""} onChange={(e) => set(r.teamId, { tier: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">None</option>
                      {Array.from({ length: tiers }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ad-empty">{q ? "No teams match that search." : "No teams in this tier yet. Add a team under Teams, or move one here from another tier."}</p>
      )}

      <SaveBar
        state={state}
        toast={toast}
        pending={pending}
        disabled={over.length > 0}
        label="Save teams"
        idle={over.length ? `Tier ${over.join(", ")} has more than ${cap} teams ticked. Untick some first.` : `${summary.join(" · ")}. Each brings its current roster.`}
      />
    </form>
  );
}
