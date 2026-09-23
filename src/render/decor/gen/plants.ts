/**
 * Procedural aquarium plants: every leaf is real geometry (merged per plant), with per-vertex sway weights,
 * phases, emergence thresholds (so plants visibly grow in) and leaf-translucency colours.
 * OWNER: lane "aquascape".
 */
import { GeoBuilder, leaf, tube, smoothPath, weightFromHeight, blob, add, scl, dirYP, norm, type V3, type Sway, type Extra } from './builder';
import { prng, noise3, hex, mix, mul, clamp, smooth, jitter, type RGB, type PRng } from './noise';
import type { DecorBuild } from './rocks';
import type { DecorDef } from '@/types';

const q = (lod: number) => (lod === 0 ? 1 : lod === 1 ? 0.5 : 0.22);
const cnt = (lod: number, a: number, b: number, r: PRng) => Math.max(1, Math.round(r.int(a, b) * q(lod)));
const GLOSS: Extra = [0, 0.28, 0.6, 0.15];
const MATTE: Extra = [0, 0.62, 0.3, 0.25];

function sw(phase: number, flex: number, birth: number): Sway {
  return [0, phase, flex, birth];
}

// ───────────────────────────── epiphytes ─────────────────────────────

function javaFern(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, h } = def.size;
  const dark = hex('#1f3a1b');
  const mid = hex('#3d6a2c');
  const tip = hex('#6d9440');
  const sori = hex('#3a2a14');
  // rhizome creeping across the host
  const rhizome: V3[] = [[-w * 0.2, 0.008, r.range(-0.01, 0.01)], [0, 0.011, r.range(-0.008, 0.008)], [w * 0.18, 0.008, r.range(-0.01, 0.01)]];
  tube(b, smoothPath(rhizome, 8), { radial: lod === 0 ? 6 : 4, radius: () => 0.0035, color: () => hex('#4a3a24'), capStart: true, capEnd: true });
  const leaves = cnt(lod, 13, 18, r);
  const target = def.anchors.find((a) => a.kind === 'leaf_rest')?.offset;
  for (let i = 0; i < leaves; i++) {
    const t = i / Math.max(1, leaves - 1);
    const base: V3 = [-w * 0.18 + t * w * 0.36, 0.01, r.range(-0.008, 0.008)];
    let yaw = r.range(0, Math.PI * 2);
    let pitch = r.range(0.6, 1.3);
    let L = r.range(h * 0.55, h * 0.95);
    if (i === 0 && target) {
      // one broad leaf arcs out to the resting spot
      yaw = Math.atan2(-(target[2] - base[2]), target[0] - base[0]);
      pitch = 0.95;
      L = h * 0.85;
    }
    const age = r();
    const birth = clamp(age * 0.85 - 0.05, 0, 0.8);
    const hueJ = r.range(-0.08, 0.08);
    const soriLeaf = r.chance(0.35) && age < 0.4;
    leaf(b, {
      base,
      yaw,
      pitch,
      length: L,
      width: r.range(0.018, 0.028),
      curl: r.range(0.5, 1.1),
      sideCurl: r.range(-0.3, 0.3),
      twist: r.range(-0.5, 0.5),
      fold: r.range(0.18, 0.32),
      wave: 0.0012,
      waveFreq: r.range(3, 5),
      shape: 'lance',
      segL: lod === 0 ? 10 : lod === 1 ? 6 : 3,
      segW: lod === 0 ? 2 : 1,
      color: (u, s) => {
        let c = mix(dark, mid, smooth(0, 0.5, u) * (1 - Math.abs(s) * 0.4));
        c = mix(c, tip, smooth(0.6, 1, u) * 0.6);
        if (Math.abs(s) < 0.12) c = mix(c, hex('#7c9c56'), 0.35); // midrib
        if (soriLeaf && u > 0.55 && Math.abs(s) > 0.3 && n(u * 30, s * 8, i) > 0.35) c = mix(c, sori, 0.8);
        return mul(c, 1 + hueJ);
      },
      sway: sw(r() * 6.28, r.range(0.25, 0.45), birth),
      extra: [0, 0.55, 0.35, 0.3],
    });
  }
  weightFromHeight(b, 0, h, 1.4);
}

