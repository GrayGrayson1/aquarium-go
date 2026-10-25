/**
 * Freshwater angelfish (Pterophyllum scalare, chunk 16) — a tall, strongly compressed disc with a steep, slightly
 * concave forehead and a small mouth; the dorsal and anal fins rise into tall, swept-back triangles, so the fish reads
 * as an arrowhead taller than it is long; the pelvic fins are long trailing threads; the tail is broad with extended
 * upper and lower rays (veil and super veil forms: everything longer, through finLength). Patterns come from the
 * appearance: 'bands' = the wild silver's four bold black bars (through the eye, from the dorsal origin, mid-body and the
 * tail base), 'bars' = zebra (extra bars), 'marble' = marble and koi, 'mottled' = smokey (the bars in front, the rear half dark), 'solid' =
 * stripeless, gold, platinum and black. The young of the barred forms show seven bars, the adults four (FishBase): a
 * young fish gets three fainter bars between the four, gone once it is grown (the plan key gains `|juv`).
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, thread } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isJuvenile } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const pat = a.pattern ?? 'bands';
  const fl = bucket(finScale(args, 1), 0.1);
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.76,
    dorsal: curve([[0, 0.04], [0.05, 0.075], [0.12, 0.13], [0.22, 0.18], [0.34, 0.2], [0.48, 0.188], [0.64, 0.14], [0.8, 0.08], [0.93, 0.045], [1, 0.04]]),
    ventral: curve([[0, 0.038], [0.06, 0.08], [0.14, 0.14], [0.26, 0.19], [0.4, 0.2], [0.54, 0.178], [0.7, 0.122], [0.84, 0.07], [0.95, 0.044], [1, 0.04]]),
    width: curve([[0, 0.024], [0.1, 0.036], [0.3, 0.042], [0.5, 0.038], [0.72, 0.028], [0.9, 0.016], [1, 0.014]]),
    axis: curve([[0, 0.006], [0.25, 0], [1, 0.002]]),
    expTop: 1.7,
    expBottom: 1.75,
    noseRound: 0.06,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.05, t: 0.03, groove: 0.7 },
    operculum: { t: 0.2, strength: 0.6 },
    cheek: 0.2,
  };
  const b = new BodySampler(body);
  const sheer = (opacity: number) => fin({ opacity, color: 'fin', edge: 'fin2', edgeStart: 0.7, edgeWidth: 0.28, edgeAmount: 0.6, pattern: 0.75, rayContrast: 0.5, irid: 0.25, rootBlend: 0.1 });
  const marks: Mark[] = [];
  const pc = a.patternContrast ?? 0.9;
  // smokey and chocolate keep the wild bars in front, with the rear half dark from about mid-dorsal back
  if (pat === 'bands' || pat === 'mottled') {
    // the wild silver's four black bars: through the eye, from the dorsal origin, mid-body, and across the tail base
    for (const [t, w] of [[0.12, 0.022], [0.32, 0.032], [0.58, 0.03], [0.9, 0.022]] as const) {
      marks.push({ t, yn: 0.05, rt: w, ryn: 1.3, color: 'accent', strength: 0.92 * pc, soft: 0.35, mode: 'band_t', onFins: 0.9 });
    }
    // a young fish's three extra, fainter bars between them (seven in all)
    if (isJuvenile(args)) {
      for (const t of [0.22, 0.45, 0.74]) marks.push({ t, yn: 0.05, rt: 0.018, ryn: 1.2, color: 'accent', strength: 0.6 * pc, soft: 0.4, mode: 'band_t', onFins: 0.7 });
    }
  }
  if (pat === 'mottled') marks.push({ t: 0.84, yn: 0, rt: 0.36, ryn: 1.5, color: 'body2', strength: 0.97, soft: 0.4, mode: 'band_t', onFins: 1.2 });
  // a reddish-orange crown on top of the head (strongest on gold and koi forms; the colour lives in body2)
  if (pat !== 'mottled') marks.push({ t: 0.08, yn: 0.85, rt: 0.1, ryn: 0.34, color: 'body2', strength: 0.75, soft: 0.65 });
  return {
    key: `freshwater_angelfish|${fl}`,
    body,
    fins: [
      caudal(b, { kind: 'lyre', len: 0.26 * fl, spread: 30, rays: 16, soft: 0.55, rootH: 1.05, cup: 0.01, segS: 28, segR: 14, style: sheer(0.65) }),
      // the tall, swept-back dorsal and anal triangles
      dorsal(b, {
        t0: 0.24,
        t1: 0.82,
        len: 0.36 * fl,
        angle0: 64,
        angle1: 12,
        profile: (s) => (0.25 + 0.75 * smoothstep(0, 0.45, s)) * (1 - 0.75 * smoothstep(0.5, 1, s)),
        rays: 24,
        soft: 0.5,
        cup: 0.01,
        segS: 36,
        segR: 16,
        inset: 0.03,
        style: sheer(0.75),
      }),
      anal(b, {
        t0: 0.3,
        t1: 0.82,
        len: 0.34 * fl,
        angle0: 60,
        angle1: 12,
        profile: (s) => (0.25 + 0.75 * smoothstep(0, 0.45, s)) * (1 - 0.75 * smoothstep(0.5, 1, s)),
        rays: 24,
        soft: 0.5,
        cup: 0.01,
        segS: 36,
        segR: 16,
        inset: 0.03,
        style: sheer(0.75),
      }),
      pectoral(b, { t: 0.24, yn0: 0.0, yn1: -0.35, len: 0.09, out: 26, a0: 20, a1: -22, rays: 10, soft: 0.3, style: fin({ opacity: 0.2, color: 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.5, irid: 0.1 }) }),
      // the long pelvic threads
      thread(b, { t: 0.24, yn0: -0.9, yn1: -0.93, len: 0.42 * Math.min(1.4, fl), out: 12, a0: -62, a1: -62, cup: 0, soft: 0.2, style: fin({ opacity: 0.9, color: 'fin', edge: 'fin2', edgeStart: 0.6, edgeAmount: 0.4, pattern: 0, rayContrast: 0.2, irid: 0.3, phase: 0.6 }) }),
    ],
    eye: eye({ t: 0.12, yn: 0.3, r: 0.04, protrude: 0.38, forward: 0.2, up: 0.1, pupil: 0.5, iris: 'eye', ring: '#3a2a1a', ringWidth: 0.1 }),
    motion: motion({ wavelength: 1.15, amp: 0.045, idleAmp: 0.012, envPow: 2.6, headSway: 0.04, bendK: 0.6, pectoralHz: 2.8, idleFlutter: 0.6, finSoft: 0.75, finRest: 0.86, sag: 0.12, idleHz: 0.6, finLag: 1.1, breathe: 0.6 }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.55,
      bellyAmount: 0.4,
      bellySoft: 0.45,
      scales: { cols: 38, strength: 0.35, kind: 'cycloid' },
      roughness: 0.3,
      gloss: 0.65,
      iridMode: 'body',
      iridHue: 0.35,
      sss: 0.55,
      lateralLine: 0.1,
      lipColor: 'body2',
      // zebra: about seven bars across the body and fins; marble: black patches whose cover follows the contrast
      // (marble mostly black, gold marble a scatter, silver gold marble a few); smokey: the marks above, no blotches
      patA: pat === 'bars' ? [-1, 0, 0.08, 0.3] : pat === 'marble' ? [0.7 - 0.75 * pc, 0, 0, 0] : undefined,
      patternMap: { mottled: 'solid' },
      marks,
    }),
    pickRadius: 0.6,
  };
};
