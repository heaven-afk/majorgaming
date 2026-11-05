import Link from "next/link";
import { fantasyPage } from "@/content/fantasy";
import type { Game } from "@/lib/fantasy/game";
import type { Manager } from "@/lib/fantasy/session";
import { Icon } from "@/components/Icons";
import { statusOf } from "./Chrome";
import { Countdown } from "./Countdown";
import { Brand } from "./Pieces";
import { ShellNav } from "./ShellNav";

const copy = fantasyPage.app;

const initials = (name: string | null) => (name ?? "?").split(/[\s_-]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/**
 * The signed-in app: a sidebar on wide screens, a top bar and a bottom tab bar on phones. Every
 * fantasy page a manager uses sits in it, so fantasy feels like its own product.
 */
export default function AppShell({ game, manager, title, actions, children }: { game: Game; manager?: Manager; title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  const ready = game.state === "ready" ? game : undefined;
  const status = ready ? statusOf(ready) : undefined;
  return (
    <div className="fx-app">
      <aside className="fx-side">
        <Brand />
        <ShellNav items={copy.nav} signedIn={Boolean(manager)} />
        {ready && (
          <div className="fx-side__md">
            <span className="fx-status" data-tone={status!.tone}>
              <i />
              {status!.label}
            </span>
            <strong>Matchday {ready.current.matchdayNumber}</strong>
            <small>{ready.tournament.name}</small>
            {ready.open && ready.current.submissionDeadline && <Countdown to={ready.current.submissionDeadline} compact />}
          </div>
        )}
        <div className="fx-side__foot">
          {manager ? (
            <Link className="fx-me" href="/fantasy/account">
              <span className="fx-me__avatar">{initials(manager.displayName)}</span>
              <span>
                <strong>{manager.displayName ?? "No name yet"}</strong>
                <small>{manager.email}</small>
              </span>
            </Link>
          ) : (
            <Link className="fx-btn fx-btn--primary" href="/fantasy/join">
              {fantasyPage.guest.join}
            </Link>
          )}
          <Link className="fx-side__back" href="/">
            <Icon name="arrow" size={14} />
            {copy.back}
          </Link>
        </div>
      </aside>

      <div className="fx-stage">
        <header className="fx-bar-top">
          <div className="fx-bar-top__phone">
            <Brand />
            {manager ? (
              <Link className="fx-me__avatar" href="/fantasy/account" aria-label="Account">
                {initials(manager.displayName)}
              </Link>
            ) : (
              <Link className="fx-top__link" href="/fantasy/login">
                {fantasyPage.guest.signIn}
              </Link>
            )}
          </div>
          <div className="fx-bar-top__main">
            <div>
              <h1 className="fx-page-title">{title}</h1>
              {ready && (
                <p className="fx-bar-top__sub">
                  {ready.tournament.name} · Matchday {ready.current.matchdayNumber}
                </p>
              )}
            </div>
            {actions && <div className="fx-bar-top__actions">{actions}</div>}
          </div>
        </header>
        <main className="fx-content">{children}</main>
      </div>

      <ShellNav items={copy.nav} signedIn={Boolean(manager)} tabs />
    </div>
  );
}
