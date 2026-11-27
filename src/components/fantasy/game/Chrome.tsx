import Link from "next/link";
import MeshGradient from "@/components/hero/MeshGradient";
import Nav from "@/components/Nav";
import { fantasyPage } from "@/content/fantasy";
import type { Game, Standing } from "@/lib/fantasy/game";
import { SquadSheet } from "./Pieces";
import { Icon } from "@/components/Icons";
import { matchdayStatus } from "@/lib/fantasy/lifecycle.mjs";

const copy = fantasyPage;
type Ready = Extract<Game, { state: "ready" }>;

/** Where the matchday stands, in a word. */
export function statusOf(game: Ready) {
  const { tone, key } = matchdayStatus(game.open, game.market.status, game.current);
  return { tone, key, label: copy.status[key] };
}

const deadlineFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
/** A deadline the way managers read it, in Lagos time like the rest of the league. */
export const formatDeadline = (iso: string) => deadlineFormat.format(new Date(iso));

const pts = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 2 });

/**
 * The standings. On the full page the top three stand on a podium (on the first page only);
 * `compact` is the dashboard's short list.
 * The signed-in manager's row is marked and stays in view while the list scrolls.
 */
export function StandingsTable({ rows, me, compact, podium = false }: { rows: Standing[]; me?: string; compact?: boolean; podium?: boolean }) {
  const s = copy.standings;
  if (!rows.length) return <p className="fx-empty">{s.empty}</p>;
  const top = podium ? rows.filter((r) => r.rank <= 3).slice(0, 3) : [];
  const rest = top.length === 3 ? rows.filter((r) => !top.includes(r)) : rows;
  const you = (r: Standing) => r.managerId === me;
  return (
    <div className="fx-lb" data-compact={compact ? "" : undefined}>
      {top.length === 3 && (
        <ol className="fx-podium" aria-label="Top three">
          {top.map((r) => (
            <li key={r.managerId} data-place={r.rank} data-me={you(r) ? "" : undefined}>
              <div className="fx-podium__card">
                <span className="fx-podium__crown" aria-hidden>
                  <Icon name={r.rank === 1 ? "crown" : "trophy"} size={r.rank === 1 ? 18 : 14} />
                </span>
                <span className="fx-podium__name">
                  {r.name ?? <em>{copy.hub.unnamed}</em>}
                  {you(r) && <small>{copy.hub.you}</small>}
                </span>
                <b className="fx-podium__pts">
                  {pts(r.total)}
                  <small>pts</small>
                </b>
              </div>
              <div className="fx-podium__step">
                <span className="sr-only">Place </span>
                <span className="fx-podium__place">{r.rank}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
      {rest.length > 0 && (
        <ol className="fx-lb__rows" start={rest[0]!.rank}>
          {!compact && (
            <li className="fx-lb__head" aria-hidden>
              <span>{s.rank}</span>
              <span>{s.manager}</span>
              <span className="fx-lb__num">{s.total}</span>
            </li>
          )}
          {rest.map((r) => (
            <li key={r.managerId} data-me={you(r) ? "" : undefined} data-podium={r.rank <= 3 ? r.rank : undefined}>
              <span className="fx-lb__rank">{r.rank}</span>
              <span className="fx-lb__name">
                <span>{r.name ?? <em>{copy.hub.unnamed}</em>}</span>
                {you(r) && <small>{copy.hub.you}</small>}
              </span>
              <b className="fx-lb__num fx-lb__total">{pts(r.total)}</b>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * The sign-in pages, inside the site's nav: the form in one tile, and beside it (from 900px) a
 * warm mesh panel with a faceless team sheet.
 */
export function AuthCard({ title, lede, children }: { title: { before: string; accent: string }; lede?: string; children: React.ReactNode }) {
  return (
    <div className="page fx-site">
      <Nav />
      <main className="fx-auth">
        <section className="tile fx-auth__panel">
          <div className="fx-auth__form">
            <span className="label">
              <i />
              {copy.label}
            </span>
            <h1 className="fx-auth__title">
              {title.before} <em>{title.accent}</em>
            </h1>
            {lede && <p className="fx-auth__lede">{lede}</p>}
            {children}
          </div>
          <Link className="fx-auth__back" href="/fantasy">
            ← {copy.label}
          </Link>
        </section>
        <div className="mesh-panel fx-auth__art" aria-hidden>
          <MeshGradient />
          <div className="grain" />
          <SquadSheet ghost />
          <p className="fx-auth__quote">
            Pick four. <em>Back one.</em>
          </p>
        </div>
      </main>
    </div>
  );
}
