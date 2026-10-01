/**
 * Caridean shrimp family — cherry (Neocaridina davidi), Amano (Caridina multidentata), skunk cleaner
 * (Lysmata amboinensis) and peppermint (Lysmata wurdemanni). One parametric, skinned build per species × LOD.
 *
 * Anatomy: laterally-compressed carapace with a serrated rostrum, six overlapping abdominal segments with pleura,
 * tail fan (telson + paired uropods), stalked eyes, antennules, long antennae, antennal scales, 2 pairs of tiny
 * picking chelipeds + 3 pairs of walking legs, 5 pairs of swimmerets, and a clutch of eggs under the abdomen when
 * berried. Appendages are animated in the vertex shader around their pivots (walking wave, grazing pick,
 * metachronal swimmeret beat, antenna waving, tail-fan spread); the abdomen is skinned for the escape tail-flick.
 *
 * Local space: head +X, length 1 = rostrum tip → telson tip, feet on y = -root.userData.groundOffset.
 * OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureFactory, CreatureObject } from '../types';
import type { CreatureRuntime } from '@/types';
import type { RenderLod } from '../../lod';
import { GeoBuilder, ellipsoid, intervalSkin, resamplePath, skin1, tube, type Mask, type SkinInterval, type V3 } from './common/geo';
import { RigDef, instantiateRig, makeSkinned, setRot } from './common/rig';
import { acquire, release } from './common/cache';
import { critterTiers } from './common/tiers';
import { createCritterMaterial, createCritterUniforms } from './common/materials';
import { acquireEyeGeometry, createEyeMaterial, releaseEyeGeometry } from './common/eyes';
import { applyAppearance, color } from './common/palette';
import { clamp, damp, lerp, noise1, rng, smoothstep, smoothTable, TAU } from './common/math';
import { latestEvent, reproInfo } from './common/live';

export interface ShrimpSpec {
  id: string;
  /** 0 cherry, 1 amano, 2 cleaner, 3 peppermint */
  kind: number;
  antLen: number;
  legLen: number;
  rostrum: number;
  hump: number;
  translucent: boolean;
  bodyH: number;
  /** Body width multiplier (crayfish/mantis are broader). */
  bodyW?: number;
  /** Big claws (crayfish): claw length, 0 = none. */
  claw?: number;
  /** Raptorial smashing clubs (mantis shrimp). */
  raptorial?: boolean;
  /** Eye radius / stalk length multipliers. */
  eye?: number;
  stalk?: number;
  /** Antennal scale size multiplier. */
  scale?: number;
}

export const SHRIMP_SPECS: Record<string, ShrimpSpec> = {
  cherry_shrimp: { id: 'cherry_shrimp', kind: 0, antLen: 0.95, legLen: 1, rostrum: 0.13, hump: 1, translucent: false, bodyH: 1 },
  amano_shrimp: { id: 'amano_shrimp', kind: 1, antLen: 0.75, legLen: 0.95, rostrum: 0.1, hump: 0.75, translucent: true, bodyH: 0.9 },
  cleaner_shrimp: { id: 'cleaner_shrimp', kind: 2, antLen: 1.55, legLen: 1.35, rostrum: 0.12, hump: 0.65, translucent: false, bodyH: 0.88 },
  peppermint_shrimp: { id: 'peppermint_shrimp', kind: 3, antLen: 1.3, legLen: 1.25, rostrum: 0.11, hump: 0.72, translucent: true, bodyH: 0.88 },
  dwarf_crayfish: { id: 'dwarf_crayfish', kind: 4, antLen: 0.8, legLen: 0.72, rostrum: 0.07, hump: 0.25, translucent: false, bodyH: 0.95, bodyW: 1.35, claw: 0.32, eye: 0.9, stalk: 0.8, scale: 0.8 },
  peacock_mantis_shrimp: { id: 'peacock_mantis_shrimp', kind: 5, antLen: 0.42, legLen: 0.45, rostrum: 0.03, hump: 0.08, translucent: false, bodyH: 0.62, bodyW: 1.55, raptorial: true, eye: 1.25, stalk: 2.1, scale: 1.9 },
};

const HT: [number, number][] = [[0, 0.05], [0.08, 0.07], [0.25, 0.084], [0.4, 0.085], [0.5, 0.088], [0.58, 0.085], [0.7, 0.066], [0.85, 0.045], [1, 0.026]];
const HB: [number, number][] = [[0, 0.045], [0.1, 0.064], [0.25, 0.074], [0.4, 0.08], [0.5, 0.086], [0.6, 0.08], [0.7, 0.065], [0.85, 0.046], [1, 0.026]];
const WD: [number, number][] = [[0, 0.028], [0.1, 0.044], [0.25, 0.051], [0.4, 0.049], [0.55, 0.044], [0.7, 0.035], [0.85, 0.025], [1, 0.016]];
const SEG = [0.4, 0.5, 0.6, 0.69, 0.78, 0.88, 1.0];

// part ids
const P_BODY = 0;
const P_ROSTRUM = 1;
const P_STALK = 2;
const P_ANT = 3;
const P_ANTULE = 4;
const P_SCALE = 5;
const P_LEG = 6;
const P_CHELA = 7;
const P_SWIM = 8;
const P_FAN = 9;
const P_EGG = 10;

interface ShrimpTemplate {
  geo: THREE.BufferGeometry;
  eggs: THREE.BufferGeometry;
  rig: RigDef;
  eyePos: THREE.Vector3[];
  eyeR: number;
  ground: number;
}

