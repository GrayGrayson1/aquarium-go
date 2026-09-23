/**
 * Bristlenose pleco (Ancistrus cf. cirrhosus) — flattened suckermouth catfish: broad rounded head and flat belly,
 * a body armoured in bony plates, eyes set high, a tall spiny dorsal sail, adipose fin with a spine, big spined
 * pectorals and pelvics held flat, and the namesake fleshy bristles on the snout (a full branching crown on males,
 * a short fringe on females). Long-fin / super long-fin forms grow flowing fins. OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { FishPlan, ExtraSpec, Mark } from '../core/plan';
import { curve, prng } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, adipose, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, finScale, bucket, isFemale } from './common';
import * as THREE from 'three';

export const plan: PlanFn = (args) => {
  const a = args.appearance;
  const longFin = a.finType === 'pleco_longfin';
  const fl = bucket(longFin ? finScale(args, 1.35) * 1.45 : finScale(args, 1), 0.05);
  const female = isFemale(args);
  // dorsoventrally flattened: a broad, flat shovel of a head (wider than deep), the back rising in a straight slope
  // to the dorsal-fin origin, a flat belly held on the substrate, then a strong taper into a slim, deep-ish peduncle
  const body: FishPlan['body'] = {
    noseX: 0.4,
    length: 0.76,
    dorsal: curve([[0, 0.016], [0.05, 0.036], [0.13, 0.068], [0.22, 0.096], [0.31, 0.114], [0.4, 0.116], [0.52, 0.1], [0.66, 0.074], [0.8, 0.054], [0.92, 0.042], [1, 0.038]]),
    ventral: curve([[0, 0.016], [0.06, 0.026], [0.16, 0.034], [0.34, 0.038], [0.54, 0.034], [0.74, 0.028], [0.9, 0.026], [1, 0.026]]),
    width: curve([[0, 0.074], [0.05, 0.11], [0.13, 0.132], [0.22, 0.134], [0.32, 0.118], [0.46, 0.088], [0.62, 0.058], [0.78, 0.038], [0.92, 0.026], [1, 0.021]]),
    axis: curve([[0, -0.01], [0.3, 0], [1, 0.008]]),
    expTop: curve([[0, 2.1], [0.25, 1.9], [0.6, 1.8], [1, 2]]),
    expBottom: 6,
    expSide: curve([[0, 2.4], [0.3, 2.2], [0.6, 2], [1, 2]]),
    noseRound: 0.055,
    tailRound: 0.03,
    mouth: { kind: 'sucker', yn: -0.9, t: 0.07, groove: 0.3 },
    operculum: { t: 0.22, strength: 0.4 },
    cheek: 0.15,
  };
  const b = new BodySampler(body);

  // fleshy bristles around the snout margin (males: a crown up onto the forehead, some forked)
  const extras: ExtraSpec[] = [];
  const rnd = prng(female ? 17 : 91);
  // males: ~10 tentacles around the snout margin plus a paired row running back up the top of the snout
  // (the classic "antler" crown); females: a short fringe along the snout margin only
  const nMargin = female ? 8 : 10;
  const n = female ? 8 : 17;
  const nrm = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const margin = i < nMargin;
    const u = margin ? (i + 0.5) / nMargin : (i - nMargin + 0.5) / (n - nMargin);
    const t = margin ? (female ? 0.01 + rnd() * 0.03 : 0.008 + rnd() * 0.026) : 0.03 + u * 0.1 + (rnd() - 0.5) * 0.012;
    const yn = margin ? (female ? -0.35 + u * 0.55 : -0.4 + u * 0.95) + (rnd() - 0.5) * 0.08 : 0.8 + rnd() * 0.12;
    const th = b.flankTheta(t, Math.min(0.95, yn), 1);
    const p = b.point(t, th, { x: 0, y: 0, z: 0, yn: 0 });
    b.normal(t, th, nrm);
    const len = female ? 0.013 + rnd() * 0.008 : margin ? 0.03 + rnd() * 0.022 : (0.036 + rnd() * 0.014) * (1.15 - u * 0.75);
    // stand up off the skin, leaning slightly forward, then curl back at the tip
    const dir = new THREE.Vector3(nrm.x * 0.8 + 0.25, nrm.y + 0.35, nrm.z * 0.8).normalize();
    const base = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(nrm, -0.002);
    const mid = base.clone().addScaledVector(dir, len * 0.55);
    const tip = base.clone().addScaledVector(dir, len).add(new THREE.Vector3(-len * 0.25, len * 0.1, 0));
    extras.push({
      kind: 'bristle',
      t,
      radius: female ? 0.004 : 0.0058,
      taper: 0.3,
      mirror: true,
      path: [
        [base.x, base.y, base.z],
        [mid.x, mid.y, mid.z],
        [tip.x, tip.y, tip.z],
      ],
    });
    if (!female && len > 0.028 && rnd() < 0.55) {
      // antler-like fork
      const side = new THREE.Vector3(-dir.z, 0.2, dir.x).normalize();
      const btip = mid.clone().addScaledVector(dir, len * 0.28).addScaledVector(side, len * 0.3);
      extras.push({ kind: 'bristle', t, radius: 0.0038, taper: 0.35, mirror: true, path: [[mid.x, mid.y, mid.z], [btip.x, btip.y, btip.z]] });
    }
  }

  const marks: Mark[] = [
    // paler lips/sucker disc edge and a darker crown
    { t: 0.08, yn: -0.85, rt: 0.08, ryn: 0.25, color: 'belly', strength: 0.4, soft: 0.8 },
    { t: 0.25, yn: 0.85, rt: 0.2, ryn: 0.3, color: 'body2', strength: 0.45, soft: 0.8 },
  ];
  const spotty = fin({ opacity: 0.86, color: 'fin', edge: 'fin2', edgeStart: 0.7, edgeWidth: 0.25, edgeAmount: 0.5, rayContrast: 0.85, pattern: 0.9, irid: 0.05, rootBlend: 0.08 });
  const soft = longFin ? 1.0 : 0.35;
  return {
    key: `bristlenose|${female ? 'f' : 'm'}|${longFin ? 'L' : 's'}|${fl}`,
    body,
    fins: [
      caudal(b, {
        kind: longFin ? 'spade' : 'emarginate',
        len: 0.22 * fl,
        spread: longFin ? 34 : 32,
        tilt: -6,
        fork: 0.35,
        rays: 14,
        soft,
        rootH: 1.0,
        droop: longFin ? 0.03 : 0,
        style: spotty,
      }),
      // tall spiny dorsal sail
      dorsal(b, {
        t0: 0.34,
        t1: 0.6,
        len: 0.175 * (longFin ? fl * 0.9 : 1),
        angle0: 70,
        angle1: longFin ? 22 : 30,
        profile: (s) => (1 - 0.32 * s) * (0.94 + 0.06 * Math.sin(Math.PI * s)),
        rays: 8,
        web: longFin ? 0.05 : 0.12,
        soft,
        cup: 0.01,
        droop: longFin ? 0.03 : 0,
        style: spotty,
      }),
      adipose(b, { t0: 0.82, t1: 0.9, len: 0.04, angle: 30, soft: 0.2, style: fin({ ...spotty, opacity: 0.8 }) }),
      anal(b, { t0: 0.66, t1: 0.73, len: 0.055 * (longFin ? 1.4 : 1), angle0: 50, angle1: 28, rays: 5, soft, style: spotty }),
      // big spined pectorals held low and flat
      // big spined pectoral fans held out flat and wide, like a pair of paddles either side of the head
      pectoral(b, {
        t: 0.19,
        yn0: -0.7,
        yn1: -0.94,
        len: 0.2 * (longFin ? 1.2 : 1),
        out: 54,
        a0: 22,
        a1: -24,
        profile: (s) => (1 - 0.3 * s) * (0.9 + 0.1 * Math.sin(Math.PI * s)),
        rays: 7,
        web: 0.06,
        soft: longFin ? 0.7 : 0.25,
        style: fin({ ...spotty, flutter: 0.12 }),
      }),
      pelvic(b, {
        t: 0.45,
        yn0: -0.95,
        yn1: -0.98,
        tLen: 0.06,
        len: 0.15 * (longFin ? 1.25 : 1),
        out: 66,
        a0: -6,
        a1: -34,
        rays: 6,
        soft: longFin ? 0.7 : 0.25,
        style: spotty,
      }),
    ],
    // small eyes set high on top of the flat head, looking up and out
    eye: eye({ t: 0.21, yn: 0.72, r: 0.024, protrude: 0.4, forward: 0.16, up: 0.7, pupil: 0.46, iris: 'eye', ring: 'body2', ringWidth: 0.14, socket: 'body2', swivel: 0.4 }),
    extras,
    motion: motion({
      wavelength: 1.0,
      amp: 0.05,
      idleAmp: 0.006,
      envPow: 2.4,
      headSway: 0.03,
      bendK: 0.7,
      pectoralHz: 2.5,
      idleFlutter: 0.15,
      finSoft: longFin ? 0.9 : 0.4,
      finRest: 0.88,
      sag: longFin ? 0.4 : 0.05,
      idleHz: 0.45,
      finLag: 1.0,
      breathe: 0.4,
    }),
    look: look({
      dorsalDark: 0.2,
      bellyLine: -0.6,
      bellyAmount: 0.6,
      bellySoft: 0.3,
      scales: { cols: 16, strength: 0.36, kind: 'plates' },
      roughness: 0.6,
      gloss: 0.25,
      iridMode: 'body',
      sss: 0.35,
      lateralLine: 0,
      patA: [16, -0.3, 0.15, 0],
      patternBellyFade: -0.6,
      marks,
      lipColor: 'belly',
      appendageColor: 'body',
    }),
    pickRadius: 0.6,
  };
};
