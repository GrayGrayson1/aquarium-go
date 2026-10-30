/**
 * Black ghost knifefish (Apteronotus albifrons, chunk 17) — a long, flat-sided blade of a fish that tapers to a thin
 * tail, with no dorsal fin (only a thin filament groove along the back), a tiny tail fin, and one long ribbon fin under
 * the body from the chest almost to the tail; it holds its body straight and swims by rippling that fin (rigid motion,
 * the fin's flutter). Velvet black with a white blaze on the snout that may run on as a stripe down the back, and two
 * white rings round the tail. The white form is cream-white all over (the appearance's colours).
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, anal, pectoral } from '../core/fins';
import { motion, look, eye, fin } from './common';

export const plan: PlanFn = () => {
  const body: FishPlan['body'] = {
    noseX: 0.44,
    length: 0.92,
    // a blunt head, deepest at the chest, tapering steadily to a thread-thin tail
    dorsal: curve([[0, 0.02], [0.06, 0.044], [0.16, 0.06], [0.3, 0.064], [0.5, 0.054], [0.7, 0.036], [0.86, 0.02], [1, 0.008]]),
    ventral: curve([[0, 0.024], [0.08, 0.054], [0.2, 0.072], [0.34, 0.074], [0.52, 0.06], [0.72, 0.038], [0.88, 0.02], [1, 0.008]]),
    width: curve([[0, 0.018], [0.1, 0.03], [0.26, 0.034], [0.5, 0.026], [0.8, 0.012], [1, 0.005]]),
    axis: curve([[0, 0.004], [0.3, 0], [1, 0.006]]),
    expTop: 2.3,
    expBottom: 2.4,
    noseRound: 0.06,
    tailRound: 0.01,
    mouth: { kind: 'terminal', yn: -0.15, t: 0.03, groove: 0.4 },
    operculum: { t: 0.15, strength: 0.25 },
    cheek: 0.15,
  };
  const b = new BodySampler(body);
  const marks: Mark[] = [
    // the white blaze on the snout, running on as a thin stripe along the back
    { t: 0.04, yn: 0.45, rt: 0.05, ryn: 0.6, color: 'accent', strength: 0.95, soft: 0.3 },
    { t: 0.28, yn: 0.95, rt: 0.24, ryn: 0.12, color: 'accent', strength: 0.75, soft: 0.4 },
    // two white rings round the tail
    { t: 0.83, yn: 0, rt: 0.022, ryn: 1.2, color: 'accent', strength: 0.95, soft: 0.2, mode: 'band_t' },
    { t: 0.93, yn: 0, rt: 0.02, ryn: 1.2, color: 'accent', strength: 0.95, soft: 0.2, mode: 'band_t' },
  ];
  return {
    key: 'black_ghost_knifefish',
    body,
    fins: [
      // a tiny tail fin
      caudal(b, { kind: 'pointed', len: 0.05, spread: 22, rays: 8, soft: 0.3, rootH: 1, cup: 0, style: fin({ opacity: 0.6, color: 'fin', pattern: 0.4, rayContrast: 0.2, irid: 0.05 }) }),
      // the long ribbon fin under the body: it does the swimming, rippling (flutter) while the body stays straight
      anal(b, {
        t0: 0.14,
        t1: 0.96,
        len: 0.095,
        angle0: 82,
        angle1: 70,
        profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, s * 1.15)),
        rays: 40,
        soft: 1.2,
        segS: 48,
        segR: 8,
        inset: 0.02,
        style: fin({ opacity: 0.55, color: 'fin', edge: 'fin2', edgeStart: 0.55, edgeWidth: 0.45, edgeAmount: 0.7, pattern: 0.2, rayContrast: 0.45, irid: 0.1, flutter: 1.6 }),
      }),
      pectoral(b, { t: 0.17, yn0: -0.05, yn1: -0.4, len: 0.06, out: 30, a0: 20, a1: -28, rays: 10, soft: 0.3, style: fin({ opacity: 0.4, color: 'fin', pattern: 0, rayContrast: 0.25, flutter: 0.6, irid: 0.05 }) }),
    ],
    // tiny eyes: it hunts with its electric sense
    eye: eye({ t: 0.06, yn: 0.25, r: 0.012, protrude: 0.2, forward: 0.3, up: 0.1, pupil: 0.55, iris: 'eye', socket: 'body', swivel: 0.2 }),
    motion: motion({ wavelength: 0.8, amp: 0.012, idleAmp: 0.004, envPow: 3, headSway: 0.01, bendK: 0.5, pectoralHz: 3, idleFlutter: 0.5, finSoft: 1.3, finRest: 0.9, sag: 0, idleHz: 1.4, finLag: 1.6, breathe: 0.4, rigid: true }),
    look: look({
      dorsalDark: 0.1,
      bellyLine: -0.8,
      bellyAmount: 0.15,
      bellySoft: 0.5,
      scales: { cols: 80, strength: 0.06, kind: 'skin' },
      roughness: 0.55,
      gloss: 0.45,
      iridMode: 'body',
      iridHue: 0.6,
      sss: 0.3,
      lateralLine: 0.05,
      patternMap: { saddle: 'solid' },
      lipColor: 'body2',
      marks,
    }),
    pickRadius: 0.45,
  };
};
