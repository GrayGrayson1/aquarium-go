/**
 * Naso tang (Naso lituratus, chunk 17) — a long, flat unicornfish (no horn on this one) with a steep face, a black
 * dorsal fin edged white, and a lyre tail whose tips grow into long streamers in adult males. Grey-brown, with a black
 * mask from the lips to between the eyes edged yellow, a yellow patch above the eyes, orange lips and two bright orange
 * blades at the tail base. Young are grey with a blue line on the dorsal and an orange stripe in the anal fin, no mask.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const male = !isFemale(args) && !young;
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.8,
    // a steep forehead to a long, even back
    dorsal: curve([[0, 0.02], [0.05, 0.06], [0.14, 0.1], [0.3, 0.118], [0.5, 0.114], [0.7, 0.088], [0.86, 0.05], [0.95, 0.032], [1, 0.03]]),
    ventral: curve([[0, 0.02], [0.08, 0.05], [0.2, 0.09], [0.38, 0.11], [0.56, 0.104], [0.74, 0.078], [0.88, 0.044], [1, 0.03]]),
    width: curve([[0, 0.014], [0.1, 0.032], [0.3, 0.042], [0.55, 0.038], [0.8, 0.02], [1, 0.013]]),
    axis: curve([[0, -0.01], [0.2, 0], [1, 0.002]]),
    expTop: 1.9,
    expBottom: 1.9,
    noseRound: 0.035,
    tailRound: 0.02,
    mouth: { kind: 'terminal', yn: -0.15, t: 0.025, groove: 0.5 },
    operculum: { t: 0.24, strength: 0.5 },
    cheek: 0.15,
    keel: 0.3,
  };
  const b = new BodySampler(body);
  const marks: Mark[] = young
    ? []
    : [
        // the black mask from the lips up between the eyes, edged yellow, and the yellow patch above the eyes
        { t: 0.06, yn: 0.1, rt: 0.06, ryn: 0.75, color: 'accent', strength: 0.9, soft: 0.3 },
        { t: 0.06, yn: 0.05, rt: 0.045, ryn: 0.6, color: '#151312', strength: 0.95, soft: 0.25 },
        { t: 0.12, yn: 0.82, rt: 0.06, ryn: 0.2, color: 'accent', strength: 0.85, soft: 0.35 },
        // orange lips
        { t: 0.015, yn: -0.15, rt: 0.02, ryn: 0.35, color: '#ff7a1a', strength: 0.95, soft: 0.25 },
      ];
  // the two bright orange blades at the tail base
  marks.push({ t: 0.86, yn: -0.1, rt: 0.035, ryn: 0.18, color: '#ff7a1a', strength: young ? 0.6 : 0.97, soft: 0.2 });
  marks.push({ t: 0.92, yn: -0.1, rt: 0.03, ryn: 0.16, color: '#ff7a1a', strength: young ? 0.6 : 0.97, soft: 0.2 });
  const darkFin = fin({ opacity: 0.95, color: young ? '#4a4a52' : 'fin', edge: young ? '#4a8ae0' : 'fin2', edgeStart: 0.78, edgeWidth: 0.2, edgeAmount: 0.9, pattern: 0.1, rayContrast: 0.35, irid: 0.05 });
  const streamer = male ? 0.6 : 0;
  return {
    key: `naso_tang|${male ? 'm' : 'f'}|${young ? 'y' : 'a'}|${fl}`,
    body,
    fins: [
      // a lyre tail; adult males grow long streamers from both tips
      caudal(b, { kind: 'lyre', len: (0.18 + streamer * 0.3) * fl, spread: 36, fork: 0.55 + streamer * 0.4, rays: 16, soft: 0.35, rootH: 1, cup: 0.01, style: fin({ opacity: 0.9, color: 'body2', edge: young ? 'body2' : 'accent', edgeStart: 0.85, edgeWidth: 0.12, edgeAmount: 0.7, pattern: 0.2, rayContrast: 0.35, irid: 0.05 }) }),
      dorsal(b, { t0: 0.16, t1: 0.88, len: 0.085 * fl, angle0: 60, angle1: 38, profile: (s) => (0.65 + 0.35 * smoothstep(0, 0.3, s)) * (1 - 0.25 * smoothstep(0.75, 1, s)), rays: 30, soft: 0.35, segS: 40, inset: 0.03, style: darkFin }),
      anal(b, { t0: 0.4, t1: 0.88, len: 0.07 * fl, angle0: 58, angle1: 36, profile: (s) => (0.65 + 0.35 * smoothstep(0, 0.3, s)) * (1 - 0.25 * smoothstep(0.75, 1, s)), rays: 24, soft: 0.35, inset: 0.03, style: fin({ opacity: 0.92, color: young ? '#e0782a' : 'body2', pattern: 0.1, rayContrast: 0.35, irid: 0.05 }) }),
      pectoral(b, { t: 0.27, yn0: -0.05, yn1: -0.35, len: 0.085, out: 30, a0: 22, a1: -26, rays: 14, soft: 0.3, style: fin({ opacity: 0.6, color: 'body2', pattern: 0, rayContrast: 0.3, flutter: 0.55, irid: 0.05 }) }),
      pelvic(b, { t: 0.3, yn0: -0.86, yn1: -0.92, tLen: 0.02, len: 0.05, out: 16, a0: -26, a1: -52, rays: 6, soft: 0.3, style: darkFin }),
    ],
    eye: eye({ t: 0.13, yn: 0.45, r: 0.024, protrude: 0.3, forward: 0.2, up: 0.12, pupil: 0.5, iris: 'eye', socket: 'body', swivel: 0.35 }),
    motion: motion({ wavelength: 1.05, amp: 0.055, idleAmp: 0.012, envPow: 2.6, headSway: 0.04, bendK: 0.9, pectoralHz: 3.8, idleFlutter: 0.5, finSoft: 0.4, finRest: 0.85, sag: 0.03, idleHz: 0.8, finLag: 0.9, breathe: 0.5 }),
    look: look({ dorsalDark: 0.15, bellyLine: -0.5, bellyAmount: 0.45, bellySoft: 0.45, scales: { cols: 70, strength: 0.06, kind: 'fine' }, roughness: 0.35, gloss: 0.6, iridMode: 'body', iridHue: 0.2, sss: 0.4, lateralLine: 0.05, marks }),
    pickRadius: 0.55,
  };
};
