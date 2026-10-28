import Image from "next/image";
import { hero, registration, site } from "@/content/site";
import { Mark } from "../brand/Mark";
import { Icon } from "../Icons";
import GlitchImage from "./GlitchImage";
import MeshGradient from "./MeshGradient";

export default function Hero() {
  const { community, title, images } = hero;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="panel panel--left">
        <MeshGradient />
        <div className="grain" aria-hidden />

        <div className="community">
          <ul className="community__faces">
            {community.avatars.map((a, i) => (
              <li key={a.src} style={{ "--i": i } as React.CSSProperties}>
                <Image src={a.src} alt="" width={96} height={96} />
              </li>
            ))}
          </ul>
          <p className="community__text">
            <span>{community.text[0]}</span>
            <span>{community.text[1]}</span>
            <svg className="community__scribble" viewBox="0 0 220 24" aria-hidden>
              <path d="M2 14c22-2 44-3 66-3 18 0 30 1 34 2-14 2-30 4-26 6 8 3 40-6 62-6 16 0 22 4 34 4 12 0 26-3 46-3" />
            </svg>
          </p>
        </div>

        <div className="intro">
          <h1 className="intro__title" id="hero-title">
            <span className="intro__line">
              <span>
                {title.first} <Mark className="intro__mark" size="0.82em" tone="var(--color-graphite)" /> <em>{title.accent}</em>
              </span>
            </span>
            {title.rest.map((line) => (
              <span className="intro__line" key={line}>
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <p className="intro__lede">{hero.lede}</p>
          <a className="btn-dark" href={registration.open ? registration.href : site.discord} target="_blank" rel="noreferrer">
            {registration.open ? registration.label : "Join the Discord"}
          </a>
        </div>

        <ul className="features" aria-label="What MGL covers">
          {hero.features.map((f, i) => (
            <li key={f.icon} title={f.label} style={{ "--i": i } as React.CSSProperties}>
              <Icon name={f.icon} size={21} />
              <span className="sr-only">{f.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel panel--right">
        <GlitchImage drop={images.drop} after={images.after}>
          <span className="chip chip--amber" aria-hidden>
            <span>{hero.chips[0]}</span>
          </span>
          <span className="chip chip--graphite" aria-hidden>
            <span>{hero.chips[1]}</span>
          </span>
        </GlitchImage>
      </div>
    </section>
  );
}
