/**
 * Fuzzy dwarf lionfish (Dendrochirus brachypterus) — big, broad head with a wide mouth and fleshy tentacles above
 * the eyes; robust body tapering to a rounded, banded tail; huge fan-like pectoral fins (membrane joined, not split
 * into streamers) held spread like a skirt and banded across the rays; tall feathery venomous dorsal spines with deeply
 * incised membranes; many alternating reddish-brown and cream bands; slow, deliberate hovering.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic, spinyDorsal } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket } from './common';

export const plan: PlanFn = (args) => {
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.72,
    dorsal: curve([[0, 0.034], [0.06, 0.068], [0.14, 0.108], [0.26, 0.134], [0.4, 0.13], [0.55, 0.11], [0.7, 0.08], [0.85, 0.052], [1, 0.042]]),
    ventral: curve([[0, 0.03], [0.07, 0.066], [0.16, 0.1], [0.3, 0.116], [0.45, 0.106], [0.6, 0.086], [0.75, 0.06], [0.9, 0.044], [1, 0.04]]),
    // broad, bony head
    width: curve([[0, 0.032], [0.1, 0.062], [0.22, 0.076], [0.38, 0.068], [0.6, 0.048], [0.8, 0.028], [1, 0.019]]),
    axis: curve([[0, -0.006], [0.2, 0], [1, 0.004]]),
    expTop: 2.0,
    expBottom: 2.2,
    noseRound: 0.1,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: -0.1, t: 0.07, groove: 1 },
    operculum: { t: 0.3, strength: 0.8 },
    cheek: 0.55,
  };
  const b = new BodySampler(body);
  const banded = fin({ opacity: 0.86, color: '#d9b49a', edge: 'fin2', edgeStart: 0.85, edgeWidth: 0.15, edgeAmount: 0.6, pattern: 1, rayContrast: 0.7, irid: 0.05, rootBlend: 0.15 });
  // supraocular tentacles: fleshy, slightly branched flaps above each eye
  const eT = 0.15;
  const eYn = 0.48;
  const ep = b.flank(eT, eYn + 0.28, 1, { x: 0, y: 0, z: 0, yn: 0 });
  const tent = (dx: number, dy: number, dz: number): [number, number, number][] => [
    [ep.x, ep.y - 0.004, ep.z * 0.8],
    [ep.x + dx * 0.4, ep.y + dy * 0.45, ep.z * 0.8 + dz * 0.4],
    [ep.x + dx, ep.y + dy, ep.z * 0.8 + dz],
  ];
  return {
    key: `dwarf_lionfish|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'rounded', len: 0.22 * fl, spread: 34, rays: 14, soft: 0.35, rootH: 1.1, cup: 0.012, style: { ...banded, opacity: 0.8 } }),
      // 13 tall feathery venomous spines
      spinyDorsal(b, {
        t0: 0.24,
        t1: 0.62,
        len: 0.2 * fl,
        angle0: 80,
        angle1: 62,
        profile: (s) => (0.6 + 0.4 * smoothstep(0, 0.25, s)) * (1 - 0.35 * smoothstep(0.55, 1, s)),
        rays: 13,
        web: 0.68,
        soft: 0.3,
        cup: 0.006,
        segS: 54,
        segR: 14,
        inset: 0.04,
        style: { ...banded, opacity: 0.75, rayContrast: 1 },
      }),
      dorsal(b, {
        t0: 0.62,
        t1: 0.88,
        len: 0.11 * fl,
        angle0: 64,
        angle1: 36,
        profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, 0.15 + s)),
        rays: 10,
        soft: 0.35,
        inset: 0.04,
        style: { ...banded, opacity: 0.78 },
      }),
      anal(b, {
        t0: 0.6,
        t1: 0.84,
        len: 0.11 * fl,
        angle0: 62,
        angle1: 34,
        profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, 0.15 + s)),
        rays: 8,
        web: 0.15,
        soft: 0.35,
        inset: 0.04,
        style: { ...banded, opacity: 0.8 },
      }),
      // huge banded fan pectorals, held spread like a skirt
      pectoral(b, {
        t: 0.31,
        yn0: 0.12,
        yn1: -0.72,
        len: 0.3 * fl,
        out: 62,
        a0: 34,
        a1: -46,
        profile: (s) => (0.72 + 0.28 * Math.sin(Math.PI * Math.pow(s, 0.8))) * (1 - 0.15 * smoothstep(0.85, 1, s)),
        rays: 16,
        web: 0.2,
        soft: 0.55,
        cup: 0.03,
        segS: 26,
        segR: 16,
        foldOut: 0.35,
        style: { ...banded, opacity: 0.82, flutter: 0.12, rest: 0.95 },
      }),
      pelvic(b, {
        t: 0.33,
        yn0: -0.8,
        yn1: -0.9,
        tLen: 0.03,
        len: 0.17 * fl,
        out: 26,
        a0: -38,
        a1: -64,
        profile: (s) => 1 - 0.3 * s,
        rays: 6,
        web: 0.15,
        soft: 0.4,
        style: { ...banded, opacity: 0.85 },
      }),
    ],
    extras: [
      { kind: 'filament', path: tent(-0.012, 0.045, 0.008), radius: 0.0075, taper: 0.45, mirror: true, t: eT },
      { kind: 'filament', path: tent(-0.024, 0.03, 0.012), radius: 0.0055, taper: 0.4, mirror: true, t: eT },
    ],
    eye: eye({ t: eT, yn: eYn, r: 0.034, protrude: 0.42, forward: 0.22, up: 0.2, pupil: 0.44, iris: 'eye', ring: '#e2b27a', ringWidth: 0.08, maskColor: 'accent', socket: 'body' }),
    motion: motion({
      wavelength: 1.1,
      amp: 0.035,
      idleAmp: 0.01,
      envPow: 2.8,
      headSway: 0.03,
      bendK: 0.5,
      pectoralHz: 1.1,
      idleFlutter: 0.4,
      finSoft: 0.55,
      finRest: 0.95,
      sag: 0.12,
      idleHz: 0.35,
      finLag: 0.9,
      breathe: 0.7,
    }),
    look: look({
      // tan/salmon ground with dark reddish-brown bands, cream belly
      slots: { body: 'fin', body2: 'body', accent: 'body2' },
      patternMap: { bands: 'bars', solid: 'bars' },
      patA: [4, 0, 0.06, 0.45],
      dorsalDark: 0.3,
      bellyLine: -0.62,
      bellyAmount: 0.4,
      bellySoft: 0.3,
      scales: { cols: 44, strength: 0.25, kind: 'ctenoid' },
      roughness: 0.55,
      gloss: 0.35,
      iridMode: 'body',
      iridHue: 0.1,
      sss: 0.55,
      lateralLine: 0,
      appendageColor: 'body',
      lipColor: 'body2',
      marks: [
        // dark bar through the eye and mottled cheek, a lionfish hallmark
        { t: eT, yn: eYn - 0.1, rt: 0.03, ryn: 0.75, color: 'accent', strength: 0.65, soft: 0.5, rot: 0.25 },
        { t: 0.24, yn: -0.2, rt: 0.06, ryn: 0.45, color: 'body', strength: 0.45, soft: 0.8 },
      ],
    }),
    pickRadius: 0.7,
  };
};
