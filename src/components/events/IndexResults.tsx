"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { PublicIndexResults } from "@/lib/index-results/contract";
import { StandingsMark } from "../standings/StandingsMark";
import type { KillTable as KillTableData, LeagueEvent } from "@/lib/league";
import EventTables from "./EventTables";
import KillTable from "./KillTable";
import "./index-results.css";

export default function IndexResults({ slug, name, children, compact = false, live, manualEvent, manualKills = [] }: {
  slug: string; name?: string; children?: ReactNode; compact?: boolean; live: boolean;
  manualEvent?: LeagueEvent; manualKills?: { table: string; results: KillTableData[] }[];
}) {
  const [shown, setShown] = useState<{ slug: string; data: PublicIndexResults | null }>();
  const data = shown?.slug === slug ? shown.data : null;
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll = true;
    let busy = false;
    async function load() {
      if (busy || !poll || controller.signal.aborted || document.hidden) return;
      busy = true;
      if (timer !== undefined) clearTimeout(timer);
      try {
        const response = await fetch("/api/events/" + encodeURIComponent(slug) + "/index-results", { signal: controller.signal, cache: "no-store" });
        if (response.ok) {
          const result = await response.json() as PublicIndexResults | null;
          if (controller.signal.aborted) return;
          setShown({ slug, data: result });
          // Live pages also check when an admin changes the source while the page is open.
          if (result?.sources?.length && !live) poll = false;
        }
      } catch { /* Keep the table already on screen. */ }
      finally {
        busy = false;
        if (live && poll && !controller.signal.aborted) timer = setTimeout(load, 30_000);
      }
    }
    function visible() { if (!document.hidden) void load(); }
    void load();
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [slug, live]);
  if (!data?.sources?.length) return children;
  const scoped = !data.sources.some(source => source.table === null);
  const imported = new Set(data.sources.map(source => source.table));
  const manualTables = scoped ? manualEvent?.tables.filter(table => !imported.has(table.name)) : undefined;
  const manual = manualEvent && manualTables?.length ? { ...manualEvent, tables: manualTables } : undefined;
  const manualPlayerResults = manualKills.filter(item => !imported.has(item.table)).flatMap(item => item.results);
  const tables = data.sources.flatMap(source => {
    const populated = source.snapshot.tables.filter(table => table.teams.length || (!compact && table.players.length));
    return (populated.length ? populated : [{ id: null, name: "Overall", teams: [], players: [] }]).map(table => ({
      ...table,
      key: JSON.stringify([source.table, table.id]),
      title: source.table && populated.length > 1 ? source.table + " · " + table.name : source.table ?? table.name,
      syncedAt: source.syncedAt,
      refresh: source.refresh,
    }));
  });
  return (
    <>
    <section className="tile standings ev-standings index-results" id="standings" aria-label="Heaven Index results">
      <header className="standings__head">
        <div>
          <h2 className="sec-title">{name ?? manualEvent?.name ?? data.sources[0].snapshot.event.name} <em>results</em></h2>
        </div>
        {compact && <Link href={"/events/" + slug} className="btn-ghost">Full results</Link>}
      </header>
      {(compact ? tables.slice(0, 1) : tables).map(table => (
        <section key={table.key} className="index-results__group">
          <h3>{table.title}</h3>
          <p>{table.refresh ? "Live · Heaven Index" : "Saved · Heaven Index"}
            {table.syncedAt && <> · Updated <time dateTime={table.syncedAt}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(table.syncedAt))} WAT</time></>}
          </p>
          {!table.teams.length && !table.players.length && <p>Results will appear as scores come in.</p>}
          {table.teams.length > 0 && (
            <div className="index-results__scroll">
              <table>
                <caption>Team standings</caption>
                <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Matches</th><th scope="col">Events</th><th scope="col">Team kills</th><th scope="col">Placement pts</th><th scope="col">Total pts</th></tr></thead>
                <tbody>{(compact ? table.teams.slice(0, 10) : table.teams).map(team => (
                  <tr key={team.id}><td>{team.rank}</td><th scope="row"><span><StandingsMark name={team.name} logo={Object.hasOwn(data.mglLogos, team.name) ? data.mglLogos[team.name] : undefined} size={28} />{team.name}</span></th><td>{team.matches}</td><td>{team.events}</td><td>{team.kills}</td><td>{team.placementPoints}</td><td><strong>{team.totalPoints}</strong></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {!compact && table.players.length > 0 && (
            <div className="index-results__scroll">
              <table>
                <caption>Player kills</caption>
                <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Team</th><th scope="col">Matches</th><th scope="col">Events</th><th scope="col">Kills</th></tr></thead>
                <tbody>{table.players.map(player => (
                  <tr key={player.id}><td>{player.rank}</td><th scope="row">{player.name}</th><td>{player.team ?? "—"}</td><td>{player.matches}</td><td>{player.events}</td><td><strong>{player.kills}</strong></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      {manual && <div className="index-results__group">
        <h3>Manual standings</h3>
        <EventTables key={manual.tables.map(table => table.name).join("|")} event={manual} expanded />
      </div>}
    </section>
    {manual && <KillTable key={manualPlayerResults.map(table => table.name).join("|")} event={manual.name} tables={manualPlayerResults} />}
    </>
  );
}
