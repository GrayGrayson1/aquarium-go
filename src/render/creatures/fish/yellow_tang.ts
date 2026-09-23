/**
 * Yellow tang (Zebrasoma flavescens) — tall, strongly compressed disc body; concave forehead running into a long
 * protruding snout with a small terminal mouth; eye set high and far back; tall sail-like dorsal and anal fins;
 * slightly lunate tail; white scalpel spine on the caudal peduncle; lemon yellow with a pale arched lateral line.
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
    noseX: 0.43,
    length: 0.77,
    // concave forehead: slow rise over the snout, then a steep climb to the tall back
    dorsal: curve([[0, 0.016], [0.05, 0.026], [0.1, 0.05], [0.16, 0.1], [0.24, 0.155], [0.34, 0.19], [0.46, 0.2], [0.6, 0.175], [0.74, 0.115], [0.86, 0.058], [0.94, 0.036], [1, 0.034]]),
    ventral: curve([[0, 0.014], [0.05, 0.024], [0.1, 0.045], [0.18, 0.1], [0.28, 0.155], [0.4, 0.188], [0.52, 0.185], [0.64, 0.15], [0.76, 0.1], [0.88, 0.048], [0.95, 0.034], [1, 0.033]]),
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
  const yellow = fin({ opacity: 0.93, edgeStart: 0.82, edgeWidth: 0.16, edgeAmount: 0.5, pattern: 0, rayContrast: 0.45, irid: 0.05 });
  return {
    key: `yellow_tang|${fl}`,
    body,
    fins: [
      caudal(b, {
        kind: 'emarginate',
        len: 0.2 * fl,
        spread: 34,
        fork: 0.55,
        rays: 16,
        soft: 0.3,
        rootH: 1.1,
        cup: 0.01,
        style: { ...yellow, opacity: 0.9 },
      }),
      // tall sail dorsal: long base from the nape to the peduncle, highest in the middle
      dorsal(b, {
        t0: 0.2,
        t1: 0.9,
        len: 0.17 * fl,
        angle0: 72,
        angle1: 42,
        profile: (s) => (0.3 + 0.7 * smoothstep(0, 0.45, s)) * (1 - 0.55 * smoothstep(0.7, 1, s)),
        rays: 26,
        soft: 0.35,
        cup: 0.008,
        segS: 36,
        segR: 12,
        inset: 0.03,
        style: { ...yellow },
      }),
      anal(b, {
        t0: 0.42,
        t1: 0.9,
        len: 0.15 * fl,
        angle0: 68,
        angle1: 40,
        profile: (s) => (0.35 + 0.65 * smoothstep(0, 0.4, s)) * (1 - 0.55 * smoothstep(0.7, 1, s)),
        rays: 20,
        soft: 0.35,
        cup: 0.008,
        segS: 30,
        segR: 12,
        inset: 0.03,
        style: { ...yellow },
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
        style: fin({ opacity: 0.45, color: 'fin', pattern: 0, rayContrast: 0.5, flutter: 0.35, irid: 0.05 }),
      }),
      pelvic(b, {
        t: 0.33,
        yn0: -0.86,
        yn1: -0.93,
        tLen: 0.02,
        len: 0.08,
        out: 16,
        a0: -35,
        a1: -60,
        rays: 5,
        soft: 0.25,
        style: fin({ opacity: 0.85, pattern: 0, rayContrast: 0.4, irid: 0.05 }),
      }),
    ],
    extras: [
      // white scalpel spine lying along the peduncle, pointing forward
      { kind: 'spine', path: [[b.x(0.92), b.axis(0.92) + 0.004, b.width(0.92) + 0.002], [b.x(0.89), b.axis(0.89) + 0.005, b.width(0.89) + 0.004], [b.x(0.86), b.axis(0.86) + 0.004, b.width(0.86) + 0.003]], radius: 0.0055, taper: 0.2, mirror: true, t: 0.89 },
    ],
    eye: eye({ t: 0.215, yn: 0.42, r: 0.032, protrude: 0.36, forward: 0.2, up: 0.12, pupil: 0.5, iris: '#1c1a14', ring: '#8a7a2a', ringWidth: 0.07 }),
    motion: motion({
      wavelength: 1.2,
      amp: 0.045,
      idleAmp: 0.012,
      envPow: 2.8,
      headSway: 0.04,
      bendK: 0.6,
      pectoralHz: 2.6,
      idleFlutter: 0.55,
      finSoft: 0.45,
      finRest: 0.85,
      sag: 0.05,
      idleHz: 0.6,
      finLag: 0.8,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.12,
      bellyLine: -0.6,
      bellyAmount: 0.35,
      bellySoft: 0.4,
      scales: { cols: 64, strength: 0.1, kind: 'fine' },
      roughness: 0.36,
      gloss: 0.5,
      iridMode: 'body',
      iridHue: 0.12,
      sss: 0.85,
      lateralLine: 0,
      appendageColor: 'white',
      lipColor: 'body2',
      marks: [
        // pale, arching lateral line high on the flank
        { t: 0.55, yn: 0.5, rt: 0.3, ryn: 0.02, color: 'accent', strength: 0.2, soft: 0.8, mode: 'stripe', rot: 0.3 },
        // pale peduncle patch around the scalpel spine
        { t: 0.89, yn: 0.02, rt: 0.035, ryn: 0.25, color: 'white', strength: 0.55, soft: 0.5 },
      ],
    }),
    pickRadius: 0.55,
  };
};
