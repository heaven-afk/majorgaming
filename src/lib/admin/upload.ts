/** Reads an `ImageField` from a submitted form: a new upload, a library pick, removal, or no change. */

import { uploadImage } from "./cloudinary";
import type { Admin } from "./session";
import { db } from "./supabase";

export type Image = { url: string; width: number | null; height: number | null };

/** `undefined`: keep the current image. `null`: remove it. Otherwise the new image. */
export async function imageFrom(form: FormData, name: string, admin: Admin, opts: { folder: string; kind: string; alt?: string }): Promise<Image | null | undefined> {
  const file = form.get(name);
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(file, opts.folder);
    await db(admin.token, "media", { method: "POST", body: { url: up.url, public_id: up.publicId, kind: opts.kind, alt: opts.alt ?? null, width: up.width, height: up.height, created_by: admin.id } }).catch(() => {});
    return { url: up.url, width: up.width, height: up.height };
  }
  const picked = String(form.get(`${name}_url`) ?? "");
  if (picked) {
    const [m] = await db<{ width: number | null; height: number | null }[]>(admin.token, `media?url=eq.${encodeURIComponent(picked)}&select=width,height&limit=1`);
    return { url: picked, width: m?.width ?? null, height: m?.height ?? null };
  }
  if (form.get(`${name}_remove`) === "on") return null;
  return undefined;
}
