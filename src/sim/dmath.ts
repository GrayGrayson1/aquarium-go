/**
 * One arithmetic for every engine (SHARED-SHOPS.md §3.2 rule 1). JavaScript lets each engine round `Math.exp`, `pow`,
 * `sin` and the other transcendental functions its own way, and Node, Chromium and WebKit do differ in the last bit
 * (measured 2026-10-20), so two copies of one shop stepped identically would drift apart. These functions use only
 * `+ - * /`, `Math.sqrt`, the exact `Math.floor`/`abs` and the bits of a double, which every engine computes alike, so
 * they return the same double everywhere. `src/sim` uses only these (the guard test `core-dmath` bans the `Math`
 * versions and `**` there); the render layer and the interface keep the engine's own.
 *
 * Ported from fdlibm 5.3 (the algorithms and coefficients of Java's StrictMath), each within 1 ulp of the true value:
 *
 * Copyright (C) 1993-2004 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this software is freely granted, provided that this notice is
 * preserved.
 *
 * `log2` (not in fdlibm) is the exponent plus `log` of the mantissa; `hypot` takes two arguments.
 */

// ---------------------------------------------------------------------------------------------------------------
// The two 32-bit words of a double (fdlibm's __HI and __LO), on a little- or big-endian machine alike.

const F = new Float64Array(1);
const W = new Int32Array(F.buffer);
const HI = ((): number => {
  F[0] = 1;
  return W[1] === 0x3ff00000 ? 1 : 0;
})();
const LO = 1 - HI;

/** The high word (sign, exponent, top 20 bits of the mantissa), as a signed 32-bit integer. */
function hiWord(x: number): number {
  F[0] = x;
  return W[HI];
}
/** The low word (the bottom 32 bits of the mantissa), as a signed 32-bit integer. */
function loWord(x: number): number {
  F[0] = x;
  return W[LO];
}
/** `x` with its high word replaced. */
function setHi(x: number, high: number): number {
  F[0] = x;
  W[HI] = high;
  return F[0];
}
/** `x` with its low word replaced. */
function setLo(x: number, low: number): number {
  F[0] = x;
  W[LO] = low;
  return F[0];
}
function fromWords(high: number, low: number): number {
  W[HI] = high;
  W[LO] = low;
  return F[0];
}

const TWO24 = 16777216.0; // 0x1.0p24
const TWO54 = 1.8014398509481984e+16; // 0x1.0p54
const HUGE = 1.0e300;
const TINY = 1.0e-300;
const PI = 3.141592653589793; // 0x1.921fb54442d18p1

/** `x × 2^n`, exactly (rounded once if the result is subnormal), for any integer `n` (C's scalbn). */
function scalbn(x: number, n: number): number {
  if (n > 1023) {
    x *= 8.98846567431158e+307;
    n -= 1023;
    if (n > 1023) {
      x *= 8.98846567431158e+307;
      n -= 1023;
      if (n > 1023) n = 1023;
    }
  } else if (n < -1022) {
    // two steps of 2^-969 (= 2^-1022 × 2^53) keep the intermediate normal, so only the last step rounds
    x *= 2.004168360008973e-292;
    n += 969;
    if (n < -1022) {
      x *= 2.004168360008973e-292;
      n += 969;
      if (n < -1022) n = -1022;
    }
  }
  return x * fromWords((0x3ff + n) << 20, 0);
}

// ---------------------------------------------------------------------------------------------------------------
// exp

const EXP_HALF = [0.5, -0.5];
const EXP_O_THRESHOLD = 709.782712893384; // 0x1.62e42fefa39efp9
const EXP_U_THRESHOLD = -745.1332191019411; // -0x1.74910d52d3051p9
const EXP_LN2_HI = [0.6931471803691238, -0.6931471803691238];
const EXP_LN2_LO = [1.9082149292705877e-10, -1.9082149292705877e-10];
const INV_LN2 = 1.4426950408889634; // 0x1.71547652b82fep0
const EXP_P1 = 0.16666666666666602; // 0x1.555555555553ep-3
const EXP_P2 = -0.0027777777777015593; // -0x1.6c16c16bebd93p-9
const EXP_P3 = 6.613756321437934e-05; // 0x1.1566aaf25de2cp-14
const EXP_P4 = -1.6533902205465252e-06; // -0x1.bbd41c5d26bf1p-20
const EXP_P5 = 4.1381367970572385e-08; // 0x1.6376972bea4d0p-25
const TWOM1000 = 9.332636185032189e-302; // 0x1.0p-1000

