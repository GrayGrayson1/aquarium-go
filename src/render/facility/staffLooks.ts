/**
 * Staff appearance: the venue's uniform (teal polo with a name badge) over a per-person look — skin, hair, build and
 * height derived deterministically from the staff member's avatar seed (same palettes as the visitor crowd).
 * Trousers tell the roles apart at a glance: charcoal for aquarists, navy for docents, stone for the stock manager.
 * Also the geometry for the small accessories (badge, food tub, clipboard) drawn in one instanced mesh.
 * OWNER: lane "staff".
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { StaffRole } from '@/types';
import { HAIR_STYLES, mergeParts } from './visitorGeometry';

const SKIN = ['#f3d6c1', '#eac4a6', '#dcae8a', '#c99470', '#b07a55', '#90603f', '#6f462d', '#553322'];
const HAIR = ['#1c1512', '#2e1f16', '#4a3020', '#6b4428', '#8f5a32', '#b3713a', '#d7ae6a', '#ead7a8', '#9b9894', '#e2dfd8', '#a8432c'];
const FRAMES = ['#1b1b1d', '#6b4630', '#8b1e2d', '#c9a45c'];

/** Uniform colours. */
export const STAFF_POLO = '#0f978c';
const TROUSERS: Record<StaffRole, string> = { aquarist: '#2a2e35', docent: '#26324c', stock_manager: '#5a5446' };
const SHOES: Record<StaffRole, string> = { aquarist: '#1a1b1e', docent: '#3a2a20', stock_manager: '#1a1b1e' };

export interface StaffLook {
  skin: THREE.Color;
  hair: THREE.Color;
  top: THREE.Color;
  bottom: THREE.Color;
  shoe: THREE.Color;
  frame: THREE.Color;
  hairStyle: number;
  glasses: boolean;
  height: number;
  shoulder: number;
  hip: number;
  girth: number;
  limb: number;
  headScale: number;
  // ── smoothed animation state ──
  headYaw: number;
  headPitch: number;
  /** 0..1 dither fade (camera proximity / blocking the exhibit in view). */
  fade: number;
  blocked: boolean;
  /** Smoothed work-pose blend (0 = walking/relaxed arms, 1 = full pose). */
  work: number;
}

/** Indices into HAIR_STYLES used for staff. */
const STAFF_HAIR_STYLES = (['crop', 'sidePart', 'bun', 'curly', 'ponytail'] as const).map((s) => Math.max(0, (HAIR_STYLES as readonly string[]).indexOf(s)));

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUILDS: [number, number, number, number][] = [
  [0.94, 0.96, 0.92, 0.92],
  [1.0, 1.0, 1.0, 1.0],
  [1.07, 1.02, 1.06, 1.05],
  [0.97, 1.1, 1.03, 1.0],
  [1.05, 1.06, 1.12, 1.07],
];

export function makeStaffLook(seed: number, role: StaffRole): StaffLook {
  const r = mulberry((seed * 2654435761) ^ 0x51af);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length) % arr.length];
  const build = pick(BUILDS);
  const jitter = () => 0.97 + r() * 0.06;
  const top = new THREE.Color(STAFF_POLO);
  top.offsetHSL(0, 0, (r() - 0.5) * 0.02);
  return {
    skin: new THREE.Color(pick(SKIN)),
    // no dyed teal hair on staff: it would read as a uniform cap
    hair: new THREE.Color(pick(HAIR)),
    top,
    bottom: new THREE.Color(TROUSERS[role]),
    shoe: new THREE.Color(SHOES[role]),
    frame: new THREE.Color(pick(FRAMES)),
    // tidy work styles only (crop, side part, bun, curls, ponytail): fewer hair draws for the whole team
    hairStyle: STAFF_HAIR_STYLES[Math.floor(r() * STAFF_HAIR_STYLES.length) % STAFF_HAIR_STYLES.length],
    glasses: r() < 0.28,
    height: 1.6 + r() * 0.28,
    shoulder: build[0] * jitter(),
    hip: build[1] * jitter(),
    girth: build[2] * jitter(),
    limb: build[3] * jitter(),
    headScale: 0.97 + r() * 0.06,
    headYaw: 0,
    headPitch: 0,
    fade: 1,
    blocked: false,
    work: 0,
  };
}

