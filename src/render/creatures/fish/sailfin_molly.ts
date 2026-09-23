/**
 * Sailfin molly (Poecilia latipinna and domestic mollies) — a deep-bodied livebearer with a small upturned mouth and
 * big, clearly outlined scales. Males carry the tall sailfin dorsal (a long base from just behind the head, tallest
 * toward the rear, flared wide in display) and a rod-like gonopodium; females are bigger, rounder-bellied and have a
 * modest dorsal. Morphs come from the appearance: Wild (silver-olive with rows of dark spots that merge into stripes,
 * a spotted sail with an orange margin, orange throat on males), Black (velvety near-black with a blue sheen),
 * Dalmatian (white with black blotches), Gold, and finType 'lyretail' (long upper and lower tail lobes).
 * OWNER: lane "brackish" (fish art).
 */
import type { FishPlan, FinShape, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { luminance, mixHex } from '../core/palette';
import { motion, look, eye, fin, finScale, bucket, isFemale, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const female = isFemale(args);
  const lyre = a.finType === 'lyretail';
  const fl = bucket(finScale(args, lyre ? 1.3 : 1), 0.1);
  const pattern = a.pattern ?? 'spots';
  const dark = luminance(a.bodyColor) < 0.02;
  const wild = pattern === 'spots' || pattern === 'lined';

  // ── body ──
  const body: FishPlan['body'] = female
    ? {
        noseX: 0.42,
        length: 0.73,
        dorsal: curve([[0, 0.028], [0.08, 0.058], [0.2, 0.094], [0.36, 0.118], [0.5, 0.122], [0.66, 0.106], [0.84, 0.078], [1, 0.064]]),
        ventral: curve([[0, 0.026], [0.1, 0.064], [0.26, 0.112], [0.44, 0.138], [0.58, 0.128], [0.74, 0.09], [0.9, 0.068], [1, 0.062]]),
        width: curve([[0, 0.02], [0.12, 0.04], [0.34, 0.056], [0.56, 0.05], [0.8, 0.03], [1, 0.022]]),
        axis: curve([[0, 0.012], [0.3, 0], [1, 0.004]]),
        expTop: 2.1,
        expBottom: 2.15,
        noseRound: 0.08,
        tailRound: 0.03,
        mouth: { kind: 'upturned', yn: 0.36, t: 0.034, groove: 0.6 },
        operculum: { t: 0.22, strength: 0.7 },
        cheek: 0.3,
      }
    : {
        noseX: 0.43,
        length: 0.68,
        // males: a high, arched back under the sail and a deep peduncle
        dorsal: curve([[0, 0.026], [0.08, 0.056], [0.2, 0.092], [0.34, 0.114], [0.5, 0.118], [0.66, 0.106], [0.84, 0.082], [1, 0.07]]),
        ventral: curve([[0, 0.024], [0.1, 0.058], [0.26, 0.094], [0.44, 0.104], [0.6, 0.094], [0.78, 0.076], [1, 0.066]]),
        width: curve([[0, 0.018], [0.12, 0.036], [0.34, 0.048], [0.58, 0.04], [0.82, 0.026], [1, 0.02]]),
        axis: curve([[0, 0.01], [0.3, 0], [1, 0.004]]),
        expTop: 2.05,
        expBottom: 2.1,
        noseRound: 0.08,
        tailRound: 0.03,
        mouth: { kind: 'upturned', yn: 0.36, t: 0.034, groove: 0.6 },
        operculum: { t: 0.22, strength: 0.7 },
        cheek: 0.25,
      };
  const b = new BodySampler(body);

  // ── fins ──
  const finPat = pattern === 'dalmatian' ? 0.9 : 0;
  const fins: FinShape[] = [];
  fins.push(
    lyre
      ? caudal(b, {
          kind: 'lyre',
          len: 0.4 * fl,
          spread: 30,
          rays: 20,
          soft: 0.7,
          rootH: 1,
          cup: 0.012,
          segS: 32,
          segR: 16,
          style: fin({ opacity: 0.72, edge: dark ? 'fin2' : 'fin', edgeStart: 0.7, edgeWidth: 0.3, edgeAmount: dark ? 0.6 : 0.2, pattern: finPat, rayContrast: 0.6, irid: 0.3 }),
        })
      : caudal(b, {
          kind: female ? 'rounded' : 'truncate',
          len: (female ? 0.21 : 0.24) * fl,
          spread: female ? 28 : 32,
          rays: 18,
          soft: 0.5,
          rootH: 1,
          cup: 0.012,
          style: fin({ opacity: female ? 0.55 : 0.7, edge: wild && !female ? 'fin2' : 'fin', edgeStart: 0.82, edgeWidth: 0.18, edgeAmount: wild && !female ? 0.45 : 0.2, pattern: finPat, rayContrast: 0.6, irid: 0.3 }),
        }),
  );
  if (female) {
    fins.push(
      dorsal(b, {
        t0: 0.4,
        t1: 0.64,
        len: 0.1,
        angle0: 64,
        angle1: 26,
        profile: (s) => (0.65 + 0.35 * smoothstep(0, 0.4, s)) * (1 - 0.35 * smoothstep(0.75, 1, s)),
        rays: 12,
        soft: 0.4,
        style: fin({ opacity: 0.55, pattern: finPat, rayContrast: 0.55, irid: 0.3 }),
      }),
      anal(b, { t0: 0.58, t1: 0.72, len: 0.085, angle0: 55, angle1: 25, rays: 9, soft: 0.35, style: fin({ opacity: 0.45, pattern: finPat * 0.5, rayContrast: 0.45 }) }),
    );
  } else {
    // the sail: a long base from just behind the head, rising to a tall rounded crest over the rear body
    fins.push(
      dorsal(b, {
        t0: 0.17,
        t1: 0.8,
        len: 0.34 * Math.min(1.25, fl),
        angle0: 86,
        angle1: 36,
        profile: (s) => (0.42 + 0.58 * smoothstep(0, 0.62, s)) * (1 - 0.42 * smoothstep(0.8, 1, s)) * (1 + 0.04 * Math.sin(s * 19)),
        rays: 17,
        soft: 0.55,
        cup: 0.012,
        droop: 0.004,
        segS: 34,
        segR: 14,
        inset: 0.03,
        style: fin({ opacity: 0.8, color: 'fin', edge: 'fin2', edgeStart: 0.8, edgeWidth: 0.16, edgeAmount: wild ? 0.95 : dark ? 0.5 : 0.35, pattern: wild ? 0.8 : finPat, rayContrast: 0.75, irid: 0.55, rest: 0.72 }),
      }),
      // gonopodium: the male anal fin rolled into a slim rod pointing back
      anal(b, {
        t0: 0.48,
        t1: 0.53,
        len: 0.11,
        angle0: 16,
        angle1: 10,
        profile: (s) => 1 - 0.3 * s,
        rays: 3,
        soft: 0.2,
        inset: 0.08,
        style: fin({ opacity: 0.8, color: 'body', pattern: 0, rayContrast: 0.4, irid: 0.2 }),
      }),
    );
  }
  fins.push(
    pectoral(b, {
      t: 0.26,
      yn0: -0.02,
      yn1: -0.4,
      len: 0.075,
      out: 32,
      a0: 20,
      a1: -26,
      rays: 10,
      soft: 0.3,
      style: fin({ opacity: dark ? 0.45 : 0.2, color: dark ? 'fin' : 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.28, irid: 0.1 }),
    }),
    pelvic(b, {
      t: 0.4,
      yn0: -0.86,
      yn1: -0.92,
      tLen: 0.02,
      len: 0.05,
      out: 16,
      a0: -26,
      a1: -52,
      rays: 5,
      soft: 0.3,
      style: fin({ opacity: 0.4, pattern: 0, rayContrast: 0.4 }),
    }),
  );

  // ── markings ──
  const marks: Mark[] = [];
  if (wild) {
    // breeding colour: orange throat and chin on males, a blue-green sheen over the shoulder
    if (!female) marks.push({ t: 0.16, yn: -0.72, rt: 0.12, ryn: 0.38, color: '#e8952e', strength: 0.55, soft: 0.6 });
    marks.push({ t: 0.34, yn: 0.25, rt: 0.2, ryn: 0.55, color: '#5fa7a0', strength: female ? 0.08 : 0.2, soft: 0.8 });
  }
  if (female) {
    // gravid spot behind the vent
    marks.push({ t: 0.6, yn: -0.5, rt: 0.045, ryn: 0.15, color: dark ? '#050507' : '#2c2419', strength: 0.55, soft: 0.55 });
  }

  return {
    key: `sailfin_molly|${female ? 'f' : 'm'}|${lyre ? 'ly' : 'n'}|${fl}`,
    body,
    fins,
    eye: eye({ t: 0.1, yn: 0.26, r: female ? 0.034 : 0.032, protrude: 0.36, forward: 0.22, up: 0.12, pupil: 0.5, iris: 'eye', ring: dark ? '#3a3a40' : '#c9b784', ringWidth: 0.1 }),
    motion: motion({
      wavelength: 1.0,
      amp: 0.065,
      idleAmp: 0.018,
      envPow: 2.2,
      headSway: 0.07,
      pectoralHz: 4.5,
      idleFlutter: 0.45,
      finSoft: female ? 0.55 : 0.7,
      finRest: 0.84,
      sag: female ? 0.06 : 0.1,
      idleHz: 1,
      finLag: lyre ? 1.2 : 0.9,
      breathe: 0.6,
    }),
    look: look({
      dorsalDark: dark ? 0.3 : 0.3,
      bellyLine: -0.5,
      bellyAmount: dark ? 0.4 : 0.6,
      bellySoft: 0.4,
      // mollies show big, cleanly outlined scales
      scales: { cols: 26, strength: dark ? 0.35 : 0.5, kind: 'cycloid' },
      roughness: dark ? 0.3 : 0.34,
      gloss: 0.6,
      iridMode: dark ? 'body' : 'scales',
      iridHue: dark ? 0.62 : 0.45,
      sss: 0.5,
      lateralLine: 0.1,
      marks,
      // wild sailfins: rows of dark spots that merge into horizontal stripes (the scale grid breaks them into dots);
      // dalmatians: many small-to-medium irregular black speckles on body and fins
      patternMap: { spots: 'lined', dalmatian: 'spots' },
      patA: pattern === 'dalmatian' ? [9, 0.35, 0.02, 0] : wild ? [2.6, 22, 0.08, 0] : undefined,
      patternBellyFade: pattern === 'dalmatian' ? -0.75 : -0.45,
      slots: wild ? { accent: mixHex(a.accentColor, '#1a211d', 0.55) } : undefined,
      lipColor: 'body2',
    }),
    pickRadius: 0.55,
  };
};
