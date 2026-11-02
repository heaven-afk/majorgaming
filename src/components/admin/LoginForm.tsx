"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/admin/actions";
import { adminCopy } from "@/content/admin";

const copy = adminCopy.login;

export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="ad-login__form">
      <label className="ad-field">
        <span>{copy.email}</span>
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="ad-field">
        <span>{copy.password}</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && (
        <p className="ad-alert ad-alert--error" role="alert">
          {state.error}
        </p>
      )}
      <button className="ad-btn ad-btn--primary ad-btn--wide" disabled={pending}>
        {pending ? copy.pending : copy.submit}
      </button>
    </form>
  );
}
