/**
 * Fin library + membrane mesher. OWNER: lane "fishart".
 *
 * Every fin is a ruled membrane: a root line on the body (parameter s) from which rays (parameter r) grow to the fin
 * edge. The mesher stores both the spread and the folded (clamped) ray positions, so the shader can open fins for a
 * display (finFlare), fold them when stressed, and add secondary billowing that lags the body wave.
 *
 * Shapes: caudal (forked, rounded, truncate, lyre, veiltail, halfmoon, crowntail, plakat, double_tail, delta, fan,
 * sword, spade, lobed, split goldfish tails), dorsal, anal, pectoral, pelvic, thread (gourami feelers), adipose,
 * beard (betta branchiostegal membrane), spines and sails.
 */
import * as THREE from 'three';
import type { BodySampler } from './body';
import type { FinShape, FinStyle, FinRole } from './plan';
import { FIN_ROLE_ID } from './plan';
import { clamp01, smoothstep, lerp, type Curve } from './math';

type V3 = [number, number, number];
const DEG = Math.PI / 180;

const norm3 = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
/** Direction in the median (XY) plane: angle 0 = straight back (−X), +90° = straight up. */
const medianDir = (angleDeg: number): V3 => [-Math.cos(angleDeg * DEG), Math.sin(angleDeg * DEG), 0];

// ───────────────────────────────── caudal ─────────────────────────────────

export type CaudalKind =
  | 'forked'
  | 'rounded'
  | 'truncate'
  | 'lyre'
  | 'veiltail'
  | 'halfmoon'
  | 'crowntail'
  | 'plakat'
  | 'double_tail'
  | 'delta'
  | 'fan'
  | 'sword'
  | 'spade'
  | 'lobed'
  | 'emarginate'
  | 'pointed'
  | 'goldfish';

export interface CaudalOptions {
  kind: CaudalKind;
  /** Ray length at its longest (units). */
  len: number;
  /** Half-spread angle of the fan (deg) — upper rays point up by this much, lower rays down. */
  spread: number;
  /** Tilt of the whole fan (deg, negative droops). */
  tilt?: number;
  /** Fork depth for forked/lyre/emarginate (0..1). */
  fork?: number;
  rays?: number;
  web?: number;
  soft?: number;
  /** Root height as a fraction of the peduncle depth. */
  rootH?: number;
  /** Downward curl of long rays (units at the tip). */
  droop?: number;
  /** Rotate the fin plane about X (deg) — mirrored pair of tilted fans (legacy split tail). */
  planeTilt?: number;
  /**
   * Split double tail (fancy goldfish): build a mirrored pair of tail halves, each yawed outward from the median
   * plane by [upper, lower] degrees (interpolated over the rays), so the halves stay joined near the top and splay
   * apart below — an inverted "V" from behind, a butterfly from above.
   */
  splay?: [number, number];
  /** Sword extension: +1 upper, −1 lower, 2 both. */
  sword?: number;
  cup?: number;
  segS?: number;
  segR?: number;
  style: FinStyle;
}

