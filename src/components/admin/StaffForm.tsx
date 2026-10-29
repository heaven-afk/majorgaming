"use client";

import { useActionState, useState, useTransition } from "react";
import { STAFF_GROUPS } from "@/content/admin";
import { slugify } from "@/lib/slug";
import { Field, invalid, SaveBar, Section, submitWith, useFocusError, useSavedToast, type FormState } from "./Form";
import ImageField from "./ImageField";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export type StaffValues = {
  name: string;
  slug: string;
  role: string;
  grp: string;
  country: string | null;
  photo_url: string | null;
  socials: { x?: string; instagram?: string; discord?: string };
  sort: number;
  spotlight: { quote?: string; bio?: string[]; since?: number } | null;
  archived_at: string | null;
};

const SOCIALS = [
  { key: "x", label: "X" },
  { key: "instagram", label: "Instagram" },
  { key: "discord", label: "Discord" },
] as const;

/** A staff member: name, role and group, photo, socials, and the optional founder-style spotlight. */
export default function StaffForm({ action, values, countries, saved }: { action: Action; values?: StaffValues; countries: { code: string; name: string }[]; saved?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const toast = useSavedToast(state, saved);
  useFocusError(state);
  const f = state.fields;
  const [name, setName] = useState(values?.name ?? "");
  const [slug, setSlug] = useState(values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(values));
  const [spotlight, setSpotlight] = useState(Boolean(values?.spotlight));

  return (
    <form className="ad-form" onSubmit={submitWith(formAction, startTransition)} noValidate>
      <Section title="Person" lede="The group decides where they sit on the Staff page. Within a group, lower numbers come first.">
        <div className="ad-grid">
          <Field name="name" label="Name or handle" error={f?.name}>
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
          <Field name="slug" label="Page link" error={f?.slug}>
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
          <Field name="role" label="Role" error={f?.role}>
            <input id="f-role" name="role" defaultValue={values?.role ?? ""} placeholder="Tournament Admin" {...invalid(f, "role")} />
          </Field>
          <Field name="grp" label="Group" error={f?.grp}>
            <select id="f-grp" name="grp" defaultValue={values?.grp ?? "Operations"}>
              {STAFF_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field name="country" label="Country">
            <select id="f-country" name="country" defaultValue={values?.country ?? ""}>
              <option value="">Not set</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field name="sort" label="Position in group" error={f?.sort}>
            <input id="f-sort" name="sort" inputMode="numeric" defaultValue={values?.sort ?? 0} {...invalid(f, "sort")} />
          </Field>
        </div>
        <ImageField name="photo" label="Photo" current={values?.photo_url} kind="staff" hint="A portrait. People without one show their initials." />
      </Section>

      <Section title="Socials" lede="Full links. Leave any they don't use empty.">
        <div className="ad-grid ad-grid--3">
          {SOCIALS.map((s) => (
            <Field key={s.key} name={`social_${s.key}`} label={s.label} error={f?.[`social_${s.key}`]}>
              <input id={`f-social_${s.key}`} type="url" name={`social_${s.key}`} defaultValue={values?.socials[s.key] ?? ""} placeholder="https://" {...invalid(f, `social_${s.key}`)} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Spotlight" lede="The large profile at the top of the Staff page, used for the founder: a quote, a short bio and the year they started.">
        <label className="ad-check">
          <input type="checkbox" name="spotlight" checked={spotlight} onChange={(e) => setSpotlight(e.target.checked)} />
          <span>Feature this person in the spotlight</span>
        </label>
        {spotlight && (
          <>
            <Field name="quote" label="Quote">
              <textarea id="f-quote" name="quote" rows={2} defaultValue={values?.spotlight?.quote ?? ""} />
            </Field>
            <Field name="bio" label="Bio" hint="Leave a blank line between paragraphs">
              <textarea id="f-bio" name="bio" rows={5} defaultValue={values?.spotlight?.bio?.join("\n\n") ?? ""} />
            </Field>
            <Field name="since" label="Started MGL in">
              <input id="f-since" name="since" inputMode="numeric" defaultValue={values?.spotlight?.since ?? ""} placeholder="2021" />
            </Field>
          </>
        )}
        {values && (
          <label className="ad-check">
            <input type="checkbox" name="archived" defaultChecked={Boolean(values.archived_at)} />
            <span>Archived: hidden from the Staff page</span>
          </label>
        )}
      </Section>

      <SaveBar state={state} toast={toast} pending={pending} label={values ? "Save changes" : "Add to staff"} idle="Changes show on the Staff page as soon as you save." />
    </form>
  );
}
