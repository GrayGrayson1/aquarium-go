/**
 * Lined seahorse (Hippocampus erectus) — procedural, skinned, animated.
 *
 * Anatomy: upright S-curved body lofted along a planar spine with a heptagonal armoured trunk and a square tail,
 * segmented bony rings with blunt tubercles at every ridge, a horse-like head (separate loft along the snout axis)
 * with a tubular snout, a low five-pointed coronet, independently rotating eyes, a translucent rayed dorsal fin that
 * flutters as a travelling wave, tiny pectoral fans, a male brood pouch (morph target: swells with `rt.belly`),
 * fine white "lined" markings on the neck and back, and colour morphs straight from `appearance`.
 *
 * Motion: upright drifting propulsion (dorsal/pectoral flutter), prehensile tail curl from straight to a tight
 * spiral (`rt.tailCurl`), a loop around a hitching post when `pose === 'hitched'`, snick-feeding head flick on
 * `rt.mouthOpen`, courtship brightening/pouch pumping, independent eye scanning (`rt.eyeL` / `rt.eyeR`).
 *
 * Local space: body upright along +Y, facing +X, height 1 unit (coronet top y≈+0.40 → tail tip y≈-0.60 when the
 * tail hangs relaxed), origin at the trunk centre of mass. root.userData.hitchPoint = local centre of the tail loop.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, intervalSkin, resamplePath, skin1, sheet, tube, type SkinInterval, type V3 } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { acquireEyeGeometry, createEyeMaterial, releaseEyeGeometry } from './common/eyes';
import { applyAppearance, color, luma } from './common/palette';
import { clamp, damp, lerp, noise1, smoothstep, smoothTable, TAU } from './common/math';
import { reproInfo } from './common/live';

// ───────────────────────────── Main body (neck → trunk → tail) ─────────────────────────────

const SPINE_CTRL: V3[] = [
  [-0.01, 0.29, 0],
  [-0.034, 0.225, 0],
  [-0.03, 0.15, 0],
  [-0.008, 0.06, 0],
  [0.0, -0.03, 0],
  [-0.012, -0.115, 0],
  [-0.038, -0.2, 0],
  [-0.056, -0.3, 0],
  [-0.058, -0.4, 0],
  [-0.045, -0.49, 0],
  [-0.02, -0.56, 0],
  [0.008, -0.605, 0],
];
const S_TAIL = 0.4; // where the prehensile tail begins
// ventral depth, dorsal depth, half width
const DV_T: [number, number][] = [[0, 0.036], [0.06, 0.04], [0.12, 0.05], [0.18, 0.068], [0.24, 0.083], [0.3, 0.088], [0.36, 0.078], [0.42, 0.052], [0.5, 0.033], [0.6, 0.026], [0.7, 0.02], [0.8, 0.015], [0.9, 0.0105], [0.97, 0.0065], [1, 0.003]];
const DB_T: [number, number][] = [[0, 0.036], [0.06, 0.034], [0.12, 0.034], [0.18, 0.037], [0.24, 0.041], [0.3, 0.043], [0.36, 0.041], [0.42, 0.034], [0.5, 0.029], [0.6, 0.024], [0.7, 0.019], [0.8, 0.0145], [0.9, 0.01], [0.97, 0.006], [1, 0.003]];
const W_T: [number, number][] = [[0, 0.03], [0.06, 0.031], [0.12, 0.035], [0.18, 0.045], [0.24, 0.054], [0.3, 0.058], [0.36, 0.054], [0.42, 0.04], [0.5, 0.03], [0.6, 0.024], [0.7, 0.019], [0.8, 0.0145], [0.9, 0.01], [0.97, 0.006], [1, 0.003]];

/** Bony-ring phase along the body: 11 trunk rings, ~36 tail rings that shorten toward the tip. */
function ringPhase(s: number): number {
  const t0 = 0.12;
  if (s < t0) return (s - t0) / 0.028;
  if (s < S_TAIL) return ((s - t0) / (S_TAIL - t0)) * 11;
  return 11 + 36 * Math.pow((s - S_TAIL) / (1 - S_TAIL), 0.82);
}

function polyR(phi: number, n: number, rot: number): number {
  const seg = TAU / n;
  let a = (phi + rot) % seg;
  if (a < 0) a += seg;
  return Math.cos(Math.PI / n) / Math.cos(a - seg / 2);
}