export function exp(x: number): number {
  let hi = 0;
  let lo = 0;
  let k = 0;
  let hx = hiWord(x);
  const xsb = (hx >> 31) & 1;
  hx &= 0x7fffffff;
  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) {
      if (((hx & 0xfffff) | loWord(x)) !== 0) return x + x; // NaN
      return xsb === 0 ? x : 0; // exp(+-inf) = {inf, 0}
    }
    if (x > EXP_O_THRESHOLD) return Infinity;
    if (x < EXP_U_THRESHOLD) return 0;
  }
  if (hx > 0x3fd62e42) {
    // |x| > 0.5 ln2: reduce x = k ln2 + r
    if (hx < 0x3ff0a2b2) {
      hi = x - EXP_LN2_HI[xsb];
      lo = EXP_LN2_LO[xsb];
      k = 1 - xsb - xsb;
    } else {
      k = (INV_LN2 * x + EXP_HALF[xsb]) | 0;
      hi = x - k * EXP_LN2_HI[0];
      lo = k * EXP_LN2_LO[0];
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) {
    return 1 + x; // |x| < 2^-28
  }
  const t = x * x;
  const c = x - t * (EXP_P1 + t * (EXP_P2 + t * (EXP_P3 + t * (EXP_P4 + t * EXP_P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - (lo - (x * c) / (2 - c) - hi);
  if (k >= -1021) return setHi(y, hiWord(y) + (k << 20));
  return setHi(y, hiWord(y) + ((k + 1000) << 20)) * TWOM1000;
}

// ---------------------------------------------------------------------------------------------------------------
// log, log10, log2, log1p

const LN2_HI = 0.6931471803691238; // 0x1.62e42feep-1
const LN2_LO = 1.9082149292705877e-10; // 0x1.a39ef35793c76p-33
const LG1 = 0.6666666666666735; // 0x1.5555555555593p-1
const LG2 = 0.3999999999940942; // 0x1.999999997fa04p-2
const LG3 = 0.2857142874366239; // 0x1.2492494229359p-2
const LG4 = 0.22222198432149784; // 0x1.c71c51d8e78afp-3
const LG5 = 0.1818357216161805; // 0x1.7466496cb03dep-3
const LG6 = 0.15313837699209373; // 0x1.39a09d078c69fp-3
const LG7 = 0.14798198605116586; // 0x1.2f112df3e5244p-3

export function log(x: number): number {
  let hx = hiWord(x);
  const lx = loWord(x);
  let k = 0;
  if (hx < 0x00100000) {
    // x < 2^-1022
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity; // log(+-0)
    if (hx < 0) return NaN; // log(-#)
    k -= 54;
    x *= TWO54; // subnormal: scale up
    hx = hiWord(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  let i = (hx + 0x95f64) & 0x100000;
  x = setHi(x, hx | (i ^ 0x3ff00000)); // normalize x or x/2
  k += i >> 20;
  const f = x - 1;
  if ((0x000fffff & (2 + hx)) < 3) {
    // -2^-20 <= f < 2^-20
    if (f === 0) return k === 0 ? 0 : k * LN2_HI + k * LN2_LO;
    const R = f * f * (0.5 - 0.33333333333333333 * f);
    return k === 0 ? f - R : k * LN2_HI - (R - k * LN2_LO - f);
  }
  const s = f / (2 + f);
  const z = s * s;
  i = hx - 0x6147a;
  const w = z * z;
  const j = 0x6b851 - hx;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  i |= j;
  const R = t2 + t1;
  if (i > 0) {
    const hfsq = 0.5 * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + R));
    return k * LN2_HI - (hfsq - (s * (hfsq + R) + k * LN2_LO) - f);
  }
  if (k === 0) return f - s * (f - R);
  return k * LN2_HI - (s * (f - R) - k * LN2_LO - f);
}

const IVLN10 = 0.4342944819032518; // 0x1.bcb7b1526e50ep-2
const LOG10_2HI = 0.30102999566361177; // 0x1.34413509f6p-2
const LOG10_2LO = 3.694239077158931e-13; // 0x1.9fef311f12b36p-42

export function log10(x: number): number {
  let hx = hiWord(x);
  const lx = loWord(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54;
    x *= TWO54;
    hx = hiWord(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  const i = (k & 0x80000000) >>> 31;
  hx = (hx & 0x000fffff) | ((0x3ff - i) << 20);
  const y = k + i;
  x = setHi(x, hx);
  const z = y * LOG10_2LO + IVLN10 * log(x);
  return z + y * LOG10_2HI;
}

/** `1 / ln 2` split so that `k + log(m) / ln 2` keeps the powers of two exact. */
const IVLN2_HI = 1.4426950216293335; // 0x1.715476p0
const IVLN2_LO = 1.9259629911266175e-08; // 0x1.4ae0bf85ddf44p-26

export function log2(x: number): number {
  let hx = hiWord(x);
  const lx = loWord(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54;
    x *= TWO54;
    hx = hiWord(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  const i = (hx + 0x95f64) & 0x100000;
  x = setHi(x, hx | (i ^ 0x3ff00000)); // the mantissa in [sqrt(2)/2, sqrt(2))
  k += i >> 20;
  if (x === 1) return k;
  const l = log(x);
  return k + (l * IVLN2_LO + l * IVLN2_HI);
}

const LP1 = LG1;
const LP2 = LG2;
const LP3 = LG3;
const LP4 = LG4;
const LP5 = LG5;
const LP6 = LG6;
const LP7 = LG7;

export function log1p(x: number): number {
  let f = 0;
  let c = 0;
  let hu = 0;
  const hx = hiWord(x);
  const ax = hx & 0x7fffffff;
  let k = 1;
  if (hx < 0x3fda827a) {
    // x < 0.41422
    if (ax >= 0x3ff00000) return x === -1 ? -Infinity : NaN; // x <= -1
    if (ax < 0x3e200000) {
      // |x| < 2^-29
      if (ax < 0x3c900000) return x; // |x| < 2^-54
      return x - x * x * 0.5;
    }
    if (hx > 0 || hx <= (0xbfd2bec3 | 0)) {
      // -0.2929 < x < 0.41422
      k = 0;
      f = x;
      hu = 1;
    }
  }
  if (hx >= 0x7ff00000) return x + x;
  let u: number;
  if (k !== 0) {
    if (hx < 0x43400000) {
      u = 1 + x;
      hu = hiWord(u);
      k = (hu >> 20) - 1023;
      c = k > 0 ? 1 - (u - x) : x - (u - 1); // the correction term
      c /= u;
    } else {
      u = x;
      hu = hiWord(u);
      k = (hu >> 20) - 1023;
      c = 0;
    }
    hu &= 0x000fffff;
    if (hu < 0x6a09e) {
      u = setHi(u, hu | 0x3ff00000); // normalize u
    } else {
      k += 1;
      u = setHi(u, hu | 0x3fe00000); // normalize u/2
      hu = (0x00100000 - hu) >> 2;
    }
    f = u - 1;
  }
  const hfsq = 0.5 * f * f;
  if (hu === 0) {
    // |f| < 2^-20
    if (f === 0) {
      if (k === 0) return 0;
      c += k * LN2_LO;
      return k * LN2_HI + c;
    }
    const R = hfsq * (1 - 0.66666666666666666 * f);
    if (k === 0) return f - R;
    return k * LN2_HI - (R - (k * LN2_LO + c) - f);
  }
  const s = f / (2 + f);
  const z = s * s;
  const R = z * (LP1 + z * (LP2 + z * (LP3 + z * (LP4 + z * (LP5 + z * (LP6 + z * LP7))))));
  if (k === 0) return f - (hfsq - s * (hfsq + R));
  return k * LN2_HI - (hfsq - (s * (hfsq + R) + (k * LN2_LO + c)) - f);
}

// ---------------------------------------------------------------------------------------------------------------
// expm1

const EM_Q1 = -0.03333333333333313; // -0x1.11111111110f4p-5
const EM_Q2 = 0.0015873015872548146; // 0x1.a01a019fe5585p-10
const EM_Q3 = -7.93650757867488e-05; // -0x1.4ce199eaadbb7p-14
const EM_Q4 = 4.008217827329362e-06; // 0x1.0cfca86e65239p-18
const EM_Q5 = -2.0109921818362437e-07; // -0x1.afdb76e09c32dp-23

export function expm1(x: number): number {
  let hi: number;
  let lo: number;
  let c = 0;
  let k: number;
  let t: number;
  let y: number;
  let hx = hiWord(x);
  const xsb = hx & 0x80000000;
  hx &= 0x7fffffff;
  if (hx >= 0x4043687a) {
    // |x| >= 56 ln2
    if (hx >= 0x40862e42) {
      // |x| >= 709.78
      if (hx >= 0x7ff00000) {
        if (((hx & 0xfffff) | loWord(x)) !== 0) return x + x; // NaN
        return xsb === 0 ? x : -1; // expm1(+-inf) = {inf, -1}
      }
      if (x > EXP_O_THRESHOLD) return Infinity;
    }
    if (xsb !== 0 && x + TINY < 0) return TINY - 1; // x < -56 ln2
  }
  if (hx > 0x3fd62e42) {
    // |x| > 0.5 ln2
    if (hx < 0x3ff0a2b2) {
      if (xsb === 0) {
        hi = x - LN2_HI;
        lo = LN2_LO;
        k = 1;
      } else {
        hi = x + LN2_HI;
        lo = -LN2_LO;
        k = -1;
      }
    } else {
      k = (INV_LN2 * x + (xsb === 0 ? 0.5 : -0.5)) | 0;
      t = k;
      hi = x - t * LN2_HI;
      lo = t * LN2_LO;
    }
    x = hi - lo;
    c = hi - x - lo;
  } else if (hx < 0x3c900000) {
    return x; // |x| < 2^-54
  } else {
    k = 0;
  }
  const hfx = 0.5 * x;
  const hxs = x * hfx;
  const r1 = 1 + hxs * (EM_Q1 + hxs * (EM_Q2 + hxs * (EM_Q3 + hxs * (EM_Q4 + hxs * EM_Q5))));
  t = 3 - r1 * hfx;
  let e = hxs * ((r1 - t) / (6 - x * t));
  if (k === 0) return x - (x * e - hxs);
  e = x * (e - c) - c;
  e -= hxs;
  if (k === -1) return 0.5 * (x - e) - 0.5;
  if (k === 1) {
    if (x < -0.25) return -2 * (e - (x + 0.5));
    return 1 + 2 * (x - e);
  }
  if (k <= -2 || k > 56) {
    y = 1 - (e - x);
    y = setHi(y, hiWord(y) + (k << 20));
    return y - 1;
  }
  if (k < 20) {
    t = fromWords(0x3ff00000 - (0x200000 >> k), 0); // 1 - 2^-k
    y = t - (e - x);
    y = setHi(y, hiWord(y) + (k << 20));
  } else {
    t = fromWords((0x3ff - k) << 20, 0); // 2^-k
    y = x - (e + t);
    y += 1;
    y = setHi(y, hiWord(y) + (k << 20));
  }
  return y;
}

// ---------------------------------------------------------------------------------------------------------------
// pow

const BP = [1.0, 1.5];
const DP_H = [0.0, 0.5849624872207642];
const DP_L = [0.0, 1.350039202129749e-08];
const POW_L1 = 0.5999999999999946; // 0x1.3333333333303p-1
const POW_L2 = 0.4285714285785502; // 0x1.b6db6db6fabffp-2
const POW_L3 = 0.33333332981837743; // 0x1.55555518f264dp-2
const POW_L4 = 0.272728123808534; // 0x1.17460a91d4101p-2
const POW_L5 = 0.23066074577556175; // 0x1.d864a93c9db65p-3
const POW_L6 = 0.20697501780033842; // 0x1.a7e284a454eefp-3
const POW_CP = 0.9617966939259756; // 0x1.ec709dc3a03fdp-1
const POW_CP_H = 0.9617967009544373; // 0x1.ec709ep-1
const POW_CP_L = -7.028461650952758e-09; // -0x1.e2fe0145b01f5p-28
const POW_INV_LN2_H = 1.4426950216293335; // 0x1.715476p0
const POW_INV_LN2_L = 1.9259629911266175e-08; // 0x1.4ae0bf85ddf44p-26
const POW_OVT = 8.0085662595372944372e-17;
const POW_LG2 = 0.6931471805599453; // 0x1.62e42fefa39efp-1
const POW_LG2_H = 0.6931471824645996; // 0x1.62e43p-1
const POW_LG2_L = -1.904654299957768e-09; // -0x1.05c610ca86c39p-29

export function pow(x: number, y: number): number {
  let z: number;
  let r: number;
  let t: number;
  let u: number;
  let v: number;
  let w: number;
  let i: number;
  let j: number;
  let k: number;
  let n: number;
  if (y === 0) return 1;
  if (x !== x || y !== y) return NaN;
  const yAbs = Math.abs(y);
  let xAbs = Math.abs(x);
  if (y === 2) return x * x;
  if (y === 0.5) {
    if (x >= -Number.MAX_VALUE) return Math.sqrt(x + 0); // +0 turns -0 into +0
  } else if (yAbs === 1) {
    return y === 1 ? x : 1 / x;
  } else if (yAbs === Infinity) {
    if (xAbs === 1) return NaN;
    if (xAbs > 1) return y >= 0 ? y : 0;
    return y < 0 ? -y : 0;
  }
  const hx = hiWord(x);
  let ix = hx & 0x7fffffff;
  // y_is_int: 0 not an integer, 1 odd, 2 even (only needed when x < 0)
  let yIsInt = 0;
  if (hx < 0) {
    if (yAbs >= 9007199254740992.0) yIsInt = 2;
    else if (yAbs >= 1 && Math.floor(yAbs) === yAbs) yIsInt = 2 - (yAbs % 2);
  }
  if (xAbs === 0 || xAbs === Infinity || xAbs === 1) {
    z = xAbs;
    if (y < 0) z = 1 / z;
    if (hx < 0) {
      if (((ix - 0x3ff00000) | yIsInt) === 0) z = NaN; // (-1)^non-int
      else if (yIsInt === 1) z = -z; // (x<0)^odd
    }
    return z;
  }
  n = (hx >> 31) + 1;
  if ((n | yIsInt) === 0) return NaN; // (x<0)^(non-int)
  let s = 1;
  if ((n | (yIsInt - 1)) === 0) s = -1; // (-ve)^(odd int)
  let pH: number;
  let pL: number;
  let t1: number;
  let t2: number;
  if (yAbs > 2147485695.9999995) {
    // |y| > ~2^31
    if (xAbs < 0.9999995231628418) return y < 0 ? s * Infinity : s * 0;
    if (xAbs > 1.0000009536743162) return y > 0 ? s * Infinity : s * 0;
    // |1 - x| is tiny: log(x) by its series
    t = xAbs - 1;
    w = t * t * (0.5 - t * (0.3333333333333333333333 - t * 0.25));
    u = POW_INV_LN2_H * t;
    v = t * POW_INV_LN2_L - w * INV_LN2;
    t1 = u + v;
    t1 = setLo(t1, 0);
    t2 = v - (t1 - u);
  } else {
    n = 0;
    if (ix < 0x00100000) {
      // subnormal x
      xAbs *= 9007199254740992.0;
      n -= 53;
      ix = hiWord(xAbs);
    }
    n += (ix >> 20) - 0x3ff;
    j = ix & 0x000fffff;
    ix = j | 0x3ff00000; // normalize ix
    if (j <= 0x3988e) k = 0; // |x| < sqrt(3/2)
    else if (j < 0xbb67a) k = 1; // |x| < sqrt(3)
    else {
      k = 0;
      n += 1;
      ix -= 0x00100000;
    }
    xAbs = setHi(xAbs, ix);
    // ss = s_h + s_l = (x - 1) / (x + 1) or (x - 1.5) / (x + 1.5)
    u = xAbs - BP[k];
    v = 1 / (xAbs + BP[k]);
    const ss = u * v;
    let sH = ss;
    sH = setLo(sH, 0);
    let tH = fromWords(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18), 0); // t_h = x + bp[k], high part
    let tL = xAbs - (tH - BP[k]);
    const sL = v * (u - sH * tH - sH * tL);
    // log(x) / ln 2
    let s2 = ss * ss;
    r = s2 * s2 * (POW_L1 + s2 * (POW_L2 + s2 * (POW_L3 + s2 * (POW_L4 + s2 * (POW_L5 + s2 * POW_L6)))));
    r += sL * (sH + ss);
    s2 = sH * sH;
    tH = 3 + s2 + r;
    tH = setLo(tH, 0);
    tL = r - (tH - 3 - s2);
    u = sH * tH;
    v = sL * tH + tL * ss;
    pH = u + v;
    pH = setLo(pH, 0);
    pL = v - (pH - u);
    const zH = POW_CP_H * pH;
    const zL = POW_CP_L * pH + pL * POW_CP + DP_L[k];
    t = n;
    t1 = zH + zL + DP_H[k] + t;
    t1 = setLo(t1, 0);
    t2 = zL - (t1 - t - DP_H[k] - zH);
  }
  // split y into y1 + y2 and compute (y1 + y2) * (t1 + t2)
  const y1 = setLo(y, 0);
  pL = (y - y1) * t1 + y * t2;
  pH = y1 * t1;
  z = pL + pH;
  j = hiWord(z);
  i = loWord(z);
  if (j >= 0x40900000) {
    // z >= 1024
    if (((j - 0x40900000) | i) !== 0) return s * Infinity; // overflow
    if (pL + POW_OVT > z - pH) return s * Infinity;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    // z <= -1075
    if (((j - (0xc090cc00 | 0)) | i) !== 0) return s * 0; // underflow
    if (pL <= z - pH) return s * 0;
  }
  // 2^(p_h + p_l)
  i = j & 0x7fffffff;
  k = (i >> 20) - 0x3ff;
  n = 0;
  if (i > 0x3fe00000) {
    // |z| > 0.5: n = [z + 0.5]
    n = j + (0x00100000 >> (k + 1));
    k = ((n & 0x7fffffff) >> 20) - 0x3ff; // new k for n
    t = fromWords(n & ~(0x000fffff >> k), 0);
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    pH -= t;
  }
  t = pL + pH;
  t = setLo(t, 0);
  u = t * POW_LG2_H;
  v = (pL - (t - pH)) * POW_LG2 + t * POW_LG2_L;
  z = u + v;
  w = v - (z - u);
  t = z * z;
  t1 = z - t * (EXP_P1 + t * (EXP_P2 + t * (EXP_P3 + t * (EXP_P4 + t * EXP_P5))));
  r = (z * t1) / (t1 - 2) - (w + z * w);
  z = 1 - (r - z);
  j = hiWord(z);
  j += n << 20;
  if (j >> 20 <= 0) z = scalbn(z, n); // subnormal output
  else z = setHi(z, hiWord(z) + (n << 20));
  return s * z;
}

// ---------------------------------------------------------------------------------------------------------------
// sin, cos, tan: argument reduction

const TWO_OVER_PI = [
  0xa2f983, 0x6e4e44, 0x1529fc, 0x2757d1, 0xf534dd, 0xc0db62, 0x95993c, 0x439041, 0xfe5163, 0xabdebb, 0xc561b7,
  0x246e3a, 0x424dd2, 0xe00649, 0x2eea09, 0xd1921c, 0xfe1deb, 0x1cb129, 0xa73ee8, 0x8235f5, 0x2ebb44, 0x84e99c,
  0x7026b4, 0x5f7e41, 0x3991d6, 0x398353, 0x39f49c, 0x845f8b, 0xbdf928, 0x3b1ff8, 0x97ffde, 0x05980f, 0xef2f11,
  0x8b5a0a, 0x6d1f6d, 0x367ecf, 0x27cb09, 0xb74f46, 0x3f669e, 0x5fea2d, 0x7527ba, 0xc7ebe5, 0xf17b3d, 0x0739f7,
  0x8a5292, 0xea6bfb, 0x5fb11f, 0x8d5d08, 0x560330, 0x46fc7b, 0x6babf0, 0xcfbc20, 0x9af436, 0x1da9e3, 0x91615e,
  0xe61b08, 0x659985, 0x5f14a0, 0x68408d, 0xffd880, 0x4d7327, 0x310606, 0x1556ca, 0x73a8c9, 0x60e27b, 0xc08c6b,
];
const NPIO2_HW = [
  0x3ff921fb, 0x400921fb, 0x4012d97c, 0x401921fb, 0x401f6a7a, 0x4022d97c, 0x4025fdbb, 0x402921fb, 0x402c463a,
  0x402f6a7a, 0x4031475c, 0x4032d97c, 0x40346b9c, 0x4035fdbb, 0x40378fdb, 0x403921fb, 0x403ab41b, 0x403c463a,
  0x403dd85a, 0x403f6a7a, 0x40407e4c, 0x4041475c, 0x4042106c, 0x4042d97c, 0x4043a28c, 0x40446b9c, 0x404534ac,
  0x4045fdbb, 0x4046c6cb, 0x40478fdb, 0x404858eb, 0x404921fb,
];
const INV_PIO2 = 0.6366197723675814; // 0x1.45f306dc9c883p-1
const PIO2_1 = 1.5707963267341256; // 0x1.921fb544p0
const PIO2_1T = 6.077100506506192e-11; // 0x1.0b4611a626331p-34
const PIO2_2 = 6.077100506303966e-11; // 0x1.0b4611a6p-34
const PIO2_2T = 2.0222662487959506e-21; // 0x1.3198a2e037073p-69
const PIO2_3 = 2.0222662487111665e-21; // 0x1.3198a2ep-69
const PIO2_3T = 8.4784276603689e-32; // 0x1.b839a252049c1p-104

/** The reduced argument `x - n π/2` as two doubles, `RY[0] + RY[1]`; `remPio2` returns `n`. */
const RY = [0, 0];
const TX = [0, 0, 0];

function remPio2(x: number): number {
  let z = 0;
  let w: number;
  let t: number;
  let r: number;
  let fn: number;
  let i: number;
  let j: number;
  let n: number;
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) {
    // |x| <= pi/4: no reduction
    RY[0] = x;
    RY[1] = 0;
    return 0;
  }
  if (ix < 0x4002d97c) {
    // |x| < 3pi/4: one subtraction
    if (hx > 0) {
      z = x - PIO2_1;
      if (ix !== 0x3ff921fb) {
        RY[0] = z - PIO2_1T;
        RY[1] = z - RY[0] - PIO2_1T;
      } else {
        // near pi/2: 33 + 53 bits of pi
        z -= PIO2_2;
        RY[0] = z - PIO2_2T;
        RY[1] = z - RY[0] - PIO2_2T;
      }
      return 1;
    }
    z = x + PIO2_1;
    if (ix !== 0x3ff921fb) {
      RY[0] = z + PIO2_1T;
      RY[1] = z - RY[0] + PIO2_1T;
    } else {
      z += PIO2_2;
      RY[0] = z + PIO2_2T;
      RY[1] = z - RY[0] + PIO2_2T;
    }
    return -1;
  }
  if (ix <= 0x413921fb) {
    // |x| <= 2^19 (pi/2): medium size
    t = Math.abs(x);
    n = (t * INV_PIO2 + 0.5) | 0;
    fn = n;
    r = t - fn * PIO2_1;
    w = fn * PIO2_1T; // first round, good to 85 bits
    if (n < 32 && ix !== NPIO2_HW[n - 1]) {
      RY[0] = r - w; // quick check for no cancellation
    } else {
      j = ix >> 20;
      RY[0] = r - w;
      i = j - ((hiWord(RY[0]) >> 20) & 0x7ff);
      if (i > 16) {
        // second iteration, good to 118 bits
        t = r;
        w = fn * PIO2_2;
        r = t - w;
        w = fn * PIO2_2T - (t - r - w);
        RY[0] = r - w;
        i = j - ((hiWord(RY[0]) >> 20) & 0x7ff);
        if (i > 49) {
          // third iteration, 151 bits
          t = r;
          w = fn * PIO2_3;
          r = t - w;
          w = fn * PIO2_3T - (t - r - w);
          RY[0] = r - w;
        }
      }
    }
    RY[1] = r - RY[0] - w;
    if (hx < 0) {
      RY[0] = -RY[0];
      RY[1] = -RY[1];
      return -n;
    }
    return n;
  }
  if (ix >= 0x7ff00000) {
    // inf or NaN
    RY[0] = RY[1] = x - x;
    return 0;
  }
  // large x: break it into three 24-bit pieces
  z = setLo(z, loWord(x));
  const e0 = (ix >> 20) - 1046; // e0 = ilogb(z) - 23
  z = setHi(z, ix - (e0 << 20));
  for (i = 0; i < 2; i++) {
    TX[i] = z | 0;
    z = (z - TX[i]) * TWO24;
  }
  TX[2] = z;
  let nx = 3;
  while (TX[nx - 1] === 0) nx--; // skip zero terms
  n = kernelRemPio2(TX, e0, nx);
  if (hx < 0) {
    RY[0] = -RY[0];
    RY[1] = -RY[1];
    return -n;
  }
  return n;
}

const PIO2_PARTS = [
  1.570796251296997, 7.549789415861596e-08, 5.390302529957765e-15, 3.282003415807913e-22, 1.270655753080676e-29,
  1.2293330898111133e-36, 2.7337005381646456e-44, 2.1674168387780482e-51,
];
const TWON24 = 5.960464477539063e-08; // 0x1.0p-24
const KR_IQ = new Array<number>(20).fill(0);
const KR_F = new Array<number>(20).fill(0);
const KR_FQ = new Array<number>(20).fill(0);
const KR_Q = new Array<number>(20).fill(0);

/** fdlibm's __kernel_rem_pio2 at double precision (prec 2, jk 4), writing `RY`; returns `n & 7`. */
function kernelRemPio2(x: number[], e0: number, nx: number): number {
  const iq = KR_IQ;
  const f = KR_F;
  const fq = KR_FQ;
  const q = KR_Q;
  let z: number;
  let fw: number;
  let i: number;
  let j: number;
  let k: number;
  let n: number;
  let ih: number;
  let carry: number;
  const jk = 4;
  const jp = jk;
  const jx = nx - 1;
  let jv = ((e0 - 3) / 24) | 0;
  if (jv < 0) jv = 0;
  let q0 = e0 - 24 * (jv + 1);
  // set up f[0] to f[jx + jk] where f[jx + jk] = ipio2[jv + jk]
  j = jv - jx;
  const m = jx + jk;
  for (i = 0; i <= m; i++, j++) f[i] = j < 0 ? 0 : TWO_OVER_PI[j];
  // compute q[0], q[1], ..., q[jk]
  for (i = 0; i <= jk; i++) {
    for (j = 0, fw = 0; j <= jx; j++) fw += x[j] * f[jx + i - j];
    q[i] = fw;
  }
  let jz = jk;
  for (;;) {
    // distill q[] into iq[] reversingly
    for (i = 0, j = jz, z = q[jz]; j > 0; i++, j--) {
      fw = (TWON24 * z) | 0;
      iq[i] = (z - TWO24 * fw) | 0;
      z = q[j - 1] + fw;
    }
    // compute n
    z = scalbn(z, q0); // actual value of z
    z -= 8 * Math.floor(z * 0.125); // trim off integer >= 8
    n = z | 0;
    z -= n;
    ih = 0;
    if (q0 > 0) {
      // need iq[jz - 1] to determine n
      i = iq[jz - 1] >> (24 - q0);
      n += i;
      iq[jz - 1] -= i << (24 - q0);
      ih = iq[jz - 1] >> (23 - q0);
    } else if (q0 === 0) {
      ih = iq[jz - 1] >> 23;
    } else if (z >= 0.5) {
      ih = 2;
    }
    if (ih > 0) {
      // q > 0.5
      n += 1;
      carry = 0;
      for (i = 0; i < jz; i++) {
        // compute 1 - q
        j = iq[i];
        if (carry === 0) {
          if (j !== 0) {
            carry = 1;
            iq[i] = 0x1000000 - j;
          }
        } else {
          iq[i] = 0xffffff - j;
        }
      }
      if (q0 > 0) {
        // rare case: chance is 1 in 12
        if (q0 === 1) iq[jz - 1] &= 0x7fffff;
        else if (q0 === 2) iq[jz - 1] &= 0x3fffff;
      }
      if (ih === 2) {
        z = 1 - z;
        if (carry !== 0) z -= scalbn(1, q0);
      }
    }
    // check if recomputation is needed
    if (z === 0) {
      j = 0;
      for (i = jz - 1; i >= jk; i--) j |= iq[i];
      if (j === 0) {
        // need recomputation
        for (k = 1; iq[jk - k] === 0; k++); // k = no. of terms needed
        for (i = jz + 1; i <= jz + k; i++) {
          // add q[jz + 1] to q[jz + k]
          f[jx + i] = TWO_OVER_PI[jv + i];
          for (j = 0, fw = 0; j <= jx; j++) fw += x[j] * f[jx + i - j];
          q[i] = fw;
        }
        jz += k;
        continue;
      }
    }
    break;
  }
  // chop off zero terms
  if (z === 0) {
    jz -= 1;
    q0 -= 24;
    while (iq[jz] === 0) {
      jz--;
      q0 -= 24;
    }
  } else {
    // break z into 24-bit pieces if necessary
    z = scalbn(z, -q0);
    if (z >= TWO24) {
      fw = (TWON24 * z) | 0;
      iq[jz] = (z - TWO24 * fw) | 0;
      jz += 1;
      q0 += 24;
      iq[jz] = fw;
    } else {
      iq[jz] = z | 0;
    }
  }
  // convert integer "bit" chunk to floating-point value
  fw = scalbn(1, q0);
  for (i = jz; i >= 0; i--) {
    q[i] = fw * iq[i];
    fw *= TWON24;
  }
  // compute PIo2[0, ..., jp] * q[jz, ..., 0]
  for (i = jz; i >= 0; i--) {
    for (fw = 0, k = 0; k <= jp && k <= jz - i; k++) fw += PIO2_PARTS[k] * q[i + k];
    fq[jz - i] = fw;
  }
  // compress fq[] into y[]
  fw = 0;
  for (i = jz; i >= 0; i--) fw += fq[i];
  RY[0] = ih === 0 ? fw : -fw;
  fw = fq[0] - fw;
  for (i = 1; i <= jz; i++) fw += fq[i];
  RY[1] = ih === 0 ? fw : -fw;
  return n & 7;
}

// ---------------------------------------------------------------------------------------------------------------
// sin, cos, tan: kernels on [-pi/4, pi/4]

const S1 = -0.16666666666666632; // -0x1.5555555555549p-3
const S2 = 0.00833333333332249; // 0x1.111111110f8a6p-7
const S3 = -0.0001984126982985795; // -0x1.a01a019c161d5p-13
const S4 = 2.7557313707070068e-06; // 0x1.71de357b1fe7dp-19
const S5 = -2.5050760253406863e-08; // -0x1.ae5e68a2b9cebp-26
const S6 = 1.58969099521155e-10; // 0x1.5d93a5acfd57cp-33

function kernelSin(x: number, y: number, iy: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix < 0x3e400000) return x; // |x| < 2^-27
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - (z * (0.5 * y - v * r) - y - v * S1);
}

const C1 = 0.0416666666666666; // 0x1.555555555554cp-5
const C2 = -0.001388888888887411; // -0x1.6c16c16c15177p-10
const C3 = 2.480158728947673e-05; // 0x1.a01a019cb159p-16
const C4 = -2.7557314351390663e-07; // -0x1.27e4f809c52adp-22
const C5 = 2.087572321298175e-09; // 0x1.1ee9ebdb4b1c4p-29
const C6 = -1.1359647557788195e-11; // -0x1.8fae9be8838d4p-37

function kernelCos(x: number, y: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix < 0x3e400000) return 1; // |x| < 2^-27
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y)); // |x| < 0.3
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0); // x/4
  const hz = 0.5 * z - qx;
  const a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const PIO4 = 0.7853981633974483; // 0x1.921fb54442d18p-1
const PIO4LO = 3.061616997868383e-17; // 0x1.1a62633145c07p-55
const T = [
  0.3333333333333341, 0.13333333333320124, 0.05396825397622605, 0.021869488294859542, 0.0088632398235993,
  0.0035920791075913124, 0.0014562094543252903, 0.0005880412408202641, 0.0002464631348184699, 7.817944429395571e-05,
  7.140724913826082e-05, -1.8558637485527546e-05, 2.590730518636337e-05,
];

/** tan(x + y) on [-pi/4, pi/4] when `iy` is 1, or -1/tan when `iy` is -1. */
function kernelTan(x: number, y: number, iy: number): number {
  let z: number;
  let r: number;
  let v: number;
  let w: number;
  let s: number;
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  if (ix < 0x3e300000) {
    // |x| < 2^-28
    if (((ix | loWord(x)) | (iy + 1)) === 0) return 1 / Math.abs(x); // -1/tan(+-0)
    if (iy === 1) return x;
    // compute -1 / (x + y) carefully
    z = w = x + y;
    z = setLo(z, 0);
    v = y - (z - x);
    let t: number;
    let a: number;
    t = a = -1 / w;
    t = setLo(t, 0);
    s = 1 + t * z;
    return t + a * (s + t * v);
  }
  if (ix >= 0x3fe59428) {
    // |x| >= 0.6744
    if (hx < 0) {
      x = -x;
      y = -y;
    }
    z = PIO4 - x;
    w = PIO4LO - y;
    x = z + w;
    y = 0;
  }
  z = x * x;
  w = z * z;
  r = T[1] + w * (T[3] + w * (T[5] + w * (T[7] + w * (T[9] + w * T[11]))));
  v = z * (T[2] + w * (T[4] + w * (T[6] + w * (T[8] + w * (T[10] + w * T[12])))));
  s = z * x;
  r = y + z * (s * (r + v) + y);
  r += T[0] * s;
  w = x + r;
  if (ix >= 0x3fe59428) {
    v = iy;
    return (1 - ((hx >> 30) & 2)) * (v - 2 * (x - ((w * w) / (w + v) - r)));
  }
  if (iy === 1) return w;
  // compute -1.0 / (x + r) accurately
  z = setLo(w, 0);
  v = r - (z - x);
  let t: number;
  let a: number;
  t = a = -1 / w;
  t = setLo(t, 0);
  s = 1 + t * z;
  return t + a * (s + t * v);
}

export function sin(x: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0, 0);
  if (ix >= 0x7ff00000) return x - x; // sin(inf or NaN) is NaN
  const n = remPio2(x);
  switch (n & 3) {
    case 0:
      return kernelSin(RY[0], RY[1], 1);
    case 1:
      return kernelCos(RY[0], RY[1]);
    case 2:
      return -kernelSin(RY[0], RY[1], 1);
    default:
      return -kernelCos(RY[0], RY[1]);
  }
}

export function cos(x: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x);
  switch (n & 3) {
    case 0:
      return kernelCos(RY[0], RY[1]);
    case 1:
      return -kernelSin(RY[0], RY[1], 1);
    case 2:
      return -kernelCos(RY[0], RY[1]);
    default:
      return kernelSin(RY[0], RY[1], 1);
  }
}

