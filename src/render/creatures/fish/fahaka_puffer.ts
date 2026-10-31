/**
 * Fahaka puffer (Tetraodon lineatus, chunk 17) — a big, rigid puffer: a broad head with a short beak, big gold eyes
 * that swivel on their own, a long tapering body, hummingbird pectorals, sculling dorsal and anal fins set far back and
 * a rounded rudder of a tail. Olive-brown back fading to an off-white belly, with pale stripes running along the flank
 * from the tail to the pectoral fin; yellowish fins.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral } from '../core/fins';
import { motion, look, eye, fin } from './common';

export const plan: PlanFn = () => {
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.76,
    dorsal: curve([[0, 0.032], [0.06, 0.07], [0.16, 0.106], [0.3, 0.122], [0.46, 0.116], [0.62, 0.094], [0.76, 0.066], [0.9, 0.044], [1, 0.036]]),
    ventral: curve([[0, 0.03], [0.07, 0.07], [0.2, 0.116], [0.36, 0.13], [0.52, 0.118], [0.68, 0.088], [0.82, 0.058], [0.92, 0.04], [1, 0.034]]),
    width: curve([[0, 0.032], [0.1, 0.082], [0.26, 0.112], [0.44, 0.108], [0.6, 0.086], [0.76, 0.056], [0.9, 0.03], [1, 0.022]]),
    axis: curve([[0, 0.01], [0.3, 0], [1, 0.006]]),
    expTop: 2.1,
    expBottom: 2.05,
    noseRound: 0.1,
    tailRound: 0.03,
    mouth: { kind: 'beak', yn: -0.05, t: 0.03, groove: 0.95 },
    operculum: { t: 0.26, strength: 0.15 },
    cheek: 0.35,
  };
  const b = new BodySampler(body);
  const yFin = (o: Partial<Parameters<typeof fin>[0]> = {}) => fin({ opacity: 0.55, color: 'fin', edge: 'fin2', edgeStart: 0.75, edgeWidth: 0.2, edgeAmount: 0.4, pattern: 0.15, rayContrast: 0.45, irid: 0.1, ...o });
  return {
    key: 'fahaka_puffer',
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.17, spread: 30, rays: 12, soft: 0.35, rootH: 0.95, cup: 0.01, style: yFin({ opacity: 0.7 }) }),
      dorsal(b, { t0: 0.72, t1: 0.84, len: 0.1, angle0: 64, angle1: 30, profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.1)), rays: 10, soft: 0.3, inset: 0.08, style: yFin({ flutter: 0.45 }) }),
      anal(b, { t0: 0.73, t1: 0.85, len: 0.09, angle0: 60, angle1: 30, profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.1)), rays: 9, soft: 0.3, inset: 0.08, style: yFin({ flutter: 0.45, phase: 1.6 }) }),
      pectoral(b, { t: 0.3, yn0: 0.12, yn1: -0.25, len: 0.08, out: 40, a0: 30, a1: -30, profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * s), rays: 12, soft: 0.25, style: yFin({ opacity: 0.35, flutter: 0.55 }) }),
    ],
    eye: eye({ t: 0.15, yn: 0.48, r: 0.034, protrude: 0.42, forward: 0.15, up: 0.25, pupil: 0.42, iris: 'eye', ring: '#3a3014', ringWidth: 0.15, socket: 'body', swivel: 1.4 }),
    motion: motion({ wavelength: 1.2, amp: 0.035, idleAmp: 0.01, envPow: 3.2, headSway: 0.02, bendK: 0.6, pectoralHz: 5.5, idleFlutter: 0.75, finSoft: 0.4, finRest: 0.85, sag: 0.02, idleHz: 1.2, finLag: 0.7, breathe: 0.8, rigid: true }),
    look: look({
      dorsalDark: 0.35,
      bellyLine: -0.35,
      bellyAmount: 0.85,
      bellySoft: 0.3,
      scales: { cols: 60, strength: 0.1, kind: 'skin' },
      roughness: 0.48,
      gloss: 0.4,
      iridMode: 'body',
      iridHue: 0.12,
      sss: 0.45,
      lateralLine: 0,
      // the pale stripes run along the flank above the belly; fewer, broader lines than the shader's default
      patA: [4, 0, 0.04, 0],
      patternBellyFade: -0.3,
      lipColor: 'belly',
    }),
    pickRadius: 0.55,
  };
};
