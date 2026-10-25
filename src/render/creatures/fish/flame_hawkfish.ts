/**
 * Flame hawkfish (Neocirrhites armatus, chunk 16) — a stout, deep-headed little hawkfish with a blunt snout and big
 * eyes set high; a spiny dorsal whose free spine tips carry small tufts (cirri), then a soft rear lobe; thick,
 * unbranched lower pectoral rays it props itself on; a truncate tail. Bright scarlet all over, a black ring round each
 * eye and a dark streak along the base of the dorsal fin.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, spinyDorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.76,
    dorsal: curve([[0, 0.05], [0.06, 0.09], [0.14, 0.13], [0.26, 0.152], [0.42, 0.15], [0.6, 0.122], [0.78, 0.082], [0.92, 0.056], [1, 0.052]]),
    ventral: curve([[0, 0.04], [0.08, 0.08], [0.2, 0.112], [0.34, 0.124], [0.5, 0.114], [0.68, 0.088], [0.84, 0.062], [0.95, 0.052], [1, 0.05]]),
    width: curve([[0, 0.03], [0.12, 0.056], [0.3, 0.066], [0.5, 0.056], [0.74, 0.038], [0.9, 0.026], [1, 0.022]]),
    axis: curve([[0, -0.006], [0.3, 0], [1, 0.004]]),
    expTop: 2.05,
    expBottom: 2.2,
    noseRound: 0.12,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.15, t: 0.05, groove: 0.85 },
    operculum: { t: 0.25, strength: 0.7 },
    cheek: 0.4,
  };
  const b = new BodySampler(body);
  const red = fin({ opacity: 0.94, edge: 'fin2', edgeStart: 0.8, edgeWidth: 0.15, edgeAmount: 0.5, pattern: 0, rayContrast: 0.45, irid: 0.05 });
  return {
    key: `flame_hawkfish|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'truncate', len: 0.19 * fl, spread: 32, rays: 15, soft: 0.3, rootH: 1.05, cup: 0.01, style: red }),
      // spiny dorsal: free spine tips (the tufted cirri show as the web recess), then the soft rear lobe
      spinyDorsal(b, {
        t0: 0.22,
        t1: 0.56,
        len: 0.1 * fl,
        angle0: 74,
        angle1: 60,
        profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s),
        rays: 10,
        soft: 0.25,
        style: fin({ opacity: 0.94, edge: 'fin2', edgeStart: 0.82, edgeWidth: 0.18, edgeAmount: 0.9, pattern: 0, rayContrast: 0.5, irid: 0.05 }),
      }),
      dorsal(b, { t0: 0.56, t1: 0.86, len: 0.13 * fl, angle0: 62, angle1: 26, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s)), rays: 12, soft: 0.3, style: red }),
      anal(b, { t0: 0.62, t1: 0.84, len: 0.11 * fl, angle0: 58, angle1: 26, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.15 + s)), rays: 8, soft: 0.3, style: red }),
      // big pectorals: thick lower rays to perch on
      pectoral(b, { t: 0.29, yn0: 0.0, yn1: -0.6, len: 0.14, out: 34, a0: 20, a1: -40, profile: (s) => 0.85 + 0.15 * Math.sin(Math.PI * s), rays: 14, soft: 0.2, style: fin({ opacity: 0.9, color: 'fin', pattern: 0, rayContrast: 0.75, flutter: 0.3, irid: 0.05 }) }),
      pelvic(b, { t: 0.34, yn0: -0.84, yn1: -0.92, tLen: 0.02, len: 0.09, out: 22, a0: -26, a1: -55, rays: 6, soft: 0.25, style: red }),
    ],
    eye: eye({ t: 0.14, yn: 0.38, r: 0.044, protrude: 0.44, forward: 0.26, up: 0.14, pupil: 0.5, iris: '#1a0a08', ring: '#0a0a0a', ringWidth: 0.2, socket: '#0a0a0a', swivel: 0.8 }),
    motion: motion({ wavelength: 1.05, amp: 0.05, idleAmp: 0.008, envPow: 2.6, headSway: 0.05, pectoralHz: 3, idleFlutter: 0.25, finSoft: 0.3, finRest: 0.9, sag: 0.02, idleHz: 0.5, finLag: 0.7, breathe: 0.8 }),
    look: look({
      dorsalDark: 0.25,
      bellyLine: -0.6,
      bellyAmount: 0.3,
      scales: { cols: 34, strength: 0.45, kind: 'ctenoid' },
      roughness: 0.4,
      gloss: 0.55,
      iridMode: 'scales',
      iridHue: 0.05,
      sss: 0.6,
      lateralLine: 0.15,
      lipColor: 'body2',
      marks: [
        // the dark streak along the base of the dorsal fin
        { t: 0.55, yn: 0.95, rt: 0.36, ryn: 0.12, color: 'accent', strength: 0.85, soft: 0.5, mode: 'band_y' },
        // a black ring round the eye
        { t: 0.14, yn: 0.38, rt: 0.06, ryn: 0.2, color: '#0a0a0a', strength: 0.9, soft: 0.25, mode: 'ring' },
      ],
    }),
    pickRadius: 0.55,
  };
};
