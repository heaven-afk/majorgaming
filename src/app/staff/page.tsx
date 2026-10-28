import type { Metadata } from "next";
import Image from "next/image";
import Footer from "@/components/footer/Footer";
import Scene from "@/components/motion/Scene";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import { CrewCard, FounderCard, LeadCard } from "@/components/staff/StaffCard";
import { staffPage } from "@/content/staff";
import { getLeague } from "@/lib/league";
import { getStaff } from "@/lib/staff";
import "./staff.css";

export const metadata: Metadata = {
  title: "Staff · MGL",
  description: "The team that runs MGL: leadership, match-day operations, media and community.",
};

/** MGL's own people: the founder's profile, the rest of leadership as portraits, then the crew group by group. */
export default async function StaffPage() {
  const [{ latestSeason }, { founder, leaders, leadership, otherGroups, staff, staffCountries, staffGroups }] = await Promise.all([getLeague(), getStaff()]);
  const copy = staffPage;
  const faces = staff.filter((s) => s.photo).slice(0, 5);
  const facts = [
    { label: copy.facts.people, value: staff.length },
    { label: copy.facts.groups, value: staffGroups.length },
    { label: copy.facts.countries, value: staffCountries.size },
    { label: copy.facts.leadership, value: leadership.length },
  ];

  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <Scene className="tile sf-intro" aria-labelledby="staff-title">
          <div className="sf-intro__head" data-rise>
            <span className="label">
              <i />
              {copy.label}
            </span>
            <h1 className="ev-intro__title" id="staff-title">
              {copy.title.before} <em>{copy.title.accent}</em>
            </h1>
            <p className="ev-intro__lede">{copy.lede}</p>
          </div>
          {faces.length > 0 && (
            <ul className="sf-intro__faces" aria-hidden data-rise="1">
              {faces.map((s) => (
                <li key={s.slug}>
                  <Image src={s.photo!} alt="" width={160} height={160} sizes="72px" />
                </li>
              ))}
            </ul>
          )}
          <dl className="ev-facts" data-rise="2">
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </Scene>

        {leadership.length > 0 && (
          <Scene className="tile sf-section" aria-labelledby="lead-title">
            <header className="sf-section__head" data-rise>
              <span className="label">
                <i />
                {copy.lead.label}
              </span>
              <h2 className="sec-title" id="lead-title">
                {copy.lead.title.before} <em>{copy.lead.title.accent}</em>
              </h2>
              <p className="sf-section__note">{copy.groups.Leadership}</p>
            </header>
            {founder && <FounderCard person={founder} seasons={latestSeason.number} />}
            {leaders.length > 0 && (
              <ul className="sf-leads" data-n={Math.min(leaders.length, 3)} style={{ "--n": Math.min(leaders.length, 3) } as React.CSSProperties}>
                {leaders.map((p, i) => (
                  <LeadCard key={p.slug} person={p} index={i} />
                ))}
              </ul>
            )}
          </Scene>
        )}

        {otherGroups.length > 0 && (
          <Scene className="tile sf-section" aria-labelledby="crew-title">
            <header className="sf-section__head" data-rise>
              <span className="label">
                <i />
                {copy.crew.label}
              </span>
              <h2 className="sec-title" id="crew-title">
                {copy.crew.title.before} <em>{copy.crew.title.accent}</em>
              </h2>
            </header>
            {otherGroups.map(({ group, people }) => (
              <section key={group} className="sf-group" aria-labelledby={`group-${group}`}>
                <div className="sf-group__head" data-rise>
                  <h3 id={`group-${group}`}>{group}</h3>
                  <span>{copy.groups[group]}</span>
                  <small>{copy.count(people.length)}</small>
                </div>
                <ul className="sf-grid">
                  {people.map((p, i) => (
                    <CrewCard key={p.slug} person={p} index={i} />
                  ))}
                </ul>
              </section>
            ))}
          </Scene>
        )}

        {staff.length === 0 && <p className="tile sf-empty">{copy.empty}</p>}
      </main>
      <Footer />
    </div>
  );
}
