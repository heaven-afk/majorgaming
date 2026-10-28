"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** Deleting takes the event's tables, registrations and results with it, so it asks for the name. */
export default function DeleteEvent({ action, name, squads }: { action: Action; name: string; squads: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <section className="ad-danger">
      <header>
        <h2>Delete event</h2>
        <p>
          Removes the event page{squads > 0 ? `, its ${squads} registrations` : ""} and every table and result in it. This can&apos;t be undone.
        </p>
      </header>
      {open ? (
        <form action={formAction} className="ad-danger__form">
          <input type="hidden" name="expected" value={name} />
          <label className="ad-field">
            <span>
              Type <strong>{name}</strong> to confirm
            </span>
            <input name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </label>
          {state.error && (
            <p className="ad-alert ad-alert--error" role="alert">
              {state.error}
            </p>
          )}
          <div className="ad-danger__actions">
            <button type="button" className="ad-btn ad-btn--quiet" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="ad-btn ad-btn--danger" disabled={pending || typed.trim() !== name}>
              {pending ? "Deleting…" : "Delete for good"}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="ad-btn ad-btn--danger-quiet" onClick={() => setOpen(true)}>
          Delete this event
        </button>
      )}
    </section>
  );
}
