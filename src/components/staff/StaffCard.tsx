import Image from "next/image";
import { staffPage } from "@/content/staff";
import type { StaffMember } from "@/lib/staff";
import { Crest } from "../about/Crest";
import { hasSocials, Home, pad, Socials, SplitName } from "./parts";

/**
 * Center-out order for the cast: the first person stands in the middle, the next to their left,
 * the next to their right, and so on. `d` is the distance from the middle (sets the size).
 */
function centerOut<T>(items: T[]) {
  return items
    .map((item, i) => ({ item, i, d: Math.ceil(i / 2), side: i === 0 ? 0 : i % 2 ? -1 : 1 }))
    .sort((a, b) => a.side * a.d - b.side * b.d);
}

/**
 * The top of the page: everyone with a portrait, stood together like a film's cast, the founder
 * in the middle and the rest stepping down either side. Each opens their place further down.
 */
export function Cast({ people }: { people: StaffMember[] }) {
  return (
    <ul className="sf-cast" aria-label={staffPage.lineup} data-deal-group>
      {centerOut(people).map(({ item: p, i, d, side }) => (
        <li key={p.slug} data-d={Math.min(d, 3)} data-deal={side} data-deal-at={d * 0.14}>
          <a href={`#${p.slug}`} className="sf-cast__item">
            <span className="sf-cast__photo">
              <Image src={p.photo!} alt="" width={600} height={800} sizes="(min-width: 900px) 24vw, 40vw" priority={i < 3} />
            </span>
            <span className="sf-cast__credit">
              <small>{p.role}</small>
              <strong>{p.name}</strong>
            </span>
            <span className="sr-only">{staffPage.open(p.name)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * A featured profile, laid out like a magazine spread: number and role, the name set large across
 * the top, then a portrait that stays in view beside the biography (opening with a drop cap).
 * `flip` puts the portrait on the right on wide screens.
 */
export function Profile({ person, index, total, seasons, flip }: { person: StaffMember; index: number; total: number; seasons?: number; flip?: boolean }) {
  const spot = person.spotlight!;
  const copy = staffPage.founder;
  const [lead, ...rest] = spot.bio;
  const facts = [
    spot.since && { label: copy.facts.since, value: spot.since },
    seasons !== undefined && { label: copy.facts.seasons, value: seasons },
    person.country && { label: copy.facts.home, value: <Home country={person.country} /> },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <div className="sf-chapter__in" data-flip={flip ? "" : undefined}>
      <header className="sf-chapter__head">
        <span className="sf-chapter__meta" data-rise>
          <span className="sf-chapter__no">
            {pad(index)} <i>/ {pad(total)}</i>
          </span>
          <span className="sf-role">{person.role}</span>
        </span>
        <h2 className="sf-chapter__name" id={`profile-${person.slug}`} data-rise="0.6">
          <SplitName name={person.name} />
        </h2>
      </header>
      <div className="sf-chapter__body">
        <span className="sf-chapter__photo" data-photo>
          {person.photo ? (
            <span className="sf-chapter__img" data-photo-img>
              <Image src={person.photo} alt="" width={960} height={1200} sizes="(min-width: 900px) 40vw, 92vw" />
            </span>
          ) : (
            <Crest name={person.name} size={160} />
          )}
        </span>
        <div className="sf-chapter__text">
          {spot.quote && (
            <blockquote className="sf-chapter__quote" data-rise>
              <p>{spot.quote}</p>
            </blockquote>
          )}
          {lead && (
            <p className="sf-chapter__lead" data-rise="1">
              {lead}
            </p>
          )}
          {rest.length > 0 && (
            <div className="sf-chapter__bio" data-rise="1.5">
              {rest.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          {(facts.length > 0 || person.socials) && (
            <div className="sf-chapter__foot" data-rise="2">
              {facts.length > 0 && (
                <dl className="sf-chapter__facts">
                  {facts.map((f) => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <Socials person={person} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The rest of leadership: large portraits in full colour, the number on the photo and the name set
 * under it. The middle one sits lower on wide screens so the row reads like a spread, not a grid.
 */
export function Portraits({ people, start }: { people: StaffMember[]; start: number }) {
  return (
    <ul className="sf-portraits" data-deal-group>
      {people.map((p, i) => (
        <li key={p.slug} id={p.slug} className="sf-portrait" data-deal={people.length === 3 ? i - 1 : 0} data-deal-at={i * 0.12}>
          <span className="sf-portrait__photo">
            {p.photo ? (
              <Image src={p.photo} alt={p.name} width={720} height={900} sizes="(min-width: 900px) 30vw, (min-width: 600px) 45vw, 92vw" />
            ) : (
              <Crest name={p.name} size={140} />
            )}
            <span className="sf-portrait__no" aria-hidden>
              {pad(start + i)}
            </span>
          </span>
          <span className="sf-portrait__info">
            <span className="sf-portrait__role">{p.role}</span>
            <strong className="sf-portrait__name">{p.name}</strong>
            {(p.country || hasSocials(p)) && (
              <span className="sf-portrait__foot">
                <Home country={p.country} />
                <Socials person={p} />
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
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
