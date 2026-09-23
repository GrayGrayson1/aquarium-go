/**
 * Generic procedural fish — the registry fallback, so no creature ever renders as primitive geometry.
 * A balanced, attractive fusiform fish that adapts to any appearance (colours, pattern, fin length, body depth).
 * OWNER: lane "fishart".
 */
import type { CreatureFactoryArgs } from '../types';
import type { FishPlan } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export function genericPlan(args: CreatureFactoryArgs): FishPlan {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.76,
    dorsal: curve([[0, 0.04], [0.1, 0.07], [0.3, 0.1], [0.45, 0.102], [0.65, 0.08], [0.85, 0.045], [1, 0.034]]),
    ventral: curve([[0, 0.035], [0.12, 0.065], [0.35, 0.09], [0.5, 0.088], [0.7, 0.06], [0.88, 0.038], [1, 0.032]]),
    width: curve([[0, 0.025], [0.15, 0.045], [0.35, 0.05], [0.6, 0.038], [0.85, 0.018], [1, 0.013]]),
    noseRound: 0.08,
    mouth: { kind: 'terminal', yn: -0.05, t: 0.05 },
    operculum: { t: 0.24, strength: 0.8 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  return {
    key: `generic|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'forked', len: 0.23 * fl, spread: 34, fork: 0.45, rays: 16, soft: 0.5, style: fin({ opacity: 0.75, edgeStart: 0.6 }) }),
      dorsal(b, { t0: 0.36, t1: 0.62, len: 0.12 * fl, angle0: 62, angle1: 24, rays: 11, soft: 0.4, style: fin({ opacity: 0.7 }) }),
      anal(b, { t0: 0.62, t1: 0.82, len: 0.09 * fl, angle0: 58, angle1: 24, rays: 9, soft: 0.4, style: fin({ opacity: 0.65 }) }),
      pectoral(b, { t: 0.29, yn0: -0.05, yn1: -0.4, len: 0.09, out: 28, a0: 20, a1: -30, rays: 10, style: fin({ opacity: 0.45, flutter: 0.2 }) }),
      pelvic(b, { t: 0.4, yn0: -0.85, yn1: -0.92, tLen: 0.03, len: 0.07, out: 18, a0: -10, a1: -40, rays: 6, style: fin({ opacity: 0.5 }) }),
    ],
    eye: eye({ t: 0.12, yn: 0.25, r: 0.036 }),
    motion: motion(),
    look: look({ iridMode: 'body' }),
  };
}
