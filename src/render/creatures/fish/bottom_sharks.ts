/**
 * The bottom sharks (chunk 17): coral catshark (Atelomycterus marmoratus), epaulette shark (Hemiscyllium ocellatum)
 * and brown-banded bamboo shark (Chiloscyllium punctatum). One builder, three sets of numbers: a slender body that is
 * mostly tail, a short snout over an underslung mouth, small eyes high on the head, three gill slits, broad paddle-shaped
 * pectoral and pelvic fins (the epaulette walks on them), two dorsal fins set far back, a small anal fin near the tail
 * and a long, low tail fin whose upper lobe runs on along the body's line.
 * - catshark: grey-brown speckled black, the white tips of both dorsals and a white bar through the gill slits; the
 *   young are barred light and dark.
 * - epaulette: cream-gold with widely spaced brown spots and the big black, white-ringed "epaulette" over each pectoral
 *   (bodyMark 'epaulette'); short nasal barbels; the young are banded dark across the back.
 * - bamboo: the plain brown adult and its long nasal barbels; the young are cream with about ten dark bands.
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import type { CreatureVisualParams } from '@/types';
import type { ExtraSpec, FishPlan, Mark } from '../core/plan';
import { curve } from '../core/math';
import { BodySampler } from '../core/body';
import { caudal, dorsal, anal, pectoral, pelvic } from '../core/fins';
import { motion, look, eye, fin, isJuvenile } from './common';

interface SharkSpec {
  id: string;
  /** Body depth and width multipliers (the bamboo shark is the stoutest). */
  deep: number;
  wide: number;
  /** Nasal barbels: length, 0 = none. */
  barbel: number;
  /** Gill slits drawn in this colour ('fin2' for the catshark's white bar). */
  gill: Mark['color'];
  /** The young's colours. */
  young: Partial<CreatureVisualParams>;
}

const SPECS: Record<string, SharkSpec> = {
  coral_catshark: { id: 'coral_catshark', deep: 1, wide: 1, barbel: 0, gill: 'fin2', young: { pattern: 'bars', patternScale: 1.4, patternContrast: 0.8 } },
  epaulette_shark: { id: 'epaulette_shark', deep: 1, wide: 1.05, barbel: 0.012, gill: 'body2', young: { pattern: 'bars', patternScale: 1.1, patternContrast: 0.85, accentColor: '#3a2a1e' } },
  brownbanded_bamboo_shark: {
    id: 'brownbanded_bamboo_shark',
    deep: 1.15,
    wide: 1.1,
    barbel: 0.026,
    gill: 'body2',
    young: { pattern: 'bars', patternScale: 0.9, patternContrast: 0.95, bodyColor: '#e3dccd', bodyColor2: '#d4ccbb', accentColor: '#211b17' },
  },
};

