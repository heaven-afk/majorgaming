"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/gl";

/**
 * Scroll choreography for a Home section. The markup stays server-rendered; this wraps it
 * and drives elements by data attribute:
 *  - [data-word]   lights up word by word as [data-statement] scrolls through
 *  - [data-chip]   inline image chips swing into the sentence
 *  - [data-photo]  opens like an aperture while [data-photo-img] drifts inside it
 *  - [data-rise]   rises in once, staggered by its value
 *  - [data-deal]   cards in a [data-deal-group] are dealt in together; the value (-1, 0, 1)
 *                  sets the tilt, [data-deal-at] the start time in seconds
 *  - [data-odo], [data-reveal]  get [data-armed] at once and [data-in] when on screen, so CSS
 *                  can play their entrance (rolling digits, growing bars)
 *  - [data-letters] its [data-letter] children rise out of a mask as it scrolls to the bottom
 *                  of the screen
 */
export default function Scene({ children, as: Tag = "section", ...props }: React.ComponentProps<"section"> & { as?: "section" | "footer" }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    gsap.registerPlugin(ScrollTrigger);

    const armed = root.querySelectorAll<HTMLElement>("[data-odo], [data-reveal]");
    armed.forEach((o) => (o.dataset.armed = ""));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.in = "";
          io.unobserve(e.target);
        }),
      { threshold: 0.35 },
    );
    armed.forEach((o) => io.observe(o));

    const ctx = gsap.context(() => {
      const statement = root.querySelector("[data-statement]");
      if (statement) {
        gsap.fromTo(
          statement.querySelectorAll("[data-word]"),
          { opacity: 0.13 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: { trigger: statement, start: "top 82%", end: "bottom 48%", scrub: 0.8 },
          },
        );
      }

      gsap.utils.toArray<HTMLElement>("[data-chip]").forEach((chip, i) => {
        gsap.fromTo(
          chip,
          { scale: 0.3, rotate: i % 2 ? 14 : -14 },
          {
            scale: 1,
            rotate: 0,
            ease: "back.out(2.2)",
            scrollTrigger: { trigger: chip, start: "top 86%", end: "top 62%", scrub: 0.8 },
          },
        );
      });

      const photo = root.querySelector<HTMLElement>("[data-photo]");
      if (photo) {
        const r = getComputedStyle(photo).getPropertyValue("--radius").trim() || "26px";
        gsap.fromTo(
          photo,
          { clipPath: `inset(16% 12% 0% 12% round ${r})` },
          {
            clipPath: `inset(0% 0% 0% 0% round ${r})`,
            ease: "none",
            scrollTrigger: { trigger: photo, start: "top bottom", end: "top 35%", scrub: 0.6 },
          },
        );
        gsap.fromTo(
          photo.querySelector("[data-photo-img]"),
          { scale: 1.28, yPercent: -5 },
          {
            scale: 1.06,
            yPercent: 5,
            ease: "none",
            scrollTrigger: { trigger: photo, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      }

      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) => {
        gsap.from(el, {
          y: 64,
          opacity: 0,
          duration: 1.3,
          ease: "expo.out",
          delay: Number(el.dataset.rise || 0) * 0.09,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-deal-group]").forEach((group) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: group, start: "top 78%", once: true } });
        group.querySelectorAll<HTMLElement>("[data-deal]").forEach((card) => {
          const tilt = Number(card.dataset.deal || 0);
          tl.from(
            card,
            {
              y: tilt ? 150 : 210,
              rotate: tilt * 8,
              scale: tilt ? 0.94 : 0.88,
              opacity: 0,
              duration: 1.6,
              ease: "expo.out",
            },
            Number(card.dataset.dealAt || 0),
          );
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-letters]").forEach((word) => {
        gsap.from(word.querySelectorAll("[data-letter]"), {
          yPercent: 115,
          rotate: 6,
          ease: "power2.out",
          stagger: 0.035,
          scrollTrigger: { trigger: word, start: "top bottom", end: "bottom bottom", scrub: 0.7 },
        });
      });
    }, root);

    return () => {
      ctx.revert();
      io.disconnect();
      armed.forEach((o) => {
        delete o.dataset.armed;
        delete o.dataset.in;
      });
    };
  }, []);

  return (
    <Tag ref={ref} {...props}>
      {children}
    </Tag>
  );
}