function anubias(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { w, h } = def.size;
  const deep = hex('#16361b');
  const mid = hex('#2c5e2e');
  const vein = hex('#4f7d45');
  const rhizome: V3[] = [[-w * 0.3, 0.006, 0], [-w * 0.05, 0.009, r.range(-0.006, 0.006)], [w * 0.25, 0.007, r.range(-0.006, 0.006)]];
  tube(b, smoothPath(rhizome, 8), { radial: lod === 0 ? 7 : 4, radius: (t) => 0.004 * (1 - t * 0.3), color: (t) => mix(hex('#3c4a26'), hex('#56603a'), t), capStart: true, capEnd: 'round' });
  const leaves = cnt(lod, 10, 15, r);
  const target = def.anchors.find((a) => a.kind === 'leaf_rest')?.offset;
  for (let i = 0; i < leaves; i++) {
    const t = r();
    const base: V3 = [-w * 0.25 + t * w * 0.5, 0.009, r.range(-0.006, 0.006)];
    let yaw = r.range(0, Math.PI * 2);
    let pitch = r.range(0.35, 1.05);
    const top = i === 0 && target;
    if (top) {
      yaw = Math.atan2(-(target[2] - base[2]), target[0] - base[0]);
      pitch = 0.9;
    }
    const L = r.range(0.036, 0.055);
    const pet = r.range(0.014, 0.028);
    leaf(b, {
      base,
      yaw,
      pitch,
      length: top ? 0.05 : L,
      width: r.range(0.024, 0.034),
      curl: top ? 0.7 : r.range(0.25, 0.7),
      twist: r.range(-0.3, 0.3),
      fold: 0.12,
      shape: 'ovate',
      petiole: top ? 0.03 : pet,
      segL: lod === 0 ? 10 : 5,
      segW: lod === 0 ? 2 : 1,
      color: (u, s) => {
        let c = mix(deep, mid, 0.4 + 0.4 * u);
        if (Math.abs(s) < 0.08 || (Math.abs(Math.abs(s) - (u * 0.9)) < 0.05 && u > 0.2)) c = mix(c, vein, 0.45);
        return c;
      },
      sway: sw(r() * 6.28, 0.12, clamp(r() * 0.7, 0, 0.7)),
      extra: GLOSS,
    });
  }
  weightFromHeight(b, 0, h, 1);
}

function moss(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const dark = hex('#1d3516');
  const mid = hex('#3a6126');
  const light = hex('#6a9440');
  // a soft cushion: inner dark mass + hundreds of fine fronds pointing outward
  blob(
    b,
    lod === 0 ? 5 : 2,
    (dir) => {
      const k = 1 + 0.25 * n(dir[0] * 3, dir[1] * 3, dir[2] * 3);
      return [dir[0] * w * 0.3 * k, Math.max(0.002, dir[1] * h * 0.55 * k + h * 0.18), dir[2] * d * 0.3 * k];
    },
    () => dark,
    { extra: () => MATTE },
  );
  const fronds = lod === 0 ? r.int(680, 820) : lod === 1 ? 220 : 60;
  for (let i = 0; i < fronds; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const rad = Math.sqrt(1 - u * u);
    const dir: V3 = [rad * Math.cos(th), Math.abs(u) * 0.9 + 0.1, rad * Math.sin(th)];
    const k = 0.75 + 0.3 * n(dir[0] * 3, dir[1] * 3, dir[2] * 3);
    const base: V3 = [dir[0] * w * 0.4 * k, dir[1] * h * 0.72 * k + h * 0.12, dir[2] * d * 0.4 * k];
    const out = norm(add(dir, [r.range(-0.6, 0.6), r.range(-0.2, 0.5), r.range(-0.6, 0.6)]));
    const yaw = Math.atan2(-out[2], out[0]);
    const pitch = Math.asin(clamp(out[1], -1, 1));
    const c = jitter(mix(mid, light, r() * 0.8), r, 0.1);
    leaf(b, {
      base,
      yaw,
      pitch,
      length: r.range(0.007, 0.015),
      width: r.range(0.0014, 0.0024),
      curl: r.range(-0.6, 0.6),
      shape: 'needle',
      segL: 2,
      segW: 1,
      color: (t) => mix(mul(c, 0.6), c, t),
      sway: sw(r() * 6.28, 0.12, clamp(r() * 0.9 - 0.1, 0, 0.8)),
      extra: MATTE,
    });
  }
  weightFromHeight(b, 0, h, 1);
}

