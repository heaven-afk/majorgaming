"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/gl";

let instance: Lenis | null = null;

/** Glides back to the top, through Lenis when it is running. */
export function scrollToTop() {
  if (instance) instance.scrollTo(0, { duration: 2.4 });
  else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/** Lenis smooth scrolling on GSAP's ticker, so ScrollTrigger scenes stay in step with it. */
export default function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1 });
    instance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      instance = null;
    };
  }, []);
  return null;
}
