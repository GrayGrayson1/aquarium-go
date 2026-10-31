/**
 * Blue tang (Paracanthurus hepatus, chunk 17) — an oval, flat surgeonfish with a small pointed snout, a long low dorsal
 * and anal fin and a squared tail. Royal blue with the black "palette": a band from the eye along the upper body that
 * loops back to the tail's upper and lower edges, leaving a blue blotch behind the pectoral fin; the tail's centre and
 * the pectorals yellow; dorsal and anal fins blue with black edges. The Indian Ocean form has a yellow belly (the
 * appearance's belly colour). Young are coloured as adults, a little deeper-bodied.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.76,
    dorsal: curve([[0, 0.018], [0.06, 0.05], [0.16, 0.098], [0.32, 0.128], [0.5, 0.126], [0.68, 0.098], [0.84, 0.056], [0.94, 0.036], [1, 0.034]]),
    ventral: curve([[0, 0.018], [0.08, 0.052], [0.2, 0.1], [0.36, 0.124], [0.54, 0.118], [0.72, 0.088], [0.86, 0.05], [1, 0.033]]),
    width: curve([[0, 0.014], [0.1, 0.03], [0.3, 0.042], [0.55, 0.038], [0.8, 0.022], [1, 0.014]]),
    axis: curve([[0, -0.006], [0.2, 0], [1, 0.002]]),
    expTop: 1.9,
    expBottom: 1.9,
    noseRound: 0.04,
    tailRound: 0.025,
    mouth: { kind: 'terminal', yn: 0.0, t: 0.025, groove: 0.5 },
    operculum: { t: 0.24, strength: 0.5 },
    cheek: 0.15,
    keel: 0.3,
  };
  const b = new BodySampler(body);
  const ink = 'accent';
  const marks: Mark[] = [
    // the palette: a thick black band from behind the eye along the upper flank to the tail base…
    { t: 0.45, yn: 0.45, rt: 0.36, ryn: 0.22, color: ink, strength: 0.97, soft: 0.2, mode: 'stripe', rot: -0.05 },
    // …a black sweep below it that loops back to the tail, enclosing the blue blotch behind the pectoral
    { t: 0.6, yn: -0.05, rt: 0.2, ryn: 0.22, color: ink, strength: 0.95, soft: 0.25, mode: 'stripe', rot: 0.35 },
    { t: 0.4, yn: 0.15, rt: 0.08, ryn: 0.2, color: 'body', strength: 0.9, soft: 0.3 },
    // the black edge of the tail base
    { t: 0.9, yn: 0.2, rt: 0.06, ryn: 0.9, color: ink, strength: 0.85, soft: 0.3 },
  ];
  const blueFin = fin({ opacity: 0.95, color: 'fin', edge: '#0b0f1a', edgeStart: 0.82, edgeWidth: 0.16, edgeAmount: 1, pattern: 0.2, rayContrast: 0.35, irid: 0.2 });
  return {
    key: `blue_tang|${fl}`,
    body,
    fins: [
      // the yellow triangle inside a black-edged tail
      caudal(b, { kind: 'truncate', len: 0.18 * fl, spread: 34, rays: 16, soft: 0.3, rootH: 1.05, cup: 0.01, style: fin({ opacity: 0.95, color: 'fin2', edge: '#0b0f1a', edgeStart: 0.55, edgeWidth: 0.4, edgeAmount: 1, pattern: 0, rayContrast: 0.35, irid: 0.05 }) }),
      dorsal(b, { t0: 0.18, t1: 0.9, len: 0.09 * fl, angle0: 64, angle1: 38, profile: (s) => (0.6 + 0.4 * smoothstep(0, 0.3, s)) * (1 - 0.3 * smoothstep(0.75, 1, s)), rays: 30, soft: 0.35, segS: 40, inset: 0.03, style: blueFin }),
      anal(b, { t0: 0.42, t1: 0.9, len: 0.08 * fl, angle0: 60, angle1: 36, profile: (s) => (0.6 + 0.4 * smoothstep(0, 0.3, s)) * (1 - 0.3 * smoothstep(0.75, 1, s)), rays: 24, soft: 0.35, inset: 0.03, style: blueFin }),
      pectoral(b, { t: 0.28, yn0: -0.05, yn1: -0.35, len: 0.09, out: 30, a0: 22, a1: -26, rays: 14, soft: 0.3, style: fin({ opacity: 0.75, color: 'fin2', pattern: 0, rayContrast: 0.3, flutter: 0.55, irid: 0.05 }) }),
      pelvic(b, { t: 0.32, yn0: -0.86, yn1: -0.92, tLen: 0.02, len: 0.06, out: 16, a0: -26, a1: -52, rays: 6, soft: 0.3, style: blueFin }),
    ],
    eye: eye({ t: 0.13, yn: 0.4, r: 0.028, protrude: 0.32, forward: 0.2, up: 0.12, pupil: 0.5, iris: 'eye', socket: 'accent', swivel: 0.35 }),
    motion: motion({ wavelength: 1.05, amp: 0.055, idleAmp: 0.012, envPow: 2.6, headSway: 0.04, bendK: 0.9, pectoralHz: 4.2, idleFlutter: 0.55, finSoft: 0.35, finRest: 0.85, sag: 0.02, idleHz: 0.9, finLag: 0.8, breathe: 0.5 }),
    look: look({ dorsalDark: 0.1, bellyLine: -0.55, bellyAmount: 0.6, bellySoft: 0.4, scales: { cols: 70, strength: 0.08, kind: 'fine' }, roughness: 0.3, gloss: 0.7, iridMode: 'body', iridHue: 0.6, sss: 0.45, lateralLine: 0.05, marks }),
    pickRadius: 0.5,
  };
};
