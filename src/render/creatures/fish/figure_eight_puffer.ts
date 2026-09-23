/**
 * Figure-eight puffer (Dichotomyctere ocellatus) — a rigid, round-bodied puffer like the pea puffer but longer, with a
 * bigger head, a pointed snout and a short beak; big independently swivelling gold-green eyes; hummingbird pectorals,
 * sculling dorsal/anal fins set far back and a rudder tail. Look: dark olive back densely scrawled with yellow-green
 * vermiculation, two linked yellow-ringed ocelli on each upper flank (the "figure 8"), and a crisp white belly.
 * OWNER: lane "brackish" (fish art).
 */
import type { CreatureFactoryArgs } from '../types';
import type { FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral } from '../core/fins';
import { motion, look, eye, fin, bucket } from './common';

export function figureEightPufferPlan(args: CreatureFactoryArgs): FishPlan {
  const a = args.appearance;
  const bold = bucket(Math.min(1.4, Math.max(0.8, a.patternScale ?? 1)), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.74,
    // big head, deepest just behind the eyes, tapering into a slim peduncle
    dorsal: curve([[0, 0.03], [0.06, 0.07], [0.16, 0.112], [0.3, 0.132], [0.44, 0.13], [0.58, 0.112], [0.72, 0.082], [0.86, 0.052], [1, 0.036]]),
    ventral: curve([[0, 0.028], [0.07, 0.068], [0.2, 0.118], [0.36, 0.136], [0.5, 0.128], [0.64, 0.1], [0.78, 0.066], [0.9, 0.042], [1, 0.034]]),
    width: curve([[0, 0.03], [0.1, 0.08], [0.26, 0.118], [0.42, 0.116], [0.58, 0.096], [0.74, 0.062], [0.88, 0.032], [1, 0.022]]),
    axis: curve([[0, 0.012], [0.3, 0], [1, 0.006]]),
    expTop: 2.1,
    expBottom: 2.05,
    noseRound: 0.1,
    tailRound: 0.03,
    mouth: { kind: 'beak', yn: -0.02, t: 0.028, groove: 0.9 },
    operculum: { t: 0.27, strength: 0.2 },
    cheek: 0.35,
  };
  const b = new BodySampler(body);

  // The "figure 8": two dark ocelli ringed in yellow, touching end to end on each upper flank. Dark centres first,
  // bright rings over them.
  const ring = (t: number, yn: number, rt: number, ryn: number, k = 1): Mark[] => [
    { t, yn, rt: rt * 0.85, ryn: ryn * 0.85, color: 'body2', strength: 0.9, soft: 0.25 },
    { t, yn, rt, ryn, color: 'accent', strength: Math.min(1, 0.95 * k), soft: 0.15, mode: 'ring' },
  ];
  const marks: Mark[] = [
    ...ring(0.44, 0.66, 0.062 * bold, 0.3 * bold),
    ...ring(0.58, 0.64, 0.058 * bold, 0.28 * bold),
    // pale cheek sheen below the eye, and a darker saddle over the snout
    { t: 0.19, yn: -0.2, rt: 0.07, ryn: 0.22, color: 'belly', strength: 0.22, soft: 0.8 },
  ];

  const clearFin = (o: Partial<Parameters<typeof fin>[0]> = {}) => fin({ opacity: 0.3, color: 'fin', pattern: 0, rayContrast: 0.5, irid: 0.2, ...o });
  return {
    key: 'figure_eight_puffer',
    body,
    fins: [
      caudal(b, { kind: 'truncate', len: 0.2, spread: 30, rays: 12, soft: 0.35, rootH: 0.95, cup: 0.01, style: clearFin({ opacity: 0.46, color: '#cfc47a', edgeStart: 0.72, pattern: 0.25, rayContrast: 0.55 }) }),
      dorsal(b, {
        t0: 0.72,
        t1: 0.85,
        len: 0.1,
        angle0: 66,
        angle1: 30,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.1)),
        rays: 9,
        soft: 0.3,
        inset: 0.08,
        style: clearFin({ opacity: 0.34, flutter: 0.45 }),
      }),
      anal(b, {
        t0: 0.72,
        t1: 0.85,
        len: 0.09,
        angle0: 62,
        angle1: 30,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 1.1)),
        rays: 9,
        soft: 0.3,
        inset: 0.08,
        style: clearFin({ opacity: 0.3, color: 'clear', flutter: 0.45, phase: 1.6 }),
      }),
      pectoral(b, {
        t: 0.31,
        yn0: 0.16,
        yn1: -0.22,
        len: 0.08,
        out: 40,
        a0: 30,
        a1: -30,
        profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * s),
        rays: 11,
        soft: 0.25,
        style: clearFin({ opacity: 0.26, flutter: 0.55, irid: 0.25 }),
      }),
    ],
    eye: eye({ t: 0.2, yn: 0.44, r: 0.056, protrude: 0.44, forward: 0.28, up: 0.28, pupil: 0.42, swivel: 1.25, iris: 'eye', ring: '#d6b24a', ringWidth: 0.1 }),
    motion: motion({
      wavelength: 1.2,
      amp: 0.035,
      idleAmp: 0.02,
      envPow: 4.2,
      headSway: 0,
      bendK: 0.35,
      pectoralHz: 7,
      idleFlutter: 0.9,
      finSoft: 0.4,
      finRest: 0.95,
      sag: 0,
      idleHz: 0.7,
      finLag: 0.6,
      rigid: true,
      breathe: 0.9,
    }),
    look: look({
      dorsalDark: 0.4,
      // crisp white belly: a tight transition on the lower flank
      bellyLine: -0.22,
      bellyAmount: 1,
      bellySoft: 0.1,
      // puffers have tiny prickles instead of scales: fine skin texture
      scales: { cols: 70, strength: 0.1, kind: 'skin' },
      roughness: 0.38,
      gloss: 0.7,
      iridMode: 'back',
      iridHue: 0.3,
      sss: 0.55,
      lateralLine: 0,
      pattern: 'reticulated',
      // dense yellow vermiculation: a small, domain-warped cell network (squiggly loops rather than straight
      // polygon edges) that stops cleanly at the white belly
      patA: [10, 0.07, 0, 0],
      patB: [0, 0.65, 1, 0],
      patternBellyFade: -0.12,
      marks,
      lipColor: 'belly',
    }),
    pickRadius: 0.55,
  };
}