export function tan(x: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelTan(x, 0, 1);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x);
  return kernelTan(RY[0], RY[1], 1 - ((n & 1) << 1)); // 1 for n even, -1 for n odd
}

// ---------------------------------------------------------------------------------------------------------------
// asin, acos, atan, atan2

const PIO2_HI = 1.5707963267948966; // 0x1.921fb54442d18p0
const PIO2_LO = 6.123233995736766e-17; // 0x1.1a62633145c07p-54
const PIO4_HI = 0.7853981633974483; // 0x1.921fb54442d18p-1
const PS0 = 0.16666666666666666; // 0x1.5555555555555p-3
const PS1 = -0.3255658186224009; // -0x1.4d61203eb6f7dp-2
const PS2 = 0.20121253213486293; // 0x1.9c1550e884455p-3
const PS3 = -0.04005553450067941; // -0x1.48228b5688f3bp-5
const PS4 = 0.0007915349942898145; // 0x1.9efe07501b288p-11
const PS5 = 3.479331075960212e-05; // 0x1.23de10dfdf709p-15
const QS1 = -2.403394911734414; // -0x1.33a271c8a2d4bp1
const QS2 = 2.0209457602335057; // 0x1.02ae59c598ac8p1
const QS3 = -0.6882839716054533; // -0x1.6066c1b8d0159p-1
const QS4 = 0.07703815055590194; // 0x1.3b8c5b12e9282p-4

