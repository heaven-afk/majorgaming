import Image from "next/image";
import type { DirectoryTeam } from "@/lib/league";
import { teamsPage } from "@/content/teams";
import { Crest } from "../about/Crest";
import { Icon } from "../Icons";

/** One squad in a list: crest, name, tag, faces from its roster and its size. Not a results card. */
export function TeamCard({ team, style }: { team: DirectoryTeam; style?: React.CSSProperties }) {
  return (
    <a className="tm-card" href={`/teams/${team.slug}`} style={style}>
      <span className="tm-card__top">
        <Crest name={team.name} size={64} />
        <span className="tm-card__go" aria-hidden>
          <Icon name="arrow" size={16} />
        </span>
      </span>
      <span className="tm-card__body">
        <strong>{team.name}</strong>
        {team.tag && (
          <small>
            <b>{team.tag}</b>
          </small>
        )}
      </span>
      <span className="tm-card__foot">
        {team.faces.length > 0 && (
          <span className="tm-card__faces" aria-hidden>
            {team.faces.map((f, i) =>
              f.photo ? <Image key={i} src={f.photo} alt="" width={64} height={64} sizes="32px" /> : <Crest key={i} name={f.name} size={30} tone={[4, 2, 3, 5][i % 4]} />,
            )}
          </span>
        )}
        <span className="tm-card__size">{teamsPage.players(team.players)}</span>
      </span>
    </a>
  );
}
