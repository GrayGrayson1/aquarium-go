/**
 * White Cloud Mountain minnow (Tanichthys albonubes) — slender cyprinid with a glowing gold-white iridescent lateral
 * stripe over a thin dark line, olive-bronze back, red peduncle spot and bright red fins with pale cream edges.
 * Long-fin "meteor" form grows flowing dorsal/anal/tail. OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const longFin = a.finType === 'minnow_longfin';
  const fl = bucket(finScale(args, 1), 0.05);
  const female = isFemale(args);
  const fk = female ? 1.06 : 1;
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.79,
    dorsal: curve([[0, 0.024], [0.1, 0.044], [0.3, 0.064], [0.46, 0.068], [0.64, 0.056], [0.82, 0.04], [0.94, 0.032], [1, 0.03]]),
    ventral: curve([[0, 0.022], [0.12, 0.046], [0.32, 0.064 * fk], [0.48, 0.066 * fk], [0.66, 0.052], [0.84, 0.036], [0.95, 0.03], [1, 0.029]]),
    width: curve([[0, 0.016], [0.12, 0.028], [0.32, 0.034], [0.56, 0.028], [0.82, 0.016], [1, 0.011]]),
    axis: curve([[0, 0.0], [0.4, 0], [1, 0.002]]),
    expTop: 2.05,
    expBottom: 2.1,
    noseRound: 0.08,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.22, t: 0.042, groove: 0.6 },
    operculum: { t: 0.2, strength: 0.75 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const soft = longFin ? 1.05 : 0.5;
  const redFin = (o: number) => fin({ opacity: o, color: 'fin', edge: 'fin2', edgeStart: 0.62, edgeWidth: 0.25, edgeAmount: 0.9, pattern: 0, rayContrast: 0.6, irid: 0.25, rootBlend: 0.1 });
  const fins = [
    caudal(b, {
      kind: longFin ? 'fan' : 'forked',
      len: (longFin ? 0.28 : 0.2) * fl,
      spread: longFin ? 30 : 28,
      fork: 0.4,
      rays: 18,
      soft,
      rootH: 0.95,
      cup: 0.01,
      segS: longFin ? 36 : 26,
      segR: longFin ? 16 : 12,
      // clear-ish tail with a red centre and pale tips
      style: fin({ opacity: 0.45, color: 'fin', edge: 'fin2', edgeStart: 0.55, edgeWidth: 0.35, edgeAmount: 0.75, pattern: 0, rayContrast: 0.65, irid: 0.25, rootBlend: 0.12 }),
    }),
    dorsal(b, {
      t0: 0.46,
      t1: 0.6,
      len: (longFin ? 0.18 : 0.11) * fl,
      angle0: 62,
      angle1: longFin ? 16 : 30,
      profile: longFin ? (s) => 0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, s * 0.9)) : (s) => 0.95 - 0.35 * s,
      rays: 9,
      soft,
      droop: longFin ? 0.01 : 0,
      style: redFin(0.72),
    }),
    anal(b, {
      t0: 0.56,
      t1: 0.72,
      len: (longFin ? 0.15 : 0.09) * fl,
      angle0: 58,
      angle1: longFin ? 18 : 28,
      profile: longFin ? (s) => 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, s * 0.9)) : (s) => 0.95 - 0.35 * s,
      rays: 10,
      soft,
      style: redFin(0.7),
    }),
    pectoral(b, {
      t: 0.24,
      yn0: -0.3,
      yn1: -0.62,
      len: 0.065,
      out: 28,
      a0: 12,
      a1: -30,
      rays: 9,
      soft: 0.3,
      style: fin({ opacity: 0.14, color: 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.25, irid: 0.1 }),
    }),
    pelvic(b, {
      t: 0.44,
      yn0: -0.86,
      yn1: -0.93,
      tLen: 0.02,
      len: 0.055 * Math.min(1.3, fl),
      out: 16,
      a0: -26,
      a1: -52,
      rays: 5,
      soft: 0.35,
      style: redFin(0.5),
    }),
  ];
  return {
    key: `white_cloud|${longFin ? 'L' : 's'}|${female ? 'f' : 'm'}|${fl}`,
    body,
    fins,
    eye: eye({ t: 0.115, yn: 0.2, r: 0.03, protrude: 0.36, forward: 0.2, up: 0.08, pupil: 0.5, iris: '#1c1a16', ring: '#c9b27a', ringWidth: 0.1 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.075,
      idleAmp: 0.02,
      envPow: 2.2,
      headSway: 0.07,
      pectoralHz: 6,
      idleFlutter: 0.35,
      finSoft: longFin ? 1.0 : 0.55,
      finRest: 0.86,
      sag: longFin ? 0.3 : 0.05,
      idleHz: 1.3,
      finLag: longFin ? 1.3 : 0.8,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.45,
      bellyLine: -0.45,
      bellyAmount: 0.9,
      bellySoft: 0.28,
      scales: { cols: 32, strength: 0.45, kind: 'cycloid' },
      roughness: 0.32,
      gloss: 0.55,
      iridMode: 'stripe',
      iridHue: 0.12,
      sss: 0.55,
      lateralLine: 0,
      pattern: 'lateral_stripe',
      stripe: { yn0: 0.2, yn1: 0.04, w: 0.09, t0: 0.17, t1: 0.95, redT0: 2 },
      patternBellyFade: -2,
      marks: [
        // thin dark line under the gold stripe, darker band above the belly, red spot at the tail base
        { t: 0.58, yn: -0.02, rt: 0.38, ryn: 0.055, color: '#2a2a1c', strength: 0.55, soft: 0.5, mode: 'band_t', rot: 0.2 },
        { t: 0.97, yn: 0, rt: 0.035, ryn: 0.45, color: 'fin', strength: 0.75, soft: 0.6, onFins: 0.6 },
        { t: 0.16, yn: -0.25, rt: 0.08, ryn: 0.4, color: 'belly', strength: 0.3, soft: 0.7 },
      ],
    }),
    pickRadius: 0.55,
  };
};
