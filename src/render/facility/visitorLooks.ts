/**
 * Per-visitor appearance for the facility crowd: outfit, hair, build and accessories derived deterministically from
 * the agent id, with a uniqueness pass so no two people in the room wear the same outfit (no clones standing side by
 * side). Purely cosmetic render state; the visitor runtime's own colours are ignored. OWNER: lane "facility".
 */
import * as THREE from 'three';
import type { VisitorAgent } from '@/runtime/visitors';
import { HAIR_STYLES } from './visitorGeometry';

const SKIN = ['#f3d6c1', '#eac4a6', '#dcae8a', '#c99470', '#b07a55', '#90603f', '#6f462d', '#553322'];
const HAIR = ['#1c1512', '#2e1f16', '#4a3020', '#6b4428', '#8f5a32', '#b3713a', '#d7ae6a', '#ead7a8', '#9b9894', '#e2dfd8', '#a8432c'];
const HAIR_FUN = ['#3f8a8f', '#d98aa9', '#6f63b8'];
const TOPS = ['#e4572e', '#f2c14e', '#4d9078', '#3a6ea5', '#f4efe3', '#2f3a4b', '#c86b98', '#7fa37f', '#b5563c', '#f6c89f', '#6c5b7b', '#8db3dc', '#d8d1c1', '#26282c', '#e07a5f', '#86c2a4', '#9a3b3b', '#f4a259', '#5b8e7d', '#c9a227'];
const KID_TOPS = ['#ff6b6b', '#ffd23f', '#3bceac', '#4d9de0', '#f78fb3', '#9b5de5', '#ff9f1c', '#2ec4b6', '#e15554', '#7bdff2'];
const BOTTOMS = ['#2d3a55', '#4a6fa5', '#1d1f24', '#c8b58f', '#6b5846', '#5a6b4a', '#8a8f98', '#e5dcc8', '#3b5a7a', '#7a4a3a'];
const SKIRTS = ['#7a2e3a', '#2d3a55', '#c9a227', '#4d9078', '#1d1f24', '#b5563c', '#6c5b7b', '#e5dcc8'];
const JACKETS = ['#394a5c', '#8b6a4f', '#5e7d5a', '#b23a48', '#e8e2d6', '#2c2c34', '#c49a62', '#476c9b', '#6e7f8c'];
const SHOES = ['#f4f1ea', '#1b1b1d', '#6b4630', '#c0392b', '#2e4a7a', '#8a8d91', '#e8c07a'];
const BAGS = ['#3a3f47', '#b5563c', '#2f5d62', '#e2b44f', '#6d4c7d', '#8b6a4f', '#c75c5c', '#3f7fbf'];
const FRAMES = ['#1b1b1d', '#6b4630', '#8b1e2d', '#c9a45c'];

export interface VisitorLook {
  id: number;
  skin: THREE.Color;
  hair: THREE.Color;
  top: THREE.Color;
  bottom: THREE.Color;
  shoe: THREE.Color;
  jacket: THREE.Color | null;
  bagColor: THREE.Color;
  frame: THREE.Color;
  hairStyle: number;
  longSleeves: boolean;
  /** 0 trousers, 1 shorts, 2 skirt, 3 dress (skirt in the top colour). */
  legs: 0 | 1 | 2 | 3;
  /** 0 none, 1 backpack, 2 shoulder bag. */
  bag: 0 | 1 | 2;
  glasses: boolean;
  /** Torso breadth, hip width, front-back girth, limb thickness. */
  shoulder: number;
  hip: number;
  girth: number;
  limb: number;
  headScale: number;
  /** Indices used for the uniqueness check. */
  topIdx: number;
  bottomIdx: number;
  // ── smoothed animation state (per person, no per-frame allocation) ──
  headYaw: number;
  headPitch: number;
  /** 0..1 dither fade (near the camera / blocking the exhibit in view). */
  fade: number;
  /** Currently hidden for standing in the foreground over the exhibit in view (with hysteresis). */
  blocked: boolean;
  seen: number;
}

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
  // shoulder, hip, girth, limb
  [0.92, 0.95, 0.9, 0.9], // slim
  [1.0, 1.0, 1.0, 1.0], // average
  [1.1, 1.02, 1.08, 1.08], // broad
  [0.97, 1.13, 1.04, 1.0], // curvy
  [1.08, 1.1, 1.2, 1.1], // stocky
  [0.95, 0.98, 0.95, 0.94], // lanky
];

