/**
 * Six-line wrasse (Pseudocheilinus hexataenia, chunk 16) — a small, oval, slightly compressed wrasse with a pointed
 * snout, a long low dorsal fin and a rounded tail. Purple-blue body crossed by six orange lines along the upper two
 * thirds, fine blue-green lines on the face, a green-yellow back to the head, and a small black eyespot ringed pale on
 * the upper base of the tail. Rows with its pectorals like the other wrasses.
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
    noseX: 0.43,
    length: 0.78,
    dorsal: curve([[0, 0.024], [0.05, 0.044], [0.12, 0.07], [0.24, 0.094], [0.4, 0.1], [0.6, 0.088], [0.8, 0.062], [0.93, 0.042], [1, 0.038]]),
    ventral: curve([[0, 0.02], [0.06, 0.04], [0.14, 0.066], [0.28, 0.084], [0.44, 0.086], [0.62, 0.072], [0.8, 0.052], [0.94, 0.038], [1, 0.036]]),
    width: curve([[0, 0.018], [0.1, 0.034], [0.26, 0.044], [0.44, 0.042], [0.66, 0.032], [0.86, 0.02], [1, 0.015]]),
    axis: curve([[0, -0.004], [0.3, 0], [1, 0.002]]),
    expTop: 2.1,
    expBottom: 2.1,
    noseRound: 0.06,
    tailRound: 0.025,
    mouth: { kind: 'terminal', yn: -0.02, t: 0.03, groove: 0.6 },
    operculum: { t: 0.22, strength: 0.5 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const lowFin = fin({ opacity: 0.85, edge: 'fin2', edgeStart: 0.7, edgeWidth: 0.25, edgeAmount: 0.6, pattern: 0.3, rayContrast: 0.35, irid: 0.3 });
  return {
    key: `sixline_wrasse|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.17 * fl, spread: 32, rays: 14, soft: 0.35, rootH: 1.05, cup: 0.008, style: fin({ opacity: 0.85, color: 'fin', edge: 'fin2', edgeStart: 0.7, edgeWidth: 0.25, edgeAmount: 0.5, pattern: 0.2, rayContrast: 0.35, irid: 0.2 }) }),
      dorsal(b, { t0: 0.24, t1: 0.88, len: 0.065 * fl, angle0: 66, angle1: 38, profile: (s) => 0.75 + 0.25 * smoothstep(0, 0.3, s) - 0.15 * smoothstep(0.85, 1, s), rays: 20, soft: 0.35, cup: 0.004, segS: 34, segR: 8, inset: 0.03, style: lowFin }),
      anal(b, { t0: 0.55, t1: 0.88, len: 0.06 * fl, angle0: 60, angle1: 34, profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s), rays: 12, soft: 0.35, style: lowFin }),
      pectoral(b, { t: 0.28, yn0: -0.05, yn1: -0.38, len: 0.1, out: 30, a0: 24, a1: -20, profile: (s) => 1 - 0.45 * s, rays: 12, soft: 0.3, style: fin({ opacity: 0.35, color: 'fin', pattern: 0, rayContrast: 0.35, flutter: 0.9, irid: 0.1 }) }),
      pelvic(b, { t: 0.31, yn0: -0.86, yn1: -0.93, tLen: 0.02, len: 0.055 * fl, out: 14, a0: -32, a1: -58, rays: 5, soft: 0.3, style: fin({ opacity: 0.8, pattern: 0, rayContrast: 0.3, irid: 0.1 }) }),
    ],
    eye: eye({ t: 0.12, yn: 0.26, r: 0.036, protrude: 0.38, forward: 0.22, up: 0.08, pupil: 0.48, iris: 'eye', ring: '#e0b030', ringWidth: 0.12 }),
    motion: motion({ wavelength: 1.1, amp: 0.04, idleAmp: 0.01, envPow: 2.8, headSway: 0.05, pectoralHz: 4.6, pectoralAmp: 0.75, idleFlutter: 0.85, finSoft: 0.4, finRest: 0.75, sag: 0.04, idleHz: 0.8, finLag: 0.7, breathe: 0.5 }),
    look: look({
      dorsalDark: 0.15,
      bellyLine: -0.6,
      bellyAmount: 0.3,
      scales: { cols: 36, strength: 0.4, kind: 'cycloid' },
      roughness: 0.34,
      gloss: 0.55,
      iridMode: 'scales',
      iridHue: 0.7,
      sss: 0.4,
      lateralLine: 0,
      lipColor: 'body2',
      // six orange lines along the upper body (they fade out toward the belly)
      patA: [3.2, 0, 0.06, 0],
      patternBellyFade: -0.15,
      marks: [
        // fine blue-green lines on the face, green-yellow over the top of the head
        { t: 0.07, yn: -0.2, rt: 0.08, ryn: 0.05, color: '#3fc0b0', strength: 0.8, soft: 0.4, mode: 'stripe', rot: -0.15 },
        { t: 0.07, yn: 0.1, rt: 0.08, ryn: 0.05, color: '#3fc0b0', strength: 0.8, soft: 0.4, mode: 'stripe', rot: 0.05 },
        { t: 0.1, yn: 0.7, rt: 0.12, ryn: 0.4, color: '#b8c84a', strength: 0.5, soft: 0.6 },
        // the black eyespot, ringed pale, on the upper base of the tail
        { t: 0.97, yn: 0.55, rt: 0.03, ryn: 0.32, color: '#e8f0f0', strength: 0.9, soft: 0.3 },
        { t: 0.97, yn: 0.55, rt: 0.022, ryn: 0.24, color: '#0a0a12', strength: 1, soft: 0.3 },
      ],
    }),
    pickRadius: 0.55,
  };
};
