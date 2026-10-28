/** Finds or creates teams and people from what a picker or a sheet sends. Server only. */

import { slugify } from "@/lib/slug";
import { db } from "./supabase";

/** A free web address for a new record: "kyzon-esport", else "kyzon-esport-2", and so on. */
export async function freeSlugs(token: string, table: "teams" | "people", names: string[]) {
  const bases = names.map((n) => slugify(n) || "unnamed");
  const taken = new Set<string>();
  for (const base of new Set(bases)) {
    const rows = await db<{ slug: string }[]>(token, `${table}?slug=like.${encodeURIComponent(base)}*&select=slug`);
    for (const r of rows) taken.add(r.slug);
  }
  return bases.map((base) => {
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    return slug;
  });
}

/** Pickers send an id, or "new:<name>" for someone typed in who isn't on record yet. */
export const isNew = (v: string) => v.startsWith("new:");
export const newName = (v: string) => v.slice(4).replace(/\s+/g, " ").trim();

/** Turns picker values into ids, creating the new people in one go. */
export async function resolvePeople(token: string, values: string[]) {
  const fresh = [...new Set(values.filter(isNew).map(newName).filter(Boolean))];
  const created = new Map<string, string>();
  if (fresh.length) {
    const slugs = await freeSlugs(token, "people", fresh);
    const rows = await db<{ id: string; name: string }[]>(token, "people", { method: "POST", body: fresh.map((name, i) => ({ name, slug: slugs[i] })), prefer: "return=representation" });
    for (const r of rows) created.set(r.name, r.id);
  }
  return values.map((v) => (isNew(v) ? (created.get(newName(v)) ?? "") : v));
}

export async function resolveTeam(token: string, value: string, tag?: string | null) {
  if (!isNew(value)) return value;
  const name = newName(value);
  const [slug] = await freeSlugs(token, "teams", [name]);
  const [row] = await db<{ id: string }[]>(token, "teams", { method: "POST", body: { name, slug, tag: tag ?? null }, prefer: "return=representation" });
  return row.id;
}
