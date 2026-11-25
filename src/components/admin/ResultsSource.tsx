"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";

type Source = "live" | "sheets";

/**
 * Where a table's results come from: live results or spreadsheets, as two tabs that say what each
 * holds and which one the site uses. Opening a tab changes nothing on the site.
 */
export default function ResultsSource({ id, used, badge, notes, live, sheets }: {
  id: string;
  /** The source the site uses, and how that reads, e.g. "On the site". */
  used: Source; badge: string;
  notes: Record<Source, string>;
  live: React.ReactNode; sheets: React.ReactNode;
}) {
  // A pick holds until the site's source changes; then the tab follows it.
  const [picked, setPicked] = useState<{ used: Source; tab: Source }>();
  const tab = picked?.used === used ? picked.tab : used;
  const tabs = [
    { key: "live", label: "Live results", icon: "chart" },
    { key: "sheets", label: "Spreadsheets", icon: "upload" },
  ] as const;

  function open(next: Source) {
    setPicked({ used, tab: next });
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return (
    <div className="ad-source">
      <div
        className="ad-source__tabs"
        role="tablist"
        aria-label="Where results come from"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          open(tab === "live" ? "sheets" : "live");
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`${id}-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`${id}-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setPicked({ used, tab: t.key })}
          >
            <span className="ad-source__icon" aria-hidden>
              <Icon name={t.icon} size={18} />
            </span>
            <span className="ad-source__text">
              <strong>{t.label}</strong>
              <small>{notes[t.key]}</small>
            </span>
            {used === t.key && <span className="ad-source__badge">{badge}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-live`} aria-labelledby={`${id}-tab-live`} hidden={tab !== "live"}>
        {live}
      </div>
      <div role="tabpanel" id={`${id}-sheets`} aria-labelledby={`${id}-tab-sheets`} hidden={tab !== "sheets"}>
        {sheets}
      </div>
    </div>
  );
}
