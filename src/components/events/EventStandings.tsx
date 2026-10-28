import { eventsPage } from "@/content/site";
import { sizeOf, type LeagueEvent } from "@/lib/league";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";
import EventTables from "./EventTables";

type Props = {
  event: LeagueEvent;
  /** Show a button to the event's own page. */
  link?: boolean;
  /** Start with every squad shown instead of the top ten. */
  expanded?: boolean;
  /** Replaces the "Season 10, final." heading, for pages that already name the event. */
  heading?: { before: string; accent: string };
};

/** An event's standings section: heading, live pill, its size, and its tables. */
export default function EventStandings({ event, link = false, expanded = false, heading }: Props) {
  const live = event.status === "live";
  const copy = eventsPage.standings;
  const title = live ? copy.title.live : copy.title.final;

  return (
    <Scene className="tile standings ev-standings" id="standings" aria-labelledby="standings-title">
      <header className="standings__head" data-rise>
        <div>
          <div className="standings__labels">
            <span className="label">
              <i />
              {copy.label}
            </span>
            {live && (
              <span className="live">
                <i />
                Live
              </span>
            )}
          </div>
          <h2 className="sec-title" id="standings-title">
            {heading ? heading.before : title.before(event.name)} <em>{heading ? heading.accent : title.accent}</em>
          </h2>
        </div>
        <div className="standings__meta">
          <span>
            {event.matches && `${live ? `Match ${event.matches.played} of ${event.matches.total}` : `${event.matches.total} matches`} · `}
            {sizeOf(event)}
          </span>
          {link && (
            <a className="btn-ghost" href={`/events/${event.slug}`}>
              {event.name}
              <Icon name="arrow" size={16} />
            </a>
          )}
        </div>
      </header>
      <EventTables event={event} expanded={expanded} />
    </Scene>
  );
}
