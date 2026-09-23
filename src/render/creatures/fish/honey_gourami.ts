/**
 * Honey gourami (Trichogaster chuna) — deep, strongly compressed oval body, small pointed head with a tiny upturned
 * mouth, long-based dorsal and very long anal fin, gently rounded tail, and the gourami signature: long thread-like
 * pelvic "feelers" that sweep and touch things. Males glow honey-orange with a blue-black throat and belly, yellow
 * dorsal edge; females are silvery grey-brown with a brown lateral stripe. OWNER: lane "fishart".
 */
import type { FishPlan, Mark, LookSpec } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, thread } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale, type PlanFn } from './common';

export const plan: PlanFn = (args) => {
  const female = isFemale(args);
  const fl = bucket(finScale(args, 1), 0.05);
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.75,
    dorsal: curve([[0, 0.026], [0.07, 0.052], [0.18, 0.09], [0.36, 0.118], [0.54, 0.114], [0.72, 0.086], [0.88, 0.058], [1, 0.046]]),
    ventral: curve([[0, 0.024], [0.08, 0.05], [0.22, 0.1], [0.42, 0.126], [0.6, 0.112], [0.78, 0.08], [0.92, 0.054], [1, 0.044]]),
    width: curve([[0, 0.016], [0.1, 0.028], [0.3, 0.038], [0.5, 0.034], [0.76, 0.02], [1, 0.013]]),
    axis: curve([[0, 0.012], [0.25, 0.004], [1, 0.004]]),
    expTop: 1.95,
    expBottom: 2.0,
    noseRound: 0.07,
    tailRound: 0.03,
    mouth: { kind: 'upturned', yn: 0.36, t: 0.04, groove: 0.7 },
    operculum: { t: 0.23, strength: 0.75 },
    cheek: 0.2,
    keel: 0.35,
  };
  const b = new BodySampler(body);
  const soft = 0.75;
  const fins = [
    caudal(b, {
      kind: 'emarginate',
      len: 0.22 * fl,
      spread: 30,
      fork: 0.25,
      rays: 16,
      soft,
      rootH: 1.0,
      cup: 0.012,
      style: fin({ opacity: female ? 0.4 : 0.6, edgeStart: 0.6, edgeWidth: 0.35, edgeAmount: 0.5, pattern: 0, rayContrast: 0.6, irid: 0.2 }),
    }),
    // long dorsal: low spiny front rising to a rounded soft rear
    dorsal(b, {
      t0: 0.38,
      t1: 0.86,
      len: 0.12 * fl,
      angle0: 58,
      angle1: 24,
      profile: (s) => (0.35 + 0.65 * smoothstep(0, 0.75, s)) * (1 - 0.5 * smoothstep(0.85, 1, s)),
      rays: 14,
      soft,
      segS: 28,
      style: fin({ opacity: female ? 0.38 : 0.65, edge: 'fin2', edgeStart: 0.58, edgeWidth: 0.3, edgeAmount: 0.95, pattern: 0, rayContrast: 0.55, irid: 0.25 }),
    }),
    // very long anal fin trailing back past the peduncle
    anal(b, {
      t0: 0.3,
      t1: 0.94,
      len: 0.13 * fl,
      angle0: 60,
      angle1: 18,
      profile: (s) => (0.45 + 0.55 * smoothstep(0, 0.8, s)) * (1 - 0.45 * smoothstep(0.88, 1, s)),
      rays: 20,
      soft: soft + 0.1,
      segS: 32,
      droop: 0.006,
      style: fin({ opacity: female ? 0.38 : 0.62, edgeStart: 0.62, edgeWidth: 0.3, edgeAmount: 0.6, pattern: 0, rayContrast: 0.55, irid: 0.25 }),
    }),
    pectoral(b, {
      t: 0.27,
      yn0: -0.15,
      yn1: -0.48,
      len: 0.075,
      out: 34,
      a0: 16,
      a1: -30,
      rays: 10,
      soft: 0.3,
      style: fin({ opacity: 0.14, color: 'clear', pattern: 0, rayContrast: 0.35, flutter: 0.35, irid: 0.1 }),
    }),
    // thread-like pelvic feelers
    thread(b, {
      t: 0.25,
      yn0: -0.93,
      yn1: -0.952,
      len: 0.44 * Math.min(1.3, fl),
      out: 14,
      // parallel rays: a hair-thin ribbon (converging rays would cross and flip the membrane normal)
      a0: -30,
      a1: -30,
      cup: 0, // any cup bends the per-vertex normals across the hair-thin ribbon and the sweep would split it
      // low membrane billow keeps the two ribbon edges together; the feeler sweep itself comes from the thread role
      soft: 0.15,
      style: fin({ opacity: 0.9, color: female ? 'fin' : 'fin2', edge: 'fin2', edgeStart: 0.7, edgeAmount: 0.6, pattern: 0, rayContrast: 0.2, irid: 0.3, phase: 0.8 }),
    }),
  ];

  const marks: Mark[] = [];
  let slots: LookSpec['slots'];
  if (female) {
    slots = { body: '#b3a790', body2: '#8c7f68', belly: '#e1dac8', fin: '#cbbd9e', fin2: '#e2d6b6' };
    marks.push({ t: 0.52, yn: 0.02, rt: 0.42, ryn: 0.1, color: '#6b573e', strength: 0.6, soft: 0.5, mode: 'band_t' });
  } else {
    // breeding-dress male: blue-black throat, face and belly running into the front of the anal fin
    marks.push({ t: 0.3, yn: -0.74, rt: 0.24, ryn: 0.4, color: 'accent', strength: 0.68, soft: 0.65, onFins: 0.8 });
    marks.push({ t: 0.08, yn: -0.3, rt: 0.08, ryn: 0.55, color: 'accent', strength: 0.35, soft: 0.8 });
  }
  return {
    key: `honey_gourami|${female ? 'f' : 'm'}|${fl}`,
    body,
    fins,
    eye: eye({ t: 0.12, yn: 0.26, r: 0.031, protrude: 0.36, forward: 0.22, up: 0.1, pupil: 0.48, iris: '#2a1810', ring: '#c7782c', ringWidth: 0.12 }),
    motion: motion({
      wavelength: 1.1,
      amp: 0.055,
      idleAmp: 0.014,
      envPow: 2.5,
      headSway: 0.05,
      pectoralHz: 3.5,
      idleFlutter: 0.65,
      finSoft: 0.8,
      finRest: 0.85,
      sag: 0.2,
      idleHz: 0.7,
      finLag: 1.1,
      breathe: 0.6,
    }),
    look: look({
      dorsalDark: 0.25,
      bellyLine: -0.55,
      bellyAmount: female ? 0.85 : 0.45,
      scales: { cols: 30, strength: female ? 0.28 : 0.36, kind: 'ctenoid' },
      roughness: 0.36,
      gloss: 0.5,
      iridMode: 'body',
      iridHue: 0.1,
      sss: 0.6,
      lateralLine: 0.1,
      marks,
      slots,
    }),
    pickRadius: 0.55,
  };
};
