"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cta, nav, site, socials } from "@/content/site";
import { Mark } from "./brand/Mark";
import { Icon } from "./Icons";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const current = (href: string) => (href === "/" ? path === "/" : href !== "#" && path.startsWith(href));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="nav">
      <div className="nav__pill nav__main">
        <Link className="nav__brand" href="/" aria-label={`${site.name}, home`}>
          <Mark size={26} tone="var(--mark-tone)" />
          <span>
            {site.short}
            <sup>®</sup>
          </span>
        </Link>
        <nav className="nav__links" aria-label="Main">
          {nav.map((n) => (
            <a key={n.label} href={n.href} aria-current={current(n.href) ? "page" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="nav__pill nav__side">
        <div className="nav__socials">
          {socials.map((s) => (
            <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer">
              <Icon name={s.icon} size={18} />
            </a>
          ))}
        </div>
        <a className="btn-light" href={cta.href} target="_blank" rel="noreferrer">
          <Icon name="discord" size={17} className="btn-light__icon" />
          {cta.label}
        </a>
        <button className="nav__menu" aria-expanded={open} aria-controls="nav-sheet" onClick={() => setOpen((o) => !o)}>
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <i />
          <i />
        </button>
      </div>

      <div className="nav__sheet" id="nav-sheet" hidden={!open}>
        <nav aria-label="Mobile">
          {nav.map((n, i) => (
            <a key={n.label} href={n.href} onClick={() => setOpen(false)} style={{ "--i": i } as React.CSSProperties}>
              {n.label}
              <Icon name="arrow" size={18} />
            </a>
          ))}
        </nav>
        <div className="nav__sheet-socials">
          {socials.map((s) => (
            <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer">
              <Icon name={s.icon} size={20} />
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
