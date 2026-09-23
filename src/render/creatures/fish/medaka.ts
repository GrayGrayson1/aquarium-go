/**
 * Medaka / Japanese rice fish (Oryzias latipes) — a surface skimmer with a dead-straight back, flattened head,
 * strongly upturned mouth, big eyes set high, a small dorsal fin far back and a long-based anal fin; square-ish tail.
 * Forms: hire-naga (long, frilled fins), dharma (short, compressed, round body), miyuki (metallic line along the
 * back, via the lateral_stripe pattern), lamé (glitter scales). Colour lines read from appearance.
 * OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve, type Curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale, type PlanFn } from './common';

/** Build symmetric radii + axis from top and bottom outlines (flat-backed fish). */
function outlines(top: Curve, bottom: Curve) {
  return {
    axis: (t: number) => (top(t) + bottom(t)) / 2,
    half: (t: number) => Math.max(0.004, (top(t) - bottom(t)) / 2),
  };
}

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const ft = a.finType;
  const longFin = ft === 'medaka_longfin';
  const dharma = ft === 'medaka_dharma';
  const female = isFemale(args);
  const fl = bucket(finScale(args, 1), 0.05);

  // dharma: shortened spine → short, rounded, deeper-looking body
  const L = dharma ? 0.62 : 0.79;
  const noseX = dharma ? 0.38 : 0.43;
  const top = dharma
    ? curve([[0, 0.012], [0.06, 0.036], [0.18, 0.06], [0.36, 0.07], [0.6, 0.066], [0.82, 0.05], [1, 0.038]])
    : curve([[0, 0.014], [0.05, 0.036], [0.14, 0.058], [0.28, 0.068], [0.55, 0.07], [0.78, 0.062], [0.92, 0.05], [1, 0.044]]);
  const bot = dharma
    ? curve([[0, -0.004], [0.08, -0.034], [0.24, -0.066], [0.44, -0.078], [0.64, -0.066], [0.84, -0.044], [1, -0.034]])
    : curve([[0, -0.004], [0.06, -0.032], [0.2, -0.066], [0.4, -0.082 * (female ? 1.12 : 1)], [0.56, -0.076], [0.76, -0.054], [0.92, -0.041], [1, -0.037]]);
  const o = outlines(top, bot);
  const body: FishPlan['body'] = {
    noseX,
    length: L,
    dorsal: o.half,
    ventral: o.half,
    axis: o.axis,
    width: dharma
      ? curve([[0, 0.016], [0.12, 0.032], [0.34, 0.038], [0.6, 0.03], [0.85, 0.018], [1, 0.013]])
      : curve([[0, 0.017], [0.1, 0.03], [0.3, 0.037], [0.55, 0.031], [0.8, 0.019], [1, 0.013]]),
    expTop: 2.3, // flat-ish back
    expBottom: 2.05,
    noseRound: 0.06,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.62, t: 0.05, groove: 0.7 },
    operculum: { t: 0.2, strength: 0.7 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const soft = longFin ? 1.1 : 0.45;
  const frill = longFin ? 0.12 : 0;
  const finStyle = (op: number) => fin({ opacity: op, edgeStart: 0.6, edgeWidth: 0.35, pattern: 0.35, rayContrast: 0.65, irid: 0.3 });
  const fins = [
    caudal(b, {
      kind: longFin ? 'fan' : 'truncate',
      len: (longFin ? 0.27 : 0.19) * fl,
      spread: longFin ? 30 : 24,
      rays: 16,
      web: frill,
      soft,
      rootH: 0.98,
      cup: 0.01,
      segS: longFin ? 34 : 24,
      segR: longFin ? 16 : 12,
      style: finStyle(0.45),
    }),
    // small dorsal set far back (male dorsal has a notch at the rear)
    dorsal(b, {
      t0: dharma ? 0.66 : 0.72,
      t1: dharma ? 0.78 : 0.82,
      len: (longFin ? 0.16 : 0.08) * fl,
      angle0: 60,
      angle1: longFin ? 18 : 32,
      profile: (s) => (female ? 0.9 - 0.3 * s : 0.85 - 0.1 * s),
      rays: 6,
      web: frill,
      soft,
      style: finStyle(0.4),
    }),
    // long-based anal fin — the medaka's signature; males' is larger and squarer
    anal(b, {
      t0: 0.48,
      t1: dharma ? 0.86 : 0.88,
      len: (longFin ? 0.13 : female ? 0.065 : 0.078) * fl,
      angle0: 52,
      angle1: longFin ? 16 : 26,
      profile: (s) => (female ? 1 - 0.35 * s : 0.85 + 0.15 * Math.sin(Math.PI * s)),
      rays: 18,
      web: frill,
      soft,
      segS: 26,
      style: finStyle(0.42),
    }),
    // pectorals sit high on the flank
    pectoral(b, {
      t: 0.23,
      yn0: 0.2,
      yn1: -0.18,
      len: 0.07,
      out: 30,
      a0: 18,
      a1: -24,
      rays: 9,
      soft: 0.3,
      style: fin({ opacity: 0.16, color: 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.3, irid: 0.1 }),
    }),
    pelvic(b, {
      t: 0.42,
      yn0: -0.86,
      yn1: -0.93,
      tLen: 0.02,
      len: 0.05 * Math.min(1.4, fl),
      out: 16,
      a0: -26,
      a1: -52,
      rays: 5,
      soft: 0.35,
      style: finStyle(0.3),
    }),
  ];
  const miyuki = a.pattern === 'lateral_stripe';
  return {
    key: `medaka|${dharma ? 'd' : longFin ? 'L' : 's'}|${female ? 'f' : 'm'}|${fl}`,
    body,
    fins,
    eye: eye({ t: 0.12, yn: 0.34, r: 0.037, protrude: 0.4, forward: 0.12, up: 0.32, pupil: 0.46, iris: '#1a1a1c', ring: '#c6d4dc', ringWidth: 0.16 }),
    motion: motion({
      wavelength: dharma ? 1.3 : 1.0,
      amp: dharma ? 0.05 : 0.07,
      idleAmp: 0.018,
      envPow: dharma ? 2.8 : 2.2,
      headSway: 0.06,
      pectoralHz: 5,
      idleFlutter: 0.45,
      finSoft: longFin ? 1.05 : 0.5,
      finRest: 0.88,
      sag: longFin ? 0.3 : 0.05,
      idleHz: 1.1,
      finLag: longFin ? 1.3 : 0.8,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.4,
      bellyAmount: 0.75,
      bellySoft: 0.35,
      scales: { cols: 30, strength: 0.42, kind: 'cycloid' },
      roughness: 0.34,
      gloss: 0.5,
      iridMode: miyuki ? 'stripe' : 'scales',
      iridHue: 0.58,
      sss: 0.7,
      lateralLine: 0.2,
      // miyuki: shining line along the back
      stripe: { yn0: 0.9, yn1: 0.86, w: 0.14, t0: 0.08, t1: 0.96, redT0: 2 },
      patternBellyFade: -0.6,
      patA: [0, 0, 0, 1],
      marks: [
        // translucent silvery gill cover, faint dark lateral line on the rear half
        { t: 0.14, yn: -0.1, rt: 0.07, ryn: 0.45, color: 'belly', strength: 0.3, soft: 0.7 },
        { t: 0.7, yn: 0.05, rt: 0.28, ryn: 0.05, color: 'body2', strength: 0.35, soft: 0.6, mode: 'band_t' },
      ],
    }),
    pickRadius: 0.55,
  };
};
