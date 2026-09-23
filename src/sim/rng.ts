/**
 * Deterministic RNG (mulberry32). OWNER: core.
 * The simulation must ONLY use RNG obtained from `simRng(state)` so saves + seeds reproduce exactly.
 * Rendering/AI may use `Math.random` or `visualRng` freely (cosmetic only).
 */
import type { GameState } from '@/types';

export interface Rng {
  /** float in [0,1) */
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxInclusive: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (t: T) => number): T;
  /** Approximately normal (mean 0, sd 1). */
  gauss(): number;
  shuffle<T>(arr: T[]): T[];
  /** Current internal state (persist this). */
  state(): number;
}

export function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length) % Math.max(1, arr.length)],
    weighted: (items, weight) => {
      let total = 0;
      for (const it of items) total += Math.max(0, weight(it));
      let r = next() * total;
      for (const it of items) {
        r -= Math.max(0, weight(it));
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },
    gauss: () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    state: () => s,
  };
  return rng;
}

/**
 * RNG bound to the game state: every draw advances `state.rngState` (works on immer drafts).
 */
export function simRng(state: GameState): Rng {
  const inner = mulberry32(state.rngState);
  const wrap = <A extends unknown[], R>(fn: (...a: A) => R) =>
    (...a: A): R => {
      const r = fn(...a);
      state.rngState = inner.state();
      return r;
    };
  return {
    next: wrap(inner.next),
    range: wrap(inner.range),
    int: wrap(inner.int),
    chance: wrap(inner.chance),
    pick: wrap(inner.pick) as Rng['pick'],
    weighted: wrap(inner.weighted) as Rng['weighted'],
    gauss: wrap(inner.gauss),
    shuffle: wrap(inner.shuffle) as Rng['shuffle'],
    state: inner.state,
  };
}

/** Hash a string to a 32-bit seed (FNV-1a). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Cosmetic RNG seeded from an id — stable visuals per creature/decor. */
export function visualRng(key: string | number): Rng {
  return mulberry32(typeof key === 'number' ? key : hashString(key));
}
