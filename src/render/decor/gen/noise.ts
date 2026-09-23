/**
 * Seeded randomness + noise for procedural decor generation (cosmetic only). OWNER: lane "aquascape".
 */
import { createNoise3D, createNoise2D } from 'simplex-noise';

export interface PRng {
  (): number;
  range(a: number, b: number): number;
  int(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
  gauss(): number;
  chance(p: number): boolean;
}

export function prng(seed: number): PRng {
  let s = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const f = next as PRng;
  f.range = (a, b) => a + (b - a) * next();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * next());
  f.pick = (arr) => arr[Math.floor(next() * arr.length) % arr.length];
  f.gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  f.chance = (p) => next() < p;
  return f;
}

export type Noise3 = (x: number, y: number, z: number) => number;

export function noise3(seed: number): Noise3 {
  return createNoise3D(prng(seed ^ 0x51ed270b));
}
export function noise2(seed: number): (x: number, y: number) => number {
  return createNoise2D(prng(seed ^ 0x2f1a9c3d));
}

export function fbm3(n: Noise3, x: number, y: number, z: number, oct = 4, lac = 2.03, gain = 0.5): number {
  let a = 0.5;
  let s = 0;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * n(x * f, y * f, z * f);
    f *= lac;
    a *= gain;
  }
  return s;
}

/** Ridged multifractal-ish (sharp crests), roughly 0..1. */
export function ridged3(n: Noise3, x: number, y: number, z: number, oct = 4): number {
  let a = 0.5;
  let s = 0;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    const v = 1 - Math.abs(n(x * f, y * f, z * f));
    s += a * v * v;
    f *= 2.1;
    a *= 0.5;
  }
  return s;
}

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export type RGB = [number, number, number];

export function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16);
  // sRGB → linear so vertex colours match material colour management
  const c = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
export function mul(a: RGB, k: number): RGB {
  return [a[0] * k, a[1] * k, a[2] * k];
}
/** Jitter a linear colour's brightness/hue slightly. */
export function jitter(c: RGB, r: PRng, amt = 0.08): RGB {
  const k = 1 + (r() - 0.5) * 2 * amt;
  const h = (r() - 0.5) * amt;
  return [Math.max(0, c[0] * k * (1 + h)), Math.max(0, c[1] * k), Math.max(0, c[2] * k * (1 - h))];
}
