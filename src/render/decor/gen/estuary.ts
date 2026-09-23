/**
 * Estuary decor (lane brackish): a red-mangrove prop-root tangle, a cemented oyster-shell cluster, water-worn
 * estuary pebbles and an emergent mangrove seedling. Same conventions as the other generators: decor-local metres,
 * base at y = 0, everything inside def.size, and every anchor backed by real geometry (arches over the cave and nest
 * site, arch tops at the perches, a knee root under the resting spot, shells leaning into spawning caves).
 */
import { GeoBuilder, tube, smoothPath, blob, leaf, lathe, weightFromHeight, add, sub, scl, norm, len, cross, dot, lerp3, type V3, type Sway, type Extra, NO_SWAY } from './builder';
import { prng, noise3, fbm3, hex, mix, mul, clamp, smooth, type RGB, type PRng, type Noise3 } from './noise';
import type { DecorBuild } from './rocks';
import type { DecorDef } from '@/types';

/** Visual keys this module draws (routed before the prefix generators in ./index.ts). */
export const ESTUARY_VISUALS = new Set(['wood_mangrove', 'ornament_oyster_cluster', 'rock_estuary_pebbles', 'plant_mangrove']);

const Y: V3 = [0, 1, 0];

/** Map vertices from `from` out of a local frame (X, Y, X×Y) at `origin` into decor space. */
function toFrame(b: GeoBuilder, from: number, origin: V3, X: V3, Yv: V3): void {
  const x = norm(X);
  const yy = norm(sub(Yv, scl(x, dot(Yv, x))));
  const z = cross(x, yy);
  b.mapPositions(([a, c, e]) => [origin[0] + x[0] * a + yy[0] * c + z[0] * e, origin[1] + x[1] * a + yy[1] * c + z[1] * e, origin[2] + x[2] * a + yy[2] * c + z[2] * e], from);
}

/** Triangle wound so its face normal points along `want` (FrontSide materials). */
function otri(b: GeoBuilder, i: number, j: number, k: number, want: V3): void {
  const p = b.pos;
  const u: V3 = [p[j * 3] - p[i * 3], p[j * 3 + 1] - p[i * 3 + 1], p[j * 3 + 2] - p[i * 3 + 2]];
  const v: V3 = [p[k * 3] - p[i * 3], p[k * 3 + 1] - p[i * 3 + 1], p[k * 3 + 2] - p[i * 3 + 2]];
  if (dot(cross(u, v), want) >= 0) b.tri(i, j, k);
  else b.tri(i, k, j);
}

// ───────────────────────────── mangrove prop roots ─────────────────────────────

const BARK = {
  base: hex('#54463b'),
  light: hex('#7d6c5b'),
  dark: hex('#2b231c'),
  lenticel: hex('#cfc3aa'),
  mud: hex('#3f3529'),
  silt: hex('#8f7f62'),
  algae: hex('#66703f'),
  tip: hex('#c9b494'),
};
const BARK_EXTRA: Extra = [0, 0.64, 0.32, 1.6];

interface Root {
  pts: V3[];
  r0: number;
  r1: number;
  /** Radius swell where the root plunges into the sand (0 = none). */
  flare?: number;
  /** Swell where it leaves its parent (blends the junction). */
  collar?: number;
  tip?: 'round' | 'pale';
  /** Custom radius profile (overrides r0 → r1 + collar/flare). */
  rad?: (t: number) => number;
  /** Starts buried inside its parent: no start cap (a cap disc could catch the light where it grazes the bark). */
  open?: boolean;
}

function rootRadius(root: Root, t: number): number {
  if (root.rad) return root.rad(t);
  let r = (root.r0 + (root.r1 - root.r0) * Math.pow(t, 0.85)) * (1 + 0.07 * Math.sin(t * 17 + root.r0 * 4000) * Math.sin(t * 7.3 + 1));
  if (root.collar) r *= 1 + root.collar * smooth(0.14, 0, t);
  if (root.flare) r *= 1 + root.flare * smooth(0.82, 1, t);
  return r;
}

