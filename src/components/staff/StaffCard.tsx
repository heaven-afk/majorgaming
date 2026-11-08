import Image from "next/image";
import { staffPage } from "@/content/staff";
import type { StaffMember } from "@/lib/staff";
import { Crest } from "../about/Crest";
import { Flag } from "../Flag";
import { Icon } from "../Icons";

const regions = new Intl.DisplayNames(["en"], { type: "region" });
const NETWORKS = ["x", "instagram", "discord"] as const;

/** "01", "02"… for the numbered leadership profiles. */
const pad = (n: number) => String(n).padStart(2, "0");

/** The name on two lines: the given names, then the surname in the serif accent. One-word names stay whole. */
function SplitName({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return <>{name}</>;
  const last = words.pop();
  return (
    <>
      <span>{words.join(" ")}</span> <em>{last}</em>
    </>
  );
}

function Socials({ person }: { person: StaffMember }) {
  const links = NETWORKS.flatMap((n) => (person.socials?.[n] ? [{ network: n, href: person.socials[n]! }] : []));
  if (!links.length) return null;
  return (
    <span className="sf-socials">
      {links.map(({ network, href }) => (
        <a key={network} href={href} target="_blank" rel="noreferrer" aria-label={staffPage.on(person.name, staffPage.social[network])}>
          <Icon name={network} size={15} />
        </a>
      ))}
    </span>
  );
}

function Home({ country }: { country?: string }) {
  if (!country) return null;
  return (
    <span className="sf-home">
      <Flag code={country} className="sf-flag" />
      {regions.of(country)}
    </span>
  );
}

/** The top of the page: everyone with a portrait, side by side like a lineup. Each opens their profile below. */
export function Lineup({ people }: { people: StaffMember[] }) {
  return (
    <ul className="sf-lineup" aria-label={staffPage.lineup} style={{ "--n": people.length } as React.CSSProperties}>
      {people.map((p, i) => (
        <li key={p.slug} style={{ "--i": i } as React.CSSProperties}>
          <a href={`#${p.slug}`} className="sf-lineup__item">
            <Image src={p.photo!} alt="" width={480} height={640} sizes="(min-width: 900px) 14vw, 20vw" priority={i < 3} />
            <span className="sf-lineup__cap">
              <strong>{p.name}</strong>
              <small>{p.role}</small>
            </span>
            <span className="sr-only">{staffPage.open(p.name)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * A featured profile: a framed portrait beside the numbered name, role and bio (the first paragraph set larger).
 * `flip` puts the portrait on the right on wide screens.
 */
export function FounderCard({ person, index, seasons, flip }: { person: StaffMember; index: number; seasons?: number; flip?: boolean }) {
  const spot = person.spotlight!;
  const copy = staffPage.founder;
  const [lead, ...rest] = spot.bio;
  return (
    <article className="sf-founder" id={person.slug} data-flip={flip ? "" : undefined} aria-labelledby={`founder-${person.slug}`}>
      <span className="sf-founder__photo" data-rise>
        {person.photo ? (
          <Image src={person.photo} alt="" width={960} height={1200} sizes="(min-width: 900px) 40vw, 92vw" />
        ) : (
          <Crest name={person.name} size={160} />
        )}
      </span>
      <div className="sf-founder__body">
        <span className="sf-founder__no" aria-hidden data-rise="1">
          {pad(index)}
        </span>
        <span className="sf-role" data-rise="1">
          {person.role}
        </span>
        <h3 className="sf-founder__name" id={`founder-${person.slug}`} data-rise="1">
          <SplitName name={person.name} />
        </h3>
        {spot.quote && (
          <blockquote className="sf-founder__quote" data-rise="2">
            <p>{spot.quote}</p>
          </blockquote>
        )}
        {lead && (
          <div className="sf-founder__bio" data-rise="2.5">
            <p className="sf-founder__lead">{lead}</p>
            {rest.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        )}
        {(spot.since || seasons !== undefined || person.country) && (
          <dl className="sf-founder__facts" data-rise="3">
            {spot.since && (
              <div>
                <dt>{copy.facts.since}</dt>
                <dd>{spot.since}</dd>
              </div>
            )}
            {seasons !== undefined && (
              <div>
                <dt>{copy.facts.seasons}</dt>
                <dd>{seasons}</dd>
              </div>
            )}
            {person.country && (
              <div>
                <dt>{copy.facts.home}</dt>
                <dd>
                  <Home country={person.country} />
                </dd>
              </div>
            )}
          </dl>
        )}
        <div data-rise="3.5">
          <Socials person={person} />
        </div>
      </div>
    </article>
  );
}

/** Leadership: a tall portrait with the number and role on top and the name set over its foot. */
export function LeadCard({ person, index, number }: { person: StaffMember; index: number; number: number }) {
  const foot = person.country || NETWORKS.some((n) => person.socials?.[n]);
  return (
    <li className="sf-lead" id={person.slug} data-rise={index * 0.5}>
      <span className="sf-lead__photo">
        {person.photo ? (
          <Image src={person.photo} alt="" width={720} height={900} sizes="(min-width: 760px) 30vw, 92vw" />
        ) : (
          <Crest name={person.name} size={120} />
        )}
      </span>
      <span className="sf-lead__top">
        <span className="sf-lead__no" aria-hidden>
          {pad(number)}
        </span>
        <span className="sf-role">{person.role}</span>
      </span>
      <span className="sf-lead__info">
        <strong>
          <SplitName name={person.name} />
        </strong>
        {foot && (
          <span className="sf-lead__foot">
            <Home country={person.country} />
            <Socials person={person} />
          </span>
        )}
      </span>
    </li>
  );
}

/** Everyone else: a compact card with a round portrait or initials. */
export function CrewCard({ person, index }: { person: StaffMember; index: number }) {
  return (
    <li className="sf-card" id={person.slug} data-rise={Math.min(index, 5) * 0.3}>
      <span className="sf-card__top">
        <span className="sf-card__face">
          {person.photo ? <Image src={person.photo} alt="" width={128} height={128} sizes="56px" /> : <Crest name={person.name} size={56} />}
        </span>
        <Socials person={person} />
      </span>
      <span className="sf-card__body">
        <strong>{person.name}</strong>
        <span className="sf-card__role">{person.role}</span>
        <Home country={person.country} />
      </span>
    </li>
  );
}
