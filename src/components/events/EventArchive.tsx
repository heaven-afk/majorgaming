import { eventsPage } from "@/content/site";
import { events, sizeOf, type LeagueEvent } from "@/lib/league";
import { Crest } from "../about/Crest";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";

/** The event's name with its last word set in the serif accent, like every title on the site. */
function Title({ name }: { name: string }) {
  const words = name.split(" ");
  const last = words.pop();
  return (
    <strong className="ev-card__title">
      {words.length > 0 && `${words.join(" ")} `}
      <em>{last}</em>
    </strong>
  );
}

/** One finished event, led by its name: series, size and champions, opening its full tables. */
export function EventCard({ event, latest = false, note }: { event: LeagueEvent; latest?: boolean; note?: string }) {
  const copy = eventsPage.archive;
  const top = event.tables[0];
  return (
    <a className="ev-card" href={`/events/${event.slug}`} data-latest={latest || undefined}>
      <span className="ev-card__top">
        <span className="ev-card__series">{note ?? event.series}</span>
        {latest && !note && <span className="ev-card__latest">{copy.latest}</span>}
        <span className="ev-card__go" aria-hidden>
          <Icon name="arrow" size={16} />
        </span>
      </span>
      <Title name={event.name} />
      <span className="ev-card__meta">
        {sizeOf(event)
          .split(" · ")
          .map((m) => (
            <span key={m}>{m}</span>
          ))}
        {event.matches && <span>{event.matches.played} matches</span>}
      </span>
      <span className="ev-card__champ">
        <Crest name={event.champion.name} size={32} tone={0} />
        <span>
          <b>{event.champion.name}</b>
          <small>{copy.champions(top.name === "Overall" ? "Event" : top.name)}</small>
        </span>
      </span>
      <span className="sr-only">{copy.open}</span>
    </a>
  );
}

/** Every finished event, newest first. */
export default function EventArchive() {
  const finished = events.filter((e) => e.status === "final");
  const copy = eventsPage.archive;

  return (
    <Scene className="ev-archive" id="archive" aria-labelledby="archive-title">
      <header className="sec-head ev-archive__head" data-rise>
        <span className="label">
          <i />
          {copy.label}
        </span>
        <h2 className="sec-title" id="archive-title">
          {copy.title.before} <em>{copy.title.accent}</em>
        </h2>
        <p className="sec-lede">{copy.lede}</p>
      </header>
      <ul className="ev-archive__grid">
        {finished.map((e, i) => (
          <li key={e.slug} data-rise={Math.min(i, 5) * 0.5}>
            <EventCard event={e} latest={i === 0} />
          </li>
        ))}
      </ul>
    </Scene>
  );
}
