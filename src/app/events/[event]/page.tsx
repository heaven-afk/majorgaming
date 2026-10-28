import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Crest } from "@/components/about/Crest";
import { EventCard } from "@/components/events/EventArchive";
import EventStandings from "@/components/events/EventStandings";
import KillTable from "@/components/events/KillTable";
import Footer from "@/components/footer/Footer";
import { Icon } from "@/components/Icons";
import Scene from "@/components/motion/Scene";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import { eventsPage } from "@/content/site";
import { eventBySlug, events, killTablesOf } from "@/lib/league";

export function generateStaticParams() {
  return events.map((e) => ({ event: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/events/[event]">): Promise<Metadata> {
  const event = eventBySlug((await params).event);
  if (!event) return {};
  return {
    title: `${event.name} · Events · MGL`,
    description: `${event.name} standings: ${event.tables.map((t) => t.name).join(", ")}.`,
  };
}

/**
 * One event: its headline facts, every table in full, its top fraggers, and the events either side. The nav and
 * footer render at once; the event streams in behind a quiet placeholder, which prebuilt
 * events never need to show.
 */
export default function EventPage({ params }: PageProps<"/events/[event]">) {
  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <Suspense fallback={<Placeholder />}>
          <EventContent params={params} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function Placeholder() {
  return (
    <div className="tile ev-season ev-placeholder" aria-busy="true" aria-label="Loading event">
      <i />
      <i />
      <i />
    </div>
  );
}

async function EventContent({ params }: { params: PageProps<"/events/[event]">["params"] }) {
  const event = eventBySlug((await params).event);
  if (!event) notFound();

  const copy = eventsPage.event;
  const live = event.status === "live";
  const many = event.tables.length > 1;
  const tiered = event.tables.every((t) => t.tier);
  const at = events.indexOf(event);
  const newer = events[at - 1];
  const older = events[at + 1];

  return (
    <>
      <Scene className="tile ev-season" aria-labelledby="event-title">
        <div data-rise>
          <Link className="ev-season__back" href="/events">
            <Icon name="arrow" size={16} className="ev-season__back-icon" />
            {copy.back}
          </Link>
          <h1 className="ev-intro__title" id="event-title">
            {event.name}, <em>{live ? copy.title.live : many ? copy.title.final.many : copy.title.final.one}</em>
          </h1>
        </div>
        <dl className="ev-facts ev-season__facts" data-rise="1">
          <div className="ev-season__champ">
            <dt>{live ? copy.facts.leader : copy.facts.champions}</dt>
            <dd>
              <Crest name={event.champion.name} size={30} tone={0} />
              <a href={`/teams/${event.champion.slug}`}>{event.champion.name}</a>
            </dd>
          </div>
          <div>
            <dt>{copy.facts.squads}</dt>
            <dd>{event.squads}</dd>
          </div>
          <div>
            <dt>{tiered ? copy.facts.tiers : copy.facts.tables}</dt>
            <dd>{event.tables.length}</dd>
          </div>
          {event.matches && (
            <div>
              <dt>{copy.facts.matches}</dt>
              <dd>{live ? `${event.matches.played}/${event.matches.total}` : event.matches.total}</dd>
            </div>
          )}
        </dl>
      </Scene>

      <EventStandings event={event} expanded heading={many ? copy.tables.many : copy.tables.one} />

      <KillTable event={event.name} tables={killTablesOf(event)} />

      {(newer || older) && (
        <Scene className="ev-pager" aria-labelledby="more-events">
          <h2 className="ev-pager__title" id="more-events" data-rise>
            {copy.more}
          </h2>
          <ul className="ev-pager__grid">
            {newer && (
              <li data-rise="1">
                <EventCard event={newer} note={copy.newer} />
              </li>
            )}
            {older && (
              <li data-rise="2">
                <EventCard event={older} note={copy.older} />
              </li>
            )}
          </ul>
        </Scene>
      )}
    </>
  );
}
