/**
 * Koi (Cyprinus rubrofuscus, chunk 17) — a big, torpedo-shaped carp: a broad back, a rounded snout with a downturned
 * mouth and two pairs of barbels, big even scales, a long dorsal fin, broad pectorals and a forked tail. The variety is
 * the appearance: the ground (body), the red (accent, as the koi pattern's patches) and the black (body2). Kohaku and
 * Sanke keep their red along the back; Sanke's black is small patches. bodyMark 'showa' and 'utsuri' are black grounds
 * (body) with red and white patches, 'tancho' removes the red but for a round spot on the head.
 * scaleType 'doitsu' gives smooth skin with a row of big scales by the dorsal fin; finType 'butterfly' long, flowing fins.
 * Females are broader.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { ExtraSpec, FishPlan, Mark } from '../core/plan';
import { curve, smoothstep } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const female = isFemale(args);
  const butterfly = a.finType === 'butterfly';
  const doitsu = a.scaleType === 'doitsu';
  const mark = a.bodyMark ?? '';
  const fl = bucket(finScale(args, 1), 0.1);
  const w = female ? 1.12 : 1;
  const body: FishPlan['body'] = {
    noseX: 0.42,
    length: 0.8,
    dorsal: curve([[0, 0.026], [0.06, 0.06], [0.16, 0.096], [0.32, 0.112], [0.5, 0.106], [0.7, 0.08], [0.86, 0.056], [1, 0.046]]),
    ventral: curve([[0, 0.03], [0.08, 0.062], [0.2, 0.09], [0.38, 0.1], [0.56, 0.09], [0.74, 0.068], [0.9, 0.05], [1, 0.044]]),
    width: curve([[0, 0.028], [0.1, 0.056 * w], [0.28, 0.074 * w], [0.48, 0.07 * w], [0.7, 0.05], [0.88, 0.032], [1, 0.024]]),
    axis: curve([[0, -0.01], [0.2, 0], [1, 0.002]]),
    expTop: 2.05,
    expBottom: 2.2,
    noseRound: 0.09,
    tailRound: 0.03,
    mouth: { kind: 'subterminal', yn: -0.45, t: 0.035, groove: 0.7 },
    operculum: { t: 0.24, strength: 0.6 },
    cheek: 0.4,
  };
  const b = new BodySampler(body);

  // two pairs of barbels at the corners of the mouth: short ones above, longer below
  const extras: ExtraSpec[] = [];
  for (const [t, yn, len, dy] of [[0.025, -0.35, 0.022, -0.004], [0.045, -0.6, 0.032, -0.01]] as const) {
    const p = b.flank(t, yn, 1, { x: 0, y: 0, z: 0, yn: 0 });
    extras.push({ kind: 'barbel', t, radius: 0.003, taper: 0.4, mirror: true, path: [[p.x, p.y, p.z * 0.9], [p.x - len * 0.2, p.y + dy * 0.5, p.z + len * 0.5], [p.x - len * 0.35, p.y + dy, p.z + len]] });
  }

  const marks: Mark[] = [];
  // a light ground with dark sumi (Sanke, Bekko): body2 darker than the body
  const lum = (hex: string) => {
    const v = parseInt(hex.replace('#', '').slice(0, 6), 16);
    return Number.isFinite(v) ? ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11 : 128;
  };
  const sumi = lum(a.bodyColor2) < 60 && lum(a.bodyColor) > 180;
  // black (sumi) and red coverage for the variety, read by the koi pattern (shaders.ts)
  let patA: [number, number, number, number] = [-0.08, sumi ? 0.08 : 0, 1, 1];
  if (mark === 'tancho') {
    patA = [1, sumi ? 0.07 : 0, 1, 1];
    // the crane's red spot on the top of the head, between the eyes
    marks.push({ t: 0.15, yn: 0.95, rt: 0.06, ryn: 0.55, color: 'accent', strength: 0.97, soft: 0.25 });
  } else if (mark === 'showa') {
    // a black ground (body) with red (accent) and white (body2) patches, the black wrapping the head
    patA = [-0.04, 0.06, 0, 1];
    marks.push({ t: 0.07, yn: 0.1, rt: 0.06, ryn: 1, color: 'body', strength: 0.9, soft: 0.4 });
  } else if (mark === 'utsuri') {
    patA = [-0.05, 0, 0, 1];
    marks.push({ t: 0.06, yn: 0.2, rt: 0.06, ryn: 1, color: 'body', strength: 0.9, soft: 0.4 });
  }
  if (doitsu) {
    // the mirror scales: a row of big scales either side of the dorsal fin on otherwise smooth skin
    marks.push({ t: 0.5, yn: 0.82, rt: 0.36, ryn: 0.14, color: 'body2', strength: 0.35, soft: 0.25, mode: 'stripe' });
  }
  const long = butterfly ? 1.9 : 1;
  const k = fl * long;
  const finStyle = fin({ opacity: butterfly ? 0.6 : 0.85, color: 'fin', edge: 'fin2', edgeStart: 0.6, edgeWidth: 0.4, edgeAmount: 0.4, pattern: 0.35, rayContrast: 0.4, irid: 0.1, rootBlend: 0.2 });
  return {
    key: `koi|${female ? 'f' : 'm'}|${butterfly ? 'bf' : 'st'}|${doitsu ? 'd' : 's'}|${mark}|${sumi ? 'k' : ''}|${fl}`,
    body,
    fins: [
      caudal(b, { kind: butterfly ? 'veiltail' : 'forked', len: 0.21 * (butterfly ? 1.6 : 1) * fl, spread: 32, fork: butterfly ? 0.2 : 0.4, rays: 18, soft: butterfly ? 0.9 : 0.35, droop: butterfly ? 0.03 : 0, rootH: 1, cup: 0.01, style: finStyle }),
      dorsal(b, { t0: 0.36, t1: 0.86, len: 0.08 * k, angle0: 58, angle1: butterfly ? 18 : 30, profile: (s) => (1 - 0.45 * smoothstep(0.1, 1, s)) * (0.7 + 0.3 * smoothstep(0, 0.12, s)), rays: 18, soft: butterfly ? 0.95 : 0.35, inset: 0.03, segS: 32, style: finStyle }),
      anal(b, { t0: 0.74, t1: 0.86, len: 0.08 * k, angle0: 56, angle1: 30, profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, 0.2 + s * 0.8)), rays: 8, soft: butterfly ? 0.95 : 0.35, inset: 0.03, style: finStyle }),
      pectoral(b, { t: 0.25, yn0: -0.6, yn1: -0.85, len: 0.11 * (butterfly ? 1.6 : 1), out: 32, a0: 14, a1: -30, profile: (s) => 0.8 + 0.2 * Math.sin(Math.PI * s), rays: 16, soft: butterfly ? 0.9 : 0.3, style: fin({ ...finStyle, flutter: 0.45 }) }),
      pelvic(b, { t: 0.46, yn0: -0.86, yn1: -0.94, tLen: 0.03, len: 0.09 * (butterfly ? 1.6 : 1), out: 20, a0: -24, a1: -52, rays: 9, soft: butterfly ? 0.9 : 0.3, style: finStyle }),
    ],
    eye: eye({ t: 0.13, yn: 0.22, r: 0.024, protrude: 0.3, forward: 0.18, up: 0.12, pupil: 0.48, iris: 'eye', socket: 'body', swivel: 0.3 }),
    extras,
    motion: motion({ wavelength: 1.05, amp: 0.06, idleAmp: 0.012, envPow: 2.4, headSway: 0.05, bendK: 0.9, pectoralHz: 2.2, idleFlutter: 0.45, finSoft: butterfly ? 1 : 0.4, finRest: 0.82, sag: butterfly ? 0.12 : 0.03, idleHz: 0.55, finLag: butterfly ? 1.4 : 0.8, breathe: 0.6 }),
    look: look({
      dorsalDark: 0.08,
      bellyLine: -0.6,
      bellyAmount: 0.3,
      bellySoft: 0.45,
      scales: doitsu ? { cols: 60, strength: 0.06, kind: 'skin' } : { cols: 26, strength: 0.45, kind: 'cycloid' },
      roughness: 0.3,
      gloss: 0.6,
      iridMode: 'scales',
      iridHue: 0.1,
      sss: 0.55,
      lateralLine: 0.1,
      patA,
      lipColor: 'body',
      appendageColor: 'body',
      marks,
    }),
    pickRadius: 0.55,
  };
};
