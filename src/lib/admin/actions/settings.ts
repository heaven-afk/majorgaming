"use server";

import { updateTag } from "next/cache";
import type { FormState } from "@/components/admin/Form";
import { NETWORKS, type Settings } from "@/content/settings";
import { TAGS } from "@/lib/db";
import { isOwner, requireAdmin } from "../session";
import { db } from "../supabase";

const LINK = /^https:\/\/\S+\.\S+$/;

/** Saves the Settings page. Every field is checked first; nothing saves while one is wrong. */
export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!isOwner(admin)) return { error: "Only an owner can change the site settings." };
  const fields: Record<string, string> = {};
  const text = (key: string) => String(form.get(key) ?? "").trim();

  const discord = text("discord");
  if (!LINK.test(discord)) fields.discord = "Use the full invite link, starting with https://";
  const socials = Object.fromEntries(
    NETWORKS.map((n) => {
      const v = text(`social_${n}`);
      if (v && !LINK.test(v)) fields[`social_${n}`] = "Use the full link, starting with https://, or leave it empty.";
      return [n, v];
    }),
  ) as Settings["socials"];

  const community: [string, string] = [text("community_1"), text("community_2")];
  community.forEach((line, i) => {
    if (!line) fields[`community_${i + 1}`] = "Write a short line.";
    else if (line.length > 40) fields[`community_${i + 1}`] = "Keep it under 40 characters so it fits on one line.";
  });

  const figure = (key: string) => {
    const raw = text(`${key}_value`).replace(/[,\s]/g, "");
    const value = Number(raw);
    if (!raw || !Number.isInteger(value) || value < 0) fields[`${key}_value`] = "A whole number, like 480.";
    const suffix = text(`${key}_suffix`);
    if (suffix.length > 3) fields[`${key}_suffix`] = "Up to 3 characters, like +.";
    return { value, suffix };
  };
  const stats = { squads: figure("squads"), matches: figure("matches"), players: figure("players") };

  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };
  const data: Settings = { discord, socials, community, stats };
  try {
    await db(admin.token, "site_settings?on_conflict=id", { method: "POST", body: { id: 1, data, updated_by: admin.id }, prefer: "resolution=merge-duplicates,return=minimal" });
  } catch (err) {
    const missing = err instanceof Error && /site_settings/.test(err.message);
    return { error: missing ? "Settings can't be saved until the site_settings migration is run in Supabase." : err instanceof Error ? err.message : "The settings couldn't be saved." };
  }
  updateTag(TAGS.settings);
  return { saved: Date.now() };
}

/** The saved row, for the form. Empty when nothing has been saved (or the table isn't there yet). */
export async function savedSettings() {
  const admin = await requireAdmin();
  const rows = await db<{ data: Record<string, unknown>; updated_at: string }[]>(admin.token, "site_settings?id=eq.1&select=data,updated_at").catch(() => null);
  return { ready: rows !== null, data: rows?.[0]?.data ?? {}, updatedAt: rows?.[0]?.updated_at };
}
