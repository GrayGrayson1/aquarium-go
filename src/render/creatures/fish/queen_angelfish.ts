/**
 * Queen angelfish (Holacanthus ciliaris, chunk 17) — a deep, flat angelfish with a spine at the gill cover, long
 * dorsal and anal fins trailing in pointed tips, and an all-yellow tail. Blue-green with yellow scale centres, blue-edged
 * fins with orange tips, and the "crown": a dark blue spot ringed with bright blue on the forehead. Young (to about
 * 16 cm) are dark blue with curved bright blue bars, a yellow tail and pectoral area and a golden face.
 * OWNER: lane "fishart".
 */
import type { CreatureVisualParams } from '@/types';
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const fl = bucket(finScale(args, 1.15), 0.1);
  const recolor: Partial<CreatureVisualParams> | undefined = young
    ? { bodyColor: '#141c48', bodyColor2: '#1a2458', bellyColor: '#1e2a5e', finColor: '#1a2458', accentColor: '#4fb8ff', pattern: 'bars', patternContrast: 0.95, patternScale: 1.1 }
    : undefined;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.76,
    dorsal: curve([[0, 0.022], [0.06, 0.06], [0.16, 0.12], [0.3, 0.158], [0.46, 0.162], [0.62, 0.14], [0.78, 0.094], [0.9, 0.054], [1, 0.042]]),
    ventral: curve([[0, 0.022], [0.08, 0.064], [0.2, 0.12], [0.36, 0.152], [0.52, 0.15], [0.68, 0.124], [0.82, 0.08], [1, 0.04]]),
    width: curve([[0, 0.016], [0.1, 0.032], [0.3, 0.044], [0.55, 0.04], [0.8, 0.024], [1, 0.016]]),
    axis: curve([[0, -0.006], [0.2, 0], [1, 0.002]]),
    expTop: 1.95,
    expBottom: 1.95,
    noseRound: 0.04,
    tailRound: 0.025,
    mouth: { kind: 'terminal', yn: -0.1, t: 0.025, groove: 0.5 },
    operculum: { t: 0.24, strength: 0.75 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const marks: Mark[] = young
    ? [
        // the golden face and the yellow around the pectoral fins
        { t: 0.07, yn: 0, rt: 0.06, ryn: 1, color: '#e8b81e', strength: 0.85, soft: 0.4 },
        { t: 0.3, yn: -0.2, rt: 0.06, ryn: 0.3, color: '#ffd21a', strength: 0.7, soft: 0.4 },
      ]
    : [
        // the crown: a dark blue spot ringed with bright blue on the forehead
        { t: 0.16, yn: 0.82, rt: 0.035, ryn: 0.2, color: 'accent', strength: 0.95, soft: 0.2 },
        { t: 0.16, yn: 0.82, rt: 0.045, ryn: 0.26, color: '#5fd0ff', strength: 0.85, soft: 0.15, mode: 'ring' },
        // the blue gill-cover spine and edge
        { t: 0.24, yn: -0.1, rt: 0.02, ryn: 0.7, color: '#4fb8ff', strength: 0.6, soft: 0.3 },
      ];
  const sideFin = fin({ opacity: 0.94, color: 'fin', edge: '#ff9a2a', edgeStart: 0.85, edgeWidth: 0.12, edgeAmount: young ? 0.3 : 0.8, pattern: 0.5, rayContrast: 0.35, irid: 0.25 });
  return {
    key: `queen_angelfish|${young ? 'y' : 'a'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.16 * fl, spread: 32, rays: 16, soft: 0.3, rootH: 1.05, cup: 0.01, style: fin({ opacity: 0.95, color: 'fin2', pattern: 0, rayContrast: 0.3, irid: 0.05 }) }),
      // long dorsal and anal trailing in pointed tips well past the tail base
      dorsal(b, { t0: 0.24, t1: 0.92, len: 0.12 * fl, angle0: 64, angle1: 18, profile: (s) => (0.5 + 0.5 * smoothstep(0.2, 0.85, s)) * (1 + 0.6 * smoothstep(0.85, 1, s)), rays: 30, soft: 0.4, segS: 40, inset: 0.03, style: sideFin }),
      anal(b, { t0: 0.5, t1: 0.92, len: 0.12 * fl, angle0: 60, angle1: 18, profile: (s) => (0.5 + 0.5 * smoothstep(0.2, 0.85, s)) * (1 + 0.6 * smoothstep(0.85, 1, s)), rays: 24, soft: 0.4, inset: 0.03, style: sideFin }),
      pectoral(b, { t: 0.28, yn0: -0.05, yn1: -0.35, len: 0.09, out: 30, a0: 22, a1: -26, rays: 14, soft: 0.3, style: fin({ opacity: 0.75, color: 'fin2', pattern: 0, rayContrast: 0.3, flutter: 0.55, irid: 0.05 }) }),
      pelvic(b, { t: 0.32, yn0: -0.86, yn1: -0.92, tLen: 0.02, len: 0.08, out: 16, a0: -26, a1: -52, rays: 6, soft: 0.3, style: sideFin }),
    ],
    eye: eye({ t: 0.13, yn: 0.4, r: 0.026, protrude: 0.3, forward: 0.2, up: 0.12, pupil: 0.5, iris: 'eye', ring: '#3a6ad8', ringWidth: 0.2, socket: 'body', swivel: 0.35 }),
    motion: motion({ wavelength: 1.05, amp: 0.05, idleAmp: 0.012, envPow: 2.6, headSway: 0.04, bendK: 0.9, pectoralHz: 3.8, idleFlutter: 0.55, finSoft: 0.45, finRest: 0.85, sag: 0.03, idleHz: 0.8, finLag: 0.9, breathe: 0.5 }),
    look: look({ dorsalDark: 0.12, bellyLine: -0.55, bellyAmount: 0.5, bellySoft: 0.4, scales: { cols: 40, strength: 0.35, kind: 'ctenoid' }, roughness: 0.3, gloss: 0.7, iridMode: 'scales', iridHue: 0.55, sss: 0.45, lateralLine: 0.05, ...(young ? {} : { patA: [14, -0.02, 0, 0] as [number, number, number, number] }), marks }),
    pickRadius: 0.55,
    ...(recolor ? { recolor } : {}),
  };
};
