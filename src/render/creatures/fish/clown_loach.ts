/**
 * Clown loach (Chromobotia macracanthus, chunk 17) — an elongate, high-backed loach with a flat belly, a pointed snout
 * and a downturned mouth with four pairs of short barbels; a deeply forked tail and red fins. Orange-gold with three
 * broad black wedge-shaped bands: through the eye, from in front of the dorsal fin into it, and from the tail base into
 * the anal fin; the dorsal and tail fins edged black. bodyMark 'borneo' (the Borneo look) draws black pelvic fins and
 * thin pale borders on the bands. Females are fuller-bodied.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { ExtraSpec, FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const fl = bucket(finScale(args, 1), 0.1);
  const female = isFemale(args);
  const borneo = a.bodyMark === 'borneo';
  const k = female ? 1.08 : 1;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.8,
    // arched back, flat belly, a long pointed snout
    dorsal: curve([[0, 0.02], [0.08, 0.05], [0.2, 0.086 * k], [0.36, 0.104 * k], [0.52, 0.1 * k], [0.7, 0.074], [0.86, 0.052], [1, 0.045]]),
    ventral: curve([[0, 0.022], [0.1, 0.046], [0.24, 0.062 * k], [0.42, 0.068 * k], [0.62, 0.058], [0.8, 0.046], [1, 0.042]]),
    width: curve([[0, 0.02], [0.12, 0.042], [0.3, 0.05], [0.55, 0.044], [0.8, 0.03], [1, 0.022]]),
    axis: curve([[0, -0.02], [0.2, -0.006], [0.4, 0], [1, 0.002]]),
    expTop: 2.1,
    expBottom: 2.6,
    noseRound: 0.06,
    tailRound: 0.03,
    mouth: { kind: 'subterminal', yn: -0.6, t: 0.04, groove: 0.6 },
    operculum: { t: 0.24, strength: 0.55 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);

  // four pairs of short barbels round the mouth
  const extras: ExtraSpec[] = [];
  const barbel = (t: number, yn: number, dir: [number, number, number], len: number) => {
    const p = b.flank(t, yn, 1, { x: 0, y: 0, z: 0, yn: 0 });
    const l = Math.hypot(...dir);
    const d: [number, number, number] = [dir[0] / l, dir[1] / l, dir[2] / l];
    extras.push({
      kind: 'barbel',
      t,
      radius: 0.0026,
      taper: 0.4,
      mirror: true,
      path: [
        [p.x, p.y, p.z * 0.85],
        [p.x + d[0] * len * 0.5, p.y + d[1] * len * 0.5, p.z * 0.85 + d[2] * len * 0.5],
        [p.x + d[0] * len, p.y + d[1] * len - 0.004, p.z * 0.85 + d[2] * len],
      ],
    });
  };
  barbel(0.02, -0.55, [0.6, -0.5, 0.5], 0.026);
  barbel(0.035, -0.7, [0.4, -0.75, 0.45], 0.024);
  barbel(0.05, -0.82, [0.25, -0.9, 0.4], 0.02);

  const ink = '#111111';
  const marks: Mark[] = [
    // the three black bands, wedge-shaped: through the eye, into the dorsal fin, from the tail base into the anal fin
    { t: 0.12, yn: 0.05, rt: 0.04, ryn: 1.2, color: ink, strength: 0.97, soft: 0.16, mode: 'band_t' },
    { t: 0.42, yn: 0.1, rt: 0.07, ryn: 1.2, color: ink, strength: 0.97, soft: 0.14, mode: 'band_t', onFins: 0.9 },
    { t: 0.8, yn: -0.1, rt: 0.075, ryn: 1.2, color: ink, strength: 0.97, soft: 0.14, mode: 'band_t', onFins: 0.9 },
  ];
  if (borneo) {
    // thin pale borders on the two body bands: a slightly wider pale band under each black one
    marks.unshift({ t: 0.8, yn: -0.1, rt: 0.088, ryn: 1.2, color: '#f6e6c0', strength: 0.6, soft: 0.1, mode: 'band_t' });
    marks.unshift({ t: 0.42, yn: 0.1, rt: 0.083, ryn: 1.2, color: '#f6e6c0', strength: 0.6, soft: 0.1, mode: 'band_t' });
  }
  const redFin = fin({ opacity: 0.92, color: 'fin', edge: 'fin2', edgeStart: 0.82, edgeWidth: 0.14, edgeAmount: 0.85, pattern: 0.25, rayContrast: 0.35, irid: 0.05, rootBlend: 0.15 });
  return {
    key: `clown_loach|${female ? 'f' : 'm'}|${borneo ? 'b' : 's'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'forked', len: 0.22 * fl, spread: 30, fork: 0.65, rays: 18, soft: 0.3, rootH: 1, cup: 0.01, style: redFin }),
      dorsal(b, { t0: 0.38, t1: 0.54, len: 0.13 * fl, angle0: 66, angle1: 34, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.3 + s * 0.8)), rays: 11, soft: 0.3, inset: 0.03, style: redFin }),
      anal(b, { t0: 0.72, t1: 0.84, len: 0.1 * fl, angle0: 60, angle1: 30, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.3 + s * 0.8)), rays: 8, soft: 0.3, inset: 0.03, style: redFin }),
      pectoral(b, { t: 0.25, yn0: -0.55, yn1: -0.8, len: 0.1, out: 30, a0: 10, a1: -30, rays: 12, soft: 0.3, style: fin({ opacity: 0.85, color: 'fin', pattern: 0, rayContrast: 0.3, flutter: 0.5, irid: 0.05 }) }),
      pelvic(b, { t: 0.46, yn0: -0.86, yn1: -0.94, tLen: 0.03, len: 0.09, out: 20, a0: -24, a1: -52, rays: 8, soft: 0.3, style: fin({ opacity: 0.9, color: borneo ? '#151515' : 'fin', pattern: 0, rayContrast: 0.3, irid: 0.05 }) }),
    ],
    eye: eye({ t: 0.12, yn: 0.2, r: 0.024, protrude: 0.3, forward: 0.18, up: 0.15, pupil: 0.5, iris: 'eye', socket: 'body', swivel: 0.3 }),
    extras,
    motion: motion({ wavelength: 0.95, amp: 0.07, idleAmp: 0.014, envPow: 2.2, headSway: 0.06, bendK: 1.05, pectoralHz: 4, idleFlutter: 0.6, finSoft: 0.4, finRest: 0.85, sag: 0.03, idleHz: 0.9, finLag: 0.8, breathe: 0.6 }),
    look: look({
      dorsalDark: 0.15,
      bellyLine: -0.55,
      bellyAmount: 0.4,
      bellySoft: 0.5,
      scales: { cols: 60, strength: 0.12, kind: 'fine' },
      roughness: 0.34,
      gloss: 0.65,
      iridMode: 'body',
      iridHue: 0.08,
      sss: 0.55,
      lateralLine: 0.1,
      // the bands are drawn as marks; no extra pattern on the flank
      patternMap: { bands: 'solid' },
      lipColor: 'body2',
      appendageColor: 'body2',
      marks,
    }),
    pickRadius: 0.5,
  };
};
