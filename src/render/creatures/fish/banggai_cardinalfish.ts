/**
 * Banggai cardinalfish (Pterapogon kauderni) — deep, compressed silvery body with a big eye and large oblique mouth;
 * tall triangular first dorsal, long high second dorsal and matching anal fin, long black pelvic fins, and a deeply
 * forked tail drawn out into long lobes. Three black bars (through the eye, from the first dorsal to the pelvics,
 * from the second dorsal to the anal fin) and pearly white spots scattered over the dark fins and rear body.
 * OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1.3), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.41,
    length: 0.7,
    dorsal: curve([[0, 0.05], [0.08, 0.1], [0.22, 0.142], [0.38, 0.152], [0.54, 0.138], [0.7, 0.1], [0.86, 0.07], [1, 0.062]]),
    ventral: curve([[0, 0.05], [0.1, 0.098], [0.28, 0.14], [0.44, 0.145], [0.6, 0.118], [0.76, 0.082], [0.92, 0.064], [1, 0.06]]),
    width: curve([[0, 0.03], [0.12, 0.054], [0.35, 0.06], [0.6, 0.044], [0.85, 0.027], [1, 0.022]]),
    axis: curve([[0, 0.008], [0.3, 0], [1, 0.004]]),
    expTop: 1.9,
    expBottom: 2.0,
    noseRound: 0.08,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: -0.02, t: 0.085, groove: 1 },
    operculum: { t: 0.25, strength: 0.8 },
    cheek: 0.3,
    keel: 0.25,
  };
  const b = new BodySampler(body);
  const dark = (o: Partial<Parameters<typeof fin>[0]> = {}) =>
    fin({ opacity: 0.93, color: 'fin', edge: 'fin', edgeStart: 0.9, edgeAmount: 1, pattern: 1, rayContrast: 0.35, irid: 0.15, ...o });
  return {
    key: `banggai|${fl}`,
    body,
    fins: [
      // deeply forked tail with long lobes; smoky silver with dark leading rays
      caudal(b, {
        kind: 'lyre',
        len: 0.3 * fl,
        spread: 38,
        rays: 16,
        soft: 0.55,
        rootH: 1,
        style: fin({ opacity: 0.62, color: '#6d7478', edge: 'fin', edgeStart: 0.55, edgeWidth: 0.45, edgeAmount: 0.8, pattern: 0.6, rayContrast: 0.5, irid: 0.2 }),
      }),
      // tall triangular first dorsal
      dorsal(b, {
        t0: 0.3,
        t1: 0.42,
        len: 0.22 * fl,
        angle0: 82,
        angle1: 56,
        profile: (s) => 1 - 0.55 * Math.pow(s, 0.9),
        rays: 7,
        soft: 0.45,
        style: dark(),
      }),
      // high second dorsal, longest rays in front, trailing back toward the tail
      dorsal(b, {
        t0: 0.5,
        t1: 0.8,
        len: 0.21 * fl,
        angle0: 70,
        angle1: 30,
        profile: (s) => (1 - 0.5 * smoothstep(0.1, 1, s)) * (0.85 + 0.15 * smoothstep(0, 0.15, s)),
        rays: 11,
        soft: 0.55,
        droop: 0.004,
        style: dark(),
      }),
      anal(b, {
        t0: 0.52,
        t1: 0.8,
        len: 0.2 * fl,
        angle0: 66,
        angle1: 30,
        profile: (s) => (1 - 0.5 * smoothstep(0.1, 1, s)) * (0.85 + 0.15 * smoothstep(0, 0.15, s)),
        rays: 10,
        soft: 0.55,
        style: dark(),
      }),
      // long black pelvic fins
      pelvic(b, {
        t: 0.31,
        yn0: -0.84,
        yn1: -0.92,
        tLen: 0.03,
        len: 0.17 * fl,
        out: 14,
        a0: -40,
        a1: -64,
        profile: (s) => 1 - s * 0.45,
        rays: 5,
        soft: 0.6,
        style: dark({ opacity: 0.95 }),
      }),
      pectoral(b, {
        t: 0.29,
        yn0: 0.05,
        yn1: -0.4,
        len: 0.1,
        out: 30,
        a0: 20,
        a1: -30,
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.22, color: 'fin2', pattern: 0, rayContrast: 0.35, flutter: 0.4, irid: 0.1 }),
      }),
    ],
    eye: eye({ t: 0.125, yn: 0.22, r: 0.046, protrude: 0.4, forward: 0.2, up: 0.06, pupil: 0.46, iris: 'eye', ring: '#8a7020', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 1.1,
      amp: 0.05,
      idleAmp: 0.01,
      envPow: 2.6,
      headSway: 0.04,
      pectoralHz: 3.2,
      idleFlutter: 0.7,
      finSoft: 0.6,
      finRest: 0.9,
      sag: 0.15,
      idleHz: 0.55,
      finLag: 1.1,
      breathe: 0.8,
    }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.5,
      bellyAmount: 0.5,
      scales: { cols: 26, strength: 0.55, kind: 'cycloid' },
      roughness: 0.3,
      gloss: 0.65,
      iridMode: 'scales',
      iridHue: 0.62,
      sss: 0.4,
      lateralLine: 0.2,
      // the appearance's "bands" become three bold bars (marks) + pearly spots drawn over them (pattern, accent → white)
      marksUnderPattern: true,
      patternMap: { bands: 'spots' },
      slots: { accent: 'fin2' },
      patA: [13, -0.32, 0.22, 0],
      marks: [
        // bar through the eye (slightly slanted)
        { t: 0.125, yn: 0.05, rt: 0.032, ryn: 1.5, rot: 0.08, mode: 'band_t', color: 'accent', strength: 1, soft: 0.18 },
        // bar from the first dorsal down to the pelvic fins
        { t: 0.34, yn: 0, rt: 0.05, ryn: 1.6, rot: 0.05, mode: 'band_t', color: 'accent', strength: 1, soft: 0.16 },
        // broad rear bar from the second dorsal to the anal fin, continuing onto those fins
        { t: 0.6, yn: 0, rt: 0.07, ryn: 1.6, rot: 0.06, mode: 'band_t', color: 'accent', strength: 1, soft: 0.14, onFins: 0.6 },
      ],
      lipColor: 'body2',
    }),
    pickRadius: 0.6,
  };
};
