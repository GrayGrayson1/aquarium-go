/**
 * Ocellaris clownfish — rounded oval body, three white bands with thin black edges (head band following the gill
 * cover, mid band with a forward "arrow", peduncle band), rounded black-edged fins, pectoral rowing + waddle.
 * Morphs: orange, black (melanistic), snowflake (marble), platinum (solid white), misbar (short bands).
 * OWNER: lane "fishart".
 */
import type { CreatureFactoryArgs } from '../types';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin } from './common';
import { luminance } from '../core/palette';

export function clownfishPlan(args: CreatureFactoryArgs): FishPlan {
  const a = args.appearance;
  const dark = luminance(a.bodyColor) < 0.03;
  const body: FishPlan['body'] = {
    noseX: 0.41,
    length: 0.77,
    dorsal: curve([[0, 0.04], [0.1, 0.082], [0.24, 0.122], [0.4, 0.133], [0.56, 0.12], [0.74, 0.08], [0.9, 0.056], [1, 0.05]]),
    ventral: curve([[0, 0.036], [0.1, 0.075], [0.3, 0.113], [0.46, 0.118], [0.62, 0.096], [0.8, 0.064], [0.94, 0.05], [1, 0.049]]),
    width: curve([[0, 0.03], [0.12, 0.056], [0.3, 0.066], [0.5, 0.058], [0.72, 0.038], [0.9, 0.022], [1, 0.019]]),
    axis: curve([[0, -0.004], [0.3, 0], [1, 0.004]]),
    expTop: 2.05,
    expBottom: 2.15,
    noseRound: 0.1,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.12, t: 0.05, groove: 0.8 },
    operculum: { t: 0.24, strength: 0.7 },
    cheek: 0.35,
  };
  const b = new BodySampler(body);
  const edge = 'fin2' as const;
  const blackEdge = { edge, edgeStart: 0.74, edgeWidth: 0.1, edgeAmount: 1 } as const;
  return {
    key: 'ocellaris',
    body,
    fins: [
      caudal(b, {
        kind: 'rounded',
        len: 0.2,
        spread: 36,
        rays: 14,
        soft: 0.3,
        rootH: 1.0,
        cup: 0.01,
        style: fin({ opacity: 0.94, ...blackEdge, edgeStart: 0.7, pattern: 0.2, rayContrast: 0.35, irid: 0.05 }),
      }),
      // spiny dorsal (lower, notched) + soft dorsal (taller, rounded)
      dorsal(b, {
        t0: 0.27,
        t1: 0.55,
        len: 0.085,
        angle0: 70,
        angle1: 48,
        profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * s) - 0.25 * smoothstep(0.75, 1, s),
        rays: 10,
        web: 0.08,
        soft: 0.25,
        style: fin({ opacity: 0.95, ...blackEdge, edgeStart: 0.66, edgeWidth: 0.14, pattern: 0.2, rayContrast: 0.35, irid: 0.05 }),
      }),
      dorsal(b, {
        t0: 0.54,
        t1: 0.84,
        len: 0.13,
        angle0: 62,
        angle1: 22,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.95)),
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.95, ...blackEdge, pattern: 0.2, rayContrast: 0.35, irid: 0.05 }),
      }),
      anal(b, {
        t0: 0.6,
        t1: 0.83,
        len: 0.12,
        angle0: 58,
        angle1: 20,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.95)),
        rays: 11,
        soft: 0.3,
        style: fin({ opacity: 0.95, ...blackEdge, pattern: 0.2, rayContrast: 0.35, irid: 0.05 }),
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.02,
        yn1: -0.48,
        len: 0.12,
        out: 36,
        a0: 24,
        a1: -34,
        profile: (s) => 0.72 + 0.28 * Math.sin(Math.PI * s),
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.85, color: 'fin', edge: dark ? 'fin2' : 'fin', edgeStart: 0.8, edgeAmount: 0.4, pattern: 0, rayContrast: 0.4, flutter: 0.45, irid: 0.05 }),
      }),
      pelvic(b, {
        t: 0.33,
        yn0: -0.84,
        yn1: -0.92,
        tLen: 0.03,
        len: 0.09,
        out: 20,
        a0: -20,
        a1: -55,
        rays: 6,
        soft: 0.3,
        style: fin({ opacity: 0.95, ...blackEdge, edgeStart: 0.6, pattern: 0, rayContrast: 0.3, irid: 0.05 }),
      }),
    ],
    eye: eye({ t: 0.14, yn: 0.32, r: 0.041, protrude: 0.36, forward: 0.22, up: 0.1, pupil: 0.46, iris: 'eye', ring: '#3b2412', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 1.1,
      amp: 0.05,
      idleAmp: 0.016,
      envPow: 2.6,
      headSway: 0.05,
      pectoralHz: 4.2,
      idleFlutter: 0.7,
      finSoft: 0.4,
      finRest: 0.9,
      sag: 0.05,
      idleHz: 0.8,
      finLag: 0.7,
      waddle: 0.1,
      breathe: 0.7,
    }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.55,
      bellyAmount: 0.45,
      scales: { cols: 40, strength: 0.4, kind: 'ctenoid' },
      roughness: 0.4,
      gloss: 0.55,
      iridMode: 'body',
      iridHue: 0.1,
      sss: 0.6,
      bands: [
        { t: 0.235, w: 0.034, curve: 0.03, arrow: 0 },
        { t: 0.53, w: 0.04, curve: 0.0, arrow: 0.05 },
        { t: 0.93, w: 0.024, curve: 0.0, arrow: 0 },
      ],
      patternEdge: 'fin2',
      patternEdgeWidth: dark ? 0.008 : 0.011,
      patA: [0.12, 1, 0, 0],
      lateralLine: 0.1,
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
}
