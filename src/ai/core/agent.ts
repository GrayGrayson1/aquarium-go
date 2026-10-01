/**
 * Per-creature AI agent: brain state + motion state + cosmetic channels. Stored alongside the CreatureRuntime.
 * OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { Creature, CreatureRuntime, PersonalityTag, SpeciesDefinition } from '@/types';
import type { PersonalityModifiers } from '@/sim/life';
import { reproProgress } from '@/sim/life/breeding';
import { setProfile, type ActId, type Loco, type SetProfile } from './sets';
import { clamp, clamp01, hashString } from './math';
import type { SurfaceHit } from './env';
import { makeHit } from './env';

export interface Control {
  goal: THREE.Vector3;
  hasGoal: boolean;
  /** Desired cruising speed toward the goal (body lengths / s). */
  speedBL: number;
  /** Slow-down radius (metres). */
  arriveR: number;
  /** Face this point when slow / hovering. */
  look: THREE.Vector3;
  hasLook: boolean;
  /** 0..1 noise wander added to the heading. */
  wander: number;
  /** Nose pitch bias (radians, nose-up positive) e.g. sifting (-0.6) or gulping (+0.9). */
  pitchBias: number;
  /** Decor whose collider is exempt (approaching/sitting at an anchor on it). */
  ignoreDecor: string | null;
  /** May touch the water surface with the mouth. */
  allowSurface: boolean;
  /** May rest on the substrate. */
  allowFloor: boolean;
  /** Separation weight multiplier. */
  sep: number;
  /** 0..1 turn/accel boost (feeding rush, startle). */
  urgency: number;
  /** Lock position to the goal (hitched, nestled, perched) with this stiffness (0 = free). */
  attach: number;
  /** Desired body "up" for rock-hugging/crawling; null = world up. */
  wantUp: THREE.Vector3;
  hasWantUp: boolean;
  /** Extra avoidance multiplier (1 = normal). */
  avoid: number;
  /** 0..1 allowed to sink into the substrate (entering a burrow). */
  burrow: number;
  /** lane:brackish — deliberate steep pitch allowed this frame (radians; 0 = the species/set default cap). An archerfish aiming up at a fly. */
  pitchCap: number;
  /** lane:brackish — how far (m) the nose sample may poke up through the surface this frame (an archerfish's snout at the film). */
  noseAbove: number;
  /** Crawlers standing still (no goal) turn to face `look` (a mantis scanning from its burrow). Swimmers always do when slow. */
  faceLook: boolean;
}

