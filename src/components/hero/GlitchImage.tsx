"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createProgram, prefersReducedMotion } from "@/lib/gl";
import { Icon } from "../Icons";
import { audioReady, playGlitch, stopGlitch, unlockAudio } from "./glitchSound";

type Img = { src: string; alt: string; focus: number[] };

/**
 * Two images in one WebGL canvas. Every few seconds (or on hover) the first tears, splits
 * and block-corrupts its way into the second, holds, then glitches back.
 */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uRes;
uniform vec2 uSizeA;
uniform vec2 uSizeB;
uniform vec2 uFocusA;
uniform vec2 uFocusB;
uniform float uMix;
uniform float uGlitch;
uniform float uTick;

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 cover(vec2 uv, vec2 img, vec2 focus) {
  float ra = uRes.x / uRes.y;
  float ri = img.x / img.y;
  vec2 range = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
  return (1.0 - range) * vec2(focus.x, 1.0 - focus.y) + uv * range;
}

vec3 split(sampler2D tex, vec2 uv, vec2 size, vec2 focus, float ca) {
  return vec3(
    texture2D(tex, cover(uv + vec2(ca, 0.0), size, focus)).r,
    texture2D(tex, cover(uv, size, focus)).g,
    texture2D(tex, cover(uv - vec2(ca, 0.0), size, focus)).b
  );
}

