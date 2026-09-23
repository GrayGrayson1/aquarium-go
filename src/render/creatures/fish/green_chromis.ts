/**
 * Green chromis (Chromis viridis) — slim-oval damselfish planktivore; iridescent apple-green to blue that flashes as
 * the school turns, large eyes, long continuous dorsal fin, translucent green fins and a deeply forked tail.
 * OWNER: lane "fishart".
 */
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.73,
    dorsal: curve([[0, 0.042], [0.08, 0.08], [0.24, 0.124], [0.42, 0.132], [0.6, 0.108], [0.78, 0.068], [0.93, 0.044], [1, 0.04]]),
    ventral: curve([[0, 0.038], [0.1, 0.076], [0.3, 0.114], [0.46, 0.114], [0.64, 0.086], [0.82, 0.054], [0.95, 0.04], [1, 0.038]]),
    width: curve([[0, 0.026], [0.12, 0.045], [0.35, 0.05], [0.6, 0.037], [0.85, 0.02], [1, 0.016]]),
    axis: curve([[0, 0.004], [0.3, 0], [1, 0.003]]),
    expTop: 2.0,
    expBottom: 2.1,
    noseRound: 0.085,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: 0.02, t: 0.05, groove: 0.8 },
    operculum: { t: 0.23, strength: 0.65 },
    cheek: 0.25,
    keel: 0.15,
  };
  const b = new BodySampler(body);
  const glassy = (o: Partial<Parameters<typeof fin>[0]> = {}) =>
    fin({ opacity: 0.5, color: 'fin', edge: 'fin2', edgeStart: 0.7, edgeWidth: 0.3, edgeAmount: 0.6, pattern: 0.3, rayContrast: 0.5, irid: 0.7, ...o });
  return {
    key: `green_chromis|${fl}`,
    body,
    fins: [
      // deeply forked tail
      caudal(b, { kind: 'forked', len: 0.27 * fl, spread: 36, fork: 0.66, rays: 18, soft: 0.45, rootH: 1, style: glassy({ opacity: 0.55 }) }),
      dorsal(b, {
        t0: 0.27,
        t1: 0.82,
        len: 0.1 * fl,
        angle0: 64,
        angle1: 30,
        profile: (s) => (0.7 + 0.3 * smoothstep(0, 0.2, s)) * (0.85 + 0.15 * smoothstep(0.55, 0.8, s)) * (1 - 0.45 * smoothstep(0.85, 1, s)),
        rays: 22,
        soft: 0.4,
        style: glassy(),
      }),
      anal(b, {
        t0: 0.6,
        t1: 0.84,
        len: 0.1 * fl,
        angle0: 60,
        angle1: 28,
        profile: (s) => (0.75 + 0.25 * smoothstep(0, 0.4, s)) * (1 - 0.45 * smoothstep(0.8, 1, s)),
        rays: 12,
        soft: 0.4,
        style: glassy(),
      }),
      pelvic(b, {
        t: 0.32,
        yn0: -0.84,
        yn1: -0.92,
        tLen: 0.025,
        len: 0.09 * fl,
        out: 16,
        a0: -28,
        a1: -55,
        profile: (s) => 1 - 0.4 * s,
        rays: 5,
        soft: 0.4,
        style: glassy({ opacity: 0.55 }),
      }),
      pectoral(b, {
        t: 0.28,
        yn0: 0.05,
        yn1: -0.42,
        len: 0.1,
        out: 28,
        a0: 22,
        a1: -30,
        rays: 14,
        soft: 0.3,
        style: glassy({ opacity: 0.25, flutter: 0.3, pattern: 0 }),
      }),
    ],
    eye: eye({ t: 0.12, yn: 0.26, r: 0.043, protrude: 0.4, forward: 0.22, up: 0.08, pupil: 0.5, iris: '#2c3a38', ring: '#8fd8c8', ringWidth: 0.06 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.07,
      idleAmp: 0.016,
      envPow: 2.3,
      pectoralHz: 4,
      idleFlutter: 0.55,
      finSoft: 0.45,
      finRest: 0.86,
      sag: 0.05,
      idleHz: 1,
      finLag: 0.9,
    }),
    look: look({
      dorsalDark: 0.22,
      bellyLine: -0.45,
      bellyAmount: 0.7,
      bellySoft: 0.45,
      scales: { cols: 30, strength: 0.6, kind: 'cycloid' },
      roughness: 0.28,
      gloss: 0.7,
      iridMode: 'body',
      iridHue: 0.42,
      sss: 0.55,
      lateralLine: 0.25,
      marks: [
        // faint dusky streak on the snout to the eye (typical of chromis)
        { t: 0.06, yn: 0.25, rt: 0.06, ryn: 0.12, rot: -0.35, mode: 'stripe', color: 'body2', strength: 0.35, soft: 0.8 },
      ],
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
};
