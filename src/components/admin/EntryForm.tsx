"use client";

import { useActionState, useState, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { lastRoster } from "@/lib/admin/actions/entries";
import { Field, SaveBar, Section, submitWith, useSavedToast, type FormState } from "./Form";
import Picker, { type PickOption } from "./Picker";

type Action = (state: FormState, form: FormData) => Promise<FormState>;
type Slot = { id: number; value: string; label: string; role: string };

const ROLES = ["", "IGL", "Fragger", "Support", "Anchor"];

/** A team's current tier, manager and roster, or one squad's registration for an event: the same fields in both. */
export default function EntryForm({
  action,
  eventSort,
  tiers,
  teams,
  people,
  entry,
  fixedTeam,
  back,
  title,
  lede,
  submit,
  saved,
}: {
  action: Action;
  /** For an event's registration: offers "Copy roster from their last event". */
  eventSort?: number;
  tiers: number;
  teams: PickOption[];
  people: PickOption[];
  entry?: { team: string; tier: number | null; manager: string | null; tag: string | null; players: { value: string; label: string; role: string; captain: boolean }[] };
  /** On a team's own page: the team is set, so there's no team picker. */
  fixedTeam?: string;
  /** Where to go after registering, instead of the event's squad page. */
  back?: string;
  title?: string;
  lede?: string;
  submit?: string;
  saved?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const toast = useSavedToast(state, saved);
  const [team, setTeam] = useState(fixedTeam ?? entry?.team ?? "");
  const [manager, setManager] = useState(entry?.manager ?? "");
  const start = (entry?.players ?? []).map((p, i) => ({ id: i, value: p.value, label: p.label, role: p.role }));
  const [slots, setSlots] = useState<Slot[]>(start.length ? start : [0, 1, 2, 3].map((id) => ({ id, value: "", label: "", role: "" })));
  const [captain, setCaptain] = useState(Math.max(0, entry?.players.findIndex((p) => p.captain) ?? 0));
  const [nextId, setNextId] = useState(100);
  const [copying, startCopy] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const add = () => {
    setSlots((s) => [...s, { id: nextId, value: "", label: "", role: "" }]);
    setNextId((n) => n + 1);
  };
  const remove = (i: number) => {
    setSlots((s) => s.filter((_, j) => j !== i));
    if (captain === i) setCaptain(0);
    else if (captain > i) setCaptain((c) => c - 1);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= slots.length) return;
    setSlots((s) => {
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    if (captain === i) setCaptain(j);
    else if (captain === j) setCaptain(i);
  };

  function copyLast() {
    startCopy(async () => {
      if (eventSort === undefined) return;
      const last = await lastRoster(eventSort, team);
      if (!last) return setCopied("No earlier registration for this team.");
      let id = nextId;
      setSlots(last.players.map((p) => ({ id: id++, value: p.value, label: p.label, role: p.role })));
      setNextId(id);
      setCaptain(Math.max(0, last.players.findIndex((p) => p.captain)));
      if (last.manager) setManager(last.manager);
      setCopied(`Copied ${last.players.length} players from ${last.event}.`);
    });
  }

  const known = (v: string) => v && !v.startsWith("new:");

  return (
    <form className="ad-form" onSubmit={submitWith(formAction, startTransition)} noValidate>
      {back && <input type="hidden" name="back" value={back} />}
      <Section title={title ?? "Team"} lede={lede ?? (fixedTeam ? "Their tier and manager for this event." : "Start typing the team's name. If it has played before, pick it from the list so its history stays together; otherwise it's added as a new team.")}>
        <div className="ad-grid">
          {fixedTeam ? (
            <input type="hidden" name="team" value={fixedTeam} />
          ) : (
            <Field name="team" label="Team" error={state.fields?.team}>
              <Picker name="team" label="Team" options={teams} value={team} allowNew="New team" placeholder="Search teams" onChange={(v) => setTeam(v)} invalid={Boolean(state.fields?.team)} />
            </Field>
          )}
          <Field name="tier" label="Tier">
            <select id="f-tier" name="tier" defaultValue={entry?.tier ?? ""}>
              <option value="">No tier</option>
              {Array.from({ length: tiers }, (_, i) => (
                <option key={i} value={i + 1}>
                  Tier {i + 1}
                </option>
              ))}
            </select>
          </Field>
          {team.startsWith("new:") && (
            <Field name="tag" label="Team tag" hint="Optional, e.g. KZN">
              <input id="f-tag" name="tag" maxLength={12} />
            </Field>
          )}
          <Field name="manager" label="Manager" hint="Optional. Their name or handle, shown on the team page." error={state.fields?.manager}>
            <input id="f-manager" name="manager" value={manager} onChange={(e) => setManager(e.target.value)} maxLength={80} autoComplete="off" placeholder="e.g. Kingsley" />
          </Field>
        </div>
      </Section>

      <Section title="Roster" lede="Type a player's pro name and pick them, or keep typing to add someone new. Anyone already on another team moves to this one when you save. Tap Captain on one player.">
        {known(team) && eventSort !== undefined && (
          <div className="ad-roster__copy">
            <button type="button" className="ad-btn ad-btn--quiet" onClick={copyLast} disabled={copying}>
              {copying ? "Copying…" : "Copy roster from their last event"}
            </button>
            {copied && <span className="ad-note">{copied}</span>}
          </div>
        )}
        <ol className="ad-roster">
          {slots.map((s, i) => (
            <li key={s.id}>
              <span className="ad-roster__n">{i + 1}</span>
              <Picker name="player" label={`Player ${i + 1}`} options={people} value={s.value} allowNew="New player" placeholder="Search players" onChange={(value, label) => setSlots((all) => all.map((x, j) => (j === i ? { ...x, value, label } : x)))} />
              <select name="role" aria-label={`Player ${i + 1} role`} value={s.role} onChange={(e) => setSlots((all) => all.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r || "No role"}
                  </option>
                ))}
              </select>
              <label className="ad-roster__captain">
                <input type="radio" name="captain" value={i} checked={captain === i} onChange={() => setCaptain(i)} aria-label={`Player ${i + 1} is captain`} />
                <span>Captain</span>
              </label>
              <span className="ad-roster__tools">
                <button type="button" className="ad-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move player ${i + 1} up`}>
                  <Icon name="chevron" size={14} className="ad-up" />
                </button>
                <button type="button" className="ad-icon-btn" onClick={() => move(i, 1)} disabled={i === slots.length - 1} aria-label={`Move player ${i + 1} down`}>
                  <Icon name="chevron" size={14} className="ad-down" />
                </button>
                <button type="button" className="ad-icon-btn" onClick={() => remove(i)} aria-label={`Remove player ${i + 1}`}>
                  <Icon name="close" size={14} />
                </button>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" className="ad-btn ad-btn--quiet" onClick={add}>
          <Icon name="plus" size={14} /> Add a player
        </button>
      </Section>

      <SaveBar state={state} toast={toast} pending={pending} label={submit ?? (entry ? "Save changes" : "Add team")} idle="New players and teams are created when you save." />
    </form>
  );
}