export function asin(x: number): number {
  let t = 0;
  let w: number;
  let p: number;
  let q: number;
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3ff00000) {
    // |x| >= 1
    if (((ix - 0x3ff00000) | loWord(x)) === 0) return x * PIO2_HI + x * PIO2_LO; // asin(+-1) = +-pi/2
    return NaN; // asin(|x| > 1) is NaN
  }
  if (ix < 0x3fe00000) {
    // |x| < 0.5
    if (ix < 0x3e400000) return x; // |x| < 2^-27
    t = x * x;
    p = t * (PS0 + t * (PS1 + t * (PS2 + t * (PS3 + t * (PS4 + t * PS5)))));
    q = 1 + t * (QS1 + t * (QS2 + t * (QS3 + t * QS4)));
    w = p / q;
    return x + x * w;
  }
  // 1 > |x| >= 0.5
  w = 1 - Math.abs(x);
  t = w * 0.5;
  p = t * (PS0 + t * (PS1 + t * (PS2 + t * (PS3 + t * (PS4 + t * PS5)))));
  q = 1 + t * (QS1 + t * (QS2 + t * (QS3 + t * QS4)));
  const s = Math.sqrt(t);
  if (ix >= 0x3fef3333) {
    // |x| > 0.975
    w = p / q;
    t = PIO2_HI - (2 * (s + s * w) - PIO2_LO);
  } else {
    w = setLo(s, 0);
    const c = (t - w * w) / (s + w);
    const r = p / q;
    p = 2 * s * r - (PIO2_LO - 2 * c);
    q = PIO4_HI - 2 * w;
    t = PIO4_HI - (p - q);
  }
  return hx > 0 ? t : -t;
}

