/**
 * Kole tang / yellow-eye bristletooth (Ctenochaetus strigosus) — oval compressed surgeonfish body (less tall than
 * Zebrasoma), short rounded snout with a thick-lipped comb-toothed mouth, long moderate dorsal and anal fins, lunate
 * tail; chocolate brown with a blue-burgundy cast and many fine pale-blue longitudinal lines; bright gold ring around
 * the eye; small dark scalpel spine on the peduncle. OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.76,
    dorsal: curve([[0, 0.04], [0.05, 0.065], [0.1, 0.095], [0.18, 0.135], [0.28, 0.162], [0.4, 0.172], [0.54, 0.162], [0.7, 0.115], [0.84, 0.062], [0.94, 0.038], [1, 0.035]]),
    ventral: curve([[0, 0.034], [0.05, 0.055], [0.12, 0.09], [0.22, 0.13], [0.34, 0.155], [0.46, 0.162], [0.6, 0.135], [0.74, 0.09], [0.86, 0.05], [0.95, 0.035], [1, 0.034]]),
    width: curve([[0, 0.022], [0.08, 0.034], [0.2, 0.042], [0.36, 0.05], [0.52, 0.045], [0.7, 0.032], [0.86, 0.018], [1, 0.013]]),
    axis: curve([[0, -0.01], [0.14, -0.003], [0.3, 0], [1, 0.002]]),
    expTop: 1.9,
    expBottom: 1.95,
    noseRound: 0.1,
    tailRound: 0.025,
    mouth: { kind: 'terminal', yn: -0.05, t: 0.035, groove: 0.9 },
    operculum: { t: 0.25, strength: 0.5 },
    cheek: 0.25,
    keel: 0.3,
  };
  const b = new BodySampler(body);
  const brown = fin({ opacity: 0.95, edge: 'fin2', edgeStart: 0.8, edgeWidth: 0.18, edgeAmount: 0.7, pattern: 0.8, rayContrast: 0.35, irid: 0.1 });
  const eyeT = 0.2;
  const eyeYn = 0.38;
  return {
    key: `kole_tang|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'lyre', len: 0.21 * fl, spread: 36, rays: 16, soft: 0.3, rootH: 1.1, cup: 0.01, style: { ...brown, opacity: 0.93 } }),
      dorsal(b, {
        t0: 0.22,
        t1: 0.9,
        len: 0.11 * fl,
        angle0: 70,
        angle1: 40,
        profile: (s) => (0.45 + 0.55 * smoothstep(0, 0.35, s)) * (1 - 0.45 * smoothstep(0.72, 1, s)),
        rays: 30,
        soft: 0.3,
        cup: 0.006,
        segS: 36,
        segR: 10,
        inset: 0.03,
        style: brown,
      }),
      anal(b, {
        t0: 0.44,
        t1: 0.9,
        len: 0.1 * fl,
        angle0: 66,
        angle1: 38,
        profile: (s) => (0.45 + 0.55 * smoothstep(0, 0.3, s)) * (1 - 0.45 * smoothstep(0.72, 1, s)),
        rays: 26,
        soft: 0.3,
        cup: 0.006,
        segS: 30,
        segR: 10,
        inset: 0.03,
        style: brown,
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.05,
        yn1: -0.36,
        len: 0.12,
        out: 26,
        a0: 22,
        a1: -18,
        profile: (s) => 1 - 0.5 * s,
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.55, color: 'fin', pattern: 0, rayContrast: 0.45, flutter: 0.35, irid: 0.1 }),
      }),
      pelvic(b, { t: 0.33, yn0: -0.86, yn1: -0.93, tLen: 0.02, len: 0.075, out: 16, a0: -35, a1: -60, rays: 5, soft: 0.25, style: fin({ opacity: 0.9, pattern: 0, rayContrast: 0.35, irid: 0.05 }) }),
    ],
    extras: [
      { kind: 'spine', path: [[b.x(0.92), b.axis(0.92) + 0.003, b.width(0.92) + 0.002], [b.x(0.895), b.axis(0.895) + 0.004, b.width(0.895) + 0.0035], [b.x(0.87), b.axis(0.87) + 0.003, b.width(0.87) + 0.002]], radius: 0.0042, taper: 0.2, mirror: true, t: 0.89 },
    ],
    eye: eye({ t: eyeT, yn: eyeYn, r: 0.033, protrude: 0.36, forward: 0.2, up: 0.1, pupil: 0.48, iris: '#241a14', ring: 'eye', ringWidth: 0.2, socket: 'eye' }),
    motion: motion({
      wavelength: 1.2,
      amp: 0.045,
      idleAmp: 0.012,
      envPow: 2.8,
      headSway: 0.04,
      bendK: 0.6,
      pectoralHz: 2.6,
      idleFlutter: 0.55,
      finSoft: 0.4,
      finRest: 0.85,
      sag: 0.04,
      idleHz: 0.6,
      finLag: 0.8,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.35,
      bellyLine: -0.7,
      bellyAmount: 0.25,
      bellySoft: 0.4,
      scales: { cols: 64, strength: 0.12, kind: 'fine' },
      roughness: 0.45,
      gloss: 0.45,
      iridMode: 'body',
      iridHue: 0.62,
      sss: 0.35,
      lateralLine: 0,
      appendageColor: '#2a211d',
      lipColor: '#3a2e2a',
      marks: [
        // head a touch darker/plain (lines fade into tiny pale speckles on the head)
        { t: 0.06, yn: 0.0, rt: 0.17, ryn: 1.2, color: 'body', strength: 0.92, soft: 0.7 },
        // bright golden ring around the eye
        { t: eyeT, yn: eyeYn, rt: 0.052, ryn: 0.155, color: 'eye', strength: 1, soft: 0.25, mode: 'ring' },
      ],
    }),
    pickRadius: 0.55,
  };
};
