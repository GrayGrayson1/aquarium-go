/**
 * Pure sample generators for the procedural audio engine (no Web Audio dependency → unit-testable).
 * OWNER: lane "audio".
 *
 * Everything here writes plain Float32Arrays; `engine.ts` wraps them in AudioBuffers. All algorithms are our own
 * implementations of textbook techniques (filtered noise, exponential-decay reverb impulses, Karplus–Strong string
 * synthesis, additive bell/kalimba partials, Minnaert-style rising bubble blips).
 */

/** Small seeded PRNG (cosmetic only — never used by the simulation). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = () => number;

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// ───────────────────────────── Noise ─────────────────────────────

export function fillWhite(out: Float32Array, rnd: Rand, gain = 1): Float32Array {
  for (let i = 0; i < out.length; i++) out[i] = (rnd() * 2 - 1) * gain;
  return out;
}

/**
 * Pink (≈ −3 dB/oct) noise, own design: white noise through a bank of unity-DC-gain one-pole low-passes whose
 * corners are spaced ×3 apart (10 Hz … 7.3 kHz at 48 kHz), each weighted by 1/√fc. Below a corner a filter is flat,
 * above it falls at −6 dB/oct; summing the bank this way yields a 1/f power spectrum. A little direct white fills
 * the top octave. Output normalised to a peak of ~0.9.
 */
export function fillPink(out: Float32Array, rnd: Rand, sampleRate = 48000): Float32Array {
  const corners: number[] = [];
  for (let fc = 10; fc < sampleRate * 0.2; fc *= 3) corners.push(fc);
  const coef = corners.map((fc) => 1 - Math.exp((-2 * Math.PI * fc) / sampleRate));
  const weight = corners.map((fc) => Math.sqrt(corners[0] / fc));
  const topWeight = Math.sqrt(corners[0] / (corners[corners.length - 1] * 3)) * 0.8;
  const st = new Float64Array(corners.length);
  for (let i = 0; i < out.length; i++) {
    const w = rnd() * 2 - 1;
    let s = w * topWeight;
    for (let k = 0; k < st.length; k++) {
      st[k] += coef[k] * (w - st[k]);
      s += st[k] * weight[k];
    }
    out[i] = s;
  }
  removeDC(out);
  return normalizePeak(out, 0.9);
}

/** Brown (≈ −6 dB/oct) noise: leaky integration of white noise, DC-safe. */
export function fillBrown(out: Float32Array, rnd: Rand): Float32Array {
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    y = (y + 0.02 * (rnd() * 2 - 1)) * 0.998;
    out[i] = y;
  }
  removeDC(out);
  return normalizePeak(out, 0.9);
}

export function removeDC(buf: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < buf.length; i++) mean += buf[i];
  mean /= Math.max(1, buf.length);
  for (let i = 0; i < buf.length; i++) buf[i] -= mean;
  return buf;
}

export function normalizePeak(buf: Float32Array, peak: number): Float32Array {
  let m = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > m) m = a;
  }
  if (m > 1e-9) {
    const g = peak / m;
    for (let i = 0; i < buf.length; i++) buf[i] *= g;
  }
  return buf;
}

/** Crossfade the tail of a buffer into its head so it loops without a click. */
export function makeLoopable(buf: Float32Array, fadeSamples: number): Float32Array {
  const n = Math.min(fadeSamples, Math.floor(buf.length / 4));
  if (n < 2) return buf;
  const len = buf.length - n;
  const out = new Float32Array(len);
  out.set(buf.subarray(0, len));
  for (let i = 0; i < n; i++) {
    const t = i / n;
    // equal-power crossfade: tail fades out while head fades in
    const a = Math.cos(t * Math.PI * 0.5);
    const b = Math.sin(t * Math.PI * 0.5);
    out[i] = buf[len + i] * a + buf[i] * b;
  }
  return out;
}

// ───────────────────────────── Reverb impulse ─────────────────────────────

export interface ImpulseOptions {
  /** RT60-ish decay time in seconds. */
  seconds: number;
  /** Pre-delay (seconds) before the diffuse tail. */
  preDelay: number;
  /** High-frequency damping 0..1 (1 = very dark tail). */
  damping: number;
  /** Number of discrete early reflections. */
  early: number;
  /** Early-reflection spread window in seconds (bigger rooms → later reflections). */
  earlySpread: number;
}

/**
 * Stereo room impulse: sparse early reflections + exponentially decaying noise tail whose brightness falls over time
 * (time-varying one-pole low-pass). Channels use different noise → natural stereo width.
 */
