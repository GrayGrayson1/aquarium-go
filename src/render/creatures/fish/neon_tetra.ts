/**
 * Neon tetra (Paracheirodon innesi) — and the shared tetra plan also used by the cardinal tetra.
 * OWNER: lane "fishart".
 *
 * Slim, laterally compressed characin with a big eye, pointed dorsal, adipose fin, long-based anal fin and a clear
 * forked tail. Signature: the electric-blue iridescent lateral stripe (lateral_stripe pattern + LookSpec.stripe)
 * from the eye to the adipose, over an olive back; red on the rear half of the lower body (neon) or the whole lower
 * body (cardinal); silvery-white belly on the neon. Long-fin forms grow flowing, filamentous fins.
 */
import type { CreatureFactoryArgs } from '../types';
import type { FishPlan } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, adipose, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export type TetraKind = 'neon' | 'cardinal';

export function tetraPlan(args: CreatureFactoryArgs, kind: TetraKind): FishPlan {
  const a = args.appearance;
  const longFin = a.finType === 'tetra_longfin';
  const fl = bucket(finScale(args, 1), 0.05);
  const card = kind === 'cardinal';
  const deep = card ? 1.04 : 1;
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.77,
    dorsal: curve([[0, 0.03], [0.1, 0.056], [0.28, 0.08 * deep], [0.44, 0.085 * deep], [0.62, 0.07], [0.8, 0.046], [0.92, 0.035], [1, 0.032]]),
    ventral: curve([[0, 0.028], [0.12, 0.056], [0.32, 0.08 * deep], [0.48, 0.082 * deep], [0.66, 0.06], [0.82, 0.04], [0.94, 0.033], [1, 0.031]]),
    width: curve([[0, 0.02], [0.12, 0.034], [0.32, 0.039], [0.55, 0.031], [0.8, 0.018], [1, 0.012]]),
    axis: curve([[0, -0.004], [0.3, 0], [1, 0.003]]),
    expTop: 2.0,
    expBottom: 2.15,
    noseRound: 0.085,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: 0.05, t: 0.045, groove: 0.6 },
    operculum: { t: 0.22, strength: 0.8 },
    cheek: 0.3,
    keel: 0.25,
  };
  const b = new BodySampler(body);
  const soft = longFin ? 1.05 : 0.45;
  const clear = { color: 'clear' as const, pattern: 0, irid: 0.15 };
  const fins = [
    caudal(b, {
      kind: longFin ? 'lyre' : 'forked',
      len: (longFin ? 0.25 : 0.22) * fl,
      spread: longFin ? 26 : 30,
      fork: 0.55,
      rays: 18,
      soft,
      rootH: 0.95,
      cup: 0.01,
      segS: longFin ? 36 : 28,
      segR: longFin ? 16 : 12,
      // cardinals/neons carry a faint red flush at the tail base
      style: fin({ opacity: 0.2, ...clear, edge: 'white', edgeStart: 0.8, edgeWidth: 0.2, edgeAmount: 0.35, rayContrast: 0.75, rootBlend: 0.18 }),
    }),
    dorsal(b, {
      t0: 0.43,
      t1: 0.54,
      len: (longFin ? 0.16 : 0.11) * fl,
      angle0: 72,
      angle1: 38,
      profile: (s) => 1 - 0.55 * s,
      rays: 9,
      soft,
      style: fin({ opacity: 0.24, ...clear, edge: 'white', edgeStart: 0.72, edgeWidth: 0.25, edgeAmount: 0.6, rayContrast: 0.7 }),
    }),
    adipose(b, { t0: 0.79, t1: 0.85, len: 0.032, soft: 0.2, style: fin({ opacity: 0.32, ...clear, rayContrast: 0 }) }),
    anal(b, {
      t0: 0.56,
      t1: 0.82,
      len: (longFin ? 0.12 : 0.085) * fl,
      angle0: 62,
      angle1: 28,
      profile: (s) => 1 - 0.55 * s,
      rays: 14,
      soft,
      style: fin({ opacity: 0.2, ...clear, edge: 'white', edgeStart: 0.75, edgeWidth: 0.25, edgeAmount: 0.4, rayContrast: 0.65 }),
    }),
    pectoral(b, {
      t: 0.25,
      yn0: -0.3,
      yn1: -0.6,
      len: 0.07,
      out: 30,
      a0: 12,
      a1: -30,
      rays: 9,
      soft: 0.3,
      style: fin({ opacity: 0.12, ...clear, rayContrast: 0.35, flutter: 0.25 }),
    }),
    pelvic(b, {
      t: 0.42,
      yn0: -0.86,
      yn1: -0.93,
      tLen: 0.02,
      len: 0.06 * Math.min(1.3, fl),
      out: 16,
      a0: -26,
      a1: -52,
      rays: 5,
      soft: 0.35,
      style: fin({ opacity: 0.22, ...clear, edge: 'white', edgeStart: 0.4, edgeAmount: 0.5, rayContrast: 0.4 }),
    }),
  ];
  return {
    key: `tetra|${kind}|${longFin ? 'L' : 's'}|${fl}`,
    body,
    fins,
    eye: eye({ t: 0.12, yn: 0.14, r: 0.036, protrude: 0.36, forward: 0.2, up: 0.06, pupil: 0.5, iris: '#1a1e22', ring: '#c3d5de', ringWidth: 0.1 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.075,
      idleAmp: 0.018,
      envPow: 2.3,
      headSway: 0.06,
      pectoralHz: 6,
      idleFlutter: 0.4,
      finSoft: longFin ? 1.0 : 0.5,
      finRest: 0.88,
      sag: longFin ? 0.3 : 0.05,
      idleHz: 1.3,
      finLag: longFin ? 1.3 : 0.8,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: card ? -0.8 : -0.62,
      bellyAmount: card ? 0.5 : 0.95,
      bellySoft: 0.22,
      scales: { cols: 34, strength: 0.32, kind: 'cycloid' },
      roughness: 0.3,
      gloss: 0.6,
      iridMode: 'stripe',
      iridHue: card ? 0.52 : 0.5,
      sss: 0.65,
      lateralLine: 0.1,
      pattern: 'lateral_stripe',
      stripe: card
        ? { yn0: 0.3, yn1: 0.1, w: 0.25, t0: 0.03, t1: 0.975, redT0: 0.05 }
        : { yn0: 0.32, yn1: 0.16, w: 0.2, t0: 0.08, t1: 0.86, redT0: 0.46 },
      patternBellyFade: -2,
      marks: [
        // silvery gill cover
        { t: 0.15, yn: -0.2, rt: 0.08, ryn: 0.45, color: 'belly', strength: card ? 0.2 : 0.4, soft: 0.7 },
      ],
    }),
    pickRadius: 0.55,
  };
}

export const plan: PlanFn = (args) => tetraPlan(args, 'neon');
