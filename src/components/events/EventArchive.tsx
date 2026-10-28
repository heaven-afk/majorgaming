import Image from "next/image";
import Link from "next/link";
import { eventsPage } from "@/content/site";
import { dateRange } from "@/lib/dates";
import { events, sizeOf, upcomingEvents, type LeagueEvent } from "@/lib/league";
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

/**
 * One event, led by its name. A finished event shows its series, size and champions and opens its
 * full tables; one still to come shows its poster, dates and where registration stands.
 */
export function EventCard({ event, latest = false, note }: { event: LeagueEvent; latest?: boolean; note?: string }) {
  const copy = eventsPage.archive;
  const top = event.tables[0];
  const dates = dateRange(event.startDate, event.endDate);
  const upcoming = event.status === "upcoming";
  return (
    <Link className="ev-card" href={`/events/${event.slug}`} data-latest={latest || undefined} data-upcoming={upcoming || undefined}>
      {event.poster && (
        <span className="ev-card__poster">
          <Image src={event.poster.src} alt="" width={event.poster.width} height={event.poster.height} sizes="(min-width: 760px) 45vw, 100vw" />
        </span>
      )}
      <span className="ev-card__top">
        <span className="ev-card__series">{note ?? event.series}</span>
        {upcoming ? (
          <span className="ev-card__latest">{eventsPage.event.registration[event.registration ?? "closed"]}</span>
        ) : (
          latest && !note && <span className="ev-card__latest">{copy.latest}</span>
        )}
        <span className="ev-card__go" aria-hidden>
          <Icon name="arrow" size={16} />
        </span>
      </span>
      <Title name={event.name} />
      {event.summary && <span className="ev-card__summary">{event.summary}</span>}
      <span className="ev-card__meta">
        {dates && <span>{dates}</span>}
        {top &&
          sizeOf(event)
            .split(" · ")
            .map((m) => <span key={m}>{m}</span>)}
        {event.matches && <span>{event.matches.played} matches</span>}
      </span>
      {event.champion && top && (
        <span className="ev-card__champ">
          <Crest name={event.champion.name} size={32} tone={0} />
          <span>
            <b>{event.champion.name}</b>
            <small>{copy.champions(top.name === "Overall" ? "Event" : top.name)}</small>
          </span>
        </span>
      )}
      <span className="sr-only">{upcoming ? copy.details : copy.open}</span>
    </Link>
  );
}

/** Announced events, soonest first; hidden while there are none. */
export function UpcomingEvents() {
  const copy = eventsPage.upcoming;
  if (!upcomingEvents.length) return null;

  return (
    <Scene className="ev-archive ev-upcoming" id="upcoming" aria-labelledby="upcoming-title">
      <header className="sec-head ev-archive__head" data-rise>
        <span className="label">
          <i />
          {copy.label}
        </span>
        <h2 className="sec-title" id="upcoming-title">
          {copy.title.before} <em>{copy.title.accent}</em>
        </h2>
        <p className="sec-lede">{copy.lede}</p>
      </header>
      <ul className="ev-archive__grid">
        {upcomingEvents.map((e, i) => (
          <li key={e.slug} data-rise={Math.min(i, 5) * 0.5}>
            <EventCard event={e} />
          </li>
        ))}
      </ul>
    </Scene>
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