function buildShrimp(spec: ShrimpSpec, lod: RenderLod): ShrimpTemplate {
  const R = rng(spec.kind * 97 + 11);
  const hump = spec.hump;
  const ctrl: V3[] = [
    [0.31, 0.0, 0],
    [0.2, 0.012, 0],
    [0.08, 0.02 * hump + 0.004, 0],
    [-0.04, 0.028 * hump, 0],
    [-0.15, 0.016 * hump, 0],
    [-0.25, -0.014 * hump, 0],
    [-0.34, -0.052 * hump, 0],
    [-0.41, -0.08 * hump, 0],
  ];
  const nu = lod === 0 ? 120 : lod === 1 ? 60 : 26;
  const nv = lod === 0 ? 36 : lod === 1 ? 20 : 10;
  const spine = resamplePath(ctrl, nu);
  const T: THREE.Vector3[] = [];
  const U: THREE.Vector3[] = [];
  for (let i = 0; i < nu; i++) {
    const t = spine[Math.min(nu - 1, i + 1)].clone().sub(spine[Math.max(0, i - 1)]).normalize();
    T.push(t);
    U.push(new THREE.Vector3(t.y, -t.x, 0)); // dorsal "up" in the sagittal plane (t points tail-ward)
  }
  const at = (s: number) => Math.min(nu - 1, Math.max(0, Math.round(s * (nu - 1))));
  const Z = new THREE.Vector3(0, 0, 1);

  const rig = new RigDef();
  const P = (s: number): V3 => {
    const p = spine[at(s)];
    return [p.x, p.y, 0];
  };
  rig.add('root', null, P(0.25));
  const abNames: string[] = [];
  let par = 'root';
  for (let k = 0; k < 6; k++) {
    const n = `ab${k + 1}`;
    rig.add(n, par, P(SEG[k]));
    abNames.push(n);
    par = n;
  }
  rig.add('fan', par, P(1));
  const bi = (n: string) => rig.idx(n);
  const iv: SkinInterval[] = [{ bone: bi('root'), s0: 0, s1: SEG[0] }];
  for (let k = 0; k < 6; k++) iv.push({ bone: bi(abNames[k]), s0: SEG[k], s1: SEG[k + 1] });
  const rootB = bi('root');
  const fanB = bi('fan');

  const g = new GeoBuilder();
  const tr = spec.translucent;
  const G_BODY = tr ? 1 : 0;
  const G_APP = 1;
  const tmp = new THREE.Vector3();
  const H = spec.bodyH;

  // ── body loft (carapace + abdomen)
  g.grid({ nu, nv, wrapV: true, orient: 'ring', group: G_BODY }, (i, j, smp) => {
    const s = i / (nu - 1);
    const phi = (j / nv) * TAU; // 0 = dorsal
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    const front = s < 0.06 ? Math.sqrt(Math.max(0, 1 - (1 - s / 0.06) ** 2)) : 1;
    const back = s > 0.975 ? Math.sqrt(Math.max(0, 1 - ((s - 0.975) / 0.025) ** 2)) : 1;
    const dm = front * back;
    let ht = smoothTable(HT, s) * H * dm;
    let hb = smoothTable(HB, s) * H * dm;
    const w = smoothTable(WD, s) * dm * (spec.bodyW ?? 1);
    // overlapping abdominal plates: each segment flares slightly toward its rear edge
    let plate = 1;
    let segEdge = 0;
    if (s > SEG[0]) {
      let k = 0;
      while (k < 5 && s > SEG[k + 1]) k++;
      const f = (s - SEG[k]) / (SEG[k + 1] - SEG[k]);
      plate = 1 + 0.045 * smoothstep(0.1, 0.95, f) - 0.03 * smoothstep(0.95, 1, f);
      segEdge = Math.exp(-(((1 - f) / 0.07) ** 2)) + Math.exp(-((f / 0.05) ** 2));
    }
    // carapace edge (branchiostegite) bulge
    const gillBulge = s < SEG[0] ? 1 + 0.05 * Math.exp(-(((s - 0.22) / 0.12) ** 2)) * Math.abs(sn) : 1;
    ht *= plate;
    hb *= plate * (s > 0.4 ? 1.0 : 1);
    const yy = (c >= 0 ? ht : hb) * Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.3);
    const zz = w * plate * gillBulge * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / 2.1);
    tmp.copy(spine[i]).addScaledVector(U[i], yy).addScaledVector(Z, zz);
    smp.x = tmp.x;
    smp.y = tmp.y;
    smp.z = tmp.z;
    smp.u = s;
    smp.v = j / nv;
    smp.mask = [P_BODY, segEdge, s < SEG[0] ? 1 : 0, 0];
    smp.skin = intervalSkin(s, iv, 0.8);
  });
  const frontTop = spine[at(0.02)].clone().addScaledVector(U[at(0.02)], 0.035 * H);

  // ── rostrum: laterally flattened blade with dorsal teeth
  const rl = spec.rostrum;
  tube(g, {
    path: resamplePath(
      [
        [frontTop.x - 0.03, frontTop.y, 0],
        [frontTop.x + rl * 0.35, frontTop.y + 0.012, 0],
        [frontTop.x + rl, frontTop.y + 0.018, 0],
      ],
      lod === 0 ? 18 : 7,
    ),
    nv: lod === 0 ? 10 : 6,
    radius: (t, a) => lerp(0.02, 0.003, Math.pow(t, 0.8)) * (1 + (Math.cos(a) > 0.6 ? 0.5 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 7)), 3) * (1 - t) : 0)),
    aspect: () => [1, 0.28],
    capEnd: 0.05,
    capRows: 3,
    up: new THREE.Vector3(0, 1, 0),
    skin: () => skin1(rootB),
    mask: (t) => [P_ROSTRUM, t, 0, 0],
    group: G_BODY,
  });

  // ── eyes on stalks
  const eyeR = 0.021 * (spec.eye ?? 1);
  const eyePos: THREE.Vector3[] = [];
  const stk = spec.stalk ?? 1;
  for (const side of [1, -1]) {
    const b0: V3 = [0.28, 0.02, side * 0.02];
    const b1: V3 = spec.raptorial ? [0.31 + 0.02 * stk, 0.03 + 0.03 * stk, side * 0.035] : [0.28 + 0.025 * stk, 0.02 + 0.01 * stk, side * (0.02 + 0.024 * stk)];
    tube(g, {
      path: resamplePath([b0, [0.302, 0.03, side * 0.036], b1], 5),
      nv: lod === 0 ? 10 : 6,
      radius: (t) => lerp(0.017, 0.013, t),
      skin: () => skin1(rootB),
      mask: () => [P_STALK, 0, 0, 0],
      group: G_BODY,
    });
    eyePos.push(new THREE.Vector3(b1[0] + 0.008, b1[1] + 0.004, b1[2] + side * 0.008));
  }

  // ── antennules (two short flagella per side) & long antennae & antennal scales
  const antNv = lod === 0 ? 5 : 4;
  const antRows = lod === 0 ? 28 : lod === 1 ? 14 : 6;
  let antIndex = 0;
  for (const side of [1, -1]) {
    const base = new THREE.Vector3(0.312, 0.016, side * 0.016);
    for (let f = 0; f < 2; f++) {
      const L = 0.3 + f * 0.08;
      const dir = new THREE.Vector3(0.85, 0.35 + f * 0.25, side * (0.3 + f * 0.25)).normalize();
      const pts: V3[] = [0, 0.33, 0.66, 1].map((q) => {
        const p = base.clone().addScaledVector(dir, L * q).add(new THREE.Vector3(-0.05 * q * q, 0.03 * q * q, side * 0.04 * q * q));
        return [p.x, p.y, p.z];
      });
      const idx = antIndex++;
      tube(g, {
        path: resamplePath(pts, antRows / 2 + 2),
        nv: antNv,
        radius: (t) => lerp(0.0065, 0.0012, Math.pow(t, 0.6)),
        skin: () => skin1(rootB),
        mask: (t) => [P_ANTULE, t, idx, side],
        aux: [base.x, base.y, base.z, L],
        capEnd: 0.02,
        capRows: 2,
        group: G_APP,
      });
    }
    // long antenna: forward, then sweeping back over the body
    const abase = new THREE.Vector3(0.305, 0.0, side * 0.03);
    const AL = spec.antLen;
    const apts: V3[] = [];
    for (let q = 0; q <= 8; q++) {
      const t = q / 8;
      const ang = lerp(0.15, 2.6, Math.pow(t, 1.2)) * (spec.kind === 2 ? 0.55 : 1);
      const rad = AL * 0.35;
      const x = abase.x + Math.sin(ang) * rad * (0.6 + t) * 0.9 + (spec.kind === 2 ? AL * 0.35 * t : 0);
      const y = abase.y + 0.02 + t * AL * (spec.kind === 2 ? 0.18 : 0.08) + (1 - Math.cos(ang)) * 0.02;
      const z = abase.z + side * (t * AL * 0.28);
      apts.push([x, y, z]);
    }
    const idx = antIndex++;
    tube(g, {
      path: resamplePath(apts, antRows + 4),
      nv: antNv,
      radius: (t) => lerp(0.0085, 0.0011, Math.pow(t, 0.45)) * (spec.kind === 2 ? 1.15 : 1),
      skin: () => skin1(rootB),
      mask: (t) => [P_ANT, t, idx, side],
      aux: [abase.x, abase.y, abase.z, AL],
      capEnd: 0.01,
      capRows: 2,
      group: G_APP,
    });
    // antennal scale (scaphocerite)
    tube(g, {
      path: resamplePath([[0.29, 0.0, side * 0.034], [0.29 + 0.05 * (spec.scale ?? 1), 0.004, side * (0.04 + 0.01 * ((spec.scale ?? 1) - 1))], [0.29 + 0.1 * (spec.scale ?? 1), 0.008 + 0.02 * ((spec.scale ?? 1) - 1), side * (0.042 + 0.03 * ((spec.scale ?? 1) - 1))]], 6),
      nv: lod === 0 ? 8 : 5,
      radius: (t) => lerp(0.02, 0.006, Math.pow(t, 1.4)) * (spec.scale ?? 1),
      aspect: () => [0.18, 1],
      up: new THREE.Vector3(0, 0, side),
      capEnd: 0.05,
      capRows: 2,
      skin: () => skin1(rootB),
      mask: () => [P_SCALE, 0, 0, 0],
      group: G_APP,
    });
  }

  // ── legs: 2 pairs of small chelipeds + 3 pairs of walking legs
  const legX = [0.25, 0.2, 0.14, 0.075, 0.01];
  const LL = spec.legLen;
  const ground = 0.075 + 0.085 * LL;
  const legNv = lod === 0 ? 7 : lod === 1 ? 5 : 4;
  for (let k = 0; k < 5; k++) {
    for (const side of [1, -1]) {
      const x = legX[k];
      const base = new THREE.Vector3(x, -0.05 * H, side * 0.026);
      const chela = k < 2;
      if (k === 0 && spec.claw) {
        // big claw: merus → carpus → chela with a fixed finger and a movable dactyl
        const cl = spec.claw;
        const p1 = new THREE.Vector3(x + 0.04, base.y - 0.01, side * 0.07);
        const p2 = new THREE.Vector3(x + 0.04 + cl * 0.35, base.y - 0.02, side * 0.09);
        const p3 = new THREE.Vector3(x + 0.05 + cl * 0.6, base.y - 0.03, side * 0.075);
        tube(g, {
          path: resamplePath([[base.x, base.y, base.z], [p1.x, p1.y, p1.z], [p2.x, p2.y, p2.z], [p3.x, p3.y, p3.z]], lod === 0 ? 14 : 7),
          nv: legNv + 2,
          radius: (t) => lerp(0.012, 0.02, smoothstep(0.4, 1, t)),
          aspect: () => [0.8, 1],
          skin: () => skin1(rootB),
          mask: (t) => [11, t * 0.6, k, side],
          aux: [base.x, base.y, base.z, 0],
          capEnd: 0.02,
          capRows: 2,
          group: G_APP,
        });
        // palm + fingers
        ellipsoid(g, { center: [p3.x + cl * 0.1, p3.y, p3.z], radii: [cl * 0.2, 0.026, 0.03], nu: lod === 0 ? 10 : 6, nv: lod === 0 ? 14 : 8, skin: skin1(rootB), mask: [11, 0.75, k, side], aux: [base.x, base.y, base.z, 0], group: G_APP });
        for (const f of [0, 1]) {
          const fy = f === 0 ? -0.008 : 0.008;
          const a0 = new THREE.Vector3(p3.x + cl * 0.26, p3.y + fy * 1.3, p3.z);
          tube(g, {
            path: resamplePath([[a0.x, a0.y, a0.z], [a0.x + cl * 0.12, a0.y + fy * 0.4, a0.z - side * 0.004], [a0.x + cl * 0.24, a0.y - fy * 0.3, a0.z - side * 0.01]], 6),
            nv: lod === 0 ? 8 : 5,
            radius: (t) => lerp(0.012, 0.004, t),
            skin: () => skin1(rootB),
            mask: (t) => [11, 0.8 + t * 0.2, f + 2, side],
            aux: [a0.x, a0.y, a0.z, f],
            capEnd: 0.05,
            capRows: 2,
            group: G_APP,
          });
        }
        continue;
      }
      if (k === 0 && spec.raptorial) {
        // raptorial appendage folded under the head like a jackknife: merus back, club (dactyl heel) forward
        const b = new THREE.Vector3(0.26, -0.035 * H, side * 0.03);
        const knee = new THREE.Vector3(0.2, -0.075 * H, side * 0.055);
        const club = new THREE.Vector3(0.3, -0.085 * H, side * 0.05);
        tube(g, {
          path: resamplePath([[b.x, b.y, b.z], [0.23, -0.06 * H, side * 0.045], [knee.x, knee.y, knee.z]], 8),
          nv: legNv + 2,
          radius: (t) => lerp(0.013, 0.017, t),
          skin: () => skin1(rootB),
          mask: (t) => [12, t * 0.5, 0, side],
          aux: [b.x, b.y, b.z, 0],
          capEnd: 0.05,
          capRows: 2,
          group: G_APP,
        });
        tube(g, {
          path: resamplePath([[knee.x, knee.y, knee.z], [0.25, -0.083 * H, side * 0.053], [club.x, club.y, club.z]], 8),
          nv: legNv + 4,
          radius: (t) => 0.012 + 0.012 * Math.exp(-(((t - 0.25) / 0.2) ** 2)),
          skin: () => skin1(rootB),
          mask: (t) => [12, 0.5 + t * 0.5, 1, side],
          aux: [knee.x, knee.y, knee.z, 1],
          capEnd: 0.1,
          capStart: 0.1,
          capRows: 3,
          group: G_APP,
        });
        continue;
      }
      if (spec.raptorial && k === 1) continue;
      let pts: V3[];
      if (chela) {
        pts = [
          [base.x, base.y, base.z],
          [x + 0.03, base.y - 0.035, side * 0.05],
          [x + 0.05 + k * 0.01, base.y - 0.07 * LL, side * 0.056],
          [x + 0.075 + k * 0.012, -ground + 0.035, side * 0.05],
        ];
      } else {
        const fx = [0.08, 0.005, -0.09][k - 2] * LL;
        pts = [
          [base.x, base.y, base.z],
          [x + fx * 0.3, base.y - 0.012, side * (0.07 * LL)],
          [x + fx * 0.65, base.y - 0.008 - 0.012 * LL, side * (0.11 * LL)],
          [x + fx * 0.85, (base.y - ground) * 0.5 - 0.02, side * (0.13 * LL)],
          [x + fx, -ground, side * (0.145 * LL)],
        ];
      }
      tube(g, {
        path: resamplePath(pts, lod === 0 ? 14 : 7),
        nv: legNv,
        radius: (t) => lerp(chela ? 0.0075 : 0.008, chela ? 0.003 : 0.0024, t) * (1 + 0.12 * Math.exp(-(((t - 0.45) / 0.06) ** 2))) * (spec.kind >= 2 ? 0.85 : 1),
        skin: () => skin1(rootB),
        mask: (t) => [chela ? P_CHELA : P_LEG, t, k, side],
        aux: [base.x, base.y, base.z, 0],
        capEnd: 0.03,
        capRows: 2,
        group: G_APP,
      });
      if (chela && lod < 2) {
        // tiny brush-claw at the tip
        const tip = pts[3];
        ellipsoid(g, {
          center: [tip[0] + 0.004, tip[1] - 0.002, tip[2]],
          radii: [0.011, 0.006, 0.006],
          nu: 6,
          nv: 8,
          skin: skin1(rootB),
          mask: [P_CHELA, 1, k, side],
          aux: [base.x, base.y, base.z, 0],
          group: G_APP,
        });
      }
    }
  }

  // ── swimmerets (pleopods) under abdominal segments 1–5
  for (let k = 0; k < 5; k++) {
    const s = (SEG[k] + SEG[k + 1]) / 2;
    const i = at(s);
    const hb = smoothTable(HB, s) * H;
    for (const side of [1, -1]) {
      const base = spine[i].clone().addScaledVector(U[i], -hb * 0.8).add(new THREE.Vector3(0, 0, side * 0.018));
      const tip = base.clone().add(new THREE.Vector3(-0.025, -0.055, side * 0.012));
      tube(g, {
        path: resamplePath([[base.x, base.y, base.z], [(base.x + tip.x) / 2, (base.y + tip.y) / 2, (base.z + tip.z) / 2], [tip.x, tip.y, tip.z]], lod === 0 ? 7 : 4),
        nv: lod === 0 ? 6 : 4,
        radius: (t) => lerp(0.008, 0.004, t) * (1 + 0.6 * Math.sin(Math.PI * t)),
        aspect: () => [1, 0.3],
        up: new THREE.Vector3(1, 0, 0),
        skin: () => skin1(bi(abNames[k])),
        mask: (t) => [P_SWIM, t, k, side],
        aux: [base.x, base.y, base.z, 0],
        capEnd: 0.05,
        capRows: 2,
        group: G_APP,
      });
    }
  }

  // ── tail fan: telson + two uropods per side (flattened blades in the horizontal plane)
  const tb = spine[nu - 1].clone();
  const tdir = T[nu - 1].clone();
  const blades: [number, number, number][] = [
    [0, 0.18, 0.034],
    [0.3, 0.17, 0.05],
    [-0.3, 0.17, 0.05],
    [0.58, 0.155, 0.046],
    [-0.58, 0.155, 0.046],
  ];
  blades.forEach(([ang, len, wid], bIdx) => {
    const d = tdir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).normalize();
    const p0 = tb.clone().addScaledVector(d, -0.01);
    const p2 = tb.clone().addScaledVector(d, len);
    tube(g, {
      path: resamplePath([[p0.x, p0.y, p0.z], [(p0.x + p2.x) / 2, (p0.y + p2.y) / 2 + 0.004, (p0.z + p2.z) / 2], [p2.x, p2.y + 0.006, p2.z]], lod === 0 ? 10 : 5),
      nv: lod === 0 ? 10 : 6,
      radius: (t) => wid * Math.pow(Math.sin(Math.PI * clamp(0.12 + t * 0.85)), 0.6) * (bIdx === 0 ? 1 - 0.5 * t : 1),
      aspect: () => [0.12, 1],
      up: new THREE.Vector3(0, 1, 0),
      skin: () => skin1(fanB),
      mask: (t) => [P_FAN, t, ang, bIdx],
      aux: [tb.x, tb.y, tb.z, 0],
      capEnd: 0.02,
      capRows: 2,
      group: G_APP,
    });
  });

  // ── eggs (separate mesh; shown when berried)
  const eg = new GeoBuilder();
  const nEggs = lod === 0 ? 46 : lod === 1 ? 26 : 12;
  for (let e = 0; e < nEggs; e++) {
    const s = lerp(0.43, 0.68, R());
    const i = at(s);
    const hb = smoothTable(HB, s) * H;
    const side = R() < 0.5 ? -1 : 1;
    const c = spine[i].clone().addScaledVector(U[i], -hb * (0.75 + R() * 0.35)).add(new THREE.Vector3(0, -R() * 0.02, side * R() * 0.035));
    let k = 0;
    while (k < 5 && s > SEG[k + 1]) k++;
    ellipsoid(eg, {
      center: [c.x, c.y, c.z],
      radii: [0.0165, 0.015, 0.015],
      nu: lod === 0 ? 7 : 5,
      nv: lod === 0 ? 10 : 6,
      skin: skin1(bi(abNames[Math.min(5, k)])),
      mask: [P_EGG, R(), 0, 0],
    });
  }

  const geo = g.build();
  // portraits frame the body, not the long antennae sweeping past it (L-6)
  geo.userData.frameSkip = [P_ANT, P_ANTULE];
  return { geo, eggs: eg.build(), rig, eyePos, eyeR, ground };
}

