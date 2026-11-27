"use client";

import { Icon } from "@/components/Icons";

/** A link to the folded scoring guide that also opens it. */
export function GuideLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      className={`fx-link ${className}`}
      href="#how-points-work"
      onClick={(e) => {
        const guide = document.getElementById("how-points-work");
        if (!(guide instanceof HTMLDetailsElement)) return;
        e.preventDefault();
        guide.open = true;
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        guide.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
        guide.querySelector("summary")?.focus({ preventScroll: true });
      }}
    >
      {children}
      <Icon name="arrow" size={14} />
    </a>
  );
}
