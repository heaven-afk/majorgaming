"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * A team logo on its round plate. Logos drawn on a transparent background sit inside the plate
 * with breathing room. Logos that come as a solid square (their own background colour) would
 * show as a box inside the circle, so those fill the plate edge to edge instead.
 */
export function LogoPlate({
  src,
  size,
  className,
  unoptimized,
  onError,
  fallback,
}: {
  src: string;
  size: number;
  className?: string;
  unoptimized?: boolean;
  onError?: () => void;
  /** Shown instead when the logo fails to load (e.g. the team's initials crest). */
  fallback?: ReactNode;
}) {
  const [solid, setSolid] = useState(false);
  const [failed, setFailed] = useState(false);
  // Cloudinary already serves small web-ready files; loading them directly skips the local
  // image resizer, which can time out on a slow connection and leave an empty plate.
  const direct = unoptimized || src.includes("res.cloudinary.com");
  if (failed && fallback) return <>{fallback}</>;

  return (
    <span className={["logo-plate", className].filter(Boolean).join(" ")} data-solid={solid || undefined} style={{ "--s": `${size}px` } as CSSProperties}>
      <Image
        src={src}
        alt=""
        width={size * 2}
        height={size * 2}
        sizes={`${size}px`}
        unoptimized={direct}
        // Only ask for CORS where it's known to be served; elsewhere it could stop the logo loading.
        crossOrigin={!direct || readable(src) ? "anonymous" : undefined}
        onLoad={(e) => setSolid(hasSolidEdges(e.currentTarget))}
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      />
    </span>
  );
}

/** Sources the browser can read pixels from: same site, inline images and Cloudinary. */
const readable = (src: string) => src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:") || src.includes("res.cloudinary.com");

/** True when the image's edges are opaque, i.e. the logo carries its own square background. */
function hasSolidEdges(img: HTMLImageElement) {
  try {
    const n = 24;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = n;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, n, n);
    const { data } = ctx.getImageData(0, 0, n, n);
    // Walk the outer ring of pixels; a transparent logo leaves most of it see-through.
    let opaque = 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      for (const [x, y] of [[i, 0], [i, n - 1], [0, i], [n - 1, i]]) {
        total++;
        if (data[(y * n + x) * 4 + 3] > 230) opaque++;
      }
    }
    return opaque / total > 0.9;
  } catch {
    // A logo served without CORS can't be read; keep the default fit.
    return false;
  }
}
