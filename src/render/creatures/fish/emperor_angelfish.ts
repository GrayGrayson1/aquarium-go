/**
 * Emperor angelfish (Pomacanthus imperator, chunk 16) — a deep, compressed angelfish with a steep forehead, a small
 * mouth, a gill-cover spine, long dorsal and anal fins with rounded soft lobes (a short trailing point on the dorsal of
 * big Pacific adults) and a rounded tail.
 *  - Adult: royal blue crossed by many narrow yellow stripes; a blue-black mask through the eye edged pale blue; a pale
 *    blue-white face and white mouth; a black shoulder band from the pectoral base, sapphire in front; yellow-orange
 *    tail and rear dorsal; deep blue anal fin with electric-blue lines.
 *  - Juvenile: navy-black with concentric white and electric-blue rings, the lines vertical near the head and closing
 *    into a full white ring at the rear; a white dorsal edge; a clear tail.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import type { CreatureVisualParams } from '@/types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

/** The juvenile's rings: white and blue in turn, centred on the rear of the body (t, yn space; yn ≈ 4.3 × t). */
function juvenileRings(): Mark[] {
  const marks: Mark[] = [];
  const radii: [number, string][] = [
    [0.035, '#f2f4f8'],
    [0.075, '#2f7bea'],
    [0.12, '#f2f4f8'],
    [0.17, '#2f7bea'],
    [0.225, '#f2f4f8'],
  ];
  for (const [r, c] of radii) marks.push({ t: 0.68, yn: 0.0, rt: r, ryn: r * 4.3, color: c as `#${string}`, strength: 0.95, soft: 0.035, mode: 'ring_thin', onFins: 0.8 });
  // the near-vertical white lines over the head and shoulder
  marks.push({ t: 0.22, yn: 0, rt: 0.008, ryn: 1.3, color: '#f2f4f8', strength: 0.9, soft: 0.12, mode: 'band_t', rot: 0.12 });
  marks.push({ t: 0.3, yn: 0, rt: 0.008, ryn: 1.3, color: '#2f7bea', strength: 0.85, soft: 0.12, mode: 'band_t', rot: 0.06 });
  marks.push({ t: 0.37, yn: 0, rt: 0.008, ryn: 1.3, color: '#f2f4f8', strength: 0.9, soft: 0.12, mode: 'band_t' });
  return marks;
}

const ADULT_MARKS: Mark[] = [
  // pale blue-white face in front of the mask, the white mouth
  { t: 0.06, yn: 0.05, rt: 0.08, ryn: 1.3, color: '#bfd9f2', strength: 0.9, soft: 0.45 },
  { t: 0.015, yn: -0.15, rt: 0.03, ryn: 0.5, color: '#f5f5f0', strength: 0.95, soft: 0.4 },
  // the mask: pale blue edge, then blue-black through the eye
  { t: 0.15, yn: 0.15, rt: 0.06, ryn: 1.25, color: '#6ec1f0', strength: 0.95, soft: 0.3 },
  { t: 0.148, yn: 0.15, rt: 0.045, ryn: 1.15, color: '#0e1a3a', strength: 1, soft: 0.3 },
  // the shoulder band: sapphire front edge, black band from the pectoral base two-thirds up the body
  { t: 0.295, yn: -0.1, rt: 0.045, ryn: 0.95, color: '#1f6fd1', strength: 0.95, soft: 0.3 },
  { t: 0.31, yn: -0.12, rt: 0.032, ryn: 0.88, color: '#0b1530', strength: 1, soft: 0.3 },
  // deep blue lower body toward the anal fin
  { t: 0.7, yn: -0.95, rt: 0.35, ryn: 0.35, color: 'body2', strength: 0.6, soft: 0.6, mode: 'band_y' },
];

