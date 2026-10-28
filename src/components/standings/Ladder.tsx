import type { Row } from "@/lib/league";
import { ladder } from "@/content/site";
import { Crest } from "../about/Crest";
import { Odometer } from "../about/Odometer";

function Move({ by }: { by?: number }) {
  if (!by) return <span className="move">–</span>;
  return (
    <span className={`move ${by > 0 ? "move--up" : "move--down"}`}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
        <path d={by > 0 ? "M4 1l3.5 5h-7z" : "M4 7L.5 2h7z"} fill="currentColor" />
      </svg>
      {Math.abs(by)}
      <span className="sr-only">{by > 0 ? " places up" : " places down"}</span>
    </span>
  );
}

type Props = {
  /** Already sorted by total points. */
  rows: Row[];
  live?: boolean;
  /** How many rows to show; all of them when left out. */
  limit?: number;
  label: string;
  /** Rise each row in on scroll (Home), or fade rows in when the table changes (Events). */
  motion?: "scroll" | "swap";
};

/**
 * A tier's standings as a calm, quiet table: the top three share one soft surface with
 * medal-tinted ranks, the rest follow on hairlines.
 */
export function Ladder({ rows, live = false, limit, label, motion = "scroll" }: Props) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const { columns } = ladder;

  const row = (r: (typeof rows)[number], i: number) => (
    <div
      className={`ladder__row${i < 3 ? ` ladder__row--p${i + 1}` : ""}`}
      role="row"
      key={r.slug}
      data-rise={motion === "scroll" ? i * 0.4 : undefined}
      style={{ "--i": i } as React.CSSProperties}
    >
      <span role="cell" className="ladder__rank">
        <span className="ladder__pos">{i + 1}</span>
        {live && <Move by={r.move} />}
      </span>
      <span role="cell" className="ladder__team">
        <Crest name={r.name} size={32} tone={i < 3 ? [0, 2, 5][i] : 4} />
        <span className="ladder__name">
          <span className="ladder__line">
            <a className="ladder__link" href={`/teams/${r.slug}`}>
              {r.name}
            </a>
            {i === 0 && <span className="ladder__tag">{live ? ladder.leader.live : ladder.leader.final}</span>}
          </span>
          <small>
            {r.placement} place · {r.kills} kill
          </small>
        </span>
      </span>
      <span role="cell" className="num ladder__place">
        {r.placement}
      </span>
      <span role="cell" className="num ladder__kill">
        {r.kills}
      </span>
      <span role="cell" className="num ladder__total">
        <Odometer value={r.total} />
      </span>
    </div>
  );

  return (
    <div className="ladder" role="table" aria-label={label} data-live={live ? "" : undefined} data-motion={motion}>
      <div className="ladder__row ladder__row--head" role="row">
        <span role="columnheader" className="ladder__rank">
          #
        </span>
        <span role="columnheader" className="ladder__team">
          Team
        </span>
        <span role="columnheader" className="num ladder__place">
          {columns.placement}
        </span>
        <span role="columnheader" className="num ladder__kill">
          {columns.kills}
        </span>
        <span role="columnheader" className="num ladder__total">
          {columns.total}
        </span>
      </div>
      <div className="ladder__podium" role="rowgroup">
        {shown.slice(0, 3).map((r, i) => row(r, i))}
      </div>
      {shown.length > 3 && (
        <div className="ladder__rest" role="rowgroup">
          {shown.slice(3).map((r, i) => row(r, i + 3))}
        </div>
      )}
    </div>
  );
}
