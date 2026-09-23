/**
 * Discus (Symphysodon aequifasciatus) — the "king of the aquarium": a tall, laterally compressed disc (body depth ≈
 * standard length) with a steep forehead, small terminal mouth and bright red eye, long continuous dorsal and anal
 * fins wrapping the disc with iridescent blue-edged margins, clear pectorals that scull constantly and long pelvic
 * streamers. Strain patterns from the appearance: nine vertical bars (wild brown), turquoise striations (lined),
 * checkerboard honeycomb (reticulated), pigeon-blood pepper (speckled), leopard spots, solid blue diamond / golden /
 * marlboro red (pale head). OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const pc = a.patternContrast ?? 0.55;
  const pat = a.pattern ?? 'bars';
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.78,
    dorsal: curve([[0, 0.05], [0.05, 0.1], [0.12, 0.162], [0.25, 0.212], [0.4, 0.232], [0.55, 0.214], [0.7, 0.16], [0.82, 0.1], [0.93, 0.054], [1, 0.044]]),
    ventral: curve([[0, 0.048], [0.06, 0.098], [0.15, 0.158], [0.3, 0.206], [0.45, 0.222], [0.6, 0.198], [0.72, 0.148], [0.84, 0.088], [0.94, 0.05], [1, 0.042]]),
    width: curve([[0, 0.032], [0.1, 0.048], [0.3, 0.058], [0.5, 0.054], [0.7, 0.04], [0.88, 0.022], [1, 0.018]]),
    axis: curve([[0, -0.012], [0.25, 0], [1, 0.002]]),
    expTop: 1.75,
    expBottom: 1.8,
    noseRound: 0.06,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.12, t: 0.035, groove: 0.8 },
    operculum: { t: 0.2, strength: 0.7 },
    cheek: 0.25,
  };
  const b = new BodySampler(body);

  const marks: Mark[] = [
    // first bar runs through the eye (always present unless the strain suppresses bars)
    { t: 0.115, yn: 0.22, rt: 0.022, ryn: 1.15, color: 'accent', strength: pat === 'solid' ? 0.15 : 0.75 * pc + 0.15, soft: 0.4, mode: 'band_t', onFins: 0.4 },
    // head tint toward body2 (pale yellow head on marlboro reds, lighter faces on most strains)
    { t: 0.08, yn: 0.1, rt: 0.15, ryn: 1.35, color: 'body2', strength: 0.55, soft: 1.0 },
  ];
  if (pat === 'bars' || pat === 'solid') {
    // blue-green iridescent streaks on the head and cheek of wild-type fish
    marks.push({ t: 0.16, yn: -0.25, rt: 0.09, ryn: 0.05, color: 'fin2', strength: 0.4, soft: 0.5, mode: 'stripe', rot: -0.35 });
    marks.push({ t: 0.2, yn: 0.45, rt: 0.1, ryn: 0.05, color: 'fin2', strength: 0.35, soft: 0.5, mode: 'stripe', rot: 0.3 });
    marks.push({ t: 0.08, yn: -0.55, rt: 0.06, ryn: 0.05, color: 'fin2', strength: 0.35, soft: 0.5, mode: 'stripe', rot: -0.5 });
  }
  // ~9 bars at patternScale 1 (snakeskin's high scale gives many fine bars)
  const patA: [number, number, number, number] =
    pat === 'bars' ? [1, 0.02, -0.03, 0.2] : pat === 'reticulated' ? [11, 0.045, 0, 0] : pat === 'spots' ? [16, -0.38, 0, 0] : [0, 0, 0, 1];
  const finSt = (opacity: number) =>
    fin({ opacity, color: 'fin', edge: 'fin2', edgeStart: 0.62, edgeWidth: 0.25, edgeAmount: 0.95, rayContrast: 0.55, pattern: 0.75, irid: 0.8, rootBlend: 0.05 });
  return {
    key: 'discus',
    body,
    fins: [
      caudal(b, {
        kind: 'rounded',
        len: 0.2,
        spread: 34,
        rays: 16,
        soft: 0.45,
        rootH: 1.0,
        style: fin({ opacity: 0.6, color: 'fin', edge: 'fin2', edgeStart: 0.7, edgeWidth: 0.25, edgeAmount: 0.5, rayContrast: 0.6, pattern: 0.4, irid: 0.5 }),
      }),
      // long dorsal wrapping the upper disc, highest toward the rear
      dorsal(b, {
        t0: 0.22,
        t1: 0.92,
        len: 0.12,
        angle0: 62,
        angle1: 10,
        profile: (s) => (0.45 + 0.55 * smoothstep(0, 0.6, s)) * (1 - 0.5 * smoothstep(0.82, 1, s)),
        rays: 26,
        soft: 0.55,
        cup: 0.008,
        inset: 0.06,
        segS: 36,
        segR: 10,
        style: { ...finSt(0.88), flutter: 0.12 },
      }),
      anal(b, {
        t0: 0.32,
        t1: 0.92,
        len: 0.115,
        angle0: 60,
        angle1: 10,
        profile: (s) => (0.45 + 0.55 * smoothstep(0, 0.6, s)) * (1 - 0.5 * smoothstep(0.82, 1, s)),
        rays: 22,
        soft: 0.55,
        cup: 0.008,
        inset: 0.06,
        segS: 32,
        segR: 10,
        style: { ...finSt(0.88), flutter: 0.12, phase: 1.3 },
      }),
      pectoral(b, {
        t: 0.24,
        yn0: -0.05,
        yn1: -0.32,
        len: 0.1,
        out: 30,
        a0: 22,
        a1: -28,
        profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * s),
        rays: 10,
        soft: 0.3,
        style: fin({ opacity: 0.22, color: 'clear', rayContrast: 0.4, pattern: 0, irid: 0.3, flutter: 0.45 }),
      }),
      // long pelvic streamers with bright tips
      pelvic(b, {
        t: 0.3,
        yn0: -0.9,
        yn1: -0.95,
        tLen: 0.015,
        len: 0.15,
        out: 12,
        a0: -48,
        a1: -64,
        profile: (s) => 1 - 0.45 * s,
        rays: 3,
        soft: 0.8,
        style: fin({ opacity: 0.9, color: 'fin', edge: 'fin2', edgeStart: 0.55, edgeWidth: 0.35, edgeAmount: 1, rayContrast: 0.4, pattern: 0.2, irid: 0.6 }),
      }),
    ],
    eye: eye({ t: 0.115, yn: 0.3, r: 0.03, protrude: 0.4, forward: 0.2, up: 0.1, pupil: 0.44, iris: 'eye', ring: '#7a1a14', ringWidth: 0.1, socket: 'body2', swivel: 0.35 }),
    motion: motion({
      wavelength: 1.1,
      amp: 0.04,
      idleAmp: 0.012,
      envPow: 3.0,
      headSway: 0.03,
      bendK: 0.6,
      pectoralHz: 3.2,
      idleFlutter: 0.7,
      finSoft: 0.7,
      finRest: 0.9,
      sag: 0.08,
      idleHz: 0.6,
      finLag: 1.0,
      breathe: 0.6,
    }),
    look: look({
      dorsalDark: 0.15,
      bellyLine: -0.7,
      bellyAmount: 0.3,
      bellySoft: 0.4,
      scales: { cols: 44, strength: 0.3, kind: 'cycloid' },
      roughness: 0.36,
      gloss: 0.55,
      iridMode: 'body',
      iridHue: 0.45,
      sss: 0.5,
      lateralLine: 0.2,
      patA,
      marks,
      lipColor: 'body2',
    }),
    pickRadius: 0.6,
  };
};
