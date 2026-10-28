"use server";

import type { FormState } from "@/components/admin/Form";
import { uploadImage } from "../cloudinary";
import { requireAdmin } from "../session";
import { db } from "../supabase";

export type MediaRow = { id: string; url: string; kind: string; alt: string | null; width: number | null; height: number | null; created_at: string };

const KINDS = ["team", "person", "staff", "story", "event", "avatar", "other"];

/** The library, newest first; a kind puts its own images first. For the image picker and the library page. */
export async function pickMedia(kind?: string) {
  const admin = await requireAdmin();
  const rows = await db<MediaRow[]>(admin.token, "media?select=id,url,kind,alt,width,height,created_at&order=created_at.desc&limit=500");
  return kind ? [...rows.filter((r) => r.kind === kind), ...rows.filter((r) => r.kind !== kind)] : rows;
}

export async function uploadMedia(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const kind = KINDS.includes(String(form.get("kind"))) ? String(form.get("kind")) : "other";
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose one or more images." };
  try {
    for (const file of files) {
      const up = await uploadImage(file, `mgl/${kind}`);
      await db(admin.token, "media", { method: "POST", body: { url: up.url, public_id: up.publicId, kind, alt: null, width: up.width, height: up.height, created_by: admin.id } });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The upload failed." };
  }
  return { saved: Date.now() };
}

/** Takes an image out of the library. Pages already using it keep it (the file stays on Cloudinary). */
export async function deleteMedia(id: string) {
  const admin = await requireAdmin();
  await db(admin.token, `media?id=eq.${id}`, { method: "DELETE" });
}

export async function describeMedia(id: string, alt: string) {
  const admin = await requireAdmin();
  await db(admin.token, `media?id=eq.${id}`, { method: "PATCH", body: { alt: alt.trim() || null } });
}