interface HeadProf {
  ht: number;
  hb: number;
  w: number;
}
// head loft along the snout axis: s_h 0 = snout tip → 1 = back of head
const HEAD_AXIS: V3[] = [
  [0.205, 0.262, 0],
  [0.16, 0.266, 0],
  [0.115, 0.272, 0],
  [0.075, 0.283, 0],
  [0.035, 0.296, 0],
  [0.0, 0.303, 0],
  [-0.045, 0.302, 0],
];
const HHT: [number, number][] = [[0, 0.009], [0.03, 0.0138], [0.1, 0.0142], [0.28, 0.015], [0.36, 0.019], [0.44, 0.03], [0.52, 0.045], [0.6, 0.058], [0.7, 0.068], [0.8, 0.071], [0.9, 0.066], [1, 0.05]];
const HHB: [number, number][] = [[0, 0.0088], [0.03, 0.0132], [0.1, 0.0136], [0.28, 0.0142], [0.36, 0.018], [0.44, 0.027], [0.52, 0.037], [0.62, 0.046], [0.72, 0.051], [0.82, 0.05], [0.92, 0.045], [1, 0.036]];
const HW: [number, number][] = [[0, 0.0078], [0.03, 0.0118], [0.1, 0.0115], [0.28, 0.012], [0.36, 0.015], [0.44, 0.023], [0.52, 0.031], [0.6, 0.035], [0.7, 0.037], [0.8, 0.036], [0.9, 0.033], [1, 0.028]];

interface SeaTemplate {
  body: THREE.BufferGeometry;
  fins: THREE.BufferGeometry;
  rig: RigDef;
  eyePos: THREE.Vector3[];
  eyeR: number;
  tailBones: string[];
  headPivot: THREE.Vector3;
}