// ───────────────────────────── Shaders ─────────────────────────────

const SHRIMP_VERTEX = /* glsl */ `
void agcDeform(inout vec3 p, inout vec3 n, vec4 m, vec2 uv){
  float part = m.x;
  float t = uAgcTime;
  vec3 piv = aAux.xyz;
  if (part > 5.5 && part < 7.5) {
    float k = m.z; float side = m.w;
    if (part < 6.5) {
      // walking legs: metachronal stepping + idle fidget
      float ph = uAgcV0.x + k * 1.9 + (side > 0.0 ? 0.0 : 3.14159);
      float amt = uAgcV0.y;
      float swing = sin(ph) * 0.32 * amt + sin(t * 1.3 + k * 2.0 + side) * 0.03;
      float lift = max(0.0, cos(ph)) * 0.28 * amt;
      agcPivotRot(p, n, piv, vec3(-side * lift, side * swing, 0.0));
    } else {
      // chelipeds: grazing pick (alternating scoops toward the mouth)
      float ph = uAgcV0.z + k * 1.3 + (side > 0.0 ? 0.0 : 3.14159);
      float amt = uAgcV0.w;
      float pk = sin(ph);
      float scoop = pk * pk * pk;
      agcPivotRot(p, n, piv, vec3(-side * 0.25 * amt * max(0.0, pk), side * 0.18 * amt * scoop, 0.45 * amt * max(0.0, pk) + sin(t * 2.0 + k) * 0.03));
    }
  } else if (part > 10.5 && part < 11.5) {
    // crayfish claws: raised in display, pinch on feed
    float side = m.w;
    float lift = uAgcF1.y;
    agcPivotRot(p, n, piv, vec3(-side * 0.25 * lift, side * (0.15 * lift + sin(t * 0.7 + side) * 0.05), 0.35 * lift + sin(t * 0.9 + side * 2.0) * 0.04));
  } else if (part > 11.5 && part < 12.5) {
    // mantis raptorial club: jackknife strike (dactyl heel swings forward/down)
    float strike = uAgcF1.y;
    if (m.z > 0.5) {
      vec3 d = p - piv;
      d = agcRotZ(d, -strike * 1.9);
      p = piv + d;
      n = agcRotZ(n, -strike * 1.9);
    }
    agcPivotRot(p, n, aAux.w > 0.5 ? vec3(0.26, -0.03, 0.0) : piv, vec3(0.0, 0.0, strike * 0.5));
  } else if (part > 7.5 && part < 8.5) {
    // swimmerets: back-to-front metachronal beat
    float ph = uAgcV1.x - m.z * 0.95;
    float amp = 0.12 + uAgcV1.y * 0.55;
    agcPivotRot(p, n, piv, vec3(0.0, 0.0, -sin(ph) * amp));
  } else if (part > 2.5 && part < 4.5) {
    // antennae: travelling sway, plus broad cleaner-station waving
    float L = aAux.w;
    float q = m.y;
    float ph = m.z * 1.7;
    float wave = uAgcV1.z;
    float sweep = sin(t * 2.2 + ph) * wave;
    agcPivotRot(p, n, piv, vec3(0.0, sweep * 0.5 * m.w, sweep * 0.35));
    vec3 off = vec3(0.0, sin(t * 1.6 + q * 5.0 + ph), cos(t * 1.2 + q * 4.0 + ph * 1.3)) * q * q * L * (0.035 + wave * 0.05);
    p += off;
  } else if (part > 8.5 && part < 9.5) {
    // tail fan spread (uropods open when swimming / startled)
    float spread = uAgcV1.w;
    agcPivotRot(p, n, piv, vec3(0.0, sign(m.z) * spread * 0.25 + m.z * spread * 0.2, 0.0));
  }
}
`;

