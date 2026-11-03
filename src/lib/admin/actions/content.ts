"use server";

import { updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { FormState } from "@/components/admin/Form";
import { STAFF_GROUPS, STORY_CATEGORIES } from "@/content/admin";
import { TAGS } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "../session";
import { DbError, db } from "../supabase";
import { imageFrom } from "../upload";
import { checkIds } from "../ids";


const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;
const line = (form: FormData, key: string) => String(form.get(key) ?? "").replace(/\s+/g, " ").trim() || null;

function failed(err: unknown): FormState {
  unstable_rethrow(err);
  if (err instanceof DbError && /duplicate key/.test(err.message)) return { error: "Check the highlighted fields.", fields: { slug: "Another one already uses this address." } };
  return { error: err instanceof Error ? err.message : "Something went wrong. Try again." };
}

// News ---------------------------------------------------------------------------------------

type Block = { p: string } | { h: string } | { quote: string; by?: string } | { list: string[] };

/** The block editor sends the story body as JSON; anything malformed or empty is dropped. */
function readBody(raw: string): Block[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: Block[] = [];
  for (const b of parsed as Record<string, unknown>[]) {
    if (typeof b.p === "string" && b.p.trim()) out.push({ p: b.p.trim() });
    else if (typeof b.h === "string" && b.h.trim()) out.push({ h: b.h.trim() });
    else if (typeof b.quote === "string" && b.quote.trim()) out.push({ quote: b.quote.trim(), ...(typeof b.by === "string" && b.by.trim() ? { by: b.by.trim() } : {}) });
    else if (Array.isArray(b.list)) {
      const items = b.list.map((x) => String(x).trim()).filter(Boolean);
      if (items.length) out.push({ list: items });
    }
  }
  return out;
}

export async function saveStory(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  checkIds(id);
  const fields: Record<string, string> = {};
  const title = line(form, "title");
  if (!title) fields.title = "Give the story a title.";
  const slug = (line(form, "slug") ?? slugify(title ?? "")).toLowerCase();
  if (!SLUG.test(slug)) fields.slug = "Lowercase letters, numbers and single dashes only.";
  const category = String(form.get("category") ?? "");
  if (!(STORY_CATEGORIES as readonly string[]).includes(category)) fields.category = "Pick a category.";
  const status = form.get("status") === "published" ? "published" : "draft";
  const published_on = line(form, "published_on");
  if (published_on && !/^\d{4}-\d{2}-\d{2}$/.test(published_on)) fields.published_on = "Use a full date.";
  const body = readBody(String(form.get("body") ?? ""));

  try {
    const [current] = id ? await db<{ slug: string; cover_url: string | null }[]>(admin.token, `stories?id=eq.${id}&select=slug,cover_url`) : [];
    const cover = await imageFrom(form, "cover", admin);
    const coverUrl = cover === undefined ? current?.cover_url : cover?.url;
    // A published story needs what the News page shows: a date, a cover and some text.
    if (status === "published") {
      if (!published_on) fields.published_on = "Published stories need a date.";
      if (!coverUrl) fields.cover = "Published stories need a cover image.";
      if (!body.length) fields.body = "Write the story before publishing it.";
    }
    if (Object.keys(fields).length) return { error: status === "published" ? "Not published yet: check the highlighted fields." : "Check the highlighted fields.", fields };

    const row = {
      title,
      slug,
      category,
      status,
      published_on,
      author_name: line(form, "author_name"),
      author_role: line(form, "author_role"),
      excerpt: text(form, "excerpt"),
      cover_alt: line(form, "cover_alt"),
      body,
      ...(cover !== undefined ? { cover_url: cover?.url ?? null, cover_width: cover?.width ?? null, cover_height: cover?.height ?? null } : {}),
    };
    const [saved] = id
      ? await db<{ slug: string }[]>(admin.token, `stories?id=eq.${id}`, { method: "PATCH", body: row, prefer: "return=representation" })
      : await db<{ slug: string }[]>(admin.token, "stories", { method: "POST", body: row, prefer: "return=representation" });
    updateTag(TAGS.content);
    if (!id || current?.slug !== saved.slug) redirect(`/admin/news/${saved.slug}?saved=1`);
    return { saved: Date.now() };
  } catch (err) {
    return failed(err);
  }
}

export async function deleteStory(id: string) {
  const admin = await requireAdmin();
  checkIds(id);
  await db(admin.token, `stories?id=eq.${id}`, { method: "DELETE" });
  updateTag(TAGS.content);
  redirect("/admin/news?deleted=1");
}

// Staff --------------------------------------------------------------------------------------

const SOCIALS = ["x", "instagram", "discord"] as const;

export async function saveStaff(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  checkIds(id);
  const fields: Record<string, string> = {};
  const name = line(form, "name");
  if (!name) fields.name = "Add a name or handle.";
  const slug = (line(form, "slug") ?? slugify(name ?? "")).toLowerCase();
  if (!SLUG.test(slug)) fields.slug = "Lowercase letters, numbers and single dashes only.";
  const role = line(form, "role");
  if (!role) fields.role = "Add their role, e.g. Tournament Admin.";
  const grp = String(form.get("grp") ?? "");
  if (!(STAFF_GROUPS as readonly string[]).includes(grp)) fields.grp = "Pick a group.";
  const country = line(form, "country");
  const sortRaw = line(form, "sort");
  const sort = sortRaw ? Number(sortRaw) : 0;
  if (!Number.isInteger(sort)) fields.sort = "A whole number.";

  const socials: Record<string, string> = {};
  for (const s of SOCIALS) {
    const v = line(form, `social_${s}`);
    if (!v) continue;
    if (!/^https?:\/\/\S+$/.test(v)) fields[`social_${s}`] = "Use a full link starting with https://";
    socials[s] = v;
  }

  let spotlight: { quote?: string; bio: string[]; since?: number } | null = null;
  if (form.get("spotlight") === "on") {
    const bio = String(form.get("bio") ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const since = Number(line(form, "since") ?? "") || undefined;
    spotlight = { ...(line(form, "quote") ? { quote: line(form, "quote")! } : {}), bio, ...(since ? { since } : {}) };
  }
  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };

  try {
    const [current] = id ? await db<{ slug: string }[]>(admin.token, `staff?id=eq.${id}&select=slug`) : [];
    const photo = await imageFrom(form, "photo", admin);
    const row = {
      name,
      slug,
      role,
      grp,
      country,
      sort,
      socials,
      spotlight,
      archived_at: form.get("archived") === "on" ? new Date().toISOString() : null,
      ...(photo !== undefined ? { photo_url: photo?.url ?? null } : {}),
    };
    const [saved] = id
      ? await db<{ slug: string }[]>(admin.token, `staff?id=eq.${id}`, { method: "PATCH", body: row, prefer: "return=representation" })
      : await db<{ slug: string }[]>(admin.token, "staff", { method: "POST", body: row, prefer: "return=representation" });
    updateTag(TAGS.content);
    if (!id || current?.slug !== saved.slug) redirect(`/admin/staff/${saved.slug}?saved=1`);
    return { saved: Date.now() };
  } catch (err) {
    return failed(err);
  }
}

export async function deleteStaff(id: string) {
  const admin = await requireAdmin();
  checkIds(id);
  await db(admin.token, `staff?id=eq.${id}`, { method: "DELETE" });
  updateTag(TAGS.content);
  redirect("/admin/staff?deleted=1");
}