export function acos(x: number): number {
  let z: number;
  let p: number;
  let q: number;
  let r: number;
  let w: number;
  let s: number;
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3ff00000) {
    // |x| >= 1
    if (((ix - 0x3ff00000) | loWord(x)) === 0) return hx > 0 ? 0 : PI + 2 * PIO2_LO; // acos(1) = 0, acos(-1) = pi
    return NaN;
  }
  if (ix < 0x3fe00000) {
    // |x| < 0.5
    if (ix <= 0x3c600000) return PIO2_HI + PIO2_LO; // |x| < 2^-57
    z = x * x;
    p = z * (PS0 + z * (PS1 + z * (PS2 + z * (PS3 + z * (PS4 + z * PS5)))));
    q = 1 + z * (QS1 + z * (QS2 + z * (QS3 + z * QS4)));
    r = p / q;
    return PIO2_HI - (x - (PIO2_LO - x * r));
  }
  if (hx < 0) {
    // x < -0.5
    z = (1 + x) * 0.5;
    p = z * (PS0 + z * (PS1 + z * (PS2 + z * (PS3 + z * (PS4 + z * PS5)))));
    q = 1 + z * (QS1 + z * (QS2 + z * (QS3 + z * QS4)));
    s = Math.sqrt(z);
    r = p / q;
    w = r * s - PIO2_LO;
    return PI - 2 * (s + w);
  }
  // x > 0.5
  z = (1 - x) * 0.5;
  s = Math.sqrt(z);
  const df = setLo(s, 0);
  const c = (z - df * df) / (s + df);
  p = z * (PS0 + z * (PS1 + z * (PS2 + z * (PS3 + z * (PS4 + z * PS5)))));
  q = 1 + z * (QS1 + z * (QS2 + z * (QS3 + z * QS4)));
  r = p / q;
  w = r * s + c;
  return 2 * (df + w);
}

