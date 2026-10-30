/**
 * Silver mono (Monodactylus argenteus, chunk 17) — a tall, flat silver diamond: a small head with a big eye, long
 * swept-back dorsal and anal lobes tipped black, a forked tail and tiny pelvic fins (its name means "one finger").
 * Young are yellow-finned with two bold black bars on the head, one through the eye and one behind the gill cover; in
 * adults the yellow fades to the fin edges and the bars all but vanish.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const fl = bucket(finScale(args, 1.3), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.72,
    // a diamond: the back and belly rise steeply to a high point a third of the way along
    dorsal: curve([[0, 0.03], [0.08, 0.1], [0.2, 0.18], [0.34, 0.22], [0.5, 0.19], [0.7, 0.12], [0.86, 0.062], [1, 0.044]]),
    ventral: curve([[0, 0.03], [0.08, 0.1], [0.22, 0.18], [0.36, 0.21], [0.52, 0.18], [0.72, 0.11], [0.88, 0.058], [1, 0.042]]),
    width: curve([[0, 0.02], [0.14, 0.036], [0.34, 0.04], [0.6, 0.032], [0.86, 0.018], [1, 0.014]]),
    expTop: 2.3,
    expBottom: 2.3,
    noseRound: 0.06,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: 0.05, t: 0.03, groove: 0.6 },
    operculum: { t: 0.24, strength: 0.55 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const k = young ? 1 : 0.18;
  const marks: Mark[] = [
    { t: 0.13, yn: 0.05, rt: 0.025, ryn: 1.1, color: 'accent', strength: 0.95 * k, soft: 0.25, mode: 'band_t' },
    { t: 0.28, yn: 0.05, rt: 0.03, ryn: 1.1, color: 'accent', strength: 0.95 * k, soft: 0.25, mode: 'band_t' },
  ];
  const lobe = fin({ opacity: 0.9, color: young ? 'fin' : 'body', edge: 'fin2', edgeStart: 0.78, edgeWidth: 0.2, edgeAmount: 1, pattern: 0.1, rayContrast: 0.3, irid: 0.3, rootBlend: young ? 0.1 : 0.6 });
  return {
    key: `silver_mono|${young ? 'y' : 'a'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'forked', len: 0.18 * fl, spread: 30, fork: 0.4, rays: 16, soft: 0.3, rootH: 1, cup: 0.01, style: fin({ opacity: 0.55, color: 'fin', pattern: 0, rayContrast: 0.35, irid: 0.2 }) }),
      dorsal(b, { t0: 0.3, t1: 0.66, len: 0.17 * fl, angle0: 58, angle1: 28, profile: (s) => (s < 0.22 ? 0.6 + 1.8 * s : 1 - 0.7 * (s - 0.22)), rays: 24, soft: 0.3, inset: 0.02, style: lobe }),
      anal(b, { t0: 0.34, t1: 0.68, len: 0.16 * fl, angle0: 56, angle1: 28, profile: (s) => (s < 0.22 ? 0.6 + 1.8 * s : 1 - 0.7 * (s - 0.22)), rays: 24, soft: 0.3, inset: 0.02, style: lobe }),
      pectoral(b, { t: 0.27, yn0: -0.15, yn1: -0.4, len: 0.08, out: 30, a0: 20, a1: -24, rays: 12, soft: 0.3, style: fin({ opacity: 0.35, color: 'clear', pattern: 0, rayContrast: 0.25, flutter: 0.5, irid: 0.1 }) }),
      // the tiny pelvic stubs
      pelvic(b, { t: 0.3, yn0: -0.9, yn1: -0.95, tLen: 0.01, len: 0.02, out: 16, a0: -26, a1: -50, rays: 4, soft: 0.2, style: fin({ opacity: 0.6, color: 'fin', pattern: 0, rayContrast: 0.2 }) }),
    ],
    eye: eye({ t: 0.12, yn: 0.25, r: 0.034, protrude: 0.34, forward: 0.2, up: 0.1, pupil: 0.5, iris: 'eye', ring: '#c8ccd0', ringWidth: 0.25, socket: 'body', swivel: 0.3 }),
    motion: motion({ wavelength: 1.05, amp: 0.06, idleAmp: 0.012, envPow: 2.6, headSway: 0.04, bendK: 0.9, pectoralHz: 4.2, idleFlutter: 0.55, finSoft: 0.35, finRest: 0.85, sag: 0.02, idleHz: 0.9, finLag: 0.8, breathe: 0.5 }),
    look: look({
      dorsalDark: 0.12,
      bellyLine: -0.45,
      bellyAmount: 0.4,
      bellySoft: 0.5,
      scales: { cols: 44, strength: 0.25, kind: 'cycloid' },
      roughness: 0.2,
      gloss: 0.85,
      iridMode: 'body',
      iridHue: 0.5,
      sss: 0.35,
      lateralLine: 0.1,
      marks,
    }),
    pickRadius: 0.5,
  };
};
