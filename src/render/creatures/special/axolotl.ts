/**
 * Axolotl (Ambystoma mexicanum) — procedural, skinned, animated.
 *
 * Anatomy: broad flat head with a real hinged lower jaw (the lipless "smile" is the crease where the upper lip
 * overhangs the jaw), tiny glossy eyes, three pairs of feathery gill rami with dense fimbriae, a dorsal crest that
 * grows into a paddle tail (fins are part of the same continuous skin loft, drawn translucent), costal grooves,
 * four limbs with little fingers (4 front, 5 hind). Morphs are fully data-driven from `appearance`.
 *
 * Motion: bottom-walking diagonal-couplet gait with a trunk standing wave, tail-driven swimming with limbs folded,
 * resting sprawl with fanned gills, gill flicks/pulses, suction-gape jaw, curious head tilt toward the player.
 *
 * Local space: head +X, up +Y, length 1 (snout x=+0.38, tail tip x=-0.62), origin ≈ centre of mass.
 * Ground contact plane (feet) at y = -AXOLOTL_GROUND (see root.userData.groundOffset).
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, intervalSkin, mixSkin, resamplePath, skin1, tube, ellipsoid, type Skin, type SkinInterval, type V3, type Mask } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { acquireEyeGeometry, createEyeMaterial, releaseEyeGeometry } from './common/eyes';
import { applyAppearance, color, luma } from './common/palette';
import { clamp, damp, lerp, noise1, rng, smoothstep, smoothTable, TAU } from './common/math';
import { pointerInCreatureFrame, tankInfo } from './common/live';

const X0 = 0.38; // snout tip x
const S_CORNER = 0.125; // mouth corner (fraction of length from the snout)
/** Back of the skull (head bone pivot): the broad flat head is ~1/4 of the total length. */
const S_HEAD = 0.215;
export const AXOLOTL_GROUND = 0.068;

// ───────────────────────────── Body profile (s: 0 snout → 1 tail tip) ─────────────────────────────

// Chunky, cute proportions: a broad flat head clearly wider than the trunk (widest just in front of the gills),
// a short neck pinch behind the gills, a stocky trunk and a deep paddle tail.
const W_T: [number, number][] = [
  [0, 0.078], [0.02, 0.093], [0.045, 0.106], [0.08, 0.116], [0.12, 0.123], [0.16, 0.128], [0.19, 0.124], [0.215, 0.108],
  [0.245, 0.087], [0.28, 0.088], [0.35, 0.095], [0.43, 0.095], [0.49, 0.087], [0.55, 0.07], [0.6, 0.051], [0.7, 0.031],
  [0.8, 0.019], [0.9, 0.011], [0.97, 0.0045], [1, 0.0015],
];
// dorsal height: low, flat skull; the back rises behind the gills into a rounded, well-fed trunk
const HT_T: [number, number][] = [
  [0, 0.024], [0.03, 0.033], [0.07, 0.04], [0.12, 0.045], [0.17, 0.048], [0.21, 0.05], [0.25, 0.053], [0.32, 0.058],
  [0.4, 0.06], [0.48, 0.058], [0.55, 0.051], [0.62, 0.041], [0.72, 0.03], [0.82, 0.02], [0.92, 0.011], [1, 0.0015],
];
const HB_T: [number, number][] = [
  [0.12, 0.018], [0.145, 0.033], [0.18, 0.041], [0.23, 0.046], [0.3, 0.053], [0.4, 0.058], [0.48, 0.056], [0.54, 0.048],
  [0.6, 0.035], [0.7, 0.024], [0.8, 0.015], [0.9, 0.008], [1, 0.0015],
];
const FD_T: [number, number][] = [
  [0.24, 0], [0.29, 0.004], [0.36, 0.0075], [0.44, 0.011], [0.51, 0.019], [0.59, 0.037], [0.68, 0.052], [0.78, 0.056],
  [0.87, 0.048], [0.93, 0.034], [0.975, 0.016], [1, 0],
];
const FV_T: [number, number][] = [[0.57, 0], [0.62, 0.006], [0.68, 0.021], [0.75, 0.032], [0.83, 0.036], [0.9, 0.03], [0.96, 0.014], [1, 0]];
const JAW_D_T: [number, number][] = [[0, 0.0065], [0.036, 0.0105], [0.07, 0.0135], [0.105, 0.0158], [0.125, 0.0168], [0.143, 0.014], [0.165, 0.004]];
const JAW_END = 0.165;
const FD_START = 0.24;
const FV_START = 0.57;

const dome = (s: number, len = 0.04) => (s >= len ? 1 : Math.sqrt(Math.max(0, 1 - (1 - s / len) ** 2)));
const mouthY = (s: number) => -0.0142 + 0.0105 * Math.pow(clamp(s / S_CORNER), 2.6);

interface Prof {
  w: number;
  ht: number;
  hb: number;
  fd: number;
  fv: number;
  nt: number;
  nb: number;
  palate: number;
  /** Ring centre y offset: the snout dome shrinks toward the mouth line, so the lip stays at mouth level. */
  cy: number;
}
function prof(s: number, belly: number, o: Prof): Prof {
  const d = dome(s);
  o.w = smoothTable(W_T, s) * d;
  // a slightly longer dome on the top line gives the snout a soft, rounded forehead in profile
  o.ht = smoothTable(HT_T, s) * dome(s, 0.05);
  const palateH = -mouthY(s) + 0.0016;
  const throat = smoothTable(HB_T, Math.max(s, 0.12));
  const k = smoothstep(S_CORNER - 0.008, S_CORNER + 0.022, s);
  o.hb = lerp(palateH, throat, k) * d;
  o.cy = palateH * (d - 1) * (1 - k);
  o.palate = 1 - k;
  // belly fullness (fed / gravid) swells the trunk underside
  o.hb *= 1 + belly * 0.28 * Math.exp(-(((s - 0.4) / 0.1) ** 2));
  o.w *= 1 + belly * 0.1 * Math.exp(-(((s - 0.4) / 0.1) ** 2));
  o.fd = Math.max(0, smoothTable(FD_T, clamp(s, FD_START, 1)));
  if (s < FD_START) o.fd = 0;
  o.fv = s < FV_START ? 0 : Math.max(0, smoothTable(FV_T, s));
  // the skull is flat-topped and flat-bottomed (boxier superellipse), relaxing to a round trunk
  o.nt = lerp(3.1, 2.15, smoothstep(0.16, 0.36, s));
  o.nb = lerp(4.5, 2.3, smoothstep(0.1, 0.26, s));
  return o;
}