export function makeImpulse(sampleRate: number, o: ImpulseOptions, rnd: Rand): [Float32Array, Float32Array] {
  const total = Math.ceil(sampleRate * (o.preDelay + o.seconds * 1.1));
  const out: [Float32Array, Float32Array] = [new Float32Array(total), new Float32Array(total)];
  const pre = Math.floor(o.preDelay * sampleRate);
  const k = 6.9 / o.seconds; // e^-6.9 ≈ −60 dB at `seconds`
  for (let ch = 0; ch < 2; ch++) {
    const d = out[ch];
    // early reflections
    for (let e = 0; e < o.early; e++) {
      const t = 0.004 + rnd() * o.earlySpread;
      const idx = Math.floor(t * sampleRate);
      if (idx < total) d[idx] += (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.5) * Math.exp(-t * k * 1.5) * 0.8;
    }
    // diffuse tail
    let lp = 0;
    for (let i = pre; i < total; i++) {
      const t = (i - pre) / sampleRate;
      const env = Math.exp(-t * k);
      // cutoff coefficient: bright at start, darker later (frequency-dependent decay)
      const bright = 1 - o.damping * clamp01(t / o.seconds) * 0.9;
      const a = 0.08 + 0.9 * bright * bright;
      lp += a * ((rnd() * 2 - 1) - lp);
      // soft 3 ms fade-in of the tail to avoid a transient
      const fade = Math.min(1, (i - pre) / (sampleRate * 0.003));
      d[i] += lp * env * fade * 0.6;
    }
  }
  return out;
}

// ───────────────────────────── Plucked / struck tones ─────────────────────────────

export type PluckKind = 'felt' | 'kalimba' | 'glass';

/**
 * Render a single note. 'felt' = Karplus–Strong string with a soft (low-passed) excitation and allpass fractional
 * tuning — a muted felt-piano feel. 'kalimba' = additive tine (fundamental + inharmonic ~5.9× partial + click).
 * 'glass' = inharmonic bell partials with long decay (chimes).
 */
export function renderPluck(sampleRate: number, freq: number, seconds: number, kind: PluckKind, rnd: Rand): Float32Array {
  const n = Math.max(1, Math.floor(sampleRate * seconds));
  const out = new Float32Array(n);
  if (kind === 'felt') renderKarplus(out, sampleRate, freq, rnd);
  else if (kind === 'kalimba') renderAdditive(out, sampleRate, freq, KALIMBA, rnd);
  else renderAdditive(out, sampleRate, freq, GLASS, rnd);
  // fade the last 8% so buffers can end early without a click
  const f = Math.floor(n * 0.08);
  for (let i = 0; i < f; i++) out[n - 1 - i] *= i / f;
  removeDC(out);
  return normalizePeak(out, 0.85);
}

function renderKarplus(out: Float32Array, sr: number, freq: number, rnd: Rand): void {
  const period = sr / freq;
  // averaging weight (0.5 = classic KS, darkest); slightly brighter for higher notes
  const bright = clamp(0.42 + 110 / freq, 0.45, 0.5);
  const avgDelay = 1 - bright;
  let N = Math.max(2, Math.floor(period - avgDelay));
  let frac = period - avgDelay - N; // remaining fractional delay handled by a first-order allpass
  if (frac < 0.15 && N > 2) {
    N -= 1;
    frac += 1;
  }
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(N);
  // soft felt hammer: low-passed noise burst, shaped by a raised-cosine
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += 0.35 * ((rnd() * 2 - 1) - lp);
    line[i] = lp * Math.sin((Math.PI * i) / N);
  }
  // loss per period so higher notes decay faster, like a real damped string
  const t60 = clamp(3.2 - Math.log2(freq / 110) * 0.55, 0.9, 3.4);
  const loss = Math.pow(0.001, 1 / (t60 * freq));
  let idx = 0;
  let prev = 0;
  let apX = 0;
  let apY = 0;
  let body = 0;
  for (let i = 0; i < out.length; i++) {
    const cur = line[idx];
    const avg = (bright * cur + (1 - bright) * prev) * loss;
    prev = cur;
    const y = c * avg + apX - c * apY; // allpass fractional delay
    apX = avg;
    apY = y;
    line[idx] = y;
    idx = (idx + 1) % N;
    body += 0.3 * (cur - body); // gentle body low-pass for warmth
    out[i] = body;
  }
  // felt thump (low sine blip) at the attack
  const thumpLen = Math.floor(sr * 0.05);
  for (let i = 0; i < thumpLen && i < out.length; i++) {
    const t = i / sr;
    out[i] += Math.sin(2 * Math.PI * freq * 0.5 * t) * Math.exp(-t * 70) * 0.25;
  }
}

