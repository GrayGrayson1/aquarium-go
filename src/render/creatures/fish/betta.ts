/**
 * Betta splendens — long flowing fins per finType (veiltail, halfmoon, crowntail, plakat, double_tail), flaring gill
 * covers with a dark "beard", slightly upturned mouth, iridescent scales. Females carry short fins.
 * OWNER: lane "fishart".
 */
import type { CreatureFactoryArgs } from '../types';
import type { FishPlan, FinShape } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic, beard, type CaudalKind } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';

const TYPICAL: Record<string, number> = { veiltail: 1.25, halfmoon: 1.35, crowntail: 1.3, plakat: 0.65, double_tail: 1.25 };

export function bettaPlan(args: CreatureFactoryArgs): FishPlan {
  const a = args.appearance;
  const ft = (a.finType in TYPICAL ? a.finType : 'veiltail') as keyof typeof TYPICAL;
  const female = isFemale(args);
  const shortFin = ft === 'plakat' || female;
  const fl = bucket(finScale(args, TYPICAL[ft]) * (female && ft !== 'plakat' ? 0.52 : 1), 0.05);
  const deep = ft === 'plakat' ? 1.08 : 1;

  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.6,
    dorsal: curve([[0, 0.034], [0.06, 0.05], [0.16, 0.066 * deep], [0.36, 0.078 * deep], [0.56, 0.071 * deep], [0.75, 0.053], [0.9, 0.039], [1, 0.034]]),
    ventral: curve([[0, 0.03], [0.08, 0.05], [0.24, 0.072 * deep], [0.42, 0.079 * deep], [0.6, 0.065], [0.8, 0.046], [0.94, 0.036], [1, 0.034]]),
    width: curve([[0, 0.024], [0.08, 0.032], [0.24, 0.038], [0.45, 0.035], [0.7, 0.022], [0.9, 0.013], [1, 0.011]]),
    axis: curve([[0, 0.006], [0.2, 0.0], [1, 0]]),
    expTop: 2.1,
    expBottom: 2.2,
    noseRound: 0.095,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.15, t: 0.045, groove: 0.7 },
    operculum: { t: 0.23, strength: 1, flare: 1 },
    cheek: 0.25,
  };
  const b = new BodySampler(body);

  // fin colours: membrane = fin colour, edge = fin2, rich iridescent sparkle on rays
  const irid = 0.35 + (a.iridescence ?? 0.3) * 0.6;
  const op = ft === 'plakat' ? 0.9 : 0.86;
  const fins: FinShape[] = [];
  const cKind: CaudalKind = ft === 'veiltail' ? 'veiltail' : ft === 'halfmoon' ? 'halfmoon' : ft === 'crowntail' ? 'crowntail' : ft === 'double_tail' ? 'double_tail' : 'plakat';
  const webbed = ft === 'crowntail' ? 0.42 : 0;
  const rays = ft === 'crowntail' ? 14 : 18;

  if (female && ft !== 'plakat') {
    fins.push(caudal(b, { kind: 'rounded', len: 0.3 * fl * 1.3, spread: 34, rays: 16, soft: 0.6, style: fin({ opacity: op, edgeStart: 0.62, irid, pattern: 1 }) }));
  } else {
    const len = ({ veiltail: 0.38, halfmoon: 0.33, crowntail: 0.34, plakat: 0.23, double_tail: 0.33 } as Record<string, number>)[ft] * fl;
    const spread = ({ veiltail: 48, halfmoon: 88, crowntail: 66, plakat: 50, double_tail: 70 } as Record<string, number>)[ft];
    const tilt = ({ veiltail: -28, halfmoon: -2, crowntail: -8, plakat: -3, double_tail: -4 } as Record<string, number>)[ft];
    fins.push(
      caudal(b, {
        kind: cKind,
        len,
        spread,
        tilt,
        rays,
        web: webbed,
        soft: shortFin ? 0.55 : 1.15,
        droop: ft === 'veiltail' ? 0.05 * fl : 0.012,
        rootH: 1.05,
        cup: 0.02,
        segS: 40,
        segR: 18,
        style: fin({ opacity: op, edgeStart: ft === 'crowntail' ? 0.5 : 0.66, edgeWidth: 0.34, irid, pattern: 1, rayContrast: 0.75 }),
      }),
    );
  }

  // dorsal: set well back, tall at the rear; halfmoon/double tails have huge dorsals completing the "D"
  const dBig = ft === 'halfmoon' || ft === 'double_tail';
  const dT0 = ft === 'double_tail' ? 0.36 : 0.5;
  fins.push(
    dorsal(b, {
      t0: dT0,
      t1: 0.86,
      len: (shortFin ? 0.11 : dBig ? 0.2 : 0.18) * (female ? 1.25 : 1) * fl * (ft === 'plakat' ? 1.3 : 1),
      angle0: 70,
      angle1: dBig ? 12 : 26,
      profile: (s) => (0.42 + 0.58 * smoothstep(0, 0.72, s)) * (1 - 0.55 * smoothstep(0.78, 1, s)),
      rays: ft === 'crowntail' ? 9 : 12,
      web: webbed,
      soft: shortFin ? 0.45 : 0.95,
      cup: 0.012,
      droop: shortFin ? 0 : 0.015,
      segS: 26,
      segR: 14,
      style: fin({ opacity: op, edgeStart: 0.6, irid, pattern: 1, rayContrast: 0.75 }),
    }),
  );
  // anal: long base, trailing pointed rear
  fins.push(
    anal(b, {
      t0: 0.3,
      t1: 0.93,
      len: (shortFin ? 0.1 : 0.19) * fl * (female ? 1.3 : 1) * (ft === 'plakat' ? 1.35 : 1),
      angle0: 62,
      angle1: dBig ? 14 : 30,
      profile: (s) => (0.36 + 0.64 * smoothstep(0, 0.78, s)) * (1 - 0.6 * smoothstep(0.82, 1, s)),
      rays: ft === 'crowntail' ? 12 : 16,
      web: webbed,
      soft: shortFin ? 0.5 : 1.0,
      cup: 0.014,
      droop: shortFin ? 0.004 : 0.02,
      segS: 30,
      segR: 14,
      style: fin({ opacity: op, edgeStart: 0.62, irid, pattern: 1, rayContrast: 0.7 }),
    }),
  );
  // clear pectorals that flutter constantly
  fins.push(
    pectoral(b, {
      t: 0.28,
      yn0: -0.05,
      yn1: -0.42,
      len: 0.075,
      out: 34,
      a0: 20,
      a1: -26,
      rays: 10,
      soft: 0.3,
      style: fin({ opacity: 0.28, color: 'fin', rayContrast: 0.4, pattern: 0, flutter: 0.35, irid: 0.2 }),
    }),
  );
  // long ventral (pelvic) fins
  fins.push(
    pelvic(b, {
      t: 0.25,
      yn0: -0.82,
      yn1: -0.9,
      tLen: 0.02,
      len: (female ? 0.07 : 0.13) * Math.min(1.3, fl),
      out: 14,
      a0: -38,
      a1: -60,
      profile: (s) => 1 - s * 0.4,
      rays: 3,
      soft: 0.7,
      style: fin({ opacity: 0.9, edgeStart: 0.7, pattern: 0.6, rayContrast: 0.5, irid: 0.5 }),
    }),
  );
  // beard: dark membrane shown only when flaring
  fins.push(
    beard(b, {
      t: 0.17,
      yn0: -0.45,
      yn1: -0.95,
      tLen: 0.04,
      len: female ? 0.035 : 0.055,
      out: 55,
      a0: 10,
      a1: -45,
      rays: 8,
      soft: 0.4,
      style: fin({ opacity: 0.92, color: 'body2', edge: 'accent', edgeStart: 0.7, rayContrast: 0.3, pattern: 0, irid: 0.1, rest: 0 }),
    }),
  );

  return {
    key: `betta|${ft}|${female ? 'f' : 'm'}|${fl}|${deep}`,
    body,
    fins,
    eye: eye({ t: 0.1, yn: 0.22, r: 0.026, protrude: 0.34, forward: 0.3, up: 0.1, pupil: 0.52, iris: '#3a1d14', ring: '#c4903c', ringWidth: 0.07 }),
    motion: motion({
      wavelength: 1.05,
      amp: 0.06,
      idleAmp: 0.014,
      envPow: 2.0,
      headSway: 0.06,
      pectoralHz: 5.5,
      idleFlutter: 0.6,
      finSoft: shortFin ? 0.7 : 1.0,
      finRest: 0.9,
      sag: shortFin ? 0.1 : 0.6,
      idleHz: 0.6,
      finLag: 1.0,
      gillFlare: 1,
      breathe: 0.7,
    }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.55,
      bellyAmount: 0.35,
      scales: { cols: 30, strength: 0.65, kind: 'cycloid' },
      roughness: 0.32,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: 0.55,
      sss: 0.45,
      lateralLine: 0.15,
      lipColor: 'body2',
      patA: [0.5, 0.08, 0.1, 0],
    }),
    pickRadius: 0.6,
  };
}