function pathLength(pts: V3[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += len(sub(pts[i], pts[i - 1]));
  return l;
}

function barkTube(b: GeoBuilder, root: Root, n: Noise3, lod: number, seedOff: number): void {
  const L = pathLength(root.pts);
  const segs = lod === 0 ? Math.max(8, Math.round(L / 0.0055)) : lod === 1 ? Math.max(5, Math.round(L / 0.014)) : Math.max(3, Math.round(L / 0.04));
  const path = smoothPath(root.pts, segs);
  const radial = lod === 0 ? (root.r0 > 0.009 ? 14 : root.r0 > 0.004 ? 10 : 6) : lod === 1 ? (root.r0 > 0.004 ? 6 : 4) : 4;
  const radius = (t: number) => rootRadius(root, t);
  tube(b, path, {
    radial,
    radius,
    displace: (t, th, p) => {
      const rr = radius(t);
      // shallow longitudinal fissures, faint growth rings and a few knobbly lenticel bumps
      const fiss = Math.sin(th * 6 + n(p[0] * 45, p[1] * 45, seedOff) * 3.2);
      const ring = Math.sin(t * L * 1050 + n(p[0] * 20, p[2] * 20, seedOff + 3) * 2);
      const knob = Math.max(0, n(p[0] * 70 + seedOff, p[1] * 70, p[2] * 70) - 0.6) * 1.4;
      const k = root.r0 > 0.012 ? 0.45 : 1;
      return rr * (fiss * 0.05 * k + ring * 0.028 * k + knob * 0.12 * k + 0.035 * n(p[0] * 110, p[1] * 110, p[2] * 110 + th));
    },
    color: (t, th, p) => {
      const f = fbm3(n, p[0] * 26, p[1] * 26, p[2] * 26 + seedOff, 3);
      let c = mix(BARK.base, BARK.light, clamp(0.45 + f * 0.6));
      const fiss = 0.5 + 0.5 * Math.sin(th * 6 + n(p[0] * 45, p[1] * 45, seedOff) * 3.2);
      c = mix(c, BARK.dark, smooth(0.7, 1, fiss) * 0.26);
      c = mix(c, BARK.dark, smooth(0.8, 1, 0.5 + 0.5 * Math.sin(t * L * 1050)) * 0.08);
      // pale corky lenticels speckle the bark
      c = mix(c, BARK.lenticel, smooth(0.68, 0.86, n(p[0] * 240, p[1] * 240, p[2] * 240)) * 0.34);
      // a soft green film on the upper roots, dark wet mud where they plunge into the bed
      c = mix(c, BARK.algae, smooth(0.25, 0.75, n(p[0] * 11 + 5, p[1] * 11, p[2] * 11)) * smooth(0.03, 0.12, p[1]) * 0.28);
      c = mix(c, BARK.mud, smooth(0.03, 0.01, p[1]) * 0.5);
      c = mix(c, BARK.silt, smooth(0.012, -0.004, p[1]) * 0.75); // silt-dusted where it enters the bed
      if (root.tip === 'pale') c = mix(c, BARK.tip, smooth(0.8, 1, t) * 0.8);
      return c;
    },
    extra: () => BARK_EXTRA,
    capStart: !root.open,
    capEnd: 'round',
    twist: seedOff,
  });
}

/** A small acorn barnacle (dead, bleached) sitting on a root surface. */
function barnacle(b: GeoBuilder, r: PRng, at: V3, normal: V3, size: number, lod: number): void {
  const from = b.count;
  const plate = hex(r.pick(['#b9b1a1', '#aaa191', '#c4bcac']));
  const hole = hex('#7a7064');
  const h = size * r.range(0.7, 1);
  lathe(
    b,
    [
      [size, -0.0004],
      [size * 0.92, h * 0.35],
      [size * 0.62, h * 0.85],
      [size * 0.42, h],
      [size * 0.3, h * 0.82],
      [0, h * 0.55],
    ],
    lod === 0 ? 9 : 5,
    (t, a) => (t > 0.72 ? hole : mul(plate, 0.82 + 0.18 * Math.abs(Math.sin(a * 3)))),
    [0, 0.8, 0.25, 1.1],
    (a, t) => (t < 0.7 ? 0.08 * Math.sin(a * 6) : 0),
  );
  const side = norm(cross(normal, Math.abs(normal[1]) < 0.9 ? Y : ([1, 0, 0] as V3)));
  // lathe builds around +Y: remap local (x, y, z) → side·x + normal·y + (side×normal)·z
  toFrame(b, from, at, side, normal);
}

function genMangrove(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const b = out.solid;
  const n = noise3(seed);
  const { w, d, h } = def.size;
  const hx = w / 2;
  const hz = d / 2;
  const anchor = (kind: string, i = 0) => def.anchors.filter((a) => a.kind === kind)[i]?.offset as V3 | undefined;
  const rt = prng(seed);

  // ── the crown: a red mangrove's trunk stands on its prop roots, with open water under it ──
  const collarY = h * 0.4;
  const top = h * rt.range(0.84, 0.88);
  const lean: V3 = [rt.range(-0.006, 0.006), 0, rt.range(-0.004, 0.003)];
  const trunkAt = (y: number): V3 => {
    const k = clamp((y - collarY) / (top - collarY));
    return [lean[0] * k * k + 0.0022 * n(y * 25, 1, seed * 0.01), y, lean[2] * k * k + 0.0022 * n(y * 25, 4, seed * 0.01)];
  };
  const trunkR = (y: number) => 0.0205 + (0.0135 - 0.0205) * clamp((y - collarY) / (top - collarY));
  const trunkPts: V3[] = [];
  const y0 = collarY - 0.008;
  for (let i = 0; i <= 8; i++) trunkPts.push(trunkAt(y0 + ((top - y0) * i) / 8));
  // a rounded root collar underneath, then a gentle taper up to the weathered top
  // a rounded root collar underneath; at the top it narrows away into the limbs (no stump end showing)
  const trunk: Root = { pts: trunkPts, r0: 0.0205, r1: 0.0135, rad: (t) => (0.0205 + (0.0135 - 0.0205) * t) * (0.45 + 0.55 * smooth(0, 0.12, t)) * (1 - 0.55 * smooth(0.82, 1, t)) };
  // the crown splits into a few limbs reaching up toward the surface (the living tree carries on above the water)
  const stubs: Root[] = [];
  const limbs = lod === 2 ? 2 : 3;
  const limbYaw = rt.range(0, Math.PI * 2);
  for (let i = 0; i < limbs; i++) {
    const s = prng(seed + 900 + i);
    const ys = top - s.range(0.008, 0.024);
    const at = trunkAt(ys);
    const yaw = limbYaw + (i / limbs) * Math.PI * 2 + s.range(-0.4, 0.4);
    const out = s.range(0.35, 0.8);
    const dir: V3 = norm([Math.cos(yaw) * out, 1, Math.sin(yaw) * out * 0.7]);
    const L = Math.min(s.range(0.045, 0.075), (h - 0.006 - ys) / Math.max(0.3, dir[1]));
    const mid = add(add(at, scl(dir, L * 0.5)), [s.range(-0.005, 0.005), 0, s.range(-0.004, 0.004)]);
    const tip = add(at, scl(norm([dir[0] * 1.3, dir[1], dir[2] * 1.3]), L));
    stubs.push({ pts: [at, mid, [tip[0], Math.min(tip[1], h - 0.006), tip[2]]], r0: 0.0092, r1: 0.0021 });
  }

  // keep the bark (radius + relief) inside the footprint
  const inXZ = (p: V3, r0: number): V3 => {
    const m = r0 * 1.35 + 0.0015;
    return [clamp(p[0], -hx + m, hx - m), p[1], clamp(p[2], -hz + m, hz - m)];
  };
  /** Spring point on the trunk (slightly inside it), facing `toward`. */
  const spring = (toward: V3, ys: number): V3 => {
    const c = trunkAt(ys);
    const dir = norm([toward[0] - c[0], 0, toward[2] - c[2]]);
    return add(c, scl(dir, trunkR(ys) * 0.08));
  };
  /**
   * A prop root: leaves the trunk at `ys`, crests at `hump` (path centre — an anchor minus the root radius when a
   * perch rides on it), then bows down and plunges into the sand at `land`. Catmull-Rom passes through the control
   * points, so the crest sits exactly under its anchor.
   */
  const arch = (ys: number, hump: V3, land: V3, r0: number, s: PRng): V3[] => {
    const S = spring(hump, ys);
    const A = inXZ(hump, r0);
    const Lp = inXZ([land[0], -0.009, land[2]], r0 * 1.25);
    const toA = sub(A, S);
    const e1: V3 = add(S, [toA[0] * 0.5, 0, toA[2] * 0.5]);
    e1[1] = ys + (A[1] - ys) * 0.8;
    const toL = sub(Lp, A);
    const side = norm(cross([toL[0], 0, toL[2]], Y));
    const wob = (k: number) => scl(side, s.range(-1, 1) * 0.005 * k);
    const d1: V3 = add(add(A, [toL[0] * 0.36, 0, toL[2] * 0.36]), wob(0.8));
    d1[1] = A[1] * 0.8;
    const d2: V3 = add(add(A, [toL[0] * 0.72, 0, toL[2] * 0.72]), wob(1));
    d2[1] = A[1] * 0.42;
    const d3: V3 = add(A, [toL[0] * 0.93, 0, toL[2] * 0.93]);
    d3[1] = A[1] * 0.1;
    return [S, e1, A, d1, d2, d3, Lp].map((p) => inXZ(p, r0));
  };
  const lift = (p: V3, r: number): V3 => [p[0], p[1] - r, p[2]];
  const rootR = (s: PRng, k = 1) => ({ r0: s.range(0.0074, 0.0086) * k, r1: s.range(0.0052, 0.0058) * k });
  /** A generic prop root toward azimuth `ang`, springing at `ys`, landing at fraction `reach` of the footprint. */
  const prop = (ang: number, ys: number, reach: number, rise: number, s: PRng, k = 1): Root => {
    const { r0, r1 } = rootR(s, k);
    const land: V3 = [Math.cos(ang) * hx * reach, 0, Math.sin(ang) * hz * reach];
    const S = trunkAt(ys);
    const hump: V3 = [S[0] + (land[0] - S[0]) * 0.34, ys + rise, S[2] + (land[2] - S[2]) * 0.34];
    return { pts: arch(ys, hump, land, r0, s), r0, r1, flare: 0.3, collar: 0.25 };
  };
  /** A knee: a root looping up out of the mud and back in, low over a nook (cave, nest site, resting ledge). */
  const knee = (over: V3, clear: number, span: number, along: V3, r0: number): Root => {
    const c: V3 = [over[0], over[1] + clear + r0, over[2]];
    const a0 = inXZ([c[0] - along[0] * span, -0.009, c[2] - along[2] * span], r0);
    const a3 = inXZ([c[0] + along[0] * span, -0.009, c[2] + along[2] * span], r0);
    const s = prng(Math.round(over[0] * 1e4) * 31 + Math.round(over[2] * 1e4) + seed);
    const side = norm(cross(along, Y));
    const w1 = scl(side, s.range(-0.006, 0.006));
    const w2 = scl(side, s.range(-0.006, 0.006));
    const k1 = inXZ(add([c[0] - along[0] * span * 0.6, c[1] * s.range(0.62, 0.8), c[2] - along[2] * span * 0.6], w1), r0);
    const k2 = inXZ(add([c[0] + along[0] * span * 0.62, c[1] * s.range(0.55, 0.74), c[2] + along[2] * span * 0.62], w2), r0);
    const toTrunk = norm([-c[0], 0, -c[2]]);
    const crest = inXZ(add(add(c, scl(along, span * s.range(-0.15, 0.15))), scl(toTrunk, 0.008)), r0);
    return { pts: [a0, k1, crest, k2, a3], r0, r1: r0 * s.range(0.8, 0.95), flare: 0.3, collar: 0.3 };
  };

  const cave = anchor('cave') ?? [0.045, 0.012, 0.055];
  const nest = anchor('nest_site') ?? [-0.05, 0.012, 0.05];
  const perchA = anchor('perch', 0) ?? [0.07, 0.178, 0.018];
  const perchB = anchor('perch', 1) ?? [-0.065, 0.168, -0.028];
  const hide = anchor('hide') ?? [-0.09, 0.02, -0.01];
  const rest = anchor('rest') ?? [0.075, 0.035, -0.06];

  const roots: Root[] = [];
  // tall arches cresting at the two perches
  for (const [i, p, ys] of [
    [0, perchA, 0.162],
    [1, perchB, 0.152],
  ] as [number, V3, number][]) {
    const s = prng(seed + 11 + i * 31);
    const { r0, r1 } = rootR(s, 1.05);
    const dir = norm([p[0], 0, p[2]]);
    const land: V3 = [dir[0] * hx, 0, p[2] + dir[2] * 0.05 + s.range(-0.008, 0.008)];
    roots.push({ pts: arch(ys, lift(p, r0), land, r0, s), r0, r1, flare: 0.3, collar: 0.25 });
  }
  // the cage: prop roots all round, springing at different heights so the arches layer
  const specs: [number, number, number, number, number][] = [
    // azimuth (rad, +z = front), spring height (m), reach (0..1 of the footprint), crest rise (m), lod needed
    [0.8, 0.176, 0.92, 0.01, 1],
    [2.3, 0.186, 0.9, 0.01, 1],
    [-1.6, 0.168, 0.95, 0.01, 1],
    [-2.55, 0.118, 0.9, 0.008, 2],
    [-0.55, 0.112, 0.88, 0.008, 2],
    [1.55, 0.128, 0.8, 0.014, 0],
    [Math.PI + 0.12, 0.104, 0.9, 0.006, 0],
  ];
  specs.forEach(([ang, ys, reach, rise, need], i) => {
    if (lod > need) return;
    const s = prng(seed + 101 + i * 13);
    roots.push(prop(ang + s.range(-0.12, 0.12), ys + s.range(-0.006, 0.006), reach, rise, s, i >= 5 ? 0.88 : 1));
  });
  // knees: low loops roofing the spawning cave, the nest site and the resting ledge
  const knees: Root[] = [];
  knees.push(knee(cave, 0.026, 0.05, norm([1, 0, -0.25]), 0.0064));
  knees.push(knee(nest, 0.025, 0.048, norm([1, 0, 0.3]), 0.0062));
  if (lod < 2) knees.push(knee(rest, 0, 0.054, norm([1, 0, 0.4]), 0.0058));
  // a low root sweeping over the hiding hollow on the left
  if (lod < 2) {
    const s = prng(seed + 133);
    const { r0, r1 } = rootR(s, 0.9);
    const dir = norm([hide[0], 0, hide[2]]);
    const hump: V3 = [hide[0] - dir[0] * 0.035, hide[1] + 0.06, hide[2] - dir[2] * 0.035];
    roots.push({ pts: arch(0.108, hump, [hide[0] + dir[0] * 0.05, 0, hide[2] + dir[2] * 0.05 + 0.014], r0, s), r0, r1, flare: 0.3, collar: 0.25 });
  }
  // secondary roots forking off two arches on their way down
  if (lod === 0) {
    for (let i = 0; i < 2; i++) {
      const parent = roots[i + 2];
      const s = prng(seed + 251 + i * 7);
      const from = parent.pts[3];
      const inside = lerp3(parent.pts[2], from, 0.55);
      const out = norm([from[0], 0, from[2]]);
      const turn = s.range(0.45, 0.8) * (i === 0 ? -1 : 1);
      const dir: V3 = [out[0] * Math.cos(turn) - out[2] * Math.sin(turn), 0, out[0] * Math.sin(turn) + out[2] * Math.cos(turn)];
      const r0 = 0.0042;
      const m1 = inXZ(add(from, [dir[0] * 0.022, -from[1] * 0.28, dir[2] * 0.022]), r0);
      const m2 = inXZ(add(from, [dir[0] * 0.036, -from[1] * 0.72, dir[2] * 0.036]), r0);
      const land = inXZ(add(from, [dir[0] * 0.042, -from[1] - 0.009, dir[2] * 0.042]), r0);
      roots.push({ pts: [inside, from, m1, m2, land], r0, r1: 0.0036, flare: 0.32, open: true });
    }
  }
  // aerial drop roots from the crown: thin, pale-tipped; one has reached the sand, the others still hang
  const aerial: Root[] = [];
  if (lod === 0) {
    const angs = roots.map((rr) => Math.atan2(rr.pts[1][2], rr.pts[1][0])).sort((a1, a2) => a1 - a2);
    const gaps = angs.map((a1, i) => {
      const a2 = i + 1 < angs.length ? angs[i + 1] : angs[0] + Math.PI * 2;
      return { mid: (a1 + a2) / 2, size: a2 - a1 };
    });
    gaps.sort((g1, g2) => g2.size - g1.size);
    for (let i = 0; i < 3; i++) {
      const s = prng(seed + 307 + i * 13);
      const ys = top - s.range(0.02, 0.06);
      const ang = (gaps[i % Math.max(1, gaps.length)]?.mid ?? s.range(0, Math.PI * 2)) + s.range(-0.08, 0.08);
      const c = trunkAt(ys);
      const off = trunkR(ys) * 0.85;
      const at: V3 = [c[0] + Math.cos(ang) * off, ys, c[2] + Math.sin(ang) * off];
      const reach = i === 0 ? 1 : s.range(0.35, 0.6);
      const bottom = reach >= 1 ? -0.009 : ys * (1 - reach);
      const drift: V3 = [Math.cos(ang) * s.range(0.012, 0.03), 0, Math.sin(ang) * s.range(0.008, 0.02)];
      const pts: V3[] = [];
      for (let j = 0; j <= 4; j++) {
        const f = j / 4;
        pts.push(inXZ([at[0] + drift[0] * Math.sqrt(f) + s.range(-0.002, 0.002) * f, at[1] + (bottom - at[1]) * f, at[2] + drift[2] * Math.sqrt(f)], 0.003));
      }
      aerial.push({ pts, r0: 0.0027, r1: 0.0019, tip: reach >= 1 ? undefined : 'pale', collar: 0.35, flare: reach >= 1 ? 0.3 : 0 });
    }
  }

  barkTube(b, trunk, n, lod, seed * 0.001);
  stubs.forEach((st, i) => barkTube(b, { ...st, pts: st.pts.map((p) => inXZ(p, st.r0)) }, n, lod, 3.1 + i));
  roots.forEach((rr, i) => barkTube(b, rr, n, lod, i * 1.7 + 0.4));
  knees.forEach((rr, i) => barkTube(b, rr, n, lod, i * 2.9 + 5));
  aerial.forEach((rr, i) => barkTube(b, rr, n, lod, i * 2.3 + 9));

  // a few small clusters of bleached barnacles low on the roots (relics of the tide line)
  if (lod === 0) {
    const s = prng(seed + 401);
    const hosts = [...roots, ...knees];
    let clusters = 0;
    for (let tries = 0; tries < 60 && clusters < 5; tries++) {
      const host = hosts[s.int(0, hosts.length - 1)];
      const path = smoothPath(host.pts, 28);
      const i = s.int(2, path.length - 3);
      if (path[i][1] < 0.004 || path[i][1] > 0.028) continue;
      const T = norm(sub(path[i + 1], path[i - 1]));
      const base: V3 = [s.range(-1, 1), s.range(0, 1), s.range(-1, 1)];
      const count = s.int(2, 4);
      for (let k = 0; k < count; k++) {
        const j = Math.max(1, Math.min(path.length - 2, i + s.int(-1, 1)));
        const rnd: V3 = add(base, [s.range(-0.5, 0.5), s.range(-0.3, 0.3), s.range(-0.5, 0.5)]);
        const nrm = norm(sub(rnd, scl(T, dot(rnd, T))));
        const t = j / (path.length - 1);
        barnacle(b, s, add(path[j], scl(nrm, rootRadius(host, t) * 0.9)), nrm, s.range(0.0011, 0.0019), lod);
      }
      clusters++;
    }
  }
}

// ───────────────────────────── oyster shells ─────────────────────────────

const SHELL = {
  out: hex('#8a8783'),
  outLight: hex('#bcb7ae'),
  outDark: hex('#48423d'),
  streak: hex('#665066'),
  umbo: hex('#66563f'),
  algae: hex('#69724c'),
  inner: hex('#e7e2d7'),
  innerPink: hex('#e9dcd8'),
  scar: hex('#4d3a52'),
  margin: hex('#7b5d78'),
};

interface ValveSpec {
  len: number;
  wid: number;
  cup: number;
  thick: number;
  frill: number;
}

/**
 * One oyster valve as a closed thin shell: rough, frilly, streaked exterior (local −Y, convex), smooth porcelain
 * interior with a dark muscle scar (local +Y, concave), and a thin rim joining them. The hinge (umbo) sits at the
 * local origin; the valve extends along +X, width along Z.
 */
function oysterValve(b: GeoBuilder, v: ValveSpec, seed: number, lod: number): void {
  const n = noise3(seed);
  const K = lod === 0 ? 9 : lod === 1 ? 5 : 3;
  const J = lod === 0 ? 26 : lod === 1 ? 14 : 8;
  const cx = v.len * 0.56;
  const outline = (a: number): [number, number] => {
    const ca = Math.cos(a);
    const rx = ca > 0 ? v.len * 0.44 : cx;
    // narrow, beaked hinge end; broad rounded far end; irregular, lobed growth
    const narrow = 0.55 + 0.45 * smooth(-1, 0.3, ca);
    const lob = 1 + 0.11 * n(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.5) + 0.05 * n(Math.cos(a) * 3, Math.sin(a) * 3, 2.5);
    return [cx + ca * rx * lob, Math.sin(a) * (v.wid / 2) * narrow * lob];
  };
  const edgeWave = (a: number) => v.frill * (0.0008 * Math.sin(a * 9 + n(Math.cos(a), Math.sin(a), 7) * 3) + 0.0004 * Math.sin(a * 19 + 1.3));
  const base = (s: number, a: number): V3 => {
    const [ox, oz] = outline(a);
    const px = cx + (ox - cx) * s;
    const pz = oz * s;
    const cupY = -v.cup * (1 - s * s) * (0.84 - 0.16 * Math.cos(a));
    const ruffle = edgeWave(a) * smooth(0.55, 1, s);
    return [px, cupY + ruffle, pz];
  };
  // exterior growth lamellae: stepped concentric shelves (only ever downward, so the interior never pokes through)
  const steps = (s: number, a: number) => {
    const g = s * 7 + 0.6 * n(Math.cos(a) * 2, Math.sin(a) * 2, 11);
    const frac = g - Math.floor(g);
    return v.frill * 0.0013 * smooth(0.15, 1, s) * frac;
  };
  const sK = (k: number) => Math.pow(k / K, 0.85);
  const outRows: number[][] = [];
  const inRows: number[][] = [];
  const outExtra: Extra = [0, 0.74, 0.28, 1.5];
  const inExtra: Extra = [0, 0.22, 0.65, 0.12];
  const cOut = (s: number, a: number, p: V3): RGB => {
    const f = fbm3(n, p[0] * 160, p[1] * 160, p[2] * 160, 3);
    let c = mix(SHELL.out, SHELL.outLight, clamp(0.45 + f * 0.9));
    const streak = smooth(0.55, 1, 0.5 + 0.5 * Math.sin(a * 7 + n(Math.cos(a) * 2, Math.sin(a) * 2, 3) * 2.2));
    c = mix(c, SHELL.streak, streak * smooth(0.25, 0.7, s) * 0.5);
    // layered growth shelves: a shadowed groove under each weathered, paler lip
    const g = (s * 7 + 0.6 * n(Math.cos(a) * 2, Math.sin(a) * 2, 11)) % 1;
    c = mix(c, SHELL.outDark, smooth(0.35, 0.05, g) * 0.3);
    c = mix(c, SHELL.outLight, smooth(0.75, 0.98, g) * 0.35);
    c = mix(c, SHELL.umbo, smooth(-0.55, -0.95, Math.cos(a)) * smooth(0.45, 1, s) * 0.55);
    c = mix(c, SHELL.algae, smooth(0.35, 0.8, n(p[0] * 60, p[1] * 60, p[2] * 60 + 4)) * 0.14);
    return c;
  };
  const cIn = (s: number, a: number): RGB => {
    let c = mix(SHELL.inner, SHELL.innerPink, 0.35 + 0.35 * n(Math.cos(a), Math.sin(a), s * 3));
    // the dark adductor-muscle scar, set toward the far side of centre
    const [ox, oz] = outline(a);
    const px = cx + (ox - cx) * s;
    const pz = oz * s;
    const dx = (px - (cx + v.len * 0.08)) / (v.len * 0.11);
    const dz = (pz - v.wid * 0.08) / (v.wid * 0.14);
    c = mix(c, SHELL.scar, smooth(1, 0.55, dx * dx + dz * dz) * 0.85);
    c = mix(c, SHELL.margin, smooth(0.82, 0.98, s) * 0.55);
    return c;
  };
  const cO = b.v(add(base(0, 0), [0, -steps(0, 0), 0]), SHELL.out, NO_SWAY, [0, 0, 0], outExtra);
  const cI = b.v(add(base(0, 0), [0, v.thick, 0]), cIn(0, 0), NO_SWAY, [0, 0, 0], inExtra);
  for (let k = 1; k <= K; k++) {
    const s = sK(k);
    const ro: number[] = [];
    const ri: number[] = [];
    for (let j = 0; j < J; j++) {
      const a = (j / J) * Math.PI * 2;
      const p = base(s, a);
      const po: V3 = [p[0], p[1] - steps(s, a), p[2]];
      const pi: V3 = [p[0], p[1] + v.thick * (1 - 0.55 * s), p[2]];
      ro.push(b.v(po, cOut(s, a, po), NO_SWAY, [0, 0, 0], outExtra));
      ri.push(b.v(pi, cIn(s, a), NO_SWAY, [0, 0, 0], inExtra));
    }
    outRows.push(ro);
    inRows.push(ri);
  }
  const down: V3 = [0, -1, 0];
  const up: V3 = [0, 1, 0];
  for (let j = 0; j < J; j++) {
    const j2 = (j + 1) % J;
    otri(b, cO, outRows[0][j], outRows[0][j2], down);
    otri(b, cI, inRows[0][j], inRows[0][j2], up);
  }
  for (let k = 0; k < K - 1; k++)
    for (let j = 0; j < J; j++) {
      const j2 = (j + 1) % J;
      otri(b, outRows[k][j], outRows[k + 1][j], outRows[k + 1][j2], down);
      otri(b, outRows[k][j], outRows[k + 1][j2], outRows[k][j2], down);
      otri(b, inRows[k][j], inRows[k + 1][j], inRows[k + 1][j2], up);
      otri(b, inRows[k][j], inRows[k + 1][j2], inRows[k][j2], up);
    }
  // rim: a thin lip joining the two faces, facing outward
  const oR = outRows[K - 1];
  const iR = inRows[K - 1];
  for (let j = 0; j < J; j++) {
    const j2 = (j + 1) % J;
    const a = ((j + 0.5) / J) * Math.PI * 2;
    const [ox, oz] = outline(a);
    const outward = norm([ox - cx, 0, oz]);
    otri(b, oR[j], oR[j2], iR[j2], outward);
    otri(b, oR[j], iR[j2], iR[j], outward);
  }
}

/** The lumpy bed of cemented shell hash the living cluster grew on. */
function shellHash(b: GeoBuilder, seed: number, center: V3, size: V3, lod: number): void {
  const n = noise3(seed);
  blob(
    b,
    lod === 0 ? 4 : lod === 1 ? 3 : 2,
    (q) => {
      const k = 1 + 0.16 * fbm3(n, q[0] * 2.2, q[1] * 2.2, q[2] * 2.2, 3) + 0.05 * n(q[0] * 9, q[1] * 9, q[2] * 9);
      let y = q[1] * size[1] * k;
      if (y < -size[1] * 0.3) y = -size[1] * 0.3 + (y + size[1] * 0.3) * 0.2;
      return [center[0] + q[0] * size[0] * k, center[1] + y, center[2] + q[2] * size[2] * k];
    },
    (p) => {
      const f = fbm3(n, p[0] * 140, p[1] * 140, p[2] * 140, 3);
      let c = mix(SHELL.out, SHELL.outLight, clamp(0.4 + f));
      c = mix(c, SHELL.inner, smooth(0.55, 0.8, n(p[0] * 420, p[1] * 420, p[2] * 420)) * 0.55); // broken shell flecks
      c = mix(c, SHELL.streak, smooth(0.4, 0.8, n(p[0] * 90 + 3, p[1] * 90, p[2] * 90)) * 0.3);
      c = mix(c, SHELL.algae, smooth(0.3, 0.8, n(p[0] * 50, p[1] * 50 + 9, p[2] * 50)) * 0.25);
      return mul(c, 0.72 + 0.28 * smooth(center[1] - size[1] * 0.3, center[1] + size[1], p[1]));
    },
    { extra: () => [0, 0.8, 0.25, 1.7] },
  );
}

function genOysters(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const b = out.solid;
  const r = prng(seed);
  const anchor = (kind: string, fb: V3) => (def.anchors.find((a) => a.kind === kind)?.offset as V3 | undefined) ?? fb;
  const cave = anchor('cave', [0.012, 0.012, 0.022]);
  const nest = anchor('nest_site', [-0.03, 0.01, 0.0]);
  const hide = anchor('hide', [0.04, 0.009, -0.027]);
  const graze = anchor('graze', [0.012, 0.04, 0.022]);
  // chunky, deeply cupped valves: oysters are thick-shelled and roundish, not paper-thin
  const spec = (len: number, s: PRng): ValveSpec => ({ len, wid: len * s.range(0.72, 0.86), cup: len * s.range(0.2, 0.26), thick: 0.0032, frill: s.range(0.8, 1.2) });
  const place = (v: ValveSpec, sd: number, origin: V3, X: V3, Yv: V3) => {
    const from = b.count;
    oysterValve(b, v, sd, lod);
    toFrame(b, from, origin, X, Yv);
  };
  // cemented shell hash: the back wall of the cave and the body of the clump
  shellHash(b, seed + 50, [-0.012, 0.004, -0.018], [0.046, 0.017, 0.022], lod);
  if (lod < 2) shellHash(b, seed + 51, [0.034, 0.003, -0.012], [0.02, 0.011, 0.02], lod);
  // an A-frame of two valves leaning together, concave sides in: the spawning cave, walled at the back by the hash
  {
    const lean = 0.9 + r.range(-0.05, 0.05);
    const L = 0.046;
    const foot = L * Math.cos(lean) * 0.93; // the two crowns just meet over the middle
    place(spec(L, prng(seed + 2)), seed + 2, [cave[0] - foot - 0.002, -0.003, cave[2] - 0.004], [Math.cos(lean), Math.sin(lean), 0], [Math.sin(lean), -Math.cos(lean), 0]);
    place(spec(L * 0.96, prng(seed + 3)), seed + 3, [cave[0] + foot + 0.002, -0.003, cave[2] - 0.002], [-Math.cos(lean), Math.sin(lean), 0], [-Math.sin(lean), -Math.cos(lean), 0]);
  }
  // a domed valve (concave side down) propped on the hash: the roof of the nest crevice
  place({ ...spec(0.05, prng(seed + 4)), cup: 0.011 }, seed + 4, [nest[0] - 0.022, 0.008, nest[2] - 0.004], norm([1, 0.22, 0.24]), norm([0.18, -1, 0.05]));
  // a gaping pair at the back right: a hiding slot between the valves
  {
    const dir = norm([0.9, 0, -0.44]);
    const org: V3 = [hide[0] - dir[0] * 0.024, 0.003, hide[2] - dir[2] * 0.024];
    place(spec(0.042, prng(seed + 6)), seed + 6, org, dir, [0, 1, 0]);
    const gape = 0.42 + r.range(-0.05, 0.06);
    const Xu: V3 = norm([dir[0] * Math.cos(gape), Math.sin(gape), dir[2] * Math.cos(gape)]);
    const down: V3 = [0, -1, 0];
    const Yu = norm(sub(down, scl(Xu, dot(down, Xu))));
    place({ ...spec(0.04, prng(seed + 7)), cup: 0.004 }, seed + 7, add(org, [0, 0.005, 0]), Xu, Yu);
  }
  // valves cemented on top of the clump (the grazing spot on the ridge) and one lying in front
  place(spec(0.03, prng(seed + 8)), seed + 8, [graze[0] - 0.014, graze[1] - 0.008, graze[2] - 0.004], norm([1, -0.12, -0.1]), norm([0.1, 1, 0.15]));
  if (lod < 2) {
    place(spec(0.036, prng(seed + 9)), seed + 9, [-0.05, 0.012, -0.03], norm([0.9, 0.25, 0.35]), norm([-0.2, 1, 0.1]));
    place(spec(0.026, prng(seed + 12)), seed + 12, [cave[0] + 0.03, 0.004, cave[2] - 0.02], norm([0.35, 0.12, 0.94]), norm([-0.25, 1, 0]));
  }
  if (lod === 0) {
    place(spec(0.032, prng(seed + 10)), seed + 10, [-0.03, 0.018, -0.038], norm([0.7, 0.35, 0.55]), norm([-0.3, 1, 0.3]));
    place(spec(0.024, prng(seed + 11)), seed + 11, [0.01, 0.017, -0.034], norm([-0.4, 0.3, 0.85]), norm([0.2, 1, -0.2]));
  }
}

// ───────────────────────────── estuary pebbles ─────────────────────────────

const PEBBLE_PAL: [RGB, RGB][] = [
  [hex('#b7a386'), hex('#d8c9ae')], // warm tan
  [hex('#8d8981'), hex('#b8b3a8')], // grey
  [hex('#7a7960'), hex('#a19f86')], // olive
  [hex('#8a6b4f'), hex('#b18f6f')], // rusty brown
  [hex('#6e6b66'), hex('#94918a')], // dark basalt grey
];

function genPebbles(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const b = out.solid;
  const r = prng(seed);
  const { w, d, h } = def.size;
  const graze = (def.anchors.find((a) => a.kind === 'graze')?.offset as V3 | undefined) ?? [0.012, 0.02, 0.0];
  const rest = (def.anchors.find((a) => a.kind === 'rest')?.offset as V3 | undefined) ?? [-0.035, 0.016, 0.012];
  const count = lod === 0 ? r.int(10, 13) : lod === 1 ? 7 : 4;
  const placed: { x: number; z: number; a: number }[] = [];
  for (let i = 0; i < count; i++) {
    const s = prng(seed + 17 + i * 29);
    // size: a few big stones, many small ones (water sorts gravel by size)
    let a = i === 0 ? 0.022 : i === 1 ? 0.019 : 0.0065 + 0.012 * Math.pow(s(), 1.8);
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 40 && !ok; tries++) {
      if (i === 0) [x, z] = [graze[0], graze[2]];
      else if (i === 1) [x, z] = [rest[0], rest[2]];
      else {
        // a loose drift: denser toward the middle, trailing off at the ends
        x = s.gauss() * w * 0.2;
        z = s.gauss() * d * 0.2;
      }
      x = clamp(x, -w / 2 + a * 1.15, w / 2 - a * 1.15);
      z = clamp(z, -d / 2 + a * 0.95, d / 2 - a * 0.95);
      ok = placed.every((p) => Math.hypot(p.x - x, p.z - z) > (p.a + a) * 0.82);
      if (!ok && tries > 20) a *= 0.92;
    }
    if (!ok) continue;
    placed.push({ x, z, a });
    const n = noise3(seed + i * 7);
    const flat = i === 1 ? 0.36 : s.range(0.42, 0.62);
    const ry = Math.min(a * flat, h * 0.55);
    const rz = a * s.range(0.68, 0.92);
    const yaw = s.range(0, Math.PI * 2);
    const tilt = s.range(-0.12, 0.12);
    const [lo, hi] = PEBBLE_PAL[s.int(0, PEBBLE_PAL.length - 1)];
    const vein = s.chance(0.3);
    const veinN: V3 = norm([s.range(-1, 1), s.range(-0.3, 0.3), s.range(-1, 1)]);
    const bury = ry * 0.3;
    const cy = ry - bury;
    const cyaw = Math.cos(yaw);
    const syaw = Math.sin(yaw);
    blob(
      b,
      lod === 0 ? (a > 0.014 ? 3 : 2) : lod === 1 ? 2 : 1,
      (q) => {
        const k = 1 + 0.05 * fbm3(n, q[0] * 1.3, q[1] * 1.3, q[2] * 1.3, 2);
        const px = q[0] * a * k;
        let py = q[1] * ry * k;
        const pz = q[2] * rz * k;
        if (py < -ry * 0.45) py = -ry * 0.45 + (py + ry * 0.45) * 0.4; // a flatter, bedded underside
        // tilt about x, then yaw, then place
        const y1 = py * Math.cos(tilt) - pz * Math.sin(tilt);
        const z1 = py * Math.sin(tilt) + pz * Math.cos(tilt);
        return [x + px * cyaw + z1 * syaw, cy + y1, z - px * syaw + z1 * cyaw];
      },
      (p, dir) => {
        const f = fbm3(n, p[0] * 190, p[1] * 190, p[2] * 190, 3);
        let c = mix(lo, hi, clamp(0.45 + f * 0.9));
        c = mix(c, mul(lo, 0.8), smooth(0.3, 0.8, n(p[0] * 520, p[1] * 520, p[2] * 520)) * 0.18); // fine grain speckle
        if (vein) {
          const dv = Math.abs(dot(dir, veinN) + 0.1 * n(dir[0] * 3, dir[1] * 3, dir[2] * 3));
          c = mix(c, hex('#e8e2d4'), smooth(0.09, 0.03, dv) * 0.75);
        }
        c = mul(c, 0.66 + 0.34 * smooth(-0.6, 0.35, dir[1])); // contact shadow toward the bed
        return c;
      },
      { extra: () => [0, 0.3, 0.55, 0.3] },
    );
  }
}

