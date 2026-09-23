/**
 * Mandarin dragonet (Synchiropus splendidus) — scaleless, glossy bottom-hopper: broad flattened head with big eyes
 * set high, tapering body with a flat belly; psychedelic maze of wavy orange bands over a royal-blue/green ground
 * (red form: blue lines on red); males carry a tall sail-like first dorsal; long second dorsal and anal fins; big
 * rounded fan pectorals; leg-like pelvic fins set forward and splayed; broad rounded tail; hopping locomotion.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, ColorRef } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic, sailDorsal } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';
import { safeColor } from '../core/palette';

const coolness = (css: string) => {
  const c = safeColor(css);
  return c.b - c.r;
};

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const female = isFemale(args);
  const fl = bucket(finScale(args, 1), 0.1);
  // green/blue form: ground = body2 (blue), maze lines = body (orange); red form: ground = body (red), lines = accent (blue)
  const blueGround = coolness(a.bodyColor2) > coolness(a.bodyColor);
  const ground: ColorRef = blueGround ? 'body2' : 'body';
  const lines: ColorRef = blueGround ? 'body' : 'accent';
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.74,
    dorsal: curve([[0, 0.032], [0.06, 0.058], [0.14, 0.078], [0.26, 0.088], [0.4, 0.083], [0.55, 0.068], [0.7, 0.05], [0.85, 0.035], [1, 0.027]]),
    ventral: curve([[0, 0.03], [0.08, 0.056], [0.18, 0.074], [0.3, 0.078], [0.45, 0.07], [0.6, 0.056], [0.76, 0.04], [0.9, 0.031], [1, 0.026]]),
    // broad, flat head
    width: curve([[0, 0.034], [0.07, 0.066], [0.16, 0.085], [0.26, 0.082], [0.4, 0.066], [0.58, 0.046], [0.78, 0.028], [1, 0.016]]),
    axis: curve([[0, -0.008], [0.2, 0], [1, 0.004]]),
    expTop: 2.1,
    expBottom: curve([[0, 2.6], [0.4, 2.8], [1, 2.2]]),
    noseRound: 0.1,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.2, t: 0.04, groove: 0.8 },
    operculum: { t: 0.24, strength: 0.4 },
    cheek: 0.45,
  };
  const b = new BodySampler(body);
  const finStyle = fin({ opacity: 0.9, color: 'fin', edge: 'fin2', edgeStart: 0.72, edgeWidth: 0.2, edgeAmount: 0.9, pattern: 0.85, rayContrast: 0.35, irid: 0.5 });
  return {
    key: `mandarin|${female ? 'f' : 'm'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 36, rays: 12, soft: 0.45, rootH: 1.15, cup: 0.012, style: { ...finStyle, edgeStart: 0.7 } }),
      // tall sail first dorsal (males), short in females
      sailDorsal(b, {
        t0: 0.3,
        t1: 0.43,
        len: (female ? 0.075 : 0.19) * fl,
        angle0: 82,
        angle1: 50,
        profile: (s) => (1 - 0.35 * s) * (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, s * 1.4))),
        rays: 4,
        web: 0.12,
        soft: 0.55,
        cup: 0.01,
        segS: 14,
        segR: 16,
        inset: 0.04,
        style: { ...finStyle, flutter: 0.15, edgeStart: 0.62 },
      }),
      dorsal(b, {
        t0: 0.46,
        t1: 0.86,
        len: 0.095 * fl,
        angle0: 64,
        angle1: 32,
        profile: (s) => (0.7 + 0.3 * smoothstep(0, 0.3, s)) * (1 - 0.3 * smoothstep(0.8, 1, s)),
        rays: 9,
        soft: 0.45,
        inset: 0.04,
        style: finStyle,
      }),
      anal(b, {
        t0: 0.5,
        t1: 0.87,
        len: 0.07 * fl,
        angle0: 58,
        angle1: 30,
        profile: (s) => (0.7 + 0.3 * smoothstep(0, 0.3, s)) * (1 - 0.3 * smoothstep(0.8, 1, s)),
        rays: 8,
        soft: 0.4,
        inset: 0.04,
        style: finStyle,
      }),
      // big rounded fan pectorals — the dragonet's "hover-hop" engine
      pectoral(b, {
        t: 0.3,
        yn0: 0.25,
        yn1: -0.35,
        len: 0.13,
        out: 40,
        a0: 38,
        a1: -32,
        profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * s),
        rays: 14,
        soft: 0.35,
        style: fin({ opacity: 0.55, color: 'fin', edge: 'fin2', edgeStart: 0.75, edgeWidth: 0.2, edgeAmount: 0.6, pattern: 0.3, rayContrast: 0.45, flutter: 0.55, irid: 0.3 }),
      }),
      // leg-like pelvic fins set forward, splayed outward to stand on the rubble
      pelvic(b, {
        t: 0.2,
        yn0: -0.7,
        yn1: -0.9,
        tLen: 0.03,
        len: 0.1,
        out: 58,
        a0: -12,
        a1: -45,
        profile: (s) => 0.85 + 0.15 * Math.sin(Math.PI * s),
        rays: 5,
        soft: 0.3,
        style: fin({ opacity: 0.9, color: 'fin', edge: lines, edgeStart: 0.55, edgeWidth: 0.3, edgeAmount: 0.8, pattern: 0.4, rayContrast: 0.35, flutter: 0.1, irid: 0.3 }),
      }),
    ],
    eye: eye({ t: 0.13, yn: 0.62, r: 0.036, protrude: 0.5, forward: 0.3, up: 0.55, pupil: 0.42, swivel: 1.1, iris: 'eye', ring: '#f6b048', ringWidth: 0.12, socket: ground }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.05,
      idleAmp: 0.016,
      envPow: 2.2,
      headSway: 0.04,
      bendK: 1.0,
      pectoralHz: 5.5,
      idleFlutter: 0.85,
      finSoft: 0.5,
      finRest: 0.9,
      sag: 0.08,
      idleHz: 0.6,
      finLag: 0.9,
      hop: 0.045,
      breathe: 0.8,
    }),
    look: look({
      slots: { body: ground, body2: ground, accent: lines },
      dorsalDark: 0.15,
      bellyLine: -0.55,
      bellyAmount: 0.45,
      bellySoft: 0.35,
      scales: { cols: 40, strength: 0, kind: 'skin' },
      roughness: 0.28,
      gloss: 0.8,
      iridMode: 'back',
      iridHue: 0.64,
      sss: 0.55,
      lateralLine: 0,
      patternBellyFade: -0.75,
      patA: [5, 0.12, 0, 0],
      lipColor: lines,
    }),
    pickRadius: 0.55,
  };
};