function caudalLen(o: CaudalOptions, s: number): number {
  const e = Math.abs(2 * s - 1); // 0 centre → 1 outer rays
  const corner = 0.86 + 0.14 * smoothstep(0, 0.14, Math.min(s, 1 - s));
  const fork = o.fork ?? 0.5;
  switch (o.kind) {
    case 'forked':
      return (lerp(1 - fork, 1, Math.pow(e, 0.85)) * (0.8 + 0.2 * smoothstep(0, 0.1, Math.min(s, 1 - s))));
    case 'emarginate':
      return lerp(1 - fork * 0.35, 1, Math.pow(e, 1.6)) * corner;
    case 'lyre':
      return lerp(0.42, 1, Math.pow(e, 2.6)) * (0.7 + 0.3 * smoothstep(0, 0.06, Math.min(s, 1 - s)));
    case 'rounded':
      return Math.sqrt(Math.max(0, 1 - e * e * 0.62));
    case 'pointed':
      return Math.max(0.2, 1 - e * 0.75);
    case 'spade':
      return Math.max(0.25, 1 - Math.pow(e, 1.3) * 0.72);
    case 'truncate':
      return (0.93 + 0.07 * (1 - e * e)) * corner;
    case 'plakat':
      return Math.sqrt(Math.max(0, 1 - e * e * 0.35)) * (0.9 + 0.1 * smoothstep(0, 0.2, Math.min(s, 1 - s)));
    case 'veiltail':
      // long, drooping, lower lobe longest
      return (0.62 + 0.38 * Math.sin(Math.PI * Math.pow(s, 0.8))) * (0.75 + 0.25 * s);
    case 'halfmoon':
      return 0.9 + 0.1 * Math.sin(Math.PI * s);
    case 'crowntail':
      return 0.82 + 0.18 * Math.sin(Math.PI * s);
    case 'double_tail': {
      // two rounded lobes split almost to the root
      const lobe = Math.sin(Math.PI * clamp01(e * 1.05));
      return Math.max(0.12, 0.25 + 0.75 * smoothstep(0.05, 0.55, e) * (0.75 + 0.25 * lobe));
    }
    case 'delta':
      return 1 / Math.max(0.55, Math.cos(e * o.spread * DEG * 0.9));
    case 'fan':
      return 0.9 + 0.1 * Math.sin(Math.PI * s);
    case 'sword': {
      let L = (0.93 + 0.07 * (1 - e * e)) * corner;
      const sw = o.sword ?? -1;
      if ((sw === -1 || sw === 2) && s > 0.84) L += 1.1 * smoothstep(0.84, 0.97, s) * (1 - smoothstep(0.985, 1, s) * 0.5);
      if ((sw === 1 || sw === 2) && s < 0.16) L += 1.1 * smoothstep(0.16, 0.03, s) * (1 - smoothstep(0.015, 0, s) * 0.5);
      return L;
    }
    case 'lobed':
      return lerp(0.62, 1, Math.pow(e, 0.7)) * (0.85 + 0.15 * Math.sin(Math.PI * s));
    case 'goldfish': {
      // one half of a fancy-goldfish double tail: rounded upper and lower lobes around a central notch,
      // the lower lobe a touch longer (it trails and droops)
      const notch = lerp(1 - fork, 1, Math.pow(smoothstep(0, 0.78, e), 0.85));
      const tips = 0.7 + 0.3 * smoothstep(0, 0.17, Math.min(s, 1 - s));
      return notch * tips * (0.96 + 0.08 * s);
    }
  }
}

export function caudal(b: BodySampler, o: CaudalOptions): FinShape {
  const tEnd = 0.985;
  const x0 = b.x(tEnd) + 0.004;
  const ax = b.axis(tEnd);
  const h = Math.min(b.dorsal(0.95), b.ventral(0.95)) * (o.rootH ?? 0.95);
  const tilt = o.tilt ?? 0;
  const spread = o.spread;
  const planeTilt = (o.planeTilt ?? 0) * DEG;
  const cp = Math.cos(planeTilt);
  const spn = Math.sin(planeTilt);
  const rot = (v: V3): V3 => [v[0], v[1] * cp, v[1] * spn + v[2]]; // rotate about X (y→z)
  // split double tail: yaw each ray outward (toward +Z; the mirrored copy goes to −Z)
  const splay = o.splay;
  const splayAt = (s: number, k = 1) => (splay ? lerp(splay[0], splay[1], s) * DEG * k : 0);
  const yaw = (v: V3, a: number): V3 => (a === 0 ? v : [v[0] * Math.cos(a), v[1], v[2] - v[0] * Math.sin(a)]);
  const pedW = splay ? b.width(tEnd) : 0;
  const root = (s: number): V3 => {
    const y = lerp(h, -h, s);
    const z = splay ? pedW * lerp(0.2, 0.75, s) : 0;
    return rot([x0 - 0.004 * (1 - Math.abs(2 * s - 1)), y, z]).map((v, i) => (i === 1 ? v + ax : v)) as V3;
  };
  const ray = (s: number) => {
    const a = lerp(spread, -spread, s) + tilt;
    return { dir: yaw(rot(medianDir(a)), splayAt(s)), len: o.len * caudalLen(o, s) };
  };
  const fold = (s: number) => {
    const a = lerp(spread, -spread, s) * 0.4 + tilt * 0.6;
    return { dir: norm3(yaw(rot(medianDir(a)), splayAt(s, 0.5))), len: o.len * caudalLen(o, s) * 0.96 };
  };
  const mid = splayAt(0.5);
  const n: V3 = norm3(rot([Math.sin(mid), 0, Math.cos(mid)]));
  return {
    role: 'caudal',
    root,
    ray,
    fold,
    normal: n,
    cup: o.cup ?? 0.012,
    ripple: o.droop ?? 0,
    rays: o.rays ?? 14,
    web: o.web ?? 0,
    soft: o.soft ?? 0.5,
    segS: o.segS ?? 28,
    segR: o.segR ?? 14,
    mirror: planeTilt !== 0 || !!splay,
    style: o.style,
  };
}

