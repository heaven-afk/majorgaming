"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/gl";

/**
 * Steps through a looping sequence, holding each stage for `holds[stage]` ms, but only while
 * the element is on screen and the tab is visible. With reduced motion it rests on `still`.
 * `cycle` counts completed loops.
 */
export function useStages<T extends HTMLElement>(holds: readonly number[], still: number) {
  const ref = useRef<T>(null);
  const [state, setState] = useState({ stage: 0, cycle: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      // The motion preference only exists in the browser, so it is read after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ stage: still, cycle: 0 });
      return;
    }
    let stage = 0;
    let cycle = 0;
    let timer = 0;
    const next = () => {
      if (document.hidden) {
        timer = window.setTimeout(next, 500);
        return;
      }
      stage = (stage + 1) % holds.length;
      if (stage === 0) cycle++;
      setState({ stage, cycle });
      timer = window.setTimeout(next, holds[stage]);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        clearTimeout(timer);
        if (e.isIntersecting) timer = window.setTimeout(next, holds[stage]);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, [holds, still]);

  return { ref, ...state };
}
