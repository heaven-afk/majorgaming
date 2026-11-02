"use client";

import { useActionState } from "react";
import type { FormState } from "./Form";
import Picker, { type PickOption } from "./Picker";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** Folding a duplicate record into the right one. */
export default function MergeForm({ action, options, noun }: { action: Action; options: PickOption[]; noun: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className="ad-merge"
      onSubmit={(e) => {
        if (!window.confirm(`Merge into the ${noun} you picked? This one is deleted after its history moves over.`)) e.preventDefault();
      }}
    >
      <div className="ad-field">
        <label>Merge into</label>
        <Picker name="into" label={`${noun} to merge into`} options={options} placeholder={`Search ${noun}s`} />
      </div>
      {state.error && (
        <p className="ad-alert ad-alert--error" role="alert">
          {state.error}
        </p>
      )}
      <button className="ad-btn ad-btn--danger-quiet" disabled={pending}>
        {pending ? "Merging…" : "Merge"}
      </button>
    </form>
  );
}