function makeLook(a: VisitorAgent, salt: number): VisitorLook {
  const r = mulberry(((Number.isFinite(a.id) ? a.id : 0) * 2654435761) ^ (salt * 40503) ^ 0x9e3779b9);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length) % arr.length];
  const kid = !!a.kid;
  const tops = kid ? KID_TOPS : TOPS;
  const topIdx = Math.floor(r() * tops.length) % tops.length;
  const legRoll = r();
  const legs: VisitorLook['legs'] = kid ? (legRoll < 0.45 ? 1 : legRoll < 0.7 ? 0 : legRoll < 0.88 ? 2 : 3) : legRoll < 0.58 ? 0 : legRoll < 0.72 ? 1 : legRoll < 0.9 ? 2 : 3;
  const bottomIdx = legs === 2 ? Math.floor(r() * SKIRTS.length) % SKIRTS.length : legs === 3 ? -1 : Math.floor(r() * BOTTOMS.length) % BOTTOMS.length;
  // older visitors go grey; kids never get beards or grey hair
  let hairStyle: number;
  const hs = r();
  if (kid) hairStyle = [0, 1, 2, 3, 4, 6][Math.floor(hs * 6) % 6];
  else hairStyle = Math.floor(hs * HAIR_STYLES.length) % HAIR_STYLES.length;
  const hairPool = kid ? HAIR.slice(0, 8) : HAIR;
  const hair = r() < 0.05 ? pick(HAIR_FUN) : pick(hairPool);
  const build = kid ? ([1.0, 1.0, 1.05, 1.08] as [number, number, number, number]) : pick(BUILDS);
  const jitter = () => 0.96 + r() * 0.08;
  const top = new THREE.Color(tops[topIdx]);
  // tiny per-person shade shift so even shared palette entries don't read as identical twins
  top.offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.06);
  const bottom = legs === 3 ? top.clone() : new THREE.Color(legs === 2 ? SKIRTS[bottomIdx] : BOTTOMS[bottomIdx]);
  const jacket = !kid && legs !== 3 && r() < 0.32 ? new THREE.Color(pick(JACKETS)) : null;
  return {
    id: a.id,
    skin: new THREE.Color(pick(SKIN)),
    hair: new THREE.Color(hair),
    top,
    bottom,
    shoe: new THREE.Color(pick(SHOES)),
    jacket,
    bagColor: new THREE.Color(pick(BAGS)),
    frame: new THREE.Color(pick(FRAMES)),
    hairStyle,
    longSleeves: jacket ? true : r() < (kid ? 0.3 : 0.5),
    legs,
    bag: a.bag ? (kid || r() < 0.55 ? 1 : 2) : !kid && r() < 0.12 ? 2 : kid && r() < 0.25 ? 1 : 0,
    glasses: !kid && r() < 0.26,
    shoulder: build[0] * jitter(),
    hip: build[1] * jitter(),
    girth: build[2] * jitter(),
    limb: build[3] * jitter(),
    headScale: kid ? 1.3 : 0.97 + r() * 0.07,
    topIdx: (kid ? 100 : 0) + topIdx,
    bottomIdx: legs * 1000 + bottomIdx,
    headYaw: 0,
    headPitch: 0,
    fade: 1,
    blocked: false,
    seen: 0,
  };
}

function clashes(l: VisitorLook, others: Iterable<VisitorLook>, crowd: number): boolean {
  for (const o of others) {
    if (o.id === l.id) continue;
    if (o.topIdx === l.topIdx && (o.bottomIdx === l.bottomIdx || crowd <= 10)) return true;
    if (crowd <= 4 && o.hairStyle === l.hairStyle && o.bottomIdx === l.bottomIdx) return true;
  }
  return false;
}

/**
 * Looks for the given agents, assigned on first sight (deterministic per id) and re-rolled while they would clash
 * with someone already in the room. Entries for people who left are pruned.
 */
export class VisitorLooks {
  private map = new Map<number, VisitorLook>();
  private frame = 0;

  get(a: VisitorAgent, crowd: number): VisitorLook {
    let l = this.map.get(a.id);
    if (!l) {
      l = makeLook(a, 0);
      for (let salt = 1; salt < 16 && clashes(l, this.map.values(), crowd); salt++) l = makeLook(a, salt);
      this.map.set(a.id, l);
    }
    l.seen = this.frame;
    return l;
  }

  /** Call once per frame after all `get`s; drops looks not seen for a while. */
  endFrame(): void {
    this.frame++;
    if (this.frame % 120 !== 0) return;
    for (const [id, l] of this.map) if (this.frame - l.seen > 240) this.map.delete(id);
  }

  clear(): void {
    this.map.clear();
  }
}
