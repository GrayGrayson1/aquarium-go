/**
 * Miniatus grouper / coral hind (Cephalopholis miniata) — robust, elongate predator: big head with a large, slightly
 * upturned mouth and jutting lower jaw, straight sloping forehead, stout body; continuous dorsal (short incised spines
 * then a rounded soft lobe), rounded anal, big rounded pectorals, rounded tail; vivid red-orange peppered with many
 * small, dark-rimmed electric-blue spots that continue over head and fins; blue fin margins.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.78,
    // straight sloping forehead to a big mouth; deep through the shoulders, thick peduncle
    dorsal: curve([[0, 0.022], [0.06, 0.05], [0.14, 0.085], [0.26, 0.112], [0.4, 0.118], [0.56, 0.106], [0.72, 0.08], [0.86, 0.058], [0.95, 0.05], [1, 0.049]]),
    ventral: curve([[0, 0.032], [0.06, 0.055], [0.14, 0.078], [0.28, 0.1], [0.42, 0.104], [0.58, 0.09], [0.74, 0.068], [0.88, 0.052], [1, 0.048]]),
    width: curve([[0, 0.03], [0.1, 0.05], [0.24, 0.064], [0.42, 0.062], [0.62, 0.048], [0.82, 0.032], [1, 0.024]]),
    axis: curve([[0, -0.012], [0.16, -0.004], [0.3, 0], [1, 0.003]]),
    expTop: 2.05,
    expBottom: 2.1,
    noseRound: 0.07,
    tailRound: 0.03,
    // large gape running well back, lower jaw jutting (upturned mouth line)
    mouth: { kind: 'upturned', yn: -0.02, t: 0.1, groove: 1 },
    operculum: { t: 0.3, strength: 0.9 },
    cheek: 0.5,
  };
  const b = new BodySampler(body);
  const redFin = fin({ opacity: 0.94, edge: 'fin2', edgeStart: 0.84, edgeWidth: 0.1, edgeAmount: 1, pattern: 1, rayContrast: 0.35, irid: 0.1, rootBlend: 0.15 });
  return {
    key: `miniatus|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 32, rays: 16, soft: 0.3, rootH: 1.05, cup: 0.01, style: { ...redFin, edgeStart: 0.82 } }),
      // continuous dorsal: short incised spines grading into a rounded soft lobe
      dorsal(b, {
        t0: 0.28,
        t1: 0.9,
        len: 0.105 * fl,
        angle0: 64,
        angle1: 30,
        profile: (s) => (0.5 + 0.2 * smoothstep(0, 0.2, s) + 0.3 * smoothstep(0.45, 0.8, s)) * (1 - 0.3 * smoothstep(0.88, 1, s)),
        rays: 20,
        web: 0.14,
        soft: 0.3,
        cup: 0.006,
        segS: 36,
        segR: 12,
        inset: 0.03,
        style: redFin,
      }),
      anal(b, {
        t0: 0.62,
        t1: 0.88,
        len: 0.1 * fl,
        angle0: 58,
        angle1: 26,
        profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.95)),
        rays: 11,
        soft: 0.3,
        inset: 0.03,
        style: redFin,
      }),
      pectoral(b, {
        t: 0.33,
        yn0: 0.02,
        yn1: -0.45,
        len: 0.14,
        out: 28,
        a0: 24,
        a1: -28,
        profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s),
        rays: 16,
        soft: 0.3,
        style: fin({ opacity: 0.8, color: 'fin', edge: 'fin', edgeStart: 0.9, edgeAmount: 0.3, pattern: 0.6, rayContrast: 0.4, flutter: 0.35, irid: 0.05 }),
      }),
      pelvic(b, { t: 0.36, yn0: -0.84, yn1: -0.92, tLen: 0.025, len: 0.1, out: 18, a0: -28, a1: -55, rays: 6, soft: 0.3, style: { ...redFin, pattern: 0.6 } }),
    ],
    // normal-sized eye set flush in the head (not a bulging telescope ball): dark pupil in a red-orange iris with a
    // darker rim, so it reads as an eye rather than a glossy black sphere
    eye: eye({ t: 0.15, yn: 0.42, r: 0.027, protrude: 0.27, forward: 0.2, up: 0.1, pupil: 0.36, iris: '#c4522a', ring: '#4a1510', ringWidth: 0.2, socket: 'body', swivel: 0.35 }),
    motion: motion({
      wavelength: 1.05,
      amp: 0.06,
      idleAmp: 0.012,
      envPow: 2.4,
      headSway: 0.05,
      bendK: 0.9,
      pectoralHz: 2.2,
      idleFlutter: 0.45,
      finSoft: 0.35,
      finRest: 0.8,
      sag: 0.04,
      idleHz: 0.5,
      finLag: 0.7,
      breathe: 0.8,
    }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.65,
      bellyAmount: 0.35,
      bellySoft: 0.4,
      scales: { cols: 56, strength: 0.28, kind: 'ctenoid' },
      roughness: 0.42,
      gloss: 0.5,
      iridMode: 'body',
      iridHue: 0.05,
      sss: 0.5,
      lateralLine: 0.15,
      // many small electric-blue spots with dark rims, over body, head and fins
      patternMap: { solid: 'spots' },
      patA: [26, -0.32, -0.02, 0],
      patB: [1, 0, 0, 0],
      patternEdge: '#4a1210',
      patternBellyFade: -2,
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
};
