/**
 * Lyretail anthias (Pseudanthias squamipinnis, chunk 16) — a spindle-shaped, flattened basslet with a big eye, a long
 * continuous dorsal fin and a deeply forked lyre tail. Females (and young) are golden orange with a violet-edged streak
 * from below the eye to the pectoral base. Males are purplish pink with a pink-orange face streak, a red patch on the
 * pectoral fin, a blue anal fin, long pelvic fins, much longer tail lobes and a long third dorsal spine. The plan reads
 * the creature's sex (protogynous: a female that turns male is rebuilt with the male's colours and fins).
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan } from '../core/plan';
import type { CreatureVisualParams } from '@/types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale, isJuvenile } from './common';
import { mixHex } from '../core/palette';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const male = !isFemale(args) && !isJuvenile(args) && args.creature?.sex === 'male';
  const fl = bucket(finScale(args, 1), 0.1);
  // males: purplish pink, the "Richly coloured" grade (a deeper body colour) deepens them too
  const recolor: Partial<CreatureVisualParams> | undefined = male
    ? { bodyColor: mixHex('#d63c7e', a.bodyColor, 0.12), bodyColor2: '#a8306a', bellyColor: '#f08db2', finColor: '#d65a8e', finColor2: '#f2c230', accentColor: '#f28a5c' }
    : undefined;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.77,
    dorsal: curve([[0, 0.03], [0.06, 0.055], [0.14, 0.09], [0.26, 0.118], [0.4, 0.125], [0.56, 0.112], [0.72, 0.078], [0.86, 0.05], [0.95, 0.04], [1, 0.038]]),
    ventral: curve([[0, 0.026], [0.07, 0.05], [0.16, 0.085], [0.3, 0.108], [0.44, 0.11], [0.6, 0.092], [0.76, 0.062], [0.9, 0.042], [1, 0.037]]),
    width: curve([[0, 0.022], [0.1, 0.036], [0.26, 0.046], [0.44, 0.044], [0.64, 0.032], [0.84, 0.019], [1, 0.014]]),
    axis: curve([[0, 0.004], [0.3, 0], [1, 0.002]]),
    expTop: 2.0,
    expBottom: 2.05,
    noseRound: 0.07,
    tailRound: 0.025,
    mouth: { kind: 'upturned', yn: -0.05, t: 0.035, groove: 0.7 },
    operculum: { t: 0.25, strength: 0.6 },
    cheek: 0.25,
  };
  const b = new BodySampler(body);
  const spine = male ? 2.6 : 1.4;
  const lobe = male ? 1.45 : 1;
  const finStyle = fin({ opacity: 0.88, edge: 'fin2', edgeStart: 0.8, edgeWidth: 0.16, edgeAmount: 0.55, pattern: 0.1, rayContrast: 0.4, irid: 0.25 });
  return {
    key: `lyretail_anthias|${male ? 'm' : 'f'}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'lyre', len: 0.22 * lobe * fl, spread: 40, rays: 16, soft: 0.45, rootH: 1.05, cup: 0.008, style: { ...finStyle, opacity: 0.86 } }),
      dorsal(b, {
        t0: 0.26,
        t1: 0.86,
        len: 0.085 * fl,
        angle0: 72,
        angle1: 40,
        // the third spine stands up as a filament (much longer in males)
        profile: (s) => (0.55 + 0.3 * smoothstep(0.35, 0.8, s)) * (1 - 0.3 * smoothstep(0.85, 1, s)) + spine * Math.exp(-(((s - 0.1) / 0.03) ** 2)),
        rays: 26,
        web: 0.08,
        soft: 0.4,
        cup: 0.006,
        segS: 40,
        segR: 10,
        inset: 0.03,
        style: finStyle,
      }),
      anal(b, {
        t0: 0.58,
        t1: 0.84,
        len: 0.085 * fl,
        angle0: 62,
        angle1: 32,
        profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, 0.2 + s)),
        rays: 10,
        soft: 0.35,
        style: male ? fin({ opacity: 0.9, color: '#4b6fd6', edge: '#d6e6ff', edgeStart: 0.75, edgeAmount: 0.7, pattern: 0, rayContrast: 0.35, irid: 0.4 }) : finStyle,
      }),
      pectoral(b, {
        t: 0.3,
        yn0: -0.05,
        yn1: -0.4,
        len: 0.12,
        out: 26,
        a0: 22,
        a1: -24,
        profile: (s) => 1 - 0.4 * s,
        rays: 14,
        soft: 0.35,
        style: fin({ opacity: male ? 0.8 : 0.45, color: male ? '#c8102e' : 'fin', pattern: 0, rayContrast: 0.4, flutter: 0.5, irid: 0.1 }),
      }),
      pelvic(b, { t: 0.33, yn0: -0.84, yn1: -0.92, tLen: 0.02, len: (male ? 0.13 : 0.08) * fl, out: 16, a0: -28, a1: -55, rays: 6, soft: 0.4, style: fin({ opacity: 0.9, color: male ? '#7a3cb8' : 'fin', pattern: 0, rayContrast: 0.35, irid: 0.3 }) }),
    ],
    eye: eye({ t: 0.13, yn: 0.25, r: 0.048, protrude: 0.4, forward: 0.2, up: 0.1, pupil: 0.5, iris: 'eye', ring: '#3a1a0a', ringWidth: 0.07 }),
    motion: motion({
      wavelength: 1.05,
      amp: 0.06,
      idleAmp: 0.016,
      envPow: 2.4,
      headSway: 0.06,
      pectoralHz: 3.4,
      idleFlutter: 0.55,
      finSoft: 0.6,
      finRest: 0.85,
      sag: 0.12,
      idleHz: 0.9,
      finLag: 0.9,
      breathe: 0.5,
    }),
    look: look({
      dorsalDark: 0.18,
      bellyLine: -0.45,
      bellyAmount: 0.55,
      bellySoft: 0.4,
      scales: { cols: 42, strength: 0.45, kind: 'ctenoid' },
      roughness: 0.34,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: male ? 0.8 : 0.12,
      sss: 0.6,
      lateralLine: 0.15,
      lipColor: 'body2',
      marks: [
        // the face streak from below the eye down to the pectoral base: violet in females, pink-orange in males
        { t: 0.2, yn: -0.22, rt: 0.11, ryn: 0.1, color: male ? 'accent' : '#c9a4f0', strength: 0.85, soft: 0.5, mode: 'stripe', rot: -0.55 },
        { t: 0.2, yn: -0.22, rt: 0.1, ryn: 0.055, color: 'accent', strength: 1, soft: 0.35, mode: 'stripe', rot: -0.55 },
      ],
    }),
    pickRadius: 0.55,
    recolor,
  };
};
