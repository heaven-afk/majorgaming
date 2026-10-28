/**
 * Uploads an image to Cloudinary with a signed request (no client library), for posters,
 * logos and photos the admin adds. Server only: the API secret never leaves the server.
 */

import { createHash } from "node:crypto";

export type Uploaded = { url: string; publicId: string; width: number; height: number };

/** Images only, up to 10 MB: posters and photos, not video. */
export const UPLOAD_LIMIT = 10 * 1024 * 1024;

export async function uploadImage(file: File, folder: string): Promise<Uploaded> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error("Image uploads need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
  if (!file.type.startsWith("image/")) throw new Error("Upload an image (JPG, PNG or WebP).");
  if (file.size > UPLOAD_LIMIT) throw new Error("Images can be up to 10 MB.");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  // Cloudinary signs the parameters in alphabetical order, then the secret.
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");

  const form = new FormData();
  form.set("file", file);
  form.set("api_key", key);
  form.set("timestamp", timestamp);
  form.set("folder", folder);
  form.set("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; public_id?: string; width?: number; height?: number; error?: { message?: string } };
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? "The image upload failed.");
  return { url: data.secure_url, publicId: data.public_id!, width: data.width!, height: data.height! };
}
