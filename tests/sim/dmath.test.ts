// @vitest-environment node
/**
 * SHARE-002 (SHARED-SHOPS.md §3.2 rule 1): `src/sim/dmath.ts`, the one arithmetic every engine shares. Its results
 * equal fdlibm's bit for bit: `fixtures/dmath-fdlibm.txt` holds 2,193 inputs (special values, subnormals, huge
 * arguments) with the results of Java's StrictMath, which is fdlibm, computed on 2026-10-20 (a line is the function,
 * the input's bits, a second input's bits for `pow`, `atan2` and `hypot`, then the result's bits). They also stay within
 * 1 ulp of the engine's own Math (2 for `hypot`), give the special values ECMAScript defines for Math, and keep the
 * exact cases exact. The cross-engine replay (e2e) checks that browsers compute the same.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as dmath from '@/sim/dmath';

const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);
const i64 = new BigInt64Array(f64.buffer);
const fromBits = (h: string): number => {
  u32[1] = parseInt(h.slice(0, 8), 16);
  u32[0] = parseInt(h.slice(8), 16);
  return f64[0];
};
const bitsOf = (x: number): string => {
  f64[0] = x;
  return u32[1].toString(16).padStart(8, '0') + u32[0].toString(16).padStart(8, '0');
};
/** Distance in units in the last place (doubles ordered as integers). */
const ulps = (a: number, b: number): number => {
  if (Number.isNaN(a) && Number.isNaN(b)) return 0;
  const ord = (x: number) => {
    f64[0] = x;
    const v = i64[0];
    return v < 0n ? -(v & 0x7fffffffffffffffn) : v;
  };
  return Math.abs(Number(ord(a) - ord(b)));
};
/** Same double (signed zero included), or both NaN. */
const same = (a: number, b: number) => Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b));

type One = (x: number) => number;
type Two = (x: number, y: number) => number;
const ONE: Record<string, [One, One]> = {
  exp: [dmath.exp, Math.exp],
  expm1: [dmath.expm1, Math.expm1],
  log: [dmath.log, Math.log],
  log10: [dmath.log10, Math.log10],
  log2: [dmath.log2, Math.log2],
  log1p: [dmath.log1p, Math.log1p],
  sin: [dmath.sin, Math.sin],
  cos: [dmath.cos, Math.cos],
  tan: [dmath.tan, Math.tan],
  asin: [dmath.asin, Math.asin],
  acos: [dmath.acos, Math.acos],
  atan: [dmath.atan, Math.atan],
  sinh: [dmath.sinh, Math.sinh],
  cosh: [dmath.cosh, Math.cosh],
  tanh: [dmath.tanh, Math.tanh],
  cbrt: [dmath.cbrt, Math.cbrt],
};
const TWO: Record<string, [Two, Two]> = {
  pow: [dmath.pow, Math.pow],
  atan2: [dmath.atan2, Math.atan2],
  hypot: [dmath.hypot, (x, y) => Math.hypot(x, y)],
};

/** A deterministic stream of inputs: plain ranges the game uses, and arbitrary bit patterns. */
function inputs(seed: number) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const any = () => {
    u32[1] = (rnd() * 4294967296) >>> 0;
    u32[0] = (rnd() * 4294967296) >>> 0;
    return f64[0];
  };
  return { rnd, any };
}

