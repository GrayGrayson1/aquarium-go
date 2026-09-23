/**
 * Bumblebee goby (Brachygobius doriae) — a tiny, chunky, cylindrical goby with a blunt rounded head, eyes set high,
 * a flat belly for perching and a fused pelvic sucker disc under the throat. Two dorsal fins, a rounded tail and big
 * fan pectorals. Pattern: bright yellow with four black bands — one over the head through the eye, one under the first
 * dorsal (which is almost all black), one under the second dorsal and one at the tail base. Pectoral and pelvic fins
 * are black on their inner two-thirds. Females are rounder; males slimmer and warmer-toned. OWNER: lane "brackish".
 */
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { mixHex } from '../core/palette';
import { motion, look, eye, fin, finScale, bucket, isFemale, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const female = isFemale(args);
  const fl = bucket(finScale(args, 1), 0.1);
  // band width follows patternScale (Broad-banded individuals)
  const bw = Math.min(1.4, Math.max(0.75, a.patternScale ?? 1));
  const g = female ? 1.08 : 1; // gravid females are rounder bellied
  const body: FishPlan['body'] = {
    noseX: 0.38,
    length: 0.72,
    // blunt rounded head, fat cylindrical trunk, thick short peduncle; belly nearly flat
    dorsal: curve([[0, 0.05], [0.05, 0.09], [0.14, 0.114], [0.3, 0.12], [0.5, 0.108], [0.72, 0.082], [0.9, 0.064], [1, 0.058]]),
    ventral: curve([[0, 0.046], [0.07, 0.086], [0.2, 0.106 * g], [0.42, 0.112 * g], [0.62, 0.094], [0.84, 0.066], [1, 0.056]]),
    width: curve([[0, 0.046], [0.08, 0.078], [0.22, 0.092], [0.44, 0.082], [0.7, 0.058], [0.9, 0.04], [1, 0.034]]),
    axis: curve([[0, -0.008], [0.2, 0], [1, 0.006]]),
    expTop: 2.1,
    expBottom: 2.7,
    noseRound: 0.16,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.18, t: 0.06, groove: 0.9 },
    operculum: { t: 0.25, strength: 0.55 },
    cheek: 0.85,
  };
  const b = new BodySampler(body);

  const smoky = (o: Partial<Parameters<typeof fin>[0]> = {}) =>
    fin({ opacity: 0.58, color: 'fin', edge: 'fin', edgeStart: 0.8, edgeWidth: 0.2, edgeAmount: 0.4, pattern: 0, rayContrast: 0.5, irid: 0.05, ...o });
  // black inner two-thirds, smoky-clear outer third
  const blackRoot = (o: Partial<Parameters<typeof fin>[0]> = {}) =>
    fin({ opacity: 0.85, color: 'fin2', edge: 'fin', edgeStart: 0.58, edgeWidth: 0.2, edgeAmount: 1, pattern: 0, rayContrast: 0.35, irid: 0.03, ...o });

  // band centres along the body (t) and half-widths
  const bands = [
    { t: 0.13, w: 0.06 * bw, curve: -0.015, arrow: 0 },
    { t: 0.39, w: 0.075 * bw, curve: 0.01, arrow: 0 },
    { t: 0.64, w: 0.07 * bw, curve: 0.0, arrow: 0 },
    { t: 0.93, w: 0.05 * bw, curve: 0.0, arrow: 0 },
  ];
  // carry bands 3 and 4 up into the second dorsal, anal and tail roots (fins only)
  const marks: Mark[] = [
    { t: 0.64, yn: 1, rt: 0.075 * bw, ryn: 2.2, mode: 'band_t', color: 'accent', strength: 0.85, soft: 0.25, onFins: 2 },
    { t: 0.64, yn: -1, rt: 0.07 * bw, ryn: 2.2, mode: 'band_t', color: 'accent', strength: 0.7, soft: 0.3, onFins: 2 },
    { t: 1.0, yn: 0, rt: 0.06 * bw, ryn: 2.4, mode: 'band_t', color: 'accent', strength: 0.75, soft: 0.35, onFins: 2 },
    // yellow snout and lips in front of the head band; pale throat
    { t: 0.02, yn: -0.1, rt: 0.06, ryn: 0.9, color: 'body', strength: 0.5, soft: 0.6 },
    { t: 0.26, yn: -0.9, rt: 0.1, ryn: 0.3, color: 'belly', strength: 0.25, soft: 0.7 },
  ];

  const slots = female ? undefined : { body: mixHex(a.bodyColor, '#e89a2a', 0.18) as `#${string}` };
  return {
    key: `bumblebee_goby|${female ? 'f' : 'm'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 30, rays: 13, soft: 0.35, rootH: 1, style: smoky({ opacity: 0.6, rayContrast: 0.55 }) }),
      // first dorsal: small, rounded, almost entirely black (within the second band)
      dorsal(b, {
        t0: 0.33,
        t1: 0.45,
        len: 0.085 * fl,
        angle0: 72,
        angle1: 44,
        profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.2 + s * 0.85)),
        rays: 6,
        soft: 0.3,
        style: fin({ opacity: 0.9, color: 'fin2', edge: 'body', edgeStart: 0.82, edgeWidth: 0.15, edgeAmount: female ? 0.35 : 0.65, pattern: 0, rayContrast: 0.3, irid: 0.03 }),
      }),
      dorsal(b, {
        t0: 0.52,
        t1: 0.84,
        len: 0.08 * fl,
        angle0: 58,
        angle1: 26,
        profile: (s) => (0.75 + 0.25 * smoothstep(0, 0.45, s)) * (1 - 0.45 * smoothstep(0.8, 1, s)),
        rays: 9,
        soft: 0.35,
        style: smoky(),
      }),
      anal(b, {
        t0: 0.58,
        t1: 0.84,
        len: 0.07 * fl,
        angle0: 55,
        angle1: 25,
        profile: (s) => (0.75 + 0.25 * smoothstep(0, 0.45, s)) * (1 - 0.45 * smoothstep(0.8, 1, s)),
        rays: 8,
        soft: 0.35,
        style: smoky({ opacity: 0.52 }),
      }),
      // big fan pectorals it props itself on
      pectoral(b, {
        t: 0.28,
        yn0: 0.08,
        yn1: -0.58,
        len: 0.105,
        out: 40,
        a0: 24,
        a1: -40,
        profile: (s) => 0.78 + 0.22 * Math.sin(Math.PI * s),
        rays: 14,
        soft: 0.3,
        style: blackRoot({ opacity: 0.7, flutter: 0.35 }),
      }),
      // fused pelvic sucker disc under the throat, splayed flat to grip stones and glass
      pelvic(b, {
        t: 0.23,
        yn0: -0.88,
        yn1: -0.96,
        tLen: 0.06,
        len: 0.075,
        out: 48,
        a0: -52,
        a1: -78,
        profile: (s) => 0.82 + 0.18 * Math.sin(Math.PI * s),
        rays: 7,
        soft: 0.25,
        cup: 0.01,
        style: blackRoot({ opacity: 0.8, edgeStart: 0.62 }),
      }),
    ],
    // eyes set high on the head, inside the black head band (dark socket so no yellow rim)
    eye: eye({ t: 0.12, yn: 0.52, r: 0.04, protrude: 0.5, forward: 0.22, up: 0.42, pupil: 0.46, swivel: 0.8, iris: 'eye', ring: '#8a6a22', ringWidth: 0.1, socket: 'accent' }),
    motion: motion({
      wavelength: 0.95,
      amp: 0.075,
      idleAmp: 0.008,
      envPow: 1.9,
      headSway: 0.1,
      pectoralHz: 3,
      idleFlutter: 0.4,
      finSoft: 0.4,
      finRest: 0.86,
      sag: 0,
      idleHz: 0.5,
      finLag: 0.8,
      breathe: 1,
    }),
    look: look({
      dorsalDark: 0.12,
      bellyLine: -0.55,
      bellyAmount: 0.45,
      bellySoft: 0.4,
      scales: { cols: 36, strength: 0.28, kind: 'ctenoid' },
      roughness: 0.4,
      gloss: 0.65,
      iridMode: 'body',
      iridHue: 0.15,
      sss: 0.6,
      lateralLine: 0,
      pattern: 'bands',
      patternMap: { bands: 'bands', solid: 'bands' },
      bands,
      // black bands with soft (not outlined) edges
      patternEdge: 'accent',
      patternEdgeWidth: 0.004,
      marks,
      slots,
      lipColor: 'body',
    }),
    pickRadius: 0.55,
  };
};
