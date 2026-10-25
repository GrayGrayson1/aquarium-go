/**
 * Platy (Xiphophorus maculatus) and swordtail (X. hellerii), chunk 16 — the Xiphophorus livebearers, one plan with two
 * builds. The platy is short and deep with a rounded-truncate tail; the swordtail longer and slimmer, its males with the
 * "sword": the lower caudal rays drawn out into a long point. Both: a small upturned mouth, males smaller with a
 * gonopodium, females rounder with a gravid spot. Forms come from the appearance:
 *  - colours (red, gold, blue, green, black…) and pattern ('speckled' = salt and pepper);
 *  - finType 'hifin' (a tall, flag-like dorsal), 'lyretail' (long upper and lower tail rays) or 'hifin_lyretail' (both);
 *  - tailSpot ('mickey', 'moon', 'crescent', 'comet', 'twin'): the tail-base markings the wild platy is famous for;
 *  - bodyMark 'tuxedo': the black rear half; wagtails carry black fins through their fin colours.
 * OWNER: lane "fishart".
 */
import type { FishPlan, FinShape, Mark } from '../core/plan';
import type { CreatureFactoryArgs } from '../types';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale, isJuvenile } from './common';

const BLACK = '#0c0c10' as const;

function tailMarks(spot: string | undefined): Mark[] {
  switch (spot) {
    case 'mickey':
      // a big round spot at the tail base with a smaller one at the top and bottom edges of the tail root: the "Mickey Mouse"
      return [
        { t: 0.96, yn: 0, rt: 0.05, ryn: 0.52, color: BLACK, strength: 0.95, soft: 0.25, onFins: 0.9 },
        { t: 0.95, yn: 0.84, rt: 0.032, ryn: 0.3, color: BLACK, strength: 0.95, soft: 0.25, onFins: 0.9 },
        { t: 0.95, yn: -0.84, rt: 0.032, ryn: 0.3, color: BLACK, strength: 0.95, soft: 0.25, onFins: 0.9 },
      ];
    case 'moon':
      // a round spot ringed at the tail base
      return [
        { t: 0.95, yn: 0, rt: 0.06, ryn: 0.7, color: BLACK, strength: 0.9, soft: 0.2, mode: 'ring', onFins: 0.9 },
        { t: 0.95, yn: 0, rt: 0.022, ryn: 0.24, color: BLACK, strength: 0.9, soft: 0.25, onFins: 0.9 },
      ];
    case 'crescent':
      // a black crescent at the tail base: the front arc of a ring centred just behind the body (body only)
      return [{ t: 1.0, yn: 0, rt: 0.06, ryn: 1.15, color: BLACK, strength: 0.92, soft: 0.2, mode: 'ring' }];
    case 'comet':
      // black upper and lower edges of the tail
      return [
        { t: 1.2, yn: 0.7, rt: 0.17, ryn: 0.16, color: BLACK, strength: 0.92, soft: 0.35, rot: 0.3, onFins: 2 },
        { t: 1.2, yn: -0.7, rt: 0.17, ryn: 0.16, color: BLACK, strength: 0.92, soft: 0.35, rot: -0.3, onFins: 2 },
      ];
    case 'twin':
      return [
        { t: 0.97, yn: 0.5, rt: 0.03, ryn: 0.3, color: BLACK, strength: 0.92, soft: 0.25, onFins: 0.9 },
        { t: 0.97, yn: -0.5, rt: 0.03, ryn: 0.3, color: BLACK, strength: 0.92, soft: 0.25, onFins: 0.9 },
      ];
    default:
      return [];
  }
}

