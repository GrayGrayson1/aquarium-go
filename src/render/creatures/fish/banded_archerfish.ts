/**
 * Banded archerfish (Toxotes jaculatrix) — the estuary showpiece. A deep, laterally compressed body with a dead-straight
 * dorsal profile running from the pointed snout back to the dorsal fin (so the huge, forward-set eyes sit just under
 * the top line, looking up at the air), a deep rounded belly, and a big upturned mouth for spitting. Spiny dorsal and
 * anal fins set far back, mirroring each other; a broad, slightly emarginate tail. Silvery-white flanks with a metallic
 * sheen, an olive back, and five black wedge bars hanging from the back — the first through the eye, the last a small
 * saddle on the tail base. OWNER: lane "brackish" (fish art).
 */
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic, spinyDorsal } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const fl = bucket(finScale(args, 1), 0.1);
  const k = Math.max(0.6, Math.min(1, a.patternContrast ?? 0.92));
  const body: FishPlan['body'] = {
    noseX: 0.43,
    length: 0.72,
    // straight top line from the snout tip to the dorsal origin (t ≈ 0.6), then down to the peduncle
    dorsal: curve([[0, 0.014], [0.1, 0.032], [0.2, 0.05], [0.3, 0.068], [0.42, 0.088], [0.54, 0.106], [0.64, 0.112], [0.76, 0.096], [0.88, 0.07], [1, 0.058]]),
    // deep, rounded belly
    ventral: curve([[0, 0.012], [0.06, 0.038], [0.16, 0.088], [0.3, 0.132], [0.44, 0.152], [0.58, 0.142], [0.72, 0.108], [0.86, 0.074], [1, 0.058]]),
    width: curve([[0, 0.012], [0.1, 0.03], [0.26, 0.046], [0.46, 0.05], [0.66, 0.04], [0.86, 0.024], [1, 0.018]]),
    axis: curve([[0, 0.02], [0.2, 0.008], [0.5, 0], [1, 0.006]]),
    expTop: 2.3,
    expBottom: 2.05,
    noseRound: 0.05,
    tailRound: 0.03,
    // large, oblique, upturned mouth at the top of the snout
    mouth: { kind: 'upturned', yn: 0.55, t: 0.07, groove: 1 },
    operculum: { t: 0.27, strength: 0.75 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);

  // Five black wedges hanging from the back: wide at the top, tapering to a point down the flank. Ellipses centred
  // high on the flank, so only their lower, narrowing halves show below the dorsal midline.
  const wedge = (t: number, yn: number, rt: number, ryn: number, s = 1, onFins = 0): Mark => ({ t, yn, rt, ryn, color: 'accent', strength: k * s, soft: 0.14, onFins });
  const marks: Mark[] = [
    wedge(0.17, 0.5, 0.036, 1.05, 0.95),
    wedge(0.36, 0.78, 0.05, 1.12),
    wedge(0.55, 0.84, 0.046, 1.02, 1, 0.6),
    wedge(0.73, 0.9, 0.04, 0.82, 1, 0.9),
    wedge(0.925, 0.95, 0.024, 0.5, 0.9),
    // pale silver throat and a faint yellowish-olive cast along the back
    { t: 0.22, yn: -0.75, rt: 0.12, ryn: 0.3, color: 'belly', strength: 0.35, soft: 0.7 },
  ];

  const dusky = (o: Partial<Parameters<typeof fin>[0]> = {}) =>
    fin({ opacity: 0.82, color: '#77755e', edge: 'fin2', edgeStart: 0.74, edgeWidth: 0.18, edgeAmount: 0.85, pattern: 0.1, rayContrast: 0.5, irid: 0.15, ...o });
  return {
    key: `banded_archerfish|${fl}`,
    body,
    fins: [
      caudal(b, {
        kind: 'emarginate',
        len: 0.23 * fl,
        spread: 30,
        fork: 0.35,
        rays: 16,
        soft: 0.4,
        rootH: 1,
        cup: 0.01,
        style: fin({ opacity: 0.62, color: 'fin', edge: 'fin2', edgeStart: 0.82, edgeWidth: 0.15, edgeAmount: 0.4, pattern: 0.1, rayContrast: 0.55, irid: 0.2 }),
      }),
      // four stout spines, then the soft dorsal: set far back, over the anal fin
      spinyDorsal(b, {
        t0: 0.6,
        t1: 0.7,
        len: 0.085 * fl,
        angle0: 70,
        angle1: 48,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.3 + s * 0.8)),
        rays: 4,
        web: 0.12,
        soft: 0.2,
        style: dusky({ opacity: 0.9, color: '#4a4a3c', edgeStart: 0.6 }),
      }),
      dorsal(b, {
        t0: 0.69,
        t1: 0.88,
        len: 0.11 * fl,
        angle0: 56,
        angle1: 24,
        profile: (s) => (0.8 + 0.2 * smoothstep(0, 0.35, s)) * (1 - 0.5 * smoothstep(0.72, 1, s)),
        rays: 12,
        soft: 0.35,
        style: dusky(),
      }),
      // long-based anal fin mirroring the dorsal (spiny front, rounded soft rear)
      anal(b, {
        t0: 0.5,
        t1: 0.88,
        len: 0.12 * fl,
        angle0: 50,
        angle1: 22,
        profile: (s) => (0.45 + 0.55 * smoothstep(0, 0.5, s)) * (1 - 0.5 * smoothstep(0.78, 1, s)),
        rays: 15,
        soft: 0.35,
        style: dusky({ opacity: 0.78 }),
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.18,
        yn1: -0.52,
        len: 0.09,
        out: 34,
        a0: 18,
        a1: -30,
        profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * s),
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.22, color: 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.3, irid: 0.1 }),
      }),
      pelvic(b, {
        t: 0.4,
        yn0: -0.88,
        yn1: -0.94,
        tLen: 0.03,
        len: 0.07,
        out: 18,
        a0: -22,
        a1: -50,
        rays: 6,
        soft: 0.3,
        style: fin({ opacity: 0.55, color: 'body', edge: 'fin2', edgeStart: 0.7, edgeAmount: 0.3, pattern: 0, rayContrast: 0.4, irid: 0.1 }),
      }),
    ],
    // big, forward-set eyes right under the straight top line, angled forward and up (binocular aiming)
    eye: eye({ t: 0.165, yn: 0.48, r: 0.037, protrude: 0.36, forward: 0.34, up: 0.3, pupil: 0.44, swivel: 0.7, iris: 'eye', ring: '#d8c68a', ringWidth: 0.1, maskColor: 'accent', socket: 'body' }),
    motion: motion({
      wavelength: 1.05,
      amp: 0.055,
      idleAmp: 0.014,
      envPow: 2.6,
      headSway: 0.05,
      bendK: 0.7,
      pectoralHz: 3.6,
      idleFlutter: 0.4,
      finSoft: 0.45,
      finRest: 0.88,
      sag: 0.03,
      idleHz: 0.8,
      finLag: 0.8,
      breathe: 0.6,
    }),
    look: look({
      dorsalDark: 0.85,
      bellyLine: -0.35,
      bellyAmount: 0.7,
      bellySoft: 0.45,
      scales: { cols: 44, strength: 0.42, kind: 'ctenoid' },
      roughness: 0.3,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: 0.55,
      sss: 0.45,
      lateralLine: 0.25,
      // the bars are drawn as marks; the appearance "bands" pattern draws nothing extra
      patternMap: { bands: 'solid' },
      marks,
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
};
