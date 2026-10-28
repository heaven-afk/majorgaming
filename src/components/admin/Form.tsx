"use client";

/** Form pieces shared by every admin editor. */

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

export type Option = { value: string; label: string; hint?: string };
export type FormState = { error?: string; fields?: Record<string, string>; saved?: number; /** Shown in place of "Saved" when a save did more than asked, e.g. moved a player. */ notice?: string };

export function Field({ name, label, hint, error, children }: { name: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="ad-field" data-invalid={error ? "" : undefined}>
      <label htmlFor={`f-${name}`}>{label}</label>
      {children}
      {error ? (
        <small className="ad-field__error" id={`f-${name}-error`}>
          {error}
        </small>
      ) : (
        hint && <small>{hint}</small>
      )}
    </div>
  );
}

/** Props that mark an input invalid and point it at its message. */
export const invalid = (fields: Record<string, string> | undefined, key: string) =>
  fields?.[key] ? { "aria-invalid": true as const, "aria-describedby": `f-${key}-error` } : {};

/** Radio buttons drawn as a segmented switch. */
export function Choice({ name, label, options, value, onChange }: { name: string; label: string; options: readonly Option[]; value: string; onChange?: (v: string) => void }) {
  return (
    <fieldset className="ad-choice">
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <label key={o.value} data-value={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange?.(o.value)} />
            <span>
              {o.label}
              {o.hint && <small>{o.hint}</small>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Section({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section className="ad-section">
      <header>
        <h2>{title}</h2>
        {lede && <p>{lede}</p>}
      </header>
      <div className="ad-section__body">{children}</div>
    </section>
  );
}

/** "Saved" for a few seconds after each save; `onLoad` covers a save that ended in a redirect. */
export function useSavedToast(state: FormState, onLoad?: boolean) {
  const stamp = state.saved ?? (onLoad ? 1 : 0);
  const [hidden, setHidden] = useState(0);
  useEffect(() => {
    if (!stamp) return;
    const t = setTimeout(() => setHidden(stamp), 3200);
    return () => clearTimeout(t);
  }, [stamp]);
  return stamp !== 0 && hidden !== stamp && !state.error;
}

/** Moves focus to the first field with an error after a save comes back. */
export function useFocusError(state: FormState) {
  useEffect(() => {
    if (state.error) document.querySelector<HTMLElement>(".ad-field[data-invalid] input, .ad-field[data-invalid] textarea, .ad-field[data-invalid] select")?.focus();
  }, [state]);
}

export function SaveBar({ state, toast, pending, label, idle }: { state: FormState; toast: boolean; pending: boolean; label: string; idle: string }) {
  return (
    <div className="ad-savebar">
      <p aria-live="polite" className="ad-savebar__msg" data-tone={state.error ? "error" : toast ? "ok" : undefined}>
        {state.error ? (
          state.error
        ) : toast ? (
          <>
            <Icon name="check" size={16} /> {state.notice ?? "Saved. Live on the site."}
          </>
        ) : (
          idle
        )}
      </p>
      <button className="ad-btn ad-btn--primary" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

/**
 * Submits through a transition instead of the form's own action, so what was typed stays put
 * when a save comes back with errors (a form action resets the fields).
 */
export function submitWith(formAction: (data: FormData) => void, start: (fn: () => void) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(() => formAction(data));
  };
}
