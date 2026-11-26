"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { fantasyPage } from "@/content/fantasy";
import { fantasyCards } from "@/content/fantasy-cards";
import { saveSquad, transfer, type PlayResult } from "@/lib/fantasy/actions";
import type { Lineup, Player } from "@/lib/fantasy/game";
import type { FantasyChip, FantasyRole } from "@/lib/fantasy/client";
import { Icon } from "@/components/Icons";
import { Headshot } from "./Headshot";
import { PlayerTile } from "./PlayerTile";
import { Select } from "./Select";

const copy = fantasyPage.picker;
const tcopy = fantasyPage.transfer;
const ROLES: FantasyRole[] = ["Fragger", "IGL", "Support", "Anchor"];
const BUDGET = 100;
const PER_TEAM = 2;
const SHORT: Record<FantasyRole | "Sub", string> = { Fragger: "FRG", IGL: "IGL", Support: "SUP", Anchor: "ANC", Sub: "SUB" };

type Slot = FantasyRole | "Sub";
type Sort = "price" | "cheap" | "name";
const SORTS: Sort[] = ["price", "cheap", "name"];
type Draft = { slots: Record<Slot, string | null>; captain: string | null; chip: FantasyChip };

const draftOf = (l: Lineup | null): Draft => {
  const slots = { Fragger: null, IGL: null, Support: null, Anchor: null, Sub: null } as Draft["slots"];
  if (l) {
    for (const s of l.starters) slots[s.role] = s.playerId;
    slots.Sub = l.sub || null;
  }
  return { slots, captain: l?.captain || null, chip: l?.chip ?? null };
};
const lineupOf = (d: Draft): Lineup => ({
  starters: ROLES.map((role) => ({ playerId: d.slots[role]!, role })),
  sub: d.slots.Sub!,
  captain: d.captain!,
  chip: d.chip,
});
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);
const fmt = (n: number) => n.toFixed(1);
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** `retry`: the last try got no answer, so the request must go again exactly as it was. */
type Alert = { title: string; body: string };
export type Notice = { tone: "locked" | "info"; title: string; body: string };

type Pending = { out: string; in: string; useFree: boolean; key: string; updatedAt?: string | null; retry?: boolean };

/**
 * Picking and changing a squad. Without a squad: fill four roles and the sub from the market.
 * With one: roles, captain and chip change freely; a player changes only through a transfer
 * (one out, one in, −4 points unless it's the free one). Fantasy Core checks everything again.
 */
