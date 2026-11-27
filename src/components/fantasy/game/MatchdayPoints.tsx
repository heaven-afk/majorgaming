import { getFantasyMarket } from "@/lib/fantasy/client";
import { getOwnMatchdayResult, type Game, type Player } from "@/lib/fantasy/game";
import type { Manager } from "@/lib/fantasy/session";
import { Icon } from "@/components/Icons";
import { Headshot } from "./Headshot";
import { GuideLink } from "./GuideLink";

const ROLES = [
  { role: "Fragger", favours: "Kills" },
  { role: "IGL", favours: "Kills and team placement" },
  { role: "Support", favours: "Team placement and kill share" },
  { role: "Anchor", favours: "Kill share" },
];
const CHIPS = [
  { icon: "crown", name: "Triple Captain", body: "Your captain scores 3× instead of 2×." },
  { icon: "squad", name: "Bench Boost", body: "Your sub's kills count too. Otherwise the bench scores 0." },
  { icon: "undo", name: "Free Transfer", body: "One transfer without the −4. Pick it when you make the transfer." },
];

/** How points are earned, folded away until a manager asks for it. */
export function ScoringGuide() {
  return (
    <details className="fx-guide" id="how-points-work">
      <summary>
        <span className="fx-guide__icon" aria-hidden>
          <Icon name="chart" size={16} />
        </span>
        <span className="fx-guide__title">
          <strong>How points work</strong>
          <small>Base points, roles, your captain and chips</small>
        </span>
        <span className="fx-guide__toggle" aria-hidden>
          <span data-closed>Show</span>
          <span data-open>Hide</span>
          <Icon name="chevron" size={14} />
        </span>
      </summary>
      <div className="fx-guide__body">
        <section>
          <h3>Base points</h3>
          <p>Each starter scores from their kills, their share of the team&apos;s kills, and where their team placed. Your total is your starters, your captain&apos;s bonus and any Bench Boost points, less −4 for each extra transfer.</p>
        </section>
        <section>
          <h3>Roles</h3>
          <p>The role you give a player changes what their base points favour.</p>
          <ul className="fx-guide__roles">
            {ROLES.map((r) => (
              <li key={r.role}>
                <b>{r.role}</b>
                <span>{r.favours}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Captain and chips</h3>
          <p>Your captain scores 2×. Each chip works once per tournament, one scoring chip a matchday.</p>
          <ul className="fx-guide__chips">
            {CHIPS.map((c) => (
              <li key={c.name}>
                <span aria-hidden>
                  <Icon name={c.icon} size={14} />
                </span>
                <div>
                  <b>{c.name}</b>
                  <small>{c.body}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  );
}

const fmt = (points: number) => (Number.isInteger(points) ? String(points) : points.toFixed(2));

/** One matchday's points for the signed-in manager, player by player. */
export default async function MatchdayPoints({ game, manager, day, rank, deduction = 0 }: {
  game: Extract<Game, { state: "ready" }>;
  manager: Manager;
  day: number;
  rank?: { rank: number; of: number };
  deduction?: number;
}) {
  const { id } = game.tournament;
  const [own, oldMarket] = await Promise.allSettled([
    getOwnMatchdayResult(manager, id, day, game.market.players.filter((p) => p.eligible).map((p) => p.id)),
    game.market.players.length ? Promise.resolve(null) : getFantasyMarket(id, day, false, true),
  ]);
  const people = new Map<string, Pick<Player, "name" | "photo"> & { team?: string }>(game.market.players.map((p) => [p.id, { name: p.name, photo: p.photo, team: p.team.name }]));
  if (oldMarket.status === "fulfilled" && oldMarket.value) {
    for (const p of oldMarket.value.players) if (!people.has(p.playerId)) people.set(p.playerId, { name: p.playerName });
  }
  const who = (playerId: string) => {
    const p = people.get(playerId);
    return { name: p?.name && p.name !== playerId ? p.name : "Unnamed player", photo: p?.photo, team: p?.team };
  };
  const result = own.status === "fulfilled" ? own.value : null;

  if (!result)
    return (
      <section id="matchday-points" className="fx-panel fx-md" aria-labelledby="fx-md-title">
        <header className="fx-md__head">
          <div>
            <small>Matchday {day}</small>
            <h2 id="fx-md-title">Your points</h2>
          </div>
        </header>
        <p className="fx-md__empty" role={own.status === "rejected" ? "alert" : undefined}>
          {own.status === "rejected" ? "Your points didn't load. Refresh to try again." : "You didn't have a squad scored on this matchday."}
        </p>
      </section>
    );

  const { score, benchId } = result;
  const order = ["Fragger", "IGL", "Support", "Anchor"];
  const starters = [...score.starters].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  const best = Math.max(1, ...starters.map((s) => s.finalFantasyPoints));
  const bench = benchId ? { id: benchId, points: score.substituteResult?.substituteContribution ?? 0, boosted: Boolean(score.substituteResult) } : null;
  const total = score.totalFantasyPoints + deduction;

  return (
    <section id="matchday-points" className="fx-panel fx-md" aria-labelledby="fx-md-title">
      <header className="fx-md__head">
        <div>
          <small>Matchday {day}</small>
          <h2 id="fx-md-title">Your points</h2>
        </div>
        <div className="fx-md__total">
          <b>{fmt(total)}</b>
          <span>
            {rank ? `#${rank.rank.toLocaleString("en-GB")} of ${rank.of.toLocaleString("en-GB")}` : "pts"}
            {deduction !== 0 && <em> · {deduction} transfers</em>}
          </span>
        </div>
      </header>

      <ol className="fx-md__list">
        {starters.map((s) => {
          const p = who(s.playerId);
          const mult = s.modifier === "tripleCaptain" ? "3×" : s.modifier === "captain" ? "2×" : null;
          return (
            <li key={s.playerId} data-captain={mult ? "" : undefined}>
              <Headshot src={p.photo} team={p.team} size={44} />
              <span className="fx-md__who">
                <strong>{p.name}</strong>
                <small>
                  <span className="fx-md__role">{s.role}</span>
                  {mult && <span className="fx-md__cap">Captain {mult}</span>}
                  {p.team && <span className="fx-md__team">{p.team}</span>}
                </small>
              </span>
              <span className="fx-md__pts">
                <b>{fmt(s.finalFantasyPoints)}</b>
                <i aria-hidden style={{ "--w": s.finalFantasyPoints / best } as React.CSSProperties} />
              </span>
            </li>
          );
        })}
        {bench && (
          <li data-bench="">
            <Headshot src={who(bench.id).photo} team={who(bench.id).team} size={44} />
            <span className="fx-md__who">
              <strong>{who(bench.id).name}</strong>
              <small>
                <span className="fx-md__role">Sub</span>
                <span className="fx-md__team">{bench.boosted ? "Bench Boost on" : "Counts only with Bench Boost"}</span>
              </small>
            </span>
            <span className="fx-md__pts">
              <b>{fmt(bench.points)}</b>
            </span>
          </li>
        )}
      </ol>
      <GuideLink className="fx-md__how">How these are worked out</GuideLink>
    </section>
  );
}
