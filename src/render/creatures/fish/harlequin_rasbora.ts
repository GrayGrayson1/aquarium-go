/**
 * Harlequin rasbora (Trigonostigma heteromorpha, chunk 16) — a small, deep-ish, compressed cyprinid with a forked tail:
 * coppery orange to pinkish-violet with a black triangular wedge on the rear half (its point reaching forward and down
 * toward the belly), the fins tinted orange-red. Males have a sharper-cornered wedge reaching further down, females a
 * rounder one.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const female = isFemale(args);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.74,
    // deep-ish and compressed: body depth about a third of the length (Tan 2020: 33–38% of SL)
    dorsal: curve([[0, 0.03], [0.08, 0.068], [0.22, 0.118], [0.4, 0.138], [0.56, 0.122], [0.74, 0.082], [0.9, 0.05], [1, 0.044]]),
    ventral: curve([[0, 0.028], [0.1, 0.066], [0.28, 0.12], [0.44, 0.13], [0.6, 0.106], [0.78, 0.066], [0.93, 0.046], [1, 0.042]]),
    width: curve([[0, 0.018], [0.12, 0.032], [0.34, 0.036], [0.58, 0.028], [0.84, 0.016], [1, 0.013]]),
    axis: curve([[0, 0.004], [0.3, 0], [1, 0.002]]),
    expTop: 2.0,
    expBottom: 2.05,
    noseRound: 0.07,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.15, t: 0.035, groove: 0.6 },
    operculum: { t: 0.22, strength: 0.55 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const tint = fin({ opacity: 0.55, color: 'fin', edge: 'fin2', edgeStart: 0.65, edgeWidth: 0.3, edgeAmount: 0.5, pattern: 0, rayContrast: 0.45, irid: 0.25 });
  return {
    key: `harlequin_rasbora|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'forked', len: 0.26 * fl, spread: 34, fork: 0.6, rays: 18, soft: 0.45, rootH: 1, style: tint }),
      dorsal(b, { t0: 0.42, t1: 0.6, len: 0.12 * fl, angle0: 66, angle1: 34, profile: (s) => 1 - 0.45 * smoothstep(0.4, 1, s), rays: 9, soft: 0.4, style: tint }),
      anal(b, { t0: 0.58, t1: 0.74, len: 0.09 * fl, angle0: 58, angle1: 28, profile: (s) => 1 - 0.4 * smoothstep(0.4, 1, s), rays: 8, soft: 0.4, style: tint }),
      pectoral(b, { t: 0.25, yn0: -0.1, yn1: -0.5, len: 0.08, out: 28, a0: 22, a1: -26, rays: 10, soft: 0.3, style: fin({ opacity: 0.2, color: 'clear', pattern: 0, rayContrast: 0.3, flutter: 0.5, irid: 0.1 }) }),
      pelvic(b, { t: 0.42, yn0: -0.86, yn1: -0.92, tLen: 0.02, len: 0.07, out: 16, a0: -28, a1: -55, rays: 5, soft: 0.3, style: tint }),
    ],
    eye: eye({ t: 0.1, yn: 0.22, r: 0.042, protrude: 0.38, forward: 0.22, up: 0.08, pupil: 0.5, iris: '#1a1410', ring: '#c8862a', ringWidth: 0.1 }),
    motion: motion({ wavelength: 1.0, amp: 0.07, idleAmp: 0.016, envPow: 2.3, pectoralHz: 4.4, idleFlutter: 0.5, finSoft: 0.45, finRest: 0.85, sag: 0.05, idleHz: 1.1, finLag: 0.9 }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.5,
      bellyAmount: 0.55,
      scales: { cols: 26, strength: 0.5, kind: 'cycloid' },
      roughness: 0.3,
      gloss: 0.65,
      iridMode: 'scales',
      iridHue: 0.85,
      sss: 0.6,
      lateralLine: 0.1,
      lipColor: 'body2',
      marks: [
        // the black wedge (Tan 2020's "axine"): a near-vertical front edge under the dorsal fin, its lower corner dipping
        // toward the belly (lower and sharper in males, rounder in females), narrowing to a point at the tail base
        female
          ? { t: 0.715, yn: -0.0, rt: 0.265, ryn: 0.56, color: 'accent', strength: 0.95, soft: 0.22, mode: 'wedge', rot: 0.3 }
          : { t: 0.71, yn: -0.08, rt: 0.27, ryn: 0.68, color: 'accent', strength: 0.95, soft: 0.14, mode: 'wedge', rot: 0.33 },
        // a violet-pink sheen on the shoulder
        { t: 0.3, yn: 0.25, rt: 0.18, ryn: 0.5, color: 'body2', strength: 0.4, soft: 0.8 },
      ],
    }),
    pickRadius: 0.55,
  };
};