// ───────────────────────────── rosettes ─────────────────────────────

function sword(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { h } = def.size;
  const base = hex('#2f6424');
  const bright = hex('#63a53e');
  const vein = hex('#8cc262');
  const leaves = cnt(lod, 11, 16, r);
  for (let i = 0; i < leaves; i++) {
    const inner = i / leaves; // later = inner, younger
    const yaw = i * 2.39996 + r.range(-0.2, 0.2); // golden angle phyllotaxis
    const pitch = 0.62 + inner * 0.7 + r.range(-0.1, 0.1);
    leaf(b, {
      base: [r.range(-0.003, 0.003), 0.003, r.range(-0.003, 0.003)],
      yaw,
      pitch,
      length: r.range(h * 0.42, h * 0.62) * (0.8 + 0.3 * (1 - inner)),
      width: r.range(0.028, 0.04),
      curl: r.range(0.4, 0.9) * (1 - inner * 0.6),
      twist: r.range(-0.3, 0.3),
      fold: 0.14,
      wave: 0.0006,
      shape: 'lance',
      petiole: r.range(0.03, 0.06),
      segL: lod === 0 ? 12 : 6,
      segW: lod === 0 ? 3 : 1,
      color: (u, s) => {
        let c = mix(base, bright, 0.35 + 0.5 * u + inner * 0.2);
        const lat = Math.abs(Math.sin((u * 7 - Math.abs(s) * 1.4) * Math.PI));
        if (Math.abs(s) < 0.07) c = mix(c, vein, 0.5);
        else if (lat > 0.94) c = mix(c, vein, 0.25);
        return c;
      },
      sway: sw(r() * 6.28, 0.35, clamp(inner * 0.9 - 0.1, 0, 0.85)),
      extra: [0, 0.45, 0.4, 0.2],
    });
  }
  weightFromHeight(b, 0, h, 1.3);
}

function crypt(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { h } = def.size;
  const variant = r.int(0, 2);
  const cols: [RGB, RGB, RGB][] = [
    [hex('#3c4a1e'), hex('#6b6a2e'), hex('#7a3a2a')], // bronze
    [hex('#2e4a22'), hex('#5a7a34'), hex('#6a4a2a')], // green
    [hex('#4a3a24'), hex('#7a5a34'), hex('#8a3a30')], // brown/red
  ];
  const [c0, c1, rib] = cols[variant];
  const leaves = cnt(lod, 12, 17, r);
  for (let i = 0; i < leaves; i++) {
    const inner = i / leaves;
    leaf(b, {
      base: [r.range(-0.004, 0.004), 0.002, r.range(-0.004, 0.004)],
      yaw: i * 2.39996 + r.range(-0.3, 0.3),
      pitch: 0.7 + inner * 0.55 + r.range(-0.1, 0.15),
      length: r.range(h * 0.5, h * 0.8),
      width: r.range(0.018, 0.026),
      curl: r.range(0.6, 1.1),
      twist: r.range(-0.4, 0.4),
      fold: 0.1,
      wave: 0.0022,
      waveFreq: r.range(4, 6),
      shape: 'lance',
      petiole: r.range(0.012, 0.025),
      segL: lod === 0 ? 12 : 6,
      segW: lod === 0 ? 2 : 1,
      color: (u, s) => {
        let c = mix(c0, c1, 0.3 + 0.6 * u);
        if (Math.abs(s) < 0.1) c = mix(c, rib, 0.55);
        return c;
      },
      sway: sw(r() * 6.28, 0.28, clamp(inner * 0.85, 0, 0.85)),
      extra: [0, 0.48, 0.4, 0.25],
    });
  }
  weightFromHeight(b, 0, h, 1.3);
}

