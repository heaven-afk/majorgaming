import { PlayerPortrait } from "../PlayerPortrait";

/** Compact version of the approved card portrait. */
export function Headshot({ src, team = "", size = 40, className = "" }: { src?: string; team?: string; size?: number; className?: string }) {
  return <span className={`hs ${className}`} style={{ "--hs": `${size}px` } as React.CSSProperties} aria-hidden>
    <PlayerPortrait player={{ photo: src, team }} badges={false} />
  </span>;
}
