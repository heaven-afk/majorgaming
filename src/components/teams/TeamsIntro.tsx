import { teamsPage } from "@/content/teams";
import { getLeague } from "@/lib/league";
import { Crest } from "../about/Crest";
import Scene from "../motion/Scene";

/** The top of the Teams page: what it holds, and a quiet row of crests from the directory. */
export default async function TeamsIntro() {
  const { activeEvent, activeTeams, profileOf, events } = await getLeague();
  const copy = teamsPage;
  const countries = new Set(activeTeams.flatMap((t) => profileOf(t.slug)!.roster.flatMap((l) => l.person.country ?? [])));
  const facts = [
    { label: copy.facts.squads, value: activeTeams.length },
    { label: copy.facts.tiers, value: new Set(activeTeams.map((t) => t.tier)).size },
    { label: copy.facts.players, value: activeTeams.reduce((n, t) => n + t.players, 0) },
    // Countries once players have them; until then, the events on record.
    countries.size ? { label: copy.facts.countries, value: countries.size } : { label: copy.facts.events, value: events.length },
  ];

  return (
    <Scene className="tile tm-intro" aria-labelledby="teams-title">
      <div className="tm-intro__head" data-rise>
        <span className="label">
          <i />
          {copy.label}
        </span>
        <h1 className="ev-intro__title" id="teams-title">
          {copy.title.before} <em>{copy.title.accent}</em>
        </h1>
        <p className="ev-intro__lede">{copy.lede(activeEvent.name)}</p>
      </div>
      <ul className="tm-intro__crests" aria-hidden data-rise="1">
        {activeTeams.slice(0, 6).map((t, i) => (
          <li key={t.slug} style={{ "--i": i } as React.CSSProperties}>
            <Crest name={t.name} size={72} />
          </li>
        ))}
      </ul>
      <dl className="ev-facts" data-rise="2">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </Scene>
  );
}