// ───────────────────────────────── median (dorsal / anal) ─────────────────────────────────

export interface MedianOptions {
  /** Body t range of the fin base. */
  t0: number;
  t1: number;
  /** Longest ray (units). */
  len: number;
  /** Ray angle (deg above the body axis, pointing back) at the front and back of the fin. */
  angle0: number;
  angle1: number;
  /** Length profile over s (default rounded). */
  profile?: Curve;
  rays?: number;
  web?: number;
  soft?: number;
  cup?: number;
  droop?: number;
  segS?: number;
  segR?: number;
  /** Sink the root into the body by this fraction of local depth. */
  inset?: number;
  style: FinStyle;
}

function medianFin(b: BodySampler, o: MedianOptions, role: FinRole, dorsal: boolean): FinShape {
  const prof = o.profile ?? ((s: number) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.15)));
  const inset = o.inset ?? 0.04;
  const sign = dorsal ? 1 : -1;
  const root = (s: number): V3 => {
    const t = lerp(o.t0, o.t1, s);
    const y = dorsal ? b.topY(t) - b.dorsal(t) * inset : b.bottomY(t) + b.ventral(t) * inset;
    return [b.x(t), y, 0];
  };
  const ray = (s: number) => {
    const a = lerp(o.angle0, o.angle1, s) * sign;
    return { dir: medianDir(a), len: o.len * prof(s) };
  };
  const fold = (s: number) => {
    const a = lerp(o.angle0 * 0.42, o.angle1 * 0.32, s) * sign;
    return { dir: medianDir(a), len: o.len * prof(s) * 0.97 };
  };
  return {
    role,
    root,
    ray,
    fold,
    normal: [0, 0, 1],
    cup: (o.cup ?? 0.008) * (dorsal ? 1 : -1),
    ripple: o.droop ?? 0,
    rays: o.rays ?? 12,
    web: o.web ?? 0,
    soft: o.soft ?? 0.4,
    segS: o.segS ?? 22,
    segR: o.segR ?? 10,
    style: o.style,
  };
}

export const dorsal = (b: BodySampler, o: MedianOptions) => medianFin(b, o, 'dorsal', true);
export const anal = (b: BodySampler, o: MedianOptions) => medianFin(b, o, 'anal', false);
export const adipose = (b: BodySampler, o: Omit<MedianOptions, 'angle0' | 'angle1'> & { angle?: number }) =>
  medianFin(b, { ...o, angle0: o.angle ?? 35, angle1: (o.angle ?? 35) * 0.35, rays: 0, profile: o.profile ?? ((s) => Math.sin(Math.PI * Math.pow(s, 0.8)) * 0.9 + 0.1) }, 'adipose', true);

/** Spiny dorsal (lionfish / foxface / scorpionfish): deep web recess so spines stand free. */
export const spinyDorsal = (b: BodySampler, o: MedianOptions) => medianFin(b, { web: 0.62, ...o }, 'spine', true);

/** Sail / filament dorsal (firefish filament, mandarin sail). */
export const sailDorsal = (b: BodySampler, o: MedianOptions) => medianFin(b, o, 'sail', true);

// ───────────────────────────────── paired fins ─────────────────────────────────

export interface PairedOptions {
  /** Body t of the fin base and yn range of the root line. */
  t: number;
  yn0: number;
  yn1: number;
  /** Extra root length along the body (for horizontal roots like pelvics / hillstream). */
  tLen?: number;
  len: number;
  /** Angle the fin stands off the flank (deg). */
  out: number;
  /** Sweep of the rays: angle above (+) / below (−) the backward direction for the first and last ray (deg). */
  a0: number;
  a1: number;
  /** Tilt the ray fan down (deg). */
  droop?: number;
  profile?: Curve;
  rays?: number;
  web?: number;
  soft?: number;
  cup?: number;
  segS?: number;
  segR?: number;
  /** Fold: how flat against the body when clamped (0..1). */
  foldOut?: number;
  /** Ray length when folded, as a fraction of the spread length (beard tucks away to ~0). */
  foldLen?: number;
  style: FinStyle;
}

