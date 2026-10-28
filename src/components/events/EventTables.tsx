"use client";

import { useRef, useState } from "react";
import type { LeagueEvent } from "@/lib/league";
import { eventsPage } from "@/content/site";
import { Ladder } from "../standings/Ladder";

const TOP = 10;

/**
 * An event's standings, one table at a time: a quiet segmented switch over its tables (hidden
 * when there is only one), the table, and a toggle between its top ten and every squad.
 */
export default function EventTables({ event, expanded: startExpanded = false }: { event: LeagueEvent; expanded?: boolean }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(startExpanded);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const table = event.tables[index];
  const live = event.status === "live";
  const copy = eventsPage.standings;
  const id = `ev-${event.slug}`;
  const many = event.tables.length > 1;

  const pick = (i: number) => {
    const next = (i + event.tables.length) % event.tables.length;
    setIndex(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="tier-tables">
      {many && (
        <div
          className="tier-switch"
          role="tablist"
          aria-label={copy.tablesLabel}
          style={{ "--n": event.tables.length, "--at": index } as React.CSSProperties}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") pick(index + 1);
            else if (e.key === "ArrowLeft") pick(index - 1);
            else if (e.key === "Home") pick(0);
            else if (e.key === "End") pick(event.tables.length - 1);
            else return;
            e.preventDefault();
          }}
        >
          <span className="tier-switch__glide" aria-hidden />
          {event.tables.map((t, i) => (
            <button
              key={t.name}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={i === index}
              aria-controls={`${id}-panel`}
              tabIndex={i === index ? 0 : -1}
              onClick={() => setIndex(i)}
            >
              <span className="tier-switch__long">{t.name}</span>
              <span className="tier-switch__short" aria-hidden>
                {t.short}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="tier-tables__panel" {...(many ? { role: "tabpanel", "aria-labelledby": `${id}-tab-${index}` } : {})} id={`${id}-panel`}>
        <Ladder key={table.name} rows={table.rows} live={live} limit={expanded ? undefined : TOP} label={`${event.name}, ${table.name}`} motion="swap" />
      </div>

      {table.rows.length > TOP && (
        <button type="button" className="btn-ghost tier-tables__more" aria-expanded={expanded} aria-controls={`${id}-panel`} onClick={() => setExpanded((e) => !e)}>
          {expanded ? copy.showLess : copy.showAll(table.rows.length)}
          <svg className="tier-tables__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
