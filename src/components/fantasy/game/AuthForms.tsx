"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { adoptSession, forgot, join, previewSignIn, rename, resetPassword, signIn, type AuthState } from "@/lib/fantasy/actions";
import { fantasyPage } from "@/content/fantasy";
import { Icon } from "@/components/Icons";

const copy = fantasyPage.auth;

function Field({ label, name, type = "text", hint, error, ...rest }: { label: string; name: string; type?: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `fx-${name}`;
  return (
    <label className="fx-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={name} type={type} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-note` : undefined} {...rest} />
      {(error || hint) && (
        <small id={`${id}-note`} className={error ? "fx-field__error" : undefined}>
          {error ?? hint}
        </small>
      )}
    </label>
  );
}

function Alert({ state }: { state: AuthState }) {
  if (!state.error) return null;
  return (
    <p className="fx-alert" role="alert">
      <Icon name="warning" size={15} />
      {state.error}
    </p>
  );
}

function Sent({ children }: { children: React.ReactNode }) {
  return (
    <div className="fx-sent" role="status">
      <span className="fx-sent__icon">
        <Icon name="check" size={20} />
      </span>
      <p>{children}</p>
    </div>
  );
}

export function JoinForm() {
  const c = copy.join;
  const [state, action, pending] = useActionState<AuthState, FormData>(join, {});
  if (state.sent) return <Sent>{c.sent(state.sent)}</Sent>;
  return (
    <form action={action} className="fx-form" noValidate>
      <Field label={c.displayName} name="displayName" autoComplete="nickname" maxLength={20} required autoFocus error={state.fields?.displayName} hint={fantasyPage.account.nameHint} />
      <Field label={c.email} name="email" type="email" autoComplete="email" required error={state.fields?.email} />
      <Field label={c.password} name="password" type="password" autoComplete="new-password" minLength={8} required error={state.fields?.password} hint={c.passwordHint} />
      <Alert state={state} />
      <button className="fx-btn fx-btn--primary" disabled={pending}>
        {pending ? c.pending : c.submit}
      </button>
      <p className="fx-form__alt">
        {c.have} <Link href="/fantasy/login">{fantasyPage.guest.signIn}</Link>
      </p>
    </form>
  );
}

export function LoginForm({ next, previewing }: { next: string; previewing: boolean }) {
  const c = copy.login;
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="fx-form" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label={c.email} name="email" type="email" autoComplete="username" required autoFocus />
      <Field label={c.password} name="password" type="password" autoComplete="current-password" required />
      <Link className="fx-form__forgot" href="/fantasy/forgot">
        {c.forgot}
      </Link>
      <Alert state={state} />
      <button className="fx-btn fx-btn--primary" disabled={pending}>
        {pending ? c.pending : c.submit}
      </button>
      <p className="fx-form__alt">
        {c.none} <Link href="/fantasy/join">{fantasyPage.guest.join}</Link>
      </p>
      {previewing && (
        <button className="fx-btn fx-btn--ghost" formAction={previewSignIn} formNoValidate>
          {copy.preview}
        </button>
      )}
    </form>
  );
}

export function ForgotForm() {
  const c = copy.forgot;
  const [state, action, pending] = useActionState<AuthState, FormData>(forgot, {});
  if (state.sent) return <Sent>{c.sent(state.sent)}</Sent>;
  return (
    <form action={action} className="fx-form" noValidate>
      <Field label={copy.login.email} name="email" type="email" autoComplete="email" required autoFocus error={state.fields?.email} />
      <Alert state={state} />
      <button className="fx-btn fx-btn--primary" disabled={pending}>
        {pending ? c.pending : c.submit}
      </button>
    </form>
  );
}

export function ResetForm() {
  const c = copy.reset;
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, {});
  return (
    <form action={action} className="fx-form" noValidate>
      <Field label={copy.join.password} name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus error={state.fields?.password} hint={copy.join.passwordHint} />
      <Alert state={state} />
      <button className="fx-btn fx-btn--primary" disabled={pending}>
        {pending ? c.pending : c.submit}
      </button>
    </form>
  );
}

export function NameForm({ current }: { current: string | null }) {
  const c = fantasyPage.account;
  const [state, action, pending] = useActionState<AuthState, FormData>(rename, {});
  return (
    <form action={action} className="fx-form fx-form--row" noValidate>
      <Field label={c.name} name="displayName" defaultValue={current ?? ""} maxLength={20} autoComplete="nickname" required error={state.fields?.displayName} hint={c.nameHint} />
      <Alert state={state} />
      <div className="fx-form__actions">
        <button className="fx-btn fx-btn--primary" disabled={pending}>
          {pending ? copy.reset.pending : c.save}
        </button>
        {state.saved && !pending && (
          <span className="fx-saved" role="status" key={state.saved}>
            <Icon name="check" size={14} />
            {c.saved}
          </span>
        )}
      </div>
    </form>
  );
}

/** Where confirmation and reset emails land: the session arrives in the address's #fragment. */
export function Welcome() {
  const [error, setError] = useState<string>();
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Take the tokens out of the address bar and history straight away.
    history.replaceState(null, "", window.location.pathname);
    const failed = hash.get("error_description");
    const result = failed
      ? Promise.resolve({ error: failed.replace(/\+/g, " ") })
      : adoptSession(hash.get("access_token") ?? "", hash.get("refresh_token") ?? "", hash.get("type") ?? "");
    result.then((res) => res && setError(res.error));
  }, []);
  if (!error)
    return (
      <p className="fx-checking" role="status">
        <span className="fx-spinner" aria-hidden />
        {copy.welcome.checking}
      </p>
    );
  return (
    <div className="fx-form">
      <p className="fx-alert" role="alert">
        <Icon name="warning" size={15} />
        {error}
      </p>
      <Link className="fx-btn fx-btn--primary" href="/fantasy/login">
        {copy.welcome.failed}
      </Link>
    </div>
  );
}
