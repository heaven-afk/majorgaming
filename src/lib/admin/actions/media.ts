"use server";

import { FOLDERS, ticketFor, verifyReply, type UploadReply } from "../cloudinary";
import { requireAdmin } from "../session";
import { db } from "../supabase";
import { checkIds } from "../ids";

export type MediaRow = { id: string; url: string; kind: string; alt: string | null; width: number | null; height: number | null; created_at: string };

const KINDS = ["team", "person", "staff", "story", "event", "avatar", "other"];

/** The library, newest first; a kind puts its own images first. For the image picker and the library page. */
export async function pickMedia(kind?: string) {
  const admin = await requireAdmin();
  const rows = await db<MediaRow[]>(admin.token, "media?select=id,url,kind,alt,width,height,created_at&order=created_at.desc&limit=500");
  return kind ? [...rows.filter((r) => r.kind === kind), ...rows.filter((r) => r.kind !== kind)] : rows;
}

const kindOf = (kind: string) => (KINDS.includes(kind) ? kind : "other");

/** Permission for the browser to upload one image straight to Cloudinary. */
export async function uploadTicket(kind: string) {
  await requireAdmin();
  return ticketFor(FOLDERS[kindOf(kind)]);
}

/**
 * Records an image the browser just uploaded, once Cloudinary's signed reply checks out, so it
 * shows in the library and can be used by any image field.
 */
export async function recordUpload(kind: string, reply: UploadReply, alt?: string): Promise<{ url: string; width: number; height: number } | { error: string }> {
  const admin = await requireAdmin();
  try {
    const up = verifyReply(reply);
    await db(admin.token, "media", { method: "POST", body: { url: up.url, public_id: up.publicId, kind: kindOf(kind), alt: alt?.trim() || null, width: up.width, height: up.height, created_by: admin.id } });
    return { url: up.url, width: up.width, height: up.height };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The upload couldn't be saved." };
  }
}

/** Takes an image out of the library. Pages already using it keep it (the file stays on Cloudinary). */
export async function deleteMedia(id: string) {
  const admin = await requireAdmin();
  checkIds(id);
  await db(admin.token, `media?id=eq.${id}`, { method: "DELETE" });
}

export async function describeMedia(id: string, alt: string) {
  const admin = await requireAdmin();
  checkIds(id);
  await db(admin.token, `media?id=eq.${id}`, { method: "PATCH", body: { alt: alt.trim() || null } });
}
