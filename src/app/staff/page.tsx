import type { Metadata } from "next";
import Footer from "@/components/footer/Footer";
import Scene from "@/components/motion/Scene";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import { CrewCard, FounderCard, LeadCard, Lineup } from "@/components/staff/StaffCard";
import { staffPage } from "@/content/staff";
import { getLeague } from "@/lib/league";
import { getStaff } from "@/lib/staff";
import "./staff.css";

export const metadata: Metadata = {
  title: "Staff · MGL",
  description: "The team that runs MGL: leadership, match-day operations, media and community.",
};

/** MGL's own people: the featured profiles, the rest of leadership as portraits, then the crew group by group. */
export default async function StaffPage() {
  const [{ latestSeason }, { profiles, leaders, leadership, otherGroups, staff, staffCountries, staffGroups }] = await Promise.all([getLeague(), getStaff()]);
  const copy = staffPage;
  // The lineup: leadership first (the page's order), up to seven portraits.
  const faces = staff.filter((s) => s.photo).slice(0, 7);
  // Only numbers that say something: no "0 countries", no leadership count equal to the whole staff.
  const facts = [
    { label: copy.facts.people, value: staff.length, show: true },
    { label: copy.facts.groups, value: staffGroups.length, show: staffGroups.length > 1 },
    { label: copy.facts.countries, value: staffCountries.size, show: staffCountries.size > 0 },
    { label: copy.facts.leadership, value: leadership.length, show: leadership.length < staff.length },
  ].filter((f) => f.show);

  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <Scene className="tile sf-intro" aria-labelledby="staff-title">
          <div className="sf-intro__head">
            <span className="label" data-rise>
              <i />
              {copy.label}
            </span>
            <h1 className="ev-intro__title" id="staff-title" data-rise="0.5">
              {copy.title.before} <em>{copy.title.accent}</em>
            </h1>
            <p className="ev-intro__lede" data-rise="1">
              {copy.lede}
            </p>
            <dl className="sf-intro__facts" data-rise="1.5">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {faces.length > 0 && <Lineup people={faces} />}
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
            {profiles.map((p, i) => (
              <FounderCard key={p.slug} person={p} index={i + 1} seasons={i === 0 ? latestSeason.number : undefined} flip={i % 2 === 1} />
            ))}
            {leaders.length > 0 && (
              <ul className="sf-leads" data-n={Math.min(leaders.length, 3)} style={{ "--n": Math.min(leaders.length, 3) } as React.CSSProperties}>
                {leaders.map((p, i) => (
                  <LeadCard key={p.slug} person={p} index={i} number={profiles.length + i + 1} />
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