describe('SHARE-002: dmath, one arithmetic for every engine', () => {
  it('equals fdlibm (Java StrictMath) bit for bit on 2,193 inputs', () => {
    const lines = readFileSync(join(__dirname, 'fixtures', 'dmath-fdlibm.txt'), 'utf8').trim().split('\n');
    expect(lines.length).toBe(2193);
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const p = line.split(' ');
      const name = p[0];
      seen.add(name);
      const got = p.length === 4 ? TWO[name][0](fromBits(p[1]), fromBits(p[2])) : ONE[name][0](fromBits(p[1]));
      const want = fromBits(p[p.length - 1]);
      if (!same(got, want)) bad.push(`${line} → ${bitsOf(got)}`);
    }
    expect(bad).toEqual([]);
    expect([...seen].sort()).toEqual([...Object.keys(ONE), ...Object.keys(TWO)].filter((k) => k !== 'log2').sort());
  });

  it('stays within 1 ulp of the engine (2 for hypot) over wide ranges', () => {
    const { rnd, any } = inputs(20261020);
    const ranges: Record<string, () => number> = {
      exp: () => -50 + 100 * rnd(),
      expm1: () => -3 + 6 * rnd(),
      log: () => 1e-6 + 10 * rnd(),
      log10: () => 1e-3 + 1e4 * rnd(),
      log2: () => 1e-3 + 1e4 * rnd(),
      log1p: () => -0.999 + 3 * rnd(),
      sin: () => -100 + 200 * rnd(),
      cos: () => -100 + 200 * rnd(),
      tan: () => -100 + 200 * rnd(),
      asin: () => -1 + 2 * rnd(),
      acos: () => -1 + 2 * rnd(),
      atan: () => -10 + 20 * rnd(),
      sinh: () => -5 + 10 * rnd(),
      cosh: () => -5 + 10 * rnd(),
      tanh: () => -5 + 10 * rnd(),
      cbrt: () => -1e3 + 2e3 * rnd(),
    };
    const worst: Record<string, number> = {};
    for (const [name, [mine, eng]] of Object.entries(ONE)) {
      let w = 0;
      for (let i = 0; i < 4000; i++) {
        const x = i % 4 === 3 ? any() : ranges[name]();
        w = Math.max(w, ulps(mine(x), eng(x)));
      }
      worst[name] = w;
    }
    for (const [name, [mine, eng]] of Object.entries(TWO)) {
      let w = 0;
      for (let i = 0; i < 4000; i++) {
        const [x, y] =
          i % 4 === 3 ? [any(), any()] : name === 'pow' ? [10 * rnd(), -3 + 6 * rnd()] : [-50 + 100 * rnd(), -50 + 100 * rnd()];
        w = Math.max(w, ulps(mine(x, y), eng(x, y)));
      }
      worst[name] = w;
    }
    const over = Object.entries(worst).filter(([k, w]) => w > (k === 'hypot' ? 2 : 1));
    expect(over).toEqual([]);
  });

  it('gives the special values ECMAScript defines for Math', () => {
    const S = [NaN, 0, -0, Infinity, -Infinity];
    for (const [name, [mine, eng]] of Object.entries(ONE)) {
      for (const x of S) expect(same(mine(x), eng(x)), `${name}(${Object.is(x, -0) ? '-0' : x})`).toBe(true);
    }
    const P = [NaN, 0, -0, Infinity, -Infinity, 1, -1, 2, -2, 0.5, -0.5, 3, -3, 1e300, -1e-300];
    const special = (v: number) => Number.isNaN(v) || v === 0 || !Number.isFinite(v);
    for (const [name, [mine, eng]] of Object.entries(TWO)) {
      for (const x of P) {
        for (const y of P) {
          if (!special(x) && !special(y) && !(name === 'pow' && Math.abs(x) === 1)) continue;
          expect(same(mine(x, y), eng(x, y)), `${name}(${x}, ${y})`).toBe(true);
        }
      }
    }
  });

  it('keeps the exact cases exact', () => {
    for (let k = -1074; k <= 1023; k++) expect(dmath.log2(dmath.pow(2, k))).toBe(k);
    for (let n = 0; n <= 22; n++) expect(dmath.log10(Number(`1e${n}`))).toBe(n);
    expect(dmath.pow(-8, 1 / 3)).toBeNaN();
    expect(dmath.pow(-2, 3)).toBe(-8);
    expect(dmath.pow(3, 2)).toBe(9);
    expect(dmath.pow(2, 0.5)).toBe(Math.SQRT2);
    expect(dmath.exp(0)).toBe(1);
    expect(dmath.log(1)).toBe(0);
    expect(dmath.cos(0)).toBe(1);
    expect(dmath.hypot(3, 4)).toBe(5);
    expect(dmath.cbrt(27)).toBe(3);
    expect(dmath.atan2(1, 1)).toBe(Math.PI / 4);
  });
});
