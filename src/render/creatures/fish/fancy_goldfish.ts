/**
 * Fancy goldfish (Carassius auratus) — short, egg-shaped body with large metallic scales, a split double tail
 * (two caudal fins splayed apart), paired anal fins and flowing fins. Body forms from finType:
 *  - fantail: egg body, dorsal fin, long split double tail (two forked halves joined at the top, splayed below)
 *  - oranda: raspberry "wen" hood over the head (tinted by accentColor — red-cap tancho when white), flowing tail
 *  - ryukin: steep nuchal hump behind a small pointed head, deep body, long forked double tail
 *  - telescope: protruding telescope eyes on short stalks (a black telescope is the classic Black Moor)
 *  - ranchu: no dorsal fin, smooth arched back, hood, short tail tucked downward
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, FinShape, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';
import { luminance } from '../core/palette';
import * as THREE from 'three';

const TYPICAL: Record<string, number> = { fantail: 1.2, oranda: 1.25, ryukin: 1.3, telescope: 1.2, ranchu: 0.75 };

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const ft = a.finType in TYPICAL ? a.finType : 'fantail';
  const fl = bucket(finScale(args, TYPICAL[ft]), 0.05);
  const ryukin = ft === 'ryukin';
  const ranchu = ft === 'ranchu';
  const oranda = ft === 'oranda';
  const telescope = ft === 'telescope';

  const dorsalCurve = ryukin
    ? curve([[0, 0.05], [0.06, 0.1], [0.15, 0.19], [0.28, 0.222], [0.42, 0.205], [0.58, 0.155], [0.76, 0.095], [0.92, 0.056], [1, 0.047]])
    : ranchu
      ? curve([[0, 0.058], [0.1, 0.115], [0.25, 0.162], [0.42, 0.174], [0.58, 0.158], [0.72, 0.118], [0.86, 0.068], [1, 0.046]])
      : curve([[0, 0.052], [0.08, 0.102], [0.2, 0.148], [0.36, 0.166], [0.52, 0.152], [0.68, 0.114], [0.84, 0.072], [0.95, 0.05], [1, 0.045]]);
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: oranda ? 0.62 : 0.6,
    dorsal: dorsalCurve,
    ventral: curve([[0, 0.046], [0.1, 0.1], [0.28, 0.166], [0.44, 0.178], [0.6, 0.148], [0.76, 0.097], [0.9, 0.058], [1, 0.045]]),
    width: curve([[0, 0.052], [0.12, 0.1], [0.3, 0.13 * (ranchu ? 1.08 : 1)], [0.48, 0.122 * (ranchu ? 1.08 : 1)], [0.68, 0.086], [0.86, 0.05], [1, 0.036]]),
    axis: curve([[0, ryukin ? -0.02 : -0.006], [0.3, 0], [1, 0.004]]),
    expTop: 2.0,
    expBottom: 2.1,
    noseRound: ranchu ? 0.13 : 0.11,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.05, t: 0.05, groove: 0.7 },
    operculum: { t: 0.24, strength: oranda || ranchu ? 0.4 : 0.8 },
    cheek: 0.4,
    wen: oranda ? 0.75 : ranchu ? 0.45 : 0,
    hump: ryukin ? 1 : 0,
  };
  const b = new BodySampler(body);

  const irid = 0.3 + (a.metallic ?? 0.5) * 0.6;
  const tailStyle = fin({ opacity: 0.84, edgeStart: 0.55, edgeWidth: 0.4, rayContrast: 0.65, pattern: 0.85, irid, rootBlend: 0.1 });
  const fins: FinShape[] = [];
  // split double tail: one call builds both halves (mirrored), joined near the top and splayed apart below. Long,
  // soft and drooping so it trails and billows behind the egg-shaped body.
  type Tail = { len: number; spread: number; tilt: number; fork: number; kind: 'goldfish' | 'forked'; splay: [number, number]; droop: number };
  const TAILS: Record<string, Tail> = {
    fantail: { len: 0.42, spread: 40, tilt: -14, fork: 0.44, kind: 'goldfish', splay: [7, 36], droop: 0.05 },
    oranda: { len: 0.47, spread: 42, tilt: -20, fork: 0.4, kind: 'goldfish', splay: [7, 32], droop: 0.07 },
    ryukin: { len: 0.47, spread: 38, tilt: -12, fork: 0.64, kind: 'forked', splay: [6, 32], droop: 0.05 },
    telescope: { len: 0.44, spread: 42, tilt: -16, fork: 0.42, kind: 'goldfish', splay: [9, 42], droop: 0.06 },
    ranchu: { len: 0.27, spread: 44, tilt: -28, fork: 0.36, kind: 'goldfish', splay: [14, 50], droop: 0.02 },
  };
  const tail = TAILS[ft] ?? TAILS.fantail;
  fins.push(
    caudal(b, {
      kind: tail.kind,
      len: tail.len * fl * (TYPICAL[ft] / 1.2),
      spread: tail.spread,
      tilt: tail.tilt,
      fork: tail.fork,
      rays: 18,
      soft: 1.25,
      rootH: 1.0,
      droop: tail.droop * fl,
      splay: tail.splay,
      cup: 0.024,
      segS: 32,
      segR: 16,
      style: tailStyle,
    }),
  );
  if (!ranchu) {
    fins.push(
      dorsal(b, {
        t0: ryukin ? 0.24 : 0.3,
        t1: 0.64,
        len: 0.21 * fl * (ryukin ? 1.1 : 1),
        angle0: 78,
        angle1: 30,
        profile: (s) => (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, 0.2 + s))) * (1 - 0.35 * smoothstep(0.7, 1, s)),
        rays: 13,
        soft: 0.95,
        cup: 0.014,
        droop: 0.012,
        segS: 24,
        segR: 12,
        style: tailStyle,
      }),
    );
  }
  // paired anal fins (a hallmark of fancy goldfish)
  fins.push(
    pelvic(b, {
      t: 0.72,
      yn0: -0.82,
      yn1: -0.9,
      tLen: 0.1,
      len: 0.165 * Math.min(1.4, fl),
      out: 22,
      a0: -30,
      a1: -66,
      droop: 6,
      profile: (s) => 0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, s * 1.25)),
      rays: 9,
      soft: 1.1,
      style: tailStyle,
    }),
  );
  fins.push(
    pectoral(b, {
      t: 0.25,
      yn0: -0.35,
      yn1: -0.7,
      len: 0.115,
      out: 34,
      a0: 20,
      a1: -32,
      profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * s),
      rays: 10,
      soft: 0.45,
      style: fin({ ...tailStyle, opacity: 0.7, flutter: 0.3, pattern: 0.3 }),
    }),
  );
  fins.push(
    pelvic(b, {
      t: 0.42,
      yn0: -0.92,
      yn1: -0.97,
      tLen: 0.04,
      len: 0.13 * Math.min(1.4, fl),
      out: 24,
      a0: -24,
      a1: -55,
      rays: 8,
      soft: 1.0,
      style: fin({ ...tailStyle, pattern: 0.4 }),
    }),
  );

  const marks: Mark[] = [];
  if (oranda || ranchu) {
    // wen tint: accent over the hood (a vivid red cap on white "tancho" fish)
    const tancho = luminance(a.bodyColor) > 0.6 && luminance(a.accentColor) < 0.3 && luminance(a.accentColor) > 0.03;
    const darkAccent = luminance(a.accentColor) < 0.04;
    marks.push({ t: 0.1, yn: 0.55, rt: 0.13, ryn: 0.62, color: darkAccent ? 'body2' : 'accent', strength: tancho ? 1 : oranda ? 0.45 : 0.3, soft: tancho ? 0.3 : 0.7 });
  }
  if (ryukin) marks.push({ t: 0.26, yn: 0.9, rt: 0.2, ryn: 0.3, color: 'body2', strength: 0.35, soft: 0.8 });

  const metal = a.metallic ?? 0.5;
  const E = telescope
    ? eye({ t: 0.17, yn: 0.12, r: 0.05, protrude: 0.62, stalk: 0.02, forward: 0.3, up: 0.05, pupil: 0.46, iris: 'eye', ring: '#c69a3a', ringWidth: 0.1, socket: 'body', swivel: 0.3 })
    : eye({ t: 0.13, yn: 0.18, r: oranda ? 0.03 : 0.036, protrude: oranda ? 0.3 : 0.4, forward: 0.2, up: 0.08, pupil: 0.46, iris: 'eye', ring: '#c69a3a', ringWidth: 0.12, socket: 'body', swivel: 0.35 });
  const extras: NonNullable<FishPlan['extras']> = [];
  if (telescope) {
    // the telescope "stalk": a short fleshy cone from the head to the eyeball (mirrors the eye placement in buildFish)
    const th = b.flankTheta(E.t, E.yn, 1);
    const p = b.point(E.t, th, { x: 0, y: 0, z: 0, yn: 0 });
    const n = b.normal(E.t, th, new THREE.Vector3());
    const c = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(n, (E.stalk ?? 0) - E.r * (1 - 2 * E.protrude));
    const s0 = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(n, -0.012);
    extras.push({ kind: 'wen', t: E.t, radius: E.r * 0.82, taper: 0.9, mirror: true, color: 'body', path: [[s0.x, s0.y, s0.z], [(s0.x + c.x) / 2, (s0.y + c.y) / 2, (s0.z + c.z) / 2], [c.x, c.y, c.z]] });
  }
  return {
    key: `fancy_goldfish|${ft}|${fl}`,
    body,
    fins,
    eye: E,
    extras,
    motion: motion({
      wavelength: 1.1,
      amp: 0.05,
      idleAmp: 0.02,
      envPow: 2.2,
      headSway: 0.08,
      bendK: 0.8,
      pectoralHz: 3,
      idleFlutter: 0.55,
      finSoft: 1.0,
      finRest: 0.85,
      sag: 0.5,
      idleHz: 0.8,
      finLag: 1.4,
      waddle: 0.045,
      breathe: 0.7,
    }),
    look: look({
      dorsalDark: 0.25,
      bellyLine: -0.45,
      bellyAmount: 0.6,
      bellySoft: 0.4,
      scales: { cols: 17, strength: 0.3 + 0.45 * metal, kind: 'cycloid' },
      roughness: 0.52 - 0.25 * metal,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: 0.12,
      sss: 0.55,
      lateralLine: 0.3,
      patA: [0, 0, 0, 1],
      lipColor: 'body2',
      appendageColor: 'body',
      marks,
    }),
    pickRadius: 0.6,
  };
};
