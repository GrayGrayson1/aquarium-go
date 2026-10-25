/**
 * Maroon clownfish (Amphiprion biaculeatus, chunk 16) — a short, deep, rounded clownfish, deeper than the ocellaris,
 * with a large spine on each cheek running back across the head bar; three narrow bars (behind the eye, mid-body, at
 * the tail base) with no black edging, white or gold by form; fins the body's red with darker edges. Young fish and
 * males are bright red; females darken to maroon or nearly black. Gold-striped and Gold Nugget fish are white-barred
 * (or white) while young: the gold comes in as they grow. Lightning and Goldflake fish wear broken, branching bars.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import type { CreatureVisualParams } from '@/types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, isFemale, isJuvenile } from './common';
import { luminance, mixHex, shadeHex } from '../core/palette';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const young = isJuvenile(args);
  // a Gold Nugget is solid gold (its body is far brighter than any red form)
  const nugget = luminance(a.bodyColor) > 0.2;
  let recolor: Partial<CreatureVisualParams> | undefined;
  if (young) {
    // young fish: bright red with white bars, whatever gold they will carry later; a young Nugget is white
    recolor = nugget
      ? { bodyColor: '#f2efe6', bodyColor2: '#e2ddd0', bellyColor: '#f6f4ee', accentColor: '#ffffff' }
      : { bodyColor: '#d01830', bodyColor2: '#a8122a', bellyColor: '#e03a44', finColor: '#c0162c', accentColor: '#f6f4ee' };
  } else if (isFemale(args) && !nugget) {
    // females: maroon to nearly black (FishBase, Fishes of Australia)
    recolor = { bodyColor: shadeHex(a.bodyColor, -0.17), bodyColor2: shadeHex(a.bodyColor2, -0.13), bellyColor: shadeHex(a.bellyColor, -0.16), finColor: shadeHex(a.finColor, -0.15), finColor2: mixHex(a.finColor2, '#1a0608', 0.5) };
  }
  const body: FishPlan['body'] = {
    noseX: 0.41,
    length: 0.77,
    dorsal: curve([[0, 0.042], [0.1, 0.09], [0.24, 0.136], [0.4, 0.148], [0.56, 0.135], [0.74, 0.09], [0.9, 0.058], [1, 0.052]]),
    ventral: curve([[0, 0.038], [0.1, 0.082], [0.3, 0.125], [0.46, 0.13], [0.62, 0.106], [0.8, 0.068], [0.94, 0.052], [1, 0.05]]),
    width: curve([[0, 0.031], [0.12, 0.058], [0.3, 0.07], [0.5, 0.062], [0.72, 0.04], [0.9, 0.023], [1, 0.02]]),
    axis: curve([[0, -0.004], [0.3, 0], [1, 0.004]]),
    expTop: 2.05,
    expBottom: 2.15,
    noseRound: 0.1,
    tailRound: 0.03,
    mouth: { kind: 'terminal', yn: -0.12, t: 0.05, groove: 0.85 },
    operculum: { t: 0.24, strength: 0.75 },
    cheek: 0.4,
  };
  const b = new BodySampler(body);
  const darkEdge = { edge: 'fin2', edgeStart: 0.76, edgeWidth: 0.14, edgeAmount: 0.85 } as const;
  // the cheek spine: from below the eye back across the head bar
  const sp = b.flank(0.17, -0.42, 1, { x: 0, y: 0, z: 0, yn: 0 });
  return {
    key: 'maroon_clownfish',
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.2, spread: 36, rays: 14, soft: 0.3, rootH: 1.0, cup: 0.01, style: fin({ opacity: 0.94, ...darkEdge, edgeStart: 0.7, pattern: 0.15, rayContrast: 0.35, irid: 0.05 }) }),
      dorsal(b, {
        t0: 0.27,
        t1: 0.55,
        len: 0.08,
        angle0: 70,
        angle1: 48,
        profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * s) - 0.25 * smoothstep(0.75, 1, s),
        rays: 10,
        web: 0.1,
        soft: 0.25,
        style: fin({ opacity: 0.95, ...darkEdge, edgeStart: 0.62, pattern: 0.15, rayContrast: 0.35, irid: 0.05 }),
      }),
      dorsal(b, {
        t0: 0.54,
        t1: 0.84,
        len: 0.125,
        angle0: 62,
        angle1: 22,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.95)),
        rays: 13,
        soft: 0.3,
        style: fin({ opacity: 0.95, ...darkEdge, pattern: 0.15, rayContrast: 0.35, irid: 0.05 }),
      }),
      anal(b, {
        t0: 0.6,
        t1: 0.83,
        len: 0.115,
        angle0: 58,
        angle1: 20,
        profile: (s) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.95)),
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.95, ...darkEdge, pattern: 0.15, rayContrast: 0.35, irid: 0.05 }),
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.02,
        yn1: -0.48,
        len: 0.115,
        out: 36,
        a0: 24,
        a1: -34,
        profile: (s) => 0.72 + 0.28 * Math.sin(Math.PI * s),
        rays: 12,
        soft: 0.3,
        style: fin({ opacity: 0.82, color: 'fin', edge: 'fin2', edgeStart: 0.82, edgeAmount: 0.4, pattern: 0, rayContrast: 0.4, flutter: 0.45, irid: 0.05 }),
      }),
      pelvic(b, { t: 0.33, yn0: -0.84, yn1: -0.92, tLen: 0.03, len: 0.085, out: 20, a0: -20, a1: -55, rays: 6, soft: 0.3, style: fin({ opacity: 0.95, ...darkEdge, edgeStart: 0.6, pattern: 0, rayContrast: 0.3, irid: 0.05 }) }),
    ],
    extras: [{ kind: 'spine', path: [[sp.x + 0.006, sp.y, sp.z - 0.002], [sp.x - 0.025, sp.y - 0.002, sp.z + 0.003], [sp.x - 0.05, sp.y + 0.002, sp.z + 0.004]], radius: 0.005, taper: 0.15, mirror: true, t: 0.17, color: 'accent' }],
    eye: eye({ t: 0.14, yn: 0.32, r: 0.038, protrude: 0.36, forward: 0.22, up: 0.1, pupil: 0.48, iris: 'eye', ring: '#3a120c', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 1.1,
      amp: 0.05,
      idleAmp: 0.016,
      envPow: 2.6,
      headSway: 0.05,
      pectoralHz: 3.8,
      idleFlutter: 0.7,
      finSoft: 0.4,
      finRest: 0.9,
      sag: 0.05,
      idleHz: 0.75,
      finLag: 0.7,
      waddle: 0.08,
      breathe: 0.7,
    }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.55,
      bellyAmount: 0.35,
      scales: { cols: 40, strength: 0.4, kind: 'ctenoid' },
      roughness: 0.4,
      gloss: 0.6,
      iridMode: 'body',
      iridHue: 0.05,
      sss: 0.55,
      bands: [
        { t: 0.225, w: 0.022, curve: 0.025, arrow: 0 },
        { t: 0.52, w: 0.024, curve: 0.0, arrow: 0.03 },
        { t: 0.93, w: 0.016, curve: 0.0, arrow: 0 },
      ],
      patternEdge: 'body2',
      patternEdgeWidth: 0.004,
      patA: [0.12, 0.6, 0, 0],
      lateralLine: 0.1,
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
    recolor,
  };
};