const spow = (x: number, p: number) => Math.sign(x) * Math.pow(Math.abs(x), p);

/** Ring point at (s, θ): θ = 0 top, π/2 → +Z, π bottom. Writes [x, y, z] and returns fin mask. */
function ringPoint(s: number, th: number, pr: Prof, out: number[]): { fin: number; palate: number; lip: number } {
  const cy = Math.cos(th);
  const sz = Math.sin(th);
  const n = cy >= 0 ? pr.nt : pr.nb;
  let y = (cy >= 0 ? pr.ht : pr.hb) * spow(cy, 2 / n);
  let z = pr.w * spow(sz, 2 / Math.min(pr.nt, pr.nb) * 1.0);
  // fins as thin gaussian ridges along the midline; sigma adapts to body width so the membrane stays thin
  const sig = clamp(0.0024 / Math.max(pr.w, 1e-4), 0.03, 0.14);
  const d0 = Math.min(th, TAU - th);
  const dp = Math.abs(th - Math.PI);
  const gd = Math.exp(-((d0 / sig) ** 2));
  const gv = Math.exp(-((dp / sig) ** 2));
  y += pr.fd * gd - pr.fv * gv;
  z *= 1 - 0.75 * Math.max(gd * clamp(pr.fd / 0.004), gv * clamp(pr.fv / 0.004));
  out[0] = X0 - s;
  out[1] = y + pr.cy;
  out[2] = z;
  const fin = Math.max(gd * clamp(pr.fd / 0.006), gv * clamp(pr.fv / 0.006));
  const pal = pr.palate * smoothstep(0.55, 0.9, -cy);
  const lip = pr.palate * Math.exp(-(((-cy - 0.42) / 0.16) ** 2));
  return { fin, palate: pal, lip };
}

// ───────────────────────────── Rig ─────────────────────────────

const SPINE: [string, string | null, number][] = [
  // name, parent, pivot s
  ['root', null, 0.38],
  ['chest', 'root', 0.38],
  ['neck', 'chest', 0.285],
  ['head', 'neck', S_HEAD],
  ['hips', 'root', 0.46],
  ['tail1', 'hips', 0.56],
  ['tail2', 'tail1', 0.645],
  ['tail3', 'tail2', 0.73],
  ['tail4', 'tail3', 0.815],
  ['tail5', 'tail4', 0.9],
];

interface LimbDef {
  name: string;
  parent: string;
  side: number;
  front: boolean;
  s: V3;
  e: V3;
  w: V3;
}
function limbDefs(): LimbDef[] {
  const out: LimbDef[] = [];
  for (const side of [1, -1]) {
    // short, stout limbs set wide on the broad trunk
    out.push({ name: `F${side > 0 ? 'R' : 'L'}`, parent: 'chest', side, front: true, s: [0.105, -0.028, side * 0.062], e: [0.093, -0.047, side * 0.117], w: [0.108, -0.062, side * 0.128] });
    out.push({ name: `H${side > 0 ? 'R' : 'L'}`, parent: 'hips', side, front: false, s: [-0.14, -0.028, side * 0.058], e: [-0.157, -0.047, side * 0.113], w: [-0.137, -0.062, side * 0.124] });
  }
  return out;
}

interface GillDef {
  side: number;
  k: number;
  base: THREE.Vector3;
  path: THREE.Vector3[];
  up: THREE.Vector3;
}

// ───────────────────────────── Template (cached per LOD × gill fullness bucket) ─────────────────────────────

interface AxTemplate {
  geo: THREE.BufferGeometry;
  rig: RigDef;
  eyePos: THREE.Vector3[];
  eyeDir: THREE.Vector3[];
  eyeR: number;
}

