/**
 * Sailfin tang (Zebrasoma velifer, chunk 16) — a Zebrasoma disc with a protruding snout and enormous dorsal and anal
 * fins that rise into a sail (fins up, as tall as it is long). Broad grey-brown bars alternate with narrow pale bars;
 * a dark bar through the eye; yellow-brown snout and chin; a blue patch around the tail spine; a yellow tail with a
 * white rear edge; the tall fins banded with pale blue-green edges. Young: bright yellow with narrow dark bars and
 * proportionally even taller fins.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import type { CreatureVisualParams } from '@/types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const fl = bucket(finScale(args, 1), 0.1);
  // young fish carry proportionally taller sails (the juvenile proportions shorten fins by 0.78: undo and add)
  const sail = young ? 1.45 : 1;
  const recolor: Partial<CreatureVisualParams> | undefined = young
    ? { bodyColor: '#ffd23a', bodyColor2: '#f2bf22', bellyColor: '#ffe27a', finColor: '#ffd23a', finColor2: '#f8e8a0', accentColor: '#2b2b2b', patternContrast: 0.95 }
    : undefined;
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.77,
    dorsal: curve([[0, 0.016], [0.05, 0.028], [0.1, 0.055], [0.16, 0.105], [0.24, 0.158], [0.34, 0.19], [0.46, 0.198], [0.6, 0.172], [0.74, 0.115], [0.86, 0.058], [0.94, 0.036], [1, 0.034]]),
    ventral: curve([[0, 0.014], [0.05, 0.025], [0.1, 0.048], [0.18, 0.104], [0.28, 0.158], [0.4, 0.188], [0.52, 0.184], [0.64, 0.148], [0.76, 0.1], [0.88, 0.048], [0.95, 0.034], [1, 0.033]]),
    width: curve([[0, 0.012], [0.08, 0.022], [0.2, 0.038], [0.36, 0.048], [0.52, 0.044], [0.7, 0.032], [0.86, 0.018], [1, 0.013]]),
    axis: curve([[0, -0.012], [0.12, -0.004], [0.3, 0], [1, 0.002]]),
    expTop: 1.85,
    expBottom: 1.85,
    noseRound: 0.035,
    tailRound: 0.025,
    mouth: { kind: 'tube', yn: 0.05, t: 0.03, groove: 0.6 },
    operculum: { t: 0.25, strength: 0.55 },
    cheek: 0.15,
    keel: 0.4,
  };
  const b = new BodySampler(body);
  const sailFin = fin({ opacity: 0.93, color: 'fin', edge: 'fin2', edgeStart: 0.84, edgeWidth: 0.12, edgeAmount: 0.8, pattern: 0.85, rayContrast: 0.5, irid: 0.08 });
  return {
    key: `sailfin_tang|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'truncate', len: 0.18 * fl, spread: 34, rays: 16, soft: 0.3, rootH: 1.1, cup: 0.01, style: fin({ opacity: 0.92, color: young ? 'fin' : '#e8c23a', edge: '#f1eee4', edgeStart: 0.88, edgeWidth: 0.1, edgeAmount: young ? 0.2 : 0.8, pattern: young ? 0.5 : 0, rayContrast: 0.45, irid: 0.05 }) }),
      // the sail: a long base from the nape to the peduncle, rising steeply to a huge rounded crest
      dorsal(b, {
        t0: 0.18,
        t1: 0.9,
        len: 0.31 * fl * sail,
        angle0: 82,
        angle1: 48,
        profile: (s) => (0.3 + 0.7 * smoothstep(0, 0.4, s)) * (1 - 0.6 * smoothstep(0.62, 1, s)),
        rays: 34,
        soft: 0.4,
        cup: 0.01,
        segS: 44,
        segR: 16,
        inset: 0.03,
        style: sailFin,
      }),
      anal(b, {
        t0: 0.4,
        t1: 0.9,
        len: 0.27 * fl * sail,
        angle0: 76,
        angle1: 44,
        profile: (s) => (0.35 + 0.65 * smoothstep(0, 0.4, s)) * (1 - 0.6 * smoothstep(0.62, 1, s)),
        rays: 26,
        soft: 0.4,
        cup: 0.01,
        segS: 36,
        segR: 14,
        inset: 0.03,
        style: sailFin,
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.05,
        yn1: -0.35,
        len: 0.12,
        out: 26,
        a0: 22,
        a1: -20,
        profile: (s) => 1 - 0.55 * s,
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.45, color: young ? 'fin' : '#c9a24a', pattern: 0, rayContrast: 0.5, flutter: 0.35, irid: 0.05 }),
      }),
      pelvic(b, { t: 0.33, yn0: -0.86, yn1: -0.93, tLen: 0.02, len: 0.085, out: 16, a0: -35, a1: -60, rays: 5, soft: 0.25, style: fin({ opacity: 0.85, pattern: 0.3, rayContrast: 0.4, irid: 0.05 }) }),
    ],
    extras: [
      { kind: 'spine', path: [[b.x(0.92), b.axis(0.92) + 0.004, b.width(0.92) + 0.002], [b.x(0.89), b.axis(0.89) + 0.005, b.width(0.89) + 0.004], [b.x(0.86), b.axis(0.86) + 0.004, b.width(0.86) + 0.003]], radius: 0.005, taper: 0.2, mirror: true, t: 0.89, color: '#7fb2e5' },
    ],
    eye: eye({ t: 0.215, yn: 0.42, r: 0.032, protrude: 0.36, forward: 0.2, up: 0.12, pupil: 0.5, iris: '#1c1a14', ring: '#5a4a2a', ringWidth: 0.07 }),
    motion: motion({
      wavelength: 1.2,
      amp: 0.045,
      idleAmp: 0.012,
      envPow: 2.8,
      headSway: 0.04,
      bendK: 0.6,
      pectoralHz: 2.6,
      idleFlutter: 0.55,
      finSoft: 0.5,
      finRest: 0.8,
      sag: 0.06,
      idleHz: 0.6,
      finLag: 0.8,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.12,
      bellyLine: -0.6,
      bellyAmount: 0.3,
      bellySoft: 0.4,
      scales: { cols: 64, strength: 0.1, kind: 'fine' },
      roughness: 0.4,
      gloss: 0.5,
      iridMode: 'body',
      iridHue: 0.12,
      sss: 0.65,
      lateralLine: 0,
      appendageColor: 'white',
      lipColor: 'body2',
      // pale bars between broad dark ones (young: narrow dark bars on yellow)
      patA: [0, 0.12, 0.08, 0.1],
      marks: [
        // yellow-brown snout and chin with small white spots (adults), the dark bar through the eye
        ...(young ? [] : [{ t: 0.05, yn: 0, rt: 0.07, ryn: 1.3, color: '#c9a24a' as const, strength: 0.85, soft: 0.5 }]),
        { t: 0.215, yn: 0.1, rt: 0.022, ryn: 1.35, color: young ? 'accent' : '#3a3a3a', strength: 0.95, soft: 0.35 },
        // the blue patch round the tail spine
        { t: 0.89, yn: 0.02, rt: 0.04, ryn: 0.3, color: young ? 'body' : '#1e3e8c', strength: 0.85, soft: 0.5 },
      ],
    }),
    pickRadius: 0.6,
    recolor,
  };
};
