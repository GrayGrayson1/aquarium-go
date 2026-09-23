/**
 * Otocinclus (Otocinclus vittatus) — tiny armoured sucker-mouth catfish: slender body with a flat belly and a broad,
 * slightly flattened head, ventral sucker mouth, bony plates, a dark stripe from snout to tail base (pale band above
 * it), finely speckled tan back, dark caudal-base spot and clear little fins. OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const pc = a.patternContrast ?? 0.8;
  const body: FishPlan['body'] = {
    noseX: 0.41,
    length: 0.8,
    dorsal: curve([[0, 0.022], [0.08, 0.042], [0.2, 0.062], [0.36, 0.074], [0.5, 0.07], [0.68, 0.052], [0.86, 0.036], [1, 0.03]]),
    ventral: curve([[0, 0.02], [0.08, 0.032], [0.25, 0.044], [0.45, 0.048], [0.65, 0.038], [0.85, 0.029], [1, 0.026]]),
    width: curve([[0, 0.034], [0.08, 0.054], [0.22, 0.06], [0.42, 0.054], [0.62, 0.04], [0.82, 0.026], [1, 0.019]]),
    axis: curve([[0, -0.012], [0.2, -0.003], [1, 0.002]]),
    expTop: 2.0,
    expBottom: 3.4,
    noseRound: 0.14,
    tailRound: 0.03,
    mouth: { kind: 'sucker', yn: -0.75, t: 0.06, groove: 0.4 },
    operculum: { t: 0.22, strength: 0.6 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const soft = Math.max(0.12, 0.34 - (pc - 0.8) * 1.2);
  const marks: Mark[] = [
    // dark lateral stripe, snout → caudal base (straight box stripe)
    { t: 0.5, yn: 0.02, rt: 0.52, ryn: 0.17, color: 'accent', strength: 0.95 * pc + 0.05, soft, mode: 'stripe', onFins: 0.6 },
    // pale band just above the stripe
    { t: 0.52, yn: 0.34, rt: 0.42, ryn: 0.1, color: 'belly', strength: 0.4, soft: 0.6, mode: 'stripe' },
    // dark spot / W mark at the tail base
    { t: 1.0, yn: 0.0, rt: 0.045, ryn: 0.38, color: 'accent', strength: 0.85 * pc, soft: 0.4, onFins: 0.9 },
    // darker snout top
    { t: 0.06, yn: 0.45, rt: 0.07, ryn: 0.5, color: 'body2', strength: 0.5, soft: 0.8 },
  ];
  const clear = fin({ opacity: 0.32, color: 'fin', rayContrast: 0.8, pattern: 0.2, irid: 0.1 });
  return {
    key: 'otocinclus',
    body,
    fins: [
      caudal(b, { kind: 'emarginate', len: 0.2, spread: 30, fork: 0.5, rays: 14, soft: 0.35, rootH: 0.95, style: fin({ ...clear, opacity: 0.38, rootBlend: 0.06 }) }),
      dorsal(b, {
        t0: 0.34,
        t1: 0.47,
        len: 0.12,
        angle0: 70,
        angle1: 40,
        profile: (s) => 1 - 0.5 * s,
        rays: 7,
        soft: 0.3,
        style: fin({ ...clear, opacity: 0.35 }),
      }),
      anal(b, { t0: 0.68, t1: 0.77, len: 0.065, angle0: 55, angle1: 30, rays: 5, soft: 0.3, style: clear }),
      pectoral(b, {
        t: 0.2,
        yn0: -0.72,
        yn1: -0.92,
        len: 0.11,
        out: 64,
        a0: 10,
        a1: -30,
        profile: (s) => 1 - 0.35 * s,
        rays: 7,
        soft: 0.25,
        style: fin({ ...clear, flutter: 0.15 }),
      }),
      pelvic(b, { t: 0.46, yn0: -0.95, yn1: -0.98, tLen: 0.05, len: 0.08, out: 50, a0: -10, a1: -35, rays: 6, soft: 0.25, style: clear }),
    ],
    eye: eye({ t: 0.14, yn: 0.5, r: 0.03, protrude: 0.4, forward: 0.12, up: 0.35, pupil: 0.5, iris: '#2e2a1e', ring: '#b39a5a', ringWidth: 0.12, socket: 'body2', swivel: 0.5 }),
    motion: motion({
      wavelength: 0.95,
      amp: 0.06,
      idleAmp: 0.01,
      envPow: 2.2,
      headSway: 0.04,
      bendK: 0.8,
      pectoralHz: 3,
      idleFlutter: 0.25,
      finSoft: 0.45,
      finRest: 0.85,
      sag: 0.03,
      idleHz: 0.7,
      finLag: 0.8,
      breathe: 0.45,
    }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.4,
      bellyAmount: 0.95,
      bellySoft: 0.22,
      scales: { cols: 22, strength: 0.35, kind: 'plates' },
      roughness: 0.46,
      gloss: 0.4,
      iridMode: 'body',
      sss: 0.5,
      lateralLine: 0,
      patternMap: { lateral_stripe: 'speckled' },
      patternBellyFade: -0.1,
      marks,
      lipColor: 'belly',
    }),
    pickRadius: 0.55,
  };
};