export interface Agent {
  id: string;
  speciesId: string;
  sp: SpeciesDefinition;
  set: SetProfile;
  setId: string;
  rt: CreatureRuntime;
  c: Creature;
  /** Body length (metres). */
  L: number;
  // ── derived creature info (refreshed on sim sync) ──
  mods: PersonalityModifiers;
  tags: Set<PersonalityTag>;
  hunger: number;
  stress: number;
  health: number;
  energy: number;
  ill: number;
  stage: string;
  /** 0..1 progress through the current breeding stage (pregnancy swell, nest size…). */
  reproProg: number;
  partnerId: string | null;
  rank: number;
  clutchId: string | null;
  juvenile: boolean;
  dead: boolean;
  /** A dead body that has come to rest: world.stepWorld stops stepping it (until the layout changes around it). */
  laidToRest: boolean;
  /** Body height at the previous step while dead (sink speed). */
  deadY: number;
  /** When a layout change last woke this body (a rock dropped on it): the settle cap counts from then. */
  deadWakeT: number;
  /** 0..1 current activity level from time of day + nocturnality + personality. */
  activeness: number;
  /** Individual quirks (fixed per individual). */
  speedMul: number;
  zoneBias: number;
  zBias: number;
  // ── rng ──
  rs: number;
  noiseOff: number;
  // ── activity ──
  act: ActId;
  prevAct: ActId;
  actT: number;
  actDur: number;
  actPhase: number;
  actTimer: number;
  actCount: number;
  actData: THREE.Vector3;
  actNormal: THREE.Vector3;
  actTarget: string | null;
  foodId: number;
  /** When `foodId` was last set to a different particle (the animal has been after this one since then), and the
   * particle it let go of last, and when (going straight back to it counts as the same pursuit; coming back to it
   * a while later is a new one). */
  foodT: number;
  lastFoodId: number;
  foodDropT: number;
  /** Particles this animal gave up on (could not reach / did not take), a small ring: ignored until `badFoodUntil[i]`. */
  badFoodIds: number[];
  badFoodUntil: number[];
  anchorKey: string | null;
  anchorPos: THREE.Vector3;
  anchorDecor: string | null;
  ctrl: Control;
  nextThink: number;
  // ── home / memory ──
  home: THREE.Vector3;
  hasHome: boolean;
  homeDecor: string | null;
  feedSpot: THREE.Vector3;
  hasFeedSpot: boolean;
  lastFedT: number;
  satiety: number;
  fright: number;
  frightFrom: THREE.Vector3;
  lastStartleT: number;
  lastPointerInterestT: number;
  pointerInterest: number;
  breathNext: number;
  lastPuffT: number;
  zoneY0: number;
  zoneY1: number;
  // ── motion ──
  loco: Loco;
  fwd: THREE.Vector3;
  up: THREE.Vector3;
  upVis: THREE.Vector3;
  surfN: THREE.Vector3;
  grounded: boolean;
  speed: number;
  drift: THREE.Vector3;
  prevYaw: number;
  /** Swimmers: low-passed steering direction the heading turns toward (zero = take the current heading). */
  aim: THREE.Vector3;
  /** Swimmers: low-passed obstacle-avoidance steering, and the peak-held speed that scales it. */
  avoidLP: THREE.Vector3;
  avoidSpeed: number;
  /** Swimmers: slowly smoothed heading (≈0.25 s) the look-ahead obstacle probe points along (zero = take the heading). */
  probeDir: THREE.Vector3;
  yawRate: number;
  hit: SurfaceHit;
  /** Walkers: time spent squeezed where the body does not fit, and the exit direction being walked (0 = none). */
  stuckT: number;
  wedgeDir: THREE.Vector3;
  /** Walker boxed in with no walkable way out: the brain sends it for a short swim. */
  wedgeSwim: boolean;
  /** Walkers: time spent unable to take a step toward the current goal (the brain re-plans after a moment). */
  blockedT: number;
  /** Walkers: recent times it got stuck (a second one soon after sends it for a short swim). */
  blockedHits: number;
  lastBlockedAt: number;
  /** Walkers: free heading chosen by the local planner, and time until it re-plans. */
  walkDir: THREE.Vector3;
  hasWalkDir: boolean;
  walkPlanT: number;
  /** Walkers: smoothed extra height while stepping over low decor (leaf, dish, pebble). */
  stepLift: number;
  /** Part of stepLift actually added to rt.pos.y last frame (removed again before the next re-projection). */
  liftApplied: number;
  /** Decor recently used as an anchor (cave, leaf, hitch): stays exempt until the body is clear of it. */
  leavingDecor: string | null;
  /** Crawlers: the surface crawled on (see env surfaceId: -1 none, -2 floor, -3…-6 glass panes, ≥0 collider index), the one before it, and when it changed. */
  surfId: number;
  surfPrev: number;
  surfT: number;
  /** Upright swimmers (seahorse): the snout was swung clear of decor — no turning back toward that side (±1) until then. */
  snoutHoldT: number;
  snoutHoldSign: number;
  /** Settling at a spot: closest distance so far (-1 = not tracking) and when it last got closer (see acts settleIfBlocked). */
  settleBest: number;
  settleT: number;
  // ── cosmetic channels ──
  flare: number;
  gill: number;
  gillNext: number;
  mouth: number;
  mouthPulse: number;
  eyeL: number;
  eyeR: number;
  eyeLT: number;
  eyeRT: number;
  eyeNextL: number;
  eyeNextR: number;
  flutter: number;
  tailCurl: number;
  puff: number;
  belly: number;
  color: number;
  appendage: number;
  appendageNext: number;
  sleep: number;
  bend: number;
  /** Quiver (courtship / submission / aiming) until this time. */
  quiverUntil: number;
  /** Last time this animal was a school leader candidate etc. (debug-only counters). */
  lastObservedT: number;
  pose: CreatureRuntime['pose'];
  behavior: string;
  // ── debug ──
  lastInterrupt: string;
  dbgWeights: string;
}