const makePlan =
  (spec: SharkSpec): PlanFn =>
  (args) => {
    const a = args.appearance;
    const young = isJuvenile(args);
    const d = spec.deep;
    const w = spec.wide;
    const body: FishPlan['body'] = {
      noseX: 0.45,
      length: 0.8,
      // a short, rounded head; deepest over the pectorals, then a long, slowly tapering tail
      dorsal: curve([[0, 0.012], [0.04, 0.03 * d], [0.12, 0.044 * d], [0.26, 0.052 * d], [0.44, 0.05 * d], [0.62, 0.04 * d], [0.82, 0.028 * d], [1, 0.02]]),
      ventral: curve([[0, 0.016], [0.06, 0.032 * d], [0.16, 0.046 * d], [0.3, 0.052 * d], [0.48, 0.046 * d], [0.68, 0.032 * d], [0.88, 0.022 * d], [1, 0.016]]),
      // the head is wider than it is deep (flattened for the floor)
      width: curve([[0, 0.024], [0.08, 0.05 * w], [0.2, 0.06 * w], [0.4, 0.056 * w], [0.66, 0.036 * w], [0.86, 0.024], [1, 0.016]]),
      axis: curve([[0, -0.004], [0.2, 0], [0.8, 0.004], [1, 0.012]]),
      expTop: 2.0,
      expBottom: 1.8,
      noseRound: 0.07,
      tailRound: 0.02,
      // an underslung mouth set back under the snout
      mouth: { kind: 'subterminal', yn: -0.62, t: 0.05, groove: 0.5 },
      operculum: { t: 0.2, strength: 0 },
      cheek: 0.2,
    };
    const b = new BodySampler(body);
    const extras: ExtraSpec[] = [];
    if (spec.barbel > 0) {
      const p = b.flank(0.012, -0.45, 1, { x: 0, y: 0, z: 0, yn: 0 });
      const L = spec.barbel;
      extras.push({ kind: 'barbel', t: 0.012, radius: 0.0028, taper: 0.5, mirror: true, path: [[p.x, p.y, p.z * 0.6], [p.x - L * 0.2, p.y - L * 0.5, p.z * 0.7], [p.x - L * 0.45, p.y - L, p.z * 0.75]] });
    }
    // three gill slits behind the head (all five are there; three read at this size)
    const marks: Mark[] = [0.18, 0.205, 0.23].map((t) => ({ t, yn: -0.05, rt: 0.0035, ryn: 0.42, color: spec.gill, strength: spec.gill === 'fin2' ? 0.7 : 0.45, soft: 0.3 }));
    if (a.bodyMark === 'epaulette') {
      // the epaulette: a big black spot ringed in white above and behind each pectoral (the young have it too)
      marks.push({ t: 0.29, yn: 0.42, rt: 0.042, ryn: 0.36, color: '#0b0908', strength: 0.96, soft: 0.18 });
      marks.push({ t: 0.29, yn: 0.42, rt: 0.054, ryn: 0.46, color: '#f2ece0', strength: 0.9, soft: 0.15, mode: 'ring' });
    }
    const recolor = young ? spec.young : undefined;
    const skinFin = fin({ opacity: 1, color: 'body', edge: spec.id === 'coral_catshark' ? 'fin2' : 'fin', edgeStart: 0.72, edgeWidth: 0.28, edgeAmount: spec.id === 'coral_catshark' ? 0.9 : 0.2, pattern: 0.85, rayContrast: 0, irid: 0, rootBlend: 0.5 });
    const paddle = fin({ ...skinFin, edge: 'fin', edgeAmount: 0.15, flutter: 0.25 });
    return {
      key: `${spec.id}|${young ? 'y' : 'a'}|${a.bodyMark ?? ''}`,
      body,
      fins: [
        caudal(b, { kind: 'shark', len: 0.2, spread: 16, tilt: 6, rays: 12, soft: 0.15, rootH: 1, cup: 0, style: skinFin }),
        dorsal(b, { t0: 0.5, t1: 0.58, len: 0.062, angle0: 58, angle1: 22, profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, s * 1.2)), rays: 8, soft: 0.15, inset: 0.01, style: skinFin }),
        dorsal(b, { t0: 0.65, t1: 0.72, len: 0.054, angle0: 58, angle1: 22, profile: (s) => 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, s * 1.2)), rays: 8, soft: 0.15, inset: 0.01, style: skinFin }),
        anal(b, { t0: 0.76, t1: 0.83, len: 0.032, angle0: 50, angle1: 28, profile: (s) => 0.7 + 0.3 * Math.sin(Math.PI * s), rays: 6, soft: 0.15, inset: 0.01, style: skinFin }),
        // broad paddles, held out flat: the "legs"
        pectoral(b, { t: 0.24, yn0: -0.65, yn1: -0.9, len: 0.085, out: 64, a0: -4, a1: -42, profile: (s) => 0.65 + 0.35 * Math.sin(Math.PI * s), rays: 10, soft: 0.2, style: paddle }),
        pelvic(b, { t: 0.45, yn0: -0.85, yn1: -0.96, tLen: 0.045, len: 0.055, out: 52, a0: -10, a1: -46, rays: 8, soft: 0.2, style: paddle }),
      ],
      eye: eye({ t: 0.085, yn: 0.42, r: 0.011, protrude: 0.2, forward: 0.1, up: 0.4, pupil: 0.35, iris: 'eye', socket: 'body', swivel: 0.2 }),
      extras,
      // eel-like: a long wave down the whole body, slow and sinuous; the paddles barely move while it swims
      motion: motion({ wavelength: 0.85, amp: 0.075, idleAmp: 0.008, envPow: 1.3, headSway: 0.07, bendK: 1.15, pectoralHz: 0.7, idleFlutter: 0.15, finSoft: 0.2, finRest: 0.92, sag: 0.01, idleHz: 0.35, finLag: 0.45, breathe: 0.8 }),
      look: look({
        dorsalDark: 0.12,
        bellyLine: -0.5,
        bellyAmount: 0.8,
        bellySoft: 0.3,
        // shagreen: dermal denticles too fine to see, a matt, slightly rough skin
        scales: { cols: 90, strength: 0.05, kind: 'skin' },
        roughness: 0.6,
        gloss: 0.25,
        iridMode: 'body',
        iridHue: 0.1,
        sss: 0.3,
        lateralLine: 0,
        lipColor: 'body',
        appendageColor: 'body',
        marks,
      }),
      ...(recolor ? { recolor } : {}),
      pickRadius: 0.5,
    };
  };

export const coralCatsharkPlan = makePlan(SPECS.coral_catshark);
export const epaulettePlan = makePlan(SPECS.epaulette_shark);
export const bambooSharkPlan = makePlan(SPECS.brownbanded_bamboo_shark);