const SHRIMP_SURFACE = /* glsl */ `
void agcSurface(inout AgcSurf s){
  float part = vAgcMask.x;
  float kind = uAgcF0.x;
  vec3 P = vAgcRest;
  float seed = uAgcPat.w;
  vec3 Q = P + vec3(seed, seed * 0.5, seed * 0.25);
  vec3 body = uAgcPal[0]; vec3 body2 = uAgcPal[1]; vec3 belly = uAgcPal[2]; vec3 fin = uAgcPal[3]; vec3 fin2 = uAgcPal[4]; vec3 acc = uAgcPal[5];
  float contrast = uAgcPat.z;
  float isBody = step(part, 0.5);
  float dors = isBody > 0.5 ? cos(vAgcUv.y * 6.2831853) : 0.3;
  float along = vAgcUv.x;
  vec3 glass = mix(vec3(0.78, 0.8, 0.76), belly, 0.25);
  vec3 col = body;
  float alpha = 1.0;
  float appendage = step(2.5, part) * (1.0 - step(9.5, part));
  if (kind < 0.5) {
    // cherry: red chromatophores over translucent tissue; grade (contrast) sets coverage
    vec3 c = agcCell(Q * 75.0);
    float chrom = 1.0 - smoothstep(0.18, 0.5, c.x);
    float grade = clamp(0.5 + contrast * 0.8, 0.0, 1.0);
    float cover = clamp(chrom * grade + grade * 0.85 - appendage * 0.3, 0.0, 1.0);
    col = mix(glass * vec3(1.0, 0.86, 0.82), body, cover);
    col = mix(col, body2, smoothstep(0.2, 0.9, dors) * 0.4 * isBody);
    col = mix(col, belly, smoothstep(-0.3, -0.9, dors) * 0.35 * isBody);
    alpha = mix(0.6, 1.0, cover);
  } else if (kind < 1.5) {
    // amano: glassy grey-green with dotted/dashed reddish-brown lines along the flanks, pale dorsal stripe
    col = mix(glass, body, 0.55);
    float ang = vAgcUv.y * 6.2831853;
    float rows = 0.0;
    for (int r = 0; r < 3; r++) {
      float a0 = 1.15 + float(r) * 0.42;
      float d = min(abs(ang - a0), abs(ang - (6.2831853 - a0)));
      float dash = smoothstep(0.1, 0.6, sin(along * (90.0 + float(r) * 17.0) + float(r) * 1.7));
      rows = max(rows, (1.0 - smoothstep(0.035, 0.075, d)) * dash);
    }
    col = mix(col, acc, rows * isBody * contrast);
    col = mix(col, vec3(0.9, 0.9, 0.85), (1.0 - smoothstep(0.93, 0.99, dors)) < 0.5 ? 0.35 * isBody : 0.0);
    alpha = 0.55 + 0.35 * rows * isBody;
  } else if (kind < 2.5) {
    // skunk cleaner: yellow flanks, broad red dorsal band, crisp white median stripe
    float band = smoothstep(0.42, 0.52, dors);
    float stripe = smoothstep(0.955, 0.985, dors);
    col = mix(body, body2, band);
    col = mix(col, acc, stripe);
    col = mix(col, belly, smoothstep(-0.2, -0.8, dors) * 0.5);
  } else if (kind > 3.5 && kind < 4.5) {
    // dwarf crayfish: saturated orange with fine darker marbling, paler underside
    float marb = smoothstep(0.45, 0.75, agcFbm(Q * 30.0));
    col = mix(body, body2, marb * contrast);
    vec3 dc = agcCell(Q * 90.0);
    col = mix(col, uAgcPal[5], (1.0 - smoothstep(0.1, 0.22, dc.x)) * step(0.7, dc.z) * 0.5);
    col = mix(col, belly, smoothstep(-0.2, -0.85, dors) * 0.6 * isBody);
  } else if (kind > 4.5) {
    // peacock mantis: green armour, leopard spots up front, pinkish underside
    col = mix(body, body2, smoothstep(0.2, 0.8, dors) * 0.4);
    vec3 dc = agcCell(Q * 55.0);
    float spots = (1.0 - smoothstep(0.12, 0.26, dc.x)) * (1.0 - smoothstep(0.3, 0.45, along)) * isBody;
    col = mix(col, uAgcPal[5], spots * contrast);
    col = mix(col, belly, smoothstep(-0.25, -0.8, dors) * 0.7 * isBody);
    // segment rims catch colour
    col = mix(col, body * 1.4 + vec3(0.05, 0.1, 0.05), vAgcMask.y * 0.3 * isBody);
  } else {
    // peppermint: translucent blush with fine red lines and segment bands
    // lane:qa-visual — a little of the line red washes through the tissue so the animal reads pink-red, not ghost-white
    col = mix(mix(glass, body, 0.45), acc, 0.42 * isBody);
    float ang = vAgcUv.y * 6.2831853;
    float lines = 1.0 - smoothstep(0.0, 0.3, abs(sin(ang * 5.0 + agcVn(vec3(along * 20.0, 0.0, seed)) * 0.6)));
    float bands = isBody * vAgcMask.y;
    col = mix(col, acc * 0.85, clamp(lines * 0.95 + bands * 0.7, 0.0, 1.0) * contrast * isBody);
    alpha = 0.7 + 0.25 * lines * isBody;
  }
  // segment seams & carapace sheen
  if (isBody > 0.5) {
    col *= 1.0 - vAgcMask.y * 0.18;
    s.height -= vAgcMask.y * 0.0012;
    // gut line visible through translucent tissue
    float gut = (1.0 - smoothstep(0.02, 0.07, abs(dors - 0.72))) * smoothstep(0.3, 0.45, along) * (1.0 - smoothstep(0.92, 1.0, along));
    col = mix(col, col * vec3(0.55, 0.5, 0.42), gut * (kind > 0.5 && kind < 1.5 || kind > 2.5 ? 0.6 : 0.2));
  }
  // appendages
  if (part > 10.5 && part < 12.5) {
    // claws / raptorial clubs
    col = kind > 4.5 ? mix(fin, fin * 1.2, vAgcMask.y) : mix(fin, fin2, smoothstep(0.85, 1.0, vAgcMask.y));
    if (kind > 4.5) col = mix(col, vec3(0.95, 0.9, 0.8), smoothstep(0.85, 1.0, vAgcMask.y) * 0.5);
    alpha = 1.0;
    s.clear = 0.8;
  } else if (part > 2.5 && part < 4.5) {
    vec3 antC = kind > 1.5 && kind < 2.5 ? vec3(0.95, 0.94, 0.9) : (kind < 0.5 ? mix(body, glass, 0.25) : mix(glass, acc, kind > 2.5 ? 0.35 : 0.1));
    col = antC;
    alpha = kind > 1.5 && kind < 2.5 ? 1.0 : 0.85;
  } else if (part > 5.5 && part < 7.5) {
    float bandsL = smoothstep(0.35, 0.65, fract(vAgcMask.y * 3.0 + 0.2)) * 0.5;
    if (kind < 0.5) col = mix(mix(glass, body, 0.55), body, bandsL * 0.4);
    else if (kind < 1.5) col = mix(glass, body, 0.35);
    else if (kind < 2.5) col = mix(vec3(0.95, 0.9, 0.75), body, 0.35 + bandsL * 0.3);
    else if (kind > 3.5) col = mix(fin, body, 0.3);
    else col = mix(glass, acc, bandsL * 0.6);
    alpha = kind > 1.5 && kind < 2.5 ? 1.0 : 0.8;
  } else if (part > 7.5 && part < 8.5) {
    col = mix(glass, body, kind < 0.5 ? 0.45 : 0.25);
    alpha = 0.65;
  } else if (part > 8.5 && part < 9.5) {
    float edge = smoothstep(0.6, 1.0, vAgcMask.y);
    if (kind > 4.5) {
      col = mix(body2, fin2, smoothstep(0.35, 0.8, vAgcMask.y));
      col = mix(col, fin, smoothstep(0.85, 0.97, vAgcMask.y));
    } else if (kind > 1.5 && kind < 2.5) {
      vec3 dc = agcCell(Q * 45.0);
      float spots = 1.0 - smoothstep(0.2, 0.3, dc.x);
      col = mix(body2, acc, spots * 0.9);
      col = mix(col, fin, edge * 0.5);
    } else col = mix(kind < 0.5 ? body : mix(glass, body, 0.5), fin2, edge * 0.6);
    alpha = mix(0.95, 0.6, edge) * (kind > 0.5 && kind < 1.5 ? 0.7 : 1.0);
  } else if (part > 4.5 && part < 5.5) {
    col = kind > 4.5 ? mix(uAgcPal[2], fin, 0.5) : (kind > 3.5 ? body : mix(glass, body, 0.3));
    alpha = kind > 3.5 ? 1.0 : 0.55;
  } else if (part > 1.5 && part < 2.5) {
    col = mix(body, glass, 0.4);
  } else if (part > 0.5 && part < 1.5) {
    col = mix(body, glass, 0.3 + 0.4 * vAgcMask.y);
  } else if (part > 9.5) {
    // eggs: glossy, slightly translucent; develop darker eyed spots near hatch
    col = mix(uAgcPal[6], uAgcPal[6] * 0.7, vAgcMask.y * 0.4);
    float eyeSpot = (1.0 - smoothstep(0.25, 0.35, length(fract(P * 140.0) - 0.5))) * uAgcF0.z;
    col = mix(col, vec3(0.05), eyeSpot * 0.7);
    s.rough = 0.25;
    s.sss = 1.2;
    s.sssCol = uAgcPal[6] * 1.3;
  }
  s.albedo = col;
  s.alpha = alpha * uAgcF1.x + (1.0 - uAgcF1.x);
  s.rough = part > 9.5 ? 0.25 : 0.32;
  s.clear = 0.6;
  s.sss = max(s.sss, uAgcMat.z * 0.9 + 0.2);
  s.sssCol = mix(body, vec3(1.0, 0.6, 0.5), 0.3) * 1.2;
  // lane:qa-visual — peppermint: light through the tissue glows blush-red (a pale body tint washed it out to white)
  if (kind > 2.5 && kind < 3.5) s.sssCol = mix(acc, vec3(1.0, 0.55, 0.5), 0.45) * 1.1;
}
`;

