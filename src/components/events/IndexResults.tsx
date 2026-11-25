"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useIndexResults } from "@/lib/index-results/use-index-results";
import { eventsPage } from "@/content/site";
import { liveTables } from "@/lib/index-results/standings";
import type { MglTeamRef, TeamResult } from "@/lib/index-results/contract";
import type { KillTable as KillTableData, LeagueEvent } from "@/lib/league";
import EventTables from "./EventTables";
import KillTable from "./KillTable";
import LiveLadder from "./LiveLadder";
import "./index-results.css";

/** Players carry their team's feed name: show the same name as the standings above. */
function teamLabel(name: string | null, table: { teams: TeamResult[]; mgl: (team: TeamResult) => MglTeamRef | undefined }) {
  if (name === null) return "—";
  const rows = table.teams.filter(team => team.name === name);
  return (rows.length === 1 && table.mgl(rows[0])?.name) || name;
}

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
  const manualPlayerResults = manualKills.filter(item => !imported.has(item.table)).flatMap(item => item.results);
  const tables = sources.flatMap(source => {
    const shown = liveTables(source.snapshot, !compact);
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
          {!table.teams.length && !table.waiting.length && !table.players.length && <p className="index-results__empty">{copy.empty}</p>}
          {(table.teams.length > 0 || table.waiting.length > 0) && (
            <LiveLadder teams={table.teams} waiting={table.waiting} mgl={table.mgl} limit={compact ? 10 : undefined} label={title + ", " + table.title} />
          )}
          {!compact && table.players.length > 0 && (
            <div className="index-results__scroll">
              <table>
                <caption>{copy.players}</caption>
                <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Team</th><th scope="col">Matches</th><th scope="col">Events</th><th scope="col">Kills</th></tr></thead>
                <tbody>{table.players.map(player => (
                  <tr key={player.id}><td>{player.rank}</td><th scope="row">{player.name}</th><td>{teamLabel(player.team, table)}</td><td>{player.matches}</td><td>{player.events}</td><td><strong>{player.kills}</strong></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      {manual && <div className="index-results__group">
        <h3>{copy.others}</h3>
        <EventTables key={manual.tables.map(table => table.name).join("|")} event={manual} expanded />
      </div>}
    </section>
    {manual && <KillTable key={manualPlayerResults.map(table => table.name).join("|")} event={manual.name} tables={manualPlayerResults} />}
    </>
  );
}
