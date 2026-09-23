/**
 * Yellow watchman goby (Cryptocentrus cinctus) — bulky cylindrical goby with a big blunt head, puffy cheeks, a wide
 * thick-lipped mouth and large eyes set high on top of the head; blue-rimmed pale-blue spots over yellow, two dorsal
 * fins (rounded spiny first), long pointed (lanceolate) tail, big rounded pectorals and a pelvic cup to sit on.
 * The grey phase shows darker saddle bars. OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const grey = a.pattern === 'bars';
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.77,
    dorsal: curve([[0, 0.04], [0.06, 0.068], [0.16, 0.088], [0.3, 0.09], [0.5, 0.078], [0.75, 0.058], [0.92, 0.047], [1, 0.045]]),
    ventral: curve([[0, 0.036], [0.08, 0.064], [0.2, 0.082], [0.4, 0.08], [0.65, 0.062], [0.88, 0.047], [1, 0.043]]),
    width: curve([[0, 0.038], [0.08, 0.066], [0.2, 0.078], [0.42, 0.066], [0.7, 0.045], [0.9, 0.03], [1, 0.026]]),
    axis: curve([[0, -0.006], [0.2, 0], [1, 0.004]]),
    expTop: 2.15,
    expBottom: 2.6,
    noseRound: 0.1,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.22, t: 0.075, groove: 1 },
    operculum: { t: 0.24, strength: 0.75 },
    cheek: 0.9,
  };
  const b = new BodySampler(body);
  const edge = grey ? ('body2' as const) : ('fin2' as const);
  return {
    key: `watchman_goby|${fl}`,
    body,
    fins: [
      // long pointed (lanceolate) tail
      caudal(b, {
        kind: 'spade',
        len: 0.25 * fl,
        spread: 24,
        rays: 15,
        soft: 0.4,
        rootH: 1,
        style: fin({ opacity: 0.85, color: 'fin', edge, edgeStart: 0.78, edgeWidth: 0.15, edgeAmount: 0.7, pattern: 0.6, rayContrast: 0.45, irid: 0.1 }),
      }),
      // spiny first dorsal: tall and rounded, blue-edged
      dorsal(b, {
        t0: 0.29,
        t1: 0.43,
        len: 0.13 * fl,
        angle0: 72,
        angle1: 42,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.2 + s * 0.85)),
        rays: 6,
        soft: 0.35,
        style: fin({ opacity: 0.88, color: 'fin', edge, edgeStart: 0.72, edgeWidth: 0.18, edgeAmount: 0.85, pattern: 0.7, rayContrast: 0.45, irid: 0.1 }),
      }),
      // long soft second dorsal
      dorsal(b, {
        t0: 0.47,
        t1: 0.86,
        len: 0.1 * fl,
        angle0: 58,
        angle1: 26,
        profile: (s) => (0.75 + 0.25 * smoothstep(0, 0.5, s)) * (1 - 0.45 * smoothstep(0.8, 1, s)),
        rays: 12,
        soft: 0.4,
        style: fin({ opacity: 0.85, color: 'fin', edge, edgeStart: 0.75, edgeWidth: 0.2, edgeAmount: 0.8, pattern: 0.7, rayContrast: 0.45, irid: 0.1 }),
      }),
      anal(b, {
        t0: 0.56,
        t1: 0.86,
        len: 0.085 * fl,
        angle0: 55,
        angle1: 25,
        profile: (s) => (0.75 + 0.25 * smoothstep(0, 0.5, s)) * (1 - 0.45 * smoothstep(0.8, 1, s)),
        rays: 10,
        soft: 0.4,
        style: fin({ opacity: 0.85, color: 'fin', edge, edgeStart: 0.72, edgeWidth: 0.2, edgeAmount: 0.8, pattern: 0.4, rayContrast: 0.45, irid: 0.1 }),
      }),
      // big rounded fan pectorals (gobies prop themselves on them)
      pectoral(b, {
        t: 0.27,
        yn0: 0.05,
        yn1: -0.62,
        len: 0.12,
        out: 38,
        a0: 26,
        a1: -40,
        profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * s),
        rays: 16,
        soft: 0.3,
        style: fin({ opacity: 0.55, color: 'fin', pattern: 0, rayContrast: 0.5, flutter: 0.3, irid: 0.05 }),
      }),
      // fused pelvic cup under the throat, splayed to sit on the sand
      pelvic(b, {
        t: 0.24,
        yn0: -0.86,
        yn1: -0.95,
        tLen: 0.05,
        len: 0.085,
        out: 42,
        a0: -48,
        a1: -72,
        profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s),
        rays: 6,
        soft: 0.3,
        style: fin({ opacity: 0.6, color: 'fin', pattern: 0, rayContrast: 0.4, irid: 0.05 }),
      }),
    ],
    // large eyes set high on top of the head, looking up and out (lookout for its shrimp partner)
    eye: eye({ t: 0.105, yn: 0.72, r: 0.036, protrude: 0.52, forward: 0.2, up: 0.55, pupil: 0.44, swivel: 0.9, iris: 'eye', ring: '#7a5a1a', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 0.95,
      amp: 0.08,
      idleAmp: 0.008,
      envPow: 1.8,
      headSway: 0.1,
      pectoralHz: 2.6,
      idleFlutter: 0.35,
      finSoft: 0.45,
      finRest: 0.84,
      sag: 0.05,
      idleHz: 0.5,
      finLag: 0.9,
      breathe: 0.9,
    }),
    look: look({
      dorsalDark: grey ? 0.35 : 0.18,
      bellyLine: -0.55,
      bellyAmount: 0.55,
      scales: { cols: 54, strength: 0.3, kind: 'fine' },
      roughness: 0.42,
      gloss: 0.55,
      iridMode: 'body',
      iridHue: 0.5,
      sss: 0.5,
      lateralLine: 0,
      // yellow phase: pale-blue spots with a deep-blue rim; grey phase: dark saddle bars
      patA: grey ? [0.4, 0, 0.02, -0.1] : [4, -0.08, -0.05, 0],
      patB: [1, 0, 0, 0],
      patternEdge: '#1d4f8f',
      slots: grey ? { accent: 'body2' } : undefined,
      patternBellyFade: grey ? -2 : -0.75,
      marks: [
        // blue-edged cheek spots cluster more densely on the face
        { t: 0.16, yn: -0.2, rt: 0.012, ryn: 0.08, color: 'accent', strength: grey ? 0 : 0.85, soft: 0.25 },
        { t: 0.2, yn: 0.1, rt: 0.011, ryn: 0.07, color: 'accent', strength: grey ? 0 : 0.85, soft: 0.25 },
        { t: 0.13, yn: 0.25, rt: 0.01, ryn: 0.07, color: 'accent', strength: grey ? 0 : 0.8, soft: 0.25 },
      ],
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
};