interface Partial {
  ratio: number;
  amp: number;
  /** decay time constant in seconds (scaled by pitch) */
  tau: number;
}

const KALIMBA: Partial[] = [
  { ratio: 1, amp: 1, tau: 0.9 },
  { ratio: 2.01, amp: 0.08, tau: 0.35 },
  { ratio: 5.93, amp: 0.28, tau: 0.09 },
  { ratio: 12.1, amp: 0.06, tau: 0.03 },
];

const GLASS: Partial[] = [
  { ratio: 1, amp: 1, tau: 2.6 },
  { ratio: 2.32, amp: 0.45, tau: 1.6 },
  { ratio: 4.25, amp: 0.25, tau: 0.9 },
  { ratio: 6.63, amp: 0.12, tau: 0.5 },
  { ratio: 9.38, amp: 0.05, tau: 0.25 },
];

function renderAdditive(out: Float32Array, sr: number, freq: number, partials: Partial[], rnd: Rand): void {
  const pitchScale = clamp(Math.sqrt(440 / freq), 0.5, 1.8);
  for (const p of partials) {
    const f = freq * p.ratio * (1 + (rnd() - 0.5) * 0.002);
    if (f > sr * 0.45) continue;
    const tau = p.tau * pitchScale;
    const phase = rnd() * Math.PI * 2;
    const w = (2 * Math.PI * f) / sr;
    const decayPerSample = Math.exp(-1 / (tau * sr));
    let env = p.amp;
    const attack = Math.floor(sr * 0.002);
    for (let i = 0; i < out.length; i++) {
      const a = i < attack ? i / attack : 1;
      out[i] += Math.sin(phase + w * i) * env * a;
      env *= decayPerSample;
      if (env < 1e-5) break;
    }
  }
  // tine/strike click: short low-passed noise
  let lp = 0;
  const clickLen = Math.floor(sr * 0.006);
  for (let i = 0; i < clickLen && i < out.length; i++) {
    lp += 0.5 * ((rnd() * 2 - 1) - lp);
    out[i] += lp * (1 - i / clickLen) * 0.25;
  }
}

// ───────────────────────────── Water textures ─────────────────────────────

/** One Minnaert-style bubble blip: sine whose pitch rises as the bubble nears the surface; fast exp decay. */
export function addBubbleBlip(out: Float32Array, sr: number, start: number, freq: number, dur: number, amp: number, rise: number): void {
  const n = Math.floor(dur * sr);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx >= out.length) break;
    const t = i / n;
    const f = freq * (1 + rise * t);
    phase += (2 * Math.PI * f) / sr;
    const env = (1 - Math.exp(-i / (sr * 0.0012))) * Math.exp(-t * 5);
    out[idx] += Math.sin(phase) * env * amp;
  }
}

/**
 * HOB-filter waterfall trickle: a dense bed of tiny rising bubble blips over band-limited noise, with slow
 * "burble" amplitude modulation. Loopable.
 */
export function renderTrickle(sampleRate: number, seconds: number, rnd: Rand): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const out = new Float32Array(n);
  // noise bed (band-passed via two one-pole filters)
  let lo = 0;
  let hi = 0;
  let mod = 0.5;
  let modTarget = 0.5;
  for (let i = 0; i < n; i++) {
    if (i % 2048 === 0) modTarget = 0.35 + rnd() * 0.65;
    mod += (modTarget - mod) * 0.0006;
    const w = rnd() * 2 - 1;
    lo += 0.25 * (w - lo);
    hi += 0.05 * (lo - hi);
    out[i] = (lo - hi) * 0.35 * mod;
  }
  // bubble blips: ~70/s, clustered
  const count = Math.floor(seconds * 70);
  for (let b = 0; b < count; b++) {
    const start = Math.floor(rnd() * n);
    const f = 900 + Math.pow(rnd(), 1.6) * 3800;
    const dur = 0.006 + rnd() * 0.02;
    addBubbleBlip(out, sampleRate, start, f, dur, 0.08 + rnd() * 0.18, 0.3 + rnd() * 0.9);
  }
  removeDC(out);
  normalizePeak(out, 0.8);
  return makeLoopable(out, Math.floor(sampleRate * 0.25));
}
