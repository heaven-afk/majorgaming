"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { pickMedia, type MediaRow } from "@/lib/admin/actions/media";

/**
 * One image: upload a new file, pick one already in the library, or remove it. Sends
 * `<name>` (the file), `<name>_url` (a library pick) and `<name>_remove`; the server reads
 * them with `imageFrom` in `src/lib/admin/upload.ts`.
 */
export default function ImageField({ name, label, current, shape = "square", kind, hint }: { name: string; label: string; current?: string | null; shape?: "square" | "poster" | "wide"; kind?: string; hint?: string }) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [picked, setPicked] = useState("");
  const [removed, setRemoved] = useState(false);
  const [library, setLibrary] = useState<MediaRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const shown = removed ? null : preview;

  async function openLibrary() {
    dialog.current?.showModal();
    if (library) return;
    setLoading(true);
    setLibrary(await pickMedia(kind).catch(() => []));
    setLoading(false);
  }

  return (
    <div className="ad-image" data-shape={shape}>
      <span className="ad-image__label">{label}</span>
      <div className="ad-image__row">
        <button type="button" className="ad-image__drop" data-empty={shown ? undefined : ""} onClick={() => file.current?.click()} aria-label={shown ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of a picked or uploaded file
            <img src={shown} alt="" />
          ) : (
            <span>
              <Icon name="plus" size={18} />
              Upload
            </span>
          )}
        </button>
        <div className="ad-image__side">
          <small>{hint ?? "JPG, PNG or WebP, up to 10 MB"}</small>
          <div className="ad-image__actions">
            <button type="button" className="ad-btn ad-btn--quiet" onClick={() => file.current?.click()}>
              {shown ? "Replace" : "Upload"}
            </button>
            <button type="button" className="ad-btn ad-btn--quiet" onClick={openLibrary}>
              Library
            </button>
            {shown && (
              <button
                type="button"
                className="ad-btn ad-btn--quiet"
                onClick={() => {
                  setRemoved(true);
                  setPicked("");
                  if (file.current) file.current.value = "";
                }}
              >
                Remove
              </button>
            )}
          </div>
          {removed && current && (
            <p className="ad-note">
              Removed when you save.{" "}
              <button type="button" className="ad-link" onClick={() => setRemoved(false)}>
                Undo
              </button>
            </p>
          )}
        </div>
      </div>
      <input
        ref={file}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setPreview(URL.createObjectURL(f));
          setPicked("");
          setRemoved(false);
        }}
      />
      <input type="hidden" name={`${name}_url`} value={picked} />
      <input type="hidden" name={`${name}_remove`} value={removed ? "on" : ""} />

      <dialog ref={dialog} className="ad-dialog" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="ad-dialog__head">
          <h2>Media library</h2>
          <button type="button" className="ad-icon-btn" onClick={() => dialog.current?.close()} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        {loading ? (
          <p className="ad-note">Loading…</p>
        ) : library?.length ? (
          <ul className="ad-media ad-media--pick">
            {library.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(m.url);
                    setPreview(m.url);
                    setRemoved(false);
                    if (file.current) file.current.value = "";
                    dialog.current?.close();
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails */}
                  <img src={m.url} alt={m.alt ?? ""} loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ad-note">Nothing in the library yet. Uploads land here.</p>
        )}
      </dialog>
    </div>
  );
}