export const plan: PlanFn = (args) => {
  const young = isJuvenile(args);
  const fl = bucket(finScale(args, 1), 0.1);
  const recolor: Partial<CreatureVisualParams> | undefined = young
    ? { bodyColor: '#0a1235', bodyColor2: '#070d28', bellyColor: '#0d1840', finColor: '#0a1235', finColor2: '#f2f4f8', accentColor: '#f2f4f8', pattern: 'solid', iridescence: 0.1 }
    : undefined;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.74,
    // deep and rounded, with a steep forehead (body depth about 1.7× into the standard length)
    dorsal: curve([[0, 0.05], [0.05, 0.102], [0.12, 0.158], [0.24, 0.202], [0.4, 0.214], [0.56, 0.2], [0.72, 0.142], [0.86, 0.076], [0.95, 0.05], [1, 0.047]]),
    ventral: curve([[0, 0.04], [0.07, 0.088], [0.16, 0.138], [0.3, 0.18], [0.44, 0.19], [0.58, 0.172], [0.74, 0.116], [0.88, 0.066], [0.96, 0.048], [1, 0.046]]),
    width: curve([[0, 0.018], [0.1, 0.034], [0.24, 0.046], [0.42, 0.048], [0.62, 0.04], [0.82, 0.025], [1, 0.016]]),
    axis: curve([[0, -0.01], [0.2, -0.002], [1, 0.002]]),
    expTop: 2.0,
    expBottom: 2.0,
    noseRound: 0.14,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.12, t: 0.03, groove: 0.8 },
    operculum: { t: 0.26, strength: 0.7 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  const sp = b.flank(0.23, -0.55, 1, { x: 0, y: 0, z: 0, yn: 0 });
  const bodyFin = fin({ opacity: 0.95, color: 'body', edge: young ? 'fin2' : '#f7a21b', edgeStart: 0.72, edgeWidth: 0.14, edgeAmount: 0.9, pattern: 0.85, rayContrast: 0.35, irid: 0.25, rootBlend: 0.25 });
  return {
    key: `emperor_angelfish|${fl}`,
    body,
    fins: [
      caudal(b, {
        kind: 'rounded',
        len: 0.2 * fl,
        spread: 34,
        rays: 16,
        soft: 0.3,
        rootH: 1.05,
        cup: 0.012,
        style: young ? fin({ opacity: 0.35, color: '#9ab4d0', pattern: 0, rayContrast: 0.5, irid: 0.05 }) : fin({ opacity: 0.94, color: 'fin', edge: '#ff8a10', edgeStart: 0.8, edgeAmount: 0.4, pattern: 0, rayContrast: 0.4, irid: 0.05 }),
      }),
      dorsal(b, {
        t0: 0.24,
        t1: 0.92,
        len: 0.12 * fl,
        angle0: 68,
        angle1: 18,
        // rounded soft lobe sweeping back to a short point
        profile: (s) => (0.42 + 0.58 * smoothstep(0.1, 0.75, s)) * (1 - 0.25 * smoothstep(0.9, 1, s)) + 0.35 * Math.exp(-(((s - 0.88) / 0.06) ** 2)),
        rays: 24,
        web: 0.1,
        soft: 0.35,
        cup: 0.008,
        segS: 36,
        segR: 12,
        inset: 0.03,
        style: young ? { ...bodyFin, pattern: 0.5 } : { ...bodyFin, edge: '#f4c430' },
      }),
      anal(b, {
        t0: 0.52,
        t1: 0.92,
        len: 0.12 * fl,
        angle0: 62,
        angle1: 20,
        profile: (s) => (0.45 + 0.55 * smoothstep(0.05, 0.7, s)) * (1 - 0.25 * smoothstep(0.88, 1, s)),
        rays: 20,
        web: 0.08,
        soft: 0.35,
        cup: 0.008,
        segS: 28,
        segR: 12,
        inset: 0.03,
        style: young ? { ...bodyFin, pattern: 0.5 } : fin({ opacity: 0.95, color: '#16337a', edge: '#3fa9f5', edgeStart: 0.7, edgeWidth: 0.12, edgeAmount: 1, pattern: 0.2, rayContrast: 0.5, irid: 0.5 }),
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.05,
        yn1: -0.42,
        len: 0.11,
        out: 28,
        a0: 22,
        a1: -24,
        profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s),
        rays: 14,
        soft: 0.3,
        style: fin({ opacity: young ? 0.35 : 0.6, color: young ? '#9ab4d0' : '#0b1530', pattern: 0, rayContrast: 0.4, flutter: 0.45, irid: 0.1 }),
      }),
      pelvic(b, { t: 0.33, yn0: -0.84, yn1: -0.92, tLen: 0.02, len: 0.09, out: 18, a0: -30, a1: -58, rays: 5, soft: 0.3, style: fin({ opacity: 0.92, color: young ? 'body' : '#16337a', edge: young ? 'fin2' : '#3fa9f5', edgeStart: 0.6, edgeWidth: 0.25, pattern: 0, rayContrast: 0.35, irid: 0.2 }) }),
    ],
    extras: [{ kind: 'spine', path: [[sp.x + 0.004, sp.y, sp.z - 0.002], [sp.x - 0.022, sp.y - 0.004, sp.z + 0.002], [sp.x - 0.045, sp.y - 0.008, sp.z + 0.003]], radius: 0.005, taper: 0.15, mirror: true, t: 0.23, color: young ? 'body' : '#f5f5f0' }],
    eye: eye({ t: 0.155, yn: 0.3, r: 0.032, protrude: 0.36, forward: 0.2, up: 0.1, pupil: 0.5, iris: 'eye', ring: young ? '#2f7bea' : '#0e1a3a', ringWidth: 0.1, socket: young ? 'body' : '#0e1a3a' }),
    motion: motion({
      wavelength: 1.15,
      amp: 0.045,
      idleAmp: 0.012,
      envPow: 2.6,
      headSway: 0.04,
      bendK: 0.7,
      pectoralHz: 2.8,
      idleFlutter: 0.6,
      finSoft: 0.45,
      finRest: 0.86,
      sag: 0.05,
      idleHz: 0.6,
      finLag: 0.8,
      breathe: 0.6,
    }),
    look: look({
      dorsalDark: 0.25,
      bellyLine: -0.7,
      bellyAmount: 0.2,
      bellySoft: 0.4,
      scales: { cols: 44, strength: 0.35, kind: 'ctenoid' },
      roughness: 0.38,
      gloss: 0.6,
      iridMode: 'back',
      iridHue: 0.6,
      sss: 0.45,
      lateralLine: 0,
      appendageColor: 'body',
      lipColor: young ? 'body' : '#f5f5f0',
      // the adult's stripes: many narrow lines along the body
      patA: young ? [0, 0, 0, 0] : [8, 0, 0.07, 0],
      patternBellyFade: -2,
      marks: young ? juvenileRings() : ADULT_MARKS,
    }),
    pickRadius: 0.55,
    recolor,
  };
};