function vallisneria(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { w, d, h } = def.size;
  const c0 = hex('#3d6a26');
  const c1 = hex('#7aa84a');
  const blades = cnt(lod, 26, 36, r);
  // two or three crowns joined by runners
  const crowns: V3[] = [[r.range(-w * 0.2, 0), 0.002, r.range(-d * 0.15, d * 0.15)], [r.range(0.005, w * 0.3), 0.002, r.range(-d * 0.2, d * 0.2)]];
  for (let i = 0; i < blades; i++) {
    const cr = crowns[i % crowns.length];
    const inner = r();
    leaf(b, {
      base: [cr[0] + r.range(-0.004, 0.004), cr[1], cr[2] + r.range(-0.004, 0.004)],
      yaw: r.range(0, Math.PI * 2),
      pitch: r.range(1.32, 1.5),
      length: r.range(h * 0.6, h * 0.99),
      width: r.range(0.007, 0.011),
      curl: r.range(0.05, 0.4),
      sideCurl: r.range(-0.25, 0.25),
      twist: r.range(-2.2, 2.2),
      shape: 'ribbon',
      segL: lod === 0 ? 18 : lod === 1 ? 8 : 4,
      segW: 1,
      color: (u, s) => mix(c0, c1, 0.25 + 0.7 * u + Math.abs(s) * 0.05),
      sway: sw(r() * 6.28, r.range(0.85, 1.15), clamp(inner * 0.9 - 0.05, 0, 0.85)),
      extra: [0, 0.5, 0.45, 0.1],
    });
  }
  weightFromHeight(b, 0, h, 1.25);
}

function waterSprite(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { h } = def.size;
  const c0 = hex('#5a8a32');
  const c1 = hex('#a4d06a');
  const fronds = cnt(lod, 8, 12, r);
  for (let i = 0; i < fronds; i++) {
    const inner = i / fronds;
    const yaw = i * 2.39996 + r.range(-0.3, 0.3);
    const pitch = 0.8 + inner * 0.5;
    const L = r.range(h * 0.55, h * 0.9);
    const birth = clamp(inner * 0.85, 0, 0.85);
    const phase = r() * 6.28;
    // rachis
    const segs = lod === 0 ? 8 : 4;
    const rach: V3[] = [];
    let p: V3 = [r.range(-0.004, 0.004), 0.003, r.range(-0.004, 0.004)];
    let pt = pitch;
    for (let k = 0; k <= segs; k++) {
      rach.push(p);
      p = add(p, scl(dirYP(yaw, pt), L / segs));
      pt -= 0.08;
    }
    tube(b, rach, { radial: 3, radius: (t) => 0.0012 * (1 - t * 0.6), color: (t) => mix(c0, c1, t), sway: () => sw(phase, 0.45, birth), pivot: rach[0] });
    // pinnate lobes
    const lobes = lod === 0 ? r.int(7, 11) : 4;
    for (let k = 1; k <= lobes; k++) {
      const t = k / (lobes + 1);
      const at = rach[Math.min(rach.length - 1, Math.round(t * segs))];
      for (const side of [-1, 1]) {
        leaf(b, {
          base: at,
          yaw: yaw + side * r.range(0.7, 1.1),
          pitch: pitch - 0.3 - t * 0.4,
          length: r.range(0.012, 0.024) * (1 - t * 0.5),
          width: r.range(0.0025, 0.004),
          curl: 0.4,
          shape: 'lance',
          segL: 3,
          segW: 1,
          color: (u) => mix(c0, c1, 0.4 + t * 0.4 + u * 0.2),
          sway: sw(phase, 0.45, birth),
          pivot: rach[0],
          extra: [0, 0.5, 0.4, 0.1],
        });
      }
    }
  }
  weightFromHeight(b, 0, h, 1.2);
}

// ───────────────────────────── stem plants ─────────────────────────────

