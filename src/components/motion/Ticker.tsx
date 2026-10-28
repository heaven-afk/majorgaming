"use client";

import { useEffect, useRef, useState } from "react";

/** Counts toward a new value instead of jumping to it. `instant` snaps straight there. */
export function Ticker({ value, instant = false, className }: { value: number; instant?: boolean; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (instant) {
      from.current = value;
      return;
    }
    const a = from.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, instant]);

  return <span className={className}>{(instant ? value : shown).toLocaleString("en-US")}</span>;
}