function buildTemplate(lod: RenderLod): SeaTemplate {
  const nu = lod === 0 ? 300 : lod === 1 ? 150 : 60;
  const nv = lod === 0 ? 56 : lod === 1 ? 32 : 14;
  const spine = resamplePath(SPINE_CTRL, nu);
  const T: THREE.Vector3[] = [];
  const N: THREE.Vector3[] = [];
  for (let i = 0; i < nu; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(nu - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    T.push(t);
    N.push(new THREE.Vector3(-t.y, t.x, 0)); // ventral (front) direction in the sagittal plane
  }
  const Z = new THREE.Vector3(0, 0, 1);
  const at = (s: number) => Math.min(nu - 1, Math.max(0, Math.round(s * (nu - 1))));

  // ── rig
  const rig = new RigDef();
  const P = (s: number): V3 => {
    const p = spine[at(s)];
    return [p.x, p.y, 0];
  };
  rig.add('root', null, P(0.3));
  rig.add('chest', 'root', P(0.3));
  rig.add('neck', 'chest', P(0.19));
  const headPivot = new THREE.Vector3(...P(0.07));
  rig.add('head', 'neck', P(0.07));
  rig.add('jaw', 'head', [0.185, 0.263, 0]);
  const tailS: number[] = [S_TAIL];
  const nTail = 13;
  for (let k = 1; k < nTail; k++) tailS.push(S_TAIL + (1 - S_TAIL) * Math.pow(k / nTail, 0.92));
  const tailBones: string[] = [];
  let parent = 'root';
  tailS.forEach((s, k) => {
    const name = `tail${k}`;
    rig.add(name, parent, P(s));
    tailBones.push(name);
    parent = name;
  });
  const bi = (n: string) => rig.idx(n);
  const iv: SkinInterval[] = [
    { bone: bi('head'), s0: 0, s1: 0.07 },
    { bone: bi('neck'), s0: 0.07, s1: 0.19 },
    { bone: bi('chest'), s0: 0.19, s1: 0.3 },
    { bone: bi('root'), s0: 0.3, s1: S_TAIL },
  ];
  tailS.forEach((s, k) => iv.push({ bone: bi(tailBones[k]), s0: s, s1: k + 1 < tailS.length ? tailS[k + 1] : 1 }));

  const g = new GeoBuilder();
  const tmp = new THREE.Vector3();
  const tmpM = new THREE.Vector3();

  // ── body loft
  g.grid({ nu, nv, wrapV: true, orient: 'ring' }, (i, j, smp) => {
    const s = i / (nu - 1);
    const phi = (j / nv) * TAU; // 0 = ventral (+N), π/2 = +Z, π = dorsal
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    let dv = smoothTable(DV_T, s);
    const db = smoothTable(DB_T, s);
    const w = smoothTable(W_T, s);
    const tailness = smoothstep(S_TAIL - 0.04, S_TAIL + 0.06, s);
    // armour: heptagonal trunk → square tail, ridges at corners, raised plates with knobs at ring centres
    const p7 = polyR(phi, 7, Math.PI / 7);
    const p4 = polyR(phi, 4, Math.PI / 4);
    const poly = lerp(p7, p4, tailness);
    const rp = ringPhase(s);
    const fr = rp - Math.floor(rp);
    const groove = Math.exp(-((Math.min(fr, 1 - fr) / 0.13) ** 2));
    const nCorners = tailness > 0.5 ? 4 : 7;
    const segA = TAU / nCorners;
    let ca = (phi + (tailness > 0.5 ? Math.PI / 4 : Math.PI / 7)) % segA;
    const cornerDist = Math.min(ca, segA - ca) / segA;
    const corner = Math.exp(-((cornerDist / 0.11) ** 2));
    const knob = corner * Math.exp(-(((fr - 0.5) / 0.17) ** 2));
    const armour = s > 0.1 ? 1 : smoothstep(0.02, 0.1, s);
    let r = lerp(1, poly, 0.5 * armour) * (1 - 0.028 * groove * armour) * (1 + (0.03 * corner + 0.09 * knob * knob) * armour);
    // brood pouch region (smooth skin, no rings), ventral lower trunk
    const pouchW = Math.exp(-(((s - 0.395) / 0.055) ** 2)) * smoothstep(0.1, 0.85, c);
    r = lerp(r, 1.03, pouchW * 0.85);
    const pouchSwell = Math.exp(-(((s - 0.4) / 0.06) ** 2)) * Math.max(0, c) ** 1.5;
    const d = c >= 0 ? dv : db;
    const base = spine[i];
    tmp.copy(base).addScaledVector(N[i], c * d * r).addScaledVector(Z, sn * w * r);
    tmpM.copy(tmp).addScaledVector(N[i], pouchSwell * 0.05).addScaledVector(Z, sn * pouchSwell * 0.012);
    smp.x = tmp.x;
    smp.y = tmp.y;
    smp.z = tmp.z;
    smp.mx = tmpM.x;
    smp.my = tmpM.y;
    smp.mz = tmpM.z;
    smp.u = s;
    smp.v = j / nv;
    smp.mask = [0, knob * armour, pouchW, groove * armour];
    smp.skin = intervalSkin(s, iv, 0.85);
    void dv;
  });

  // ── head loft along the snout axis
  const hnu = lod === 0 ? 110 : lod === 1 ? 56 : 24;
  const hnv = lod === 0 ? 40 : lod === 1 ? 24 : 12;
  const axis = resamplePath(HEAD_AXIS, hnu);
  const headB = bi('head');
  const jawB = bi('jaw');
  const down = new THREE.Vector3(0, -1, 0);
  const hp: HeadProf = { ht: 0, hb: 0, w: 0 };
  g.grid({ nu: hnu, nv: hnv, wrapV: true, orient: 'ring' }, (i, j, smp) => {
    const sh = i / (hnu - 1);
    const a = axis[Math.max(0, i - 1)];
    const b = axis[Math.min(hnu - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const n = down.clone().sub(t.clone().multiplyScalar(down.dot(t))).normalize(); // throat
    const bb = new THREE.Vector3().crossVectors(t, n).normalize();
    const phi = (j / hnv) * TAU; // 0 = throat (down), π = top
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    const tipDome = sh < 0.012 ? Math.sqrt(Math.max(0.0, 1 - (1 - sh / 0.012) ** 2)) : 1;
    hp.ht = smoothTable(HHT, sh) * tipDome;
    hp.hb = smoothTable(HHB, sh) * tipDome;
    hp.w = smoothTable(HW, sh) * tipDome;
    // top keel toward the coronet, cheek (operculum) bulge on the lower sides
    const keel =
      Math.exp(-(((phi - Math.PI) / 0.35) ** 2)) * smoothstep(0.5, 0.8, sh) * 0.12 +
      Math.exp(-(((phi - Math.PI) / 0.55) ** 2)) * Math.exp(-(((sh - 0.86) / 0.075) ** 2)) * 0.36;
    const cheek = Math.exp(-(((Math.abs(phi - Math.PI) - 2.1) / 0.5) ** 2)) * smoothstep(0.55, 0.75, sh) * (1 - smoothstep(0.92, 1, sh)) * 0.1;
    const up = c >= 0 ? hp.hb : hp.ht; // c>=0 → throat side
    const nExp = c >= 0 ? 2.2 : 2.4;
    const yy = Math.sign(c) * Math.pow(Math.abs(c), 2 / nExp) * up * (1 + keel);
    const zz = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / 2.2) * hp.w * (1 + cheek);
    tmp.copy(axis[i]).addScaledVector(n, yy).addScaledVector(bb, zz);
    smp.x = tmp.x;
    smp.y = tmp.y;
    smp.z = tmp.z;
    smp.u = sh;
    smp.v = j / hnv;
    const mouth = 1 - smoothstep(0.004, 0.02, sh);
    smp.mask = [1, mouth, sh, 0];
    smp.skin = sh < 0.05 ? [jawB, headB, 0, 0, 1 - smoothstep(0.02, 0.05, sh), smoothstep(0.02, 0.05, sh), 0, 0] : skin1(headB);
  });

  // ── coronet crown: five low blunt points atop the head crest
  tube(g, {
    path: resamplePath([[-0.024, 0.378, 0], [-0.022, 0.392, 0], [-0.02, 0.402, 0]], lod === 0 ? 10 : 5),
    nv: lod === 0 ? 30 : 12,
    radius: (t, a) => lerp(0.0135, 0.0105, t) * (1 + 0.38 * smoothstep(0.3, 1, t) * Math.pow(Math.max(0, Math.cos(a * 5 + 0.3)), 4)),
    aspect: () => [1.15, 0.85],
    capEnd: 0.05,
    capRows: 4,
    up: new THREE.Vector3(1, 0, 0),
    skin: () => skin1(headB),
    mask: (t) => [2, t, 0, 0],
  });
  // eye spines / brow knobs
  for (const side of [1, -1]) {
    tube(g, {
      path: resamplePath([[0.06, 0.328, side * 0.024], [0.065, 0.337, side * 0.026], [0.07, 0.341, side * 0.026]], 5),
      nv: lod === 0 ? 10 : 6,
      radius: (t) => lerp(0.0065, 0.0028, t),
      capEnd: 0.1,
      capRows: 3,
      skin: () => skin1(headB),
      mask: () => [2, 0.8, 0, 0],
    });
  }

  // ── fins (separate translucent double-sided geometry)
  const f = new GeoBuilder();
  // dorsal fin along the back at the trunk/tail junction
  const dnA = lod === 0 ? 40 : lod === 1 ? 20 : 8;
  const dnB = lod === 0 ? 14 : lod === 1 ? 8 : 4;
  const dS0 = 0.335;
  const dS1 = 0.47;
  sheet(f, dnA, dnB, (a, b, smp) => {
    const s = lerp(dS0, dS1, a);
    const i = at(s);
    const back = N[i].clone().negate();
    const dbv = smoothTable(DB_T, s);
    const hgt = 0.056 * Math.pow(Math.sin(Math.PI * clamp(a * 0.96 + 0.02)), 0.55) * (0.85 + 0.15 * a);
    // fin leans back (toward the tail) as it rises
    tmp.copy(spine[i]).addScaledVector(back, dbv * 0.8 + hgt * b).addScaledVector(T[i], hgt * b * 0.35);
    smp.x = tmp.x;
    smp.y = tmp.y;
    smp.z = tmp.z;
    smp.u = a;
    smp.v = b;
    smp.mask = [5, b, a, 0];
    smp.skin = intervalSkin(s, iv, 0.85);
  });
  // pectoral fans behind the gill openings
  for (const side of [1, -1]) {
    const base = new THREE.Vector3(-0.012, 0.262, side * 0.034);
    sheet(f, lod === 0 ? 16 : 8, lod === 0 ? 10 : 5, (a, b, smp) => {
      const ang = lerp(-0.9, 0.95, a);
      const len = 0.036 * (0.75 + 0.25 * Math.cos(ang * 0.9));
      const dir = new THREE.Vector3(-Math.cos(ang) * 0.85, Math.sin(ang), side * 0.5).normalize();
      tmp.copy(base).add(new THREE.Vector3(0, a * 0.018 - 0.009, 0)).addScaledVector(dir, len * b);
      smp.x = tmp.x;
      smp.y = tmp.y;
      smp.z = tmp.z;
      smp.u = a;
      smp.v = b;
      smp.mask = [6, b, a, side];
      smp.skin = skin1(headB);
    });
  }
  // tiny anal fin in front of the tail base
  {
    const s = 0.455;
    const i = at(s);
    sheet(f, 8, 5, (a, b, smp) => {
      const ss = s + (a - 0.5) * 0.02;
      const ii = at(ss);
      tmp.copy(spine[ii]).addScaledVector(N[ii], smoothTable(DV_T, ss) * 0.85 + 0.012 * b * Math.sin(Math.PI * a)).addScaledVector(T[i], 0.004 * b);
      smp.x = tmp.x;
      smp.y = tmp.y;
      smp.z = tmp.z;
      smp.u = a;
      smp.v = b;
      smp.mask = [7, b, a, 0];
      smp.skin = intervalSkin(ss, iv, 0.85);
    });
  }

  // eyes
  const eyeR = 0.0175;
  const eyePos = [new THREE.Vector3(0.066, 0.314, 0.0315), new THREE.Vector3(0.066, 0.314, -0.0315)];
  return { body: g.build(), fins: f.build(), rig, eyePos, eyeR, tailBones, headPivot };
}

// ───────────────────────────── Shaders ─────────────────────────────

const SEA_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  vec3 P = vAgcRest;
  vec3 body = uAgcPal[0]; vec3 body2 = uAgcPal[1]; vec3 belly = uAgcPal[2];
  vec3 acc = uAgcPal[5];
  float seed = uAgcPat.w;
  float kind = uAgcPat.x; float contrast = uAgcPat.z;
  vec3 Q = P + vec3(seed, seed * 0.61, seed * 0.29);
  float lined = step(4.5, kind) * step(kind, 5.5);
  float mottled = step(2.5, kind) * step(kind, 3.5);
  // ventral lighter, dorsal darker; soft saddles and mottling
  float ventral = part < 0.5 ? cos(vAgcUv.y * 6.2831853) : (part < 1.5 ? -cos(vAgcUv.y * 6.2831853) * 0.6 : 0.0);
  float mott = agcFbm(Q * 20.0);
  vec3 col = mix(body, body2, smoothstep(0.35, 0.8, mott) * 0.8);
  col = mix(col, belly, smoothstep(0.2, 0.95, ventral) * 0.55);
  // saddles across the back (darker bands every few rings)
  if (part < 0.5) {
    float sad = smoothstep(0.55, 0.9, sin(vAgcUv.x * 52.0 + agcVn(Q * 6.0) * 3.0)) * smoothstep(0.0, -0.8, ventral);
    col = mix(col, body2 * 0.8, sad * 0.35);
  }
  // fine white lines + dots on neck/back (the "lined" seahorse)
  float lineMask = 0.0;
  if (part < 1.5) {
    float around = vAgcUv.y * 6.2831853;
    float along = vAgcUv.x;
    float wob = (agcVn(vec3(along * (part < 0.5 ? 40.0 : 9.0), seed, 0.0)) - 0.5) * (part < 0.5 ? 0.35 : 0.2);
    float lines = abs(sin((around + wob) * 7.0));
    float thin = 1.0 - smoothstep(0.02, 0.16, lines);
    float breaks = smoothstep(0.35, 0.55, agcVn(vec3(along * 55.0, around * 3.0, seed)));
    float region = part < 0.5 ? (1.0 - smoothstep(0.35, 0.55, along)) * smoothstep(-0.2, -0.95, ventral * 0.5 + 0.5 * cos(around)) : smoothstep(0.55, 0.75, along);
    region = part < 0.5 ? (1.0 - smoothstep(0.33, 0.5, along)) * (0.35 + 0.65 * smoothstep(0.3, -0.6, ventral)) : region * 0.8;
    lineMask = thin * breaks * region;
    vec3 dc = agcCell(Q * 170.0);
    float dots = (1.0 - smoothstep(0.12, 0.22, dc.x)) * step(0.62, dc.z) * (0.5 + 0.5 * smoothstep(0.4, -0.3, ventral));
    lineMask = max(lineMask, dots * 0.8);
    lineMask *= agcResolve(0.0022) * (0.3 + 0.7 * lined) * clamp(contrast * 1.4, 0.0, 1.0);
    col = mix(col, acc, lineMask);
  }
  // pinto patches
  if (mottled > 0.5) {
    float pn = agcFbm(Q * 7.0 + 2.0);
    float pinto = smoothstep(0.52, 0.6, pn);
    col = mix(col, acc, pinto * contrast);
  }
  // bony ring shading: knobs catch light, grooves darker
  float knob = part < 0.5 ? vAgcMask.y : 0.0;
  float groove = part < 0.5 ? vAgcMask.w : 0.0;
  col *= 1.0 - groove * 0.18;
  col = mix(col, col * 1.18 + 0.02, knob * 0.5);
  s.height += knob * 0.0012 - groove * 0.0009;
  // brood pouch: smooth, paler, slightly translucent
  float pouch = part < 0.5 ? vAgcMask.z * uAgcF0.x : 0.0;
  col = mix(col, mix(belly, acc, 0.35) * 1.05, pouch * 0.6);
  // coronet & spines a touch lighter at the tips
  if (part > 1.5 && part < 2.5) col = mix(col, mix(col, acc, 0.3), smoothstep(0.7, 1.0, vAgcMask.y) * 0.5);
  // snout tip / mouth
  if (part > 0.5 && part < 1.5) col = mix(col, vec3(0.05, 0.03, 0.03), vAgcMask.y * 0.85);
  // fine skin texture (tiny tubercles / cirri bases)
  float grain = agcVn(Q * 380.0);
  s.height += (grain - 0.5) * 0.00035 * agcResolve(0.0018);
  col *= 0.94 + 0.12 * grain;
  s.albedo = col;
  s.rough = 0.58 - knob * 0.12;
  s.clear = 0.25;
  s.sss = uAgcMat.z * 0.55 + pouch * 0.6;
  s.sssCol = mix(vec3(1.0, 0.55, 0.4), body * 1.4, 0.4);
}
`;

const FIN_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  float b = vAgcMask.y;   // 0 at base → 1 at margin
  float a = vAgcMask.z;   // along base
  vec3 fin = uAgcPal[3]; vec3 fin2 = uAgcPal[4]; vec3 body = uAgcPal[0];
  float nRays = part < 5.5 ? 19.0 : (part < 6.5 ? 11.0 : 5.0);
  float ray = pow(abs(sin(a * 3.14159 * nRays)), 18.0);
  ray *= smoothstep(0.96, 0.7, b);
  vec3 col = mix(fin, fin2, smoothstep(0.4, 1.0, b));
  col = mix(col, body * 1.1, (1.0 - smoothstep(0.0, 0.25, b)) * 0.6);
  // dark marginal band on the dorsal fin (Hippocampus erectus)
  float band = part < 5.5 ? smoothstep(0.72, 0.8, b) * (1.0 - smoothstep(0.86, 0.94, b)) : 0.0;
  col = mix(col, body * 0.35, band * 0.55);
  col = mix(col, body * 0.9, ray * 0.55);
  s.albedo = col;
  s.alpha = clamp(0.18 + ray * 0.45 + band * 0.4 + (1.0 - smoothstep(0.0, 0.2, b)) * 0.5, 0.0, 0.92) * uAgcF1.z;
  s.rough = 0.35;
  s.sss = 0.9;
  s.sssCol = fin * 1.2 + vec3(0.1);
  s.clear = 0.0;
}
`;

const FIN_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float b = m.y; float a = m.z;
  float t = uAgcTime;
  if (part > 4.5 && part < 5.5) {
    // dorsal fin: travelling undulation from front to back
    float amp = uAgcV0.x;
    float w = sin(a * 14.0 - uAgcV0.y) * amp * pow(b, 1.3);
    p.z += w * 0.012;
  } else if (part > 5.5 && part < 6.5) {
    float amp = uAgcV0.z;
    float w = sin(a * 7.0 - uAgcV0.w + m.w) * amp * pow(b, 1.2);
    p.z += w * 0.01 * m.w;
    p.x += w * 0.004;
  } else if (part > 6.5) {
    p.z += sin(t * 20.0 + a * 6.0) * 0.002 * b;
  }
}
`;

// ───────────────────────────── Factory ─────────────────────────────

export const createSeahorse: CreatureFactory = (args) => {
  const { appearance: ap, fx, lod } = args;
  const key = `seahorse|${lod}`;
  const tpl = acquire(key, () => buildTemplate(lod), (t) => {
    t.body.dispose();
    t.fins.dispose();
  });
  const eyeGeo = acquireEyeGeometry(lod);
  const root = new THREE.Group();
  root.name = 'lined_seahorse';
  const inner = new THREE.Group();
  root.add(inner);
  const rigI = instantiateRig(tpl.rig);
  for (const b of rigI.roots) inner.add(b);

  const isFemale = args.creature?.sex === 'female';
  const u = createCritterUniforms(fx);
  applyAppearance(u, ap);
  u.uAgcF0.value.set(isFemale ? 0 : 1, 0, 0, 0);
  u.uAgcF1.value.set(0, 0, 1, 0);
  const bodyMat = createCritterMaterial({
    name: 'seahorse',
    fx,
    u,
    surface: SEA_SURFACE,
    params: { roughness: 0.58, clearcoat: 0.2, clearcoatRoughness: 0.5, sheen: 0.15, sheenRoughness: 0.7, sheenColor: color(ap.accentColor).multiplyScalar(0.5) },
  });
  const finMat = createCritterMaterial({
    name: 'seahorse-fin',
    fx,
    u,
    surface: FIN_SURFACE,
    vertex: FIN_VERTEX,
    bump: 0,
    params: { roughness: 0.35, transparent: true, side: THREE.DoubleSide, depthWrite: false },
  });
  const body = makeSkinned(tpl.body, bodyMat, rigI, 1.8);
  body.castShadow = lod === 0;
  body.receiveShadow = lod < 2;
  inner.add(body);
  const fins = makeSkinned(tpl.fins, finMat, rigI, 1.8);
  fins.renderOrder = 2;
  inner.add(fins);

  // eyes: golden iris with radiating dark striations, small dark pupil
  const eyeC = color(ap.eyeColor, '#b89a4a');
  const eyeMat = createEyeMaterial(fx, u, {
    iris: eyeC,
    pupil: new THREE.Color(0.01, 0.008, 0.006),
    sclera: color(ap.bodyColor).multiplyScalar(0.9),
    ring: eyeC.clone().multiplyScalar(0.45),
    irisAngle: 0.78,
    pupilAngle: 0.32,
    pupilAspect: 1,
    striation: 1,
    catchlight: 1,
  });
  const headBone = rigI.byName.head;
  const eyes: THREE.Object3D[] = [];
  for (let i = 0; i < 2; i++) {
    const pivot = new THREE.Object3D();
    pivot.position.copy(tpl.eyePos[i]).sub(tpl.headPivot);
    headBone.add(pivot);
    const e = new THREE.Mesh(eyeGeo, eyeMat.mat);
    e.scale.setScalar(tpl.eyeR);
    pivot.add(e);
    eyes.push(pivot);
  }

  root.userData.groundOffset = 0.6;
  // coronet / snout reach ~0.42 above the origin: keeps the head under the waterline (see TankCreatures)
  root.userData.topOffset = 0.42;
  root.userData.speciesVisual = 'lined_seahorse';
  const hitchPoint = new THREE.Vector3(0.02, -0.52, 0);
  root.userData.hitchPoint = hitchPoint;

  const B = rigI.byName;
  const tailBones = tpl.tailBones.map((n) => B[n]);
  const nT = tailBones.length;
  const seed = ((ap.patternSeed ?? 3) % 1000) / 1000;
  const st = {
    curl: 0.25,
    hitch: 0,
    flutterPh: 0,
    pecPh: 0,
    flick: 0,
    eyeL: 0,
    eyeR: 0,
    sacL: 0,
    sacR: 0,
    nextSac: 0,
    pouch: 0,
    boost: 0,
    pump: 0,
  };
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const rootInv = new THREE.Matrix4();

  // selection: set by the renderer (not while the camera already follows this animal); drawn as a thin rim

  const sel = { on: false };

  const update = (rt: CreatureRuntime, dt: number, time: number) => {
    u.uAgcTime.value = time;
    const pose = rt.pose;
    const dead = pose === 'dead';
    const live = dead ? 0 : 1;
    const speed = Math.max(0, rt.speedBL || 0);
    const hitched = pose === 'hitched';
    st.hitch = damp(st.hitch, hitched ? 1 : 0, 3, dt);
    const curlTarget = dead ? 0.1 : hitched ? Math.max(0.92, rt.tailCurl ?? 1) : clamp(rt.tailCurl ?? 0.25);
    st.curl = damp(st.curl, curlTarget, 2.2, dt);

    // ── tail: straight → spiral (weights grow toward the tip); hitched → an even loop around a post
    const sway = Math.sin(time * 0.6 + seed * 7) * 0.05 * live * (1 - st.hitch * 0.7);
    for (let k = 0; k < nT; k++) {
      const x = (k + 1) / nT;
      const spiral = Math.pow(x, 1.6) * 1.9;
      const loop = x < 0.35 ? 0.08 : 0.82;
      const w = lerp(spiral, loop, st.hitch);
      const base = 0.03 * live; // natural slight forward hook
      const ang = base + st.curl * w * 0.62 + sway * (0.4 + x) * 0.3 + Math.sin(time * 1.1 - k * 0.5 + seed) * 0.015 * live * (1 - st.hitch);
      setRot(tailBones[k], 0, Math.sin(time * 0.5 - k * 0.3 + seed) * 0.02 * live * (1 - st.hitch), ang);
    }

    // ── posture: upright drift, gentle rocking; speed leans the body slightly forward
    const lean = -Math.min(speed, 1) * 0.12;
    const rock = Math.sin(time * 0.8 + seed * 4) * 0.035 * live;
    setRot(B.root, 0, 0, 0);
    setRot(B.chest, Math.sin(time * 0.45 + seed) * 0.02 * live, 0, lean * 0.4 + rock * 0.5);

    // ── snick feeding: rapid upward head flick
    st.flick = damp(st.flick, clamp(rt.mouthOpen || 0), 25, dt);
    const nod = Math.sin(time * 0.7 + seed * 2) * 0.03 * live;
    setRot(B.neck, 0, Math.sin(time * 0.33 + seed * 5) * 0.06 * live, lean * 0.3 + nod * 0.5 + st.flick * 0.18);
    setRot(B.head, 0, Math.sin(time * 0.41 + seed * 3) * 0.05 * live, nod + st.flick * 0.42);
    setRot(B.jaw, 0, 0, -st.flick * 0.25);

    // ── fins
    const fl = clamp(rt.flutter ?? 0.3) * live;
    const courting = pose === 'court' || pose === 'display' || pose === 'spawn';
    st.flutterPh += dt * TAU * (1.5 + fl * 9 + (courting ? 3 : 0) + speed * 6) * live;
    st.pecPh += dt * TAU * (1.2 + fl * 7 + speed * 4) * live;
    u.uAgcV0.value.set((0.25 + fl * 0.9 + (courting ? 0.3 : 0)) * live, st.flutterPh, (0.2 + fl * 0.8) * live, st.pecPh);

    // ── eyes: independent scanning (runtime look + small saccades)
    if (time > st.nextSac) {
      st.nextSac = time + 0.6 + Math.abs(noise1(time, seed * 9)) * 2.2;
      st.sacL = (Math.random() - 0.5) * 0.5;
      st.sacR = (Math.random() - 0.5) * 0.5;
    }
    st.eyeL = damp(st.eyeL, clamp((rt.eyeL || 0) + st.sacL, -0.8, 0.8) * live, 9, dt);
    st.eyeR = damp(st.eyeR, clamp((rt.eyeR || 0) + st.sacR, -0.8, 0.8) * live, 7, dt);
    // eye 0 is +Z (right), eye 1 is −Z (left); gaze rests outward-forward
    setRot(eyes[0], 0.1, 0.55 + st.eyeR, 0, 'YXZ');
    setRot(eyes[1], -0.1, Math.PI - 0.55 - st.eyeL, 0, 'YXZ');

    // ── brood pouch (males): resting size, pregnancy swell, courtship / birth pumping
    let pouchT = 0;
    if (!isFemale) {
      const ri = reproInfo(args.creature?.id, time);
      const pregnant = ri ? ri.stage === 'pregnant' : false;
      pouchT = 0.18 + 0.82 * Math.max(clamp(rt.belly || 0), pregnant ? 0.35 + 0.65 * ri!.progress : 0);
      if (courting) {
        st.pump += dt * TAU * 1.2;
        pouchT += Math.max(0, Math.sin(st.pump)) * 0.25;
      }
      if (pose === 'spawn') pouchT += Math.max(0, Math.sin(time * 5)) * 0.2;
    }
    st.pouch = damp(st.pouch, pouchT, 3, dt);
    if (body.morphTargetInfluences) body.morphTargetInfluences[0] = st.pouch;

    // ── colour: courtship brightening, stress fade
    st.boost = damp(st.boost, courting ? clamp((rt.colorIntensity ?? 1) * 1.1) : 0, 1.5, dt);
    u.uAgcBoost.value = st.boost;
    u.uAgcCI.value = rt.colorIntensity ?? 1;
    u.uAgcF1.value.z = dead ? 0.6 : 1;
    u.uAgcHi.value = sel.on ? 0.85 + 0.15 * Math.sin(time * 3) : 0;

    // ── hitch point: centre of the tail loop, in root-local space
    if (st.hitch > 0.01) {
      const a = tailBones[Math.floor(nT * 0.62)];
      const b2 = tailBones[nT - 1];
      root.updateWorldMatrix(true, true);
      rootInv.copy(root.matrixWorld).invert();
      a.getWorldPosition(tmpV).applyMatrix4(rootInv);
      b2.getWorldPosition(tmpV2).applyMatrix4(rootInv);
      hitchPoint.copy(tmpV).add(tmpV2).multiplyScalar(0.5);
    }
  };

  return {
    root,
    update,
    pickRadius: 0.5,
    setHighlight(on) {
      sel.on = on;
      u.uAgcHi.value = on ? 1 : 0;
    },
    dispose() {
      bodyMat.dispose();
      finMat.dispose();
      eyeMat.mat.dispose();
      rigI.skeleton.dispose();
      release(key);
      releaseEyeGeometry(lod);
      root.removeFromParent();
    },
  } satisfies CreatureObject;
};

void luma;
