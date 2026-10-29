/**
 * Reads an `ImageField` from a submitted form: an image picked from the library (or just
 * uploaded to it, straight from the browser), removal, or no change.
 */

import type { Admin } from "./session";
import { db } from "./supabase";

export type Image = { url: string; width: number | null; height: number | null };

/** `undefined`: keep the current image. `null`: remove it. Otherwise the new image. */
export async function imageFrom(form: FormData, name: string, admin: Admin): Promise<Image | null | undefined> {
  const picked = String(form.get(`${name}_url`) ?? "");
  if (picked) {
    // Only images in the library: every upload is recorded there once Cloudinary's reply checks out.
    const [m] = await db<{ width: number | null; height: number | null }[]>(admin.token, `media?url=eq.${encodeURIComponent(picked)}&select=width,height&limit=1`);
    if (!m) throw new Error("That image isn't in the media library. Upload it again.");
    return { url: picked, width: m.width, height: m.height };
  }
  if (form.get(`${name}_remove`) === "on") return null;
  return undefined;
}