function xiphPlan(args: CreatureFactoryArgs, sword: boolean): FishPlan {
  const a = args.appearance;
  const female = isFemale(args) || isJuvenile(args);
  const hifin = a.finType === 'hifin' || a.finType === 'hifin_lyretail';
  const lyre = a.finType === 'lyretail' || a.finType === 'hifin_lyretail';
  const fl = bucket(finScale(args, 1), 0.1);
  // the sword only on mature males
  const swordMale = sword && !female;
  const k = sword ? 0.85 : 1.2; // platies are deep and compressed (depth ~40% of length), swordtails slimmer
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: sword ? 0.75 : 0.7,
    dorsal: curve([[0, 0.028], [0.08, 0.06 * k], [0.22, 0.1 * k], [0.38, 0.122 * k], [0.54, 0.118 * k], [0.72, 0.092 * k], [0.88, 0.07 * k], [1, 0.062 * k]]),
    ventral: curve([[0, 0.026], [0.1, 0.062 * k], [0.28, (female ? 0.118 : 0.1) * k], [0.46, (female ? 0.136 : 0.106) * k], [0.62, (female ? 0.118 : 0.094) * k], [0.78, 0.078 * k], [0.92, 0.064 * k], [1, 0.06 * k]]),
    width: curve([[0, 0.02], [0.12, 0.04], [0.34, 0.052], [0.56, 0.046], [0.8, 0.03], [1, 0.022]]),
    axis: curve([[0, 0.01], [0.3, 0], [1, 0.004]]),
    expTop: 2.1,
    expBottom: 2.15,
    noseRound: 0.08,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.34, t: 0.034, groove: 0.6 },
    operculum: { t: 0.22, strength: 0.65 },
    cheek: 0.28,
  };
  const b = new BodySampler(body);
  const finSt = (opacity: number) => fin({ opacity, color: 'fin', edge: 'fin2', edgeStart: 0.72, edgeWidth: 0.26, edgeAmount: 0.6, pattern: a.pattern === 'speckled' ? 0.6 : 0.15, rayContrast: 0.5, irid: 0.25 });
  const fins: FinShape[] = [];
  if (swordMale) {
    fins.push(caudal(b, { kind: 'sword', len: 0.24 * fl, spread: 30, rays: 18, soft: 0.45, rootH: 1, cup: 0.01, segS: 30, segR: 16, style: fin({ opacity: 0.72, color: 'fin', edge: 'fin2', edgeStart: 0.6, edgeWidth: 0.3, edgeAmount: 0.9, pattern: 0.2, rayContrast: 0.5, irid: 0.25 }) }));
  } else if (lyre) {
    fins.push(caudal(b, { kind: 'lyre', len: 0.3 * fl, spread: 32, rays: 18, soft: 0.6, rootH: 1, cup: 0.012, segS: 30, segR: 14, style: finSt(0.66) }));
  } else {
    fins.push(caudal(b, { kind: female ? 'rounded' : 'truncate', len: 0.21 * fl, spread: 30, rays: 18, soft: 0.45, rootH: 1, cup: 0.012, style: finSt(0.66) }));
  }
  fins.push(
    dorsal(b, {
      t0: 0.36,
      t1: hifin ? 0.74 : 0.62,
      len: (hifin ? 0.26 : 0.1) * fl,
      angle0: hifin ? 82 : 64,
      angle1: hifin ? 40 : 28,
      profile: (s) => (hifin ? 0.5 + 0.5 * smoothstep(0, 0.5, s) : 0.75 + 0.25 * smoothstep(0, 0.4, s)) * (1 - 0.4 * smoothstep(0.75, 1, s)),
      rays: hifin ? 14 : 11,
      soft: hifin ? 0.6 : 0.4,
      style: finSt(0.6),
    }),
  );
  if (female) {
    fins.push(anal(b, { t0: 0.58, t1: 0.72, len: 0.085, angle0: 55, angle1: 25, rays: 9, soft: 0.35, style: finSt(0.45) }));
  } else {
    // gonopodium: the male anal fin rolled into a slim rod pointing back
    fins.push(anal(b, { t0: 0.48, t1: 0.53, len: 0.11, angle0: 16, angle1: 10, profile: (s) => 1 - 0.3 * s, rays: 3, soft: 0.2, inset: 0.08, style: fin({ opacity: 0.8, color: 'body', pattern: 0, rayContrast: 0.4, irid: 0.2 }) }));
  }
  fins.push(
    pectoral(b, { t: 0.26, yn0: -0.02, yn1: -0.4, len: 0.075, out: 32, a0: 20, a1: -26, rays: 10, soft: 0.3, style: fin({ opacity: 0.2, color: 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.3, irid: 0.1 }) }),
    pelvic(b, { t: 0.4, yn0: -0.86, yn1: -0.92, tLen: 0.02, len: 0.05, out: 16, a0: -26, a1: -52, rays: 5, soft: 0.3, style: fin({ opacity: 0.45, pattern: 0, rayContrast: 0.4 }) }),
  );
  const marks: Mark[] = [...tailMarks(a.tailSpot)];
  if (a.bodyMark === 'tuxedo') {
    // the black rear half of the body (the fins keep their own colour)
    marks.unshift({ t: 0.68, yn: 0, rt: 0.26, ryn: 0.92, color: BLACK, strength: 0.88, soft: 0.35, mode: 'band_t' });
  }
  if (swordMale) {
    // the sword's black lower edge with a bright upper edge (the fin's own edge colour)
    marks.push({ t: 1.28, yn: -1, rt: 0.2, ryn: 0.15, color: BLACK, strength: 0.85, soft: 0.4, onFins: 2 });
  }
  if (female && !isJuvenile(args)) marks.push({ t: 0.6, yn: -0.5, rt: 0.045, ryn: 0.15, color: '#2c2419', strength: 0.45, soft: 0.55 });
  if (sword) {
    // the swordtail's red-brown zigzag line along the flank (wild green and its relatives)
    marks.push({ t: 0.55, yn: 0.0, rt: 0.4, ryn: 0.05, color: 'accent', strength: 0.55, soft: 0.5, mode: 'stripe' });
  }
  return {
    key: `${sword ? 'swordtail' : 'platy'}|${female ? 'f' : 'm'}|${hifin ? 'hi' : 'n'}${lyre ? 'ly' : ''}|${fl}`,
    body,
    fins,
    eye: eye({ t: 0.1, yn: 0.26, r: 0.036, protrude: 0.36, forward: 0.22, up: 0.12, pupil: 0.5, iris: 'eye', ring: '#c9b784', ringWidth: 0.1 }),
    motion: motion({ wavelength: 1.0, amp: 0.065, idleAmp: 0.018, envPow: 2.2, headSway: 0.07, pectoralHz: 4.5, idleFlutter: 0.45, finSoft: 0.55, finRest: 0.84, sag: 0.06, idleHz: 1, finLag: swordMale || lyre ? 1.1 : 0.9, breathe: 0.6 }),
    look: look({
      dorsalDark: 0.3,
      bellyLine: -0.5,
      bellyAmount: 0.55,
      bellySoft: 0.4,
      scales: { cols: 26, strength: 0.42, kind: 'cycloid' },
      roughness: 0.34,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: 0.45,
      sss: 0.55,
      lateralLine: 0.1,
      marks,
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
}

export const platyPlan = (args: CreatureFactoryArgs): FishPlan => xiphPlan(args, false);
export const swordtailPlan = (args: CreatureFactoryArgs): FishPlan => xiphPlan(args, true);
