/**
 * A synthesised glitch hit, built to feel heavy rather than playful: a sub-bass drop,
 * distorted noise crunch, stuttering low saws a tritone apart, and a metallic ring,
 * all through a hard clipper and a compressor. No audio files.
 *
 * Browsers only start audio after the visitor interacts with the page, so the hero
 * unlocks it on the first tap, click or key press and plays from then on.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let bus: GainNode | null = null;
let current: GainNode | null = null;

function clipper(c: AudioContext, amount: number) {
  const shaper = c.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}

export function audioReady() {
  return !!ctx && ctx.state === "running";
}

/**
 * Call from inside a tap, click or key handler. Everything that needs the gesture runs
 * before the first await. Resolves true once audio is actually running.
 */
export async function unlockAudio() {
  if (ctx?.state === "running") return true;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.2;
    bus = ctx.createGain();
    bus.gain.value = 0.7;
    bus.connect(comp).connect(ctx.destination);
  }
  // iOS only fully unlocks after something actually plays inside the gesture.
  const blip = ctx.createBufferSource();
  blip.buffer = ctx.createBuffer(1, 1, 22050);
  blip.connect(ctx.destination);
  blip.start(0);
  try {
    await ctx.resume();
  } catch {}
  return (ctx.state as AudioContextState) === "running";
}

/** Fades out whatever is playing, e.g. when the hero leaves the screen. */
export function stopGlitch() {
  if (!ctx || !current) return;
  current.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
  current = null;
}

export function playGlitch(duration = 0.7, volume = 0.5) {
  if (!ctx || !noise || !bus || ctx.state !== "running") return;
  const c = ctx;
  const now = c.currentTime + 0.01;
  const end = now + duration;

  stopGlitch();
  const out = c.createGain();
  out.gain.value = volume;
  const dirt = clipper(c, 3.5);
  out.connect(dirt).connect(bus);
  current = out;

  // 1. Sub drop: a heavy hit that falls away.
  const sub = c.createOscillator();
  const subG = c.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(70, now);
  sub.frequency.exponentialRampToValueAtTime(26, now + 0.7);
  subG.gain.setValueAtTime(0.0001, now);
  subG.gain.exponentialRampToValueAtTime(1.1, now + 0.012);
  subG.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  sub.connect(subG).connect(out);
  sub.start(now);
  sub.stop(now + 0.9);

  // 2. Crunch: distorted noise with a closing low-pass.
  const crunch = c.createBufferSource();
  crunch.buffer = noise;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 6;
  lp.frequency.setValueAtTime(5200, now);
  lp.frequency.exponentialRampToValueAtTime(180, end);
  const crunchG = c.createGain();
  crunchG.gain.setValueAtTime(0.55, now);
  crunchG.gain.exponentialRampToValueAtTime(0.001, end);
  crunch.connect(lp).connect(clipper(c, 8)).connect(crunchG).connect(out);
  crunch.start(now, Math.random());
  crunch.stop(end);

  // 3. Stutter: low saws a tritone apart, chopped like corrupted data.
  const root = 46 + Math.random() * 12;
  for (const f of [root, root * Math.SQRT2]) {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = f;
    const gate = c.createGain();
    gate.gain.value = 0;
    let t = now;
    while (t < end) {
      const on = 0.02 + Math.random() * 0.045;
      if (Math.random() < 0.7) {
        gate.gain.setValueAtTime(0.32, t);
        gate.gain.setValueAtTime(0, t + on);
      }
      t += on + Math.random() * 0.025;
    }
    osc.connect(gate).connect(out);
    osc.start(now);
    osc.stop(end);
  }

  // 4. Data bursts: short band-passed noise blips at random pitches.
  let t = now + 0.04;
  while (t < end - 0.05) {
    const seg = 0.012 + Math.random() * 0.03;
    const src = c.createBufferSource();
    src.buffer = noise;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900 + Math.random() * 4200;
    bp.Q.value = 4 + Math.random() * 10;
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.setValueAtTime(0, t + seg);
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random(), seg);
    t += seg + Math.random() * 0.06;
  }

  // 5. Metallic ring that decays under it all.
  const ring = c.createOscillator();
  const mod = c.createOscillator();
  const modG = c.createGain();
  const ringG = c.createGain();
  ring.type = "square";
  ring.frequency.value = 182;
  mod.frequency.value = 257;
  modG.gain.value = 140;
  mod.connect(modG).connect(ring.frequency);
  ringG.gain.setValueAtTime(0.12, now);
  ringG.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);
  ring.connect(ringG).connect(out);
  ring.start(now);
  mod.start(now);
  ring.stop(end);
  mod.stop(end);

  setTimeout(() => out.disconnect(), (duration + 0.6) * 1000);
}
