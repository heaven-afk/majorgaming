import type { Metadata } from "next";
import Footer from "@/components/footer/Footer";
import Scene from "@/components/motion/Scene";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import { Cast, CrewCard, Portraits, Profile } from "@/components/staff/StaffCard";
import { staffPage } from "@/content/staff";
import { getLeague } from "@/lib/league";
import { getStaff } from "@/lib/staff";
import "./staff.css";

export const metadata: Metadata = {
  title: "Staff · MGL",
  description: "The team that runs MGL: leadership, match-day operations, media and community.",
};

/** MGL's own people: the cast, a spread for each featured profile, the rest of leadership, then the crew. */
export default async function StaffPage() {
  const [{ latestSeason }, { profiles, leaders, otherGroups, staff }] = await Promise.all([getLeague(), getStaff()]);
  const copy = staffPage;
  // The cast: leadership first (the page's order), up to seven portraits.
  const faces = staff.filter((s) => s.photo).slice(0, 7);
  const numbered = profiles.length + leaders.length;

  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <Scene className="tile sf-intro" aria-labelledby="staff-title">
          <div className="sf-intro__head">
            <div>
              <span className="label" data-rise>
                <i />
                {copy.label}
              </span>
              <h1 className="sf-intro__title" id="staff-title" data-rise="0.5">
                {copy.title.before} <em>{copy.title.accent}</em>
              </h1>
            </div>
            <p className="sf-intro__lede" data-rise="1">
              {copy.lede}
            </p>
          </div>
          {faces.length > 0 && <Cast people={faces} />}
        </Scene>

        {profiles.map((p, i) => (
          <Scene key={p.slug} className="tile sf-chapter" id={p.slug} aria-labelledby={`profile-${p.slug}`}>
            <Profile person={p} index={i + 1} total={numbered} seasons={i === 0 ? latestSeason.number : undefined} flip={i % 2 === 1} />
          </Scene>
        ))}

        {leaders.length > 0 && (
          <Scene className="tile sf-section" aria-labelledby="lead-title">
            <header className="sf-section__head" data-rise>
              <span className="label">
                <i />
                {copy.lead.label}
              </span>
              <h2 className="sec-title" id="lead-title">
                {copy.lead.title.before} <em>{copy.lead.title.accent}</em>
              </h2>
            </header>
            <Portraits people={leaders} start={profiles.length + 1} />
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
