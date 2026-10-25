/**
 * Zebra danio (Danio rerio, chunk 16) — a slim, torpedo-shaped cyprinid with two pairs of short barbels and a forked
 * tail: five even blue-black horizontal stripes on a silver-gold body running on through the tail and anal fin.
 * Leopard danios (appearance pattern 'spots') carry rows of dark spots instead; long-fin fish (finLength above 1) have
 * long flowing fins and tail; golden fish are pale with faint stripes (their colours). Females are deeper-bellied.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const fl = bucket(finScale(args, 1), 0.1);
  const long = fl > 1.25;
  const female = isFemale(args);
  const spots = a.pattern === 'spots';
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.76,
    dorsal: curve([[0, 0.022], [0.08, 0.044], [0.24, 0.072], [0.44, 0.08], [0.62, 0.07], [0.8, 0.052], [0.93, 0.036], [1, 0.033]]),
    ventral: curve([[0, 0.02], [0.1, 0.044], [0.28, 0.07], [0.46, female ? 0.086 : 0.074], [0.62, 0.064], [0.8, 0.046], [0.94, 0.034], [1, 0.032]]),
    width: curve([[0, 0.016], [0.12, 0.03], [0.36, 0.034], [0.6, 0.026], [0.84, 0.016], [1, 0.012]]),
    axis: curve([[0, 0.002], [0.3, 0], [1, 0.002]]),
    expTop: 2.05,
    expBottom: 2.05,
    noseRound: 0.06,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.2, t: 0.03, groove: 0.6 },
    operculum: { t: 0.2, strength: 0.5 },
    cheek: 0.15,
  };
  const b = new BodySampler(body);
  const striped = fin({ opacity: long ? 0.55 : 0.5, color: 'fin', edge: 'fin2', edgeStart: 0.75, edgeWidth: 0.25, edgeAmount: 0.4, pattern: 0.8, rayContrast: 0.45, irid: 0.3 });
  const mouthP = b.flank(0.03, -0.1, 1, { x: 0, y: 0, z: 0, yn: 0 });
  return {
    key: `zebra_danio|${female ? 'f' : 'm'}|${long ? 'l' : 's'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: long ? 'lyre' : 'forked', len: (long ? 0.42 : 0.24) * fl, spread: 34, fork: long ? 0.35 : 0.62, rays: 18, soft: long ? 0.8 : 0.45, rootH: 1, segS: long ? 30 : 20, segR: long ? 16 : 10, style: striped }),
      dorsal(b, { t0: 0.5, t1: 0.64, len: (long ? 0.18 : 0.09) * fl, angle0: 62, angle1: 32, profile: (s) => 1 - 0.4 * smoothstep(0.4, 1, s), rays: 9, soft: long ? 0.7 : 0.4, style: striped }),
      anal(b, { t0: 0.56, t1: 0.74, len: (long ? 0.16 : 0.08) * fl, angle0: 58, angle1: 28, profile: (s) => 1 - 0.35 * smoothstep(0.4, 1, s), rays: 10, soft: long ? 0.7 : 0.4, style: striped }),
      pectoral(b, { t: 0.24, yn0: -0.1, yn1: -0.5, len: 0.08 * Math.min(1.4, fl), out: 26, a0: 22, a1: -26, rays: 10, soft: 0.3, style: fin({ opacity: 0.2, color: 'clear', pattern: 0, rayContrast: 0.3, flutter: 0.5, irid: 0.1 }) }),
      pelvic(b, { t: 0.42, yn0: -0.86, yn1: -0.92, tLen: 0.02, len: 0.06 * Math.min(1.4, fl), out: 16, a0: -28, a1: -55, rays: 5, soft: 0.3, style: fin({ opacity: 0.35, pattern: 0, rayContrast: 0.35 }) }),
    ],
    extras: [
      // the short barbels at the corners of the mouth
      { kind: 'barbel', path: [[mouthP.x, mouthP.y, mouthP.z], [mouthP.x - 0.01, mouthP.y - 0.012, mouthP.z + 0.008], [mouthP.x - 0.02, mouthP.y - 0.02, mouthP.z + 0.012]], radius: 0.0016, taper: 0.4, mirror: true, t: 0.03 },
    ],
    eye: eye({ t: 0.11, yn: 0.25, r: 0.04, protrude: 0.38, forward: 0.22, up: 0.08, pupil: 0.5, iris: '#141414', ring: '#c8b05a', ringWidth: 0.1 }),
    motion: motion({ wavelength: 0.95, amp: 0.075, idleAmp: 0.016, envPow: 2.2, pectoralHz: 4.6, idleFlutter: 0.45, finSoft: long ? 0.9 : 0.45, finRest: 0.84, sag: long ? 0.14 : 0.04, idleHz: 1.2, finLag: long ? 1.2 : 0.9 }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.55,
      bellyAmount: 0.6,
      scales: { cols: 30, strength: 0.35, kind: 'cycloid' },
      roughness: 0.3,
      gloss: 0.65,
      iridMode: 'stripe',
      iridHue: 0.6,
      sss: 0.5,
      lateralLine: 0,
      lipColor: 'body2',
      // five even stripes from the gill cover to the end of the tail; leopards: rows of spots
      patternMap: { bands: 'lined', solid: 'lined', spots: 'lined' },
      patA: spots ? [2.6, 26, 0.0, 0] : [2.6, 0, 0.1, 0],
      patternBellyFade: -0.8,
    }),
    pickRadius: 0.55,
  };
};