function stems(b: GeoBuilder, def: DecorDef, seed: number, lod: number, kind: 'rotala' | 'ludwigia'): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const rot = kind === 'rotala';
  const green = rot ? hex('#6f9a3a') : hex('#5f8032');
  const topC = rot ? hex('#e8849a') : hex('#b8442c');
  const midC = rot ? hex('#d0a858') : hex('#946a34');
  const stemsN = cnt(lod, rot ? 11 : 7, rot ? 15 : 10, r);
  const grow = (bx: number, by: number, bz: number, H: number, lean: number, leanZ: number, birthStem: number, phase: number, side: boolean) => {
    const segs = lod === 0 ? 10 : 5;
    const path: V3[] = [];
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      path.push([bx + Math.sin(t * 1.6) * lean * H * 0.35 + n(bx * 50, t * 3, 1) * 0.004, by + t * H, bz + t * leanZ * H * 0.3]);
    }
    const root = side ? path[0] : ([bx, 0.001, bz] as V3);
    tube(b, path, { radial: 3, radius: () => (rot ? 0.0012 : 0.0015), color: (t) => mix(hex('#4a5a2a'), mix(midC, topC, 0.5), t), sway: () => sw(phase, 0.55, birthStem), pivot: root });
    const nodes = Math.max(3, Math.round((H / (rot ? 0.0075 : 0.011)) * (lod === 0 ? 1 : 0.5)));
    for (let k = 1; k <= nodes; k++) {
      const t = k / nodes;
      const idx = t * segs;
      const i0 = Math.floor(idx);
      const i1 = Math.min(segs, i0 + 1);
      const f = idx - i0;
      const at: V3 = [path[i0][0] + (path[i1][0] - path[i0][0]) * f, path[i0][1] + (path[i1][1] - path[i0][1]) * f, path[i0][2] + (path[i1][2] - path[i0][2]) * f];
      const hgt = (at[1] - 0) / h;
      const col = mix(mix(green, midC, smooth(0.4, 0.72, hgt)), topC, smooth(0.66, 1, hgt));
      const sizeK = t > 0.86 ? 0.5 + (1 - t) * 3.2 : 1;
      const pairs = rot ? 2 : 1;
      for (let p = 0; p < pairs * 2; p++) {
        const yaw = (p / (pairs * 2)) * Math.PI * 2 + k * (Math.PI / 2) + r.range(-0.2, 0.2);
        leaf(b, {
          base: at,
          yaw,
          pitch: rot ? 0.5 + t * 0.55 : 0.28 + t * 0.45,
          length: (rot ? r.range(0.012, 0.017) : r.range(0.018, 0.026)) * sizeK,
          width: (rot ? r.range(0.0038, 0.0055) : r.range(0.011, 0.016)) * sizeK,
          curl: rot ? 0.5 : 0.4,
          fold: 0.22,
          shape: rot ? 'lance' : 'oval',
          segL: lod === 0 ? 4 : 2,
          segW: 1,
          color: (u) => mul(col, 0.82 + 0.3 * u),
          sway: sw(phase, 0.55, clamp(birthStem + t * 0.3, 0, 0.9)),
          pivot: root,
          extra: [0, 0.5, 0.4, 0.1],
        });
      }
      // side shoots make trimmed stems bushy
      if (!side && lod === 0 && k > nodes * 0.35 && k < nodes * 0.8 && r.chance(rot ? 0.09 : 0.07)) {
        grow(at[0], at[1], at[2], (path[segs][1] - at[1]) * r.range(0.6, 0.95), lean + r.range(-0.5, 0.5), leanZ + r.range(-0.4, 0.4), clamp(birthStem + t * 0.3, 0, 0.85), phase + 0.7, true);
      }
    }
  };
  for (let s = 0; s < stemsN; s++) {
    const bx = r.range(-w * 0.32, w * 0.32);
    const bz = r.range(-d * 0.32, d * 0.32);
    const H = r.range(h * 0.62, h * 0.98);
    grow(bx, 0.002, bz, H, r.range(-0.25, 0.25), r.range(-0.2, 0.2), clamp(s / stemsN - 0.1, 0, 0.7), r() * 6.28, false);
  }
  weightFromHeight(b, 0, h, 1.2);
}

