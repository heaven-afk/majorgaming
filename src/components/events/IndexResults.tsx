"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useIndexResults } from "@/lib/index-results/use-index-results";
import { eventsPage } from "@/content/site";
import { liveTables } from "@/lib/index-results/standings";
import type { KillTable as KillTableData, LeagueEvent } from "@/lib/league";
import EventTables from "./EventTables";
import KillTable from "./KillTable";
import LiveLadder from "./LiveLadder";
import "./index-results.css";

export default function IndexResults({ slug, name, children, compact = false, live, manualEvent, manualKills = [], adminTable, refreshKey }: {
  slug: string; name?: string; children?: ReactNode; compact?: boolean; live: boolean;
  manualEvent?: LeagueEvent; manualKills?: { table: string; results: KillTableData[] }[];
  adminTable?: string; refreshKey?: number;
}) {
  const data = useIndexResults(slug, live, refreshKey);
  const sources = data?.sources.filter(source => adminTable === undefined || source.table === adminTable || source.table === null);
  if (!data || !sources?.length) return children;
  const scoped = !sources.some(source => source.table === null);
  const imported = new Set(sources.map(source => source.table));
  const manualTables = scoped ? manualEvent?.tables.filter(table => !imported.has(table.name)) : undefined;
  const manual = manualEvent && manualTables?.length ? { ...manualEvent, tables: manualTables } : undefined;
  // Kill tables always come from the uploaded spreadsheets, live standings or not.
  const killTables = manualKills.flatMap(item => item.results);
  const tables = sources.flatMap(source => {
    const shown = liveTables(source.snapshot);
    return shown.map(table => ({
      ...table,
      key: JSON.stringify([source.table, table.id]),
      title: source.table && shown.length > 1 ? source.table + " · " + table.name : source.table ?? table.name,
      syncedAt: source.syncedAt,
      refresh: source.refresh,
      mgl: (team: { id: string }) => source.teams && Object.hasOwn(source.teams, team.id) ? source.teams[team.id] : undefined,
    }));
  });
  const copy = eventsPage.live;
  const admin = adminTable !== undefined;
  const title = name ?? manualEvent?.name ?? sources[0].snapshot.event.name;
  // One table needs no heading of its own: its name and size sit beside the section title.
  const single = tables.length === 1 && !manual;
  const sizeOf = (table: (typeof tables)[number]) => {
    const count = table.teams.length + table.waiting.length;
    return [count > 0 && copy.teams(count), !table.teams.length && table.waiting.length > 0 && copy.waiting].filter(Boolean).join(" · ");
  };
  return (
    <>
    <section className={admin ? "index-results" : "tile standings ev-standings index-results"} id={admin ? undefined : "standings"} aria-label={title + " " + copy.title}>
      {!admin && (
        <header className="standings__head">
          <div>
            <div className="standings__labels">
              <span className="label"><i />{copy.label}</span>
              {tables.some(table => table.refresh && table.teams.length > 0) && <span className="live"><i />{copy.status}</span>}
            </div>
            <h2 className="sec-title">{title} <em>{copy.title}</em></h2>
          </div>
          <div className="standings__meta">
            {single && <span>{[tables[0].title, sizeOf(tables[0])].filter(Boolean).join(" · ")}</span>}
            {compact && <Link href={"/events/" + slug} className="btn-ghost">{copy.full}</Link>}
          </div>
        </header>
      )}
      {(compact ? tables.slice(0, 1) : tables).map(table => (
        <section key={table.key} className="index-results__group">
          {!single && <h3>{table.title}{sizeOf(table) && <small>{sizeOf(table)}</small>}</h3>}
          {admin && table.syncedAt && <p className="index-results__time">
            Updated <time dateTime={table.syncedAt}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(table.syncedAt))} WAT</time>
          </p>}
          {!table.teams.length && !table.waiting.length && <p className="index-results__empty">{copy.empty}</p>}
          {(table.teams.length > 0 || table.waiting.length > 0) && (
            <LiveLadder teams={table.teams} waiting={table.waiting} mgl={table.mgl} limit={compact ? 10 : undefined} label={title + ", " + table.title} />
          )}
        </section>
      ))}
      {manual && <div className="index-results__group">
        <h3>{copy.others}</h3>
        <EventTables key={manual.tables.map(table => table.name).join("|")} event={manual} expanded />
      </div>}
    </section>
    {!compact && killTables.length > 0 && <KillTable key={killTables.map(table => table.name).join("|")} event={title} tables={killTables} />}
    </>
  );
}
