import { footer, registration, site, socials } from "@/content/site";
import { Mark } from "../brand/Mark";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";
import BackToTop from "./BackToTop";
import FinalCircle from "./FinalCircle";

const WORDMARK = site.name.split(" ");

/**
 * The bookend to the hero: a final circle opens over the squad at daybreak with a last call to
 * register, then the links, and the full name rising out of the bottom edge.
 */
export default function Footer() {
  const { scene } = footer;
  const primary = registration.open ? registration : { label: "Join the Discord", href: site.discord };

  return (
    <Scene as="footer" className="footer" aria-labelledby="footer-title">
      <FinalCircle image={scene.image} circle={scene.circle} arrived={scene.arrived}>
        <div className="zone__top">
          <span className="zone__status" data-open={registration.open || undefined}>
            <i />
            {registration.open ? scene.status.open : scene.status.closed}
          </span>
          <Mark size={30} tone="#f4f2ee" />
        </div>
        <div className="zone__cta">
          <h2 className="zone__title" id="footer-title">
            {footer.title.before} <em>{footer.title.accent}</em>
          </h2>
          <p className="zone__lede">{footer.lede}</p>
          <div className="zone__actions">
            <a className="btn-light" href={primary.href} target="_blank" rel="noreferrer">
              {primary.label}
            </a>
            {registration.open && (
              <a className="btn-glass" href={site.discord} target="_blank" rel="noreferrer">
                <Icon name="discord" size={18} />
                Join the Discord
              </a>
            )}
          </div>
        </div>
      </FinalCircle>

      <div className="footer__links">
        {footer.columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <nav aria-label="Community">
          <h3>Community</h3>
          <ul className="footer__socials">
            <li>
              <a href={site.discord} target="_blank" rel="noreferrer">
                <Icon name="discord" size={18} />
                Discord
              </a>
            </li>
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  <Icon name={s.icon} size={18} />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="footer__bar">
        <span className="footer__brand">
          <Mark size={22} tone="#c9c7c3" />
          © {footer.year} {site.name} · {footer.tagline}
        </span>
        <small>{footer.legal}</small>
        <BackToTop />
      </div>

      <p className="wordmark" data-letters aria-hidden>
        {WORDMARK.map((word, w) => (
          <span className="wordmark__word" key={word}>
            {[...word].map((ch, i) => (
              <span className="wordmark__letter" data-letter key={i} style={{ "--w": w } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        ))}
      </p>
    </Scene>
  );
}
