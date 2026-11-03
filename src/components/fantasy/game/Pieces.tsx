import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { Ticker } from "@/components/motion/Ticker";
import { fantasyPage } from "@/content/fantasy";
import type { FantasyRole } from "@/lib/fantasy/client";
import { Headshot } from "./Headshot";

/** MGL Fantasy's wordmark: the MGL mark, then "Fantasy" in the serif accent. */
export function Brand({ href = "/fantasy" }: { href?: string }) {
  return (
    <Link className="fx-brand" href={href} aria-label="MGL Fantasy, home">
      <Mark size={28} tone="#d9d7d2" />
      <span>
        MGL <em>Fantasy</em>
      </span>
    </Link>
  );
}

export type CardPlayer = { name: string; team: string; photo?: string; price?: number; role?: FantasyRole | "Sub"; points?: number };

const SHORT: Record<FantasyRole | "Sub", string> = { Fragger: "FRG", IGL: "IGL", Support: "SUP", Anchor: "ANC", Sub: "SUB" };
// Illustration only: what a matchday could score. The captain's double is shown.
const DEMO_POINTS = [28, 16, 19, 11, 14];

/**
 * A squad laid out as a team sheet: four starters, the captain marked, the sub on the bench and
 * the matchday's points. On the landing it shows real players with sample points; `ghost` draws
 * the same sheet with faceless, nameless rows for the sign-in screens.
 */
export function SquadSheet({ players = [], matchday, ghost }: { players?: CardPlayer[]; matchday?: number; ghost?: boolean }) {
  const s = fantasyPage.landing.sheet;
  const rows = ghost ? (["Fragger", "IGL", "Support", "Anchor", "Sub"] as const).map((role) => ({ role, name: "", team: "" }) as CardPlayer) : players.slice(0, 5);
  const points = rows.map((_, i) => (i === 0 ? DEMO_POINTS[i] * 2 : DEMO_POINTS[i]));
  const total = points.slice(0, 4).reduce((a, b) => a + b, 0);
  const spent = rows.reduce((n, p) => n + (p.price ?? 0), 0);

  const row = (p: CardPlayer, i: number) => (
    <li key={i} className="fx-sheet-row" data-sub={i === 4 ? "" : undefined} style={{ "--i": i } as React.CSSProperties}>
      <span className="fx-role">{SHORT[p.role ?? "Sub"]}</span>
      <Headshot src={p.photo} size={40} />
      <span className="fx-sheet-row__who">
        {ghost ? (
          <>
            <i />
            <i />
          </>
        ) : (
          <>
            <strong>{p.name}</strong>
            <small>{p.team}</small>
          </>
        )}
      </span>
      {i === 0 && <span className="fx-cap">C</span>}
      {!ghost && <b className="fx-sheet-row__pts">{points[i]}</b>}
    </li>
  );

  return (
    <div className="fx-squadsheet" data-ghost={ghost ? "" : undefined} aria-hidden>
      <div className="fx-squadsheet__head">
        <strong>{s.title}</strong>
        {matchday && <span>Matchday {matchday}</span>}
      </div>
      <ol>{rows.slice(0, 4).map(row)}</ol>
      {rows[4] && (
        <>
          <p className="fx-squadsheet__bench">{s.bench}</p>
          <ol>{row(rows[4], 4)}</ol>
        </>
      )}
      {!ghost && (
        <div className="fx-squadsheet__foot">
          <span>
            <small>{s.total}</small>
            <b>
              <Ticker value={total} />
            </b>
          </span>
          {spent > 0 && (
            <span className="fx-squadsheet__budget">
              <small>{spent.toFixed(1)} / 100 cr</small>
              <i style={{ "--fill": `${Math.min(100, spent)}%` } as React.CSSProperties} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
