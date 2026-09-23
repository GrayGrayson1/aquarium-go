/**
 * Comet goldfish (Carassius auratus) — the slim, streamlined single-tailed goldfish: torpedo body with large metallic
 * scales, a single long deeply forked tail (finType 'comet'; 'common' has a short forked tail), single anal fin,
 * fast carangiform swimming with a streaming tail. Colours/patterns (solid, calico mottled, sarasa koi) come from the
 * appearance. OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const common = a.finType === 'common';
  const fl = bucket(finScale(args, common ? 0.8 : 1.4), 0.05);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: common ? 0.74 : 0.66,
    dorsal: curve([[0, 0.034], [0.1, 0.068], [0.25, 0.098], [0.38, 0.106], [0.55, 0.094], [0.74, 0.065], [0.9, 0.045], [1, 0.04]]),
    ventral: curve([[0, 0.03], [0.1, 0.058], [0.3, 0.086], [0.46, 0.09], [0.62, 0.072], [0.8, 0.049], [0.95, 0.038], [1, 0.036]]),
    width: curve([[0, 0.03], [0.12, 0.056], [0.3, 0.066], [0.5, 0.058], [0.72, 0.04], [0.9, 0.024], [1, 0.02]]),
    axis: curve([[0, -0.004], [0.3, 0], [1, 0.003]]),
    expTop: 2.05,
    expBottom: 2.15,
    noseRound: 0.09,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.05, t: 0.045, groove: 0.7 },
    operculum: { t: 0.23, strength: 0.85 },
    cheek: 0.3,
  };
  const b = new BodySampler(body);
  const irid = 0.3 + (a.metallic ?? 0.5) * 0.6;
  const st = fin({ opacity: 0.82, edgeStart: 0.5, edgeWidth: 0.45, rayContrast: 0.65, pattern: 0.8, irid, rootBlend: 0.1 });
  const metal = a.metallic ?? 0.5;
  return {
    key: `comet|${common ? 'c' : 'k'}|${fl}`,
    body,
    fins: [
      caudal(b, {
        kind: 'forked',
        len: (common ? 0.24 : 0.3) * fl,
        spread: common ? 32 : 26,
        fork: common ? 0.48 : 0.72,
        rays: 18,
        soft: common ? 0.55 : 1.05,
        rootH: 1.0,
        droop: common ? 0 : 0.012 * fl,
        cup: 0.012,
        segS: 30,
        segR: 16,
        style: st,
      }),
      dorsal(b, {
        t0: 0.33,
        t1: 0.62,
        len: 0.13 * Math.min(1.35, 0.85 + fl * 0.15),
        angle0: 74,
        angle1: 28,
        profile: (s) => (0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, 0.25 + s))) * (1 - 0.45 * smoothstep(0.65, 1, s)),
        rays: 13,
        soft: 0.6,
        cup: 0.01,
        style: st,
      }),
      anal(b, {
        t0: 0.72,
        t1: 0.84,
        len: 0.085 * Math.min(1.3, 0.85 + fl * 0.15),
        angle0: 58,
        angle1: 26,
        rays: 8,
        soft: 0.55,
        style: st,
      }),
      pectoral(b, { t: 0.25, yn0: -0.35, yn1: -0.7, len: 0.1, out: 30, a0: 18, a1: -34, rays: 10, soft: 0.4, style: fin({ ...st, opacity: 0.6, flutter: 0.2, pattern: 0.3 }) }),
      pelvic(b, { t: 0.46, yn0: -0.92, yn1: -0.97, tLen: 0.04, len: 0.085, out: 22, a0: -22, a1: -50, rays: 8, soft: 0.5, style: fin({ ...st, pattern: 0.4 }) }),
    ],
    eye: eye({ t: 0.12, yn: 0.2, r: 0.032, protrude: 0.4, forward: 0.2, up: 0.08, pupil: 0.46, iris: 'eye', ring: '#c69a3a', ringWidth: 0.12, socket: 'body', swivel: 0.35 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.075,
      idleAmp: 0.018,
      envPow: 2.1,
      headSway: 0.08,
      bendK: 0.9,
      pectoralHz: 3,
      idleFlutter: 0.4,
      finSoft: common ? 0.6 : 0.95,
      finRest: 0.84,
      sag: common ? 0.1 : 0.3,
      idleHz: 0.9,
      finLag: common ? 0.9 : 1.4,
      breathe: 0.6,
    }),
    look: look({
      dorsalDark: 0.28,
      bellyLine: -0.45,
      bellyAmount: 0.6,
      bellySoft: 0.38,
      scales: { cols: 24, strength: 0.3 + 0.45 * metal, kind: 'cycloid' },
      roughness: 0.5 - 0.24 * metal,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: 0.12,
      sss: 0.5,
      lateralLine: 0.35,
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
};