// ───────────────────────────── carpets ─────────────────────────────

function monteCarlo(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const c0 = hex('#4e8a2a');
  const c1 = hex('#9ad05a');
  const count = lod === 0 ? r.int(380, 470) : lod === 1 ? 140 : 45;
  for (let i = 0; i < count; i++) {
    let x = 0;
    let z = 0;
    for (let tries = 0; tries < 6; tries++) {
      x = r.range(-w / 2, w / 2);
      z = r.range(-d / 2, d / 2);
      if ((x / (w / 2)) ** 2 + (z / (d / 2)) ** 2 < 0.95 - 0.25 * Math.max(0, n(x * 30, z * 30, 0))) break;
    }
    const stemH = r.range(0.004, h * 0.8) * (1 - 0.4 * ((x / (w / 2)) ** 2 + (z / (d / 2)) ** 2));
    const base: V3 = [x, 0.001, z];
    const top: V3 = [x + r.range(-0.002, 0.002), stemH, z + r.range(-0.002, 0.002)];
    const phase = r() * 6.28;
    const birth = clamp(Math.hypot(x / w, z / d) * 1.4 - 0.1 + r.range(-0.1, 0.1), 0, 0.85);
    if (lod === 0) tube(b, [base, top], { radial: 3, radius: () => 0.0005, color: () => c0, sway: () => sw(phase, 0.15, birth), pivot: base });
    leaf(b, {
      base: top,
      yaw: r.range(0, 6.28),
      pitch: r.range(-0.1, 0.5),
      length: r.range(0.0045, 0.0065),
      width: r.range(0.0045, 0.006),
      fold: 0.25,
      shape: 'round',
      segL: lod === 0 ? 4 : 2,
      segW: 1,
      color: (u) => jitter(mix(c0, c1, 0.4 + 0.5 * u), r, 0.05),
      sway: sw(phase, 0.15, birth),
      pivot: base,
      extra: [0, 0.4, 0.5, 0.05],
    });
  }
  weightFromHeight(b, 0, h, 1);
}

function hairgrass(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const { w, d, h } = def.size;
  const c0 = hex('#3f7a24');
  const c1 = hex('#9ccc58');
  const tufts = cnt(lod, 20, 28, r);
  for (let t = 0; t < tufts; t++) {
    const cx = r.range(-w * 0.42, w * 0.42);
    const cz = r.range(-d * 0.42, d * 0.42);
    const edge = (cx / (w / 2)) ** 2 + (cz / (d / 2)) ** 2;
    const birth = clamp(edge * 0.8 + r.range(-0.1, 0.1), 0, 0.85);
    const blades = lod === 0 ? r.int(12, 18) : 6;
    const tuftH = h * r.range(0.5, 1) * (1 - 0.3 * edge);
    for (let i = 0; i < blades; i++) {
      leaf(b, {
        base: [cx + r.range(-0.003, 0.003), 0.001, cz + r.range(-0.003, 0.003)],
        yaw: r.range(0, 6.28),
        pitch: r.range(1.05, 1.5),
        length: tuftH * r.range(0.6, 1),
        width: r.range(0.0009, 0.0014),
        curl: r.range(0.1, 0.8),
        shape: 'needle',
        segL: lod === 0 ? 5 : 2,
        segW: 1,
        color: (u) => mix(c0, c1, 0.2 + 0.75 * u),
        sway: sw(r() * 6.28, 0.5, birth),
        extra: [0, 0.5, 0.4, 0.05],
      });
    }
  }
  weightFromHeight(b, 0, h, 1.3);
}

// ───────────────────────────── surface & specials ─────────────────────────────

