"use client";

import { useActionState, useState, useTransition } from "react";
import { slugify } from "@/lib/slug";
import { Field, invalid, SaveBar, Section, submitWith, useFocusError, useSavedToast, type FormState } from "./Form";
import ImageField from "./ImageField";

type Action = (state: FormState, form: FormData) => Promise<FormState>;
type Values = { name: string; slug: string; tag?: string | null; clan?: string | null; ign?: string | null; country?: string | null; image?: string | null; archived: boolean };


/** Teams and people share one editor: name, address, a picture, the extra fields, archive. */
export default function TeamForm({ kind, action, values, countries, saved }: { kind: "team" | "person"; action: Action; values?: Values; countries?: { code: string; name: string }[]; saved?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const toast = useSavedToast(state, saved);
  useFocusError(state);
  const f = state.fields;
  const [name, setName] = useState(values?.name ?? "");
  const [slug, setSlug] = useState(values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(values));
  const base = kind === "team" ? "/teams/" : "player ";

  return (
    <form className="ad-form" onSubmit={submitWith(formAction, startTransition)} noValidate>
      <Section title={kind === "team" ? "Name and logo" : "Player"} lede={kind === "team" ? "A new name shows on the team page and on events that aren't finished; finished events keep the name they played under. Old names are remembered, so older sheets still match." : "The pro name is who they are everywhere on the site and in sheets. The in-game name is shown beside it and updates from kill sheets."}>
        <div className="ad-grid">
          <Field name="name" label={kind === "team" ? "Team name" : "Pro name"} error={f?.name}>
            <input
              id="f-name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              {...invalid(f, "name")}
            />
          </Field>
          <Field name="slug" label="Page link" hint={kind === "team" ? `${base}${slug || "…"}` : undefined} error={f?.slug}>
            <input
              id="f-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              autoCapitalize="none"
              spellCheck={false}
              {...invalid(f, "slug")}
            />
          </Field>
          {kind === "team" ? (
            <>
              <Field name="tag" label="Tag" hint="Short tag, e.g. KZN" error={f?.tag}>
                <input id="f-tag" name="tag" defaultValue={values?.tag ?? ""} maxLength={12} {...invalid(f, "tag")} />
              </Field>
              <Field name="clan" label="Clan">
                <input id="f-clan" name="clan" defaultValue={values?.clan ?? ""} />
              </Field>
            </>
          ) : (
            <>
              <Field name="ign" label="In-game name">
                <input id="f-ign" name="ign" defaultValue={values?.ign ?? ""} />
              </Field>
              <Field name="country" label="Country" error={f?.country}>
                <select id="f-country" name="country" defaultValue={values?.country ?? ""}>
                  <option value="">Not set</option>
                  {(countries ?? []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
        <ImageField name={kind === "team" ? "logo" : "photo"} label={kind === "team" ? "Logo" : "Photo"} current={values?.image} kind={kind} hint={kind === "team" ? "Square works best. Teams without one get their initials." : "A square headshot. Players without one get a character avatar."} />
        {values && kind === "team" && (
          <label className="ad-check">
            <input type="checkbox" name="fix_past" />
            <span>Spelling fix: also correct the name and tag on finished events. Leave it off for a real rename, so past events keep the name they played under.</span>
          </label>
        )}
        {values && (
          <label className="ad-check">
            <input type="checkbox" name="archived" defaultChecked={values.archived} />
            <span>Archived: hidden from pickers{kind === "team" ? " and the Teams page" : ""}; past results stay.</span>
          </label>
        )}
      </Section>
      <SaveBar state={state} toast={toast} pending={pending} label={values ? "Save changes" : kind === "team" ? "Add team" : "Add player"} idle="Changes show on the site as soon as you save." />
    </form>
  );
}
