import Image from "next/image";
import { eventsPage, site } from "@/content/site";
import { formatDate } from "@/lib/dates";
import type { LeagueEvent } from "@/lib/league";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";

const STEPS = ["registrationOpens", "registrationCloses", "startDate", "endDate"] as const;

/** Whether an event has anything for the "What to know" section to show. */
export function hasAbout(event: LeagueEvent) {
  return Boolean(event.poster || event.summary || event.description?.length || event.details?.length || STEPS.some((k) => event[k]));
}

/**
 * An event's poster, write-up, key dates and other details. Each part appears only once the
 * admins set it, so past events without posters or dates show none of this.
 */
export default function EventAbout({ event }: { event: LeagueEvent }) {
  const copy = eventsPage.event.about;
  const steps = STEPS.filter((k) => event[k]).map((k) => ({ key: k, label: copy.steps[k], date: formatDate(event[k]!) }));
  const open = event.status === "upcoming" && event.registration === "open";

  return (
    <Scene className="tile ev-about" data-poster={event.poster ? "" : undefined} aria-labelledby="about-title">
      {event.poster && (
        <figure className="ev-about__poster" data-rise>
          <Image src={event.poster.src} alt={event.poster.alt} width={event.poster.width} height={event.poster.height} sizes="(min-width: 900px) 40vw, 100vw" priority />
        </figure>
      )}

      <div className="ev-about__body">
        <header data-rise>
          <span className="label">
            <i />
            {copy.label}
          </span>
          <h2 className="sec-title" id="about-title">
            {copy.title.before} <em>{copy.title.accent}</em>
          </h2>
        </header>

        {(event.summary || event.description?.length) && (
          <div className="ev-about__text" data-rise="1">
            {event.summary && <p className="ev-about__summary">{event.summary}</p>}
            {event.description?.map((p) => <p key={p}>{p}</p>)}
          </div>
        )}

        {steps.length > 0 && (
          <div className="ev-about__dates" data-rise="2">
            <h3>{copy.dates}</h3>
            <ol>
              {steps.map((s) => (
                <li key={s.key}>
                  <span>{s.label}</span>
                  <time dateTime={event[s.key]}>{s.date}</time>
                </li>
              ))}
            </ol>
          </div>
        )}

        {event.details && event.details.length > 0 && (
          <dl className="ev-about__details" data-rise="2">
            {event.details.map((d) => (
              <div key={d.label}>
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {event.status === "upcoming" && (
          <a className={open ? "btn-light ev-about__cta" : "btn-ghost ev-about__cta"} href={open ? (event.registrationUrl ?? site.discord) : site.discord} target="_blank" rel="noreferrer" data-rise="3">
            {open ? copy.register : copy.discord}
            <Icon name="arrow" size={16} />
          </a>
        )}
      </div>
    </Scene>
  );
}