export default function SquadBuilder({
  players,
  squad,
  previous,
  open,
  transferReason,
  notice,
  deadline,
  chips,
}: {
  players: Player[];
  squad: Lineup | null;
  previous: Lineup | null;
  open: boolean;
  transferReason: string | null;
  notice: Notice | null;
  deadline: string | null;
  chips: { triple_captain: boolean; bench_boost: boolean; free_transfer: boolean };
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const saved = useMemo(() => draftOf(squad), [squad]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [active, setActive] = useState<Slot | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [sort, setSort] = useState<Sort>("price");
  const [expired, setExpired] = useState(false);
  const marketRef = useRef<HTMLDivElement>(null);
  const lineupRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  // Desktop keeps the line-up in view without an inner scrollbar: CSS sticks it by its top,
  // or by its bottom when it's taller than the screen.
  useEffect(() => {
    const el = lineupRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => el.style.setProperty("--fx-lineup-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The success toast goes by itself.
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const end = deadline ? Date.parse(deadline) : NaN;
    if (!Number.isFinite(end)) return;
    let timer = 0;
    const check = () => {
      const remaining = end - Date.now();
      if (remaining <= 0) setExpired(true);
      else timer = window.setTimeout(check, Math.min(remaining, 2147483647));
    };
    check();
    return () => window.clearTimeout(timer);
  }, [deadline]);

  // A fresh squad from the server (after a save or transfer) resets the draft.
  const [base, setBase] = useState(saved);
  if (base !== saved) {
    setBase(saved);
    setDraft(saved);
  }

  const editing = Boolean(squad);
  const readOnly = !open || expired;
  const ids = Object.values(draft.slots).filter(Boolean) as string[];
  const spent = ids.reduce((n, id) => n + (byId.get(id)?.price ?? 0), 0);
  const perTeam = ids.reduce((m, id) => m.set(byId.get(id)?.team.key ?? "", (m.get(byId.get(id)?.team.key ?? "") ?? 0) + 1), new Map<string, number>());
  const complete = ids.length === 5 && Boolean(draft.captain && ROLES.some((r) => draft.slots[r] === draft.captain));
  const dirty = !same(draft, saved);
  const out = replacing ? byId.get(replacing) : undefined;

  const teams = useMemo(() => [...new Map(players.filter(p => p.team.name).map((p) => [p.team.key, p.team.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [players]);

  /** Why a player can't be added right now, or undefined if they can. */
  function blocked(p: Player): string | undefined {
    if (!p.eligible) return copy.why.ineligible;
    if (ids.includes(p.id)) return copy.why.picked;
    const outPrice = out?.price ?? 0;
    if (spent - outPrice + p.price > BUDGET + 1e-9) return copy.why.budget;
    const sameTeam = (perTeam.get(p.team.key) ?? 0) - (out && out.team.key === p.team.key ? 1 : 0);
    if (sameTeam >= PER_TEAM) return copy.why.team;
  }

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return players
      .filter((p) => (!team || p.team.key === team) && (!needle || `${p.name} ${p.ign ?? ""} ${p.team.name}`.toLowerCase().includes(needle)))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : (sort === "price" ? b.price - a.price : a.price - b.price) || a.name.localeCompare(b.name)));
  }, [players, q, team, sort]);

  /** Tapping a card that can't be picked says why, instead of doing nothing. */
  function explain(p: Player, why: string | undefined) {
    const a = copy.alerts;
    if (why === copy.why.ineligible) setAlert({ title: a.ineligible.title(p.name), body: a.ineligible.body });
    else if (why === copy.why.budget) setAlert({ title: a.budget.title, body: a.budget.body(p.name, p.price, BUDGET - spent + (out?.price ?? 0), out?.name) });
    else if (why === copy.why.team) setAlert({ title: a.team.title, body: a.team.body(p.team.name) });
    else if (editing && !replacing) setAlert(a.chooseOut);
  }

  function chooseSlot(slot: Slot) {
    if (readOnly) return;
    setMessage(null);
    setReplacing(null);
    setActive((a) => (a === slot ? null : slot));
    if (!draft.slots[slot]) marketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function add(p: Player) {
    if (readOnly) return;
    setMessage(null);
    if (replacing) {
      if (transferReason) { setAlert({ title: copy.alerts.closed, body: transferReason }); return; }
      setTransferError(null);
      setPending({ out: replacing, in: p.id, useFree: chips.free_transfer, key: newKey(), updatedAt: squad?.updatedAt });
      return;
    }
    const slot = active && !draft.slots[active] ? active : ([...ROLES, "Sub"] as Slot[]).find((s) => !draft.slots[s]);
    if (!slot) { setAlert(copy.alerts.full); return; }
    setDraft((d) => {
      const slots = { ...d.slots, [slot]: p.id };
      // The first starter picked is captain until they choose.
      const captain = d.captain ?? (slot !== "Sub" ? p.id : null);
      return { ...d, slots, captain };
    });
    setActive(null);
  }

  function remove(slot: Slot) {
    setDraft((d) => ({ ...d, slots: { ...d.slots, [slot]: null }, captain: d.captain === d.slots[slot] ? null : d.captain }));
    setActive(null);
  }

  function swapWithSub(slot: FantasyRole) {
    setDraft((d) => {
      const starter = d.slots[slot];
      const sub = d.slots.Sub;
      return { ...d, slots: { ...d.slots, [slot]: sub, Sub: starter }, captain: d.captain === starter ? sub : d.captain };
    });
    setActive(null);
  }

  function swapRoles(a: FantasyRole, b: FantasyRole) {
    setDraft((d) => ({ ...d, slots: { ...d.slots, [a]: d.slots[b], [b]: d.slots[a] } }));
    setActive(null);
  }

  function save(lineup: Lineup) {
    if (readOnly) return;
    setMessage(null);
    start(async () => {
      const res = await saveSquad(lineup);
      if (res.ok) {
        setMessage(copy.saved);
        router.refresh();
      } else setAlert({ title: copy.alerts.notSaved, body: res.error });
    });
  }

  function confirmTransfer() {
    if (!pending || readOnly) return;
    if (transferReason) { setAlert({ title: copy.alerts.closed, body: transferReason }); setPending(null); return; }
    const p = pending;
    start(async () => {
      const res: PlayResult = await transfer({ playerOutId: p.out, playerInId: p.in, useFreeTransferChip: p.useFree, ...(p.updatedAt ? { expectedSquadUpdatedAt: p.updatedAt } : {}) }, p.key);
      if (res.ok) {
        setPending(null);
        setReplacing(null);
        setActive(null);
        setTransferError(null);
        setMessage(tcopy.done(res.receipt?.penaltyApplied ?? 0));
        router.refresh();
      } else {
        // An unknown outcome keeps the same key and body, so trying again can't charge twice.
        setPending({ ...p, key: res.retry ? p.key : newKey(), retry: res.retry });
        setTransferError(res.error);
      }
    });
  }

  const activePlayer = active ? draft.slots[active] : null;
  // Tapping a player brings their actions into view, so they can't be missed below the fold.
  useEffect(() => {
    const el = actionsRef.current;
    if (!active || !activePlayer || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    el.querySelector<HTMLButtonElement>(".fx-actions__list button")?.focus({ preventScroll: true });
  }, [active, activePlayer]);
  const closeAlert = useCallback(() => setAlert(null), []);
  const banner = expired ? (notice?.tone === "locked" ? notice : copy.expired) : notice;
  const shows = !readOnly && (squad || !previous);
  const captainName = draft.captain ? byId.get(draft.captain)?.name : undefined;
  const hint = readOnly ? (squad ? copy.closed : "") : editing ? copy.hintEdit : copy.hintNew;
  const saveButton = (className = "") => (
    <button className={`fx-btn fx-btn--primary ${className}`} disabled={!complete || !dirty || busy || readOnly} onClick={() => save(lineupOf(draft))}>
      {busy && !pending ? copy.saving : copy.save}
    </button>
  );

  return (
    <div className="fx-builder" data-readonly={readOnly ? "" : undefined}>
      {banner && (
        <section className="fx-notice" data-tone={banner.tone} role="status" aria-live="polite">
          <span className="fx-notice__icon" aria-hidden>
            <Icon name={banner.tone === "locked" ? "lock" : "calendar"} size={20} />
          </span>
          <div>
            <h2>{banner.title}</h2>
            <p>{banner.body}</p>
          </div>
        </section>
      )}
      {shows && (
        <section className="fx-summary" aria-label={copy.summary}>
          <div className="fx-summary__stat fx-summary__budget">
            <small>{copy.budget}</small>
            <b>
              {fmt(BUDGET - spent)}
              <span> cr</span>
            </b>
            <span className="fx-meter" aria-hidden>
              <i style={{ width: `${Math.min(100, (spent / BUDGET) * 100)}%` }} />
            </span>
          </div>
          <div className="fx-summary__stat">
            <small>{copy.selected}</small>
            <b>
              {ids.length}
              <span>/5</span>
            </b>
          </div>
          <div className="fx-summary__stat fx-summary__wide">
            <small>{copy.captain}</small>
            <b className="fx-summary__name">{captainName ?? "None yet"}</b>
          </div>
          <div className="fx-summary__stat fx-summary__wide">
            <small>{copy.freeTransfer}</small>
            <b data-tone={chips.free_transfer ? "amber" : undefined}>{chips.free_transfer ? "Ready" : "Used"}</b>
          </div>
          {saveButton("fx-summary__save")}
        </section>
      )}

      <section className="fx-lineup" ref={lineupRef} aria-labelledby="fx-lineup-title" hidden={readOnly && !squad}>
        <header className="fx-lineup__head">
          <div>
            <h2 id="fx-lineup-title">{copy.lineup}</h2>
            {hint && <p>{hint}</p>}
          </div>
          <span className="fx-lineup__rule">{copy.perTeam}</span>
        </header>

        {previous && !squad && open && (
          <div className="fx-carry">
            <div>
              <strong>{fantasyPage.hub.carry.title}</strong>
              <p>{fantasyPage.hub.carry.body}</p>
            </div>
            <button className="fx-btn fx-btn--primary" disabled={busy || readOnly} onClick={() => save({ ...previous, chip: null })}>
              {busy ? copy.saving : "Carry over"}
            </button>
          </div>
        )}

        <ul className="fx-strip">
          {([...ROLES, "Sub"] as Slot[]).map((slot) => (
            <li key={slot} data-sub={slot === "Sub" ? "" : undefined}>
              <SlotCard slot={slot} player={draft.slots[slot] ? byId.get(draft.slots[slot]!) : undefined} captain={slot !== "Sub" && draft.captain === draft.slots[slot] && Boolean(draft.slots[slot])} chip={draft.chip} active={active === slot} onClick={() => chooseSlot(slot)} readOnly={readOnly} />
            </li>
          ))}
        </ul>
        <p className="fx-strip__note">
          <b>{copy.bench}</b> {draft.chip === "bench_boost" ? copy.benchBoosted : copy.benchHint}
        </p>

        {active && activePlayer && !readOnly && (
          <div className="fx-actions" ref={actionsRef} role="group" aria-label={`${byId.get(activePlayer)?.name}`}>
            <div className="fx-actions__who">
              <Headshot src={byId.get(activePlayer)?.photo} team={byId.get(activePlayer)?.team.name} size={36} />
              <span>
                <strong>{byId.get(activePlayer)?.name}</strong>
                <small>
                  {active === "Sub" ? copy.sub : active}{byId.get(activePlayer)?.team.name && " · " + byId.get(activePlayer)?.team.name}
                </small>
              </span>
              <button className="fx-actions__close" onClick={() => setActive(null)} aria-label="Close">
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="fx-actions__list">
              {active !== "Sub" && draft.captain !== activePlayer && (
                <button className="fx-chip-btn fx-chip-btn--accent" onClick={() => (setDraft((d) => ({ ...d, captain: activePlayer })), setActive(null))}>
                  <Icon name="crown" size={14} />
                  {copy.makeCaptain}
                </button>
              )}
              {active !== "Sub" && draft.slots.Sub && (
                <button className="fx-chip-btn" onClick={() => swapWithSub(active)}>
                  {copy.swapSub}
                </button>
              )}
              {active !== "Sub" &&
                ROLES.filter((r) => r !== active && draft.slots[r]).map((r) => (
                  <button key={r} className="fx-chip-btn" onClick={() => swapRoles(active, r)}>
                    Play as {r}
                  </button>
                ))}
              {editing ? (
                <button
                  className="fx-chip-btn"
                  aria-disabled={transferReason ? true : undefined}
                  onClick={() => {
                    if (transferReason) return setAlert({ title: copy.alerts.closed, body: transferReason });
                    setReplacing(activePlayer);
                    setActive(null);
                    marketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <Icon name="undo" size={14} />
                  {copy.transfer}
                </button>
              ) : (
                <button className="fx-chip-btn fx-chip-btn--danger" onClick={() => remove(active)}>
                  <Icon name="close" size={14} />
                  {copy.remove}
                </button>
              )}
            </div>
          </div>
        )}

        {shows && (
          <fieldset className="fx-chips">
            <legend>{copy.chips.title}</legend>
            <div className="fx-chips__options">
              {([null, "triple_captain", "bench_boost"] as const).map((c) => {
                const usable = c === null || chips[c] || saved.chip === c;
                return (
                  <label key={c ?? "none"} data-off={usable ? undefined : ""}>
                    <input type="radio" name="chip" checked={draft.chip === c} disabled={!usable} onChange={() => setDraft((d) => ({ ...d, chip: c }))} />
                    <span>
                      <b>{c ? copy.chips[c] : copy.chips.none}</b>
                      <small>{!usable ? copy.chips.used : copy.chips.about[c ?? "none"]}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </section>

      {shows && (
        <section className="fx-market" ref={marketRef} aria-labelledby="fx-market-title">
          <header className="fx-market__head">
            <div className="fx-market__title">
              <h2 id="fx-market-title">{copy.players}</h2>
              <p>
                {list.length} of {players.length}
              </p>
            </div>
            {out ? (
              <p className="fx-replacing">
                <Icon name="undo" size={15} />
                <span>{tcopy.choosing(out.name)}</span>
                <button onClick={() => setReplacing(null)} aria-label={tcopy.cancel}>
                  <Icon name="close" size={14} />
                </button>
              </p>
            ) : (
              active &&
              !draft.slots[active] && (
                <p className="fx-replacing fx-replacing--soft">
                  <Icon name="plus" size={15} />
                  <span>{copy.pickFor(active === "Sub" ? "sub" : active)}</span>
                  <button onClick={() => setActive(null)} aria-label="Stop choosing">
                    <Icon name="close" size={14} />
                  </button>
                </p>
              )
            )}
            <div className="fx-filters">
              <label className="fx-search">
                <Icon name="search" size={15} />
                <span className="sr-only">{copy.search}</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.search} />
              </label>
              <Select label="Team" value={team} onChange={setTeam} searchable options={[{ value: "", label: copy.allTeams }, ...teams.map(([value, label]) => ({ value, label }))]} />
              <Select label="Sort" value={sort} onChange={(v) => setSort(v as Sort)} align="end" options={SORTS.map((value) => ({ value, label: copy.sort[value] }))} />
            </div>
          </header>

          <ul className="fx-market-grid">
            {list.map((p) => {
              const why = blocked(p);
              const can = !why && (Boolean(replacing) || !editing);
              const picked = why === copy.why.picked;
              return (
                <li key={p.id} data-off={why && !picked ? "" : undefined} data-picked={picked ? "" : undefined}>
                  <PlayerTile name={p.name} ign={p.ign} team={p.team.name} logo={p.team.logo} photo={p.photo} price={p.price} action={
                    <button className="fx-player-select" disabled={picked} aria-disabled={!can && !picked ? true : undefined} onClick={() => (can ? add(p) : explain(p, why))} aria-label={`${replacing ? "Bring in" : "Add"} ${p.name}`}>
                      <span>{why ?? (replacing ? fantasyCards.labels.bringIn : fantasyCards.labels.select)}</span>
                      <Icon name={picked ? "check" : replacing ? "undo" : "plus"} size={14} />
                    </button>
                  } />
                </li>
              );
            })}
            {!list.length && <li className="fx-market-grid__empty">{copy.empty}</li>}
          </ul>
        </section>
      )}

      {shows && (
        <div className="fx-bar">
          <div className="fx-bar__budget">
            <span>
              <b>{fmt(BUDGET - spent)}</b> cr {copy.left} · {ids.length}/5
            </span>
            <span className="fx-meter" aria-hidden>
              <i style={{ width: `${Math.min(100, (spent / BUDGET) * 100)}%` }} />
            </span>
          </div>
          {saveButton()}
        </div>
      )}

      {message && (
        <p className="fx-toast" role="status">
          <Icon name="check" size={15} />
          {message}
        </p>
      )}

      {alert && <AlertSheet alert={alert} onClose={closeAlert} />}

      {pending && (
        <TransferSheet
          pending={pending}
          out={byId.get(pending.out)!}
          into={byId.get(pending.in)!}
          credits={BUDGET - spent + (byId.get(pending.out)?.price ?? 0) - (byId.get(pending.in)?.price ?? 0)}
          freeAvailable={chips.free_transfer}
          busy={busy}
          error={transferError}
          closed={readOnly || Boolean(transferReason)}
          onFree={(useFree) => setPending({ ...pending, useFree, key: newKey() })}
          // Closing after a lost answer: refresh, in case the transfer did go through.
          onCancel={() => (pending.retry && router.refresh(), setPending(null), setTransferError(null))}
          onConfirm={confirmTransfer}
        />
      )}
    </div>
  );
}

function SlotCard({ slot, player, captain, chip, active, onClick, readOnly }: { slot: Slot; player?: Player; captain: boolean; chip: FantasyChip; active: boolean; onClick: () => void; readOnly: boolean }) {
  const label = slot === "Sub" ? copy.sub : slot;
  return (
    <button
      type="button"
      className="fx-slot"
      data-empty={player ? undefined : ""}
      data-active={active ? "" : undefined}
      data-captain={captain ? "" : undefined}
      onClick={onClick}
      disabled={readOnly}
      aria-pressed={active}
      aria-label={player ? `${label}: ${player.name}${captain ? ", captain" : ""}` : `${label}: empty, choose a player`}
    >
      <PlayerTile
        role={SHORT[slot]}
        name={player ? player.name : `Add ${SHORT[slot]}`}
        team={player ? player.team.name : copy.tapToPick}
        photo={player?.photo}
        ign={player?.ign}
        logo={player?.team.logo}
        price={player?.price}
        captain={captain ? (chip === "triple_captain" ? "3×" : "C") : undefined}
        empty={!player}
        sub={slot === "Sub"}
      />
    </button>
  );
}

function TransferSheet({
  pending,
  out,
  into,
  credits,
  freeAvailable,
  busy,
  error,
  closed,
  onFree,
  onCancel,
  onConfirm,
}: {
  pending: Pending;
  out: Player;
  into: Player;
  credits: number;
  freeAvailable: boolean;
  busy: boolean;
  error: string | null;
  closed: boolean;
  onFree: (v: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);
  return (
    <div className="fx-sheet" role="dialog" aria-modal="true" aria-labelledby="fx-sheet-title">
      <button className="fx-sheet__scrim" aria-label={tcopy.cancel} onClick={() => !busy && onCancel()} tabIndex={-1} />
      <div className="fx-sheet__card">
        <h2 id="fx-sheet-title">{tcopy.title}</h2>
        <div className="fx-swap">
          {[
            { tag: tcopy.out, p: out },
            { tag: tcopy.in, p: into },
          ].map(({ tag, p }) => (
            <div key={tag} className="fx-swap__side" data-side={tag.toLowerCase()}>
              <small>{tag}</small>
              <PlayerTile name={p.name} ign={p.ign} team={p.team.name} logo={p.team.logo} photo={p.photo} price={p.price} />
            </div>
          ))}
          <span className="fx-swap__arrow" aria-hidden>
            <Icon name="arrow" size={18} />
          </span>
        </div>
        <dl className="fx-sheet__facts">
          <div>
            <dt>{tcopy.cost}</dt>
            <dd data-tone={pending.useFree ? "free" : "penalty"}>{pending.useFree ? tcopy.free : tcopy.penalty}</dd>
          </div>
          <div>
            <dt>{tcopy.credits}</dt>
            <dd>{credits.toFixed(1)}</dd>
          </div>
        </dl>
        <label className="fx-toggle" data-off={freeAvailable ? undefined : ""}>
          <input type="checkbox" checked={pending.useFree} disabled={!freeAvailable || busy || closed || pending.retry} onChange={(e) => onFree(e.target.checked)} />
          <span className="fx-toggle__track" aria-hidden />
          <span>{freeAvailable ? tcopy.useFree : tcopy.freeUsed}</span>
        </label>
        {error && (
          <p className="fx-sheet__error" role="alert">
            <Icon name="warning" size={15} />
            {error}
          </p>
        )}
        <div className="fx-sheet__actions">
          <button className="fx-btn fx-btn--ghost" onClick={onCancel} disabled={busy}>
            {tcopy.cancel}
          </button>
          <button className="fx-btn fx-btn--primary" ref={confirmRef} onClick={onConfirm} disabled={busy || closed}>
            {busy ? tcopy.pending : pending.retry ? tcopy.retry : tcopy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A blocked action, said where it can't be missed. */
function AlertSheet({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fx-sheet fx-popup" role="alertdialog" aria-modal="true" aria-labelledby="fx-popup-title" aria-describedby="fx-popup-body">
      <button className="fx-sheet__scrim" aria-label={copy.alerts.ok} onClick={onClose} tabIndex={-1} />
      <div className="fx-sheet__card">
        <span className="fx-popup__icon" aria-hidden>
          <Icon name="warning" size={22} />
        </span>
        <div className="fx-popup__text">
          <h2 id="fx-popup-title">{alert.title}</h2>
          <p id="fx-popup-body">{alert.body}</p>
        </div>
        <button ref={ok} className="fx-btn fx-btn--primary" onClick={onClose}>
          {copy.alerts.ok}
        </button>
      </div>
    </div>
  );
}
