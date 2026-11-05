import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/fantasy/game/AppShell";
import SquadBuilder from "@/components/fantasy/game/SquadBuilder";
import { fantasyPage } from "@/content/fantasy";
import { getGame, getMine } from "@/lib/fantasy/game";
import { requireManager } from "@/lib/fantasy/session";

export const metadata: Metadata = { title: "Your squad · MGL Fantasy" };

async function Squad() {
  const manager = await requireManager("/fantasy/squad");
  if (!manager.displayName) redirect("/fantasy/account");
  const game = await getGame();
  if (game.state !== "ready") redirect("/fantasy");
  const mine = await getMine(manager, game);
  return (
    <AppShell game={game} manager={manager} title={<>Your <em>squad.</em></>}>
      {game.market.players.length ? (
        <SquadBuilder players={game.market.players} squad={mine.squad} previous={mine.previous} open={game.open} chips={mine.chips} />
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