const ATAN_HI = [0.4636476090008061, 0.7853981633974483, 0.982793723247329, 1.5707963267948966];
const ATAN_LO = [2.2698777452961687e-17, 3.061616997868383e-17, 1.3903311031230998e-17, 6.123233995736766e-17];
const AT = [
  0.3333333333333293, -0.19999999999876483, 0.14285714272503466, -0.11111110405462356, 0.09090887133436507,
  -0.0769187620504483, 0.06661073137387531, -0.058335701337905735, 0.049768779946159324, -0.036531572744216916,
  0.016285820115365782,
];

export function atan(x: number): number {
  let id: number;
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x44100000) {
    // |x| >= 2^66
    if (ix > 0x7ff00000 || (ix === 0x7ff00000 && loWord(x) !== 0)) return x + x; // NaN
    return hx > 0 ? ATAN_HI[3] + ATAN_LO[3] : -ATAN_HI[3] - ATAN_LO[3];
  }
  if (ix < 0x3fdc0000) {
    // |x| < 0.4375
    if (ix < 0x3e200000) return x; // |x| < 2^-29
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      // |x| < 1.1875
      if (ix < 0x3fe60000) {
        // 7/16 <= |x| < 11/16
        id = 0;
        x = (2 * x - 1) / (2 + x);
      } else {
        // 11/16 <= |x| < 19/16
        id = 1;
        x = (x - 1) / (x + 1);
      }
    } else if (ix < 0x40038000) {
      // |x| < 2.4375
      id = 2;
      x = (x - 1.5) / (1 + 1.5 * x);
    } else {
      // 2.4375 <= |x| < 2^66
      id = 3;
      x = -1 / x;
    }
  }
  let z = x * x;
  const w = z * z;
  // break the sum into odd and even polynomials
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  z = ATAN_HI[id] - (x * (s1 + s2) - ATAN_LO[id] - x);
  return hx < 0 ? -z : z;
}

