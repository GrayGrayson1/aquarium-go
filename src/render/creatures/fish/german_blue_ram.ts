/**
 * German blue ram (Mikrogeophagus ramirezi, chunk 16) — a small, oval, deep-bodied dwarf cichlid with a high dorsal
 * fin whose first spines are black, a rounded-truncate tail and a red eye crossed by a black bar. Wild-type: a golden
 * head and chest, a pale violet-grey body flecked with electric-blue spangles, a black blotch mid-flank, blue-spangled
 * fins edged red. Females are smaller with a rose-pink belly and a shorter dorsal; males have a taller dorsal with
 * longer front rays. Electric blue, gold and black forms come from the appearance's colours; the balloon form (finType
 * 'balloon') is short and round-bodied.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, spinyDorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const fl = bucket(finScale(args, 1), 0.1);
  const female = isFemale(args);
  const balloon = a.finType === 'balloon';
  const k = balloon ? 1.18 : 1;
  const body: FishPlan['body'] = {
    noseX: balloon ? 0.38 : 0.42,
    length: balloon ? 0.66 : 0.74,
    dorsal: curve([[0, 0.034], [0.07, 0.07 * k], [0.18, 0.118 * k], [0.34, 0.142 * k], [0.52, 0.136 * k], [0.7, 0.1 * k], [0.86, 0.064], [1, 0.05]]),
    ventral: curve([[0, 0.03], [0.08, 0.066 * k], [0.22, 0.116 * k], [0.4, 0.136 * k], [0.58, 0.12 * k], [0.76, 0.08 * k], [0.92, 0.054], [1, 0.048]]),
    width: curve([[0, 0.022], [0.12, 0.04], [0.34, 0.048], [0.58, 0.04], [0.82, 0.026], [1, 0.02]]),
    axis: curve([[0, 0.004], [0.3, 0], [1, 0.002]]),
    expTop: 1.95,
    expBottom: 2.0,
    noseRound: 0.08,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.05, t: 0.035, groove: 0.75 },
    operculum: { t: 0.24, strength: 0.65 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  const spangle = fin({ opacity: 0.72, color: 'fin', edge: 'fin2', edgeStart: 0.78, edgeWidth: 0.2, edgeAmount: 0.85, pattern: 0.6, rayContrast: 0.5, irid: 0.6 });
  const marks: Mark[] = [
    // golden head and chest
    { t: 0.12, yn: -0.1, rt: 0.17, ryn: 1.25, color: 'body2', strength: 0.75, soft: 0.7 },
    // the black bar through the eye, and the black blotch mid-flank under the dorsal
    { t: 0.13, yn: 0.15, rt: 0.03, ryn: 1.1, color: '#0c0c10', strength: 0.95, soft: 0.25, mode: 'band_t' },
    { t: 0.46, yn: 0.1, rt: 0.05, ryn: 0.28, color: '#0c0c10', strength: 0.85, soft: 0.35 },
    // the black front of the dorsal fin
    { t: 0.3, yn: 1, rt: 0.05, ryn: 0.6, color: '#0c0c10', strength: 0.95, soft: 0.3, onFins: 2 },
  ];
  if (female) marks.push({ t: 0.42, yn: -0.72, rt: 0.12, ryn: 0.28, color: '#e06a8a', strength: 0.75, soft: 0.6 });
  return {
    key: `german_blue_ram|${female ? 'f' : 'm'}|${balloon ? 'b' : 'n'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 32, rays: 15, soft: 0.4, rootH: 1.05, cup: 0.01, style: spangle }),
      spinyDorsal(b, { t0: 0.26, t1: 0.52, len: (female ? 0.1 : 0.14) * fl, angle0: 74, angle1: 58, profile: (s) => (female ? 0.85 : 1.15 - 0.4 * s) * (1 - 0.15 * Math.sin(Math.PI * s)), rays: 9, soft: 0.3, style: spangle }),
      dorsal(b, { t0: 0.52, t1: 0.84, len: 0.12 * fl, angle0: 62, angle1: 28, profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, 0.15 + s)), rays: 11, soft: 0.4, style: spangle }),
      anal(b, { t0: 0.6, t1: 0.82, len: 0.11 * fl, angle0: 58, angle1: 26, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s)), rays: 9, soft: 0.4, style: spangle }),
      pectoral(b, { t: 0.27, yn0: -0.05, yn1: -0.45, len: 0.09, out: 28, a0: 22, a1: -26, rays: 11, soft: 0.3, style: fin({ opacity: 0.25, color: 'clear', pattern: 0, rayContrast: 0.3, flutter: 0.55, irid: 0.1 }) }),
      pelvic(b, { t: 0.32, yn0: -0.86, yn1: -0.92, tLen: 0.02, len: 0.1 * fl, out: 18, a0: -26, a1: -55, rays: 6, soft: 0.35, style: fin({ opacity: 0.85, color: 'fin2', edge: '#2a6ad8', edgeStart: 0.1, edgeWidth: 0.2, edgeAmount: 0.6, pattern: 0, rayContrast: 0.3, irid: 0.4 }) }),
    ],
    eye: eye({ t: 0.13, yn: 0.28, r: 0.04, protrude: 0.38, forward: 0.22, up: 0.1, pupil: 0.48, iris: 'eye', ring: '#a81a1a', ringWidth: 0.22 }),
    motion: motion({ wavelength: 1.1, amp: 0.05, idleAmp: 0.014, envPow: 2.5, headSway: 0.05, pectoralHz: 3.8, idleFlutter: 0.6, finSoft: 0.45, finRest: 0.88, sag: 0.05, idleHz: 0.8, finLag: 0.9, breathe: 0.6 }),
    look: look({
      dorsalDark: 0.15,
      bellyLine: -0.55,
      bellyAmount: 0.5,
      scales: { cols: 30, strength: 0.45, kind: 'ctenoid' },
      roughness: 0.32,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: 0.6,
      sss: 0.55,
      lateralLine: 0.1,
      lipColor: 'body2',
      // electric-blue spangles over the body and fins (the appearance's speckles)
      patternMap: { solid: 'speckled' },
      marks,
    }),
    pickRadius: 0.55,
  };
};