function makeControl(): Control {
  return {
    goal: new THREE.Vector3(),
    hasGoal: false,
    speedBL: 0,
    arriveR: 0.05,
    look: new THREE.Vector3(),
    hasLook: false,
    wander: 0,
    pitchBias: 0,
    ignoreDecor: null,
    allowSurface: false,
    allowFloor: false,
    sep: 1,
    urgency: 0,
    attach: 0,
    wantUp: new THREE.Vector3(0, 1, 0),
    hasWantUp: false,
    avoid: 1,
    burrow: 0,
    pitchCap: 0,
    noseAbove: 0,
    faceLook: false,
  };
}

export function resetControl(c: Control): void {
  c.hasGoal = false;
  c.speedBL = 0;
  c.arriveR = 0.05;
  c.hasLook = false;
  c.wander = 0;
  c.pitchBias = 0;
  c.ignoreDecor = null;
  c.allowSurface = false;
  c.allowFloor = false;
  c.sep = 1;
  c.urgency = 0;
  c.attach = 0;
  c.hasWantUp = false;
  c.avoid = 1;
  c.burrow = 0;
  c.pitchCap = 0;
  c.noseAbove = 0;
  c.faceLook = false;
}

const DEFAULT_MODS: PersonalityModifiers = {
  boldness: 0.5,
  curiosity: 0.5,
  activity: 0.5,
  sociability: 0.5,
  feedingDrive: 0.5,
  startle: 0.5,
  nocturnal: 0,
  displayDrive: 0.5,
};

export function makeRuntime(c: Creature, tankId: string): CreatureRuntime {
  return {
    id: c.id,
    speciesId: c.speciesId,
    tankId,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    speedBL: 0,
    swimPhase: 0,
    bend: 0,
    finFlare: 0,
    gillFlick: 0,
    mouthOpen: 0,
    eyeL: 0,
    eyeR: 0,
    flutter: 0,
    tailCurl: 0,
    puff: 0,
    belly: 0,
    colorIntensity: 0.85,
    pose: 'swim',
    behavior: 'arriving',
    lengthM: Math.max(0.004, c.sizeCm / 100),
    visible: true,
    selected: false,
    ai: {},
    gait: 'swim',
    grounded: false,
    appendage: 0,
    sleep: 0,
  };
}

