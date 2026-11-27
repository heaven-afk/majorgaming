import { getFantasyMarket } from "@/lib/fantasy/client";
import { getOwnMatchdayResult, type Game } from "@/lib/fantasy/game";
import type { Manager } from "@/lib/fantasy/session";

export function ScoringHelp() {
  return (
    <section className="fx-panel fx-scoring-help" aria-labelledby="fx-scoring-title">
      <h2 id="fx-scoring-title">How points are earned</h2>
      <p><strong>Fantasy points (FP)</strong> add up from your starters, captain bonus and any Bench Boost points. Transfer deductions come off your total.</p>
      <dl>
        <div>
          <dt>Base points</dt>
          <dd>A starter’s score before captain or chip bonuses. It comes from kills, their share of the team’s kills, and their team’s placement.</dd>
        </div>
        <div>
          <dt>Role points</dt>
          <dd>The role you assign shapes the base score. Fragger favors kills, IGL weighs kills and team placement, Support favors team placement and kill share, and Anchor favors kill share. The role is already counted in the base score.</dd>
        </div>
      </dl>
      <div>
        <h3>Chips</h3>
        <p>Each chip can be used once per tournament. You can play one scoring chip per matchday.</p>
        <ul>
          <li><strong>Triple Captain</strong> gives your captain 3× their base points. A regular captain earns 2×.</li>
          <li><strong>Bench Boost</strong> adds points from your substitute’s kills. The bench contributes zero by default.</li>
          <li><strong>Free Transfer</strong> waives the 4-point deduction on one transfer during an open transfer window. You choose it when making the transfer.</li>
        </ul>
      </div>
    </section>
  );
}

const fmt = (points: number) => points.toFixed(2);

export default async function MatchdayPoints({ game, manager, day }: {
  game: Extract<Game, { state: "ready" }>;
  manager: Manager;
  day: number;
}) {
  const { id } = game.tournament;
  const [own, oldMarket] = await Promise.allSettled([
    getOwnMatchdayResult(manager, id, day),
    game.market.players.length ? Promise.resolve(null) : getFantasyMarket(id, day, false, true),
  ]);
  const names = new Map(game.market.players.map(player => [player.id, player.name]));
  if (oldMarket.status === "fulfilled" && oldMarket.value) {
    for (const player of oldMarket.value.players) names.set(player.playerId, player.playerName);
  }

  const nameOf = (id: string) => {
    const name = names.get(id);
    return name && name !== id ? name : "Unnamed player";
  };
  const personal = own.status === "fulfilled" ? own.value : null;
  return (
    <section id="matchday-points" className="fx-panel fx-points" aria-labelledby="fx-points-title">
      <h2 id="fx-points-title">Your squad · Matchday {day}</h2>
      <a className="fx-link" href="#fx-scoring-title">How points are earned</a>
      <div className="fx-points__lineup">
        {personal ? (
          <>
            <h3>Squad points <span>{fmt(personal.score.totalFantasyPoints)} pts</span></h3>
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
          </>
        ) : <p>{own.status === "rejected" ? "Your squad points couldn’t load. Try refreshing." : "There’s no scored squad for your account on this matchday."}</p>}
      </div>
    </section>
  );
}
