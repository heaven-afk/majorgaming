"use client";

import { howItWorks } from "@/content/site";
import { Icon } from "../Icons";
import { useStages } from "../motion/useStages";
import { Crest } from "./Crest";

/** Squad waits in the queue, drops into its tier, the tier confirms, the squad clears. */
const HOLDS = [1400, 850, 2400, 550];
const STATES = ["queue", "drop", "placed", "leave"] as const;
const d = howItWorks.demo.placement;

/** Step 2 illustration: each loop places a different squad in its designated tier. */
export default function StepPlacement() {
  const { ref, stage, cycle } = useStages<HTMLDivElement>(HOLDS, 2);
  const squad = d.squads[cycle % d.squads.length];
  const row = stage === 0 ? 0 : squad.tier;
  // Placements this round add to their tier, so each tier fills to capacity once and the
  // counts only reset when the round starts over.
  const round = cycle - (cycle % d.squads.length);
  const count = (tier: number) => {
    let n = d.seated[tier - 1] + (stage >= 2 && squad.tier === tier ? 1 : 0);
    for (let k = round; k < cycle; k++) if (d.squads[k % d.squads.length].tier === tier) n++;
    return Math.min(n, d.capacity);
  };

  return (
    <div className="tiers" ref={ref} aria-hidden>
      <div className="tiers__row tiers__queue">
        <span className="tiers__queue-label" data-on={stage === 0 ? "" : undefined}>
          {stage === 0 ? "Reviewing roster" : "Placement queue"}
        </span>
      </div>

      {d.tiers.map((tier, i) => (
        <div className="tiers__row tier" key={tier} data-hit={stage === 2 && squad.tier === i + 1 ? "" : undefined}>
          <span className="tier__name">
            <i className={`tier__dot tier__dot--${i + 1}`} />
            {tier}
          </span>
          <span className="tier__count" data-full={count(i + 1) === d.capacity ? "" : undefined}>
            <b key={count(i + 1)}>{count(i + 1)}</b>/{d.capacity}
          </span>
          <span className="tier__slot" />
        </div>
      ))}

      <div className="tiers__chip" key={cycle} data-state={STATES[stage]} style={{ "--row": row } as React.CSSProperties}>
        <Crest name={squad.name} size={24} tone={0} />
        <span className="tiers__chip-name">{squad.name}</span>
        <span className="tiers__chip-status">{stage === 0 ? <i className="tiers__spin" /> : <Icon name="check" size={13} />}</span>
      </div>
    </div>
  );
}
