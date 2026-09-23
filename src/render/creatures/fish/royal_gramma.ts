/**
 * Royal gramma (Gramma loreto) — basslet body, vivid purple front half fading into golden-yellow rear, black spot on
 * the front of the long dorsal fin, thin dark line from the mouth through the eye, long purple pelvic fins.
 * OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.8,
    dorsal: curve([[0, 0.036], [0.08, 0.066], [0.22, 0.094], [0.42, 0.102], [0.62, 0.086], [0.8, 0.062], [0.94, 0.05], [1, 0.048]]),
    ventral: curve([[0, 0.032], [0.1, 0.064], [0.3, 0.09], [0.5, 0.088], [0.7, 0.066], [0.88, 0.05], [1, 0.046]]),
    width: curve([[0, 0.026], [0.12, 0.046], [0.35, 0.052], [0.6, 0.04], [0.85, 0.022], [1, 0.018]]),
    axis: curve([[0, -0.004], [0.3, 0], [1, 0.002]]),
    expTop: 2.05,
    expBottom: 2.2,
    noseRound: 0.085,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.02, t: 0.055, groove: 0.8 },
    operculum: { t: 0.24, strength: 0.7 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  return {
    key: `royal_gramma|${fl}`,
    body,
    fins: [
      // slightly emarginate yellow tail
      caudal(b, {
        kind: 'emarginate',
        len: 0.2 * fl,
        spread: 30,
        fork: 0.45,
        rays: 16,
        soft: 0.35,
        rootH: 1,
        style: fin({ opacity: 0.86, color: 'fin2', edgeStart: 0.8, pattern: 0, rayContrast: 0.45, irid: 0.1 }),
      }),
      // one long continuous dorsal: purple in front with the black "royal" spot (fin-only mark), golden toward the tail
      dorsal(b, {
        t0: 0.25,
        t1: 0.88,
        len: 0.1 * fl,
        angle0: 70,
        angle1: 22,
        profile: (s) => (0.82 + 0.18 * smoothstep(0.1, 0.6, s)) * (1 - 0.45 * smoothstep(0.82, 1, s)),
        rays: 22,
        soft: 0.35,
        style: fin({ opacity: 0.8, color: 'fin', edgeStart: 0.85, pattern: 0, rayContrast: 0.4, irid: 0.1 }),
      }),
      anal(b, {
        t0: 0.56,
        t1: 0.88,
        len: 0.1 * fl,
        angle0: 58,
        angle1: 22,
        profile: (s) => (0.7 + 0.3 * smoothstep(0, 0.6, s)) * (1 - 0.45 * smoothstep(0.8, 1, s)),
        rays: 12,
        soft: 0.35,
        style: fin({ opacity: 0.82, color: 'fin', pattern: 0, rayContrast: 0.4, irid: 0.1 }),
      }),
      // long purple pelvic fins
      pelvic(b, {
        t: 0.27,
        yn0: -0.82,
        yn1: -0.9,
        tLen: 0.025,
        len: 0.15 * fl,
        out: 16,
        a0: -32,
        a1: -58,
        profile: (s) => 1 - s * 0.45,
        rays: 4,
        soft: 0.5,
        style: fin({ opacity: 0.92, color: 'fin', pattern: 0, rayContrast: 0.3, irid: 0.2 }),
      }),
      pectoral(b, {
        t: 0.29,
        yn0: 0.0,
        yn1: -0.42,
        len: 0.095,
        out: 30,
        a0: 20,
        a1: -28,
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.3, color: 'fin2', pattern: 0, rayContrast: 0.35, flutter: 0.35, irid: 0.1 }),
      }),
    ],
    eye: eye({ t: 0.115, yn: 0.3, r: 0.036, protrude: 0.4, forward: 0.22, up: 0.08, pupil: 0.46, iris: 'eye', ring: '#3a2450', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 1.05,
      amp: 0.06,
      idleAmp: 0.014,
      envPow: 2.3,
      pectoralHz: 3.8,
      idleFlutter: 0.55,
      finSoft: 0.45,
      finRest: 0.86,
      sag: 0.05,
      idleHz: 0.8,
      finLag: 0.8,
    }),
    look: look({
      dorsalDark: 0,
      bellyLine: -0.55,
      bellyAmount: 0.35,
      scales: { cols: 42, strength: 0.4, kind: 'ctenoid' },
      roughness: 0.38,
      gloss: 0.55,
      iridMode: 'body',
      iridHue: 0.72,
      sss: 0.55,
      lateralLine: 0.15,
      // purple → gold split just behind mid-body, slightly slanted and softly feathered
      pattern: 'bicolor',
      patA: [0.5, 0.075, -0.05, 1],
      marks: [
        // thin dark line from the mouth up through the eye
        { t: 0.11, yn: 0.25, rt: 0.3, ryn: 0.014, rot: -1.28, mode: 'stripe', color: 'accent', strength: 0.9, soft: 0.3 },
        // black spot on the front of the dorsal fin (fins only)
        { t: 0.31, yn: 1.2, rt: 0.06, ryn: 0.7, color: 'accent', strength: 1, soft: 0.3, onFins: 2 },
        // golden rear of dorsal / anal fins and tail (fins inherit the rear colour)
        { t: 0.9, yn: 0, rt: 0.3, ryn: 3, color: 'body2', strength: 0.85, soft: 0.6, onFins: 1 },
      ],
      lipColor: 'fin',
    }),
    pickRadius: 0.55,
  };
};
