/**
 * Reticulated hillstream loach (Sewellia lineolata) — a flat, stingray-like clinging loach: low domed back, flat
 * belly, round snout, eyes on top of the head, and huge horizontal pectoral + pelvic fins that together form a
 * suction disc. Golden-ochre body netted with dark lines; the fanned paired fins carry dark concentric bands.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const pc = a.patternContrast ?? 0.85;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.8,
    dorsal: curve([[0, 0.018], [0.08, 0.034], [0.22, 0.05], [0.4, 0.054], [0.6, 0.044], [0.8, 0.031], [1, 0.025]]),
    ventral: curve([[0, 0.012], [0.1, 0.016], [0.3, 0.018], [0.5, 0.018], [0.7, 0.017], [0.9, 0.015], [1, 0.015]]),
    width: curve([[0, 0.05], [0.08, 0.082], [0.2, 0.1], [0.34, 0.1], [0.52, 0.078], [0.72, 0.046], [0.92, 0.024], [1, 0.02]]),
    axis: curve([[0, 0.0], [1, 0.004]]),
    expTop: 1.7,
    expBottom: 5,
    noseRound: 0.13,
    tailRound: 0.03,
    mouth: { kind: 'sucker', yn: -0.9, t: 0.07, groove: 0.2 },
    operculum: { t: 0.2, strength: 0.25 },
  };
  const b = new BodySampler(body);
  const disc = (color: 'fin' | 'body') =>
    fin({ opacity: 0.8, color, edge: 'fin2', edgeStart: 0.58, edgeWidth: 0.14, edgeAmount: 0.75 * pc + 0.1, rayContrast: 0.7, pattern: 0.65, irid: 0.1, rootBlend: 0.06, flutter: 0.12 });
  const marks: Mark[] = [
    // darker crown and snout
    { t: 0.1, yn: 0.7, rt: 0.1, ryn: 0.4, color: 'accent', strength: 0.35 * pc, soft: 0.7 },
    // dark bar at the tail base
    { t: 0.98, yn: 0.1, rt: 0.03, ryn: 1.3, color: 'accent', strength: 0.7 * pc, soft: 0.4, onFins: 0.5 },
  ];
  return {
    key: 'hillstream',
    body,
    fins: [
      caudal(b, {
        kind: 'emarginate',
        len: 0.2,
        spread: 30,
        fork: 0.5,
        rays: 14,
        soft: 0.4,
        rootH: 1.0,
        style: fin({ opacity: 0.7, color: 'fin', edge: 'fin2', edgeStart: 0.45, edgeWidth: 0.15, edgeAmount: 0.7 * pc, rayContrast: 0.7, pattern: 0.5, irid: 0.1 }),
      }),
      dorsal(b, { t0: 0.4, t1: 0.56, len: 0.075, angle0: 58, angle1: 28, rays: 9, soft: 0.3, style: disc('fin') }),
      anal(b, { t0: 0.74, t1: 0.82, len: 0.045, angle0: 45, angle1: 25, rays: 6, soft: 0.3, style: disc('fin') }),
      // pectorals: a big horizontal fan, front rays reaching forward beside the head
      pectoral(b, {
        t: 0.07,
        yn0: -0.2,
        yn1: -0.28,
        tLen: 0.2,
        len: 0.2,
        out: 86,
        a0: 62,
        a1: -78,
        profile: (s) => 0.14 + 0.86 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.03 + s * 0.97)), 0.5),
        rays: 18,
        soft: 0.3,
        cup: 0.006,
        segS: 22,
        segR: 10,
        style: disc('fin'),
      }),
      // pelvics: a second, slightly lower fan behind them, completing the suction disc
      pelvic(b, {
        t: 0.34,
        yn0: -0.75,
        yn1: -0.8,
        tLen: 0.18,
        len: 0.165,
        out: 86,
        a0: 72,
        a1: -70,
        profile: (s) => 0.14 + 0.86 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.03 + s * 0.97)), 0.5),
        rays: 14,
        soft: 0.3,
        cup: -0.004,
        segS: 18,
        segR: 9,
        style: disc('fin'),
      }),
    ],
    eye: eye({ t: 0.16, yn: 0.72, r: 0.021, protrude: 0.45, forward: 0.1, up: 0.85, pupil: 0.5, iris: '#2a2418', ring: '#b8923a', ringWidth: 0.12, socket: 'body2', swivel: 0.5 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.05,
      idleAmp: 0.008,
      envPow: 2.4,
      headSway: 0.03,
      bendK: 0.7,
      pectoralHz: 2.2,
      idleFlutter: 0.18,
      finSoft: 0.35,
      finRest: 0.95,
      sag: 0,
      idleHz: 0.5,
      finLag: 0.8,
      breathe: 0.35,
    }),
    look: look({
      dorsalDark: 0.15,
      bellyLine: -0.55,
      bellyAmount: 0.8,
      bellySoft: 0.25,
      scales: { cols: 60, strength: 0, kind: 'skin' },
      roughness: 0.44,
      gloss: 0.5,
      iridMode: 'body',
      sss: 0.55,
      lateralLine: 0,
      patA: [9, -0.025, 0, 0],
      patternBellyFade: -0.45,
      marks,
      lipColor: 'belly',
    }),
    pickRadius: 0.6,
  };
};
