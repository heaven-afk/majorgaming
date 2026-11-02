"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icons";
import type { FormState } from "./Form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** A small form around a bound Server Action, with its error or "done" line and a submit button. */
export default function ActionForm({ action, submit, pending: pendingLabel = "Saving…", done = "Done.", className, tone = "primary", confirm, children }: { action: Action; submit: string; pending?: string; done?: string; className?: string; tone?: "primary" | "quiet" | "danger"; confirm?: string; children?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state.error && (
        <p className="ad-alert ad-alert--error" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="ad-alert ad-alert--ok" role="status">
          <Icon name="check" size={14} /> {done}
        </p>
      )}
      <button className={`ad-btn ad-btn--${tone}`} disabled={pending}>
        {pending ? pendingLabel : submit}
      </button>
    </form>
  );
}