function buildTemplate(lod: RenderLod, fullness: number): AxTemplate {
  const rig = new RigDef();
  const sx = (s: number): V3 => [X0 - s, 0, 0];
  for (const [name, parent, s] of SPINE) rig.add(name, parent, sx(s));
  const bi = (n: string) => rig.idx(n);
  const spineIv: SkinInterval[] = [
    { bone: bi('head'), s0: 0, s1: S_HEAD },
    { bone: bi('neck'), s0: S_HEAD, s1: 0.285 },
    { bone: bi('chest'), s0: 0.285, s1: 0.38 },
    { bone: bi('root'), s0: 0.38, s1: 0.46 },
    { bone: bi('hips'), s0: 0.46, s1: 0.56 },
    { bone: bi('tail1'), s0: 0.56, s1: 0.645 },
    { bone: bi('tail2'), s0: 0.645, s1: 0.73 },
    { bone: bi('tail3'), s0: 0.73, s1: 0.815 },
    { bone: bi('tail4'), s0: 0.815, s1: 0.9 },
    { bone: bi('tail5'), s0: 0.9, s1: 1.0 },
  ];
  // jaw hinge at the mouth corners
  rig.add('jaw', 'head', [X0 - S_CORNER - 0.004, mouthY(S_CORNER) - 0.003, 0]);
  const limbs = limbDefs();
  for (const l of limbs) {
    rig.add(`${l.name}_s`, l.parent, l.s);
    rig.add(`${l.name}_e`, `${l.name}_s`, l.e);
    rig.add(`${l.name}_w`, `${l.name}_e`, l.w);
  }

  const g = new GeoBuilder();
  const nu = lod === 0 ? 150 : lod === 1 ? 80 : 40;
  const nv = lod === 0 ? 72 : lod === 1 ? 44 : 22;
  const warpU = (u: number) => u - (0.75 * Math.sin(TAU * u)) / TAU;
  const warpV = (t: number) => TAU * (t - (0.85 * Math.sin(2 * TAU * t)) / (2 * TAU));
  const pr: Prof = { w: 0, ht: 0, hb: 0, fd: 0, fv: 0, nt: 2, nb: 2, palate: 0, cy: 0 };
  const prm: Prof = { ...pr };
  const pt = [0, 0, 0];
  const ptm = [0, 0, 0];

  // Main loft: head + trunk + tail with integrated fins. Group 0 = opaque skin, 1 = translucent fin membrane.
  g.grid(
    {
      nu,
      nv,
      wrapV: true,
      orient: 'ring',
      group: (_i, _j, a, b, c, d) => ((a.mask[1] + b.mask[1] + c.mask[1] + d.mask[1]) / 4 > 0.5 ? 1 : 0),
    },
    (i, j, smp) => {
      const s = warpU(i / (nu - 1));
      const th = warpV(j / nv);
      prof(s, 0, pr);
      prof(s, 1, prm);
      const m = ringPoint(s, th, pr, pt);
      ringPoint(s, th, prm, ptm);
      smp.x = pt[0];
      smp.y = pt[1];
      smp.z = pt[2];
      smp.mx = ptm[0];
      smp.my = ptm[1];
      smp.mz = ptm[2];
      smp.u = s;
      smp.v = th / TAU;
      smp.mask = [0, m.fin, m.palate, m.lip];
      smp.skin = intervalSkin(s, spineIv, 0.9);
    },
  );

  // Lower jaw: flat top (mouth floor / tongue), rounded chin, slightly inset under the upper lip.
  const jawB = bi('jaw');
  const headB = bi('head');
  const jnu = lod === 0 ? 40 : lod === 1 ? 22 : 12;
  const jnv = lod === 0 ? 40 : lod === 1 ? 24 : 14;
  g.grid({ nu: jnu, nv: jnv, wrapV: true, orient: 'ring' }, (i, j, smp) => {
    const u = i / (jnu - 1);
    const s = 0.004 + u * (JAW_END - 0.004);
    const th = (j / jnv) * TAU;
    const jc = JAW_END - 0.017;
    const d = dome(s - 0.003, 0.036) * (s > jc ? Math.sqrt(Math.max(0, 1 - ((s - jc) / 0.017) ** 2)) : 1);
    const w = smoothTable(W_T, s) * d * 0.94;
    const depth = Math.max(0.0005, smoothTable(JAW_D_T, s));
    const cy = Math.cos(th);
    const top = mouthY(Math.min(s, S_CORNER + 0.01)) - 0.0012;
    const yy = cy >= 0 ? top + 0.0012 * Math.pow(cy, 2 / 6) * d : top - depth * d * Math.pow(-cy, 2 / 2.3);
    const z = w * spow(Math.sin(th), cy >= 0 ? 2 / 6 : 2 / 2.3);
    smp.x = X0 - s;
    smp.y = yy;
    smp.z = z;
    smp.u = s;
    smp.v = j / jnv;
    const tongue = smoothstep(0.35, 0.8, cy);
    smp.mask = [1, 0, tongue, 0];
    smp.skin = s > S_CORNER ? mixSkin(skin1(jawB), skin1(headB), smoothstep(S_CORNER, JAW_END, s) * 0.5) : skin1(jawB);
  });

  // Limbs with hands and fingers.
  const limbNv = lod === 0 ? 14 : lod === 1 ? 9 : 6;
  for (const l of limbs) {
    const bS = bi(`${l.name}_s`);
    const bE = bi(`${l.name}_e`);
    const bW = bi(`${l.name}_w`);
    const inner: V3 = [l.s[0] + (l.front ? 0.004 : -0.004), l.s[1] + 0.006, l.s[2] * 0.55];
    const path = resamplePath([inner, l.s, [(l.s[0] + l.e[0]) / 2, (l.s[1] + l.e[1]) / 2 + 0.002, (l.s[2] + l.e[2]) / 2], l.e, [(l.e[0] + l.w[0]) / 2, (l.e[1] + l.w[1]) / 2, (l.e[2] + l.w[2]) / 2], l.w], lod === 0 ? 16 : 9);
    const iv: SkinInterval[] = [
      { bone: l.front ? bi('chest') : bi('hips'), s0: 0, s1: 0.12 },
      { bone: bS, s0: 0.12, s1: 0.55 },
      { bone: bE, s0: 0.55, s1: 0.95 },
      { bone: bW, s0: 0.95, s1: 1 },
    ];
    const rBase = l.front ? 0.0162 : 0.0185;
    tube(g, {
      path,
      nv: limbNv,
      radius: (t) => lerp(rBase * 1.05, 0.0094, smoothstep(0, 1, t)) * (1 + 0.1 * Math.exp(-(((t - 0.6) / 0.08) ** 2))),
      aspect: () => [1, 0.9],
      skin: (t) => intervalSkin(t, iv, 0.8),
      mask: (t) => [2, 0.2 + t * 0.6, 0, 0],
      capEnd: 0.1,
      capRows: 4,
      up: new THREE.Vector3(0, 1, 0),
    });
    // palm pad
    const palm: V3 = [l.w[0] + (l.front ? 0.003 : 0.002), -AXOLOTL_GROUND + 0.0034, l.w[2] + l.side * 0.002];
    ellipsoid(g, {
      center: palm,
      radii: [0.011, 0.0042, 0.0105],
      nu: lod === 0 ? 10 : 6,
      nv: lod === 0 ? 14 : 8,
      skin: skin1(bW),
      mask: [2, 0.85, 0, 0.5],
    });
    if (lod < 2) {
      const angles = l.front ? [-0.42, 0.02, 0.45, 0.86] : [-0.55, -0.15, 0.25, 0.65, 1.02];
      const lens = l.front ? [0.014, 0.019, 0.02, 0.015] : [0.012, 0.018, 0.021, 0.019, 0.014];
      angles.forEach((a0, fi) => {
        const a = l.front ? a0 : a0 - 0.25;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a) * l.side);
        const len = lens[fi];
        const p0 = new THREE.Vector3(...palm).addScaledVector(dir, 0.0065);
        const pts = [0, 0.33, 0.66, 1].map((f) => p0.clone().addScaledVector(dir, len * f).add(new THREE.Vector3(0, 0.0012 * Math.sin(Math.PI * f) - 0.0006 * f, 0)));
        tube(g, {
          path: resamplePath(pts.map((p) => [p.x, p.y, p.z] as V3), lod === 0 ? 7 : 4),
          nv: lod === 0 ? 8 : 5,
          radius: (t) => 0.0031 * (1 - 0.3 * t) + 0.0009 * Math.exp(-(((t - 0.9) / 0.1) ** 2)),
          aspect: () => [0.85, 1],
          skin: () => skin1(bW),
          mask: (t) => [2, 1, 0, t],
          capEnd: 0.1,
          capStart: 0.05,
          capRows: 3,
          up: new THREE.Vector3(0, 1, 0),
        });
      });
    }
  }

  // Gills: 3 rami per side (base + mid bones) with fimbriae.
  const gillDefs = gillLayout(fullness);
  for (const gd of gillDefs) {
    const sideName = gd.side > 0 ? 'R' : 'L';
    const bA = rig.add(`g${sideName}${gd.k}a`, 'head', [gd.base.x, gd.base.y, gd.base.z]);
    const mid = gd.path[Math.floor(gd.path.length / 2)];
    const bB = rig.add(`g${sideName}${gd.k}b`, `g${sideName}${gd.k}a`, [mid.x, mid.y, mid.z]);
    const gIv: SkinInterval[] = [
      { bone: headB, s0: 0, s1: 0.06 },
      { bone: bA, s0: 0.06, s1: 0.5 },
      { bone: bB, s0: 0.5, s1: 1 },
    ];
    const r0 = [0.0088, 0.008, 0.0072][gd.k];
    tube(g, {
      path: gd.path,
      nv: lod === 0 ? 10 : lod === 1 ? 7 : 5,
      radius: (t) => lerp(r0, 0.0022, Math.pow(t, 0.75)),
      skin: (t) => intervalSkin(t, gIv, 0.7),
      mask: () => [3, 0, 0.5, 0],
      capEnd: 0.06,
      capRows: 4,
      up: gd.up,
    });
    // fimbriae: a dense feathery fringe over the upper/rear half of each ramus, curling toward the tip
    const frames = pathFrames(gd.path, gd.up);
    const dens = lod === 0 ? 1 : lod === 1 ? 0.45 : 0.2;
    const count = Math.round([156, 138, 120][gd.k] * dens * lerp(0.75, 1.2, clamp(fullness / 1.5)));
    const R = rng(1234 + gd.k * 17 + (gd.side > 0 ? 5 : 0));
    const fl = lerp(0.6, 1.25, clamp(fullness / 1.4));
    for (let f = 0; f < count; f++) {
      const t = 0.08 + 0.88 * ((f + R() * 0.8) / count);
      const fi = Math.min(frames.length - 1, Math.round(t * (frames.length - 1)));
      const fr = frames[fi];
      // spread around the dorsal side of the ramus (feather vanes on both sides + some on top)
      // feather barbs: two vanes plus a looser dorsal tuft, swept toward the tip so each ramus reads as a soft frond
      const lane = f % 3;
      const phi = (lane === 0 ? 1 : lane === 1 ? -1 : 0) * (0.6 + R() * 0.8) + (R() - 0.5) * 0.5;
      const dir = fr.n.clone().multiplyScalar(Math.cos(phi)).addScaledVector(fr.b, Math.sin(phi)).addScaledVector(fr.t, 0.5 + R() * 0.45).normalize();
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.95)), 0.6);
      const len = (0.008 + 0.019 * env) * fl * (0.6 + R() * 0.75) * [1, 0.96, 0.9][gd.k];
      const rr = lerp(r0, 0.0022, Math.pow(t, 0.75));
      const p0 = fr.p.clone().addScaledVector(dir, rr * 0.55);
      const curlT = fr.t.clone().multiplyScalar(len * (0.4 + R() * 0.3));
      const side2 = fr.b.clone().multiplyScalar(len * (R() - 0.5) * 0.45);
      const pts: V3[] = [0, 0.33, 0.66, 1].map((q) => {
        const p = p0.clone().addScaledVector(dir, len * q).addScaledVector(curlT, q * q).addScaledVector(side2, q * q * q);
        return [p.x, p.y, p.z];
      });
      const sk = intervalSkin(t, gIv, 0.7);
      const phase = R();
      tube(g, {
        path: resamplePath(pts, lod === 0 ? 6 : 4),
        nv: 4,
        radius: (q) => lerp(0.0015, 0.0005, q) * (lod === 2 ? 2 : lod === 1 ? 1.3 : 1),
        skin: () => sk,
        mask: (q) => [3, q, phase, 1] as Mask,
        capEnd: 0.05,
        capRows: 2,
        up: fr.n,
      });
    }
  }

  // Eyes (separate meshes): on the dorso-lateral head surface.
  const eyeR = 0.0136;
  const eyePos: THREE.Vector3[] = [];
  const eyeDir: THREE.Vector3[] = [];
  for (const side of [1, -1]) {
    const s = 0.074;
    prof(s, 0, pr);
    const th = side > 0 ? 0.9 : TAU - 0.9;
    ringPoint(s, th, pr, pt);
    const p = new THREE.Vector3(pt[0], pt[1], pt[2]);
    // outward normal approximation
    ringPoint(s, th + 0.02, pr, ptm);
    const a = new THREE.Vector3(ptm[0], ptm[1], ptm[2]);
    ringPoint(s + 0.01, th, pr, ptm);
    const b = new THREE.Vector3(ptm[0], ptm[1], ptm[2]);
    const nrm = new THREE.Vector3().crossVectors(a.sub(p), b.sub(p)).normalize();
    if (nrm.dot(new THREE.Vector3(0, p.y, p.z)) < 0) nrm.negate();
    eyePos.push(p.clone().addScaledVector(nrm, -eyeR * 0.35));
    eyeDir.push(nrm.clone().add(new THREE.Vector3(0.45, 0.1, 0)).normalize());
  }

  return { geo: g.build(), rig, eyePos, eyeDir, eyeR };
}