const PI_O_4 = 0.7853981633974483; // 0x1.921fb54442d18p-1
const PI_O_2 = 1.5707963267948966; // 0x1.921fb54442d18p0
const PI_LO = 1.2246467991473532e-16; // 0x1.1a62633145c07p-53

export function atan2(y: number, x: number): number {
  let z: number;
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  const lx = loWord(x);
  const hy = hiWord(y);
  const iy = hy & 0x7fffffff;
  const ly = loWord(y);
  if (x !== x || y !== y) return NaN;
  if (((hx - 0x3ff00000) | lx) === 0) return atan(y); // x = 1
  const m = ((hy >> 31) & 1) | ((hx >> 30) & 2); // 2 * sign(x) + sign(y)
  if ((iy | ly) === 0) {
    // y = 0
    if (m === 0 || m === 1) return y; // atan(+-0, +anything) = +-0
    return m === 2 ? PI + TINY : -PI - TINY; // atan(+-0, -anything) = +-pi
  }
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY; // x = 0
  if (ix === 0x7ff00000) {
    // x is infinite
    if (iy === 0x7ff00000) {
      switch (m) {
        case 0:
          return PI_O_4 + TINY;
        case 1:
          return -PI_O_4 - TINY;
        case 2:
          return 3 * PI_O_4 + TINY;
        default:
          return -3 * PI_O_4 - TINY;
      }
    }
    switch (m) {
      case 0:
        return 0;
      case 1:
        return -0;
      case 2:
        return PI + TINY;
      default:
        return -PI - TINY;
    }
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY; // y is infinite
  // compute y/x
  const k = (iy - ix) >> 20;
  if (k > 60) z = PI_O_2 + 0.5 * PI_LO; // |y/x| > 2^60
  else if (hx < 0 && k < -60) z = 0; // |y|/x < -2^60
  else z = atan(Math.abs(y / x));
  switch (m) {
    case 0:
      return z; // atan(+, +)
    case 1:
      return -z; // atan(-, +)
    case 2:
      return PI - (z - PI_LO); // atan(+, -)
    default:
      return z - PI_LO - PI; // atan(-, -)
  }
}

// ---------------------------------------------------------------------------------------------------------------
// sinh, cosh, tanh

export function sinh(x: number): number {
  let t: number;
  const jx = hiWord(x);
  const ix = jx & 0x7fffffff;
  if (ix >= 0x7ff00000) return x + x; // x is inf or NaN
  const h = jx < 0 ? -0.5 : 0.5;
  if (ix < 0x40360000) {
    // |x| < 22
    if (ix < 0x3e300000) return x; // |x| < 2^-28
    t = expm1(Math.abs(x));
    if (ix < 0x3ff00000) return h * (2 * t - (t * t) / (t + 1));
    return h * (t + t / (t + 1));
  }
  if (ix < 0x40862e42) return h * exp(Math.abs(x)); // |x| in [22, log(maxdouble)]
  const lx = loWord(x);
  if (ix < 0x408633ce || (ix === 0x408633ce && lx >>> 0 <= 0x8fb9f87d)) {
    // |x| in [log(maxdouble), overflow threshold]
    const w = exp(0.5 * Math.abs(x));
    t = h * w;
    return t * w;
  }
  return x * 1.0e307; // overflow
}

export function cosh(x: number): number {
  let t: number;
  let w: number;
  const ix = hiWord(x) & 0x7fffffff;
  if (ix >= 0x7ff00000) return x * x; // x is inf or NaN
  if (ix < 0x3fd62e43) {
    // |x| in [0, 0.5 ln2]
    t = expm1(Math.abs(x));
    w = 1 + t;
    if (ix < 0x3c800000) return w; // cosh(tiny) = 1
    return 1 + (t * t) / (w + w);
  }
  if (ix < 0x40360000) {
    // |x| in [0.5 ln2, 22]
    t = exp(Math.abs(x));
    return 0.5 * t + 0.5 / t;
  }
  if (ix < 0x40862e42) return 0.5 * exp(Math.abs(x)); // |x| in [22, log(maxdouble)]
  const lx = loWord(x);
  if (ix < 0x408633ce || (ix === 0x408633ce && lx >>> 0 <= 0x8fb9f87d)) {
    w = exp(0.5 * Math.abs(x));
    t = 0.5 * w;
    return t * w;
  }
  return Infinity; // overflow
}

export function tanh(x: number): number {
  let t: number;
  let z: number;
  const jx = hiWord(x);
  const ix = jx & 0x7fffffff;
  if (ix >= 0x7ff00000) return jx >= 0 ? 1 / x + 1 : 1 / x - 1; // x is inf or NaN
  if (ix < 0x40360000) {
    // |x| < 22
    if (ix < 0x3c800000) return x * (1 + x); // |x| < 2^-55
    if (ix >= 0x3ff00000) {
      // |x| >= 1
      t = expm1(2 * Math.abs(x));
      z = 1 - 2 / (t + 2);
    } else {
      t = expm1(-2 * Math.abs(x));
      z = -t / (t + 2);
    }
  } else {
    z = 1 - TINY; // |x| >= 22: return +-1
  }
  return jx >= 0 ? z : -z;
}

// ---------------------------------------------------------------------------------------------------------------
// hypot, cbrt

const TWO_MINUS_600 = 2.409919865102884e-181; // 0x1.0p-600
const TWO_PLUS_600 = 4.149515568880993e+180; // 0x1.0p600

/** `sqrt(x² + y²)` without undue overflow or underflow (two arguments only). */
export function hypot(x: number, y: number): number {
  let a = Math.abs(x);
  let b = Math.abs(y);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    if (a === Infinity || b === Infinity) return Infinity;
    return a + b; // NaN
  }
  if (b > a) {
    const tmp = a;
    a = b;
    b = tmp;
  }
  let ha = hiWord(a);
  let hb = hiWord(b);
  if (ha - hb > 0x3c00000) return a + b; // a/b > 2^60
  let k = 0;
  let t1: number;
  let t2: number;
  if (a > 3.2733937296446915e+150) {
    // a > 2^500: scale a and b by 2^-600
    ha -= 0x25800000;
    hb -= 0x25800000;
    a *= TWO_MINUS_600;
    b *= TWO_MINUS_600;
    k += 600;
  }
  if (b < 3.054936363499605e-151) {
    if (b < 2.2250738585072014e-308) {
      // subnormal b or 0
      if (b === 0) return a;
      t1 = 4.49423283715579e+307;
      b *= t1;
      a *= t1;
      k -= 1022;
    } else {
      // scale a and b by 2^600
      ha += 0x25800000;
      hb += 0x25800000;
      a *= TWO_PLUS_600;
      b *= TWO_PLUS_600;
      k -= 600;
    }
  }
  // medium size a and b
  let w = a - b;
  if (w > b) {
    t1 = fromWords(ha, 0);
    t2 = a - t1;
    w = Math.sqrt(t1 * t1 - (b * -b - t2 * (a + t1)));
  } else {
    a = a + a;
    const y1 = fromWords(hb, 0);
    const y2 = b - y1;
    t1 = fromWords(ha + 0x00100000, 0);
    t2 = a - t1;
    w = Math.sqrt(t1 * y1 - (w * -w - (t1 * y2 + t2 * b)));
  }
  return k !== 0 ? scalbn(w, k) : w;
}

