/**
 * Clown triggerfish (Balistoides conspicillum, chunk 17) — a deep, stiff, diamond-ish body with a long snout, eyes set
 * high and far back, a stout first dorsal spine folded in a groove, tall soft dorsal and anal fins set far back that
 * do the swimming (balistiform: the body stays rigid), and a rounded tail. Black, with big white spots on the lower
 * half, a yellow net on the back round the dorsal fin, a yellow band across the snout and orange lips. Young have
 * bigger white spots all over and a yellow snout.
 * OWNER: lane "fishart".
 */
import type { CreatureVisualParams } from '@/types';
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, spinyDorsal, anal, pectoral } from '../core/fins';
import { motion, look, eye, fin, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const recolor: Partial<CreatureVisualParams> | undefined = young ? { patternScale: 1.15, patternContrast: 1 } : undefined;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.76,
    // a long snout rising to a deep body, tapering to a narrow tail base
    dorsal: curve([[0, 0.02], [0.08, 0.05], [0.2, 0.1], [0.36, 0.142], [0.52, 0.14], [0.68, 0.11], [0.84, 0.062], [1, 0.04]]),
    ventral: curve([[0, 0.022], [0.1, 0.05], [0.24, 0.1], [0.4, 0.132], [0.56, 0.126], [0.72, 0.092], [0.86, 0.054], [1, 0.038]]),
    width: curve([[0, 0.016], [0.12, 0.034], [0.32, 0.05], [0.55, 0.046], [0.8, 0.026], [1, 0.016]]),
    axis: curve([[0, -0.01], [0.2, 0], [1, 0.002]]),
    expTop: 2.1,
    expBottom: 2.1,
    noseRound: 0.035,
    tailRound: 0.025,
    mouth: { kind: 'terminal', yn: 0.0, t: 0.02, groove: 0.6 },
    operculum: { t: 0.26, strength: 0.3 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const marks: Mark[] = [
    // the yellow band across the snout in front of the eyes, the orange lips, and the yellow net on the back
    { t: 0.12, yn: 0.2, rt: 0.025, ryn: 1.1, color: '#f2d84a', strength: 0.9, soft: 0.3, mode: 'band_t' },
    { t: 0.012, yn: 0, rt: 0.018, ryn: 0.5, color: '#ff9a2a', strength: 0.95, soft: 0.25 },
    { t: 0.48, yn: 0.72, rt: 0.2, ryn: 0.25, color: 'body2', strength: young ? 0.6 : 0.9, soft: 0.35 },
  ];
  if (young) marks.push({ t: 0.06, yn: 0, rt: 0.06, ryn: 1, color: '#f2d84a', strength: 0.8, soft: 0.4 });
  const blackFin = fin({ opacity: 0.95, color: 'fin', edge: '#e8d060', edgeStart: 0.8, edgeWidth: 0.16, edgeAmount: 0.9, pattern: 0.1, rayContrast: 0.3, irid: 0.05 });
  return {
    key: `clown_triggerfish|${young ? 'y' : 'a'}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.15, spread: 32, rays: 14, soft: 0.3, rootH: 1.05, cup: 0.01, style: fin({ opacity: 0.95, color: 'fin', edge: 'fin2', edgeStart: 0.35, edgeWidth: 0.35, edgeAmount: 0.85, pattern: 0, rayContrast: 0.3, irid: 0.05 }) }),
      // the trigger: a stout spine folded into its groove
      spinyDorsal(b, { t0: 0.3, t1: 0.4, len: 0.06, angle0: 40, angle1: 30, profile: (s) => 1 - 0.5 * s, rays: 3, soft: 0.1, style: blackFin }),
      // the tall soft dorsal and anal that scull it along
      dorsal(b, { t0: 0.62, t1: 0.86, len: 0.13, angle0: 62, angle1: 28, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.9)), rays: 18, soft: 0.5, inset: 0.02, style: { ...blackFin, flutter: 1 } }),
      anal(b, { t0: 0.62, t1: 0.86, len: 0.12, angle0: 60, angle1: 28, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.9)), rays: 16, soft: 0.5, inset: 0.02, style: { ...blackFin, flutter: 1, phase: 1.6 } }),
      pectoral(b, { t: 0.3, yn0: -0.05, yn1: -0.3, len: 0.07, out: 34, a0: 20, a1: -26, rays: 12, soft: 0.3, style: fin({ opacity: 0.45, color: 'clear', pattern: 0, rayContrast: 0.3, flutter: 0.6, irid: 0.05 }) }),
    ],
    // eyes high and far back from the long snout
    eye: eye({ t: 0.22, yn: 0.55, r: 0.026, protrude: 0.35, forward: 0.15, up: 0.2, pupil: 0.5, iris: 'eye', socket: 'body', swivel: 0.9 }),
    motion: motion({ wavelength: 1.2, amp: 0.02, idleAmp: 0.006, envPow: 3.2, headSway: 0.02, bendK: 0.6, pectoralHz: 4, idleFlutter: 0.7, finSoft: 0.6, finRest: 0.85, sag: 0.02, idleHz: 1.2, finLag: 1.2, breathe: 0.5, rigid: true }),
    look: look({ dorsalDark: 0.05, bellyLine: -0.9, bellyAmount: 0, bellySoft: 0.3, scales: { cols: 36, strength: 0.25, kind: 'plates' }, roughness: 0.4, gloss: 0.55, iridMode: 'body', iridHue: 0.1, sss: 0.3, lateralLine: 0, patternBellyFade: young ? -2 : 0.35, marks }),
    pickRadius: 0.55,
    ...(recolor ? { recolor } : {}),
  };
};
