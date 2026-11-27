import { getFantasyMarket, getFantasyScores } from "@/lib/fantasy/client";
import { getOwnMatchdayResult, ROLES, type Game } from "@/lib/fantasy/game";
import type { Manager } from "@/lib/fantasy/session";

export function ScoringHelp() {
  return (
    <details className="fx-panel fx-scoring-help">
      <summary>How points are earned</summary>
      <p>Players earn fantasy points from kills, their share of their team’s kills, and how well their team places. The role you assign changes how those results count.</p>
      <p>Only your starters earn points by default. Your captain earns double points, or triple with Triple Captain. Bench Boost adds points from your substitute’s kills. Any transfer deductions are shown separately in the standings.</p>
    </details>
  );
}

const fmt = (points: number | undefined) => points === undefined ? "—" : points.toFixed(2);

export default async function MatchdayPoints({ game, manager, day }: {
  game: Extract<Game, { state: "ready" }>;
  manager: Manager | null;
  day: number;
}) {
  const { id } = game.tournament;
  const [results, own, oldMarket] = await Promise.allSettled([
    getFantasyScores(id, day),
    manager ? getOwnMatchdayResult(manager, id, day) : Promise.resolve(null),
    game.market.players.length ? Promise.resolve(null) : getFantasyMarket(id, day, false, true),
  ]);
  const scores = results.status === "fulfilled" ? results.value.playerScores : [];
  const scoreById = new Map(scores.map(player => [player.playerId, player]));
  const names = new Map(game.market.players.map(player => [player.id, player.name]));
  if (oldMarket.status === "fulfilled" && oldMarket.value) {
    for (const player of oldMarket.value.players) names.set(player.playerId, player.playerName);
  }
  const nameOf = (id: string) => {
    const name = names.get(id);
    const fallback = scoreById.get(id)?.displayMeta?.playerName;
    return name && name !== id && name !== "Unnamed player" ? name
      : fallback && fallback !== id ? fallback : "Unnamed player";
  };
  const ids = [...(names.size ? names.keys() : scoreById.keys())].sort((a, b) =>
    Number(scoreById.has(b)) - Number(scoreById.has(a)) || nameOf(a).localeCompare(nameOf(b)));
  const personal = own.status === "fulfilled" ? own.value : null;
  return (
    <>
      <section id="matchday-points" className="fx-panel fx-points" aria-labelledby="fx-points-title">
        <h2 id="fx-points-title">Matchday {day} points</h2>
        {manager && (
          <div className="fx-points__lineup">
            <h3>Your squad {personal && <span>{fmt(personal.score.totalFantasyPoints)} pts</span>}</h3>
            {personal ? (
              <ul>
                {personal.score.starters.map(player => (
                  <li key={player.playerId}>
                    <span>{nameOf(player.playerId)} <small>{player.role}{player.modifier === "captain" ? " · Captain ×2" : player.modifier === "tripleCaptain" ? " · Triple Captain ×3" : ""}</small></span>
                    <strong>{fmt(player.finalFantasyPoints)}</strong>
                  </li>
                ))}
                {personal.benchId && (
                  <li>
                    <span>{nameOf(personal.benchId)} <small>{personal.score.substituteResult ? "Substitute · Bench Boost" : "Substitute"}</small></span>
                    <strong>{fmt(personal.score.substituteResult?.substituteContribution ?? 0)}</strong>
                  </li>
                )}
              </ul>
            ) : <p>{own.status === "rejected" ? "Your squad points couldn’t load. Try refreshing." : "There’s no scored squad for your account on this matchday."}</p>}
          </div>
        )}
        <h3>Player points by role</h3>
        {results.status === "fulfilled" && ids.length ? (
          <>
            <p>Base points before captain or chip bonuses. A dash means no result was recorded for that role.</p>
            <div className="fx-points__scroll" tabIndex={0} role="region" aria-label="Player points by role">
              <table>
                <thead><tr><th scope="col">Player</th>{ROLES.map(role => <th scope="col" key={role}>{role}</th>)}</tr></thead>
                <tbody>
                  {ids.map(id => (
                    <tr key={id}>
                      <th scope="row">{nameOf(id)}</th>
                      {ROLES.map(role => <td key={role}>{fmt(scoreById.get(id)?.roleScores?.[role]?.baseFantasyPoints)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <p>{results.status === "rejected" ? "Player points couldn’t load. Try refreshing." : "There are no player results for this matchday."}</p>}
      </section>
      <ScoringHelp />
    </>
  );
}
