/**
 * Image uploads go from the admin's browser straight to Cloudinary, so large files never pass
 * through the site's server (Vercel refuses request bodies over 4.5 MB). The server signs each
 * upload and checks Cloudinary's signed reply before an image is recorded. Server only: the API
 * secret never leaves the server.
 */

import { createHash } from "node:crypto";

export type Uploaded = { url: string; publicId: string; width: number; height: number };

/** What the browser sends Cloudinary with the file. */
export type UploadTicket = { url: string; apiKey: string; timestamp: string; folder: string; signature: string };

/** What Cloudinary sends back, passed on by the browser to be checked. */
export type UploadReply = { public_id: string; version: number; signature: string; secure_url: string; width: number; height: number };

/** Images only, up to 10 MB: posters and photos, not video. */
export const UPLOAD_LIMIT = 10 * 1024 * 1024;

/** The folder each kind of image lands in. */
export const FOLDERS: Record<string, string> = { team: "mgl/teams", person: "mgl/people", staff: "mgl/staff", story: "mgl/news", event: "mgl/events", avatar: "mgl/avatars", other: "mgl/other" };

function env() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error("Image uploads need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
  return { cloud, key, secret };
}

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");

/** A signed permission for one upload into `folder`, good for an hour. */
export function ticketFor(folder: string): UploadTicket {
  const { cloud, key, secret } = env();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // Cloudinary signs the parameters in alphabetical order, then the secret.
  return { url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`, apiKey: key, timestamp, folder, signature: sha1(`folder=${folder}&timestamp=${timestamp}${secret}`) };
}

/**
 * Checks a reply really came from Cloudinary for this account (it signs public_id and version
 * with the secret), so the browser can't record any image link it likes.
 */
export function verifyReply(reply: UploadReply): Uploaded {
  const { cloud, secret } = env();
  const genuine = typeof reply.public_id === "string" && sha1(`public_id=${reply.public_id}&version=${reply.version}${secret}`) === reply.signature;
  if (!genuine || !reply.secure_url?.startsWith(`https://res.cloudinary.com/${cloud}/`)) throw new Error("That upload couldn't be checked. Try again.");
  return { url: reply.secure_url, publicId: reply.public_id, width: Number(reply.width) || 0, height: Number(reply.height) || 0 };
}
