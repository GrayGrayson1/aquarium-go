/**
 * Shared helpers for fish body plans. OWNER: lane "fishart".
 */
import type { CreatureFactoryArgs, CreatureFactory } from '../types';
import type { FishPlan, MotionSpec, LookSpec, FinStyle, EyeSpec } from '../core/plan';
import { buildFish } from '../core/fishObject';
import { BodySampler } from '../core/body';

export type PlanFn = (args: CreatureFactoryArgs) => FishPlan;

/** Wrap a plan function as a CreatureFactory (never throws: falls back to a safe default plan on error). */
export function fishFactory(plan: PlanFn, fallback?: PlanFn): CreatureFactory {
  return (args) => {
    let p: FishPlan;
    try {
      p = plan(args);
    } catch (e) {
      if (!fallback) throw e;
      console.warn('[fishart] body plan failed, using fallback', args.species.id, e);
      p = fallback(args);
    }
    if (isJuvenile(args)) p = juvenile(p);
    return buildFish(p, args);
  };
}

/** Juvenile proportions: relatively larger eyes, shorter fins, rounder head. */
export function juvenile(p: FishPlan): FishPlan {
  const k = 0.78;
  return {
    ...p,
    key: `${p.key}|juv`,
    eye: { ...p.eye, r: p.eye.r * 1.22 },
    fins: p.fins.map((f) => ({ ...f, ray: (s: number) => { const r = f.ray(s); return { dir: r.dir, len: r.len * k }; }, fold: (s: number) => { const r = f.fold(s); return { dir: r.dir, len: r.len * k }; } })),
    body: { ...p.body, noseRound: (p.body.noseRound ?? 0.06) * 1.2 },
  };
}

export const DEFAULT_MOTION: MotionSpec = {
  wavelength: 1.0,
  amp: 0.07,
  idleAmp: 0.018,
  envPow: 2.2,
  headSway: 0.08,
  bendK: 0.9,
  pectoralHz: 3,
  pectoralAmp: 0.4,
  idleFlutter: 0.35,
  finSoft: 0.6,
  finRest: 0.82,
  sag: 0.2,
  idleHz: 0.9,
  finLag: 0.9,
  breathe: 0.6,
};

export const motion = (o: Partial<MotionSpec> = {}): MotionSpec => ({ ...DEFAULT_MOTION, ...o });

export const look = (o: Partial<LookSpec> = {}): LookSpec => ({
  dorsalDark: 0.35,
  bellyLine: -0.35,
  bellyAmount: 0.8,
  bellySoft: 0.35,
  scales: { cols: 34, strength: 0.5, kind: 'cycloid' },
  roughness: 0.38,
  gloss: 0.5,
  lateralLine: 0.3,
  sss: 0.5,
  ...o,
});

export const eye = (o: Partial<EyeSpec> = {}): EyeSpec => ({
  t: 0.13,
  yn: 0.3,
  r: 0.04,
  protrude: 0.35,
  forward: 0.2,
  up: 0.08,
  pupil: 0.46,
  swivel: 0.4,
  ...o,
});

export const fin = (o: Partial<FinStyle> & { opacity: number }): FinStyle => ({ rayContrast: 0.6, pattern: 0.5, irid: 0.4, ...o });

/** Fin-length multiplier relative to the phenotype's typical finLength for that form. */
export function finScale(args: CreatureFactoryArgs, typical = 1): number {
  const fl = args.appearance.finLength ?? typical;
  return Math.max(0.5, Math.min(1.8, fl / Math.max(0.3, typical)));
}

export const isFemale = (args: CreatureFactoryArgs) => args.creature?.sex === 'female' || args.creature?.reproRole === 'female';
export const isJuvenile = (args: CreatureFactoryArgs) => {
  const s = args.creature?.lifeStage;
  return s === 'juvenile' || s === 'fry' || s === 'larva';
};

/** Bucket a continuous value so geometry caches stay effective. */
export const bucket = (v: number, step = 0.05) => Math.round(v / step) * step;

export function sampler(plan: Pick<FishPlan, 'body'>): BodySampler {
  return new BodySampler(plan.body);
}
