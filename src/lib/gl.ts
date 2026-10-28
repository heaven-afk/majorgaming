/** Tiny WebGL helpers shared by the hero canvases. */

export const FULLSCREEN_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    if (!gl.isContextLost()) console.error(gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

/** Compiles a fullscreen-triangle program and returns a uniform lookup, or null if WebGL is unavailable. */
export function createProgram(canvas: HTMLCanvasElement, frag: string) {
  const gl = canvas.getContext("webgl", { antialias: false, depth: false, premultipliedAlpha: false });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, FULLSCREEN_VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const cache = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
    return cache.get(name)!;
  };
  return { gl, u };
}

/**
 * Keeps a canvas sized to its box (times `scale`) and runs `draw` every frame while it is
 * on screen and the tab is visible. With reduced motion it only draws on resize.
 */
export function runLoop(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, scale: number, draw: (time: number) => void) {
  const still = prefersReducedMotion();
  let raf = 0;
  let visible = true;
  let time = 0;
  let last = 0;

  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (still || !raf) draw(time);
  };
  const frame = (now: number) => {
    time += Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(time);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (still || raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) start();
    else stop();
  });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  start();

  return {
    redraw: () => draw(time),
    dispose: () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}

/** Reads a CSS colour custom property (hex) as linear-ish 0..1 RGB. */
export function cssColor(name: string): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace("#", "");
  const n = parseInt(hex.length === 3 ? hex.replace(/./g, "$&$&") : hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