void main() {
  float g = uGlitch;
  float tick = uTick;
  vec2 uv = vUv;

  // horizontal tearing on random bands
  float bands = mix(10.0, 48.0, h(vec2(tick, 1.0)));
  float row = floor(uv.y * bands);
  float tear = step(1.0 - 0.55 * g, h(vec2(row, tick)));
  uv.x += (h(vec2(row, tick + 7.0)) - 0.5) * 0.24 * g * tear;

  // blocky displacement
  vec2 cell = floor(uv * vec2(8.0, 18.0));
  float moved = step(1.0 - 0.2 * g, h(cell + tick));
  uv += moved * (vec2(h(cell + 3.0 + tick), h(cell + 9.0 + tick)) - 0.5) * 0.09;
  uv = clamp(uv, 0.0, 1.0);

  // while glitching, the two images swap in blocks
  float blocky = step(h(floor(vUv * vec2(6.0, 14.0)) + tick * 1.31), uMix);
  float sel = mix(uMix, blocky, step(0.02, g));

  float ca = (0.004 + 0.024 * g * (0.5 + h(vec2(tick, row)))) * step(0.01, g);
  vec3 col = mix(split(uA, uv, uSizeA, uFocusA, ca), split(uB, uv, uSizeB, uFocusB, ca), sel);

  // scanlines, static, corrupted blocks, flash lines
  col *= 1.0 - 0.24 * g * step(0.5, fract(gl_FragCoord.y * 0.5));
  col += (h(gl_FragCoord.xy + tick) - 0.5) * 0.3 * g;
  float bad = step(1.0 - 0.12 * g, h(cell * 1.7 + tick + 4.0));
  float l = dot(col, vec3(0.3, 0.59, 0.11));
  vec3 ember = mix(vec3(0.12, 0.03, 0.01), vec3(1.0, 0.58, 0.25), l) * 1.25;
  col = mix(col, h(cell + tick + 2.0) < 0.5 ? ember : vec3(l * 0.86, l * 0.88, l * 0.95), bad);
  col += step(0.985, h(vec2(row * 3.0, tick))) * g * 0.4;
  gl_FragColor = vec4(col, 1.0);
}
`;

const HOLD_DROP = 4600;
const HOLD_AFTER = 2600;

export default function GlitchImage({ drop, after, children }: { drop: Img; after: Img; children?: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // Sound is on by default. Browsers only allow audio after a tap, click or key press
  // (scrolling doesn't count), so it goes live on the first one and the button says so until then.
  const [sound, setSound] = useState(true);
  const [live, setLive] = useState(false);
  const soundRef = useRef(true);

  useEffect(() => {
    try {
      // The saved choice only exists in the browser, so it is read after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem("mgl:sound") === "off") setSound(false);
    } catch {}
  }, []);

  useEffect(() => {
    soundRef.current = sound;
    if (!sound) {
      stopGlitch();
      return;
    }
    if (live) return;
    // Keep listening until audio is actually running: early touches are often scrolls,
    // which browsers do not treat as permission to play.
    const events = ["pointerdown", "pointerup", "click", "touchend", "keydown"] as const;
    const unlock = async (e: Event) => {
      // The sound button handles its own tap; letting this run too would unlock and then
      // the same tap's click would toggle the sound straight back off.
      if ((e.target as Element | null)?.closest?.(".glitch__sound")) return;
      if (await unlockAudio()) setLive(true);
    };
    events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, unlock, { capture: true }));
  }, [sound, live]);

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const ctx = createProgram(el, FRAG);
    if (!ctx) return;
    const { gl, u } = ctx;
    const reduce = prefersReducedMotion();

    const state = { mix: 0, glitch: 0, tick: 0 };
    const sizes = { a: [1, 1], b: [1, 1] };
    let loaded = 0;
    let disposed = false;

    const draw = () => {
      if (loaded < 2) return;
      gl.uniform2f(u("uRes"), el.width, el.height);
      gl.uniform2f(u("uSizeA"), sizes.a[0], sizes.a[1]);
      gl.uniform2f(u("uSizeB"), sizes.b[0], sizes.b[1]);
      gl.uniform2f(u("uFocusA"), drop.focus[0], drop.focus[1]);
      gl.uniform2f(u("uFocusB"), after.focus[0], after.focus[1]);
      gl.uniform1f(u("uMix"), state.mix);
      gl.uniform1f(u("uGlitch"), state.glitch);
      gl.uniform1f(u("uTick"), state.tick);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.max(1, Math.round(el.clientWidth * dpr));
      el.height = Math.max(1, Math.round(el.clientHeight * dpr));
      gl.viewport(0, 0, el.width, el.height);
      draw();
    };

    const load = (src: string, unit: number, key: "a" | "b") => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => {
        if (disposed) return;
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        sizes[key] = [img.naturalWidth, img.naturalHeight];
        loaded++;
        if (loaded === 2) {
          draw();
          box.dataset.ready = "";
          if (!reduce) schedule(HOLD_DROP);
        }
      };
      img.src = src;
    };
    gl.uniform1i(u("uA"), 0);
    gl.uniform1i(u("uB"), 1);
    load(drop.src, 0, "a");
    load(after.src, 1, "b");

    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ---- the glitch itself
    let raf = 0;
    let target = 0;
    const glitchTo = (to: 0 | 1, ms = 700) => {
      if (target === to && !raf) return;
      target = to;
      cancelAnimationFrame(raf);
      const from = state.mix;
      const start = performance.now();
      box.dataset.glitching = "";
      if (soundRef.current && audioReady() && !reduce) playGlitch(ms / 1000 + 0.15);
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / ms);
        if (reduce) {
          state.mix = from + (to - from) * p;
          state.glitch = 0;
        } else {
          // bursts that swell in the middle, with frame-to-frame flicker
          state.glitch = Math.pow(Math.sin(Math.PI * p), 0.5) * (0.55 + Math.random() * 0.45);
          state.mix = from + (to - from) * Math.min(1, p * 1.25);
          state.tick = Math.floor(now / 45);
        }
        draw();
        if (p < 1) raf = requestAnimationFrame(step);
        else {
          raf = 0;
          state.glitch = 0;
          state.mix = to;
          draw();
          delete box.dataset.glitching;
        }
      };
      raf = requestAnimationFrame(step);
    };

    // ---- automatic cycle, paused while hovered or off screen
    let timer = 0;
    let hovering = false;
    let onScreen = true;
    const schedule = (ms: number) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (hovering || !onScreen || document.hidden) return schedule(1200);
        if (target === 0) {
          glitchTo(1);
          schedule(HOLD_AFTER);
        } else {
          glitchTo(0, 520);
          schedule(HOLD_DROP);
        }
      }, ms);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (!onScreen) stopGlitch();
    });
    io.observe(el);

    const enter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hovering = true;
      clearTimeout(timer);
      glitchTo(1);
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hovering = false;
      glitchTo(0, 520);
      if (!reduce) schedule(HOLD_DROP);
    };
    box.addEventListener("pointerenter", enter);
    box.addEventListener("pointerleave", leave);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener("pointerenter", enter);
      box.removeEventListener("pointerleave", leave);
    };
  }, [drop, after]);

  const toggleSound = async () => {
    // On but still locked: this tap is the permission, so start rather than mute.
    const next = sound && !live ? true : !sound;
    setSound(next);
    try {
      localStorage.setItem("mgl:sound", next ? "on" : "off");
    } catch {}
    if (next) {
      if (await unlockAudio()) setLive(true);
      playGlitch(0.45, 0.35);
    }
  };
  // Browsers only allow sound after a click, tap or key press, so until then the button asks for one.
  const label = !sound ? (
    "Sound off"
  ) : live ? (
    "Sound on"
  ) : (
    <>
      <span className="for-touch">Tap for sound</span>
      <span className="for-mouse">Click for sound</span>
    </>
  );

  return (
    <div className="glitch" ref={wrap}>
      <Image className="glitch__fallback" src={drop.src} alt={drop.alt} fill preload sizes="(min-width: 900px) 50vw, 100vw" style={{ objectPosition: `${drop.focus[0] * 100}% ${drop.focus[1] * 100}%` }} />
      <canvas ref={canvas} className="glitch__canvas" aria-hidden />
      {children}
      <button className="glitch__sound" onClick={toggleSound} aria-pressed={sound && live} data-waiting={sound && !live ? "" : undefined}>
        <Icon name={sound && live ? "sound-on" : "sound-off"} size={16} />
        <span>{label}</span>
      </button>
    </div>
  );
}