function floating(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const green = hex('#5f9436');
  const light = hex('#9cc462');
  const red = hex('#b0463a');
  const root = hex('#c9a08a');
  const rootRed = hex('#8a3a30');
  const count = lod === 0 ? r.int(34, 48) : lod === 1 ? 18 : 8;
  const top = h - 0.002;
  const anchors = def.anchors.filter((a) => a.kind === 'leaf_rest').map((a) => a.offset);
  for (let i = 0; i < count; i++) {
    let x: number;
    let z: number;
    if (i < anchors.length) {
      x = anchors[i][0];
      z = anchors[i][2];
    } else {
      // clumped distribution
      const cl = i % 4;
      const cx = [-0.3, 0.2, 0.05, -0.1][cl] * w;
      const cz = [0.1, -0.2, 0.25, -0.25][cl] * d;
      x = clamp(cx + r.gauss() * w * 0.16, -w * 0.46, w * 0.46);
      z = clamp(cz + r.gauss() * d * 0.16, -d * 0.44, d * 0.44);
    }
    const frogbit = r.chance(0.25);
    const size = frogbit ? r.range(0.011, 0.016) : r.range(0.006, 0.01);
    const redTint = frogbit ? 0 : smooth(-0.2, 0.6, n(x * 20, z * 20, 1)) * 0.7;
    const phase = r() * 6.28;
    const base: V3 = [x - size / 2, top, z];
    leaf(b, {
      base,
      yaw: r.range(0, 6.28),
      pitch: r.range(-0.03, 0.05),
      length: size,
      width: size * r.range(0.9, 1.05),
      fold: r.range(0.25, 0.45),
      shape: frogbit ? 'heart' : 'round',
      segL: lod === 0 ? 6 : 3,
      segW: lod === 0 ? 2 : 1,
      color: (u, s) => mix(mix(green, light, 0.3 + 0.3 * u), red, redTint * (0.4 + Math.abs(s) * 0.6)),
      sway: sw(phase, 0.2, clamp(r() * 0.8, 0, 0.8)),
      pivot: [x, top, z],
      extra: [0, 0.22, 0.8, 0.05],
    });
    // dangling roots
    const roots = lod === 0 ? r.int(1, 3) : lod === 1 ? 1 : 0;
    for (let k = 0; k < roots; k++) {
      const L = r.range(0.008, h * 0.55);
      const p0: V3 = [x + r.range(-0.002, 0.002), top - 0.001, z + r.range(-0.002, 0.002)];
      const p1: V3 = [p0[0] + r.range(-0.004, 0.004), top - L * 0.5, p0[2] + r.range(-0.004, 0.004)];
      const p2: V3 = [p1[0] + r.range(-0.006, 0.006), top - L, p1[2] + r.range(-0.006, 0.006)];
      const rc = frogbit ? root : mix(root, rootRed, 0.6);
      tube(b, smoothPath([p0, p1, p2], 5), { radial: 3, radius: (t) => 0.00038 * (1 - t * 0.5), color: (t) => mul(rc, 1 - t * 0.2), sway: (t) => [0.3 + t * 0.7, phase, 0.35, 0], pivot: [x, top, z] });
    }
  }
  // floaters: whole mat drifts gently; roots swing more — weights already set per vertex (leaves 0 → 0.3)
  for (let i = 0; i < b.count; i++) if (b.sway[i * 4] === 0) b.sway[i * 4] = 0.3;
}

function almondLeaf(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { w, h } = def.size;
  const tan = hex('#a0662e');
  const dark = hex('#4a2a12');
  const edge = hex('#6a3a18');
  const leaves = 1 + (r.chance(0.5) ? 1 : 0);
  for (let i = 0; i < leaves; i++) {
    const L = i === 0 ? w * 0.95 : w * 0.55;
    leaf(b, {
      base: [-L / 2 + (i === 0 ? 0 : r.range(-0.01, 0.02)), 0.003 + i * 0.004, i === 0 ? 0 : r.range(-0.012, 0.012)],
      yaw: i === 0 ? 0 : r.range(-0.8, 0.8),
      pitch: 0.02,
      length: L,
      width: L * 0.55,
      curl: -0.06,
      fold: 0.2, // dried catappa leaves dish upward at the edges
      wave: 0.002,
      waveFreq: 2,
      shape: 'ovate',
      petiole: 0.008,
      segL: lod === 0 ? 12 : 5,
      segW: lod === 0 ? 4 : 2,
      color: (u, s) => {
        let c = mix(tan, hex('#8a5024'), smooth(-0.3, 0.6, n(u * 6, s * 3, i)));
        const vein = Math.abs(s) < 0.05 || Math.abs(Math.sin((u * 6 - Math.abs(s) * 2.2) * Math.PI)) > 0.96;
        if (vein) c = mix(c, dark, 0.35);
        c = mix(c, edge, smooth(0.7, 1, Math.abs(s)) * 0.6);
        return c;
      },
      sway: [0, 0, 0, 0],
      extra: [0, 0.62, 0.35, 0.25],
    });
  }
  // rest the curled leaves on the substrate (lift the lowest point to it) and, if the curl stands taller than
  // the item, flatten the curl a little — never clamp individual vertices (that pressed the edges into plates)
  const bb = b.bbox();
  const lift = 0.0006 - bb.min[1];
  const top = bb.max[1] + lift;
  const sy = top > h ? (h - 0.0006) / (top - 0.0006) : 1;
  b.mapPositions(([x, y, z]) => [x, 0.0006 + (y + lift - 0.0006) * sy, z]);
}

