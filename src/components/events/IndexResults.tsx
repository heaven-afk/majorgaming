"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { PublicIndexResults, TeamResult } from "@/lib/index-results/contract";
import { Crest } from "../about/Crest";
import "./index-results.css";

function TeamLogo({ row }: { row: TeamResult }) {
  const [failed, setFailed] = useState<string>();
  return row.logo && failed !== row.logo
    ? <Image src={row.logo} alt="" width={28} height={28} unoptimized onError={() => setFailed(row.logo ?? undefined)} />
    : <Crest name={row.name} size={28} tone={0} />;
}

export default function IndexResults({ slug, children, compact = false, live }: { slug: string; children?: ReactNode; compact?: boolean; live: boolean }) {
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
          if (result?.snapshot?.completed && !live) poll = false;
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
  if (!data?.snapshot) return children;
  const tables = data.snapshot.tables.filter(table => table.teams.length || (!compact && table.players.length));
  return (
    <section className="tile standings ev-standings index-results" id="standings" aria-label="Heaven Index results">
      <header className="standings__head">
        <div>
          <h2 className="sec-title">{data.snapshot.event.name} <em>results</em></h2>
          <p>{data.refresh ? "Live · Heaven Index" : "Saved · Heaven Index"}
            {data.syncedAt && <> · Updated <time dateTime={data.syncedAt}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(data.syncedAt))} WAT</time></>}
          </p>
        </div>
        {compact && <Link href={"/events/" + slug} className="btn-ghost">Full results</Link>}
      </header>
      {!tables.length && <p>Team standings and player kills will appear as scores come in.</p>}
      {(compact ? tables.slice(0, 1) : tables).map(table => (
        <section key={table.id ?? "overall"} className="index-results__group">
          {tables.length > 1 && <h3>{table.name}</h3>}
          {table.teams.length > 0 && (
            <div className="index-results__scroll">
              <table>
                <caption>Team standings</caption>
                <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Matches</th><th scope="col">Events</th><th scope="col">Team kills</th><th scope="col">Placement pts</th><th scope="col">Total pts</th></tr></thead>
                <tbody>{(compact ? table.teams.slice(0, 10) : table.teams).map(team => (
                  <tr key={team.id}><td>{team.rank}</td><th scope="row"><span><TeamLogo row={team} />{team.name}</span></th><td>{team.matches}</td><td>{team.events}</td><td>{team.kills}</td><td>{team.placementPoints}</td><td><strong>{team.totalPoints}</strong></td></tr>
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
    </section>
  );
}
