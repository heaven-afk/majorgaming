import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/fantasy/game/AppShell";
import SquadBuilder from "@/components/fantasy/game/SquadBuilder";
import { fantasyPage } from "@/content/fantasy";
import { getGame, getMine } from "@/lib/fantasy/game";
import { requireManager } from "@/lib/fantasy/session";

import { canManageSquad, squadNotice, transferBlockReason } from "@/lib/fantasy/lifecycle.mjs";

export const metadata: Metadata = { title: "Your squad · MGL Fantasy" };

async function Squad() {
  const manager = await requireManager("/fantasy/squad");
  if (!manager.displayName) redirect("/fantasy/account");
  const game = await getGame();
  if (game.state !== "ready") redirect("/fantasy");
  const mine = await getMine(manager, game);
  const hasSquad = Boolean(mine.squad || mine.previous);
  const day = game.current;
  const open = canManageSquad(game.open, day, hasSquad);
  const deadline = day.splitWindows ? (hasSquad ? day.matchdayStartsAt : day.buildSquadDeadline) ?? null : day.submissionDeadline;
  return (
    <AppShell game={game} manager={manager} title={hasSquad ? <>Your <em>squad.</em></> : <>Build your <em>squad.</em></>}>
      {game.market.players.length ? (
        <SquadBuilder key={day.matchdayNumber} players={game.market.players} squad={mine.squad ?? mine.previous} open={open} transferReason={transferBlockReason(game.open, day)} notice={squadNotice(game.open, day, hasSquad)} deadline={deadline} chips={mine.chips} />
      ) : (
        <section className="fx-panel fx-empty-state">
          <h2>{fantasyPage.status.unpublished}</h2>
          <p>The market opens once this matchday&apos;s prices are set.</p>
          <Link className="fx-btn fx-btn--ghost" href="/fantasy">
            Back to dashboard
          </Link>
        </section>
      )}
    </AppShell>
  );
}

export default function SquadPage() {
  return (
    <Suspense
      fallback={
        <div className="fx-loading" aria-busy="true">
          <span className="fx-spinner" />
        </div>
      }
    >
      <Squad />
    </Suspense>
  );
}