interface Fr {
  p: THREE.Vector3;
  t: THREE.Vector3;
  n: THREE.Vector3;
  b: THREE.Vector3;
}
function pathFrames(path: THREE.Vector3[], up: THREE.Vector3): Fr[] {
  return path.map((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const n = up.clone().sub(t.clone().multiplyScalar(up.dot(t))).normalize();
    const bb = new THREE.Vector3().crossVectors(t, n).normalize();
    return { p: p.clone(), t, n, b: bb };
  });
}

function gillLayout(fullness: number): GillDef[] {
  const out: GillDef[] = [];
  const pr: Prof = { w: 0, ht: 0, hb: 0, fd: 0, fv: 0, nt: 2, nb: 2, palate: 0, cy: 0 };
  const pt = [0, 0, 0];
  // three big feathery rami per side, fanning up-and-back from the back corners of the skull
  const lens = [0.158, 0.14, 0.12].map((l) => l * lerp(0.9, 1.08, clamp(fullness / 1.5)));
  const ths = [0.95, 1.27, 1.58];
  const dirs: V3[] = [
    [-0.56, 0.62, 0.58],
    [-0.62, 0.3, 0.74],
    [-0.68, -0.04, 0.74],
  ];
  for (const side of [1, -1]) {
    for (let k = 0; k < 3; k++) {
      const s = 0.186 + k * 0.011;
      prof(s, 0, pr);
      ringPoint(s, side > 0 ? ths[k] : TAU - ths[k], pr, pt);
      const base = new THREE.Vector3(pt[0], pt[1] * 0.9, pt[2] * 0.86);
      const dir = new THREE.Vector3(dirs[k][0], dirs[k][1], dirs[k][2] * side).normalize();
      const L = lens[k];
      const up = new THREE.Vector3(0, 1, 0.55 * side).normalize();
      const ctrl: V3[] = [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const p = base
          .clone()
          .addScaledVector(dir, L * t)
          .addScaledVector(up, L * 0.14 * Math.sin(Math.PI * t) * (k === 2 ? 0.5 : 1))
          .add(new THREE.Vector3(-L * 0.12 * t * t, 0, 0));
        return [p.x, p.y, p.z];
      });
      out.push({ side, k, base, path: resamplePath(ctrl, 14), up });
    }
  }
  return out;
}

