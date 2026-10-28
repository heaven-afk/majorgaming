import { eventsPage, registration, site } from "@/content/site";
import { featuredEvent, latestSeason, upcomingEvents } from "@/lib/league";
import MeshGradient from "../hero/MeshGradient";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";

/** What the "Now" card shows: a live event, open registration, or the break between seasons. */
function now() {
  const copy = eventsPage.now;
  if (featuredEvent.status === "live") {
    const progress = featuredEvent.matches ? `Match ${featuredEvent.matches.played} of ${featuredEvent.matches.total} played. ` : "";
    return { state: "live", ...copy.live, title: featuredEvent.name, body: progress + copy.live.body, href: "#standings", external: false };
  }
  // An announced event leads the card and links to its details.
  const soon = upcomingEvents[0];
  if (soon) {
    const status = eventsPage.event.registration[soon.registration ?? "closed"];
    return { state: soon.registration === "open" ? "registration" : "offseason", status, title: soon.name, body: soon.summary ?? copy.upcoming.body, cta: copy.upcoming.cta, href: `/events/${soon.slug}`, external: false };
  }
  const next = (latestSeason.number ?? 0) + 1;
  if (registration.open) {
    return { state: "registration", ...copy.registration, title: copy.registration.title(next), href: registration.href, external: true };
  }
  return { state: "offseason", ...copy.offseason, title: copy.offseason.title(next), href: site.discord, external: true };
}

/** The top of the Events page: what Events is, at a glance, beside what is happening now. */
export default function EventsIntro() {
  const card = now();
  const words = card.title.split(" ");
  const [word, number] = [words.slice(0, -1).join(" "), words.at(-1)];

  return (
    <Scene className="ev-intro" aria-labelledby="events-title">
      <div className="tile ev-intro__main">
        <div data-rise>
          <span className="label">
            <i />
            {eventsPage.label}
          </span>
          <h1 className="ev-intro__title" id="events-title">
            {eventsPage.title.before} <em>{eventsPage.title.accent}</em>
          </h1>
          <p className="ev-intro__lede">{eventsPage.lede}</p>
        </div>
      </div>

      <div className="mesh-panel ev-now" data-rise="1" data-state={card.state}>
        <MeshGradient />
        <div className="grain" aria-hidden />
        <div className="ev-now__top">
          <span className="label label--ink">{eventsPage.now.label}</span>
          <span className="ev-now__status">
            <i />
            {card.status}
          </span>
        </div>
        <div>
          <p className="ev-now__title">
            {word} <em>{number}</em>
          </p>
          <p className="ev-now__body">{card.body}</p>
          <a className="btn-dark ev-now__cta" href={card.href} {...(card.external ? { target: "_blank", rel: "noreferrer" } : {})}>
            {card.cta}
            <Icon name="arrow" size={16} />
          </a>
        </div>
      </div>
    </Scene>
  );
}
