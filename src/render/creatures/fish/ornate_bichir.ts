/**
 * Ornate bichir (Polypterus ornatipinnis, chunk 17) — a long, round, armoured body like an eel's, a broad flat head
 * with tube nostrils and a wide mouth, a row of small separate finlets along the back (a dorsal fin cut deep between its
 * spines), a rounded tail joined to the anal fin, and big fan-like pectoral fins on fleshy bases. Brownish grey with a
 * fine yellow net between black blotches that runs onto the head and fins; a pale belly. Young carry feathery external
 * gills behind the head; males have a broad, paddle-like anal fin.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { ExtraSpec, FishPlan } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, isFemale, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const female = isFemale(args);
  const young = isJuvenile(args);
  const body: FishPlan['body'] = {
    noseX: 0.44,
    length: 0.86,
    // flat-topped head, then a long, nearly even cylinder tapering to the tail
    dorsal: curve([[0, 0.016], [0.05, 0.034], [0.12, 0.046], [0.24, 0.052], [0.5, 0.052], [0.74, 0.046], [0.9, 0.036], [1, 0.03]]),
    ventral: curve([[0, 0.02], [0.06, 0.038], [0.16, 0.05], [0.3, 0.054], [0.52, 0.052], [0.74, 0.046], [0.9, 0.036], [1, 0.03]]),
    width: curve([[0, 0.026], [0.08, 0.044], [0.2, 0.052], [0.5, 0.05], [0.78, 0.04], [1, 0.026]]),
    axis: curve([[0, -0.006], [0.2, 0], [1, 0.002]]),
    expTop: 2.0,
    expBottom: 2.1,
    noseRound: 0.05,
    tailRound: 0.02,
    mouth: { kind: 'terminal', yn: -0.25, t: 0.05, groove: 0.85 },
    operculum: { t: 0.16, strength: 0.7 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  const extras: ExtraSpec[] = [];
  // tube nostrils on the snout
  const n = b.flank(0.01, 0.35, 1, { x: 0, y: 0, z: 0, yn: 0 });
  extras.push({ kind: 'bristle', t: 0.01, radius: 0.0035, taper: 0.8, mirror: true, path: [[n.x, n.y, n.z * 0.8], [n.x + 0.012, n.y + 0.003, n.z * 0.9]] });
  if (young) {
    // feathery external gills behind the head, as an axolotl's
    for (const [yn, dy] of [[0.4, 0.02], [0.15, 0.006], [-0.1, -0.008]] as const) {
      const g = b.flank(0.17, yn, 1, { x: 0, y: 0, z: 0, yn: 0 });
      extras.push({ kind: 'filament', t: 0.17, radius: 0.004, taper: 0.4, mirror: true, color: 'accent', path: [[g.x, g.y, g.z], [g.x - 0.03, g.y + dy, g.z + 0.02], [g.x - 0.055, g.y + dy * 1.6, g.z + 0.03]] });
    }
  }
  const netFin = fin({ opacity: 0.88, color: 'fin', edge: 'fin2', edgeStart: 0.2, edgeWidth: 0.7, edgeAmount: 0.35, pattern: 0.85, rayContrast: 0.55, irid: 0.05 });
  return {
    key: `ornate_bichir|${female ? 'f' : 'm'}|${young ? 'y' : 'a'}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.12, spread: 34, rays: 14, soft: 0.35, rootH: 1.1, cup: 0, style: netFin }),
      // the finlets: one long dorsal cut deep between its rays, so each spine stands up as its own small sail
      dorsal(b, { t0: 0.3, t1: 0.94, len: 0.075, angle0: 62, angle1: 50, profile: () => 1, rays: 10, web: 0.75, soft: 0.25, segS: 40, segR: 6, inset: 0.01, style: netFin }),
      anal(b, { t0: 0.86, t1: 0.97, len: female ? 0.05 : 0.07, angle0: 50, angle1: 36, profile: (s) => (female ? 0.7 : 1) * (0.7 + 0.3 * Math.sin(Math.PI * s)), rays: 10, soft: 0.3, inset: 0.01, style: netFin }),
      // big fan-like pectorals on fleshy bases: the bichir props itself on them
      pectoral(b, { t: 0.19, yn0: -0.35, yn1: -0.7, len: 0.1, out: 52, a0: 0, a1: -40, profile: (s) => 0.6 + 0.4 * Math.sin(Math.PI * s), rays: 14, soft: 0.3, style: fin({ ...netFin, rootBlend: 0.35, flutter: 0.4 }) }),
      pelvic(b, { t: 0.74, yn0: -0.8, yn1: -0.9, tLen: 0.02, len: 0.045, out: 30, a0: -20, a1: -50, rays: 7, soft: 0.3, style: netFin }),
    ],
    eye: eye({ t: 0.07, yn: 0.45, r: 0.015, protrude: 0.25, forward: 0.15, up: 0.4, pupil: 0.45, iris: 'eye', socket: 'body', swivel: 0.25 }),
    extras,
    // eel-like: a short wave travelling the whole body
    motion: motion({ wavelength: 0.7, amp: 0.06, idleAmp: 0.01, envPow: 1.4, headSway: 0.12, bendK: 1.2, pectoralHz: 2, idleFlutter: 0.4, finSoft: 0.35, finRest: 0.85, sag: 0.02, idleHz: 0.6, finLag: 0.6, breathe: 0.5 }),
    look: look({
      dorsalDark: 0.25,
      bellyLine: -0.55,
      bellyAmount: 0.75,
      bellySoft: 0.35,
      // ganoid scales: thick, diamond-shaped plates
      scales: { cols: 48, strength: 0.55, kind: 'plates' },
      roughness: 0.45,
      gloss: 0.55,
      iridMode: 'body',
      iridHue: 0.1,
      sss: 0.35,
      lateralLine: 0.15,
      // a fine net: more cells than the shader's default reticulation, thin yellow lines
      patA: [12, 0.01, 0, 0],
      patternEdge: '#0e0c08',
      patternBellyFade: -0.4,
      lipColor: 'body2',
      appendageColor: 'body',
    }),
    pickRadius: 0.5,
  };
};
