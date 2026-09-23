/**
 * Small math helpers for the critterart lane (no allocations in hot paths).
 * OWNER: lane "critterart".
 */

export const TAU = Math.PI * 2;

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a || 1e-9));
export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
}
/** Frame-rate independent exponential approach. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * Math.min(dt, 0.1)));
}
/** Smooth bump: 1 at 0, 0 beyond |x| >= w. */
export function bump(x: number, w: number): number {
  const t = clamp(1 - Math.abs(x) / w);
  return t * t * (3 - 2 * t);
}
export const gauss = (x: number, s: number) => Math.exp(-(x * x) / (2 * s * s));
/** Positive modulo. */
export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = (seed | 0) ^ 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string to a 32-bit int. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Cheap smooth 1D value noise in [-1, 1] (for idle wander / cosmetic jitter). */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 17.31) * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

/** Catmull-Rom interpolation through 2D/3D control points (arrays of tuples). Writes into out. */
export function catmull(pts: readonly (readonly number[])[], t: number, out: number[]): number[] {
  const n = pts.length - 1;
  const x = clamp(t) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n, i + 2)];
  const f2 = f * f;
  const f3 = f2 * f;
  for (let k = 0; k < p1.length; k++) {
    out[k] =
      0.5 *
      (2 * p1[k] + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3);
  }
  return out;
}

/** Piecewise-linear lookup in a table of [x, y] pairs (x ascending). */
export function table(tab: readonly (readonly [number, number])[], x: number): number {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (x <= tab[i][0]) {
      const [x0, y0] = tab[i - 1];
      const [x1, y1] = tab[i];
      const t = (x - x0) / (x1 - x0 || 1e-9);
      return lerp(y0, y1, t * t * (3 - 2 * t));
    }
  }
  return tab[tab.length - 1][1];
}

/** Smooth (monotone-ish) table: Catmull-Rom through y values at the given x positions. */
export function smoothTable(tab: readonly (readonly [number, number])[], x: number): number {
  if (x <= tab[0][0]) return tab[0][1];
  const n = tab.length;
  if (x >= tab[n - 1][0]) return tab[n - 1][1];
  let i = 0;
  while (i < n - 2 && x > tab[i + 1][0]) i++;
  const x1 = tab[i][0];
  const x2 = tab[i + 1][0];
  const f = (x - x1) / (x2 - x1 || 1e-9);
  const y0 = tab[Math.max(0, i - 1)][1];
  const y1 = tab[i][1];
  const y2 = tab[i + 1][1];
  const y3 = tab[Math.min(n - 1, i + 2)][1];
  const f2 = f * f;
  const f3 = f2 * f;
  return 0.5 * (2 * y1 + (-y0 + y2) * f + (2 * y0 - 5 * y1 + 4 * y2 - y3) * f2 + (-y0 + 3 * y1 - 3 * y2 + y3) * f3);
}