export function createAgent(c: Creature, sp: SpeciesDefinition, rt: CreatureRuntime): Agent {
  const set = setProfile(sp.behaviorSet);
  const seed = hashString(c.id) || 1;
  const a: Agent = {
    id: c.id,
    speciesId: c.speciesId,
    sp,
    set,
    setId: sp.behaviorSet,
    rt,
    c,
    L: rt.lengthM,
    mods: DEFAULT_MODS,
    tags: new Set(),
    hunger: 0.2,
    stress: 0.1,
    health: 1,
    energy: 0.8,
    ill: 0,
    stage: 'idle',
    reproProg: 0,
    partnerId: null,
    rank: 0,
    clutchId: null,
    juvenile: false,
    dead: false,
    laidToRest: false,
    deadY: 0,
    deadWakeT: -1e9,
    activeness: 1,
    speedMul: 1,
    zoneBias: 0,
    zBias: 0,
    rs: seed,
    noiseOff: (seed % 10007) * 0.37,
    act: 'still',
    prevAct: 'still',
    actT: 0,
    actDur: 0,
    actPhase: 0,
    actTimer: 0,
    actCount: 0,
    actData: new THREE.Vector3(),
    actNormal: new THREE.Vector3(0, 1, 0),
    actTarget: null,
    foodId: -1,
    foodT: -1e9,
    lastFoodId: -1,
    foodDropT: -1e9,
    badFoodIds: [-1, -1, -1, -1],
    badFoodUntil: [0, 0, 0, 0],
    anchorKey: null,
    anchorPos: new THREE.Vector3(),
    anchorDecor: null,
    ctrl: makeControl(),
    nextThink: 0,
    home: new THREE.Vector3(),
    hasHome: false,
    homeDecor: null,
    feedSpot: new THREE.Vector3(),
    hasFeedSpot: false,
    lastFedT: -1e9,
    satiety: 0,
    fright: 0,
    frightFrom: new THREE.Vector3(),
    lastStartleT: -1e9,
    lastPointerInterestT: -1e9,
    pointerInterest: 0,
    breathNext: 0,
    lastPuffT: -1e9,
    zoneY0: 0,
    zoneY1: 1,
    loco: set.loco,
    fwd: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    upVis: new THREE.Vector3(0, 1, 0),
    surfN: new THREE.Vector3(0, 1, 0),
    grounded: false,
    speed: 0,
    drift: new THREE.Vector3(),
    prevYaw: 0,
    aim: new THREE.Vector3(),
    avoidLP: new THREE.Vector3(),
    avoidSpeed: 0,
    probeDir: new THREE.Vector3(),
    yawRate: 0,
    hit: makeHit(),
    stuckT: 0,
    wedgeDir: new THREE.Vector3(),
    wedgeSwim: false,
    blockedT: 0,
    blockedHits: 0,
    lastBlockedAt: -1e9,
    walkDir: new THREE.Vector3(),
    hasWalkDir: false,
    walkPlanT: 0,
    stepLift: 0,
    liftApplied: 0,
    leavingDecor: null,
    surfId: -1,
    surfPrev: -1,
    surfT: 0,
    snoutHoldT: 0,
    snoutHoldSign: 0,
    settleBest: -1,
    settleT: 0,
    flare: 0,
    gill: 0,
    gillNext: 0,
    mouth: 0,
    mouthPulse: 0,
    eyeL: 0,
    eyeR: 0,
    eyeLT: 0,
    eyeRT: 0,
    eyeNextL: 0,
    eyeNextR: 0,
    flutter: 0,
    tailCurl: 0,
    puff: 0,
    belly: 0,
    color: 0.85,
    appendage: 0,
    appendageNext: 0,
    sleep: 0,
    bend: 0,
    quiverUntil: 0,
    lastObservedT: 0,
    pose: 'swim',
    behavior: 'arriving',
    lastInterrupt: '',
    dbgWeights: '',
  };
  return a;
}

/** Refresh the cached creature facts (called when the sim state changes, ~4 Hz). */
export function refreshAgentInfo(a: Agent, c: Creature, mods: PersonalityModifiers | null): void {
  a.c = c;
  a.L = Math.max(0.004, c.sizeCm / 100);
  a.rt.lengthM = a.L;
  if (mods) a.mods = mods;
  a.tags.clear();
  for (const t of c.personality ?? []) a.tags.add(t);
  const s = c.stats;
  a.hunger = clamp01((s?.hunger ?? 20) / 100);
  a.stress = clamp01((s?.stress ?? 10) / 100);
  a.health = clamp01((s?.health ?? 100) / 100);
  a.energy = clamp01((s?.energy ?? 80) / 100);
  const sev = c.illness?.severity ?? 0;
  a.ill = c.illness ? clamp01(sev > 1 ? sev / 100 : sev) : 0;
  a.stage = (c.repro?.stage ?? 'idle').toLowerCase();
  try {
    a.reproProg = reproProgress(c);
  } catch {
    a.reproProg = 0;
  }
  a.partnerId = c.repro?.partnerId ?? null;
  a.rank = c.repro?.rank ?? -1;
  a.clutchId = c.repro?.clutchId ?? null;
  a.juvenile = c.lifeStage === 'juvenile' || c.lifeStage === 'fry' || c.lifeStage === 'larva';
  a.dead = c.status === 'dead';
  // individual quirks: bounded so personality modulates behaviour within species limits
  const m = a.mods;
  a.speedMul = clamp(0.85 + m.activity * 0.3 + (a.juvenile ? 0.12 : 0), 0.75, 1.3);
  a.zBias = clamp((m.boldness - 0.5) * 0.9 + (a.tags.has('bold') ? 0.2 : 0) - (a.tags.has('shy') ? 0.25 : 0), -0.6, 0.6);
}

export const has = (a: Agent, t: PersonalityTag) => a.tags.has(t);
