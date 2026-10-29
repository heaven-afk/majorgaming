"use client";

import { useActionState, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { formatOptions, kindOptions, PROMOTION, registrationOptions, registrationShown, statusOptions } from "@/content/admin";
import type { EventRow } from "@/lib/admin/events";
import { uploadDirect } from "@/lib/admin/direct-upload";
import { registrationOf, today } from "@/lib/registration";
import { slugify } from "@/lib/slug";
import { Choice, Field, invalid, SaveBar, Section, submitWith, useFocusError, useSavedToast, type FormState } from "./Form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** "Season 11" → 11: a season's number, which orders it among the others. */
const numberIn = (name: string) => name.match(/(\d+)\s*$/)?.[1] ?? "";
const noChange = () => () => {};
const seriesFor = (kind: string) => (kind === "season" ? "MGL Season" : "MGL Special Event");

/**
 * Creating an event asks only what it is and how its results are split; everything else
 * (registration, poster, write-up) is filled in on its Details tab once it exists.
 */
export default function EventForm({ action, event, tiers: initialTiers, saved }: { action: Action; event?: EventRow; tiers: number; saved?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const toast = useSavedToast(state, saved);
  useFocusError(state);
  const f = state.fields ?? {};

  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(event));
  const [kind, setKind] = useState<string>(event?.kind ?? "season");
  const [series, setSeries] = useState(event?.series ?? seriesFor("season"));
  const [seriesEdited, setSeriesEdited] = useState(Boolean(event));
  const [number, setNumber] = useState(event?.number ? String(event.number) : "");
  const [numberEdited, setNumberEdited] = useState(Boolean(event));
  const [status, setStatus] = useState<string>(event?.status ?? "upcoming");
  const [format, setFormat] = useState<string>(event?.format ?? "tiers");
  const [registration, setRegistration] = useState<string>(event?.registration_state ?? "closed");
  const [opens, setOpens] = useState(event?.registration_opens ?? "");
  const [closes, setCloses] = useState(event?.registration_closes ?? "");
  const [details, setDetails] = useState(event?.details.length ? event.details : []);
  const [detailKeys, setDetailKeys] = useState(() => (event?.details ?? []).map((_, i) => i));
  const [preview, setPreview] = useState<string | null>(event?.poster_url ?? null);
  const [poster, setPoster] = useState("");
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [removePoster, setRemovePoster] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Today in the league's time zone, read after load (it isn't known while the page is built).
  const day = useSyncExternalStore(noChange, today, () => "");
  // Settings most events never change, opened by themselves when one of them has an error.
  const moreOpen = Boolean(f.slug || f.series || f.number);

  function rename(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
    if (!numberEdited) setNumber(kind === "season" ? numberIn(value) : "");
  }
  function changeKind(value: string) {
    setKind(value);
    if (!seriesEdited) setSeries(seriesFor(value));
    if (!numberEdited) setNumber(value === "season" ? numberIn(name) : "");
  }

  async function pickPoster(file?: File) {
    if (!file) return;
    setPosterError(null);
    setPosterBusy(true);
    setPreview(URL.createObjectURL(file));
    const result = await uploadDirect(file, "event", name);
    setPosterBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if ("error" in result) {
      setPosterError(result.error);
      setPreview(poster || event?.poster_url || null);
      return;
    }
    setPoster(result.url);
    setPreview(result.url);
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

  const shown = registrationOf({ status, registration: registration as keyof typeof registrationShown, registrationOpens: opens || undefined, registrationCloses: closes || undefined }, day);
  const byDates = Boolean(opens || closes) && registration !== "full";

  return (
    <form className="ad-form" onSubmit={submitWith(formAction, startTransition)} noValidate>
      {event && <input type="hidden" name="current_slug" value={event.slug} />}

      <Section title="The event" lede={event ? undefined : "Name it and say what kind it is. Registration, poster and teams come next."}>
        <Field name="name" label="Event name" error={f.name}>
          <input id="f-name" name="name" value={name} onChange={(e) => rename(e.target.value)} placeholder="e.g. Season 11" required autoFocus={!event} {...invalid(f, "name")} />
        </Field>

        <Choice name="kind" label="What kind of event is it?" options={kindOptions} value={kind} onChange={changeKind} />
        {event ? <Choice name="status" label="Where does it stand?" options={statusOptions} value={status} onChange={setStatus} /> : <input type="hidden" name="status" value="upcoming" />}

        <div className="ad-split">
          <Choice name="format" label="How are the standings split?" options={formatOptions} value={format} onChange={setFormat} />
          {format === "tiers" && (
            <Field name="tiers" label="Number of tiers" error={f.tiers}>
              <input id="f-tiers" name="tiers" inputMode="numeric" defaultValue={initialTiers} {...invalid(f, "tiers")} />
            </Field>
          )}
        </div>

        <details className="ad-more" open={moreOpen || undefined}>
          <summary>
            More settings <small>Page link{kind === "season" ? ", season number" : ""} and the label above the name</small>
          </summary>
          <div className="ad-grid">
            <Field name="slug" label="Page link" hint={`The event's page: /events/${slug || "…"}`} error={f.slug}>
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
                {...invalid(f, "slug")}
              />
            </Field>
            <Field name="series" label="Label above the name" hint="Small text over the event's name on its page and cards" error={f.series}>
              <input
                id="f-series"
                name="series"
                value={series}
                onChange={(e) => {
                  setSeries(e.target.value);
                  setSeriesEdited(true);
                }}
                {...invalid(f, "series")}
              />
            </Field>
            {kind === "season" ? (
              <Field name="number" label="Season number" hint="Puts the season in order among the others. Taken from the name." error={f.number}>
                <input
                  id="f-number"
                  name="number"
                  inputMode="numeric"
                  value={number}
                  onChange={(e) => {
                    setNumber(e.target.value);
                    setNumberEdited(true);
                  }}
                  {...invalid(f, "number")}
                />
              </Field>
            ) : (
              <input type="hidden" name="number" value="" />
            )}
          </div>
        </details>
      </Section>

      <Section title="Dates" lede="Optional. Leave any you don't know yet; only the ones you set show on the site.">
        <div className="ad-grid">
          <Field name="start_date" label="First match day" error={f.start_date}>
            <input id="f-start_date" type="date" name="start_date" defaultValue={event?.start_date ?? ""} {...invalid(f, "start_date")} />
          </Field>
          <Field name="end_date" label="Last match day" error={f.end_date}>
            <input id="f-end_date" type="date" name="end_date" defaultValue={event?.end_date ?? ""} {...invalid(f, "end_date")} />
          </Field>
        </div>
      </Section>

      {event ? (
        <>
          <Section title="Registration" lede="Controls every register button on the site while this event is upcoming.">
            <p className="ad-live" data-tone={shown}>
              <span aria-hidden />
              <span>
                <strong>The site shows: </strong>
                {status !== "upcoming" ? "Nothing. Only upcoming events take registrations." : day ? registrationShown[shown] : "…"}
              </span>
            </p>
            <div className="ad-grid">
              <Field name="registration_opens" label="Opens on" error={f.registration_opens}>
                <input id="f-registration_opens" type="date" name="registration_opens" value={opens} onChange={(e) => setOpens(e.target.value)} {...invalid(f, "registration_opens")} />
              </Field>
              <Field name="registration_closes" label="Closes after" error={f.registration_closes}>
                <input id="f-registration_closes" type="date" name="registration_closes" value={closes} onChange={(e) => setCloses(e.target.value)} {...invalid(f, "registration_closes")} />
              </Field>
            </div>
            {/* Greyed-out choices aren't sent with the form, so the one chosen still is. */}
            {byDates && <input type="hidden" name="registration_state" value={registration} />}
            <Choice name="registration_state" label={byDates ? "Set by the dates above. Pick Full to close it early." : "Registration is"} options={registrationOptions} value={registration} onChange={setRegistration} disabled={byDates ? ["closed", "soon", "open"] : undefined} />
            <div className="ad-grid">
              <Field name="registration_url" label="Register link" hint="Where the register buttons go, e.g. the Discord thread. Leave empty for the main Discord." error={f.registration_url}>
                <input id="f-registration_url" type="url" name="registration_url" defaultValue={event.registration_url ?? ""} placeholder="https://discord.gg/…" {...invalid(f, "registration_url")} />
              </Field>
              <Field name="registration_note" label="Short note" hint="Optional. Shown with the button, e.g. Tier 5 only">
                <input id="f-registration_note" name="registration_note" defaultValue={event.registration_note ?? ""} />
              </Field>
            </div>
          </Section>

          <Section title="Event page" lede="What visitors read about the event.">
            <div className="ad-poster" data-empty={!preview || removePoster ? "" : undefined}>
              <button type="button" className="ad-poster__drop" disabled={posterBusy} onClick={() => fileRef.current?.click()} aria-label={preview ? "Replace poster" : "Upload poster"}>
                {preview && !removePoster ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
                  <img src={preview} alt="" />
                ) : (
                  <span>
                    <Icon name="plus" size={20} />
                    Add a poster
                    <small>JPG, PNG or WebP, up to 10 MB</small>
                  </span>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickPoster(e.target.files?.[0])} />
              <input type="hidden" name="poster_url" value={poster} />
              <div className="ad-poster__side">
                <Field name="poster_alt" label="What the poster shows" hint="A few words for people using screen readers">
                  <input id="f-poster_alt" name="poster_alt" defaultValue={event.poster_alt ?? ""} />
                </Field>
                {posterBusy && <p className="ad-note" aria-live="polite">Uploading…</p>}
                {posterError && (
                  <p className="ad-field__error" role="alert">
                    {posterError}
                  </p>
                )}
                {preview && !removePoster && (
                  <div className="ad-poster__actions">
                    <button type="button" className="ad-btn ad-btn--quiet" disabled={posterBusy} onClick={() => fileRef.current?.click()}>
                      Replace
                    </button>
                    {event.poster_url && (
                      <button
                        type="button"
                        className="ad-btn ad-btn--quiet"
                        onClick={() => {
                          setRemovePoster(true);
                          setPoster("");
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
                <input type="hidden" name="poster_remove" value={removePoster ? "on" : ""} />
              </div>
            </div>

            <Field name="summary" label="One-line summary" hint="Shown on event cards">
              <input id="f-summary" name="summary" defaultValue={event.summary ?? ""} maxLength={180} placeholder="e.g. 125 teams, five tiers, one champion." />
            </Field>
            <Field name="description" label="About the event" hint="Leave an empty line between paragraphs">
              <textarea id="f-description" name="description" rows={6} defaultValue={event.description.join("\n\n")} />
            </Field>

            <fieldset className="ad-details" data-invalid={f.details ? "" : undefined}>
              <legend>Key facts</legend>
              <p className="ad-note">Listed on the event page, like Prize pool: $1,000 or Squad size: 4 players.</p>
              {details.map((d, i) => (
                <div key={detailKeys[i]} className="ad-details__row">
                  <input name="detail_label" defaultValue={d.label} placeholder="e.g. Prize pool" aria-label={`Fact ${i + 1} name`} />
                  <input name="detail_value" defaultValue={d.value} placeholder="e.g. $1,000" aria-label={`Fact ${i + 1} value`} />
                  <button type="button" className="ad-icon-btn" onClick={() => removeDetail(i)} aria-label={`Remove fact ${i + 1}`}>
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
              {f.details && <small className="ad-field__error">{f.details}</small>}
              <button type="button" className="ad-btn ad-btn--quiet" onClick={addDetail}>
                <Icon name="plus" size={14} />
                Add a fact
              </button>
            </fieldset>
          </Section>

          {PROMOTION.enabled && kind === "season" && format === "tiers" && (
            <Section title="Promotion and relegation" lede={`How many teams in each tier move up or down when the next season's teams are picked. ${PROMOTION.promote} and ${PROMOTION.relegate} unless you change it; 0 for none.`}>
              <div className="ad-grid">
                <Field name="promote" label="Move up per tier" error={f.promote}>
                  <input id="f-promote" name="promote" inputMode="numeric" defaultValue={event.promote ?? PROMOTION.promote} {...invalid(f, "promote")} />
                </Field>
                <Field name="relegate" label="Move down per tier" error={f.relegate}>
                  <input id="f-relegate" name="relegate" inputMode="numeric" defaultValue={event.relegate ?? PROMOTION.relegate} {...invalid(f, "relegate")} />
                </Field>
              </div>
            </Section>
          )}

          <Section title="Matches and kill tables" lede="Optional. The match count shows on event cards and the event page.">
            <div className="ad-grid ad-grid--3">
              <Field name="matches_played" label="Matches played so far" error={f.matches_played}>
                <input id="f-matches_played" name="matches_played" inputMode="numeric" defaultValue={event.matches_played ?? ""} {...invalid(f, "matches_played")} />
              </Field>
              <Field name="matches_total" label="Matches planned" error={f.matches_total}>
                <input id="f-matches_total" name="matches_total" inputMode="numeric" defaultValue={event.matches_total ?? ""} {...invalid(f, "matches_total")} />
              </Field>
              <Field name="kill_table_size" label="Players per kill table" hint="20 if left empty" error={f.kill_table_size}>
                <input id="f-kill_table_size" name="kill_table_size" inputMode="numeric" defaultValue={event.kill_table_size ?? ""} placeholder="20" {...invalid(f, "kill_table_size")} />
              </Field>
            </div>
          </Section>
        </>
      ) : (
        <input type="hidden" name="registration_state" value="closed" />
      )}

      <SaveBar state={state} toast={toast} pending={pending} disabled={posterBusy} label={event ? "Save changes" : "Create event"} idle={event ? "Changes show on the site as soon as you save." : "Next you'll pick the teams and set up registration."} />
    </form>
  );
}
