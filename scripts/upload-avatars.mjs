// Run from the project root: node scripts/upload-avatars.mjs . (dry run), then add --apply.
// Uploads the 40 character avatars in src/content/visual-assets.ts to Cloudinary (mgl/avatars)
// and records each in the media table as kind "avatar". Re-runnable: skips ones already there.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = process.argv[2];
const dry = !process.argv.includes("--apply");
const env = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const src = readFileSync(join(root, "src/content/visual-assets.ts"), "utf8");
const body = src.slice(src.indexOf("export const communityAvatars"));
const items = [];
for (const m of body.matchAll(/"?name"?:\s*"([^"]+)"[\s\S]*?"?src"?:\s*"([^"]+)"[\s\S]*?"?width"?:\s*(\d+),\s*"?height"?:\s*(\d+),\s*"?alt"?:\s*"([^"]+)"/g)) {
  items.push({ name: m[1], src: m[2], width: +m[3], height: +m[4], alt: m[5] });
}
console.log(items.length, "avatars found");
const rest = (path, init = {}) => fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
const have = new Set((await (await rest("media?kind=eq.avatar&select=public_id")).json()).map((r) => r.public_id));
for (const a of items) {
  const slug = a.src.split("/").pop().replace(/\.webp$/, "");
  const publicId = `mgl/avatars/${slug}`;
  if (have.has(publicId)) { console.log("skip", a.name); continue; }
  if (dry) { console.log("would upload", a.name, a.src); continue; }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha1").update(`overwrite=true&public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest("hex");
  const form = new FormData();
  form.set("file", new Blob([readFileSync(join(root, "public", a.src))], { type: "image/webp" }), slug + ".webp");
  form.set("api_key", env.CLOUDINARY_API_KEY);
  form.set("timestamp", timestamp);
  form.set("public_id", publicId);
  form.set("overwrite", "true");
  form.set("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) { console.log("FAILED", a.name, data.error?.message); continue; }
  const ins = await rest("media", { method: "POST", body: JSON.stringify({ url: data.secure_url, public_id: data.public_id, kind: "avatar", alt: a.alt, width: data.width, height: data.height }), headers: { Prefer: "return=minimal" } });
  console.log(ins.ok ? "ok" : "DB FAILED " + (await ins.text()), a.name, data.secure_url);
}
