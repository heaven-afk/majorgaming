import Image from "next/image";
import { staffPage } from "@/content/staff";
import type { StaffMember } from "@/lib/staff";
import { Crest } from "../about/Crest";
import { Flag } from "../Flag";
import { Icon } from "../Icons";

const regions = new Intl.DisplayNames(["en"], { type: "region" });
const NETWORKS = ["x", "instagram", "discord"] as const;

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

/** The founder's profile: a large portrait beside their quote, bio and a few facts. */
export function FounderCard({ person, seasons }: { person: StaffMember; seasons?: number }) {
  const spot = person.spotlight!;
  const copy = staffPage.founder;
  return (
    <article className="sf-founder" aria-labelledby={`founder-${person.slug}`}>
      <span className="sf-founder__photo" data-rise>
        {person.photo ? (
          <Image src={person.photo} alt="" width={960} height={960} sizes="(min-width: 900px) 40vw, 92vw" />
        ) : (
          <Crest name={person.name} size={160} />
        )}
      </span>
      <div className="sf-founder__body">
        <span className="sf-role" data-rise="1">
          {person.role}
        </span>
        <h3 className="sf-founder__name" id={`founder-${person.slug}`} data-rise="1">
          {person.name}
        </h3>
        {spot.quote && (
          <blockquote className="sf-founder__quote" data-rise="2">
            <p>{spot.quote}</p>
          </blockquote>
        )}
        <div className="sf-founder__bio" data-rise="2.5">
          {spot.bio.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
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
        <div data-rise="3.5">
          <Socials person={person} />
        </div>
      </div>
    </article>
  );
}

/** Leadership: a tall portrait with the name and role set over its foot. */
export function LeadCard({ person, index }: { person: StaffMember; index: number }) {
  return (
    <li className="sf-lead" data-rise={index * 0.5}>
      <span className="sf-lead__photo">
        {person.photo ? (
          <Image src={person.photo} alt="" width={720} height={720} sizes="(min-width: 760px) 30vw, 92vw" />
        ) : (
          <Crest name={person.name} size={120} />
        )}
      </span>
      <span className="sf-lead__info">
        <span className="sf-role">{person.role}</span>
        <strong>{person.name}</strong>
        <span className="sf-lead__foot">
          <Home country={person.country} />
          <Socials person={person} />
        </span>
      </span>
    </li>
  );
}

/** Everyone else: a compact card with a round portrait or initials. */
export function CrewCard({ person, index }: { person: StaffMember; index: number }) {
  return (
    <li className="sf-card" data-rise={Math.min(index, 5) * 0.3}>
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
