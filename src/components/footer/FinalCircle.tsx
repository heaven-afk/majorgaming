"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/gl";

type Art = {
  src: string;
  width: number;
  height: number;
  /** Where the circle centres, as fractions of the artwork. */
  focus: readonly [number, number];
};

type Props = {
  image: { wide: Art; tall: Art; alt: string };
  circle: string;
  arrived: string;
  children: React.ReactNode;
};

/** Matches the CSS breakpoint where the footer switches to the wide artwork. */
const WIDE = "(min-width: 900px)";

/**
 * The footer's closing scene. Like a battle royale zone in reverse, a ringed circle around
 * the squad opens to fill the panel as the visitor scrolls to the end of the page. Without
 * motion (or before hydration) the scene simply shows in full.
 */
export default function FinalCircle({ image, circle, arrived, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const img = el?.querySelector<HTMLImageElement>(".zone__img");
    if (!el || !img || prefersReducedMotion()) return;
    gsap.registerPlugin(ScrollTrigger);

    // The circle sits on the artwork's focus point wherever the crop puts it, so work it out
    // from the image box, its object-position and the art in use on every refresh.
    let from = 0;
    let to = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const art = window.matchMedia(WIDE).matches ? image.wide : image.tall;
      const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      const box = { x: img.offsetLeft, y: img.offsetTop, w: img.offsetWidth, h: img.offsetHeight };
      const scale = Math.max(box.w / art.width, box.h / art.height);
      const w = art.width * scale;
      const h = art.height * scale;
      const cx = box.x + (box.w - w) * (pos[0] ?? 0.5) + art.focus[0] * w;
      const cy = box.y + (box.h - h) * (pos[1] ?? 0.5) + art.focus[1] * h;
      from = Math.min(r.width, r.height) * 0.32;
      to = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) + 4;
      el.style.setProperty("--x", `${cx}px`);
      el.style.setProperty("--y", `${cy}px`);
    };
    const paint = (p: number) => {
      const eased = gsap.parseEase("power2.inOut")(p);
      el.style.setProperty("--r", `${from + (to - from) * eased}px`);
      el.style.setProperty("--p", p.toFixed(3));
      if (p > 0.97) el.dataset.open = "";
      else delete el.dataset.open;
    };

    el.dataset.armed = "";
    measure();
    paint(0);

    // The scene holds in the middle of the screen while the circle opens, then moves on.
    const st = ScrollTrigger.create({
      trigger: el,
      start: "center center",
      end: "+=90%",
      pin: true,
      anticipatePin: 1,
      scrub: 0.7,
      onRefresh: (self) => {
        measure();
        paint(self.progress);
      },
      onUpdate: (self) => paint(self.progress),
    });

    return () => {
      st.kill();
      delete el.dataset.armed;
      delete el.dataset.open;
      ["--x", "--y", "--r", "--p"].forEach((v) => el.style.removeProperty(v));
    };
  }, [image]);

  // One picture per crop: the wide artwork on desktop, the tall one on phones.
  const common = { alt: image.alt, sizes: "(min-width: 1440px) 1400px, 100vw" };
  const wide = getImageProps({ ...common, ...image.wide }).props;
  const { srcSet: tall, ...rest } = getImageProps({ ...common, ...image.tall }).props;
  const art = (className: string, alt: string) => (
    <picture>
      <source media={WIDE} srcSet={wide.srcSet} width={image.wide.width} height={image.wide.height} />
      <img {...rest} srcSet={tall} className={className} alt={alt} />
    </picture>
  );

  return (
    <div className="zone" ref={ref}>
      {/* Outside the circle: the same world, dimmed like the storm. */}
      <div className="zone__storm" aria-hidden>
        {art("zone__art", "")}
      </div>
      <div className="zone__scene">{art("zone__art zone__img", image.alt)}</div>
      <span className="zone__scrim" aria-hidden />
      <span className="zone__ring" aria-hidden />
      <span className="zone__chip" aria-hidden>
        <i />
        <span className="zone__chip-a">{circle}</span>
        <span className="zone__chip-b">{arrived}</span>
      </span>
      <div className="zone__content">{children}</div>
    </div>
  );
}
