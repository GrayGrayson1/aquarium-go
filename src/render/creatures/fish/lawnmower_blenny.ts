/**
 * Lawnmower blenny (Salarias fasciatus, chunk 16) — an elongate combtooth blenny with a blunt, steep head, a big
 * fleshy-lipped mouth set low, eyes high on top of the head with small branched cirri above them, a long continuous
 * dorsal fin notched between its spiny and soft parts, a long anal fin, short pelvics it props itself on, and a rounded
 * tail. Mottled olive and grey-brown, with darker bars, small pale and blue-white spots and fine dark lines on the face.
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
    noseX: 0.45,
    length: 0.82,
    // a steep, blunt forehead, the body tapering evenly to the tail
    dorsal: curve([[0, 0.06], [0.03, 0.078], [0.08, 0.094], [0.16, 0.1], [0.3, 0.096], [0.5, 0.084], [0.72, 0.062], [0.9, 0.042], [1, 0.036]]),
    ventral: curve([[0, 0.034], [0.05, 0.06], [0.14, 0.078], [0.3, 0.08], [0.5, 0.072], [0.72, 0.054], [0.9, 0.038], [1, 0.034]]),
    width: curve([[0, 0.036], [0.1, 0.05], [0.28, 0.05], [0.5, 0.042], [0.74, 0.03], [0.9, 0.02], [1, 0.016]]),
    axis: curve([[0, 0.004], [0.3, 0], [1, 0.002]]),
    expTop: 2.2,
    expBottom: 2.3,
    noseRound: 0.06,
    tailRound: 0.025,
    mouth: { kind: 'subterminal', yn: -0.45, t: 0.03, groove: 0.95 },
    operculum: { t: 0.2, strength: 0.45 },
    cheek: 0.45,
  };
  const b = new BodySampler(body);
  const mot = fin({ opacity: 0.85, edge: 'fin2', edgeStart: 0.75, edgeWidth: 0.2, edgeAmount: 0.4, pattern: 0.7, rayContrast: 0.5, irid: 0.05 });
  // the cirri: a small branched tuft over each eye
  const top = b.flank(0.1, 0.95, 1, { x: 0, y: 0, z: 0, yn: 0 });
  return {
    key: `lawnmower_blenny|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.15 * fl, spread: 30, rays: 13, soft: 0.35, rootH: 1.05, cup: 0.008, style: mot }),
      // spiny dorsal, then a notch, then the long soft dorsal
      dorsal(b, { t0: 0.18, t1: 0.5, len: 0.075 * fl, angle0: 72, angle1: 52, profile: (s) => (0.9 - 0.25 * smoothstep(0.7, 1, s)), rays: 12, soft: 0.3, style: mot }),
      dorsal(b, { t0: 0.5, t1: 0.94, len: 0.09 * fl, angle0: 66, angle1: 42, profile: (s) => (0.65 + 0.35 * smoothstep(0, 0.3, s)) * (1 - 0.2 * smoothstep(0.85, 1, s)), rays: 18, soft: 0.35, style: mot }),
      anal(b, { t0: 0.48, t1: 0.92, len: 0.07 * fl, angle0: 60, angle1: 38, profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s), rays: 20, soft: 0.35, style: mot }),
      pectoral(b, { t: 0.22, yn0: 0.1, yn1: -0.65, len: 0.13, out: 36, a0: 18, a1: -36, profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s), rays: 14, soft: 0.3, style: fin({ opacity: 0.6, color: 'fin', pattern: 0.4, rayContrast: 0.55, flutter: 0.4, irid: 0.05 }) }),
      // short, stiff pelvics set forward under the throat: the props it perches on
      pelvic(b, { t: 0.14, yn0: -0.92, yn1: -0.96, tLen: 0.01, len: 0.05, out: 28, a0: -50, a1: -75, rays: 3, soft: 0.15, style: fin({ opacity: 0.85, pattern: 0, rayContrast: 0.5, irid: 0 }) }),
    ],
    extras: [
      { kind: 'bristle', path: [[top.x - 0.01, top.y, top.z * 0.6], [top.x - 0.004, top.y + 0.02, top.z * 0.6 + 0.004], [top.x + 0.004, top.y + 0.034, top.z * 0.6 + 0.008]], radius: 0.0035, taper: 0.3, mirror: true, t: 0.1 },
      { kind: 'bristle', path: [[top.x - 0.004, top.y + 0.02, top.z * 0.6 + 0.004], [top.x - 0.016, top.y + 0.03, top.z * 0.6 + 0.01]], radius: 0.0025, taper: 0.3, mirror: true, t: 0.1 },
    ],
    eye: eye({ t: 0.1, yn: 0.62, r: 0.034, protrude: 0.5, forward: 0.15, up: 0.35, pupil: 0.48, iris: 'eye', ring: '#2a2a20', ringWidth: 0.12, swivel: 1.4 }),
    motion: motion({ wavelength: 0.85, amp: 0.08, idleAmp: 0.008, envPow: 2, headSway: 0.08, pectoralHz: 2.6, idleFlutter: 0.3, finSoft: 0.35, finRest: 0.88, sag: 0.02, idleHz: 0.5, finLag: 0.8, breathe: 0.9 }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.55,
      bellyAmount: 0.45,
      bellySoft: 0.45,
      scales: { cols: 40, strength: 0.05, kind: 'skin' },
      roughness: 0.5,
      gloss: 0.45,
      iridMode: 'scales',
      iridHue: 0.4,
      sss: 0.4,
      lateralLine: 0,
      appendageColor: 'body2',
      lipColor: 'belly',
      marks: [
        // fine dark lines on the face, and darker bars down the flank
        { t: 0.06, yn: -0.1, rt: 0.06, ryn: 0.05, color: 'body2', strength: 0.6, soft: 0.4, mode: 'stripe', rot: -0.4 },
        { t: 0.06, yn: -0.35, rt: 0.06, ryn: 0.05, color: 'body2', strength: 0.6, soft: 0.4, mode: 'stripe', rot: -0.5 },
      ],
      // the appearance's mottled pattern carries the blotches; small pale and blue-white spots ride over it
      patA: [0, 0, 0, 0],
    }),
    pickRadius: 0.55,
  };
};
