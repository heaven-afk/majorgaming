import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/fantasy/game/AppShell";
import { StandingsTable } from "@/components/fantasy/game/Chrome";
import { fantasyPage } from "@/content/fantasy";
import { getGame, getStandings } from "@/lib/fantasy/game";
import { getManager } from "@/lib/fantasy/session";
import { LiveRefresh } from "@/components/fantasy/game/LiveRefresh";
import MatchdayPoints, { ScoringGuide } from "@/components/fantasy/game/MatchdayPoints";

export const metadata: Metadata = { title: "Standings · MGL Fantasy", alternates: { canonical: "/fantasy/standings" } };
const copy = fantasyPage.standings;

async function Board({ searchParams }: { searchParams: Promise<{ md?: string; cursor?: string }> }) {
  const [game, manager, params] = await Promise.all([getGame(), getManager(), searchParams]);
  if (game.state !== "ready") redirect("/fantasy");
  const scored = game.matchdays.filter((m) => m.fantasyStatus === "PROCESSED").map((m) => m.matchdayNumber).sort((a, b) => a - b);
  const md = scored.includes(Number(params.md)) ? Number(params.md) : undefined;
  const cursor = params.cursor && /^[\w.:=-]{1,200}$/.test(params.cursor) ? params.cursor : undefined;
  const board = await getStandings(game, { matchday: md, cursor, me: manager }).catch(() => undefined);
  const mine = board?.rows.find((r) => r.managerId === manager?.id);
  const href = (p: { md?: number; cursor?: string }) => `/fantasy/standings${p.md || p.cursor ? "?" : ""}${new URLSearchParams(Object.entries(p).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString()}`;

  return (
    <AppShell game={game} manager={manager} title={<>{copy.title.before} <em>{copy.title.accent}</em></>}>
      <LiveRefresh />
      <div className="fx-standings" data-split={md && manager ? "" : undefined}>
        <nav className="fx-seg fx-standings__tabs" aria-label="Table">
          <Link href={href({})} aria-current={!md ? "page" : undefined}>
            {copy.season}
          </Link>
          {scored.map((n) => (
            <Link key={n} href={href({ md: n })} aria-current={md === n ? "page" : undefined}>
              {copy.matchday(n)}
            </Link>
          ))}
        </nav>
        <ScoringGuide />
        {md && manager && <MatchdayPoints game={game} manager={manager} day={md} rank={mine ? { rank: mine.rank, of: board!.totalCount } : undefined} deduction={mine?.adjustments ?? 0} />}
      <section className="fx-panel fx-board" aria-labelledby="fx-board-title">
        {board ? (
          <>
            <header className="fx-board__head">
              <h2 id="fx-board-title">{md ? `Matchday ${md} table` : "Season table"}</h2>
              <p>{board.totalCount.toLocaleString("en-GB")} managers</p>
            </header>
            <StandingsTable rows={board.rows} me={manager?.id} podium={!cursor} />
            {(board.nextCursor || cursor) && (
              <div className="fx-cta-row">
                {cursor && (
                  <Link className="fx-btn fx-btn--ghost" href={href({ md })}>
                    {copy.first}
                  </Link>
                )}
                {board.nextCursor && (
                  <Link className="fx-btn fx-btn--ghost" href={href({ md, cursor: board.nextCursor })}>
                    {copy.more}
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="fx-empty" role="alert">
            The standings didn&apos;t load. Try again in a moment.
          </p>
        )}
      </section>
      </div>
    </AppShell>
  );
}

export default function StandingsPage({ searchParams }: { searchParams: Promise<{ md?: string; cursor?: string }> }) {
  return (
    <Suspense fallback={<div className="fx-loading" aria-busy="true"><span className="fx-spinner" /></div>}>
      <Board searchParams={searchParams} />
    </Suspense>
  );
}
