/**
 * Yellow clown goby (Gobiodon okinawae) — tiny, chunky, laterally compressed coral goby with a steep blunt forehead,
 * scaleless glossy lemon skin (mucus sheen), small high eyes, two rounded dorsal fins, rounded tail and a pelvic cup
 * it perches on among coral branches. OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.38,
    length: 0.68,
    // steep rounded forehead, deep body, short thick peduncle
    dorsal: curve([[0, 0.075], [0.05, 0.12], [0.14, 0.15], [0.3, 0.16], [0.5, 0.142], [0.72, 0.1], [0.9, 0.066], [1, 0.058]]),
    ventral: curve([[0, 0.062], [0.08, 0.108], [0.26, 0.136], [0.46, 0.132], [0.68, 0.094], [0.88, 0.06], [1, 0.053]]),
    width: curve([[0, 0.032], [0.1, 0.05], [0.3, 0.054], [0.55, 0.043], [0.8, 0.028], [1, 0.022]]),
    axis: curve([[0, -0.012], [0.25, 0], [1, 0.004]]),
    expTop: 2.0,
    expBottom: 2.3,
    noseRound: 0.2,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.3, t: 0.055, groove: 0.8 },
    operculum: { t: 0.25, strength: 0.45 },
    cheek: 0.6,
  };
  const b = new BodySampler(body);
  const style = (o: Partial<Parameters<typeof fin>[0]> = {}) =>
    fin({ opacity: 0.9, color: 'fin', edge: 'fin2', edgeStart: 0.78, edgeWidth: 0.2, edgeAmount: 0.6, pattern: 0, rayContrast: 0.3, irid: 0.05, ...o });
  return {
    key: `clown_goby|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 30, rays: 14, soft: 0.3, rootH: 1, style: style() }),
      dorsal(b, {
        t0: 0.3,
        t1: 0.47,
        len: 0.085 * fl,
        angle0: 68,
        angle1: 44,
        profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.9)),
        rays: 6,
        soft: 0.3,
        style: style(),
      }),
      dorsal(b, {
        t0: 0.52,
        t1: 0.87,
        len: 0.09 * fl,
        angle0: 58,
        angle1: 26,
        profile: (s) => (0.75 + 0.25 * smoothstep(0, 0.4, s)) * (1 - 0.45 * smoothstep(0.78, 1, s)),
        rays: 10,
        soft: 0.3,
        style: style(),
      }),
      anal(b, {
        t0: 0.58,
        t1: 0.87,
        len: 0.085 * fl,
        angle0: 55,
        angle1: 25,
        profile: (s) => (0.75 + 0.25 * smoothstep(0, 0.4, s)) * (1 - 0.45 * smoothstep(0.78, 1, s)),
        rays: 9,
        soft: 0.3,
        style: style(),
      }),
      pectoral(b, {
        t: 0.28,
        yn0: 0.1,
        yn1: -0.55,
        len: 0.11,
        out: 36,
        a0: 24,
        a1: -36,
        profile: (s) => 0.78 + 0.22 * Math.sin(Math.PI * s),
        rays: 14,
        soft: 0.3,
        style: style({ opacity: 0.6, flutter: 0.35 }),
      }),
      // pelvic suction cup it perches on
      pelvic(b, {
        t: 0.25,
        yn0: -0.86,
        yn1: -0.95,
        tLen: 0.05,
        len: 0.075,
        out: 40,
        a0: -50,
        a1: -74,
        profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s),
        rays: 6,
        soft: 0.25,
        style: style({ opacity: 0.7 }),
      }),
    ],
    eye: eye({ t: 0.135, yn: 0.46, r: 0.036, protrude: 0.42, forward: 0.22, up: 0.3, pupil: 0.5, iris: 'eye', ring: '#6a5a20', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.06,
      idleAmp: 0.008,
      envPow: 2.2,
      pectoralHz: 3.2,
      idleFlutter: 0.4,
      finSoft: 0.35,
      finRest: 0.88,
      sag: 0,
      idleHz: 0.5,
      finLag: 0.7,
      breathe: 0.9,
    }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.5,
      bellyAmount: 0.5,
      bellySoft: 0.4,
      // Gobiodon are scaleless: glossy mucus-coated skin
      scales: { cols: 40, strength: 0, kind: 'skin' },
      roughness: 0.28,
      gloss: 0.85,
      iridMode: 'body',
      iridHue: 0.3,
      sss: 0.75,
      lateralLine: 0,
      marks: [
        // faint pale lines across the cheek (juvenile/individual variation, subtle)
        { t: 0.19, yn: -0.1, rt: 0.006, ryn: 0.45, rot: 0.2, mode: 'stripe', color: 'fin2', strength: 0.3, soft: 0.6 },
        { t: 0.23, yn: -0.05, rt: 0.006, ryn: 0.5, rot: 0.2, mode: 'stripe', color: 'fin2', strength: 0.25, soft: 0.6 },
      ],
      lipColor: 'body2',
    }),
    pickRadius: 0.5,
  };
};
