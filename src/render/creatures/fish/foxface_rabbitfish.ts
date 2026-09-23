/**
 * Foxface rabbitfish (Siganus vulpinus) — oval, compressed yellow body; long, pointed "fox" snout with a small
 * rabbit-like mouth; white face crossed by a black diagonal band from the snout through the eye to the nape, and a
 * black chest/throat patch; stout venomous spines in the dorsal (13), anal (7) and pelvic fins with deeply incised
 * membranes; soft rear dorsal/anal lobes; slightly forked tail. OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic, spinyDorsal } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.44,
    length: 0.78,
    // long tapering snout, straight forehead, deep mid-body
    dorsal: curve([[0, 0.014], [0.05, 0.03], [0.1, 0.055], [0.18, 0.1], [0.28, 0.142], [0.4, 0.162], [0.55, 0.152], [0.7, 0.112], [0.84, 0.062], [0.94, 0.036], [1, 0.033]]),
    ventral: curve([[0, 0.012], [0.05, 0.026], [0.12, 0.058], [0.22, 0.105], [0.34, 0.14], [0.46, 0.148], [0.6, 0.128], [0.74, 0.088], [0.87, 0.048], [0.95, 0.034], [1, 0.033]]),
    width: curve([[0, 0.01], [0.08, 0.022], [0.2, 0.038], [0.36, 0.047], [0.54, 0.042], [0.72, 0.03], [0.86, 0.017], [1, 0.012]]),
    axis: curve([[0, -0.01], [0.15, -0.004], [0.3, 0], [1, 0.002]]),
    expTop: 1.9,
    expBottom: 1.9,
    noseRound: 0.035,
    tailRound: 0.025,
    mouth: { kind: 'tube', yn: -0.05, t: 0.03, groove: 0.6 },
    operculum: { t: 0.27, strength: 0.5 },
    cheek: 0.15,
    keel: 0.3,
  };
  const b = new BodySampler(body);
  const yellow = fin({ opacity: 0.92, edgeStart: 0.85, edgeWidth: 0.15, edgeAmount: 0.4, pattern: 0, rayContrast: 0.55, irid: 0.05 });
  const spines = fin({ opacity: 0.9, edgeStart: 0.8, edgeWidth: 0.2, edgeAmount: 0.5, pattern: 0, rayContrast: 0.95, irid: 0.05 });
  // eye band: from the snout tip through the eye to the dorsal origin (direction in (t, yn) space)
  const eT = 0.19;
  const eYn = 0.55;
  const bandRot = -Math.atan2(0.95, 0.24);
  return {
    key: `foxface|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'emarginate', len: 0.2 * fl, spread: 32, fork: 0.7, rays: 17, soft: 0.3, rootH: 1.05, cup: 0.01, style: { ...yellow, opacity: 0.9 } }),
      // 13 stout venomous spines, membranes deeply incised between them
      spinyDorsal(b, {
        t0: 0.26,
        t1: 0.64,
        len: 0.125 * fl,
        angle0: 74,
        angle1: 58,
        profile: (s) => (0.55 + 0.45 * smoothstep(0, 0.3, s)) * (1 - 0.2 * smoothstep(0.7, 1, s)),
        rays: 13,
        web: 0.55,
        soft: 0.12,
        cup: 0.004,
        segS: 52,
        segR: 12,
        inset: 0.03,
        style: spines,
      }),
      // soft dorsal lobe
      dorsal(b, {
        t0: 0.63,
        t1: 0.9,
        len: 0.1 * fl,
        angle0: 62,
        angle1: 34,
        profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, 0.1 + s)),
        rays: 10,
        soft: 0.3,
        inset: 0.03,
        style: yellow,
      }),
      // 7 anal spines then the soft anal lobe
      anal(b, {
        t0: 0.5,
        t1: 0.7,
        len: 0.095 * fl,
        angle0: 66,
        angle1: 52,
        profile: (s) => 0.6 + 0.4 * smoothstep(0, 0.4, s),
        rays: 7,
        web: 0.5,
        soft: 0.12,
        segS: 32,
        inset: 0.03,
        style: spines,
      }),
      anal(b, {
        t0: 0.69,
        t1: 0.9,
        len: 0.09 * fl,
        angle0: 58,
        angle1: 32,
        profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, 0.1 + s)),
        rays: 9,
        soft: 0.3,
        inset: 0.03,
        style: yellow,
      }),
      pectoral(b, {
        t: 0.31,
        yn0: -0.05,
        yn1: -0.36,
        len: 0.11,
        out: 26,
        a0: 20,
        a1: -18,
        profile: (s) => 1 - 0.45 * s,
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.45, color: 'fin', pattern: 0, rayContrast: 0.5, flutter: 0.35, irid: 0.05 }),
      }),
      // rabbitfish pelvics: an outer and inner spine with soft rays between
      pelvic(b, { t: 0.34, yn0: -0.86, yn1: -0.93, tLen: 0.025, len: 0.085, out: 18, a0: -30, a1: -58, rays: 5, web: 0.4, soft: 0.2, style: spines }),
    ],
    eye: eye({ t: eT, yn: eYn, r: 0.03, protrude: 0.36, forward: 0.2, up: 0.1, pupil: 0.52, iris: '#231a14', ring: '#5a4a2a', ringWidth: 0.06, socket: 'accent' }),
    motion: motion({
      wavelength: 1.15,
      amp: 0.045,
      idleAmp: 0.012,
      envPow: 2.7,
      headSway: 0.04,
      bendK: 0.6,
      pectoralHz: 2.8,
      idleFlutter: 0.5,
      finSoft: 0.35,
      finRest: 0.8,
      sag: 0.03,
      idleHz: 0.6,
      finLag: 0.7,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.18,
      bellyLine: -0.55,
      bellyAmount: 0.35,
      bellySoft: 0.4,
      scales: { cols: 64, strength: 0.12, kind: 'fine' },
      roughness: 0.38,
      gloss: 0.5,
      iridMode: 'body',
      iridHue: 0.12,
      sss: 0.75,
      lateralLine: 0,
      lipColor: 'accent',
      marks: [
        // white face mask
        { t: 0.1, yn: -0.05, rt: 0.2, ryn: 1.35, color: 'white', strength: 0.95, soft: 0.25 },
        // black eye band: snout tip → eye → nape
        { t: 0.15, yn: 0.47, rt: 0.55, ryn: 0.11, color: 'accent', strength: 1, soft: 0.2, mode: 'stripe', rot: bandRot },
        // black throat / chest patch running back to the pelvic fins
        { t: 0.2, yn: -0.78, rt: 0.16, ryn: 0.36, color: 'accent', strength: 1, soft: 0.28, rot: 0.2 },
      ],
    }),
    pickRadius: 0.55,
  };
};
