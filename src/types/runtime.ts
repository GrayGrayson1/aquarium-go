/**
 * Per-frame, NON-persisted runtime contracts shared by AI (writer) and renderers (readers).
 * OWNER: core. Lanes may ADD optional fields.
 *
 * Coordinate system — TANK-LOCAL space (metres):
 *   x ∈ [-L/2, +L/2]  left → right (as seen from the front)
 *   y ∈ [0, H]         0 = tank floor (glass bottom), H = water surface (interior height × water level)
 *   z ∈ [-W/2, +W/2]  back → front (+z faces the viewer)
 * Substrate top is at y = substrateDepthM (see src/sim/tankSpace.ts).
 *
 * Creature object local space: head points to +X, up is +Y, total standard length = 1 unit (scaled by sizeCm/100).
 */
import type * as THREE from 'three';

export type CreaturePose =
  | 'swim'
  | 'hover'
  | 'rest' // resting on substrate/decor
  | 'hitched' // seahorse tail wrapped
  | 'hiding'
  | 'surface_breath' // betta / axolotl gulp
  | 'display' // fin flare / territorial display
  | 'court'
  | 'spawn'
  | 'guard'
  | 'feed'
  | 'startle'
  | 'dead';

export interface CreatureRuntime {
  id: string;
  speciesId: string;
  tankId: string;
  /** Tank-local position (metres). */
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Heading as yaw (around +Y, 0 = facing +X) and pitch (nose up positive), roll. Radians. */
  yaw: number;
  pitch: number;
  roll: number;
  /** Current speed in body-lengths/s (for tail beat frequency). */
  speedBL: number;
  /** Accumulated swim phase (radians) — renderer drives undulation from this. */
  swimPhase: number;
  /** -1..1 lateral body bend for turns. */
  bend: number;
  /** 0..1 fin flare (betta display, startle). */
  finFlare: number;
  /** 0..1 gill flick pulse (axolotl). */
  gillFlick: number;
  /** 0..1 mouth open (feeding / gulping). */
  mouthOpen: number;
  /** Eye look offsets (radians) for independently-moving eyes (pea puffer, seahorse). */
  eyeL: number;
  eyeR: number;
  /** 0..1 pectoral fin flutter intensity (hovering fish, seahorse dorsal fin). */
  flutter: number;
  /** 0..1 tail curl (seahorse). */
  tailCurl: number;
  /** 0..1 inflation (pea puffer — only from genuine fright, never rewarded). */
  puff: number;
  /** 0..1 belly/pouch fullness (pregnant seahorse, gravid female, fed). */
  belly: number;
  /** 0..1 colour intensity modulation (stress fades colour, display intensifies). */
  colorIntensity: number;
  pose: CreaturePose;
  /** Current behaviour label (for debug panel / creature card). */
  behavior: string;
  /** Debug: target point. */
  target?: THREE.Vector3;
  /** Scale in metres of the standard length (sizeCm / 100). */
  lengthM: number;
  /** Whether renderer should show this creature (hidden deep in cave, etc. still visible). */
  visible: boolean;
  /** Highlight for selection. */
  selected: boolean;
  /** Seconds since last sim sync; AI internal scratch space. */
  ai: Record<string, unknown>;
  /** lane:behavior — how the body is moving right now (renderers may switch leg/foot/pleopod animation). */
  gait?: CreatureGait;
  /** lane:behavior — true while standing/crawling/resting on a surface (substrate, decor, glass). */
  grounded?: boolean;
  /** lane:behavior — 0..1 generic appendage action pulse: shrimp picking, crab/crayfish claw wave, mantis smash, gourami feelers. */
  appendage?: number;
  /** lane:behavior — 0..1 sleep depth (night rest); renderers may slow idle fin motion. */
  sleep?: number;
  /**
   * lane:brackish — 0..1: the AI is holding this animal's snout at the surface film (an archerfish taking aim). Renderers
   * that keep bodies under the surface should then keep only the snout (not a steeply pitched body's fins) under it.
   */
  surfaceSnout?: number;
}

/** lane:behavior — locomotion gait written by the AI. */
export type CreatureGait = 'swim' | 'hover' | 'walk' | 'crawl' | 'hop' | 'still';

export interface FoodParticle {
  id: number;
  foodId: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** 0..1 remaining. */
  amount: number;
  delivery: 'floating' | 'slow_sink' | 'fast_sink' | 'live' | 'target';
  color: string;
  targetCreatureId?: string;
  age: number;
  settled: boolean;
  /** lane:behavior — how the particle moves/looks (derived from the food def). */
  motion?: 'float' | 'sink' | 'crawl' | 'jitter' | 'wriggle' | 'hold';
  shape?: 'flake' | 'pellet' | 'worm' | 'chunk' | 'snail' | 'mote' | 'wafer';
  /** lane:behavior — visual size in metres. */
  size?: number;
  /** lane:behavior — stable per-particle random seed 0..1. */
  seed?: number;
  /** lane:behavior — creature currently going for this particle. */
  claimedBy?: string;
  /** lane:behavior — 0..1 fade-out when the sim has consumed/dissolved it. */
  fade?: number;
}

export type VisualEventKind =
  | 'tap'
  | 'feed'
  | 'startle'
  | 'bite'
  | 'eat'
  | 'spawn'
  | 'birth'
  | 'bubble_burst'
  | 'smash' // mantis shrimp
  | 'photo'
  | 'wow'
  | 'spit'; // lane:brackish — an archerfish fires a water jet (pos = mouth; the jet/fly state is in src/runtime/archerShots.ts)

export interface VisualEvent {
  kind: VisualEventKind;
  tankId: string;
  pos: [number, number, number];
  creatureId?: string;
  t: number; // performance.now()/1000 when emitted
  strength?: number;
}

export interface PointerState {
  /** Pointer over this tank's front glass. */
  active: boolean;
  tankId: string | null;
  /** Tank-local point on (or just behind) the front glass. */
  local: [number, number, number];
  lastMoveT: number;
}

export interface AudioReactiveState {
  enabled: boolean;
  source: 'none' | 'builtin' | 'microphone' | 'file';
  level: number; // 0..1 smoothed RMS
  bass: number;
  mid: number;
  treble: number;
  /** 0..1, jumps to 1 on detected beat then decays. */
  beat: number;
  /** Slowly rotating hue 0..1 for party lighting. */
  hue: number;
}

export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';
