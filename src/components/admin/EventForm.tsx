"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { FormState } from "@/app/admin/actions";
import { Icon } from "@/components/Icons";
import { formatOptions, kindOptions, PROMOTION, registrationOptions, statusOptions } from "@/content/admin";
import type { EventRow } from "@/lib/admin/events";

type Action = (state: FormState, form: FormData) => Promise<FormState>;
type Option = { value: string; label: string; hint?: string };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

function Field({ name, label, hint, error, children }: { name: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
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

/** Radio buttons drawn as a segmented switch. */
function Choice({ name, label, options, value, onChange }: { name: string; label: string; options: readonly Option[]; value: string; onChange?: (v: string) => void }) {
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

function Section({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
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

export default function EventForm({ action, event, tiers: initialTiers, saved: savedOnLoad }: { action: Action; event?: EventRow; tiers: number; saved?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const f = state.fields ?? {};

  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(event));
  const [kind, setKind] = useState<string>(event?.kind ?? "season");
  const [status, setStatus] = useState<string>(event?.status ?? "upcoming");
  const [format, setFormat] = useState<string>(event?.format ?? "tiers");
  const [registration, setRegistration] = useState<string>(event?.registration_state ?? "closed");
  const [details, setDetails] = useState(event?.details.length ? event.details : []);
  const [detailKeys, setDetailKeys] = useState(() => (event?.details ?? []).map((_, i) => i));
  const [preview, setPreview] = useState<string | null>(event?.poster_url ?? null);
  const [removePoster, setRemovePoster] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // "Saved" shows for a few seconds after each save (and after a new event's first save).
  const stamp = state.saved ?? (savedOnLoad ? 1 : 0);
  const [hidden, setHidden] = useState(0);
  const toast = stamp !== 0 && hidden !== stamp && !state.error;
  useEffect(() => {
    if (!stamp) return;
    const t = setTimeout(() => setHidden(stamp), 3200);
    return () => clearTimeout(t);
  }, [stamp]);

  useEffect(() => {
    if (state.error) document.querySelector<HTMLElement>(".ad-field[data-invalid] input, .ad-field[data-invalid] textarea")?.focus();
  }, [state]);

  // Submitting through a transition (not the form's own action) keeps what was typed when the
  // save comes back with errors.
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  function pickPoster(file?: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setRemovePoster(false);
  }

  const addDetail = () => {
    setDetails((d) => [...d, { label: "", value: "" }]);
    setDetailKeys((k) => [...k, Math.max(-1, ...k) + 1]);
  };
  const removeDetail = (i: number) => {
    setDetails((d) => d.filter((_, j) => j !== i));
    setDetailKeys((k) => k.filter((_, j) => j !== i));
  };

  const err = (key: string) => (f[key] ? { "aria-invalid": true, "aria-describedby": `f-${key}-error` } : {});

  return (
    <form className="ad-form" onSubmit={submit} noValidate>
      {event && <input type="hidden" name="current_slug" value={event.slug} />}

      <Section title="Basics" lede="The name and address the site uses, and where the event sits.">
        <div className="ad-grid">
          <Field name="name" label="Name" error={f.name}>
            <input
              id="f-name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Season 11"
              required
              {...err("name")}
            />
          </Field>
          <Field name="slug" label="Web address" hint={`/events/${slug || "…"}`} error={f.slug}>
            <input
              id="f-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="season-11"
              autoCapitalize="none"
              spellCheck={false}
              {...err("slug")}
            />
          </Field>
          <Field name="series" label="Series" hint="Shown above the name, e.g. MGL Season" error={f.series}>
            <input id="f-series" name="series" defaultValue={event?.series ?? "MGL Season"} {...err("series")} />
          </Field>
          <Field name="number" label="Number" hint="Optional, e.g. 11" error={f.number}>
            <input id="f-number" name="number" inputMode="numeric" defaultValue={event?.number ?? ""} {...err("number")} />
          </Field>
        </div>
        <Choice name="kind" label="Kind" options={kindOptions} value={kind} onChange={setKind} />
        <Choice name="status" label="Status" options={statusOptions} value={status} onChange={setStatus} />
        <div className="ad-grid ad-grid--format">
          <Choice name="format" label="Tables" options={formatOptions} value={format} onChange={setFormat} />
          {format === "tiers" && (
            <Field name="tiers" label="Tiers" hint="A table is made for each" error={f.tiers}>
              <input id="f-tiers" name="tiers" inputMode="numeric" defaultValue={initialTiers} {...err("tiers")} />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Dates" lede="Leave any you don't know yet; the page only shows the ones that are set.">
        <div className="ad-grid">
          <Field name="start_date" label="Event starts" error={f.start_date}>
            <input id="f-start_date" type="date" name="start_date" defaultValue={event?.start_date ?? ""} {...err("start_date")} />
          </Field>
          <Field name="end_date" label="Event ends" error={f.end_date}>
            <input id="f-end_date" type="date" name="end_date" defaultValue={event?.end_date ?? ""} {...err("end_date")} />
          </Field>
        </div>
      </Section>

      <Section title="Registration" lede="Drives every register button on the site (Home, Events, the footer) while this event is Upcoming. With dates set, it opens and closes on them by itself: Opening soon before, Open between, Closed after. Choose Full to stop it early. Without dates, the state you pick here is what shows.">
        <Choice name="registration_state" label="State" options={registrationOptions} value={registration} onChange={setRegistration} />
        <div className="ad-grid">
          <Field name="registration_opens" label="Opens" error={f.registration_opens}>
            <input id="f-registration_opens" type="date" name="registration_opens" defaultValue={event?.registration_opens ?? ""} {...err("registration_opens")} />
          </Field>
          <Field name="registration_closes" label="Closes" error={f.registration_closes}>
            <input id="f-registration_closes" type="date" name="registration_closes" defaultValue={event?.registration_closes ?? ""} {...err("registration_closes")} />
          </Field>
          <Field name="registration_url" label="Link" hint="Where the register button goes (the Discord thread)" error={f.registration_url}>
            <input id="f-registration_url" type="url" name="registration_url" defaultValue={event?.registration_url ?? ""} placeholder="https://discord.gg/…" {...err("registration_url")} />
          </Field>
          <Field name="registration_note" label="Note" hint="Optional, e.g. Tier 5 only">
            <input id="f-registration_note" name="registration_note" defaultValue={event?.registration_note ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Event page" lede="Poster, a one-line summary for cards, the write-up, and any other facts.">
        <div className="ad-poster" data-empty={!preview || removePoster ? "" : undefined}>
          <button type="button" className="ad-poster__drop" onClick={() => fileRef.current?.click()} aria-label={preview ? "Replace poster" : "Upload poster"}>
            {preview && !removePoster ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
              <img src={preview} alt="" />
            ) : (
              <span>
                <Icon name="plus" size={20} />
                Upload poster
                <small>JPG, PNG or WebP, up to 10 MB</small>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" name="poster" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickPoster(e.target.files?.[0])} />
          <div className="ad-poster__side">
            <Field name="poster_alt" label="Poster description" hint="Read out by screen readers">
              <input id="f-poster_alt" name="poster_alt" defaultValue={event?.poster_alt ?? ""} />
            </Field>
            {preview && !removePoster && (
              <div className="ad-poster__actions">
                <button type="button" className="ad-btn ad-btn--quiet" onClick={() => fileRef.current?.click()}>
                  Replace
                </button>
                {event?.poster_url && (
                  <button
                    type="button"
                    className="ad-btn ad-btn--quiet"
                    onClick={() => {
                      setRemovePoster(true);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
            {removePoster && (
              <p className="ad-note">
                The poster will be removed when you save.{" "}
                <button type="button" className="ad-link" onClick={() => setRemovePoster(false)}>
                  Undo
                </button>
              </p>
            )}
            <input type="hidden" name="remove_poster" value={removePoster ? "on" : ""} />
          </div>
        </div>

        <Field name="summary" label="Summary" hint="One line for event cards">
          <input id="f-summary" name="summary" defaultValue={event?.summary ?? ""} maxLength={180} />
        </Field>
        <Field name="description" label="Description" hint="Leave a blank line between paragraphs">
          <textarea id="f-description" name="description" rows={7} defaultValue={event?.description.join("\n\n") ?? ""} />
        </Field>

        <fieldset className="ad-details" data-invalid={f.details ? "" : undefined}>
          <legend>Details</legend>
          <p className="ad-note">Facts listed on the page, e.g. Prize pool · $1,000, or Format · 4-player squads.</p>
          {details.map((d, i) => (
            <div key={detailKeys[i]} className="ad-details__row">
              <input name="detail_label" defaultValue={d.label} placeholder="Label" aria-label={`Detail ${i + 1} label`} />
              <input name="detail_value" defaultValue={d.value} placeholder="Value" aria-label={`Detail ${i + 1} value`} />
              <button type="button" className="ad-icon-btn" onClick={() => removeDetail(i)} aria-label={`Remove detail ${i + 1}`}>
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          {f.details && <small className="ad-field__error">{f.details}</small>}
          <button type="button" className="ad-btn ad-btn--quiet" onClick={addDetail}>
            <Icon name="plus" size={14} />
            Add a detail
          </button>
        </fieldset>
      </Section>

      {kind === "season" && format === "tiers" && (
        <Section title="Promotion and relegation" lede={`How many squads in each tier move up or down when this season's squads are brought into the next one. ${PROMOTION.promote} and ${PROMOTION.relegate} unless you change it; 0 for none.`}>
          <div className="ad-grid">
            <Field name="promote" label="Promoted per tier" hint="The top squads of each tier move up one tier" error={f.promote}>
              <input id="f-promote" name="promote" inputMode="numeric" defaultValue={event?.promote ?? PROMOTION.promote} {...err("promote")} />
            </Field>
            <Field name="relegate" label="Relegated per tier" hint="The bottom squads of each tier move down one tier" error={f.relegate}>
              <input id="f-relegate" name="relegate" inputMode="numeric" defaultValue={event?.relegate ?? PROMOTION.relegate} {...err("relegate")} />
            </Field>
          </div>
        </Section>
      )}

      <Section title="Numbers" lede="Optional. Matches show on cards and the event page.">
        <div className="ad-grid ad-grid--3">
          <Field name="matches_played" label="Matches played" error={f.matches_played}>
            <input id="f-matches_played" name="matches_played" inputMode="numeric" defaultValue={event?.matches_played ?? ""} {...err("matches_played")} />
          </Field>
          <Field name="matches_total" label="Matches in total" error={f.matches_total}>
            <input id="f-matches_total" name="matches_total" inputMode="numeric" defaultValue={event?.matches_total ?? ""} {...err("matches_total")} />
          </Field>
          <Field name="kill_table_size" label="Kill table size" hint="Players per table (20 if empty)" error={f.kill_table_size}>
            <input id="f-kill_table_size" name="kill_table_size" inputMode="numeric" defaultValue={event?.kill_table_size ?? ""} {...err("kill_table_size")} />
          </Field>
        </div>
      </Section>

      <div className="ad-savebar">
        <p aria-live="polite" className="ad-savebar__msg" data-tone={state.error ? "error" : toast ? "ok" : undefined}>
          {state.error ? (
            state.error
          ) : toast ? (
            <>
              <Icon name="check" size={16} /> Saved. Live on the site.
            </>
          ) : event ? (
            "Changes show on the site as soon as you save."
          ) : (
            "The event appears on the site once it's saved."
          )}
        </p>
        <button className="ad-btn ad-btn--primary" disabled={pending}>
          {pending ? "Saving…" : event ? "Save changes" : "Create event"}
        </button>
      </div>
    </form>
  );
}
