/**
 * Oscar (Astronotus ocellatus, chunk 17) — a big, deep oval cichlid with a large head, thick lips and a big eye; a long
 * spiny-then-soft dorsal and anal set well back, broad rounded tail, and the black eyespot ringed in orange at the base
 * of the tail (the "ocellus" of its name). The appearance draws the form: dark mottling (wild), orange-red marbling
 * (tiger, red), the albino's and lutino's pale grounds. Young are banded: dark with wavy pale bars and a speckled head,
 * fading to the adult blotching. Long-fin oscars (finType 'longfin') carry longer, flowing median fins.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const longfin = a.finType === 'longfin';
  const fl = bucket(finScale(args, 1) * (longfin ? 1.35 : 1), 0.1);
  const young = isJuvenile(args);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.76,
    // big head with a steep forehead, deepest over the pectorals, a thick peduncle
    dorsal: curve([[0, 0.03], [0.06, 0.074], [0.14, 0.122], [0.26, 0.156], [0.42, 0.162], [0.58, 0.146], [0.74, 0.108], [0.88, 0.072], [1, 0.06]]),
    ventral: curve([[0, 0.034], [0.07, 0.078], [0.18, 0.126], [0.34, 0.15], [0.5, 0.142], [0.66, 0.114], [0.82, 0.08], [1, 0.058]]),
    width: curve([[0, 0.03], [0.1, 0.056], [0.26, 0.072], [0.46, 0.068], [0.66, 0.052], [0.86, 0.034], [1, 0.026]]),
    axis: curve([[0, -0.006], [0.2, 0], [1, 0.004]]),
    expTop: 2.05,
    expBottom: 2.1,
    noseRound: 0.08,
    tailRound: 0.03,
    // thick-lipped terminal mouth: a suction feeder
    mouth: { kind: 'terminal', yn: -0.08, t: 0.05, groove: 1 },
    operculum: { t: 0.27, strength: 0.75 },
    cheek: 0.55,
  };
  const b = new BodySampler(body);
  const darkFin = fin({ opacity: 0.92, color: 'fin', edge: 'fin2', edgeStart: 0.8, edgeWidth: 0.16, edgeAmount: 0.5, pattern: 0.6, rayContrast: 0.35, irid: 0.05, rootBlend: 0.2 });
  // the ocellus: a black spot ringed with the accent colour on the upper tail base (marks first, ring over the spot)
  const marks: Mark[] = [
    { t: 0.95, yn: 0.35, rt: 0.045, ryn: 0.48, color: '#0d0c0b', strength: 0.95, soft: 0.2 },
    { t: 0.95, yn: 0.35, rt: 0.058, ryn: 0.62, color: 'accent', strength: 0.95, soft: 0.15, mode: 'ring' },
  ];
  // young: wavy pale bars over a dark body and a speckled head, in each form's own colours
  const recolor = young && a.pattern !== 'solid' ? { pattern: 'bars' as const, patternContrast: 0.85, patternScale: 1.2 } : undefined;
  return {
    key: `oscar|${longfin ? 'lf' : 'sf'}|${fl}|${young ? 'y' : 'a'}`,
    body,
    fins: [
      caudal(b, { kind: longfin ? 'fan' : 'rounded', len: (longfin ? 0.26 : 0.19) * fl, spread: 34, rays: 16, soft: longfin ? 0.75 : 0.3, rootH: 1.05, cup: 0.01, droop: longfin ? 0.02 : 0, style: darkFin }),
      dorsal(b, {
        t0: 0.24,
        t1: 0.92,
        len: 0.1 * fl,
        angle0: 66,
        angle1: longfin ? 18 : 26,
        // short spines in front, a longer rounded soft lobe at the back
        profile: (s) => (0.5 + 0.2 * smoothstep(0, 0.25, s) + 0.45 * smoothstep(0.55, 0.85, s)) * (1 - 0.25 * smoothstep(0.9, 1, s)),
        rays: 22,
        web: 0.1,
        soft: longfin ? 0.75 : 0.3,
        cup: 0.006,
        segS: 36,
        segR: 12,
        inset: 0.03,
        style: darkFin,
      }),
      anal(b, {
        t0: 0.6,
        t1: 0.92,
        len: 0.11 * fl,
        angle0: 58,
        angle1: longfin ? 18 : 26,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.2 + s * 0.85)),
        rays: 13,
        soft: longfin ? 0.75 : 0.3,
        inset: 0.03,
        style: darkFin,
      }),
      pectoral(b, { t: 0.3, yn0: -0.05, yn1: -0.45, len: 0.12, out: 26, a0: 22, a1: -28, profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s), rays: 14, soft: 0.3, style: fin({ opacity: 0.35, color: 'clear', pattern: 0, rayContrast: 0.3, flutter: 0.45, irid: 0.05 }) }),
      pelvic(b, { t: 0.33, yn0: -0.86, yn1: -0.94, tLen: 0.025, len: 0.11 * fl, out: 16, a0: -26, a1: -55, rays: 6, soft: 0.3, style: darkFin }),
    ],
    eye: eye({ t: 0.14, yn: 0.34, r: 0.036, protrude: 0.32, forward: 0.2, up: 0.12, pupil: 0.42, iris: 'eye', ring: '#3a1a10', ringWidth: 0.18, swivel: 0.45 }),
    motion: motion({ wavelength: 1.05, amp: 0.055, idleAmp: 0.012, envPow: 2.5, headSway: 0.05, bendK: 0.85, pectoralHz: 2.6, idleFlutter: 0.5, finSoft: longfin ? 0.85 : 0.4, finRest: 0.82, sag: longfin ? 0.1 : 0.04, idleHz: 0.55, finLag: 0.85, breathe: 0.8 }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.6,
      bellyAmount: 0.3,
      bellySoft: 0.45,
      scales: { cols: 34, strength: 0.3, kind: 'ctenoid' },
      roughness: 0.4,
      gloss: 0.5,
      iridMode: 'scales',
      iridHue: 0.1,
      sss: 0.45,
      lateralLine: 0.15,
      patternEdge: 'body2',
      patternBellyFade: -0.75,
      lipColor: 'body2',
      marks,
    }),
    pickRadius: 0.55,
    ...(recolor ? { recolor } : {}),
  };
};
