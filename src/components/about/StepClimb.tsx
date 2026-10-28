"use client";

import { howItWorks } from "@/content/site";
import { Icon } from "../Icons";
import { Ticker } from "../motion/Ticker";
import { useStages } from "../motion/useStages";
import { Crest } from "./Crest";

/** Starting order, three matches that each lift the squad a place, then a quiet reset. */
const HOLDS = [1500, 1500, 1500, 2800, 650];
const d = howItWorks.demo.climb;

/** Step 3 illustration: a squad climbing the standings match by match to first place. */
export default function StepClimb() {
  const { ref, stage } = useStages<HTMLDivElement>(HOLDS, 3);
  const reset = stage === 4;
  const played = reset ? 0 : Math.min(stage, d.gains.length);
  const mine = d.start + d.gains.slice(0, played).reduce((a, b) => a + b, 0);

  const rows = [...d.rivals.map((r) => ({ ...r, me: false })), { name: d.squad, pts: mine, me: true }];
  const order = [...rows].sort((a, b) => b.pts - a.pts).map((r) => r.name);
  const gain = !reset && stage > 0 ? d.gains[stage - 1] : 0;

  return (
    <div className="board" ref={ref} data-reset={reset ? "" : undefined} aria-hidden>
      <div className="board__head">
        <span>{d.label}</span>
        <span>Pts</span>
      </div>
      <ol className="board__list" style={{ "--n": rows.length } as React.CSSProperties}>
        {rows.map((r) => {
          const rank = order.indexOf(r.name);
          return (
            <li className="board__row" key={r.name} data-me={r.me ? "" : undefined} data-top={rank === 0 ? "" : undefined} style={{ "--rank": rank } as React.CSSProperties}>
              <span className="board__pos">{rank + 1}</span>
              <Crest name={r.name} size={22} tone={r.me ? 0 : undefined} />
              <span className="board__name">
                {r.name}
                {r.me && rank === 0 && (
                  <span className="board__crown">
                    <Icon name="crown" size={15} />
                  </span>
                )}
              </span>
              {r.me && gain > 0 && (
                <span className="board__gain" key={stage}>
                  +{gain}
                </span>
              )}
              <Ticker className="board__pts" value={r.pts} instant={reset} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
