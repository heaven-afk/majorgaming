"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icons";
import { deleteMedia, describeMedia, type MediaRow } from "@/lib/admin/actions/media";
import { uploadDirect } from "@/lib/admin/direct-upload";

const KINDS = [
  { value: "other", label: "General" },
  { value: "event", label: "Event posters" },
  { value: "team", label: "Team logos" },
  { value: "person", label: "Player photos" },
  { value: "staff", label: "Staff photos" },
  { value: "story", label: "News covers" },
  { value: "avatar", label: "Avatars" },
];

/** Every uploaded image: add more, filter by use, copy a link, describe or remove one. */
export default function MediaLibrary({ media }: { media: MediaRow[] }) {
  const router = useRouter();
  const [kind, setKind] = useState("other");
  const [uploading, setUploading] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const files = useRef<HTMLInputElement>(null);

  // Each file goes straight to Cloudinary, one after another, then the list reloads.
  async function upload(list: File[]) {
    const failed: string[] = [];
    for (const [i, f] of list.entries()) {
      setUploading(list.length > 1 ? `Uploading ${i + 1} of ${list.length}…` : "Uploading…");
      const result = await uploadDirect(f, kind);
      if ("error" in result) failed.push(result.error);
    }
    setUploading(null);
    setErrors(failed);
    if (files.current) files.current.value = "";
    router.refresh();
  }

  const shown = filter === "all" ? media : media.filter((m) => m.kind === filter);

  return (
    <>
      <div className="ad-media__upload">
        <label className="ad-field">
          <span>For</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <input ref={files} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload([...(e.target.files ?? [])])} />
        <button type="button" className="ad-btn ad-btn--primary" disabled={Boolean(uploading)} onClick={() => files.current?.click()}>
          <Icon name="plus" size={16} /> {uploading ?? "Upload images"}
        </button>
      </div>
      {errors.length > 0 && (
        <p className="ad-alert ad-alert--error" role="alert">
          {errors.join(" ")}
        </p>
      )}

      <div className="ad-tabs" role="tablist" aria-label="Filter">
        {[{ value: "all", label: "All" }, ...KINDS].map((k) => {
          const n = k.value === "all" ? media.length : media.filter((m) => m.kind === k.value).length;
          if (!n && k.value !== "all") return null;
          return (
            <button key={k.value} type="button" role="tab" aria-selected={filter === k.value} onClick={() => setFilter(k.value)}>
              {k.label} <small>{n}</small>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="ad-empty">Nothing here yet. Images you upload anywhere in the admin land in the library.</p>
      ) : (
        <ul className="ad-media">
          {shown.map((m) => (
            <li key={m.id}>
              <a href={m.url} target="_blank" rel="noreferrer" className="ad-media__img">
                {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails */}
                <img src={m.url} alt={m.alt ?? ""} loading="lazy" />
              </a>
              <input
                aria-label="Description"
                defaultValue={m.alt ?? ""}
                placeholder="Describe it"
                onBlur={(e) => {
                  if (e.target.value !== (m.alt ?? "")) start(() => describeMedia(m.id, e.target.value));
                }}
              />
              <div className="ad-media__tools">
                <small>{m.width && m.height ? `${m.width}×${m.height}` : ""}</small>
                <button
                  type="button"
                  className="ad-icon-btn"
                  aria-label="Copy link"
                  onClick={() => {
                    navigator.clipboard?.writeText(m.url).catch(() => {});
                    setCopied(m.id);
                    setTimeout(() => setCopied(null), 1600);
                  }}
                >
                  <Icon name={copied === m.id ? "check" : "link"} size={14} />
                </button>
                <button
                  type="button"
                  className="ad-icon-btn"
                  aria-label="Remove from library"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm("Remove this image from the library? Pages already using it keep it.")) return;
                    start(async () => {
                      await deleteMedia(m.id);
                      router.refresh();
                    });
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