function pairedFin(b: BodySampler, o: PairedOptions, role: FinRole): FinShape {
  const prof = o.profile ?? ((s: number) => 0.6 + 0.4 * Math.sin(Math.PI * s));
  const p0 = b.flank(o.t, o.yn0, 1, { x: 0, y: 0, z: 0, yn: 0 });
  const p1 = b.flank(o.t + (o.tLen ?? 0), o.yn1, 1, { x: 0, y: 0, z: 0, yn: 0 });
  const nrmA = b.normal(o.t, b.flankTheta(o.t, (o.yn0 + o.yn1) / 2, 1), new THREE.Vector3());
  const inset = 0.25;
  const rootP = (s: number): V3 => {
    const x = lerp(p0.x, p1.x, s);
    const y = lerp(p0.y, p1.y, s);
    const z = lerp(p0.z, p1.z, s) * (1 - inset * 0.2) - 0.002;
    return [x, y, z];
  };
  // Fin plane basis: e1 along the root (top→bottom), back = backward + outward.
  const out = o.out * DEG;
  const e1 = norm3([p1.x - p0.x, p1.y - p0.y, p1.z - p0.z]);
  const flankOut = new THREE.Vector3(nrmA.x, 0, nrmA.z).normalize();
  const backDir = (outA: number): V3 => norm3([-Math.cos(outA), 0, 0].map((v, i) => v + (i === 0 ? flankOut.x : i === 2 ? flankOut.z : 0) * Math.sin(outA)) as V3);
  const dirFor = (s: number, outA: number, sweepScale: number): V3 => {
    const bd = backDir(outA);
    // "up" in the fin plane: opposite the root direction, orthogonalised against bd
    const up = new THREE.Vector3(-e1[0], -e1[1], -e1[2]);
    const bv = new THREE.Vector3(...bd);
    up.addScaledVector(bv, -up.dot(bv)).normalize();
    const a = (lerp(o.a0, o.a1, s) * sweepScale - (o.droop ?? 0)) * DEG;
    const d = bv.multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a)).normalize();
    return [d.x, d.y, d.z];
  };
  const ray = (s: number) => ({ dir: dirFor(s, out, 1), len: o.len * prof(s) });
  const foldOut = o.foldOut ?? 0.15;
  const foldLen = o.foldLen ?? 0.95;
  const fold = (s: number) => ({ dir: dirFor(s, out * foldOut, 0.35), len: o.len * prof(s) * foldLen });
  // plane normal (outward-ish)
  const d0 = new THREE.Vector3(...dirFor(0.5, out, 1));
  const n = new THREE.Vector3(...e1).cross(d0).normalize();
  if (n.z < 0) n.multiplyScalar(-1);
  return {
    role,
    root: rootP,
    ray,
    fold,
    normal: [n.x, n.y, n.z],
    cup: o.cup ?? 0.006,
    rays: o.rays ?? 10,
    web: o.web ?? 0,
    soft: o.soft ?? 0.35,
    segS: o.segS ?? 12,
    segR: o.segR ?? 8,
    mirror: true,
    style: o.style,
  };
}

export const pectoral = (b: BodySampler, o: PairedOptions) => pairedFin(b, o, 'pectoral');
export const pelvic = (b: BodySampler, o: PairedOptions) => pairedFin(b, o, 'pelvic');
/** Gourami thread-like pelvic feelers: a single long flexible ray with a hair-thin membrane. */
export const thread = (b: BodySampler, o: PairedOptions) =>
  pairedFin(b, { rays: 1, segS: 2, segR: 18, soft: 1.2, ...o, profile: o.profile ?? (() => 1) }, 'thread');
/** Betta "beard": dark branchiostegal membrane that only shows during a flare. */
export const beard = (b: BodySampler, o: PairedOptions) => pairedFin(b, { foldOut: 0, foldLen: 0.04, ...o }, 'beard');

// ───────────────────────────────── mesher ─────────────────────────────────

export interface FinMeshInput {
  fin: FinShape;
  index: number;
}

/**
 * Build one merged BufferGeometry for all fins of a fish. `lodScale` scales mesh resolution (1 hero, 0.5, 0.25 far).
 * Attributes: position (spread), aFold, normal, uv (s, r), aFin (s, r, finIndex, dist), aFinB (rays, web, soft, role),
 * aRoot (root xyz, axisY).
 */