const CB_B1 = 715094163; // (1023 - 1023/3 - 0.03306235651) * 2^20
const CB_B2 = 696219795; // (1023 - 1023/3 - 54/3 - 0.03306235651) * 2^20
const CB_C = 0.5428571428571428; // 0x1.15f15f15f15f1p-1
const CB_D = -0.7053061224489796; // -0x1.691de2532c834p-1
const CB_E = 1.4142857142857144; // 0x1.6a0ea0ea0ea0fp0
const CB_F = 1.6071428571428572; // 0x1.9b6db6db6db6ep0
const CB_G = 0.35714285714285715; // 0x1.6db6db6db6db7p-2

export function cbrt(x: number): number {
  let t = 0;
  if (x === 0 || !Number.isFinite(x)) return x; // cbrt(+-0, +-inf, NaN) is itself
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  // a rough cube root to 5 bits
  if (x < 2.2250738585072014e-308) {
    // subnormal
    t = 1.8014398509481984e+16;
    t *= x;
    t = setHi(t, ((hiWord(t) / 3) | 0) + CB_B2);
  } else {
    t = setHi(t, ((hiWord(x) / 3) | 0) + CB_B1);
  }
  // new cbrt to 23 bits
  let r = (t * t) / x;
  let s = CB_C + r * t;
  t *= CB_G + CB_F / (s + CB_E + CB_D / s);
  // chop to 20 bits and make it larger than cbrt(x)
  t = setLo(t, 0);
  t = setHi(t, hiWord(t) + 0x00000001);
  // one step of Newton's method to 53 bits, error < 0.667 ulps
  s = t * t;
  r = x / s;
  const w = t + t;
  r = (r - t) / (w + r);
  t = t + t * r;
  return sign * t;
}
