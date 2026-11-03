import Image from "next/image";
import { Silhouette } from "./PlayerTile";

/**
 * A player's small portrait, the thumbnail of `PlayerTile`. Most players have no photo yet, so
 * the default is the same faceless silhouette filling a warm frame; a real photo replaces it.
 */
export function Headshot({ src, size = 40, className = "" }: { src?: string; size?: number; className?: string }) {
  return (
    <span className={`hs ${className}`} style={{ "--hs": `${size}px` } as React.CSSProperties} aria-hidden>
      {src ? <Image src={src} alt="" width={size * 2} height={size * 2} /> : <Silhouette />}
    </span>
  );
}
