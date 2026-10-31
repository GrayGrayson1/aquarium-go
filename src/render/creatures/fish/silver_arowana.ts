/**
 * Silver arowana (Osteoglossum bicirrhosum, chunk 17) — a long, flat-sided blade with a straight back, huge mirror-like
 * scales, an upturned "trapdoor" mouth with two forward-pointing barbels on the chin, long low pectorals, and the dorsal
 * and anal fins far back, almost joined to the small pointed tail. Bright silver with rosy scale edges in older fish,
 * blue-green glints and reddish margins to the rear fins. Young carry a dark stripe along the flank; males are slimmer
 * with a longer anal fin.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { ExtraSpec, FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, isFemale, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const female = isFemale(args);
  const young = isJuvenile(args);
  const d = female ? 1.08 : 1;
  const body: FishPlan['body'] = {
    noseX: 0.44,
    length: 0.86,
    // a nearly straight back, the belly deepest under the pectorals, tapering to the tail
    dorsal: curve([[0, 0.016], [0.06, 0.036], [0.16, 0.05], [0.34, 0.056], [0.56, 0.056], [0.76, 0.05], [0.92, 0.038], [1, 0.032]]),
    ventral: curve([[0, 0.03], [0.06, 0.056], [0.16, 0.08 * d], [0.32, 0.084 * d], [0.52, 0.074 * d], [0.72, 0.058], [0.9, 0.04], [1, 0.032]]),
    width: curve([[0, 0.018], [0.12, 0.03], [0.32, 0.034], [0.6, 0.028], [0.86, 0.018], [1, 0.012]]),
    axis: curve([[0, 0.012], [0.2, 0], [1, 0.004]]),
    expTop: 2.2,
    expBottom: 2.5,
    noseRound: 0.04,
    tailRound: 0.02,
    mouth: { kind: 'upturned', yn: 0.4, t: 0.12, groove: 1 },
    operculum: { t: 0.22, strength: 0.8 },
    cheek: 0.2,
    keel: 0.4,
  };
  const b = new BodySampler(body);
  // the two chin barbels, pointing forward
  const c = b.flank(0.02, -0.75, 1, { x: 0, y: 0, z: 0, yn: 0 });
  const extras: ExtraSpec[] = [
    { kind: 'barbel', t: 0.02, radius: 0.004, taper: 0.35, mirror: true, path: [[c.x, c.y, c.z * 0.4], [c.x + 0.03, c.y + 0.004, c.z * 0.5], [c.x + 0.06, c.y + 0.012, c.z * 0.55]] },
  ];
  const marks: Mark[] = young ? [{ t: 0.55, yn: 0, rt: 0.45, ryn: 0.1, color: '#1c2228', strength: 0.75, soft: 0.4, mode: 'stripe' }] : [];
  const rearFin = fin({ opacity: 0.82, color: 'fin', edge: 'fin2', edgeStart: 0.65, edgeWidth: 0.3, edgeAmount: 0.7, pattern: 0.3, rayContrast: 0.4, irid: 0.25 });
  return {
    key: `silver_arowana|${female ? 'f' : 'm'}|${young ? 'y' : 'a'}`,
    body,
    fins: [
      caudal(b, { kind: 'pointed', len: 0.13, spread: 30, rays: 14, soft: 0.35, rootH: 1, cup: 0, style: rearFin }),
      dorsal(b, { t0: 0.62, t1: 0.97, len: 0.07, angle0: 50, angle1: 22, profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, 0.2 + s * 0.8)), rays: 18, soft: 0.35, inset: 0.02, style: rearFin }),
      anal(b, { t0: female ? 0.58 : 0.52, t1: 0.97, len: 0.08, angle0: 55, angle1: 22, profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, 0.2 + s * 0.8)), rays: 22, soft: 0.35, inset: 0.02, style: rearFin }),
      // long, low pectorals
      pectoral(b, { t: 0.2, yn0: -0.62, yn1: -0.82, len: 0.13, out: 22, a0: 10, a1: -18, profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * s), rays: 12, soft: 0.3, style: fin({ opacity: 0.55, color: 'fin', pattern: 0, rayContrast: 0.35, flutter: 0.4, irid: 0.15 }) }),
      pelvic(b, { t: 0.44, yn0: -0.88, yn1: -0.95, tLen: 0.02, len: 0.05, out: 18, a0: -22, a1: -50, rays: 6, soft: 0.3, style: fin({ opacity: 0.6, color: 'fin', pattern: 0, rayContrast: 0.3, irid: 0.1 }) }),
    ],
    eye: eye({ t: 0.08, yn: 0.45, r: 0.026, protrude: 0.35, forward: 0.15, up: 0.35, pupil: 0.45, iris: 'eye', ring: '#5a4220', ringWidth: 0.15, socket: 'body', swivel: 0.4 }),
    extras,
    motion: motion({ wavelength: 1, amp: 0.045, idleAmp: 0.01, envPow: 2.6, headSway: 0.03, bendK: 0.7, pectoralHz: 2, idleFlutter: 0.4, finSoft: 0.4, finRest: 0.8, sag: 0.02, idleHz: 0.5, finLag: 0.8, breathe: 0.5 }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.5,
      bellyAmount: 0.4,
      bellySoft: 0.5,
      // huge scales, each one catching the light
      scales: { cols: 22, strength: 0.6, kind: 'cycloid' },
      roughness: 0.22,
      gloss: 0.85,
      iridMode: 'scales',
      iridHue: 0.45,
      sss: 0.4,
      lateralLine: 0.2,
      lipColor: 'body',
      appendageColor: 'body',
      marks,
    }),
    pickRadius: 0.5,
  };
};
