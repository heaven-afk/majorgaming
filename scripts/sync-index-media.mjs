/** One-time copy to MGL's Cloudinary/media library. Never installed in the web app. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { planMedia } from "./lib/index-media-match.mjs";

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const value = name => args[args.indexOf(name) + 1];
const batch = flag("--batch") ? value("--batch") : "";
if (flag("--batch") && (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(batch || "") || !flag("--confirmed-teams"))) throw Error("A named correction batch requires reviewed team identities.");
if (flag("--confirmed-teams") && !batch) throw Error("Use a separate --batch for a reviewed correction; preserve the original import journal.");
const confirmedTeams = flag("--confirmed-teams") ? JSON.parse(readFileSync(resolve(value("--confirmed-teams")), "utf8")) : [];
const root = process.cwd(), directory = join(root, ".local/index-media", batch);
mkdirSync(directory, { recursive: true });
const file = name => join(directory, name);
const save = (name, data) => writeFileSync(file(name), JSON.stringify(data, null, 2));
const load = name => JSON.parse(readFileSync(file(name), "utf8"));
const { loadEnvConfig } = createRequire(import.meta.url)("@next/env");
const quiet = { info() {}, error() {} };
const env = loadEnvConfig(root, false, quiet, true).parsedEnv;
const mgl = { url: env.NEXT_PUBLIC_SUPABASE_URL, key: env.SUPABASE_SECRET_KEY };
if (new URL(mgl.url).hostname !== "wrcfcsrhaesvtmsqjnfw.supabase.co" || !mgl.key) throw Error("Expected MGL Supabase project and server credential.");

async function rest(config, path, options = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options, headers: { apikey: config.key, Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json", ...options.headers },
    redirect: "error", signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`${options.method || "GET"} ${path.split("?")[0]} failed (HTTP ${response.status})`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
async function rows(config, query) {
  const result = [];
  for (let offset = 0; ; offset += 500) {
    const page = await rest(config, `${query}&order=id&limit=500&offset=${offset}`);
    result.push(...page);
    if (page.length < 500) return result;
  }
}

if (flag("--refresh")) {
  if (flag("--apply")) throw Error("Review a fresh plan before applying it.");
  if (!flag("--index-root")) throw Error("Supply --index-root pointing to Heaven Index's existing local environment.");
  const indexEnv = loadEnvConfig(resolve(value("--index-root")), false, quiet, true).parsedEnv;
  const index = { url: indexEnv.SUPABASE_URL || indexEnv.NEXT_PUBLIC_SUPABASE_URL, key: indexEnv.SUPABASE_SERVICE_ROLE_KEY };
  if (new URL(index.url).hostname !== "ifzgfvrvtryqsjxejyms.supabase.co" || !index.key) throw Error("Unexpected Heaven Index Supabase project.");
  const [teams, people, aliases, rosters, indexTeams, indexPlayers] = await Promise.all([
    rows(mgl, "teams?select=id,slug,name,tag,logo_url,archived_at,updated_at"),
    rows(mgl, "people?select=id,slug,name,ign,photo_url,archived_at,updated_at"),
    rows(mgl, "aliases?select=id,kind,target_id,alias"), rows(mgl, "team_players?select=id,team_id,person_id"),
    rows(index, "teams?select=id,team_name,logo_url,identityNames:raw_data->identityNames,teamNameAliases:raw_data->teamNameAliases,mediaAssets:raw_data->mediaAssets"),
    rows(index, "players?select=id,professional_name,ign,current_ign,ign_history,team_id,team_name,photo_url,professionalNameAliases:raw_data->professionalNameAliases,mediaAssets:raw_data->mediaAssets"),
  ]);
  save("snapshot.json", { createdAt: new Date().toISOString(), mglUrl: mgl.url, indexUrl: index.url,
    teams, people, aliases, rosters, indexTeams, indexPlayers });
}
const snapshot = load("snapshot.json");
if (snapshot.mglUrl !== mgl.url || new URL(snapshot.indexUrl).hostname !== "ifzgfvrvtryqsjxejyms.supabase.co") throw Error("Snapshot projects differ from the expected projects.");
const scope = confirmedTeams.length ? { ...snapshot, teams: snapshot.teams.filter(x => confirmedTeams.some(c => c.id === x.id)), people: [] } : snapshot;
if (batch && !confirmedTeams.length) throw Error("A correction batch must list its confirmed team identities.");
const { plans, skipped } = planMedia(scope, { confirmedTeams });
save("plan.json", { plans, skipped });
const columns = ["kind", "name", "sourceName", "sourceId", "evidence", "reason"];
const csv = row => columns.map(k => `"${String(row[k] || "").replaceAll('"', '""')}"`).join(",");
writeFileSync(file("review.csv"), [columns.join(","), ...plans.map(csv), ...skipped.map(csv)].join("\n"));
console.log(JSON.stringify({ readyTeams: plans.filter(x => x.kind === "team").length,
  readyPlayers: plans.filter(x => x.kind === "person").length,
  skipped: skipped.reduce((a, x) => ({ ...a, [x.reason]: (a[x.reason] || 0) + 1 }), {}), report: file("review.csv") }));
if (!flag("--apply")) process.exit(0);
if (Date.now() - Date.parse(snapshot.createdAt) > 24 * 60 * 60 * 1000) throw Error("Snapshot is older than 24 hours; refresh and review first.");
for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) if (!env[key]) throw Error(`${key} is missing.`);
const state = existsSync(file("import-state.json")) ? load("import-state.json") : { startedAt: new Date().toISOString(), copied: [], errors: [] };
if (state.completedAt) throw Error("The one-time import is already complete. Manage future images through MGL Admin.");

const limit = 10 * 1024 * 1024;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function raster(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return "image/gif";
  if (bytes.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(bytes.toString("ascii", 8, 32))) return "image/avif";
  throw Error("Unsupported image content; only raster images are imported.");
}
async function download(source) {
  let bytes;
  if (source.startsWith("data:")) {
    const match = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(source);
    if (!match || source.length > limit * 1.4) throw Error("Invalid embedded raster image.");
    bytes = Buffer.from(match[1], "base64");
  } else {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password || !["ifzgfvrvtryqsjxejyms.supabase.co", "i.ibb.co"].includes(url.hostname)) throw Error("Image origin requires review.");
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error(`Image download failed (HTTP ${response.status}).`);
    if (Number(response.headers.get("content-length")) > limit) throw Error("Image exceeds 10 MB.");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limit) throw Error("Image exceeds 10 MB.");
      chunks.push(chunk);
    }
    bytes = Buffer.concat(chunks);
  }
  if (!bytes.length || bytes.length > limit) throw Error("Image size is invalid.");
  return { bytes, contentType: raster(bytes), digest: hash(bytes) };
}
async function upload(item, image) {
  const publicId = `mgl/${item.kind === "team" ? "teams" : "people"}/index-import/${item.id}-${image.digest.slice(0, 16)}`;
  const existing = await rest(mgl, `media?public_id=eq.${encodeURIComponent(publicId)}&select=url,public_id,width,height,kind`);
  if (existing.length) {
    if (existing.length !== 1 || existing[0].kind !== item.kind) throw Error("Conflicting existing media record.");
    return existing[0];
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sha1 = text => createHash("sha1").update(text).digest("hex");
  const signature = sha1(`overwrite=false&public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`);
  const form = new FormData();
  for (const [key, val] of Object.entries({ public_id: publicId, timestamp, overwrite: "false", signature, api_key: env.CLOUDINARY_API_KEY })) form.set(key, val);
  form.set("file", new Blob([image.bytes], { type: image.contentType }), `${item.slug}.${image.contentType.split("/")[1]}`);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST", body: form, redirect: "error", signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw Error(`MGL image upload failed (HTTP ${response.status}).`);
  const result = await response.json();
  if (result.public_id !== publicId || result.signature !== sha1(`public_id=${publicId}&version=${result.version}${env.CLOUDINARY_API_SECRET}`) ||
      !result.secure_url?.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`) || !result.width || !result.height) throw Error("Image upload reply could not be verified.");
  const media = { public_id: publicId, url: result.secure_url, kind: item.kind,
    alt: `${item.name} ${item.kind === "team" ? "logo" : "photo"}`, width: result.width, height: result.height };
  await rest(mgl, "media", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(media) });
  return media;
}

for (const item of plans) {
  if (state.copied.some(x => x.kind === item.kind && x.id === item.id)) continue;
  const table = item.kind === "team" ? "teams" : "people";
  try {
    const current = await rest(mgl, `${table}?id=eq.${item.id}&select=id,name,${item.imageField},updated_at,archived_at`);
    if (current.length !== 1 || current[0].updated_at !== item.expectedUpdatedAt || current[0][item.imageField] !== item.previousImage || current[0].archived_at) throw Error("MGL record changed since review; preserved current record.");
    const image = await download(item.sourceImage);
    const media = await upload(item, image);
    const imageFilter = item.previousImage === null ? "is.null" : `eq.${encodeURIComponent(item.previousImage)}`;
    // Compare-and-set: a concurrent admin edit must never be overwritten.
    const saved = await rest(mgl, `${table}?id=eq.${item.id}&updated_at=eq.${encodeURIComponent(item.expectedUpdatedAt)}&${item.imageField}=${imageFilter}&archived_at=is.null&select=id,${item.imageField},updated_at`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ [item.imageField]: media.url }),
    });
    if (saved.length !== 1 || saved[0][item.imageField] !== media.url) throw Error("Concurrent MGL edit detected; image assignment skipped.");
    state.copied.push({ kind: item.kind, id: item.id, slug: item.slug, name: item.name,
      sourceId: item.sourceId, sourceName: item.sourceName, imageField: item.imageField,
      previousImage: item.previousImage, url: media.url, publicId: media.public_id,
      sha256: image.digest, width: media.width, height: media.height, updatedAt: saved[0].updated_at });
    state.errors = state.errors.filter(x => x.id !== item.id || x.kind !== item.kind);
    save("import-state.json", state);
    console.log(`Copied ${item.kind}: ${item.name}`);
  } catch (error) {
    state.errors = state.errors.filter(x => x.id !== item.id || x.kind !== item.kind);
    state.errors.push({ kind: item.kind, id: item.id, name: item.name, error: error.message });
    save("import-state.json", state);
    console.error(`Skipped ${item.kind}: ${item.name}: ${error.message}`);
  }
}
if (!state.errors.length && state.copied.length === plans.length) state.completedAt = new Date().toISOString();
save("import-state.json", state);
console.log(JSON.stringify({ copiedTeams: state.copied.filter(x => x.kind === "team").length,
  copiedPlayers: state.copied.filter(x => x.kind === "person").length, errors: state.errors.length, completed: !!state.completedAt }));
if (state.errors.length) process.exitCode = 1;
