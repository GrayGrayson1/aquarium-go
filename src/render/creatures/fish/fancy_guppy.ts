/**
 * Fancy guppy (Poecilia reticulata) — and the shared livebearer plan also used by Endler's livebearer.
 * OWNER: lane "fishart".
 *
 * Males: slim body, superior mouth, big eyes, a huge colourful tail per finType (delta fan, veiltail, double/top
 * sword, lyretail, spade, round), long flowing dorsal on the big-tailed forms, rod-like gonopodium instead of an anal
 * fin, iridescent scales and tail colour bleeding onto the peduncle.
 * Females: larger, deeper plain grey-olive body, small rounded tail with a hint of colour, dark gravid spot.
 */
import type { CreatureFactoryArgs } from '../types';
import type { FishPlan, FinShape, Mark, LookSpec } from '../core/plan';
import type { PatternKind } from '@/types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic, type CaudalKind } from '../core/fins';
import { mixHex } from '../core/palette';
import { motion, look, eye, fin, finScale, bucket, isFemale, type PlanFn } from './common';

type Species = 'guppy' | 'endler';

/** Tail form per finType: caudal kind, base length (units at the phenotype's typical finLength), half-spread. */
const TAILS: Record<string, { kind: CaudalKind; len: number; spread: number; typical: number; sword?: number; fork?: number; big: boolean }> = {
  delta: { kind: 'delta', len: 0.43, spread: 33, typical: 1.45, big: true },
  veiltail: { kind: 'fan', len: 0.46, spread: 21, typical: 1.35, big: true },
  double_sword: { kind: 'sword', len: 0.19, spread: 15, typical: 1.15, sword: 2, big: false },
  top_sword: { kind: 'sword', len: 0.2, spread: 16, typical: 1.1, sword: 1, big: false },
  lyretail: { kind: 'lyre', len: 0.3, spread: 25, typical: 1.15, big: false },
  spade: { kind: 'spade', len: 0.24, spread: 19, typical: 0.85, big: false },
  round: { kind: 'rounded', len: 0.2, spread: 27, typical: 0.8, big: false },
  endler: { kind: 'emarginate', len: 0.25, spread: 26, typical: 0.95, fork: 0.35, big: false },
};

/** Per-pattern shader parameters (see shaders.ts fsPattern). */
function patternParams(p: PatternKind, sp: Species): Pick<LookSpec, 'patA' | 'patB'> {
  switch (p) {
    case 'bicolor': // tuxedo: rear half dark
      return { patA: [0.5, 0.06, 0.14, 1] };
    case 'bars': // cobra / black-bar / tiger
      return sp === 'endler' ? { patA: [-2, 0.15, 0.02, 0.35] } : { patA: [1, 0, -0.02, 0.3] };
    case 'marble': // mosaic
      return { patA: [0.06, 0, 0, 0] };
    case 'reticulated': // snakeskin / El Silverado lace
      return { patA: [6, 0.02, 0, 0] };
    case 'spots':
      return { patA: [-4, 0.05, 0.25, 0], patB: [0, 0, 0, 0] };
    default:
      return { patA: [0, 0, 0, 1] };
  }
}

