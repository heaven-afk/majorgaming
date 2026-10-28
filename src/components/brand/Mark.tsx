import { useId } from "react";
import { MARK_PATHS } from "./markPaths";

/** The MGL mark. `tone` sets the colour of the M and L; the G always carries the brand gradient. */
export function Mark({ size = 32, tone = "var(--color-graphite)", className }: { size?: number | string; tone?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 1000 1000" aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="527" y1="0" x2="1000" y2="0">
          <stop offset="0" stopColor="var(--color-orange)" />
          <stop offset="1" stopColor="var(--color-amber)" />
        </linearGradient>
      </defs>
      <path d={MARK_PATHS.m} fill={tone} />
      <path d={MARK_PATHS.g} fill={`url(#${id}g)`} />
      <path d={MARK_PATHS.l} fill={tone} />
    </svg>
  );
}
