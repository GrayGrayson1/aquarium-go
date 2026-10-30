/**
 * Panther grouper (Chromileptes altivelis, chunk 17) — a tall, narrow grouper with a small head and a deeply hollow
 * "humpback" profile above the eyes, a tall rounded soft dorsal, big rounded paddle fins and a broad rounded tail.
 * Pale greenish brown with dusky blotches and round black spots smaller than the eye, over body and fins; the fins with
 * a bluish cast. Young are white with fewer, bigger spots, the size of the eye.
 * OWNER: lane "fishart".
 */
import type { CreatureVisualParams } from '@/types';
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const fl = bucket(finScale(args, 1.15), 0.1);
  const recolor: Partial<CreatureVisualParams> | undefined = young ? { bodyColor: '#f2f1ea', bodyColor2: '#e6e4da', bellyColor: '#f8f7f2', finColor: '#ecebe2', patternScale: 0.55, patternContrast: 1 } : undefined;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.78,
    // a small pointed head with a deeply hollow nape, then a tall hump of a back
    dorsal: curve([[0, 0.018], [0.06, 0.03], [0.12, 0.042], [0.2, 0.09], [0.3, 0.138], [0.46, 0.15], [0.62, 0.132], [0.78, 0.09], [0.9, 0.06], [1, 0.05]]),
    ventral: curve([[0, 0.02], [0.08, 0.05], [0.2, 0.09], [0.36, 0.11], [0.52, 0.108], [0.7, 0.084], [0.86, 0.058], [1, 0.048]]),
    width: curve([[0, 0.016], [0.1, 0.032], [0.3, 0.05], [0.55, 0.046], [0.8, 0.03], [1, 0.022]]),
    axis: curve([[0, -0.012], [0.2, -0.004], [0.4, 0], [1, 0.003]]),
    expTop: 2.0,
    expBottom: 2.1,
    noseRound: 0.04,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.05, t: 0.04, groove: 0.8 },
    operculum: { t: 0.26, strength: 0.7 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  const spottedFin = fin({ opacity: 0.93, color: 'fin', edge: 'fin2', edgeStart: 0.6, edgeWidth: 0.4, edgeAmount: 0.4, pattern: 1, rayContrast: 0.3, irid: 0.05, rootBlend: 0.2 });
  return {
    key: `panther_grouper|${young ? 'y' : 'a'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 34, rays: 16, soft: 0.35, rootH: 1.05, cup: 0.01, style: spottedFin }),
      // a low spiny front then a tall, rounded soft dorsal
      dorsal(b, { t0: 0.3, t1: 0.9, len: 0.14 * fl, angle0: 70, angle1: 34, profile: (s) => (0.35 + 0.65 * smoothstep(0.3, 0.6, s)) * (1 - 0.3 * smoothstep(0.85, 1, s)), rays: 24, web: 0.08, soft: 0.35, segS: 36, inset: 0.03, style: spottedFin }),
      anal(b, { t0: 0.62, t1: 0.88, len: 0.14 * fl, angle0: 62, angle1: 30, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.9)), rays: 12, soft: 0.35, inset: 0.03, style: spottedFin }),
      pectoral(b, { t: 0.3, yn0: -0.05, yn1: -0.45, len: 0.13, out: 28, a0: 22, a1: -28, profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s), rays: 16, soft: 0.3, style: { ...spottedFin, flutter: 0.4 } }),
      pelvic(b, { t: 0.34, yn0: -0.86, yn1: -0.94, tLen: 0.025, len: 0.11, out: 18, a0: -26, a1: -55, rays: 6, soft: 0.3, style: spottedFin }),
    ],
    eye: eye({ t: 0.11, yn: 0.35, r: 0.026, protrude: 0.3, forward: 0.2, up: 0.15, pupil: 0.45, iris: 'eye', socket: 'body', swivel: 0.4 }),
    motion: motion({ wavelength: 1.05, amp: 0.05, idleAmp: 0.012, envPow: 2.4, headSway: 0.05, bendK: 0.9, pectoralHz: 2.2, idleFlutter: 0.5, finSoft: 0.4, finRest: 0.82, sag: 0.04, idleHz: 0.5, finLag: 0.8, breathe: 0.7 }),
    // round black spots over body, head and fins: many small ones on an adult, fewer and bigger on the young
    look: look({ dorsalDark: 0.15, bellyLine: -0.6, bellyAmount: 0.3, bellySoft: 0.45, scales: { cols: 56, strength: 0.15, kind: 'ctenoid' }, roughness: 0.42, gloss: 0.5, iridMode: 'body', iridHue: 0.05, sss: 0.45, lateralLine: 0.1, patternBellyFade: -2, patternMap: { dalmatian: 'spots' }, patA: young ? [4, 0.15, -0.05, 0] : [20, -0.2, -0.02, 0], patB: [0, 0, 0, 0] }),
    pickRadius: 0.55,
    ...(recolor ? { recolor } : {}),
  };
};
