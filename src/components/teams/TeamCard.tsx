import Image from "next/image";
import type { DirectoryTeam } from "@/lib/league";
import { teamsPage } from "@/content/teams";
import { Crest, toneOf } from "../about/Crest";
import { Icon } from "../Icons";
import { TeamMark } from "./TeamMark";

/**
 * One squad in a list: its mark, name, tag and size, then a row of faces from its roster.
 * The card carries a faint light in the team's own crest colour. Not a results card.
 */
export function TeamCard({ team, style }: { team: DirectoryTeam; style?: React.CSSProperties }) {
  const [light, deep] = toneOf(team.name);
  const more = team.players - team.faces.length;
  return (
    <a className="tm-card" href={`/teams/${team.slug}`} style={{ ...style, "--ta": light, "--tb": deep } as React.CSSProperties}>
      <span className="tm-card__top">
        <TeamMark name={team.name} logo={team.logo} size={52} />
        <span className="tm-card__go" aria-hidden>
          <Icon name="arrow" size={16} />
        </span>
      </span>
      <span className="tm-card__body">
        <strong>{team.name}</strong>
        <small>
          {team.tag && <b>{team.tag}</b>}
          <span>{teamsPage.players(team.players)}</span>
        </small>
      </span>
      {team.faces.length > 0 && (
        <span className="tm-card__faces" aria-hidden>
          {team.faces.map((f, i) =>
            f.photo ? <Image key={i} src={f.photo} alt="" width={80} height={80} sizes="40px" /> : <Crest key={i} name={f.name} size={40} tone={[4, 2, 3, 5][i % 4]} />,
          )}
          {more > 0 && <span className="tm-card__more">+{more}</span>}
        </span>
      )}
    </a>
  );
}
