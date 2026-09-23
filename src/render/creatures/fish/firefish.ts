/**
 * Firefish (Nemateleotris magnifica) — slender dartfish; a very tall first-dorsal filament it flicks as a signal,
 * cream-white front with a yellow face, fading into flame red-orange over the rear third, red tail with dark
 * edges, long low second dorsal and anal fins. OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic, sailDorsal } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1.2), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.8,
    dorsal: curve([[0, 0.03], [0.08, 0.05], [0.25, 0.066], [0.5, 0.066], [0.75, 0.054], [0.92, 0.042], [1, 0.04]]),
    ventral: curve([[0, 0.028], [0.1, 0.048], [0.3, 0.062], [0.55, 0.06], [0.78, 0.046], [0.93, 0.038], [1, 0.037]]),
    width: curve([[0, 0.022], [0.12, 0.035], [0.35, 0.038], [0.65, 0.029], [0.9, 0.017], [1, 0.015]]),
    axis: curve([[0, 0.006], [0.25, 0], [1, 0.002]]),
    expTop: 2.1,
    expBottom: 2.2,
    noseRound: 0.07,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.2, t: 0.045, groove: 0.8 },
    operculum: { t: 0.2, strength: 0.6 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  return {
    key: `firefish|${fl}`,
    body,
    fins: [
      // rounded-lanceolate flame tail with a dark margin
      caudal(b, {
        kind: 'spade',
        len: 0.2 * fl,
        spread: 30,
        rays: 14,
        soft: 0.4,
        rootH: 1,
        style: fin({ opacity: 0.9, color: 'fin', edge: 'fin2', edgeStart: 0.7, edgeWidth: 0.2, edgeAmount: 0.85, pattern: 0, rayContrast: 0.4, irid: 0.1 }),
      }),
      // the signature: first dorsal drawn out into a very long flicking filament
      sailDorsal(b, {
        t0: 0.21,
        t1: 0.29,
        len: 0.4 * fl,
        angle0: 84,
        angle1: 64,
        profile: (s) => Math.max(0.12, 1 - 0.86 * Math.pow(s, 0.55)),
        rays: 5,
        soft: 0.9,
        cup: 0.004,
        segS: 14,
        segR: 22,
        style: fin({ opacity: 0.82, color: 'body', edge: 'fin', edgeStart: 0.45, edgeWidth: 0.4, edgeAmount: 0.8, pattern: 0, rayContrast: 0.55, irid: 0.1, flutter: 0.9 }),
      }),
      // long low second dorsal, cream in front turning red (mark below)
      dorsal(b, {
        t0: 0.33,
        t1: 0.9,
        len: 0.075 * fl,
        angle0: 50,
        angle1: 24,
        profile: (s) => (0.7 + 0.3 * smoothstep(0, 0.5, s)) * (1 - 0.5 * smoothstep(0.82, 1, s)),
        rays: 14,
        soft: 0.4,
        style: fin({ opacity: 0.72, color: 'body', edge: 'fin', edgeStart: 0.55, edgeAmount: 0.5, pattern: 0, rayContrast: 0.4, irid: 0.1 }),
      }),
      anal(b, {
        t0: 0.44,
        t1: 0.9,
        len: 0.07 * fl,
        angle0: 50,
        angle1: 24,
        profile: (s) => (0.7 + 0.3 * smoothstep(0, 0.5, s)) * (1 - 0.5 * smoothstep(0.82, 1, s)),
        rays: 12,
        soft: 0.4,
        style: fin({ opacity: 0.72, color: 'body', edge: 'fin', edgeStart: 0.55, edgeAmount: 0.5, pattern: 0, rayContrast: 0.4, irid: 0.1 }),
      }),
      pelvic(b, {
        t: 0.24,
        yn0: -0.8,
        yn1: -0.9,
        tLen: 0.02,
        len: 0.07,
        out: 18,
        a0: -30,
        a1: -55,
        rays: 4,
        soft: 0.4,
        style: fin({ opacity: 0.6, color: 'body', pattern: 0, rayContrast: 0.3, irid: 0.1 }),
      }),
      pectoral(b, {
        t: 0.25,
        yn0: 0.05,
        yn1: -0.4,
        len: 0.075,
        out: 30,
        a0: 20,
        a1: -28,
        rays: 11,
        soft: 0.3,
        style: fin({ opacity: 0.26, color: 'body', pattern: 0, rayContrast: 0.35, flutter: 0.45, irid: 0.1 }),
      }),
    ],
    eye: eye({ t: 0.11, yn: 0.32, r: 0.033, protrude: 0.42, forward: 0.22, up: 0.1, pupil: 0.52, iris: 'eye', ring: '#c9a23a', ringWidth: 0.06 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.07,
      idleAmp: 0.014,
      envPow: 2.0,
      pectoralHz: 4.5,
      idleFlutter: 0.6,
      finSoft: 0.55,
      finRest: 0.88,
      sag: 0.05,
      idleHz: 0.9,
      finLag: 1.0,
      flick: 1,
    }),
    look: look({
      dorsalDark: 0,
      bellyLine: -0.6,
      bellyAmount: 0.4,
      scales: { cols: 56, strength: 0.25, kind: 'fine' },
      roughness: 0.36,
      gloss: 0.6,
      iridMode: 'body',
      iridHue: 0.8,
      sss: 0.65,
      lateralLine: 0,
      pattern: 'bicolor',
      // cream front → flame rear, the boundary slanting forward toward the belly
      patA: [0.66, 0.12, 0.08, 1],
      marks: [
        // golden-yellow face and snout
        { t: 0.07, yn: 0.1, rt: 0.13, ryn: 1.4, color: 'accent', strength: 0.82, soft: 0.85 },
        // faint lavender flush on the top of the head
        { t: 0.14, yn: 0.9, rt: 0.12, ryn: 0.35, color: '#b48ad0', strength: 0.35, soft: 0.9 },
        // rear dorsal / anal fins take the flame colour
        { t: 0.95, yn: 0, rt: 0.3, ryn: 3, color: 'body2', strength: 0.8, soft: 0.7, onFins: 1 },
      ],
      lipColor: 'accent',
    }),
    pickRadius: 0.55,
  };
};
