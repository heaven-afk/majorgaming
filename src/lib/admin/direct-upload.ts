/**
 * Browser side of an image upload: asks the server for a signed ticket, sends the file straight
 * to Cloudinary, then has the server check and record it. Large files never touch the site's
 * server. Client only.
 */

import { recordUpload, uploadTicket } from "@/lib/admin/actions/media";
import type { UploadReply } from "@/lib/admin/cloudinary";

/** Matches `UPLOAD_LIMIT` on the server. */
const LIMIT = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export type DirectUpload = { url: string; width: number; height: number } | { error: string };

export async function uploadDirect(file: File, kind: string, alt?: string): Promise<DirectUpload> {
  if (!TYPES.includes(file.type)) return { error: `${file.name} isn't a JPG, PNG or WebP image.` };
  if (file.size > LIMIT) return { error: `${file.name} is over 10 MB. Export a smaller copy and try again.` };
  try {
    const ticket = await uploadTicket(kind);
    const body = new FormData();
    body.set("file", file);
    body.set("api_key", ticket.apiKey);
    body.set("timestamp", ticket.timestamp);
    body.set("folder", ticket.folder);
    body.set("signature", ticket.signature);
    const res = await fetch(ticket.url, { method: "POST", body });
    const reply = (await res.json().catch(() => ({}))) as UploadReply & { error?: { message?: string } };
    if (!res.ok) return { error: reply.error?.message ?? "The image upload failed. Try again." };
    return await recordUpload(kind, reply, alt);
  } catch {
    return { error: "The upload didn't go through. Check you're online and try again." };
  }
}
