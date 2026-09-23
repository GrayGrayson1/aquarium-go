/**
 * Pea puffer (Carinotetraodon travancoricus) — round body, huge independently swivelling eyes, tiny fins,
 * hummingbird pectorals, sculling dorsal/anal fins, rudder tail, dark blotches on gold-olive, white belly, puffing.
 * OWNER: lane "fishart".
 */
import type { CreatureFactoryArgs } from '../types';
import type { FishPlan } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral } from '../core/fins';
import { motion, look, eye, fin, isFemale } from './common';
import { mixHex } from '../core/palette';

export function peaPufferPlan(args: CreatureFactoryArgs): FishPlan {
  const male = !isFemale(args) && args.creature?.sex === 'male';
  const a = args.appearance;
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.7,
    dorsal: curve([[0, 0.055], [0.1, 0.105], [0.25, 0.14], [0.42, 0.148], [0.58, 0.132], [0.72, 0.1], [0.86, 0.062], [1, 0.04]]),
    ventral: curve([[0, 0.05], [0.1, 0.1], [0.28, 0.145], [0.46, 0.152], [0.62, 0.125], [0.76, 0.082], [0.9, 0.048], [1, 0.038]]),
    width: curve([[0, 0.055], [0.12, 0.105], [0.3, 0.128], [0.46, 0.122], [0.62, 0.1], [0.78, 0.064], [0.9, 0.034], [1, 0.024]]),
    axis: curve([[0, 0.01], [0.3, 0], [1, 0.005]]),
    expTop: 2.15,
    expBottom: 2.05,
    noseRound: 0.13,
    tailRound: 0.03,
    mouth: { kind: 'beak', yn: -0.08, t: 0.035, groove: 0.9 },
    operculum: { t: 0.27, strength: 0.25 },
    cheek: 0.4,
  };
  const b = new BodySampler(body);
  const marks: NonNullable<FishPlan['look']['marks']> = [
    // pale eye patch and cheek sheen
    { t: 0.2, yn: -0.25, rt: 0.08, ryn: 0.28, color: 'belly', strength: 0.35, soft: 0.8 },
  ];
  if (male) {
    // males: dark ventral stripe and wrinkle lines behind the eye
    marks.push({ t: 0.48, yn: -0.7, rt: 0.3, ryn: 0.16, color: '#4a4226', strength: 0.45, soft: 0.9 });
    marks.push({ t: 0.26, yn: 0.25, rt: 0.045, ryn: 0.035, color: '#4b4a26', strength: 0.4, soft: 0.6, mode: 'ring' });
  }
  return {
    key: `pea_puffer|${male ? 'm' : 'f'}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2, spread: 34, rays: 10, soft: 0.35, rootH: 0.9, style: fin({ opacity: 0.32, color: 'fin', edgeStart: 0.7, pattern: 0, rayContrast: 0.5, irid: 0.2 }) }),
      dorsal(b, {
        t0: 0.74,
        t1: 0.86,
        len: 0.09,
        angle0: 65,
        angle1: 30,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.1)),
        rays: 8,
        soft: 0.3,
        inset: 0.08,
        style: fin({ opacity: 0.3, pattern: 0, rayContrast: 0.5, flutter: 0.45, irid: 0.2 }),
      }),
      anal(b, {
        t0: 0.74,
        t1: 0.86,
        len: 0.085,
        angle0: 62,
        angle1: 30,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.1)),
        rays: 8,
        soft: 0.3,
        inset: 0.08,
        style: fin({ opacity: 0.3, pattern: 0, rayContrast: 0.5, flutter: 0.45, phase: 1.6, irid: 0.2 }),
      }),
      pectoral(b, {
        t: 0.3,
        yn0: 0.12,
        yn1: -0.22,
        len: 0.075,
        out: 40,
        a0: 30,
        a1: -30,
        profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * s),
        rays: 10,
        soft: 0.25,
        style: fin({ opacity: 0.26, pattern: 0, rayContrast: 0.45, flutter: 0.55, irid: 0.25 }),
      }),
    ],
    eye: eye({ t: 0.2, yn: 0.4, r: 0.054, protrude: 0.42, forward: 0.25, up: 0.3, pupil: 0.4, swivel: 1.3, iris: 'eye', ring: '#8fb04a', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 1.2,
      amp: 0.035,
      idleAmp: 0.022,
      envPow: 4.2,
      headSway: 0.0,
      bendK: 0.35,
      pectoralHz: 7.5,
      idleFlutter: 0.9,
      finSoft: 0.4,
      finRest: 0.95,
      sag: 0,
      idleHz: 0.7,
      finLag: 0.6,
      rigid: true,
      breathe: 0.9,
    }),
    look: look({
      dorsalDark: 0.25,
      bellyLine: -0.28,
      bellyAmount: 1,
      bellySoft: 0.18,
      scales: { cols: 60, strength: 0.08, kind: 'skin' },
      roughness: 0.4,
      gloss: 0.7,
      iridMode: 'back',
      iridHue: 0.35,
      sss: 0.6,
      lateralLine: 0,
      patternBellyFade: -0.22,
      marks,
      lipColor: 'belly',
      patA: [7, -0.12, 0.05, 0],
      // lane:w2-visual — wild pea puffers read golden-yellow with a green cast; the olive data colour vanished against
      // planted greens. Warm the body (and its shade) toward saturated gold per individual (the Golden variant stays
      // the brighter of the two); spots, belly and eyes are unchanged.
      slots: { body: mixHex(a.bodyColor, '#f2b21c', 0.36), body2: mixHex(a.bodyColor2, '#b8901e', 0.3) },
    }),
    pickRadius: 0.55,
  };
}
