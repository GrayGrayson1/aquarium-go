/**
 * Kuhli loach (Pangio kuhlii) — eel-like, very long thin body with a small rounded head, tiny skin-covered eyes,
 * short barbels, 10–15 dark chocolate saddle bands over salmon-orange that stop short of the pale belly, tiny fins set
 * far back, and a whole-body anguilliform wriggle. OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, ExtraSpec, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const ps = a.patternScale ?? 1;
  const pc = a.patternContrast ?? 0.9;
  const body: FishPlan['body'] = {
    noseX: 0.47,
    length: 0.915,
    dorsal: curve([[0, 0.016], [0.04, 0.026], [0.1, 0.034], [0.25, 0.039], [0.5, 0.041], [0.72, 0.039], [0.88, 0.032], [0.96, 0.024], [1, 0.02]]),
    ventral: curve([[0, 0.014], [0.05, 0.024], [0.12, 0.032], [0.3, 0.037], [0.55, 0.038], [0.75, 0.034], [0.9, 0.026], [1, 0.019]]),
    width: curve([[0, 0.016], [0.05, 0.024], [0.14, 0.03], [0.4, 0.031], [0.7, 0.027], [0.88, 0.02], [1, 0.014]]),
    axis: curve([[0, -0.004], [0.1, 0], [1, 0]]),
    expTop: 2.1,
    expBottom: 2.2,
    noseRound: 0.035,
    tailRound: 0.02,
    mouth: { kind: 'subterminal', yn: -0.5, t: 0.022, groove: 0.5 },
    operculum: { t: 0.075, strength: 0.35 },
  };
  const b = new BodySampler(body);

  // three pairs of short barbels around the mouth
  const extras: ExtraSpec[] = [];
  const barbel = (t: number, yn: number, dir: [number, number, number], len: number) => {
    const p = b.flank(t, yn, 1, { x: 0, y: 0, z: 0, yn: 0 });
    const l = Math.hypot(...dir);
    const d = dir.map((v) => v / l) as [number, number, number];
    extras.push({
      kind: 'barbel',
      t,
      radius: 0.0022,
      taper: 0.35,
      mirror: true,
      path: [
        [p.x, p.y, p.z * 0.9],
        [p.x + d[0] * len * 0.5, p.y + d[1] * len * 0.5, p.z * 0.9 + d[2] * len * 0.5],
        [p.x + d[0] * len - 0.002, p.y + d[1] * len - 0.004, p.z * 0.9 + d[2] * len],
      ],
    });
  };
  barbel(0.012, -0.3, [0.7, -0.3, 0.6], 0.022);
  barbel(0.02, -0.6, [0.5, -0.7, 0.5], 0.02);
  barbel(0.028, -0.85, [0.4, -0.9, 0.3], 0.016);

  // bands: ~13 bars (fewer and broader for the broad-banded form) that stop short of the belly
  const n = Math.round(13 - (ps - 1) * 8);
  // the bars pattern draws floor(4 + 4·ps + patA.x) bars; solve patA.x so the count is n
  const patA: [number, number, number, number] = [n - 4 - 4 * ps + 0.5, 0.3, 0.1 + Math.max(0, ps - 1) * 0.16, -0.12];
  const marks: Mark[] = [
    // dark cap over the head and eye
    { t: 0.05, yn: 0.4, rt: 0.045, ryn: 0.75, color: 'accent', strength: 0.92 * pc, soft: 0.35 },
    // pale throat/belly glow
    { t: 0.1, yn: -0.75, rt: 0.12, ryn: 0.3, color: 'belly', strength: 0.5, soft: 0.8 },
    // dark bar at the tail base
    { t: 0.99, yn: 0.1, rt: 0.025, ryn: 1.2, color: 'accent', strength: 0.8 * pc, soft: 0.35, onFins: 0.6 },
  ];
  const tiny = fin({ opacity: 0.45, color: 'fin', rayContrast: 0.6, pattern: 0.2, irid: 0.1 });
  return {
    key: 'kuhli',
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.075, spread: 34, rays: 10, soft: 0.5, rootH: 0.95, segS: 14, segR: 8, style: fin({ ...tiny, opacity: 0.5, edge: 'accent', edgeStart: 0.35, edgeWidth: 0.25, edgeAmount: 0.5 }) }),
      dorsal(b, { t0: 0.66, t1: 0.72, len: 0.036, angle0: 60, angle1: 35, rays: 6, soft: 0.4, segS: 10, segR: 6, style: tiny }),
      anal(b, { t0: 0.8, t1: 0.86, len: 0.032, angle0: 55, angle1: 32, rays: 5, soft: 0.4, segS: 10, segR: 6, style: tiny }),
      pectoral(b, { t: 0.085, yn0: -0.5, yn1: -0.75, len: 0.032, out: 45, a0: 10, a1: -30, rays: 6, soft: 0.3, segS: 8, segR: 6, style: fin({ ...tiny, opacity: 0.35, flutter: 0.35 }) }),
      pelvic(b, { t: 0.52, yn0: -0.9, yn1: -0.95, tLen: 0.02, len: 0.022, out: 30, a0: -15, a1: -40, rays: 4, soft: 0.3, segS: 6, segR: 5, style: tiny }),
    ],
    eye: eye({ t: 0.042, yn: 0.45, r: 0.011, protrude: 0.3, forward: 0.25, up: 0.3, pupil: 0.55, iris: '#2a1a12', ring: '#7a4a2a', ringWidth: 0.15, socket: 'accent', swivel: 0.3 }),
    extras,
    motion: motion({
      wavelength: 0.5,
      amp: 0.07,
      idleAmp: 0.024,
      envPow: 0.8,
      headSway: 0.22,
      bendK: 1.6,
      pectoralHz: 5,
      idleFlutter: 0.4,
      finSoft: 0.6,
      finRest: 0.9,
      sag: 0.02,
      idleHz: 0.55,
      finLag: 0.6,
      breathe: 0.3,
    }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.5,
      bellyAmount: 0.85,
      bellySoft: 0.3,
      scales: { cols: 80, strength: 0, kind: 'skin' },
      roughness: 0.34,
      gloss: 0.65,
      iridMode: 'back',
      iridHue: 0.12,
      sss: 0.7,
      lateralLine: 0,
      patternMap: { bands: 'bars', saddle: 'bars' },
      patA,
      marks,
      appendageColor: 'belly',
      lipColor: 'belly',
    }),
    pickRadius: 0.6,
  };
};
