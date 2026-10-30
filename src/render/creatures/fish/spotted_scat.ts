/**
 * Spotted scat (Scatophagus argus, chunk 17) — a deep, flat, almost square body with a steep forehead and a small mouth;
 * a spiny front dorsal (venomous) and a soft rear dorsal and anal that make the body look squarer still, and a broad,
 * squared tail. Adults are silvery green with round dark spots on the upper flanks. Young are barred, with red-orange
 * patches on the head and back and reddish fins: the "ruby" scat of the shops.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, spinyDorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.74,
    // a steep forehead to a high back, deep and flat
    dorsal: curve([[0, 0.03], [0.06, 0.1], [0.16, 0.17], [0.3, 0.2], [0.5, 0.19], [0.7, 0.14], [0.86, 0.08], [1, 0.056]]),
    ventral: curve([[0, 0.03], [0.08, 0.09], [0.22, 0.16], [0.38, 0.18], [0.56, 0.16], [0.74, 0.11], [0.9, 0.062], [1, 0.052]]),
    width: curve([[0, 0.02], [0.12, 0.04], [0.32, 0.046], [0.6, 0.038], [0.86, 0.022], [1, 0.016]]),
    expTop: 2.2,
    expBottom: 2.2,
    noseRound: 0.06,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.05, t: 0.025, groove: 0.5 },
    operculum: { t: 0.22, strength: 0.5 },
    cheek: 0.25,
  };
  const b = new BodySampler(body);
  // young: red-orange patches over the head and along the back, over the bars
  const marks: Mark[] = young
    ? [
        { t: 0.12, yn: 0.4, rt: 0.08, ryn: 0.6, color: '#d0622c', strength: 0.8, soft: 0.5 },
        { t: 0.45, yn: 0.7, rt: 0.16, ryn: 0.3, color: '#d0622c', strength: 0.7, soft: 0.5 },
      ]
    : [];
  const recolor = young ? { pattern: 'bars' as const, bodyColor: '#e8e2b8', accentColor: '#2a2418', finColor: '#c8603a', patternContrast: 0.85 } : undefined;
  const softFin = fin({ opacity: 0.8, color: 'fin', edge: 'fin2', edgeStart: 0.75, edgeWidth: 0.2, edgeAmount: 0.4, pattern: 0.5, rayContrast: 0.4, irid: 0.1, rootBlend: 0.3 });
  return {
    key: `spotted_scat|${young ? 'y' : 'a'}`,
    body,
    fins: [
      caudal(b, { kind: 'truncate', len: 0.18, spread: 34, rays: 16, soft: 0.3, rootH: 1.05, cup: 0.01, style: softFin }),
      spinyDorsal(b, { t0: 0.24, t1: 0.5, len: 0.1, angle0: 70, angle1: 50, profile: (s) => 0.9 - 0.3 * s, rays: 11, soft: 0.2, style: { ...softFin, opacity: 0.85 } }),
      dorsal(b, { t0: 0.52, t1: 0.86, len: 0.12, angle0: 56, angle1: 26, profile: (s) => 0.6 + 0.4 * smoothstep(0, 0.3, s) * (1 - 0.4 * smoothstep(0.6, 1, s)), rays: 16, soft: 0.3, inset: 0.02, style: softFin }),
      anal(b, { t0: 0.56, t1: 0.86, len: 0.11, angle0: 54, angle1: 26, profile: (s) => 0.6 + 0.4 * smoothstep(0, 0.3, s) * (1 - 0.4 * smoothstep(0.6, 1, s)), rays: 15, soft: 0.3, inset: 0.02, style: softFin }),
      pectoral(b, { t: 0.26, yn0: -0.1, yn1: -0.38, len: 0.08, out: 30, a0: 20, a1: -24, rays: 12, soft: 0.3, style: fin({ opacity: 0.35, color: 'clear', pattern: 0, rayContrast: 0.25, flutter: 0.5, irid: 0.1 }) }),
      pelvic(b, { t: 0.32, yn0: -0.88, yn1: -0.94, tLen: 0.02, len: 0.07, out: 18, a0: -26, a1: -52, rays: 6, soft: 0.3, style: softFin }),
    ],
    eye: eye({ t: 0.12, yn: 0.3, r: 0.03, protrude: 0.32, forward: 0.2, up: 0.1, pupil: 0.48, iris: 'eye', socket: 'body', swivel: 0.3 }),
    motion: motion({ wavelength: 1.05, amp: 0.055, idleAmp: 0.012, envPow: 2.6, headSway: 0.04, bendK: 0.9, pectoralHz: 3.6, idleFlutter: 0.55, finSoft: 0.35, finRest: 0.85, sag: 0.02, idleHz: 0.8, finLag: 0.8, breathe: 0.5 }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.4,
      bellyAmount: 0.55,
      bellySoft: 0.45,
      scales: { cols: 60, strength: 0.15, kind: 'ctenoid' },
      roughness: 0.32,
      gloss: 0.6,
      iridMode: 'body',
      iridHue: 0.2,
      sss: 0.4,
      lateralLine: 0.15,
      // the spots stay on the upper flanks in adults
      patternBellyFade: -0.2,
      marks,
    }),
    pickRadius: 0.5,
    ...(recolor ? { recolor } : {}),
  };
};
