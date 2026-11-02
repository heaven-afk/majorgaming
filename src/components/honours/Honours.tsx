import Image from "next/image";
import { getHome } from "@/content/home";
import { Crest } from "../about/Crest";
import { Odometer } from "../about/Odometer";
import { Mark } from "../brand/Mark";
import { Flag } from "../Flag";
import Scene from "../motion/Scene";
import HonourCard from "./HonourCard";

const SUFFIX = ["st", "nd", "rd"];
/** Dealt in from the sides first, the winner last and from lower down. */
const DEAL = [
  { tilt: 0, at: 0.24 },
  { tilt: -1, at: 0 },
  { tilt: 1, at: 0.1 },
];

/** Last season's top three players, honoured as collectible cards. */
export default async function Honours() {
  const { honours } = await getHome();
  if (!honours.players.length) return null;
  return (
    <Scene className="honours" id="honours" aria-labelledby="honours-title">
      <header className="sec-head" data-rise>
        <span className="label">
          <i />
          {honours.label}
        </span>
        <h2 className="sec-title" id="honours-title">
          {honours.title.before} <em>{honours.title.accent}</em>
        </h2>
        <p className="sec-lede">{honours.lede}</p>
      </header>

      <ol className="honours__cards" data-deal-group>
        {honours.players.map((p, i) => (
          <li className={`honours__slot honours__slot--${p.rank}`} key={p.name} data-deal={DEAL[i].tilt} data-deal-at={DEAL[i].at}>
            <HonourCard className={`hcard hcard--${p.rank}`}>
              <div className="hcard__face">
                <header className="hcard__top">
                  <span>{honours.label}</span>
                  <Mark size={20} tone="#f4f2ee" />
                </header>

                <div className="hcard__photo">
                  <Image src={p.image} alt="" fill sizes="(min-width: 1080px) 30vw, 80vw" />
                  <span className="hcard__honour">
                    <span>{p.honour}</span>
                  </span>
                  <span className="hcard__rank" aria-label={`${p.rank}${SUFFIX[p.rank - 1]} place`}>
                    {p.rank}
                    <sup>{SUFFIX[p.rank - 1]}</sup>
                  </span>
                </div>

                <div className="hcard__who">
                  <h3>{p.name}</h3>
                  <span className="hcard__team">
                    <Crest name={p.team} size={22} tone={[0, 2, 5][p.rank - 1]} />
                    {p.team}
                    {p.country && <Flag code={p.country} className="hcard__flag" />}
                  </span>
                </div>

                <dl className="hcard__stats">
                  {p.stats.map((s) => (
                    <div key={s.label}>
                      <dt>{s.label}</dt>
                      <dd>
                        <Odometer value={s.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <i className="hcard__sheen" aria-hidden />
            </HonourCard>
          </li>
        ))}
      </ol>
    </Scene>
  );
}
