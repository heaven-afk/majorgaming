"use client";

import { useEffect, useState } from "react";

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

/**
 * Time left to the deadline, ticking each second. Shows dashes until it knows the time on this
 * device. `blocks` draws each unit as its own tile with its name under it, for the dashboard.
 */
export function Countdown({ to, compact, blocks }: { to: string; compact?: boolean; blocks?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const deadline = new Date(to);
  const label = deadline.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const { d, h, m, s } = parts(deadline.getTime() - (now ?? deadline.getTime()));
  if (blocks)
    return (
      <time className="fx-clock" dateTime={to} title={label} data-ready={now === null ? undefined : ""}>
        {[
          { v: d, l: "Days" },
          { v: h, l: "Hours" },
          { v: m, l: "Mins" },
          { v: s, l: "Secs" },
        ].map((u) => (
          <span key={u.l}>
            <b>{now === null ? "--" : String(u.v).padStart(2, "0")}</b>
            <small>{u.l}</small>
          </span>
        ))}
      </time>
    );
  // Before it knows the time, dashes hold the space so nothing jumps when it starts.
  const units = [
    { v: d, l: "d" },
    { v: h, l: "h" },
    { v: m, l: "m" },
    { v: s, l: "s" },
  ].filter((u, i) => now === null || i > 0 || u.v > 0);
  return (
    <span className="fx-countdown" data-compact={compact ? "" : undefined}>
      <time dateTime={to} title={label}>
        {units.map((u) => (
          <span key={u.l}>
            <b>{now === null ? "--" : String(u.v).padStart(2, "0")}</b>
            {u.l}
          </span>
        ))}
      </time>
      {!compact && <small>Deadline {label}</small>}
    </span>
  );
}
