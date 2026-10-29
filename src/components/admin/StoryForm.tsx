"use client";

import { useActionState, useState, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { STORY_CATEGORIES } from "@/content/admin";
import { slugify } from "@/lib/slug";
import { Choice, Field, invalid, SaveBar, Section, submitWith, useFocusError, useSavedToast, type FormState } from "./Form";
import ImageField from "./ImageField";

type Action = (state: FormState, form: FormData) => Promise<FormState>;
type Block = { p: string } | { h: string } | { quote: string; by?: string } | { list: string[] };
type Kind = "p" | "h" | "quote" | "list";
type Draft = { id: number; kind: Kind; text: string; by: string };

export type StoryValues = {
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published";
  published_on: string | null;
  author_name: string | null;
  author_role: string | null;
  excerpt: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  body: Block[];
};

const KINDS: { value: Kind; label: string }[] = [
  { value: "p", label: "Paragraph" },
  { value: "h", label: "Heading" },
  { value: "quote", label: "Quote" },
  { value: "list", label: "List" },
];

const toDraft = (b: Block, id: number): Draft =>
  "p" in b ? { id, kind: "p", text: b.p, by: "" } : "h" in b ? { id, kind: "h", text: b.h, by: "" } : "quote" in b ? { id, kind: "quote", text: b.quote, by: b.by ?? "" } : { id, kind: "list", text: b.list.join("\n"), by: "" };

const toBlock = (d: Draft): Block =>
  d.kind === "p" ? { p: d.text } : d.kind === "h" ? { h: d.text } : d.kind === "quote" ? { quote: d.text, by: d.by } : { list: d.text.split("\n") };

/** A news story: headline, cover, byline and a body built from blocks. */
export default function StoryForm({ action, values, saved }: { action: Action; values?: StoryValues; saved?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const toast = useSavedToast(state, saved);
  useFocusError(state);
  const f = state.fields;
  const [title, setTitle] = useState(values?.title ?? "");
  const [slug, setSlug] = useState(values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(values));
  const [status, setStatus] = useState<string>(values?.status ?? "draft");
  const [blocks, setBlocks] = useState<Draft[]>(() => (values?.body.length ? values.body.map(toDraft) : [{ id: 0, kind: "p", text: "", by: "" }]));
  const [nextId, setNextId] = useState(1000);

  const update = (i: number, patch: Partial<Draft>) => setBlocks((all) => all.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const add = (kind: Kind, at = blocks.length) => {
    setBlocks((all) => [...all.slice(0, at), { id: nextId, kind, text: "", by: "" }, ...all.slice(at)]);
    setNextId((n) => n + 1);
  };
  const move = (i: number, d: -1 | 1) =>
    setBlocks((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form className="ad-form" onSubmit={submitWith(formAction, startTransition)} noValidate>
      <input type="hidden" name="body" value={JSON.stringify(blocks.map(toBlock))} />

      <Section title="Story" lede="Drafts stay off the site. Publishing needs a date, a cover and some text.">
        <Field name="title" label="Headline" error={f?.title}>
          <input
            id="f-title"
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            {...invalid(f, "title")}
          />
        </Field>
        <div className="ad-grid">
          <Field name="slug" label="Page link" hint={`/news/${slug || "…"}`} error={f?.slug}>
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
          <Field name="category" label="Category" error={f?.category}>
            <select id="f-category" name="category" defaultValue={values?.category ?? "Announcement"}>
              {STORY_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field name="published_on" label="Date" error={f?.published_on}>
            <input id="f-published_on" type="date" name="published_on" defaultValue={values?.published_on ?? ""} {...invalid(f, "published_on")} />
          </Field>
          <Field name="author_name" label="Author" hint="Defaults to MGL">
            <input id="f-author_name" name="author_name" defaultValue={values?.author_name ?? ""} />
          </Field>
          <Field name="author_role" label="Author's role">
            <input id="f-author_role" name="author_role" defaultValue={values?.author_role ?? ""} />
          </Field>
        </div>
        <Choice
          name="status"
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "draft", label: "Draft", hint: "Only in the admin" },
            { value: "published", label: "Published", hint: "On the News page" },
          ]}
        />
        <Field name="excerpt" label="Short summary" hint="One or two lines shown on the News page cards">
          <textarea id="f-excerpt" name="excerpt" rows={2} defaultValue={values?.excerpt ?? ""} />
        </Field>
      </Section>

      <Section title="Cover" lede="Shown on the News page and at the top of the story. Wide images work best.">
        <ImageField name="cover" label="Cover" current={values?.cover_url} shape="wide" kind="story" />
        {f?.cover && <small className="ad-field__error">{f.cover}</small>}
        <Field name="cover_alt" label="What the cover shows" hint="A few words for people using screen readers">
          <input id="f-cover_alt" name="cover_alt" defaultValue={values?.cover_alt ?? ""} />
        </Field>
      </Section>

      <Section title="Body" lede="Add paragraphs, headings, quotes, images and lists as blocks, in order. In a list, put each item on its own line.">
        {f?.body && <small className="ad-field__error">{f.body}</small>}
        <ol className="ad-blocks">
          {blocks.map((b, i) => (
            <li key={b.id} data-kind={b.kind}>
              <div className="ad-blocks__bar">
                <select aria-label={`Block ${i + 1} type`} value={b.kind} onChange={(e) => update(i, { kind: e.target.value as Kind })}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <span className="ad-roster__tools">
                  <button type="button" className="ad-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move block ${i + 1} up`}>
                    <Icon name="chevron" size={14} className="ad-up" />
                  </button>
                  <button type="button" className="ad-icon-btn" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={`Move block ${i + 1} down`}>
                    <Icon name="chevron" size={14} className="ad-down" />
                  </button>
                  <button type="button" className="ad-icon-btn" onClick={() => setBlocks((all) => all.filter((_, j) => j !== i))} aria-label={`Remove block ${i + 1}`}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              </div>
              {b.kind === "h" ? (
                <input aria-label={`Block ${i + 1} heading`} value={b.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Heading" />
              ) : (
                <textarea
                  aria-label={`Block ${i + 1} text`}
                  rows={b.kind === "p" ? 4 : 3}
                  value={b.text}
                  onChange={(e) => update(i, { text: e.target.value })}
                  placeholder={b.kind === "list" ? "One item per line" : b.kind === "quote" ? "The quote" : "Write a paragraph"}
                />
              )}
              {b.kind === "quote" && <input aria-label={`Block ${i + 1} quote by`} value={b.by} onChange={(e) => update(i, { by: e.target.value })} placeholder="Who said it (optional)" />}
            </li>
          ))}
        </ol>
        <div className="ad-blocks__add">
          {KINDS.map((k) => (
            <button key={k.value} type="button" className="ad-btn ad-btn--quiet" onClick={() => add(k.value)}>
              <Icon name="plus" size={14} /> {k.label}
            </button>
          ))}
        </div>
      </Section>

      <SaveBar state={state} toast={toast} pending={pending} label={values ? "Save story" : "Create story"} idle={status === "published" ? "Published stories update on the site as soon as you save." : "Drafts are only visible here."} />
    </form>
  );
}
