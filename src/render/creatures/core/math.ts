/**
 * Small numeric helpers for the procedural creature generator. OWNER: lane "fishart".
 * Pure functions, no three.js dependency (so they are cheap to call from geometry builders).
 */

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
/** Smooth bump that is 1 at `c` and 0 beyond `c ± w`. */
export const bump = (x: number, c: number, w: number) => {
  const d = Math.abs(x - c) / w;
  if (d >= 1) return 0;
  const k = 1 - d * d;
  return k * k;
};

/** A 1-D function of t ∈ [0,1]. */
export type Curve = (t: number) => number;

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through [t, value] key points (t ascending).
 * Never overshoots between keys, so body silhouettes stay clean and free of ripples.
 */
export function curve(points: readonly (readonly [number, number])[]): Curve {
  const n = points.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => points[0][1];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else m[i] = (d[i - 1] + d[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }
  return (t: number) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    // small arrays: linear scan is fastest
    while (i < n - 2 && t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const s = (t - xs[i]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;
    return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  };
}

/** Constant curve helper. */
export const constant = (v: number): Curve => () => v;

/** Multiply a curve by a scalar. */
export const scaleCurve = (c: Curve, k: number): Curve => (t) => c(t) * k;

/** Seeded float hash in [0,1). Deterministic, allocation free. */
export function hash1(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** FNV-1a string hash. */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32) for cosmetic variation. */
export function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Critically damped spring toward a target (frame-rate independent). Returns the new value; velocity in state. */
export function springTo(state: { v: number; x: number }, target: number, omega: number, dt: number): number {
  const x = state.x - target;
  const exp = Math.exp(-omega * dt);
  const temp = (state.v + omega * x) * dt;
  state.v = (state.v - omega * temp) * exp;
  state.x = target + (x + temp) * exp;
  return state.x;
}

/** Exponential smoothing toward target. */
export const approach = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
