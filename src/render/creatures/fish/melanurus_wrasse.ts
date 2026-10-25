/**
 * Melanurus wrasse (Halichoeres melanurus, chunk 16) — a slim, spindle-shaped wrasse with a nearly straight head
 * profile, a small terminal mouth, a long low dorsal fin and a squared tail. Females: alternating orange-yellow and
 * blue stripes, a yellow-green head, a small black spot at the front of the dorsal fin, a large ringed eyespot mid-
 * dorsal and a small one at the top of the tail base. Young: duller and finer-striped with the same eyespots. Terminal
 * males: mauve with green-blue stripes, pinkish-orange wavy bands on a yellow-green head, narrow blue bars above, a
 * yellow pectoral base with a patch of black scales behind it and a black tail tip; the dorsal spots gone.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import type { CreatureVisualParams } from '@/types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const male = !young && !isFemale(args) && args.creature?.sex === 'male';
  const fl = bucket(finScale(args, 1), 0.1);
  let recolor: Partial<CreatureVisualParams> | undefined;
  if (male) recolor = { bodyColor: '#9a7db4', bodyColor2: '#7a5e9a', bellyColor: '#c4b0d6', accentColor: '#2fb0a0', finColor: '#a68cc0', finColor2: '#3a70d2', patternContrast: 1 };
  else if (young) recolor = { bodyColor: '#5a8cc0', bodyColor2: '#3e6a98', bellyColor: '#c8dcea', accentColor: '#e8b45a', finColor: '#d8c27a', patternContrast: 0.7 };
  const body: FishPlan['body'] = {
    noseX: 0.44,
    length: 0.8,
    dorsal: curve([[0, 0.02], [0.05, 0.036], [0.12, 0.058], [0.24, 0.078], [0.4, 0.084], [0.6, 0.074], [0.8, 0.052], [0.93, 0.036], [1, 0.032]]),
    ventral: curve([[0, 0.016], [0.06, 0.032], [0.14, 0.055], [0.28, 0.07], [0.44, 0.072], [0.62, 0.06], [0.8, 0.044], [0.94, 0.032], [1, 0.03]]),
    width: curve([[0, 0.016], [0.1, 0.032], [0.26, 0.042], [0.44, 0.04], [0.66, 0.03], [0.86, 0.018], [1, 0.014]]),
    axis: curve([[0, -0.004], [0.3, 0], [1, 0.002]]),
    expTop: 2.1,
    expBottom: 2.1,
    noseRound: 0.06,
    tailRound: 0.025,
    mouth: { kind: 'terminal', yn: -0.02, t: 0.03, groove: 0.6 },
    operculum: { t: 0.22, strength: 0.5 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const lowFin = fin({ opacity: 0.88, edge: 'fin2', edgeStart: 0.72, edgeWidth: 0.2, edgeAmount: 0.6, pattern: 0.35, rayContrast: 0.35, irid: 0.2 });
  const marks: Mark[] = [
    // yellow-green head (pinkish-orange wavy bands over it in males)
    { t: 0.08, yn: 0.05, rt: 0.15, ryn: 1.3, color: '#c9d35a', strength: male ? 0.75 : 0.6, soft: 0.6 },
  ];
  if (male) {
    marks.push(
      { t: 0.1, yn: 0.25, rt: 0.12, ryn: 0.06, color: '#f28c6a', strength: 0.9, soft: 0.5, mode: 'stripe', rot: 0.25 },
      { t: 0.11, yn: -0.25, rt: 0.12, ryn: 0.06, color: '#f28c6a', strength: 0.9, soft: 0.5, mode: 'stripe', rot: -0.2 },
      // yellow pectoral base and the patch of black scales behind it
      { t: 0.29, yn: -0.15, rt: 0.025, ryn: 0.3, color: '#f2d33a', strength: 0.9, soft: 0.45 },
      { t: 0.35, yn: -0.1, rt: 0.03, ryn: 0.28, color: '#151515', strength: 0.85, soft: 0.45 },
      // narrow blue bars over the upper flank
      { t: 0.55, yn: 0.62, rt: 0.28, ryn: 0.3, color: '#3a70d2', strength: 0.45, soft: 0.5, mode: 'band_y' },
    );
  } else {
    // the front dorsal spot, the big ringed eyespot mid-dorsal (on the fin) and the small one at the tail base
    marks.push(
      { t: 0.3, yn: 1, rt: 0.018, ryn: 0.5, color: '#111111', strength: 0.95, soft: 0.35, onFins: 2 },
      { t: 0.56, yn: 1, rt: 0.045, ryn: 0.8, color: '#cfe9f7', strength: 0.9, soft: 0.3, onFins: 2 },
      { t: 0.56, yn: 1, rt: 0.032, ryn: 0.6, color: '#111111', strength: 1, soft: 0.3, onFins: 2 },
      { t: 0.95, yn: 0.55, rt: 0.025, ryn: 0.3, color: '#111111', strength: 0.95, soft: 0.35 },
    );
  }
  return {
    key: `melanurus_wrasse|${male ? "m" : "f"}|${fl}`,
    body,
    fins: [
      caudal(b, {
        kind: 'truncate',
        len: 0.15 * fl,
        spread: 34,
        rays: 14,
        soft: 0.35,
        rootH: 1.05,
        cup: 0.008,
        // males: a black tail tip; females: a yellow tail
        style: fin({ opacity: 0.9, color: male ? 'fin' : '#f0b23a', edge: male ? '#151515' : 'fin', edgeStart: 0.7, edgeWidth: 0.2, edgeAmount: male ? 0.9 : 0.2, pattern: 0.2, rayContrast: 0.35, irid: 0.1 }),
      }),
      dorsal(b, {
        t0: 0.24,
        t1: 0.88,
        len: 0.06 * fl,
        angle0: 66,
        angle1: 38,
        profile: (s) => 0.75 + 0.25 * smoothstep(0, 0.3, s) - 0.15 * smoothstep(0.85, 1, s),
        rays: 22,
        soft: 0.35,
        cup: 0.004,
        segS: 36,
        segR: 8,
        inset: 0.03,
        style: lowFin,
      }),
      anal(b, { t0: 0.55, t1: 0.88, len: 0.055 * fl, angle0: 60, angle1: 34, profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s), rays: 14, soft: 0.35, style: lowFin }),
      pectoral(b, {
        t: 0.28,
        yn0: -0.05,
        yn1: -0.38,
        len: 0.1,
        out: 30,
        a0: 24,
        a1: -20,
        profile: (s) => 1 - 0.45 * s,
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.4, color: 'fin', pattern: 0, rayContrast: 0.35, flutter: 0.9, irid: 0.1 }),
      }),
      pelvic(b, { t: 0.31, yn0: -0.86, yn1: -0.93, tLen: 0.02, len: (male ? 0.075 : 0.055) * fl, out: 14, a0: -32, a1: -58, rays: 5, soft: 0.3, style: fin({ opacity: 0.8, pattern: 0, rayContrast: 0.3, irid: 0.1 }) }),
    ],
    eye: eye({ t: 0.12, yn: 0.25, r: 0.032, protrude: 0.38, forward: 0.22, up: 0.08, pupil: 0.48, iris: 'eye', ring: '#2a160e', ringWidth: 0.08 }),
    motion: motion({
      // labriform: rows with the pectorals; the body stays fairly straight and the tail mostly trails
      wavelength: 1.1,
      amp: 0.04,
      idleAmp: 0.01,
      envPow: 2.8,
      headSway: 0.05,
      pectoralHz: 4.2,
      pectoralAmp: 0.75,
      idleFlutter: 0.85,
      finSoft: 0.4,
      finRest: 0.75,
      sag: 0.04,
      idleHz: 0.8,
      finLag: 0.7,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.15,
      bellyLine: -0.6,
      bellyAmount: 0.25,
      scales: { cols: 44, strength: 0.35, kind: 'cycloid' },
      roughness: 0.34,
      gloss: 0.55,
      iridMode: 'scales',
      iridHue: 0.5,
      sss: 0.35,
      lateralLine: 0,
      lipColor: 'body2',
      // fine alternating stripes along the body
      patA: [young ? 7 : 4.5, 0, young ? 0.06 : 0.16, 0],
      patternBellyFade: -0.75,
      marks,
    }),
    pickRadius: 0.55,
    recolor,
  };
};
