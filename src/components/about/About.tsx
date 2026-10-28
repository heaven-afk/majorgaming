import Image from "next/image";
import { Fragment } from "react";
import { getHome } from "@/content/home";
import { howItWorks, registration, site } from "@/content/site";
import { Mark } from "../brand/Mark";
import MeshGradient from "../hero/MeshGradient";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";
import { Odometer } from "./Odometer";
import StepClimb from "./StepClimb";
import StepPlacement from "./StepPlacement";
import StepRegister from "./StepRegister";

const words = (text: string, key: string) =>
  text.split(" ").map((w, i) => (
    <Fragment key={`${key}-${i}`}>
      <span className="w" data-word>
        {w}
      </span>{" "}
    </Fragment>
  ));

function Statement({ statement }: { statement: Awaited<ReturnType<typeof getHome>>["about"]["statement"] }) {
  return (
    <h2 className="statement" id="about-title" data-statement>
      {statement.map((t, i) => {
        if ("text" in t) return words(t.text, `t${i}`);
        if ("accent" in t) return <em key={i}>{words(t.accent, `a${i}`)}</em>;
        return (
          <Fragment key={i}>
            <span className={`schip schip--${t.chip}`} data-word data-chip aria-hidden>
              {t.chip === "avatars" ? (
                t.avatars.map((a) => <Image key={a.src} src={a.src} alt="" width={64} height={64} />)
              ) : (
                <Image src={t.src} alt="" width={180} height={82} />
              )}
            </span>{" "}
          </Fragment>
        );
      })}
    </h2>
  );
}

const visuals = [<StepRegister key="r" />, <StepPlacement key="p" />, <StepClimb key="c" />];

export default async function About() {
  const { about } = await getHome();
  const { image, stats } = about;
  const join = registration.open ? registration : { label: "Join the Discord", href: site.discord };

  return (
    <Scene className="about" id="about" aria-labelledby="about-title">
      <div className="about__grid">
        <article className="tile about__statement" data-rise>
          <header className="about__head">
            <span className="label">
              <i />
              {about.label}
            </span>
            <span className="about__meta">{about.meta}</span>
          </header>
          <Statement statement={about.statement} />
        </article>

        <figure className="tile about__photo" data-photo>
          <div className="about__photo-img" data-photo-img>
            <Image src={image.src} alt={image.alt} fill sizes="(min-width: 900px) 34vw, 100vw" />
          </div>
          <figcaption className="about__cap">
            <Mark size={26} tone="#f4f2ee" />
            <span>
              <strong>{image.caption}</strong>
              <small>{image.sub}</small>
            </span>
          </figcaption>
        </figure>

        <ul className="about__stats">
          {stats.map((s, i) => (
            <li className={`tile stat${i === stats.length - 1 ? " stat--accent" : ""}`} key={s.label} data-rise={i}>
              <span className="stat__top">
                <span>{s.label}</span>
                <Icon name={s.icon} size={18} />
              </span>
              <Odometer value={s.value} suffix={s.suffix} />
            </li>
          ))}
        </ul>
      </div>

      <div className="how">
        <header className="how__head" data-rise>
          <div>
            <span className="label">
              <i />
              {howItWorks.label}
            </span>
            <h2 className="how__title" id="how-title">
              {howItWorks.title.before} <em>{howItWorks.title.accent}</em>
            </h2>
          </div>
          <a className="btn-light" href={join.href} target="_blank" rel="noreferrer">
            <Icon name="discord" size={18} className="btn-light__icon" />
            {join.label}
          </a>
        </header>

        <ol className="steps">
          {howItWorks.steps.map((s, i) => (
            <li className={`tile step${i === 1 ? " step--light" : ""}`} key={s.title} data-rise={i}>
              {i === 1 && (
                <>
                  <MeshGradient />
                  <div className="grain" aria-hidden />
                </>
              )}
              <div className="step__visual">{visuals[i]}</div>
              <div className="step__text">
                <span className="step__num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Scene>
  );
}