export function livebearerPlan(args: CreatureFactoryArgs, sp: Species): FishPlan {
  const a = args.appearance;
  const female = isFemale(args);
  const endler = sp === 'endler';
  const ftKey = a.finType in TAILS ? a.finType : endler ? 'endler' : 'delta';
  const tail = TAILS[ftKey];
  const fl = bucket(finScale(args, tail.typical), 0.05);
  const pattern = a.pattern ?? 'solid';

  // ── body ──
  const L = female ? (endler ? 0.72 : 0.74) : endler ? 0.64 : tail.big ? 0.56 : 0.64;
  const noseX = female ? 0.42 : tail.big ? 0.45 : 0.42;
  const dk = female ? 1 : endler ? 0.95 : 0.9;
  const body: FishPlan['body'] = female
    ? {
        noseX,
        length: L,
        dorsal: curve([[0, 0.026], [0.1, 0.046], [0.28, 0.066], [0.46, 0.07], [0.66, 0.058], [0.85, 0.042], [1, 0.034]]),
        ventral: curve([[0, 0.022], [0.12, 0.05], [0.32, 0.082], [0.5, 0.09], [0.66, 0.068], [0.84, 0.042], [1, 0.032]]),
        width: curve([[0, 0.018], [0.14, 0.034], [0.36, 0.044], [0.58, 0.036], [0.84, 0.018], [1, 0.012]]),
        axis: curve([[0, 0.006], [0.3, 0], [1, 0.002]]),
        expTop: 2.1,
        expBottom: 2.2,
        noseRound: 0.085,
        tailRound: 0.03,
        mouth: { kind: 'upturned', yn: 0.28, t: 0.04, groove: 0.6 },
        operculum: { t: 0.22, strength: 0.7 },
        cheek: 0.25,
      }
    : {
        noseX,
        length: L,
        dorsal: curve([[0, 0.022], [0.06, 0.034 * dk], [0.14, 0.045 * dk], [0.28, 0.055 * dk], [0.45, 0.06 * dk], [0.66, 0.053 * dk], [0.86, 0.041], [1, 0.037]]),
        ventral: curve([[0, 0.02], [0.07, 0.033 * dk], [0.15, 0.046 * dk], [0.3, 0.058 * dk], [0.48, 0.06 * dk], [0.68, 0.047], [0.87, 0.038], [1, 0.036]]),
        width: curve([[0, 0.014], [0.14, 0.027], [0.34, 0.031], [0.6, 0.023], [0.85, 0.014], [1, 0.012]]),
        axis: curve([[0, 0.006], [0.3, 0], [1, 0.001]]),
        expTop: 2.1,
        expBottom: 2.1,
        noseRound: 0.085,
        tailRound: 0.03,
        mouth: { kind: 'upturned', yn: 0.3, t: 0.042, groove: 0.6 },
        operculum: { t: 0.22, strength: 0.75 },
        cheek: 0.2,
      };
  const b = new BodySampler(body);

  // ── fins ──
  const tailPattern = pattern === 'bicolor' ? 0.15 : pattern === 'bars' ? 0.45 : pattern === 'solid' ? 0 : 0.85;
  const fins: FinShape[] = [];
  if (female) {
    fins.push(
      caudal(b, {
        kind: endler ? 'rounded' : 'fan',
        len: (endler ? 0.2 : 0.22) * Math.sqrt(fl),
        spread: 24,
        rays: 16,
        soft: 0.45,
        rootH: 0.95,
        style: fin({ opacity: 0.42, edgeStart: 0.6, pattern: 0.2, rayContrast: 0.55, irid: 0.25 }),
      }),
      dorsal(b, { t0: 0.5, t1: 0.64, len: 0.085, angle0: 58, angle1: 24, rays: 9, soft: 0.35, style: fin({ opacity: 0.35, pattern: 0.1, rayContrast: 0.5 }) }),
      anal(b, { t0: 0.56, t1: 0.7, len: 0.08, angle0: 55, angle1: 25, rays: 9, soft: 0.35, style: fin({ opacity: 0.32, color: 'clear', pattern: 0, rayContrast: 0.45 }) }),
    );
  } else {
    fins.push(
      caudal(b, {
        kind: tail.kind,
        len: tail.len * fl,
        spread: tail.spread,
        fork: tail.fork,
        sword: tail.sword,
        tilt: tail.big ? -2 : 0,
        rays: tail.big ? 24 : 18,
        soft: tail.big ? 1.1 : 0.7,
        rootH: tail.big ? 1.05 : 0.98,
        droop: 0,
        cup: tail.big ? 0.016 : 0.01,
        segS: tail.big ? 40 : 30,
        segR: tail.big ? 18 : 14,
        style: fin({ opacity: tail.big ? 0.84 : 0.8, edge: endler ? 'fin' : undefined, edgeStart: 0.5, edgeWidth: 0.45, edgeAmount: endler ? 0.4 : undefined, pattern: tailPattern, rayContrast: 0.7, irid: 0.65 }),
      }),
    );
    // dorsal: long flowing banner on big-tailed guppies, small pointed flag otherwise
    const bigD = tail.big && !endler;
    fins.push(
      dorsal(b, {
        t0: bigD ? 0.42 : 0.46,
        t1: bigD ? 0.62 : 0.62,
        len: (bigD ? 0.2 : endler ? 0.1 : 0.12) * Math.min(1.35, fl),
        angle0: bigD ? 58 : 60,
        angle1: bigD ? 18 : 24,
        profile: bigD ? (s) => (0.4 + 0.6 * smoothstep(0, 0.8, s)) * (1 - 0.5 * smoothstep(0.85, 1, s)) : (s) => 0.9 - 0.45 * s,
        rays: 10,
        soft: bigD ? 1.0 : 0.5,
        cup: 0.01,
        droop: bigD ? 0.012 : 0,
        segS: 22,
        segR: 12,
        style: fin({ opacity: 0.78, edgeStart: 0.55, pattern: tailPattern * 0.8, rayContrast: 0.65, irid: 0.55 }),
      }),
    );
    // gonopodium: the male anal fin rolled into a slim rod pointing back
    fins.push(
      anal(b, {
        t0: 0.5,
        t1: 0.545,
        len: 0.095,
        angle0: 16,
        angle1: 10,
        profile: (s) => 1 - 0.3 * s,
        rays: 3,
        soft: 0.2,
        inset: 0.08,
        style: fin({ opacity: 0.75, color: 'body', pattern: 0, rayContrast: 0.4, irid: 0.2 }),
      }),
    );
  }
  fins.push(
    pectoral(b, {
      t: 0.26,
      yn0: -0.02,
      yn1: -0.38,
      len: 0.065,
      out: 32,
      a0: 20,
      a1: -26,
      rays: 9,
      soft: 0.3,
      style: fin({ opacity: 0.16, color: 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.25, irid: 0.1 }),
    }),
    pelvic(b, {
      t: 0.4,
      yn0: -0.86,
      yn1: -0.92,
      tLen: 0.02,
      len: female ? 0.05 : 0.045,
      out: 16,
      a0: -26,
      a1: -52,
      rays: 5,
      soft: 0.3,
      style: fin({ opacity: 0.3, pattern: 0, rayContrast: 0.4 }),
    }),
  );

  // ── markings ──
  const marks: Mark[] = [];
  if (female) {
    // gravid spot and faint olive scale reticulation
    marks.push({ t: 0.58, yn: -0.48, rt: 0.05, ryn: 0.16, color: '#2c2419', strength: 0.75, soft: 0.55 });
    marks.push({ t: 0.9, yn: 0, rt: 0.2, ryn: 1.2, color: 'fin', strength: endler ? 0.1 : 0.22, soft: 0.8 });
  } else if (endler) {
    // Endler males: metallic-green shoulder, black "comma" spot, orange flank patch, black-edged tail
    marks.push({ t: 0.26, yn: 0.12, rt: 0.075, ryn: 0.38, color: '#43b765', strength: 0.55, soft: 0.6 });
    marks.push({ t: 0.52, yn: -0.18, rt: 0.13, ryn: 0.42, color: 'body2', strength: 0.85, soft: 0.45 });
    marks.push({ t: 0.4, yn: 0.08, rt: 0.032, ryn: 0.36, color: '#141414', strength: 0.9, soft: 0.35, rot: 0.25 });
    marks.push({ t: 0.84, yn: 0.1, rt: 0.05, ryn: 0.3, color: '#141414', strength: 0.6, soft: 0.45 });
    marks.push({ t: 1.32, yn: 1.0, rt: 0.42, ryn: 0.38, color: '#141414', strength: 0.9, soft: 0.35, onFins: 1 });
    marks.push({ t: 1.32, yn: -1.0, rt: 0.42, ryn: 0.34, color: '#141414', strength: 0.8, soft: 0.35, onFins: 1 });
  } else {
    // tail colour bleeds forward onto the peduncle; iridescent shoulder sheen
    marks.push({ t: 0.93, yn: 0, rt: 0.28, ryn: 1.3, color: 'fin', strength: pattern === 'bicolor' ? 0.2 : 0.5, soft: 0.8 });
    marks.push({ t: 0.3, yn: 0.1, rt: 0.12, ryn: 0.5, color: 'accent', strength: 0.18, soft: 0.8 });
  }

  // females are plain grey-olive (a hint of the strain colour in the tail)
  const femaleSlots: LookSpec['slots'] = female
    ? {
        body: endler ? '#aaa68d' : mixHex('#8f927c', a.bodyColor, 0.12),
        body2: endler ? '#8e8a72' : '#6d705c',
        belly: '#e2e0d2',
        fin: mixHex('#b8b8a4', a.finColor, endler ? 0.15 : 0.35),
        fin2: mixHex('#cfcfbf', a.finColor2, 0.2),
      }
    : undefined;

  const pm = patternParams(pattern, sp);
  return {
    key: `${sp}|${ftKey}|${female ? 'f' : 'm'}|${fl}`,
    body,
    fins,
    eye: eye({ t: 0.1, yn: 0.28, r: female ? 0.032 : 0.028, protrude: 0.38, forward: 0.22, up: 0.12, pupil: 0.5, iris: '#1e1a16', ring: '#b9a878', ringWidth: 0.08 }),
    motion: motion({
      wavelength: 1.0,
      amp: female ? 0.07 : 0.065,
      idleAmp: 0.02,
      envPow: 2.2,
      headSway: 0.07,
      pectoralHz: 5,
      idleFlutter: 0.45,
      finSoft: female ? 0.6 : tail.big ? 1.0 : 0.75,
      finRest: 0.88,
      sag: female ? 0.08 : tail.big ? 0.14 : 0.08,
      idleHz: 1.1,
      finLag: tail.big && !female ? 1.4 : 0.9,
      breathe: 0.6,
    }),
    look: look({
      dorsalDark: female ? 0.35 : 0.22,
      bellyLine: female ? -0.35 : -0.5,
      bellyAmount: female ? 0.85 : 0.55,
      scales: { cols: female ? 30 : endler ? 32 : 28, strength: female ? 0.36 : endler ? 0.4 : 0.5, kind: 'cycloid' },
      roughness: 0.34,
      gloss: 0.55,
      iridMode: female ? 'body' : 'scales',
      iridHue: endler ? 0.4 : 0.6,
      sss: 0.55,
      lateralLine: 0.12,
      marks,
      slots: femaleSlots,
      patternMap: female ? { mottled: 'solid', bicolor: 'solid', bars: 'solid', koi: 'solid', marble: 'solid', reticulated: 'reticulated', speckled: 'solid', spots: 'solid', lateral_stripe: 'solid' } : undefined,
      patternBellyFade: -0.55,
      ...pm,
    }),
    pickRadius: 0.55,
  };
}

export const plan: PlanFn = (args) => livebearerPlan(args, 'guppy');
