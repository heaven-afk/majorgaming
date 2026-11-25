import Link from "next/link";
import { eventsPage, ladder } from "@/content/site";
import type { IndexTeam, MglTeamRef, TeamResult } from "@/lib/index-results/contract";
import { StandingsMark } from "../standings/StandingsMark";

type Props = {
  teams: TeamResult[];
  /** Entered teams with no results yet, listed after the ranked ones. */
  waiting: IndexTeam[];
  /** The MGL team behind a row: it shows that name and logo, and opens its page. */
  mgl: (team: IndexTeam) => MglTeamRef | undefined;
  limit?: number;
  label: string;
};

const copy = eventsPage.live;
const columns = [
  { label: copy.columns.matches, className: "ladder__kill ladder__more" },
  { label: copy.columns.events, className: "ladder__kill ladder__more" },
  { label: copy.columns.kills, className: "ladder__kill" },
  { label: copy.columns.placement, className: "ladder__place" },
  { label: copy.columns.total, className: "ladder__total" },
];

/** A row's numbers, or a dash in every column until the team has played. */
function Cells({ values }: { values?: number[] }) {
  return columns.map((column, i) => (
    <span key={column.label} role="cell" className={"num " + column.className}>
      {values ? values[i].toLocaleString("en-US") : <><span aria-hidden>–</span><span className="sr-only">{copy.none}</span></>}
    </span>
  ));
}

/** Live standings in the same table as the rest of the site. Teams show from the start, with dashes until they score. */
export default function LiveLadder({ teams, waiting, mgl, limit, label }: Props) {
  const ranked = limit ? teams.slice(0, limit) : teams;
  const unranked = waiting
    .map(team => ({ ...team, shown: mgl(team)?.name ?? team.name }))
    .sort((a, b) => a.shown.localeCompare(b.shown, "en", { sensitivity: "base" }))
    .slice(0, limit ? Math.max(0, limit - ranked.length) : undefined);

  const name = (team: IndexTeam, tone: number, leading = false, small?: string) => {
    const match = mgl(team);
    const shown = match?.name ?? team.name;
    return (
      <span role="rowheader" className="ladder__team">
        <StandingsMark name={shown} logo={match?.logo} size={32} tone={tone} />
        <span className="ladder__name">
          <span className="ladder__line">
            {match ? <Link className="ladder__link" href={"/teams/" + match.slug}>{shown}</Link> : <span className="ladder__link">{shown}</span>}
            {leading && <span className="ladder__tag">{ladder.leader.live}</span>}
          </span>
          {small && <small>{small}</small>}
        </span>
      </span>
    );
  };
  const row = (team: TeamResult, i: number) => (
    <div key={team.id} className={"ladder__row" + (i < 3 ? " ladder__row--p" + (i + 1) : "")} role="row" style={{ "--i": i } as React.CSSProperties}>
      <span role="cell" className="ladder__rank"><span className="ladder__pos">{team.rank}</span></span>
      {name(team, i < 3 ? [0, 2, 5][i] : 4, i === 0 && team.totalPoints > 0, copy.small(team.placementPoints, team.kills))}
      <Cells values={[team.matches, team.events, team.kills, team.placementPoints, team.totalPoints]} />
    </div>
  );

  return (
    <div className="ladder ladder--feed" role="table" aria-label={label} data-motion="swap">
      <div className="ladder__row ladder__row--head" role="row">
        <span role="columnheader" className="ladder__rank">#</span>
        <span role="columnheader" className="ladder__team">{copy.columns.team}</span>
        {columns.map(column => <span key={column.label} role="columnheader" className={"num " + column.className}>{column.label}</span>)}
      </div>
      {ranked.length > 0 && <div className="ladder__podium" role="rowgroup">{ranked.slice(0, 3).map(row)}</div>}
      {(ranked.length > 3 || unranked.length > 0) && (
        <div className="ladder__rest" role="rowgroup">
          {ranked.slice(3).map((team, i) => row(team, i + 3))}
          {unranked.map((team, i) => (
            <div key={team.id} className="ladder__row" role="row" style={{ "--i": ranked.length + i } as React.CSSProperties}>
              <span role="cell" className="ladder__rank"><span className="ladder__pos" aria-hidden>–</span><span className="sr-only">{copy.none}</span></span>
              {name(team, 4)}
              <Cells />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
