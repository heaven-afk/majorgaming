import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Crest, initials } from "@/components/about/Crest";
import { Flag } from "@/components/Flag";
import Footer from "@/components/footer/Footer";
import { Icon } from "@/components/Icons";
import Scene from "@/components/motion/Scene";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import "../teams.css";
import { TeamCard } from "@/components/teams/TeamCard";
import { teamsPage } from "@/content/teams";
import { getLeague, type LeagueData } from "@/lib/league";

export async function generateStaticParams() {
  const { teams } = await getLeague();
  return teams.map((t) => ({ team: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/teams/[team]">): Promise<Metadata> {
  const { teamBySlug } = await getLeague();
  const team = teamBySlug((await params).team);
  if (!team) return {};
  return { title: `${team.name} · Teams · MGL`, description: `${team.name}'s lineup, manager and the MGL events they have played.` };
}

/**
 * One squad: who they are (tier, players, events played, and the manager once there is one), their roster, the events they
 * have played, and other squads in their tier. A profile, not a results page: placings stay on
 * the Events page. The team streams in behind a placeholder prebuilt teams never show.
 */
export default function TeamPage({ params }: PageProps<"/teams/[team]">) {
  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <Suspense fallback={<Placeholder />}>
          <TeamContent params={params} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function Placeholder() {
  return (
    <div className="tile ev-season ev-placeholder" aria-busy="true" aria-label="Loading team">
      <i />
      <i />
      <i />
    </div>
  );
}

const regions = new Intl.DisplayNames(["en"], { type: "region" });

type Member = NonNullable<ReturnType<LeagueData["latestEntryOf"]>>["roster"][number];

function PlayerCard({ member, index }: { member: Member; index: number }) {
  const copy = teamsPage.team.roster;
  const { person } = member;
  const { country, photo } = person;
  const details = person.ign || member.role || country;
  return (
    <li className="tm-player" data-rise={Math.min(index, 5) * 0.4}>
      <span className="tm-player__photo">
        {photo ? (
          <Image src={photo} alt="" width={480} height={480} sizes="(min-width: 900px) 22vw, 45vw" />
        ) : (
          <span className="tm-player__mono" aria-hidden>
            {initials(person.name)}
          </span>
        )}
      </span>
      <span className="tm-player__info">
        <span className="tm-player__line">
          <strong>{person.name}</strong>
          {member.captain && <span className="ladder__tag">{copy.captain}</span>}
        </span>
        {details && (
          <small>
            {person.ign && <span>{copy.ign(person.ign)}</span>}
            {member.role && <span>{member.role}</span>}
            {country && (
              <span>
                <Flag code={country} className="tm-flag" />
                {regions.of(country)}
              </span>
            )}
          </small>
        )}
      </span>
    </li>
  );
}

async function TeamContent({ params }: { params: PageProps<"/teams/[team]">["params"] }) {
  const { activeTeams, eventsOf, latestEntryOf, teamBySlug } = await getLeague();
  const team = teamBySlug((await params).team);
  if (!team) notFound();

  const copy = teamsPage.team;
  const played = eventsOf(team.slug);
  const entry = latestEntryOf(team.slug);
  const size = entry?.roster.length ?? 0;
  const tier = entry?.tier;
  const others = activeTeams.filter((t) => t.slug !== team.slug && t.tier === tier).slice(0, 6);

  return (
    <>
      <Scene className="tile tm-hero" aria-labelledby="team-title">
        <div className="tm-hero__top" data-rise>
          <Link className="ev-season__back" href="/teams">
            <Icon name="arrow" size={16} className="ev-season__back-icon" />
            {copy.back}
          </Link>
        </div>
        <div className="tm-hero__id" data-rise="1">
          <span className="tm-hero__crest">
            <Crest name={team.name} size={96} />
          </span>
          <div>
            <h1 className="tm-hero__name" id="team-title">
              {team.name}
            </h1>
            <p className="tm-hero__meta">
              {team.tag && <span className="tm-hero__tag">{team.tag}</span>}
              {team.clan && <span>{team.clan}</span>}
            </p>
          </div>
        </div>
        <dl className="tm-facts" data-rise="2" style={{ "--n": entry?.manager ? 4 : 3 } as React.CSSProperties}>
          <div>
            <dt>{copy.facts.tier}</dt>
            <dd>{teamsPage.tier(tier)}</dd>
          </div>
          <div>
            <dt>{copy.facts.players}</dt>
            <dd>{size || "–"}</dd>
          </div>
          <div>
            <dt>{copy.facts.events}</dt>
            <dd>{played.length}</dd>
          </div>
          {entry?.manager && (
            <div className="tm-facts__manager">
              <dt>{copy.facts.manager}</dt>
              <dd>
                <Crest name={entry.manager.name} size={28} tone={4} />
                <span>{entry.manager.name}</span>
              </dd>
            </div>
          )}
        </dl>
      </Scene>

      {entry && size > 0 && (
        <Scene className="tile tm-roster" aria-labelledby="roster-title">
          <header className="tm-section__head" data-rise>
            <div>
              <span className="label">
                <i />
                {copy.roster.label}
              </span>
              <h2 className="sec-title" id="roster-title">
                {copy.roster.title.before} <em>{copy.roster.title.accent}</em>
              </h2>
            </div>
            <span className="tm-section__meta">
              {copy.roster.players(size)} · {copy.roster.for(played[0].event.name)}
            </span>
          </header>

          <ul className="tm-players">
            {entry.roster.map((m, i) => (
              <PlayerCard key={m.player} member={m} index={i} />
            ))}
          </ul>

        </Scene>
      )}

      {played.length > 0 && (
        <Scene className="tile tm-history" aria-labelledby="history-title">
          <header className="tm-section__head" data-rise>
            <div>
              <span className="label">
                <i />
                {copy.history.label}
              </span>
              <h2 className="sec-title" id="history-title">
                {copy.history.title.before} <em>{copy.history.title.accent}</em>
              </h2>
            </div>
          </header>
          <ul className="tm-played">
            {played.map(({ event, tier }, i) => (
              <li key={event.slug} data-rise={i * 0.4}>
                <a className="tm-played__item" href={`/events/${event.slug}`}>
                  <span className="tm-played__series">{event.series}</span>
                  <strong>{event.name}</strong>
                  <span className="tm-played__foot">
                    <span>{teamsPage.tier(tier)}</span>
                    <span className="tm-played__go">
                      <span className="sr-only">{copy.history.open}</span>
                      <Icon name="arrow" size={16} />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Scene>
      )}

      {others.length > 0 && (
        <Scene className="tm-more" aria-labelledby="more-title">
          <h2 className="ev-pager__title" id="more-title" data-rise>
            {copy.more(tier)}
          </h2>
          <ul className="tm-grid">
            {others.map((t, i) => (
              <li key={t.slug} data-rise={i * 0.3}>
                <TeamCard team={t} />
              </li>
            ))}
          </ul>
        </Scene>
      )}
    </>
  );
}