// ───────────────────────────── Factory ─────────────────────────────

function makeShrimpFactory(spec: ShrimpSpec): CreatureFactory {
  return (args) => {
    const { appearance: ap, fx, lod } = args;
    const key = `shrimp|${spec.id}|${lod}`;
    const tpl = acquire(key, () => buildShrimp(spec, lod), (t) => {
      t.geo.dispose();
      t.eggs.dispose();
    });
    const eyeGeo = acquireEyeGeometry(lod);
    const root = new THREE.Group();
    root.name = spec.id;
    const inner = new THREE.Group();
    root.add(inner);
    const rigI = instantiateRig(tpl.rig);
    for (const b of rigI.roots) inner.add(b);

    const u = createCritterUniforms(fx);
    applyAppearance(u, ap);
    const eggCol = spec.kind === 0 ? new THREE.Color('#e3c23a') : spec.kind === 1 ? new THREE.Color('#6f7a4a') : new THREE.Color('#d8a13a');
    u.uAgcPal.value[6].copy(eggCol);
    u.uAgcF0.value.set(spec.kind, 0, 0, 0);
    const opaqueMat = createCritterMaterial({ name: 'shrimp', fx, u, surface: SHRIMP_SURFACE, vertex: SHRIMP_VERTEX, params: { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 } });
    // uAgcF1.x toggles alpha usage: shared uniform, so give the transparent material its own copy
    const uClear = { ...u, uAgcF1: { value: new THREE.Vector4(1, 0, 0, 0) } };
    const clearMat2 = createCritterMaterial({
      name: 'shrimp-clear',
      fx,
      u: uClear,
      surface: SHRIMP_SURFACE,
      vertex: SHRIMP_VERTEX,
      params: { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2, transparent: true, depthWrite: true },
    });
    u.uAgcF1.value.set(0, 0, 0, 0);
    const mesh = makeSkinned(tpl.geo, [opaqueMat, clearMat2], rigI, 2.4);
    mesh.castShadow = lod === 0;
    mesh.receiveShadow = lod < 2;
    inner.add(mesh);
    const eggMat = createCritterMaterial({ name: 'shrimp-egg', fx, u, surface: SHRIMP_SURFACE, vertex: SHRIMP_VERTEX, params: { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 } });
    const eggs = makeSkinned(tpl.eggs, eggMat, rigI, 2.4);
    eggs.visible = false;
    inner.add(eggs);

    const mantis = !!spec.raptorial;
    const eyeMat = createEyeMaterial(fx, u, {
      iris: mantis ? color(ap.eyeColor, '#45c3c9') : spec.kind === 2 ? new THREE.Color(0.18, 0.04, 0.02) : new THREE.Color(0.02, 0.02, 0.02),
      pupil: new THREE.Color(0.005, 0.005, 0.005),
      sclera: new THREE.Color(0.03, 0.025, 0.02),
      ring: new THREE.Color(0.08, 0.06, 0.04),
      irisAngle: mantis ? 2.2 : 1.2,
      pupilAngle: mantis ? 0.12 : 0.5,
      pupilAspect: mantis ? 6 : 1,
      striation: mantis ? 0.8 : 0.2,
      catchlight: 1.2,
    });
    const rootBone = rigI.byName.root;
    const eyeMeshes: THREE.Mesh[] = [];
    const rootRest = new THREE.Vector3(...tpl.rig.bones[0].pos);
    for (let i = 0; i < 2; i++) {
      const e = new THREE.Mesh(eyeGeo, eyeMat.mat);
      e.position.copy(tpl.eyePos[i]).sub(rootRest);
      e.scale.setScalar(tpl.eyeR);
      e.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.35, 0.15, i === 0 ? 1 : -1).normalize());
      // far tanks (lod 2): eyes are sub-pixel — skip their draw calls (a busy facility has hundreds of shrimp)
      e.visible = lod < 2;
      rootBone.add(e);
      eyeMeshes.push(e);
    }

    // lane:perf — hero detail tiers: lower-LOD body/egg mesh + eye spheres while the shrimp is a few pixels on screen
    const tiers = critterTiers(
      lod,
      (l) => `shrimp|${spec.id}|${l}`,
      (l) => buildShrimp(spec, l),
      (t) => {
        t.geo.dispose();
        t.eggs.dispose();
      },
      tpl,
      (t, eg) => {
        mesh.geometry = t.geo;
        eggs.geometry = t.eggs;
        if (eg) for (const e of eyeMeshes) e.geometry = eg;
      },
      true,
    );
    root.userData.groundOffset = tpl.ground;
    root.userData.speciesVisual = spec.id;
    const B = rigI.byName;
    const abs = [B.ab1, B.ab2, B.ab3, B.ab4, B.ab5, B.ab6];
    const seed = ((ap.patternSeed ?? 5) % 1000) / 1000;
    const st = { walk: 0, walkW: 0, pick: 0, pickW: 0, swim: 0, swimW: 0, flick: 0, eggs: 0, spread: 0, wave: 0, lastPose: '', strike: 0, claw: 0, peek: 0 };
    // behaviour label tests cached by string identity (labels change a few times a minute, not per frame)
    let lastBehavior: string | undefined;
    let cleaningBehavior = false;
    let peekBehavior = false;

    // selection: set by the renderer (not while the camera already follows this animal); drawn as a thin rim

    const sel = { on: false };

    const update = (rt: CreatureRuntime, dt: number, time: number) => {
      u.uAgcTime.value = time;
      const pose = rt.pose;
      const dead = pose === 'dead';
      const live = dead ? 0 : 1;
      const speed = Math.max(0, rt.speedBL || 0);
      const swimming = !dead && (pose === 'startle' || speed > 1.6 || (pose === 'swim' && (rt.ai?.galleryHeight as number) > 0.5));
      const walking = !dead && !swimming && speed > 0.03;
      const grazing = !dead && !swimming && (pose === 'feed' || pose === 'rest' || pose === 'hover' || pose === 'guard' || pose === 'hiding');
      st.walkW = damp(st.walkW, walking ? 1 : 0, 6, dt);
      st.swimW = damp(st.swimW, swimming ? 1 : 0, 6, dt);
      st.pickW = damp(st.pickW, grazing ? 1 : 0.15 * live, 4, dt);
      st.walk += dt * TAU * (0.8 + speed * 6) * st.walkW;
      st.pick += dt * TAU * (2.2 + noise1(time * 0.3, seed) * 0.8) * live;
      st.swim += dt * TAU * (1.2 + st.swimW * 5 + speed * 2) * live;
      if (rt.behavior !== lastBehavior) {
        lastBehavior = rt.behavior;
        cleaningBehavior = /clean|station|display/i.test(rt.behavior || '');
        peekBehavior = /burrow|peek/i.test(rt.behavior || '');
      }
      const cleaning = cleaningBehavior || pose === 'display';
      // claws (crayfish) raise in display; mantis club strikes on 'smash' events / feeding pulses
      if (spec.raptorial) {
        // runtime events are stamped with performance.now() (not the render clock): one clock for cut-off and ageing
        const nowS = performance.now() / 1000;
        const ev = latestEvent('smash', rt.id, nowS - 1.5);
        let strikeT = ev > 0 ? clamp(1 - (nowS - ev) / 0.35) : 0;
        if (pose === 'feed' || pose === 'spawn') strikeT = Math.max(strikeT, clamp((rt.mouthOpen || 0) * 1.4));
        st.strike = strikeT > st.strike ? strikeT : damp(st.strike, strikeT, 6, dt);
        uClear.uAgcF1.value.y = st.strike;
        u.uAgcF1.value.y = st.strike;
      } else if (spec.claw) {
        st.claw = damp(st.claw, pose === 'display' || pose === 'startle' || pose === 'guard' ? 1 : pose === 'feed' ? 0.4 + 0.3 * Math.sin(time * 6) : 0, 4, dt);
        uClear.uAgcF1.value.y = st.claw;
        u.uAgcF1.value.y = st.claw;
      }
      st.wave = damp(st.wave, cleaning ? 1 : 0.12, 2, dt);
      st.spread = damp(st.spread, swimming ? 1 : 0.1, 5, dt);
      u.uAgcV0.value.set(st.walk, st.walkW * live, st.pick, st.pickW * live);
      u.uAgcV1.value.set(st.swim, st.swimW, st.wave * live, st.spread);

      // escape tail-flick on startle, gentle abdomen pulse when swimming, slight hunch at rest
      st.flick = damp(st.flick, pose === 'startle' ? 1 : 0, pose === 'startle' ? 18 : 4, dt);
      const flickPulse = st.flick * (0.5 + 0.5 * Math.sin(time * 24));
      for (let k = 0; k < 6; k++) {
        const a = flickPulse * (0.22 + k * 0.05) + Math.sin(st.swim * 0.5 - k * 0.6) * 0.03 * st.swimW + Math.sin(time * 0.8 + k + seed * 6) * 0.01 * live;
        setRot(abs[k], 0, Math.sin(time * 0.6 + k * 0.4 + seed) * 0.015 * live, a);
      }
      setRot(B.root, 0, 0, Math.sin(st.walk * 2) * 0.012 * st.walkW);
      B.root.position.y = rigI.restPos[0].y + Math.abs(Math.sin(st.walk)) * 0.006 * st.walkW;

      // berried: eggs under the abdomen (runtime belly or live repro stage)
      const ri = reproInfo(args.creature?.id, time);
      const berriedStage = ri ? ri.stage === 'berried' : false;
      const berried = (rt.belly || 0) > 0.3 || berriedStage;
      st.eggs = damp(st.eggs, berried ? 1 : 0, 2, dt);
      eggs.visible = st.eggs > 0.02;
      eggs.scale.setScalar(1);
      u.uAgcF0.value.z = berriedStage ? smoothstep(0.7, 0.95, ri!.progress) : clamp((rt.belly || 0) - 0.8) * 5; // eyed eggs near hatch
      if (mantis) {
        for (let i = 0; i < 2; i++) {
          const e = eyeMeshes[i];
          const look = i === 0 ? rt.eyeR || 0 : rt.eyeL || 0;
          e.rotation.set(Math.sin(time * 0.8 + i * 2) * 0.4, (i === 0 ? 0.3 : -0.3) + look + Math.sin(time * 0.53 + i) * 0.5, Math.sin(time * 1.1 + i * 3) * 0.5);
        }
        // burrow peeking: the body tips down into the burrow so only eyes and clubs show
        st.peek = damp(st.peek, pose === 'hiding' || pose === 'rest' && peekBehavior ? 1 : 0, 2, dt);
        setRot(B.root, 0, 0, st.peek * 0.9 + Math.sin(st.walk * 2) * 0.012 * st.walkW);
      }
      u.uAgcCI.value = rt.colorIntensity ?? 1;
      uClear.uAgcCI.value = rt.colorIntensity ?? 1;
      u.uAgcHi.value = sel.on ? 0.85 + 0.15 * Math.sin(time * 3) : 0;
    };

    return {
      root,
      update,
      pickRadius: 0.6,
      setHighlight(on) {
        sel.on = on;
        u.uAgcHi.value = on ? 1 : 0;
      },
      setDetailPx: tiers.setDetailPx,
      dispose() {
        opaqueMat.dispose();
        clearMat2.dispose();
        eggMat.dispose();
        eyeMat.mat.dispose();
        rigI.skeleton.dispose();
        tiers.dispose();
        release(key);
        releaseEyeGeometry(lod);
        root.removeFromParent();
      },
    } satisfies CreatureObject;
  };
}

export const createCherryShrimp = makeShrimpFactory(SHRIMP_SPECS.cherry_shrimp);
export const createAmanoShrimp = makeShrimpFactory(SHRIMP_SPECS.amano_shrimp);
export const createCleanerShrimp = makeShrimpFactory(SHRIMP_SPECS.cleaner_shrimp);
export const createPeppermintShrimp = makeShrimpFactory(SHRIMP_SPECS.peppermint_shrimp);
export const createDwarfCrayfish = makeShrimpFactory(SHRIMP_SPECS.dwarf_crayfish);
export const createMantisShrimp = makeShrimpFactory(SHRIMP_SPECS.peacock_mantis_shrimp);

void color;
void (null as unknown as Mask);
