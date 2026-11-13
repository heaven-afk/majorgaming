"use client";

import { useState } from "react";
import { fantasy } from "@/content/site";
import { fantasyCards, type FantasyCardPlayer } from "@/content/fantasy-cards";
import PlayerCard from "./PlayerCard";
import { Icon } from "../Icons";
import { Ticker } from "../motion/Ticker";
import { useStages } from "../motion/useStages";

const b = fantasy.board;
/** One stage per points event, a hold on the finished matchday, then a quiet reset. */
const HOLDS = [1200, ...b.events.map(() => 1500), 2800, 600];
const DONE = b.events.length;
const RESET = b.events.length + 1;

/**
 * A live fantasy squad on a loop: points land on players as their kills and placements come
 * in, the captain's count double, and the total and rank tick along. Tapping a player makes
 * them captain, so visitors feel the core decision of the game.
 */
export default function SquadBoard({ marketSquad }: { marketSquad?: (FantasyCardPlayer & { price: number })[] }) {
  const { ref, stage } = useStages<HTMLDivElement>(HOLDS, DONE);
  const [captain, setCaptain] = useState(0);
  const players = marketSquad?.slice(0, 4) ?? b.players;
  const sub = marketSquad?.[4] ?? b.sub;

  const reset = stage === RESET;
  const applied = reset ? 0 : Math.min(stage, DONE);
  const base = players.map((_, i) => b.events.slice(0, applied).reduce((n, e) => n + (e.player === i ? e.pts : 0), 0));
  const scored = base.map((pts, i) => pts * (i === captain ? 2 : 1));
  const total = scored.reduce((a, c) => a + c, 0);
  const rank = b.startRank - total * 9;
  const last = applied > 0 && stage <= DONE ? b.events[applied - 1] : null;

  const spent = players.reduce((n, p) => n + p.price, 0) + sub.price;

  return (
    <div className="squad" ref={ref} data-reset={reset ? "" : undefined}>
      <header className="squad__head">
        <div>
          <span className="squad__md">
            <i />
            {b.matchday} · Preview
          </span>
          <strong>{b.squadName}</strong>
        </div>
        <div className="squad__score">
          <Ticker value={total} instant={reset} />
          <small>pts</small>
        </div>
      </header>

      <div className="squad__rank">
        <span>Manager rank</span>
        <b>
          #<Ticker value={rank} instant={reset} />
        </b>
        {total > 0 && (
          <span className="squad__up">
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
              <path d="M4 1l3.5 5h-7z" fill="currentColor" />
            </svg>
            {(b.startRank - rank).toLocaleString("en-US")}
          </span>
        )}
      </div>

      <ul className="squad__grid">
        {players.map((p, i) => {
          const isCaptain = i === captain;
          return (
            <li key={i}>
              <PlayerCard
                player={p}
                captain={isCaptain}
                points={scored[i]}
                instant={reset}
                onSelect={() => setCaptain(i)}
                event={last && last.player === i ? { key: stage, points: last.pts * (isCaptain ? 2 : 1), label: last.label } : null}
              />
            </li>
          );
        })}
      </ul>

      <div className="squad__sub">
        <span className="squad__sub-tag">Sub</span>
        <span className="squad__sub-name">
          {"name" in sub ? sub.name : sub.ign} · {sub.role}
        </span>
        <span className="squad__sub-price">{sub.price.toFixed(1)} cr</span>
      </div>

      <div className="squad__budget">
        <span>Budget</span>
        <span className="squad__bar">
          <i style={{ width: `${(spent / b.budget) * 100}%` }} />
        </span>
        <span>{(b.budget - spent).toFixed(1)} left</span>
      </div>

      <p className="squad__hint">
        <Icon name="crown" size={14} />
        {b.hint}
      </p>
      <p className="squad__sample">{marketSquad ? fantasyCards.labels.sampleScoring : fantasyCards.labels.sample}</p>
    </div>
  );
}