/** Accessory flags (iFlags components): which part of the accessory geometry an instance shows. */
export const ACC_FLAG = { uniform: 0, tub: 1, clipboard: 2 } as const;

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
};

/**
 * One merged geometry for every small staff accessory; each instance shows exactly one group via its flags:
 *  - uniform: authored in BODY space (drawn with the torso's own matrix): a white name badge with a teal band on the
 *    left chest (~1.5× life size so it reads from the facility camera) and a white print across the upper back, so
 *    staff read as staff from behind too;
 *  - tub: a food tub with a coral lid, origin at the grip, axis along −y (the hand's forearm direction);
 *  - clipboard: board, paper sheet and clip, origin at the bottom edge, rising along +y, facing +z.
 */
export function buildAccessoryGeometry(): THREE.BufferGeometry {
  const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.BufferGeometry => {
    g.rotateX(rx);
    g.rotateY(ry);
    g.rotateZ(rz);
    g.translate(x, y, z);
    return g;
  };
  const W: RGB = [1, 1, 1];
  const teal = hex('#27c2b3');
  const ink: RGB = [0.16, 0.18, 0.2];
  // badge on the left chest (+x is the figure's left), angled with the chest's curve
  const bx = 0.075;
  const by = 1.31;
  const bz = 0.1;
  const br = 0.3;
  const card = at(new RoundedBoxGeometry(0.084, 0.052, 0.008, 1, 0.004), bx, by, bz, -0.06, br, 0);
  const band = at(new THREE.BoxGeometry(0.084, 0.015, 0.009), bx + Math.sin(br) * 0.0005, by + 0.018, bz + 0.0005, -0.06, br, 0);
  const line1 = at(new THREE.BoxGeometry(0.05, 0.006, 0.0092), bx - 0.005, by - 0.003, bz + 0.0008, -0.06, br, 0);
  const line2 = at(new THREE.BoxGeometry(0.034, 0.005, 0.0092), bx - 0.012, by - 0.015, bz + 0.0008, -0.06, br, 0);
  // back print: a white band with a teal wave line across the shoulder blades
  const print = at(new RoundedBoxGeometry(0.17, 0.05, 0.008, 1, 0.006), 0, 1.33, -0.104, 0.08, 0, 0);
  const wave = at(new THREE.BoxGeometry(0.12, 0.011, 0.009), 0, 1.33, -0.1055, 0.08, 0, 0);
  // food tub: translucent-white pot, coral lid, a teal label ring; held in the fist, opening pointing away from the palm
  const pot = at(new THREE.CylinderGeometry(0.036, 0.032, 0.085, 14), 0, -0.035, 0);
  const lid = at(new THREE.CylinderGeometry(0.039, 0.039, 0.014, 14), 0, -0.083, 0);
  const label = at(new THREE.CylinderGeometry(0.0365, 0.0355, 0.03, 14, 1, true), 0, -0.03, 0);
  // clipboard: hardboard with a white sheet and a metal clip
  const board = at(new RoundedBoxGeometry(0.21, 0.29, 0.01, 1, 0.006), 0, 0.145, 0);
  const sheet = at(new THREE.BoxGeometry(0.18, 0.235, 0.004), 0, 0.13, 0.006);
  const clip = at(new RoundedBoxGeometry(0.07, 0.025, 0.018, 1, 0.005), 0, 0.28, 0.006);
  return mergeParts([
    [card, W, 0, ACC_FLAG.uniform],
    [band, teal, 0, ACC_FLAG.uniform],
    [line1, ink, 0, ACC_FLAG.uniform],
    [line2, ink, 0, ACC_FLAG.uniform],
    [print, W, 0, ACC_FLAG.uniform],
    [wave, teal, 0, ACC_FLAG.uniform],
    [pot, [0.93, 0.93, 0.9], 0, ACC_FLAG.tub],
    [lid, hex('#ff8a65'), 0, ACC_FLAG.tub],
    [label, teal, 0, ACC_FLAG.tub],
    [board, hex('#8a6236'), 0, ACC_FLAG.clipboard],
    [sheet, [0.97, 0.97, 0.95], 0, ACC_FLAG.clipboard],
    [clip, [0.7, 0.72, 0.75], 0, ACC_FLAG.clipboard],
  ]);
}
