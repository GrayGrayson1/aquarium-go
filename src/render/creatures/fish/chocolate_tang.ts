/**
 * Chocolate tang / mimic surgeonfish (Acanthurus pyroferus, chunk 16) — a moderately deep Acanthurus with a protruding
 * snout and concave forehead; a crescent tail in adults (rounded in the young, as on the pygmy angels they copy).
 *  - Adult: chocolate brown, brownish red on the chest; an orange patch above the pectoral and gill opening; a broad
 *    black band down the gill margin; a narrow white chin band; orange-ringed eye; dark fins; a broad yellow rear
 *    border to the tail.
 *  - Young copy a pygmy angelfish of their size: most are all yellow (the Herald's angel); some are pale grey shading
 *    to black at the rear with a black tail (the pearlscale angel) — picked per individual, as where it lives decides.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import type { CreatureVisualParams } from '@/types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

/** Stable 0..1 from a string (which mimic a young fish copies). */
function unit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const halfblack = young && unit(args.creature?.id ?? 'x') < 0.3;
  const fl = bucket(finScale(args, 1), 0.1);
  let recolor: Partial<CreatureVisualParams> | undefined;
  if (young && halfblack) recolor = { bodyColor: '#cfcfbf', bodyColor2: '#1a1a1a', bellyColor: '#d8d8ca', finColor: '#1a1a1a', finColor2: '#2a2a2a', accentColor: '#cfcfbf', pattern: 'bicolor', patternContrast: 1, eyeColor: '#d06a2a' };
  else if (young) recolor = { bodyColor: '#ffd21f', bodyColor2: '#f5c20e', bellyColor: '#ffe060', finColor: '#ffd21f', finColor2: '#ffe060', accentColor: '#2e6fd8', pattern: 'solid', eyeColor: '#2e6fd8' };
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.76,
    // concave forehead into a short protruding snout
    dorsal: curve([[0, 0.022], [0.05, 0.036], [0.1, 0.07], [0.18, 0.12], [0.28, 0.155], [0.4, 0.168], [0.54, 0.158], [0.7, 0.112], [0.84, 0.06], [0.94, 0.037], [1, 0.034]]),
    ventral: curve([[0, 0.02], [0.05, 0.034], [0.12, 0.075], [0.22, 0.122], [0.34, 0.15], [0.46, 0.156], [0.6, 0.13], [0.74, 0.088], [0.86, 0.05], [0.95, 0.035], [1, 0.033]]),
    width: curve([[0, 0.016], [0.08, 0.028], [0.2, 0.04], [0.36, 0.048], [0.52, 0.044], [0.7, 0.032], [0.86, 0.018], [1, 0.013]]),
    axis: curve([[0, -0.01], [0.14, -0.003], [0.3, 0], [1, 0.002]]),
    expTop: 1.9,
    expBottom: 1.95,
    noseRound: 0.05,
    tailRound: 0.025,
    mouth: { kind: 'terminal', yn: -0.02, t: 0.03, groove: 0.7 },
    operculum: { t: 0.25, strength: 0.55 },
    cheek: 0.2,
    keel: 0.3,
  };
  const b = new BodySampler(body);
  const darkFin = fin({ opacity: 0.95, edge: young ? 'fin2' : '#3a6ab8', edgeStart: 0.85, edgeWidth: 0.12, edgeAmount: young ? 0.3 : 0.5, pattern: 0.2, rayContrast: 0.35, irid: 0.1 });
  return {
    key: `chocolate_tang|${young ? 'j' : 'a'}|${fl}`,
    body,
    fins: [
      young
        ? caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 34, rays: 16, soft: 0.3, rootH: 1.05, cup: 0.01, style: { ...darkFin, opacity: 0.92 } })
        : caudal(b, { kind: 'lyre', len: 0.23 * fl, spread: 38, rays: 16, soft: 0.3, rootH: 1.1, cup: 0.01, style: fin({ opacity: 0.94, color: 'fin', edge: 'fin2', edgeStart: 0.6, edgeWidth: 0.28, edgeAmount: 1, pattern: 0, rayContrast: 0.4, irid: 0.05 }) }),
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
        style: darkFin,
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
        style: darkFin,
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
        style: fin({ opacity: 0.55, color: young ? 'fin' : '#c46a2a', pattern: 0, rayContrast: 0.45, flutter: 0.35, irid: 0.1 }),
      }),
      pelvic(b, { t: 0.33, yn0: -0.86, yn1: -0.93, tLen: 0.02, len: 0.075, out: 16, a0: -35, a1: -60, rays: 5, soft: 0.25, style: fin({ opacity: 0.9, pattern: 0, rayContrast: 0.35, irid: 0.05 }) }),
    ],
    extras: [
      { kind: 'spine', path: [[b.x(0.92), b.axis(0.92) + 0.003, b.width(0.92) + 0.002], [b.x(0.895), b.axis(0.895) + 0.004, b.width(0.895) + 0.0035], [b.x(0.87), b.axis(0.87) + 0.003, b.width(0.87) + 0.002]], radius: 0.0042, taper: 0.2, mirror: true, t: 0.89 },
    ],
    eye: eye({ t: 0.2, yn: 0.36, r: 0.033, protrude: 0.36, forward: 0.2, up: 0.1, pupil: 0.48, iris: '#1a120e', ring: 'eye', ringWidth: 0.22, socket: young && !halfblack ? 'eye' : 'body' }),
    motion: motion({
      wavelength: 1.2,
      amp: 0.045,
      idleAmp: 0.012,
      envPow: 2.8,
      headSway: 0.04,
      bendK: 0.6,
      pectoralHz: young ? 3.4 : 2.6,
      idleFlutter: 0.55,
      finSoft: 0.4,
      finRest: 0.85,
      sag: 0.04,
      idleHz: 0.6,
      finLag: 0.8,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: young ? 0.1 : 0.3,
      bellyLine: -0.55,
      bellyAmount: young ? 0.35 : 0.5,
      bellySoft: 0.45,
      scales: { cols: 64, strength: 0.12, kind: 'fine' },
      roughness: 0.42,
      gloss: 0.5,
      iridMode: 'body',
      iridHue: 0.08,
      sss: young ? 0.8 : 0.4,
      lateralLine: 0,
      appendageColor: young ? 'body' : '#2a1d18',
      lipColor: young ? 'body2' : '#1a1010',
      // halfblack young: pale front shading to black behind (bicolour split along the body)
      patA: [0.55, 0.12, 0.1, 1],
      marks: young
        ? []
        : [
            // orange patch above the pectoral and gill opening
            { t: 0.28, yn: 0.05, rt: 0.075, ryn: 0.5, color: 'accent', strength: 0.9, soft: 0.55 },
            // broad black band down the gill margin
            { t: 0.245, yn: -0.15, rt: 0.018, ryn: 0.95, color: '#121010', strength: 0.95, soft: 0.35, rot: 0.15 },
            // narrow white chin band
            { t: 0.035, yn: -0.45, rt: 0.018, ryn: 0.45, color: '#f3f1ea', strength: 0.9, soft: 0.35, rot: 0.4 },
          ],
    }),
    pickRadius: 0.55,
    recolor,
  };
};