function marimo(b: GeoBuilder, def: DecorDef, seed: number, lod: number): void {
  const r = prng(seed);
  const n = noise3(seed);
  const { h } = def.size;
  const R = h * 0.47;
  const c0 = hex('#1d4a22');
  const c1 = hex('#3f7a38');
  blob(
    b,
    lod === 0 ? 8 : 3,
    (dir) => {
      const k = 1 + 0.03 * n(dir[0] * 4, dir[1] * 4, dir[2] * 4);
      return [dir[0] * R * 0.92 * k, R + dir[1] * R * 0.88 * k, dir[2] * R * 0.92 * k];
    },
    (p) => mix(c0, c1, 0.4 + 0.5 * n(p[0] * 200, p[1] * 200, p[2] * 200)),
    { extra: () => [0, 0.9, 0.2, 1.6] },
  );
  const fuzz = lod === 0 ? 700 : lod === 1 ? 200 : 0;
  for (let i = 0; i < fuzz; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dir: V3 = [s * Math.cos(th), u, s * Math.sin(th)];
    if (u < -0.7) continue;
    const base: V3 = [dir[0] * R * 0.9, R + dir[1] * R * 0.86, dir[2] * R * 0.9];
    const out = norm(add(dir, [r.range(-0.4, 0.4), r.range(-0.4, 0.4), r.range(-0.4, 0.4)]));
    leaf(b, {
      base,
      yaw: Math.atan2(-out[2], out[0]),
      pitch: Math.asin(clamp(out[1], -1, 1)),
      length: r.range(0.0018, 0.0032),
      width: 0.0008,
      shape: 'needle',
      segL: 2,
      segW: 1,
      color: () => jitter(mix(c0, c1, 0.6 + r() * 0.4), r, 0.1),
      sway: [0, 0, 0, 0],
      extra: [0, 0.9, 0.2, 0.3],
    });
  }
}

export function genPlant(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const b = out.foliage;
  switch (def.visual) {
    case 'plant_java_fern':
      return javaFern(b, def, seed, lod);
    case 'plant_anubias':
      return anubias(b, def, seed, lod);
    case 'plant_moss':
      return moss(b, def, seed, lod);
    case 'plant_sword':
      return sword(b, def, seed, lod);
    case 'plant_crypt':
      return crypt(b, def, seed, lod);
    case 'plant_vallisneria':
      return vallisneria(b, def, seed, lod);
    case 'plant_water_sprite':
      return waterSprite(b, def, seed, lod);
    case 'plant_rotala':
      return stems(b, def, seed, lod, 'rotala');
    case 'plant_ludwigia':
      return stems(b, def, seed, lod, 'ludwigia');
    case 'plant_monte_carlo':
      return monteCarlo(b, def, seed, lod);
    case 'plant_hairgrass':
      return hairgrass(b, def, seed, lod);
    case 'plant_floating':
      return floating(b, def, seed, lod);
    case 'botanical_almond_leaf':
      return almondLeaf(b, def, seed, lod);
    case 'plant_marimo':
      return marimo(b, def, seed, lod);
  }
}
