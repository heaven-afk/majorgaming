import { getHome } from "@/content/home";
import { getLeague } from "@/lib/league";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";
import { Ladder } from "./Ladder";
import IndexResults from "../events/IndexResults";

/**
 * Home's Tier 1 top ten. Shows the live event while one is running, otherwise the newest
 * finished event's first table; the full tables live on the Events page.
 */
export default async function Standings() {
  const [{ featuredEvent }, { standings }] = await Promise.all([getLeague(), getHome()]);
  const { live } = standings;
  const title = live ? standings.title.live : standings.title.final;

  return (
    <IndexResults slug={featuredEvent.slug} name={featuredEvent.name} live={live} compact>
      <Scene className="tile standings" id="standings" aria-labelledby="standings-title">
      <header className="standings__head" data-rise>
        <div>
          <div className="standings__labels">
            <span className="label">
              <i />
              {standings.label}
            </span>
            {live && (
              <span className="live">
                <i />
                Live
              </span>
            )}
          </div>
          <h2 className="sec-title" id="standings-title">
            {title.before} <em>{title.accent}</em>
          </h2>
        </div>
        <div className="standings__meta">
          <span>{standings.stage}</span>
          <a className="btn-ghost" href={standings.more.href}>
            {standings.more.label}
            <Icon name="arrow" size={16} />
          </a>
        </div>
      </header>

        <Ladder rows={featuredEvent.tables[0]?.rows ?? []} live={live} limit={10} label={`${standings.label}, ${standings.season}`} />
      </Scene>
    </IndexResults>
  );
}
