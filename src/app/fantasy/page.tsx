import Link from "next/link";
import { Suspense } from "react";
import AppShell from "@/components/fantasy/game/AppShell";
import Dashboard from "@/components/fantasy/game/Dashboard";
import Landing from "@/components/fantasy/game/Landing";
import { Icon } from "@/components/Icons";
import { fantasyPage } from "@/content/fantasy";
import { getGame, getShowcase, getStandings } from "@/lib/fantasy/game";
import { getManager } from "@/lib/fantasy/session";

const copy = fantasyPage;

/** Visitors get the landing page; signed-in managers get their dashboard. */
async function Home() {
  const [game, manager] = await Promise.all([getGame(), getManager()]);

  if (!manager) {
    const [cards, board] = await Promise.all([getShowcase(game), game.state === "ready" ? getStandings(game).catch(() => undefined) : undefined]);
    return <Landing game={game} cards={cards} board={board} />;
  }

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  const title = (
    <>
      Good {copy.app.greeting(hour).toLowerCase()}, <em>{manager.displayName ?? "manager"}</em>
    </>
  );
  return (
    <AppShell game={game} manager={manager} title={title}>
      {game.state === "ready" ? (
        <Dashboard manager={manager} game={game} />
      ) : (
        <section className="fx-panel fx-empty-state">
          <span className="fx-empty-state__icon">
            <Icon name={game.state === "error" ? "warning" : "calendar"} size={22} />
          </span>
          <h2>{game.state === "error" ? copy.error.title : `${copy.off.title.before} ${copy.off.title.accent}`}</h2>
          <p>{game.state === "error" ? game.message : copy.off.lede}</p>
          {game.state === "error" && (
            <Link className="fx-btn fx-btn--ghost" href="/fantasy">
              {copy.error.retry}
            </Link>
          )}
        </section>
      )}
    </AppShell>
  );
}

export default function FantasyPage() {
  return (
    <Suspense
      fallback={
        <div className="fx-loading" aria-busy="true">
          <span className="fx-spinner" />
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}
