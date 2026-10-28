"use client";

import { useEffect, useRef } from "react";
import { createProgram, cssColor, runLoop } from "@/lib/gl";

const COLORS = ["--mesh-1", "--mesh-2", "--mesh-3", "--mesh-4", "--mesh-5", "--mesh-6"];

/**
 * Six brand colours blended by inverse-distance weights in linear light, with a gentle
 * domain warp so the edges flow. Control points drift slowly and lean toward the pointer.
 */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uCol[6];

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }

void main() {
  float t = uTime;
  float asp = uRes.x / uRes.y;
  vec2 p = vUv;
  p += 0.05 * vec2(sin(vUv.y * 3.1 + t * 0.21), cos(vUv.x * 2.7 - t * 0.17));
  p += 0.022 * vec2(sin(vUv.y * 7.3 - t * 0.15 + 1.7), cos(vUv.x * 6.1 + t * 0.19 + 0.4));

  vec2 lean = uPointer * 0.035;
  vec2 pts[6];
  pts[0] = vec2(0.14, 0.16) + 0.05 * vec2(sin(t * 0.11), cos(t * 0.13));
  pts[1] = vec2(0.10, 0.90) + 0.06 * vec2(cos(t * 0.09 + 1.0), sin(t * 0.12));
  pts[2] = vec2(0.52, 0.56) + 0.10 * vec2(sin(t * 0.14 + 2.0), cos(t * 0.1 + 0.6)) + lean;
  pts[3] = vec2(0.90, 0.86) + 0.07 * vec2(cos(t * 0.12 + 0.3), sin(t * 0.15 + 1.2)) + lean * 0.6;
  pts[4] = vec2(0.96, 0.34) + 0.08 * vec2(sin(t * 0.1 + 3.1), cos(t * 0.13 + 2.2)) + lean;
  pts[5] = vec2(0.62, 1.10) + 0.06 * vec2(cos(t * 0.08 + 4.0), sin(t * 0.11));

  float wgt[6];
  wgt[0] = 1.7; wgt[1] = 0.9; wgt[2] = 1.0; wgt[3] = 1.0; wgt[4] = 1.1; wgt[5] = 0.7;

  vec3 acc = vec3(0.0);
  float sum = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 d = (p - pts[i]) * vec2(asp, 1.0);
    float w = wgt[i] / pow(dot(d, d) + 0.02, 1.45);
    acc += lin(uCol[i]) * w;
    sum += w;
  }
  vec3 col = pow(acc / sum, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function MeshGradient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = createProgram(canvas, FRAG);
    if (!ctx) return;
    const { gl, u } = ctx;
    const cols = COLORS.flatMap(cssColor);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const loop = runLoop(canvas, gl, 0.5, (time) => {
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform1f(u("uTime"), time + 20);
      gl.uniform2f(u("uPointer"), pointer.x, pointer.y);
      gl.uniform3fv(u("uCol"), cols);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    canvas.dataset.ready = "";

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      loop.dispose();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="mesh" aria-hidden />;
}
