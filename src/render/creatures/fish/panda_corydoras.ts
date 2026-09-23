/**
 * Panda corydoras (Corydoras panda) — stout armoured catfish: high arched back, flat belly (boxy lower section),
 * two rows of bony plates, subterminal mouth with three pairs of barbels, tall spined dorsal, adipose fin,
 * forked tail. Panda markings: black mask over each eye, black dorsal-fin blotch and a black band across the tail
 * base on a pale pink-white body. Long-fin variant grows flowing dorsal/anal/pectoral/caudal fins.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, ExtraSpec, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, adipose, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const longFin = a.finType === 'corydoras_longfin';
  const fl = bucket(finScale(args, longFin ? 1.4 : 1) * (longFin ? 1.45 : 1), 0.05);
  const pc = a.patternContrast ?? 0.95;
  const ps = a.patternScale ?? 1;

  // sloped, nearly straight armoured forehead from a short down-turned snout up to the dorsal-fin origin (the
  // highest point), keeled arched back, flat belly; head no wider than the shoulders (no bulbous "goldfish" head)
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.72,
    dorsal: curve([[0, 0.026], [0.06, 0.056], [0.13, 0.094], [0.2, 0.13], [0.28, 0.162], [0.35, 0.171], [0.45, 0.158], [0.58, 0.122], [0.74, 0.08], [0.9, 0.056], [1, 0.048]]),
    ventral: curve([[0, 0.034], [0.07, 0.064], [0.18, 0.084], [0.4, 0.093], [0.62, 0.078], [0.84, 0.053], [1, 0.044]]),
    width: curve([[0, 0.028], [0.08, 0.05], [0.18, 0.068], [0.3, 0.078], [0.44, 0.076], [0.64, 0.054], [0.86, 0.03], [1, 0.022]]),
    axis: curve([[0, -0.036], [0.12, -0.02], [0.3, -0.006], [1, 0.004]]),
    expTop: curve([[0, 1.9], [0.2, 1.6], [0.5, 1.55], [1, 1.8]]),
    expBottom: 3.6,
    noseRound: 0.065,
    tailRound: 0.03,
    mouth: { kind: 'subterminal', yn: -0.66, t: 0.05, groove: 0.6 },
    operculum: { t: 0.25, strength: 1 },
    cheek: 0.1,
  };
  const b = new BodySampler(body);

  // three pairs of barbels hanging from the underside of the snout
  const extras: ExtraSpec[] = [];
  const barbel = (t: number, yn: number, dir: [number, number, number], len: number) => {
    const p = b.flank(t, yn, 1, { x: 0, y: 0, z: 0, yn: 0 });
    const l = Math.hypot(...dir);
    const d: [number, number, number] = [dir[0] / l, dir[1] / l, dir[2] / l];
    extras.push({
      kind: 'barbel',
      t,
      radius: 0.0034,
      taper: 0.35,
      mirror: true,
      path: [
        [p.x, p.y, p.z * 0.85],
        [p.x + d[0] * len * 0.45, p.y + d[1] * len * 0.45, p.z * 0.85 + d[2] * len * 0.45],
        [p.x + d[0] * len * 0.8 - 0.004, p.y + d[1] * len * 0.8 - 0.006, p.z * 0.85 + d[2] * len * 0.8],
        [p.x + d[0] * len - 0.008, p.y + d[1] * len - 0.012, p.z * 0.85 + d[2] * len],
      ],
    });
  };
  barbel(0.035, -0.5, [0.45, -0.55, 0.7], 0.05);
  barbel(0.05, -0.78, [0.35, -0.8, 0.5], 0.042);
  barbel(0.062, -0.95, [0.5, -0.85, 0.25], 0.034);

  // panda markings
  const mk = (m: Mark): Mark => ({ ...m, strength: (m.strength ?? 1) * pc });
  const marks: Mark[] = [
    // eye mask: a narrow vertical black band from the crown down through the eye to the cheek
    mk({ t: 0.158, yn: 0.4, rt: 0.06 * (0.85 + 0.15 * ps), ryn: 1.0, color: 'accent', soft: 0.2 }),
    // black band across the caudal peduncle (spills onto the tail root)
    mk({ t: 0.955, yn: 0.05, rt: 0.05 * ps, ryn: 1.4, color: 'accent', soft: 0.3, onFins: 0.85 }),
    // dark back just under the dorsal fin (the blotch bleeds onto the body)
    mk({ t: 0.36, yn: 0.95, rt: 0.09, ryn: 0.28, color: 'accent', soft: 0.5, strength: 0.55 }),
    // warm pinkish sheen on the flank
    { t: 0.45, yn: -0.1, rt: 0.3, ryn: 0.55, color: 'body2', strength: 0.35, soft: 0.9 },
  ];

  const clear = fin({ opacity: 0.4, color: 'fin', rayContrast: 0.75, pattern: 0.3, irid: 0.2 });
  return {
    key: `panda_cory|${longFin ? 'L' : 's'}|${fl}`,
    body,
    fins: [
      caudal(b, {
        kind: longFin ? 'lyre' : 'forked',
        len: 0.235 * fl,
        spread: longFin ? 30 : 34,
        fork: 0.42,
        rays: 14,
        soft: longFin ? 1.0 : 0.45,
        rootH: 0.95,
        droop: longFin ? 0.02 : 0,
        style: fin({ ...clear, opacity: 0.45, rootBlend: 0.08 }),
      }),
      // spined dorsal: first ray is a thick spine; black blotch with a clear margin
      dorsal(b, {
        t0: 0.26,
        t1: 0.44,
        len: 0.16 * (longFin ? fl * 0.95 : 1),
        angle0: 74,
        angle1: longFin ? 26 : 40,
        profile: (s) => (1 - 0.55 * smoothstep(0, 1, s)) * (0.92 + 0.08 * Math.sin(Math.PI * s)),
        rays: 7,
        soft: longFin ? 0.95 : 0.3,
        cup: 0.01,
        droop: longFin ? 0.02 : 0,
        style: fin({ opacity: 0.88, color: 'accent', edge: 'clear', edgeStart: 0.62, edgeWidth: 0.25, edgeAmount: 0.85, rayContrast: 0.5, pattern: 0, irid: 0.1, rootBlend: 0.05 }),
      }),
      adipose(b, { t0: 0.8, t1: 0.88, len: 0.045, angle: 40, soft: 0.2, style: fin({ opacity: 0.6, color: 'fin', pattern: 0.3, rayContrast: 0 }) }),
      anal(b, {
        t0: 0.68,
        t1: 0.8,
        len: 0.08 * (longFin ? fl * 0.95 : 1),
        angle0: 58,
        angle1: 30,
        rays: 7,
        soft: longFin ? 0.9 : 0.3,
        style: fin({ ...clear, opacity: 0.4 }),
      }),
      // big pectorals with a stout leading spine, held out and down
      pectoral(b, {
        t: 0.27,
        yn0: -0.62,
        yn1: -0.9,
        len: 0.13 * (longFin ? 1.25 : 1),
        out: 52,
        a0: 8,
        a1: -28,
        profile: (s) => 1 - 0.35 * s,
        rays: 8,
        soft: longFin ? 0.6 : 0.25,
        style: fin({ ...clear, opacity: 0.42, flutter: 0.2 }),
      }),
      pelvic(b, {
        t: 0.5,
        yn0: -0.95,
        yn1: -0.98,
        tLen: 0.04,
        len: 0.075,
        out: 34,
        a0: -12,
        a1: -40,
        rays: 6,
        soft: 0.3,
        style: fin({ ...clear, opacity: 0.4 }),
      }),
    ],
    // moderate eye set high on the head and fairly flush, a gold-rimmed iris inside the black mask
    eye: eye({ t: 0.158, yn: 0.5, r: 0.03, protrude: 0.3, forward: 0.14, up: 0.28, pupil: 0.42, iris: '#2e2820', ring: '#b8a172', ringWidth: 0.18, socket: 'accent', swivel: 0.5 }),
    extras,
    motion: motion({
      wavelength: 1.0,
      amp: 0.06,
      idleAmp: 0.014,
      envPow: 2.3,
      headSway: 0.05,
      bendK: 0.8,
      pectoralHz: 3.5,
      idleFlutter: 0.45,
      finSoft: longFin ? 0.9 : 0.5,
      finRest: 0.86,
      sag: longFin ? 0.35 : 0.05,
      idleHz: 0.9,
      finLag: 0.9,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.12,
      bellyLine: -0.45,
      bellyAmount: 0.55,
      bellySoft: 0.4,
      scales: { cols: 20, strength: 0.42, kind: 'plates' },
      roughness: 0.42,
      gloss: 0.45,
      iridMode: 'body',
      iridHue: 0.05,
      sss: 0.65,
      lateralLine: 0,
      patternMap: { saddle: 'solid', bands: 'solid' },
      marks,
      lipColor: 'belly',
      appendageColor: 'body2',
    }),
    pickRadius: 0.55,
  };
};