// ───────────────────────────── mangrove seedling ─────────────────────────────

function sw(phase: number, flex: number, birth: number): Sway {
  return [0, phase, flex, birth];
}

function genSeedling(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  const b = out.foliage;
  const r = prng(seed);
  const n = noise3(seed);
  const { h } = def.size;
  const hypTop = h * 0.62;
  const topNode = h * 0.84;
  const bend: V3 = [r.range(-0.007, 0.007), 0, r.range(-0.005, 0.005)];
  const axis = (y: number): V3 => {
    const k = y / h;
    return [bend[0] * Math.sin(k * Math.PI * 0.9) * 1.4, y, bend[2] * Math.sin(k * Math.PI * 0.9) * 1.4];
  };
  const hypGreen = hex('#5d6d2e');
  const hypBrown = hex('#4f3a24');
  const lent = hex('#b4ab7c');
  // the propagule (hypocotyl): a long cigar-shaped green-brown "pencil", thickest in its lower third, pushed into the bed
  const hyp: V3[] = [];
  for (let i = 0; i <= 6; i++) hyp.push(axis(-0.014 + ((hypTop + 0.014) * i) / 6));
  tube(b, smoothPath(hyp, lod === 0 ? 22 : 7), {
    radial: lod === 0 ? 10 : 5,
    radius: (t) => 0.0058 * (1 + 0.24 * Math.sin(Math.PI * clamp(t * 1.4))) * (1 - 0.28 * t) * (1 - 0.3 * smooth(0.94, 1, t)),
    color: (t, th, p) => {
      // brown, pointed radicle end in the mud; green toward the top where the shoot broke out
      let c = mix(hypBrown, hypGreen, smooth(0.05, 0.75, t) * 0.9 + 0.1 * n(p[0] * 80, p[1] * 30, 1));
      c = mix(c, lent, smooth(0.66, 0.84, n(p[0] * 380, p[1] * 380, p[2] * 380)) * 0.45);
      return mul(c, 0.86 + 0.14 * Math.sin(th));
    },
    extra: () => [0, 0.42, 0.5, 0.5],
    capStart: true,
  });
  // the cotyledon collar where the shoot broke out of the propagule
  const collar = axis(hypTop - 0.002);
  tube(b, [add(collar, [0, -0.003, 0]), add(collar, [0, 0.002, 0]), add(collar, [0, 0.005, 0])], {
    radial: lod === 0 ? 10 : 5,
    radius: (t) => 0.0046 * (1 - 0.35 * t),
    color: () => hex('#7a4a2c'),
    extra: () => [0, 0.5, 0.4, 0.6],
  });
  // the young green shoot
  const stem: V3[] = [];
  for (let i = 0; i <= 4; i++) stem.push(axis(hypTop + ((topNode + 0.012 - hypTop) * i) / 4));
  tube(b, smoothPath(stem, lod === 0 ? 12 : 5), {
    radial: lod === 0 ? 6 : 4,
    radius: (t) => 0.0029 * (1 - 0.25 * t),
    color: (t) => mix(hex('#55783a'), hex('#6f8a3a'), t),
    extra: () => [0, 0.4, 0.5, 0.2],
  });
  // terminal bud wrapped in a red stipule
  const tip = axis(topNode + 0.01);
  tube(b, [tip, add(tip, [0.0006, 0.008, 0]), add(tip, [0.001, 0.016, 0.0004])], {
    radial: lod === 0 ? 6 : 4,
    radius: (t) => 0.0023 * (1 - 0.4 * t),
    color: (t) => mix(hex('#8a3a2c'), hex('#c45a40'), t),
    extra: () => [0, 0.3, 0.6, 0.2],
    capEnd: 'point',
  });
  // opposite, decussate pairs of glossy, leathery elliptic leaves, crowded into a crown at the top of the shoot
  const nodes = lod === 0 ? 4 : lod === 1 ? 3 : 2;
  const leafRest = def.anchors.find((a) => a.kind === 'leaf_rest')?.offset as V3 | undefined;
  const yaw0 = r.range(0, Math.PI);
  const deep = hex('#1f421d');
  const mid = hex('#376a2b');
  const edge = hex('#6a8c38');
  const rib = hex('#9aae58');
  for (let k = 0; k < nodes; k++) {
    const f = k / Math.max(1, nodes - 1);
    const y = hypTop + (topNode - hypTop) * (0.2 + 0.8 * f);
    const base = axis(y);
    for (let side = 0; side < 2; side++) {
      let yaw = yaw0 + k * (Math.PI / 2) + side * Math.PI + r.range(-0.15, 0.15);
      let pitch = 0.34 + f * 0.55 + r.range(-0.07, 0.07);
      const L = 0.062 - f * 0.012 + r.range(-0.003, 0.003);
      if (k === 0 && side === 0 && leafRest) {
        yaw = Math.atan2(-(leafRest[2] - base[2]), leafRest[0] - base[0]);
        pitch = 0.22;
      }
      const age = 1 - f;
      leaf(b, {
        base: add(base, [Math.cos(yaw) * 0.0025, 0, -Math.sin(yaw) * 0.0025]),
        yaw,
        pitch,
        length: L,
        width: L * r.range(0.46, 0.52),
        curl: r.range(0.3, 0.5),
        sideCurl: r.range(-0.12, 0.12),
        twist: r.range(-0.2, 0.2),
        fold: 0.12,
        shape: 'oval',
        petiole: 0.009,
        segL: lod === 0 ? 10 : lod === 1 ? 5 : 3,
        segW: lod === 0 ? 2 : 1,
        color: (u, sv) => {
          let c = mix(deep, mid, 0.35 + 0.45 * u);
          c = mix(c, edge, smooth(0.72, 1, Math.abs(sv)) * 0.3);
          if (Math.abs(sv) < 0.07) c = mix(c, rib, 0.5);
          // older (lower) leaves go a touch yellow at the tips
          c = mix(c, hex('#8f8a36'), age * smooth(0.75, 1, u) * 0.22);
          return c;
        },
        sway: sw(r() * 6.28, 0.08 + 0.05 * f, k === 0 ? 0 : clamp(0.08 + 0.14 * k, 0, 0.6)),
        extra: [0, 0.22, 0.68, 0.12],
      });
    }
  }
  // the first thin roots fanning out at the foot of the propagule
  if (lod < 2) {
    const count = lod === 0 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r.range(-0.3, 0.3);
      const L = r.range(0.016, 0.028);
      const p0: V3 = [Math.cos(a) * 0.004, 0.005, Math.sin(a) * 0.004];
      const p1: V3 = [Math.cos(a) * L * 0.55, 0.003 + r.range(0, 0.002), Math.sin(a) * L * 0.55];
      const p2: V3 = [Math.cos(a) * L, -0.004, Math.sin(a) * L];
      tube(b, smoothPath([p0, p1, p2], 6), { radial: 4, radius: (t) => 0.0011 * (1 - 0.35 * t), color: (t) => mix(hex('#5f4e34'), hex('#a8966e'), t), extra: () => [0, 0.6, 0.3, 0.4], capEnd: 'round' });
    }
  }
  // stiff, leathery plant: only the crown sways a little; the propagule is rooted
  weightFromHeight(b, hypTop * 0.95, h, 1.6);
}

// ───────────────────────────── entry ─────────────────────────────

export function genEstuary(out: DecorBuild, def: DecorDef, seed: number, lod: number): void {
  switch (def.visual) {
    case 'wood_mangrove':
      return genMangrove(out, def, seed, lod);
    case 'ornament_oyster_cluster':
      return genOysters(out, def, seed, lod);
    case 'rock_estuary_pebbles':
      return genPebbles(out, def, seed, lod);
    case 'plant_mangrove':
      return genSeedling(out, def, seed, lod);
  }
}

