import Link from "next/link";
import MeshGradient from "@/components/hero/MeshGradient";
import Nav from "@/components/Nav";
import { fantasyPage } from "@/content/fantasy";
import type { Game, Standing } from "@/lib/fantasy/game";
import { SquadSheet } from "./Pieces";

const copy = fantasyPage;
type Ready = Extract<Game, { state: "ready" }>;

/** Where the matchday stands, in a word. */
export function statusOf(game: Ready) {
  if (game.open) return { tone: "open", label: copy.status.open };
  if (game.market.status === "UNPUBLISHED" || game.market.status === "DRAFT") return { tone: "soon", label: copy.status.unpublished };
  if (game.current.fantasyStatus === "PROCESSED") return { tone: "done", label: copy.status.scored };
  return { tone: "live", label: copy.status.locked };
}

const deadlineFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
/** A deadline the way managers read it, in Lagos time like the rest of the league. */
export const formatDeadline = (iso: string) => deadlineFormat.format(new Date(iso));

/** Standings rows; the signed-in manager's row is marked. */
export function StandingsTable({ rows, me, compact }: { rows: Standing[]; me?: string; compact?: boolean }) {
  const s = copy.standings;
  if (!rows.length) return <p className="fx-empty">{s.empty}</p>;
  return (
    <ol className="fx-table" data-compact={compact ? "" : undefined}>
      <li className="fx-table__head" aria-hidden>
        <span>{s.rank}</span>
        <span>{s.manager}</span>
        <span>{s.total}</span>
      </li>
      {rows.map((r) => (
        <li key={r.managerId} data-me={r.managerId === me ? "" : undefined} data-podium={r.rank <= 3 ? r.rank : undefined}>
          <span className="fx-table__rank">{r.rank}</span>
          <span className="fx-table__name">
            {r.name ?? <em>{copy.hub.unnamed}</em>}
            {r.managerId === me && <small>{copy.hub.you}</small>}
            {r.adjustments !== 0 && !compact && <span className="fx-table__adj">{r.adjustments} from transfers</span>}
          </span>
          <span className="fx-table__pts">{r.total}</span>
        </li>
      ))}
    </ol>
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
