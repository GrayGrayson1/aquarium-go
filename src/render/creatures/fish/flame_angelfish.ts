/**
 * Flame angelfish (Centropyge loriculus, chunk 16) — the coral beauty's dwarf-angel body (oval, compressed, a rounded
 * head and small mouth, long dorsal and anal fins with soft rear lobes, a rounded tail, a sharp cheek spine). Brilliant
 * orange-red, more yellow-orange on the mid-flank, crossed by four or five short black vertical bars on the upper
 * flank (fewer or none on Marquesas fish: the appearance's patternContrast/patternScale); the rear dorsal and anal fins
 * edged black with electric-blue bars. Males (the larger fish) carry more blue in the rear fins.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, ColorRef } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const male = !isFemale(args) && args.creature?.sex === 'male';
  const orange: ColorRef = 'body';
  // the electric blue of the rear fins (the black bars and fin edges are accent and fin2)
  const blue: ColorRef = '#2f6fe0';
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.74,
    dorsal: curve([[0, 0.042], [0.06, 0.08], [0.14, 0.132], [0.26, 0.172], [0.4, 0.186], [0.56, 0.172], [0.72, 0.122], [0.86, 0.066], [0.95, 0.046], [1, 0.043]]),
    ventral: curve([[0, 0.034], [0.07, 0.07], [0.16, 0.118], [0.3, 0.158], [0.44, 0.168], [0.58, 0.15], [0.74, 0.1], [0.88, 0.058], [0.96, 0.045], [1, 0.043]]),
    width: curve([[0, 0.02], [0.1, 0.038], [0.24, 0.05], [0.42, 0.052], [0.62, 0.042], [0.82, 0.026], [1, 0.017]]),
    axis: curve([[0, -0.012], [0.2, -0.002], [1, 0.002]]),
    expTop: 2.0,
    expBottom: 2.0,
    noseRound: 0.11,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.12, t: 0.035, groove: 0.8 },
    operculum: { t: 0.26, strength: 0.7 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  const blueFin = fin({ opacity: 0.94, color: orange, edge: 'fin2', edgeStart: male ? 0.66 : 0.74, edgeWidth: 0.16, edgeAmount: 1, pattern: 0.6, rayContrast: 0.45, irid: male ? 0.6 : 0.4, rootBlend: 0.2 });
  // preopercular spine: the "two-spined" angelfish's sharp cheek spine, pointing back from the lower cheek
  const sp = b.flank(0.215, -0.52, 1, { x: 0, y: 0, z: 0, yn: 0 });
  return {
    key: `flame_angelfish|${male ? 'm' : 'f'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2 * fl, spread: 34, rays: 16, soft: 0.3, rootH: 1.05, cup: 0.012, style: { ...blueFin, opacity: 0.9 } }),
      dorsal(b, {
        t0: 0.24,
        t1: 0.9,
        len: 0.13 * fl,
        angle0: 68,
        angle1: 22,
        profile: (s) => (0.42 + 0.58 * smoothstep(0.1, 0.8, s)) * (1 - 0.35 * smoothstep(0.88, 1, s)),
        rays: 22,
        web: 0.12,
        soft: 0.35,
        cup: 0.008,
        segS: 34,
        segR: 12,
        inset: 0.03,
        style: blueFin,
      }),
      anal(b, {
        t0: 0.54,
        t1: 0.9,
        len: 0.13 * fl,
        angle0: 62,
        angle1: 22,
        profile: (s) => (0.45 + 0.55 * smoothstep(0.05, 0.75, s)) * (1 - 0.3 * smoothstep(0.88, 1, s)),
        rays: 18,
        web: 0.08,
        soft: 0.35,
        cup: 0.008,
        segS: 26,
        segR: 12,
        inset: 0.03,
        style: blueFin,
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.05,
        yn1: -0.4,
        len: 0.11,
        out: 28,
        a0: 22,
        a1: -24,
        profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s),
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.4, color: orange, pattern: 0, rayContrast: 0.4, flutter: 0.45, irid: 0.1 }),
      }),
      pelvic(b, { t: 0.33, yn0: -0.84, yn1: -0.92, tLen: 0.02, len: 0.09, out: 18, a0: -30, a1: -58, rays: 5, soft: 0.3, style: fin({ opacity: 0.92, color: orange, edge: blue, edgeStart: 0.55, edgeWidth: 0.3, pattern: 0, rayContrast: 0.35, irid: 0.15 }) }),
    ],
    extras: [{ kind: 'spine', path: [[sp.x + 0.004, sp.y, sp.z - 0.002], [sp.x - 0.02, sp.y - 0.003, sp.z + 0.002], [sp.x - 0.04, sp.y - 0.006, sp.z + 0.003]], radius: 0.0045, taper: 0.15, mirror: true, t: 0.215 }],
    eye: eye({ t: 0.16, yn: 0.33, r: 0.034, protrude: 0.38, forward: 0.22, up: 0.1, pupil: 0.46, iris: 'eye', ring: '#e8a33a', ringWidth: 0.1, socket: 'body' }),
    motion: motion({
      wavelength: 1.15,
      amp: 0.05,
      idleAmp: 0.014,
      envPow: 2.5,
      headSway: 0.05,
      bendK: 0.8,
      pectoralHz: 3.4,
      idleFlutter: 0.6,
      finSoft: 0.45,
      finRest: 0.85,
      sag: 0.05,
      idleHz: 0.7,
      finLag: 0.8,
      breathe: 0.6,
    }),
    look: look({
      slots: { body: orange, body2: 'body2', accent: 'accent' },
      dorsalDark: 0.35,
      bellyLine: -0.6,
      bellyAmount: 0.2,
      bellySoft: 0.4,
      scales: { cols: 40, strength: 0.4, kind: 'ctenoid' },
      roughness: 0.4,
      gloss: 0.55,
      iridMode: 'back',
      iridHue: 0.6,
      sss: 0.55,
      lateralLine: 0.1,
      appendageColor: 'fin2',
      lipColor: 'body',
      patternMap: { solid: 'bars' },
      // four or five short black bars on the upper flank
      patA: [0, 0.05, -0.06, -0.35],
      marks: [
        // yellow-orange glow on the mid-flank, the rear of the back deeper red
        { t: 0.45, yn: -0.1, rt: 0.28, ryn: 0.55, color: 'body2', strength: 0.55, soft: 0.8 },
        { t: 0.8, yn: 0.4, rt: 0.2, ryn: 0.6, color: '#c8281a', strength: 0.35, soft: 0.8 },
        // electric-blue bars at the rear of the dorsal and anal fins (fins only)
        { t: 0.82, yn: 1, rt: 0.1, ryn: 0.4, color: blue, strength: male ? 0.85 : 0.6, soft: 0.5, onFins: 2 },
        { t: 0.82, yn: -1, rt: 0.1, ryn: 0.4, color: blue, strength: male ? 0.85 : 0.6, soft: 0.5, onFins: 2 },
      ],
    }),
    pickRadius: 0.55,
  };
};