// ───────────────────────────── Shaders ─────────────────────────────

const AX_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  if (m.x > 2.5 && m.x < 3.5 && m.w > 0.5) {
    float f = m.y * m.y;
    float ph = m.z * 6.2831853;
    float t = uAgcTime;
    float amp = uAgcV0.x;
    vec3 w = vec3(sin(t * 2.3 + ph) * 0.35, sin(t * 1.7 + ph * 1.3), cos(t * 1.9 + ph * 0.7));
    w += vec3(0.0, sin(t * 9.0 + ph * 2.0), cos(t * 8.0 + ph)) * uAgcV0.y * 0.8;
    p += w * f * amp * 0.0045;
  }
}
`;

const AX_SURFACE = /* glsl */ `
float agcFleck = 0.0;
float agcFleckId = 0.0;
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  vec3 body = uAgcPal[0]; vec3 body2 = uAgcPal[1]; vec3 belly = uAgcPal[2];
  vec3 finC = uAgcPal[3]; vec3 fin2 = uAgcPal[4]; vec3 acc = uAgcPal[5]; vec3 gill = uAgcPal[6]; vec3 spotC = uAgcPal[7];
  float seed = uAgcPat.w; float pscale = max(uAgcPat.y, 0.3);
  vec3 Q = P + vec3(seed, seed * 0.37, seed * 0.71);
  float bodyL = uAgcF0.w;
  float light = smoothstep(0.25, 0.7, bodyL);
  vec3 blood = vec3(1.0, 0.36, 0.34);
  s.sssCol = mix(blood, gill, 0.35) * mix(0.5, 1.0, light);
  s.sss = uAgcF0.z;
  s.rough = 0.46;
  s.clear = 0.7;

  float dors = part < 0.5 ? cos(vAgcUv.y * 6.2831853) : clamp((P.y + 0.018) / 0.04, -1.0, 1.0);
  float mott = agcFbm(Q * 24.0);
  vec3 top = mix(body, body2, smoothstep(0.38, 0.78, mott) * 0.85);
  vec3 col = mix(belly, top, smoothstep(-0.62, 0.2, dors));
  // warm blood flush through pale skin: cheeks & gill bases, throat, belly
  if (part < 1.5) {
    float sA = vAgcUv.x;
    float flush = light * (0.6 * exp(-pow((sA - 0.19) / 0.06, 2.0)) + 0.45 * smoothstep(0.1, -0.7, dors) * smoothstep(0.1, 0.25, sA) * (1.0 - smoothstep(0.5, 0.6, sA)));
    col = mix(col, col * vec3(1.0, 0.78, 0.78), clamp(flush, 0.0, 1.0) * 0.45);
  }

  // melanophore speckles / blotches
  float spk = uAgcF0.y;
  if (spk > 0.001 && part < 2.5) {
    vec3 c = agcCell(Q * (62.0 / pscale));
    float r = mix(0.16, 0.34, fract(c.z * 91.7));
    float dot1 = (1.0 - smoothstep(r * 0.55, r, c.x)) * step(0.3, c.z);
    vec3 c2 = agcCell(Q * (21.0 / pscale) + 3.1);
    float blot = (1.0 - smoothstep(0.2, 0.42, c2.x)) * step(0.45, c2.z);
    float amt = clamp(dot1 * 0.9 + blot * 0.45, 0.0, 1.0) * spk * smoothstep(-0.75, 0.1, dors) * agcResolve(0.004);
    col = mix(col, spotC, amt);
  }
  // iridophore flecks (glitter)
  float flk = uAgcF0.x;
  if (flk > 0.001 && part < 2.5) {
    vec3 c = agcCell(Q * (150.0 / pscale));
    float f = (1.0 - smoothstep(0.1, 0.24, c.x)) * step(0.5, c.z) * agcResolve(0.0025);
    agcFleck = f * flk * smoothstep(-0.8, 0.0, dors);
    agcFleckId = c.z;
    col = mix(col, acc, agcFleck * 0.75);
  }

  if (part < 0.5) {
    float sAlong = vAgcUv.x;
    float side = pow(abs(sin(vAgcUv.y * 6.2831853)), 3.0) * smoothstep(-0.75, -0.2, dors) * (1.0 - smoothstep(0.35, 0.75, dors));
    // costal grooves
    float cg = smoothstep(0.29, 0.32, sAlong) * (1.0 - smoothstep(0.48, 0.52, sAlong));
    float gph = (sAlong - 0.3) / 0.019;
    float groove = pow(0.5 + 0.5 * cos(gph * 6.2831853), 8.0) * cg * side;
    s.height -= groove * 0.0011 * uAgcF1.w;
    col *= 1.0 - groove * 0.06;
    // fins: lighter, translucent toward the margin, faint radial vessels
    float fin = vAgcMask.y;
    float fm = smoothstep(0.3, 0.95, fin);
    vec3 finCol = mix(finC, fin2, smoothstep(0.6, 1.0, fin));
    float vessels = pow(abs(sin(P.x * 210.0 + agcVn(P * 40.0) * 2.0)), 18.0) * 0.08 * fm;
    col = mix(col, finCol, fm * 0.75) * (1.0 - vessels);
    s.alpha = mix(1.0, uAgcF1.z, smoothstep(0.55, 1.0, fin));
    s.sss += fm * 0.55;
    s.rough = mix(s.rough, 0.3, fm);
    // mouth: palate interior and the lip crease
    vec3 inner = mix(vec3(0.12, 0.035, 0.045), gill * 0.3, 0.3);
    col = mix(col, inner, vAgcMask.z);
    col *= 1.0 - 0.45 * vAgcMask.w;
    s.height -= vAgcMask.w * 0.0008;
    // nostrils: two tiny dimples on the snout
    vec2 nq = vec2(P.x - 0.364, abs(P.z) - 0.024);
    float nost = exp(-dot(nq, nq) / 0.000006) * step(0.0, P.y);
    col *= 1.0 - nost * 0.5;
    s.height -= nost * 0.0006;
  } else if (part < 1.5) {
    // lower jaw: skin outside, tongue inside
    vec3 inner = mix(vec3(0.3, 0.09, 0.1), gill * 0.55, 0.35);
    col = mix(col, inner, vAgcMask.z);
  } else if (part < 2.5) {
    // limbs: lighter underside, blood-warm fingertips on pale morphs
    float tip = vAgcMask.w;
    col = mix(col, mix(belly, blood * 0.9 + 0.1, 0.35 * light), smoothstep(0.6, 1.0, tip) * 0.6);
    s.sss += 0.25 * light;
  } else {
    // gills: stalk grades from body colour into gill colour; fimbriae are blood-rich and glow when backlit
    float fil = vAgcMask.w;
    float along = fil > 0.5 ? 1.0 : smoothstep(0.02, 0.45, vAgcUv.x);
    vec3 gc = mix(gill, gill * 1.18 + vec3(0.02, 0.0, 0.01), fil * vAgcMask.y);
    col = mix(col, gc, along);
    s.sss = mix(s.sss, 1.35, along) * mix(0.55, 1.0, light);
    s.sssCol = mix(s.sssCol, gill * 1.2 + vec3(0.12, 0.0, 0.0), 0.5);
    s.rough = 0.55;
    s.clear = 0.25;
  }
  // subtle skin grain
  s.height += (agcVn(Q * 420.0) - 0.5) * 0.00025 * agcResolve(0.002);
  // living skin: pale morphs are never paper-white — a warm, slightly pink translucent cream
  col *= mix(vec3(1.0), vec3(0.95, 0.86, 0.85), light * 0.8);
  s.sss *= 0.75 + 0.5 * agcFbm(Q * 9.0);
  s.albedo = col;
  s.irid = 0.2 + agcFleck * 2.0;
}
`;

const AX_POST = /* glsl */ `
void agcPost(inout ReflectedLight rl, vec3 N, vec3 V){
  if (agcFleck > 0.001) {
    float tw = 0.5 + 0.5 * sin(agcFleckId * 53.0 + dot(V, vec3(9.0, 13.0, 7.0)) * 4.0 + uAgcTime * 0.6);
    float facing = pow(clamp(dot(N, V), 0.0, 1.0), 1.5);
    float lvl = clamp(dot(uAgcLight, vec3(0.333)), 0.0, 2.0);
    rl.indirectDiffuse += uAgcPal[5] * agcFleck * (0.2 + 1.6 * pow(tw, 8.0)) * facing * lvl * 0.6;
  }
}
`;

// ───────────────────────────── Factory ─────────────────────────────

const _hsl = { h: 0, s: 0, l: 0 };

function fullnessBucket(f: number): number {
  return Math.round(clamp(Number.isFinite(f) ? f : 1, 0.25, 1.5) * 4) / 4;
}

export const createAxolotl: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const fb = fullnessBucket(ap.gillFullness);
  const key = `axolotl|${lod}|${fb}`;
  const tpl = acquire(key, () => buildTemplate(lod, fb), (t) => t.geo.dispose());
  const eyeGeo = acquireEyeGeometry(lod);

  const root = new THREE.Group();
  root.name = 'axolotl';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);

  // ── materials
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap);
  const body = color(ap.bodyColor);
  const acc = color(ap.accentColor);
  const b2 = color(ap.bodyColor2);
  const bodyL = luma(body);
  const accBright = luma(acc) > bodyL * 1.2 + 0.02;
  const speckled = ap.pattern === 'speckled' || ap.pattern === 'spots' || ap.pattern === 'mottled';
  const contrast = clamp(ap.patternContrast ?? 0.5);
  const fleck = accBright ? clamp(0.25 + (ap.iridescence ?? 0) * 1.6) * (speckled ? 1 : 0.5) : 0;
  const speck = speckled ? clamp(contrast * 1.25) : 0;
  u.uAgcPal.value[7].copy(accBright ? b2.clone().multiplyScalar(0.42) : acc);
  // gills are blood-rich: push their saturation (and deepen them a touch on pale morphs) so the three feathery
  // pairs read clearly against the body even at tank-view distance; dark morphs keep their dusky gills
  const gillC = u.uAgcPal.value[6];
  gillC.getHSL(_hsl);
  gillC.setHSL(_hsl.h, clamp(_hsl.s * 1.35 + 0.12), _hsl.l * lerp(1, 0.86, smoothstep(0.3, 0.7, bodyL)));
  const trans = clamp(ap.translucency ?? 0.15);
  u.uAgcF0.value.set(fleck, speck, lerp(0.12, 0.95, smoothstep(0.08, 0.6, bodyL)) * (0.7 + trans), bodyL);
  u.uAgcF1.value.set(0, 1, lerp(0.62, 0.42, smoothstep(0.1, 0.6, bodyL)), 1);
  const matOpts = {
    name: 'axolotl',
    fx,
    u,
    surface: AX_SURFACE,
    vertex: AX_VERTEX,
    post: AX_POST,
    params: {
      roughness: 0.5,
      clearcoat: 0.32,
      clearcoatRoughness: 0.4,
      sheen: 0.25,
      sheenRoughness: 0.6,
      sheenColor: color(ap.bellyColor).lerp(new THREE.Color(1, 0.8, 0.8), 0.3),
      iridescence: clamp((ap.iridescence ?? 0) * 0.6),
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 420] as [number, number],
    } satisfies THREE.MeshPhysicalMaterialParameters,
  };
  const skinMat = createCritterMaterial(matOpts);
  const finMat = createCritterMaterial({ ...matOpts, params: { ...matOpts.params, transparent: true, depthWrite: true } });
  const mesh = makeSkinned(tpl.geo, [skinMat, finMat], rigI, 1.5);
  mesh.castShadow = lod === 0;
  mesh.receiveShadow = lod < 2;
  inner.add(mesh);

  // ── eyes
  const eyeC = color(ap.eyeColor, '#111111');
  const eyeDark = luma(eyeC) < 0.06;
  const albinoEye = !eyeDark && eyeC.r > eyeC.b * 1.25;
  const irisRing = eyeDark ? (accBright ? acc.clone().multiplyScalar(0.55) : new THREE.Color(0.05, 0.045, 0.04)) : eyeC.clone().multiplyScalar(1.15);
  const eyeMat = createEyeMaterial(fx, u, {
    iris: eyeDark ? eyeC.clone().lerp(irisRing, 0.35) : eyeC,
    pupil: albinoEye ? new THREE.Color(0.35, 0.04, 0.06) : new THREE.Color(0.004, 0.004, 0.005),
    sclera: eyeDark ? eyeC : eyeC.clone().multiplyScalar(0.85),
    ring: irisRing,
    irisAngle: 0.95,
    pupilAngle: albinoEye ? 0.42 : 0.5,
    pupilAspect: 1,
    striation: 0.4,
    catchlight: 1.1,
  });
  const headBone = rigI.byName.head;
  const headRest = new THREE.Vector3(X0 - S_HEAD, 0, 0);
  const eyes: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const e = new THREE.Mesh(eyeGeo, eyeMat.mat);
    e.position.copy(tpl.eyePos[i]).sub(headRest);
    e.scale.setScalar(tpl.eyeR);
    e.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tpl.eyeDir[i]);
    e.castShadow = false;
    headBone.add(e);
    eyes.push(e);
  }

  root.userData.groundOffset = AXOLOTL_GROUND;
  root.userData.speciesVisual = 'axolotl';

  // ── animation state
  const B = rigI.byName;
  const seed = ((ap.patternSeed ?? 1) % 1000) / 1000;
  const restCurl = (seed - 0.5) * 0.5;
  const st = {
    walkPhase: seed * TAU,
    tailPhase: 0,
    walkW: 0,
    swimW: 0,
    restW: 1,
    gape: 0,
    flick: 0,
    lookYaw: 0,
    lookPitch: 0,
    tilt: 0,
    lower: 0,
    belly: 0,
    wave: 1,
  };
  const ptr: [number, number, number] = [0, 0, 0];
  const legNames = ['FR', 'FL', 'HR', 'HL'];
  const legPhaseOff = [0, Math.PI, Math.PI, 0]; // diagonal couplets: FR+HL, FL+HR
  const gillBones: THREE.Bone[][] = [];
  for (const side of ['R', 'L']) for (let k = 0; k < 3; k++) gillBones.push([B[`g${side}${k}a`], B[`g${side}${k}b`]]);

  // selection: set by the renderer (not while the camera already follows this animal); drawn as a thin rim

  const sel = { on: false };

  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    const speed = Math.max(0, rt.speedBL || 0);
    const tinfo = tankInfo(rt.tankId, time);
    const hOverride = rt.ai?.galleryHeight;
    const heightAbove =
      typeof hOverride === 'number' ? hOverride : tinfo ? (rt.pos.y - tinfo.substrateY) / Math.max(0.01, rt.lengthM) - AXOLOTL_GROUND : pose === 'rest' ? 0 : 1;
    const nearBottom = heightAbove < 0.12;
    const bottomPose = pose === 'rest' || pose === 'hiding' || pose === 'guard' || pose === 'feed' || pose === 'court' || pose === 'display' || pose === 'swim' || pose === 'hover' || pose === 'spawn';
    const walking = !dead && nearBottom && bottomPose && speed > 0.02 && speed < 1.1 && pose !== 'rest';
    const swimming = !dead && !walking && (speed > 0.05 || !nearBottom || pose === 'startle' || pose === 'surface_breath');
    const resting = !dead && !walking && !swimming;
    st.walkW = damp(st.walkW, walking ? 1 : 0, 5, dt);
    st.swimW = damp(st.swimW, swimming ? 1 : 0, 4, dt);
    st.restW = damp(st.restW, resting || dead ? 1 : 0, 3, dt);
    const live = dead ? 0 : 1;

    st.walkPhase += dt * TAU * (0.35 + speed * 3.4) * st.walkW;
    const tailHz = 0.5 + speed * 1.6 + (pose === 'startle' ? 2.5 : 0);
    st.tailPhase += dt * TAU * tailHz * live;

    // ── spine: lateral waves + turn bend
    const bend = clamp(rt.bend || 0, -1, 1) * live;
    const swimAmp = st.swimW * (0.16 + Math.min(speed, 3) * 0.1);
    const idleSway = (0.035 + 0.02 * noise1(time * 0.2, seed * 10)) * live;
    const wlk = st.walkW;
    const w0 = Math.sin(st.walkPhase);
    const tailBones = [B.tail1, B.tail2, B.tail3, B.tail4, B.tail5];
    const bodyYaw = (k: number) => {
      // k: 0 = hips … 5 = tail5
      const travel = Math.sin(st.tailPhase - k * 0.85) * swimAmp * (0.25 + k * 0.22);
      const idle = Math.sin(time * 0.7 + seed * 6 - k * 0.6) * idleSway * (0.3 + k * 0.25);
      const walkWave = w0 * 0.11 * wlk * (k === 0 ? -1 : 0.4);
      const curl = restCurl * st.restW * (0.12 + k * 0.05);
      return travel + idle + walkWave + curl - bend * 0.18;
    };
    setRot(B.hips, 0, bodyYaw(0), 0);
    for (let k = 0; k < 5; k++) {
      const pitch = -0.04 * st.restW * (k > 2 ? 1 : 0) + Math.sin(st.tailPhase * 0.5 - k) * 0.02 * st.swimW;
      setRot(tailBones[k], 0, bodyYaw(k + 1), pitch);
    }
    setRot(B.chest, 0, w0 * 0.1 * wlk - bend * 0.14 + Math.sin(st.tailPhase + 1.2) * swimAmp * 0.12, 0);
    setRot(B.root, 0, 0, 0);

    // ── head look / curious tilt
    let tYaw = 0;
    let tPitch = 0;
    let tTilt = 0;
    const curiousBehavior = /inspect|curious|glass|player|watch|beg/i.test(rt.behavior || '');
    if (!dead && pointerInCreatureFrame(rt, ptr)) {
      const dist = Math.hypot(ptr[0], ptr[1], ptr[2]);
      if (ptr[0] > -0.2 && dist < 8) {
        const k = smoothstep(8, 2, dist) * (curiousBehavior ? 1 : 0.7);
        tYaw = clamp(Math.atan2(-ptr[2], Math.max(0.2, ptr[0])), -0.5, 0.5) * k;
        tPitch = clamp(Math.atan2(ptr[1], Math.max(0.3, Math.hypot(ptr[0], ptr[2]))), -0.25, 0.35) * k;
        tTilt = (noise1(time * 0.15, seed * 3) > 0 ? 1 : -1) * 0.22 * k;
      }
    } else if (curiousBehavior) tTilt = Math.sin(time * 0.4 + seed * 9) * 0.2;
    st.lookYaw = damp(st.lookYaw, tYaw, 3, dt);
    st.lookPitch = damp(st.lookPitch, tPitch + st.restW * 0.06, 3, dt);
    st.tilt = damp(st.tilt, tTilt, 2.5, dt);
    const headSwim = -Math.sin(st.tailPhase + 0.4) * swimAmp * 0.1;
    setRot(B.neck, 0, -w0 * 0.05 * wlk + st.lookYaw * 0.4 - bend * 0.12, st.lookPitch * 0.4);
    setRot(B.head, st.tilt, st.lookYaw * 0.6 + headSwim - w0 * 0.04 * wlk - bend * 0.1, st.lookPitch * 0.6 + Math.sin(time * 0.9 + seed) * 0.012 * live, 'YZX');

    // ── jaw (gulp / suction strike) with a tiny breathing throat motion
    st.gape = damp(st.gape, clamp(rt.mouthOpen || 0), 18, dt);
    setRot(B.jaw, 0, 0, -st.gape * 0.42 - (0.5 + 0.5 * Math.sin(time * 2.2 + seed * 7)) * 0.02 * live);

    // ── body height: rest lowers the belly onto the substrate
    st.lower = damp(st.lower, st.restW * 0.009, 3, dt);
    B.root.position.set(rigI.restPos[0].x, rigI.restPos[0].y - st.lower + Math.sin(st.walkPhase * 2) * 0.0015 * wlk, rigI.restPos[0].z);

    // ── limbs
    for (let li = 0; li < 4; li++) {
      const nm = legNames[li];
      const front = li < 2;
      const side = nm[1] === 'R' ? 1 : -1;
      const ph = st.walkPhase + legPhaseOff[li];
      const fore = Math.cos(ph);
      const liftW = Math.max(0, -Math.sin(ph));
      // walk
      const wYaw = side * (front ? 0.5 : 0.45) * fore;
      const wLift = liftW * 0.5;
      // rest sprawl: front legs forward-out, hind legs trailing back
      const rYaw = side * (front ? 0.28 : -0.55);
      const rLift = front ? 0.22 : 0.3;
      // swim: fold limbs back along the flanks
      const sYaw = side * (front ? -1.15 : -1.25);
      const sLift = 0.32;
      const idle = (1 - wlk) * (1 - st.swimW);
      const yaw = wYaw * wlk + rYaw * st.restW * idle + sYaw * st.swimW + (1 - st.restW) * idle * side * (front ? 0.1 : -0.15);
      const lift = wLift * wlk + rLift * st.restW * idle + sLift * st.swimW;
      const sb = B[`${nm}_s`];
      const eb = B[`${nm}_e`];
      const wb = B[`${nm}_w`];
      setRot(sb, -side * lift, yaw, 0, 'YXZ');
      const elbow = liftW * 0.35 * wlk + st.swimW * 0.25 - st.restW * idle * 0.15;
      setRot(eb, -side * elbow, 0, 0);
      // keep palms flat & fingers forward while planted
      setRot(wb, side * (lift + elbow) * (1 - st.swimW) * 0.9, -yaw * 0.75 * (1 - st.swimW), 0, 'YXZ');
    }

    // ── gills: flare at rest, pinned back when swimming fast, sway, flick pulses
    st.flick = damp(st.flick, clamp(rt.gillFlick || 0), 14, dt);
    const flare = (0.18 * st.restW + 0.08 - Math.min(speed, 2.5) * 0.09 * st.swimW + (rt.pose === 'feed' ? 0.1 : 0) + st.gape * 0.15) * live;
    for (let gi = 0; gi < 6; gi++) {
      const side = gi < 3 ? 1 : -1;
      const k = gi % 3;
      const [ga, gb] = gillBones[gi];
      const sway = (Math.sin(time * 1.25 + k * 0.9 + seed * 5 + (side > 0 ? 0 : 1.7)) * 0.07 + noise1(time * 0.5 + gi, seed) * 0.04) * live;
      const flick = st.flick * (0.55 - k * 0.08);
      // flick: sweep forward (+X rotation of the tip) then relax
      setRot(ga, side * (flare * 0.8 + sway * 0.5), side * (-flick * 0.9 - flare * 0.4) , sway * 0.6 + flare * 0.35 - (dead ? 0.35 : 0), 'YXZ');
      setRot(gb, side * sway * 0.4, -side * flick * 0.45, sway * 0.5 + flare * 0.2);
    }
    u.uAgcV0.value.x = (0.9 + st.flick * 2.2 + Math.min(speed, 2) * 0.5) * live;
    u.uAgcV0.value.y = st.flick * live;

    // ── belly fullness morph (fed / gravid)
    st.belly = damp(st.belly, clamp(rt.belly || 0), 1.5, dt);
    if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[0] = st.belly;

    // ── colour
    u.uAgcCI.value = rt.colorIntensity ?? 1;
    u.uAgcBoost.value = 0;
    u.uAgcHi.value = sel.on ? 0.85 + 0.15 * Math.sin(time * 3) : 0;
  };

  const obj: CreatureObject = {
    root,
    update,
    pickRadius: 0.55,
    setHighlight(on) {
      sel.on = on;
      u.uAgcHi.value = on ? 1 : 0;
    },
    dispose() {
      skinMat.dispose();
      finMat.dispose();
      eyeMat.mat.dispose();
      rigI.skeleton.dispose();
      release(key);
      releaseEyeGeometry(lod);
      root.removeFromParent();
    },
  };
  return obj;
};