export function buildFinGeometry(b: BodySampler, fins: FinShape[], lodScale: number): THREE.BufferGeometry {
  const P: number[] = [];
  const F: number[] = [];
  const N: number[] = [];
  const UV: number[] = [];
  const A: number[] = [];
  const B: number[] = [];
  const RT: number[] = [];
  const I: number[] = [];

  fins.forEach((fin, fi) => {
    const sides: (1 | -1)[] = fin.mirror ? [1, -1] : [1];
    const segS = Math.max(fin.rays === 1 ? 1 : 3, Math.round(fin.segS * lodScale));
    const segR = Math.max(3, Math.round(fin.segR * Math.max(0.4, lodScale)));
    for (const side of sides) {
      const base = P.length / 3;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segS; i++) {
        const s = i / segS;
        const root = fin.root(s);
        const ray = fin.ray(s);
        const fold = fin.fold(s);
        const axisY = b.axis(clamp01(b.tAt(root[0])));
        for (let j = 0; j <= segR; j++) {
          const r = j / segR;
          const cupK = fin.cup * r * r * Math.sin(Math.PI * (0.15 + 0.7 * s));
          const droop = (fin.ripple ?? 0) * r * r;
          const px = root[0] + ray.dir[0] * ray.len * r + fin.normal[0] * cupK;
          const py = root[1] + ray.dir[1] * ray.len * r + fin.normal[1] * cupK - droop;
          const pz = root[2] + ray.dir[2] * ray.len * r + fin.normal[2] * cupK;
          const fx = root[0] + fold.dir[0] * fold.len * r + fin.normal[0] * cupK * 0.5;
          const fy = root[1] + fold.dir[1] * fold.len * r + fin.normal[1] * cupK * 0.5 - droop * 0.5;
          const fz = root[2] + fold.dir[2] * fold.len * r + fin.normal[2] * cupK * 0.5;
          P.push(px, py, pz * side);
          F.push(fx, fy, fz * side);
          UV.push(s, r);
          A.push(s, r, fi, ray.len * r);
          B.push(fin.rays, fin.web, fin.soft, FIN_ROLE_ID[fin.role]);
          RT.push(root[0], root[1], root[2] * side, axisY);
          pts.push(new THREE.Vector3(px, py, pz * side));
        }
      }
      // normals from the grid (ds × dr), oriented to the declared side
      const want = new THREE.Vector3(fin.normal[0], fin.normal[1], fin.normal[2] * side);
      const ds = new THREE.Vector3();
      const dr = new THREE.Vector3();
      const n = new THREE.Vector3();
      const at = (i: number, j: number) => pts[Math.max(0, Math.min(segS, i)) * (segR + 1) + Math.max(0, Math.min(segR, j))];
      for (let i = 0; i <= segS; i++) {
        for (let j = 0; j <= segR; j++) {
          ds.subVectors(at(i + 1, j), at(i - 1, j));
          dr.subVectors(at(i, j + 1), at(i, j - 1));
          n.crossVectors(ds, dr);
          if (n.lengthSq() < 1e-14) n.copy(want);
          n.normalize();
          if (n.dot(want) < 0) n.multiplyScalar(-1);
          N.push(n.x, n.y, n.z);
        }
      }
      // winding consistent with normals
      const p00 = at(0, 0);
      const p10 = at(Math.min(1, segS), 0);
      const p01 = at(0, 1);
      const face = new THREE.Vector3().subVectors(p10, p00).cross(new THREE.Vector3().subVectors(p01, p00));
      const flip = face.dot(want) < 0;
      for (let i = 0; i < segS; i++) {
        for (let j = 0; j < segR; j++) {
          const a = base + i * (segR + 1) + j;
          const b2 = base + (i + 1) * (segR + 1) + j;
          const c = b2 + 1;
          const d = a + 1;
          if (!flip) I.push(a, b2, c, a, c, d);
          else I.push(a, c, b2, a, d, c);
        }
      }
    }
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aFold', new THREE.Float32BufferAttribute(F, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aFin', new THREE.Float32BufferAttribute(A, 4));
  g.setAttribute('aFinB', new THREE.Float32BufferAttribute(B, 4));
  g.setAttribute('aRoot', new THREE.Float32BufferAttribute(RT, 4));
  g.setIndex(I);
  return g;
}
