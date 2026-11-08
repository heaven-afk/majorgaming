"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { adminsCopy as copy, ROLES, type AdminRole } from "@/content/admins";
import type { AdminRow } from "@/lib/admin/actions/admins";
import { Choice, Field, invalid, SaveBar, Section, submitWith, useSavedToast, type FormState } from "./Form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" });
const when = (iso: string) => day.format(new Date(iso));
const roleOptions = ROLES.map((r) => ({ value: r, label: copy.roles[r].label, hint: copy.roles[r].hint }));

/** Owners add admins by email, switch anyone else between Owner and Editor, and remove them. */
export default function AdminsManager({ admins, me, actions }: { admins: AdminRow[]; me: string; actions: { add: Action; role: Action; remove: Action } }) {
  const [added, addAction] = useActionState(actions.add, {});
  const [addPending, startAdd] = useTransition();
  const addToast = useSavedToast(added);
  const [role, setRole] = useState<AdminRole>("editor");
  // Clear the email and password once an admin is added, so the password doesn't linger on screen.
  const addForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (added.saved) addForm.current?.reset();
  }, [added.saved]);

  const [changed, roleAction, rolePending] = useActionState(actions.role, {});
  const [removed, removeAction, removePending] = useActionState(actions.remove, {});
  const [last, setLast] = useState<"role" | "remove">();
  const listState = last === "remove" ? removed : changed;
  const listToast = useSavedToast(listState);
  const busy = rolePending || removePending;

  return (
    <div className="ad-form">
      <form ref={addForm} onSubmit={submitWith(addAction, startAdd)} noValidate className="ad-form">
        <Section title={copy.add.title} lede={copy.add.lede}>
          <Field name="email" label={copy.add.email} error={added.fields?.email}>
            <input id="f-email" name="email" type="email" autoComplete="off" spellCheck={false} placeholder="name@example.com" {...invalid(added.fields, "email")} />
          </Field>
          <Field name="password" label={copy.add.password} hint={copy.add.passwordHint} error={added.fields?.password}>
            <input id="f-password" name="password" type="password" autoComplete="new-password" minLength={8} {...invalid(added.fields, "password")} />
          </Field>
          <Choice name="role" label={copy.add.role} options={roleOptions} value={role} onChange={(v) => setRole(v as AdminRole)} />
        </Section>
        <SaveBar state={added} toast={addToast} pending={addPending} label={copy.add.submit} idle={copy.add.idle} />
      </form>

      <Section title={copy.list.title}>
        <p className="ad-adm__msg" aria-live="polite" data-tone={listState.error ? "error" : listToast ? "ok" : undefined}>
          {listState.error ?? (listToast ? (
            <>
              <Icon name="check" size={14} /> {listState.notice}
            </>
          ) : null)}
        </p>
        <ul className="ad-adm" aria-busy={busy}>
          {admins.map((a) => {
            const self = a.user_id === me;
            return (
              <li key={a.user_id} className="ad-adm__row">
                <span className="ad-adm__face" aria-hidden>
                  {a.email.slice(0, 1).toUpperCase()}
                </span>
                <span className="ad-adm__who">
                  <strong>
                    {a.email}
                    {self && <span className="ad-adm__you">{copy.list.you}</span>}
                  </strong>
                  <small>
                    {copy.list.added(when(a.created_at))} · {a.last_sign_in_at ? copy.list.lastIn(when(a.last_sign_in_at)) : copy.list.never}
                  </small>
                </span>
                {self ? (
                  <span className="ad-adm__role" data-role={a.role}>
                    {copy.roles[a.role].label}
                  </span>
                ) : (
                  <span className="ad-adm__actions">
                    <form action={roleAction} onSubmit={() => setLast("role")} className="ad-adm__switch" role="group" aria-label={`${copy.list.change}: ${a.email}`}>
                      <input type="hidden" name="user" value={a.user_id} />
                      {ROLES.map((r) => (
                        <button key={r} name="role" value={r} aria-pressed={a.role === r} disabled={busy || a.role === r}>
                          {copy.roles[r].label}
                        </button>
                      ))}
                    </form>
                    <form
                      action={removeAction}
                      onSubmit={(e) => {
                        if (!window.confirm(copy.list.confirm(a.email))) e.preventDefault();
                        else setLast("remove");
                      }}
                    >
                      <input type="hidden" name="user" value={a.user_id} />
                      <button className="ad-btn ad-btn--danger-quiet" disabled={busy}>
                        {copy.list.remove}
                      </button>
                    </form>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
