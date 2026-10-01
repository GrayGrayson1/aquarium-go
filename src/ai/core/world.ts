/**
 * AIWorld: all per-tank AI state, pure and headless-testable. `syncWorld` mirrors the sim (creatures in/out, stats,
 * decor, clock); `stepWorld` advances every agent + food particles by dt seconds. OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { Creature, CreatureRuntime, FoodParticle, SpeciesDefinition, Tank, Clutch, VisualEventKind } from '@/types';
import type { PersonalityModifiers } from '@/sim/life';
import { colliderSdf, createEnv, floorAt, pointFree, syncEnvDynamic, syncEnvStatic, type Anchor, type DecorResolver, type ExtraResolver, type FlowResolver, type TankEnv } from './env';
import { createAgent, makeRuntime, refreshAgentInfo, type Agent } from './agent';
import { SpatialHash } from './spatialHash';
import { clamp } from './math';
import { bodySide, computeZoneBand, releaseAnchor } from './nav';
import { initialPlacement, stepAgent } from './brain';
import { stepFood, type FoodState, makeFoodState } from './food';
import { stepArcherShot } from './spit'; // lane:brackish
import { setStepDt } from './stepRate'; // lane:pc-perf

export interface AIHooks {
  /** Visual events (eat, bite, startle, smash, bubble_burst…). */
  event?: (kind: VisualEventKind, pos: THREE.Vector3, creatureId?: string, strength?: number) => void;
  /** A signature behaviour was visibly performed (tutorial hooks). */
  observed?: (name: string, creatureId: string) => void;
}

export interface Stimulus {
  id: number;
  kind: 'tap' | 'splash';
  pos: THREE.Vector3;
  t: number;
  strength: number;
  spam: boolean;
}

export interface SchoolState {
  goal: THREE.Vector3;
  nextChange: number;
  alarm: number;
  count: number;
  center: THREE.Vector3;
  heading: THREE.Vector3;
}

export interface AIWorld {
  tankId: string;
  env: TankEnv;
  agents: Agent[];
  byId: Map<string, Agent>;
  time: number;
  frame: number;
  hash: SpatialHash;
  useHash: boolean;
  hbuf: Int32Array;
  nbuf: Int32Array;
  posList: THREE.Vector3[];
  claims: Map<string, number>;
  stimuli: Stimulus[];
  stimSeq: number;
  lastStim: Map<string, number>;
  schools: Map<string, SchoolState>;
  food: FoodParticle[];
  foodState: FoodState;
  hooks: AIHooks;
  virtualAnchors: Anchor[];
  resolveDecor: DecorResolver;
  extras?: ExtraResolver;
  flowOf: FlowResolver;
  personality: (c: Creature) => PersonalityModifiers | null;
  species: (id: string) => SpeciesDefinition | undefined;
  /** Registry the runtimes are published into (runtime.creatures in the app, a private map in tests). */
  registry: Map<string, CreatureRuntime>;
}

export interface WorldDeps {
  resolveDecor: DecorResolver;
  /** Equipment props inside the tank (obstacles + holdfasts). */
  extras?: ExtraResolver;
  flowOf?: FlowResolver;
  personality: (c: Creature) => PersonalityModifiers | null;
  species: (id: string) => SpeciesDefinition | undefined;
  registry?: Map<string, CreatureRuntime>;
  food?: FoodParticle[];
  hooks?: AIHooks;
}

export function createWorld(tankId: string, deps: WorldDeps): AIWorld {
  return {
    tankId,
    env: createEnv(tankId),
    agents: [],
    byId: new Map(),
    time: 0,
    frame: 0,
    hash: new SpatialHash(),
    useHash: false,
    hbuf: new Int32Array(512),
    nbuf: new Int32Array(128),
    posList: [],
    claims: new Map(),
    stimuli: [],
    stimSeq: 0,
    lastStim: new Map(),
    schools: new Map(),
    food: deps.food ?? [],
    foodState: makeFoodState(),
    hooks: deps.hooks ?? {},
    virtualAnchors: [],
    resolveDecor: deps.resolveDecor,
    extras: deps.extras,
    flowOf: deps.flowOf ?? (() => 0.3),
    personality: deps.personality,
    species: deps.species,
    registry: deps.registry ?? new Map(),
  };
}

export interface SyncInput {
  tank: Tank;
  /** Creatures whose tankId is this tank (any status). */
  creatures: readonly Creature[];
  clutches: readonly Clutch[];
  hour: number;
  /** Refresh per-creature info (stats/personality) — pass true when the sim state changed. */
  refreshInfo: boolean;
}

const ANIMATED = (c: Creature) => c.status === 'alive' || c.status === 'listed' || c.status === 'dead';

/** Mirror the sim: add/remove agents, refresh stats, decor and clock. */
export function syncWorld(w: AIWorld, input: SyncInput): void {
  const { tank } = input;
  const surfaceBefore = w.env.surfaceY;
  const decorChanged = syncEnvStatic(w.env, tank, w.resolveDecor, w.extras);
  syncEnvDynamic(w.env, tank, input.hour, input.clutches, w.flowOf);
  if (!decorChanged && w.env.surfaceY !== surfaceBefore) {
    // the water level moved (evaporation / a top-off): swimming bands follow the surface; nobody replans
    for (const a of w.agents) computeZoneBand(a, w);
    const env = w.env;
    w.hash.configure(env.minX, env.floorY - 0.05, env.minZ, env.maxX, env.surfaceY + 0.05, env.maxZ, Math.max(0.06, Math.min(0.2, (env.maxX - env.minX) / 12)));
  }
  if (decorChanged) {
    // The layout changed. Only the animals it touches replan: one whose anchor or home is gone (or moved, or now sits
    // inside something solid), whose activity was about a piece that is gone, or whose body is now inside decor. The
    // rest keep their claims and carry on — the whole tank used to reset on every edit (every sleeper woke at once).
    const env = w.env;
    w.virtualAnchors.length = 0;
    const byKey = new Map<string, Anchor>();
    for (const an of env.anchors) byKey.set(an.key, an);
    const solidIds = new Set<string>();
    for (const c of env.colliders) solidIds.add(c.decorId);
    w.claims.clear();
    for (const a of w.agents) {
      let disturbed = false;
      const an = a.anchorKey ? byKey.get(a.anchorKey) : undefined;
      if (an && an.pos.distanceToSquared(a.anchorPos) < 1e-4) {
        w.claims.set(an.key, (w.claims.get(an.key) ?? 0) + 1);
      } else if (a.anchorKey) {
        a.anchorKey = null;
        a.anchorDecor = null;
        disturbed = true;
      }
      if (a.hasHome) {
        // a home on decor stays only with its anchor; a home spot in the open only while nothing solid landed on it
        const homeOk = a.homeDecor ? !!an && a.anchorKey !== null && solidIds.has(a.homeDecor) : pointFree(env, a.home.x, a.home.y, a.home.z, bodySide(a) * 0.5);
        if (!homeOk) {
          a.hasHome = false;
          disturbed = true;
        }
      }
      if (a.actTarget && !solidIds.has(a.actTarget) && !w.byId.has(a.actTarget)) disturbed = true;
      if (!disturbed && insideSolid(env, a)) disturbed = true;
      if (a.laidToRest) a.deadWakeT = w.time;
      a.laidToRest = false; // a body at rest settles again around the new layout
      computeZoneBand(a, w);
      if (disturbed) a.actDur = Math.min(a.actDur, a.actT + 0.1); // replan soon with the new layout
    }
    w.hash.configure(env.minX, env.floorY - 0.05, env.minZ, env.maxX, env.surfaceY + 0.05, env.maxZ, Math.max(0.06, Math.min(0.2, (env.maxX - env.minX) / 12)));
  }
  // additions / updates
  let seen = 0;
  for (const c of input.creatures) {
    if (c.tankId !== w.tankId || !ANIMATED(c)) continue;
    const sp = w.species(c.speciesId);
    if (!sp) continue;
    seen++;
    let a = w.byId.get(c.id);
    if (!a) {
      const rt = w.registry.get(c.id) ?? makeRuntime(c, w.tankId);
      rt.tankId = w.tankId;
      a = createAgent(c, sp, rt);
      refreshAgentInfo(a, c, w.personality(c));
      computeZoneBand(a, w);
      initialPlacement(a, w, w.registry.has(c.id));
      w.agents.push(a);
      w.byId.set(c.id, a);
      w.registry.set(c.id, rt);
    } else if (input.refreshInfo || a.c !== c) {
      const wasDead = a.dead;
      const prevStage = a.stage;
      refreshAgentInfo(a, c, w.personality(c));
      if (a.dead && !wasDead) a.actDur = 0;
      // a pregnant seahorse male that is no longer pregnant has just given birth
      if (prevStage === 'pregnant' && a.stage !== 'pregnant' && !a.dead && w.hooks.event) w.hooks.event('birth', a.rt.pos, a.id, 1);
    }
  }
  // removals
  if (seen !== w.agents.length) {
    const keep = new Set<string>();
    for (const c of input.creatures) if (c.tankId === w.tankId && ANIMATED(c) && w.species(c.speciesId)) keep.add(c.id);
    for (let i = w.agents.length - 1; i >= 0; i--) {
      const a = w.agents[i];
      if (keep.has(a.id)) continue;
      removeAgent(w, i);
    }
  }
  w.useHash = w.agents.length > 30;
  if (w.nbuf.length < w.agents.length) w.nbuf = new Int32Array(w.agents.length * 2);
}

function removeAgent(w: AIWorld, i: number): void {
  const a = w.agents[i];
  releaseAnchor(a, w);
  w.agents.splice(i, 1);
  w.byId.delete(a.id);
  w.lastStim.delete(a.id);
  const rt = w.registry.get(a.id);
  if (rt && rt.tankId === w.tankId) w.registry.delete(a.id);
  for (const p of w.food) if (p.claimedBy === a.id) p.claimedBy = undefined;
}

// a dead body sinks for up to ~70 s (a large fish from the surface of a tall tank); past this it is left wherever it is
const DEAD_SETTLE_MAX_S = 150;
// the roll onto its side takes a few seconds (a cory dying on the bed is still at first, but only part-way over)
const DEAD_SETTLE_MIN_S = 6;

/**
 * A dead body stops being stepped once it lies still — a swimmer on the floor, a crawler, walker or sessile animal
 * wherever it let go — or at the latest after DEAD_SETTLE_MAX_S (lodged on a rock). Dead creatures stay in the game
 * until they are removed, and each used to cost a full AI step every frame for the rest of the game. (The renderer
 * shows the body for a few game hours only.)
 */
function settleDead(a: Agent, w: AIWorld, dt: number): void {
  const p = a.rt.pos;
  const vy = (p.y - a.deadY) / dt;
  a.deadY = p.y;
  if (a.act !== 'dead' || a.actT < DEAD_SETTLE_MIN_S) return;
  const grounded = a.loco === 'crawl' || a.loco === 'walk' || a.loco === 'sessile';
  const still = Math.abs(vy) < 1.5e-4 && (grounded || p.y - floorAt(w.env, p.x, p.z) < bodySide(a) * 1.6 + 0.005);
  // (a body woken by a rock dropped on it is still while it is being eased out sideways: only once it is out; the cap
  // counts from the wake, as an old body's actT is long past it)
  if ((still && !insideSolid(w.env, a)) || Math.min(a.actT, w.time - a.deadWakeT) > DEAD_SETTLE_MAX_S) a.laidToRest = true;
}

/** Is the body centre inside hard decor it is not deliberately tucked into (a hide it entered)? */
function insideSolid(env: TankEnv, a: Agent): boolean {
  const r = bodySide(a) * 0.5;
  const p = a.rt.pos;
  for (const c of env.colliders) {
    if (!c.hard || c.decorId === a.ctrl.ignoreDecor) continue;
    if (Math.abs(p.x - c.cx) > c.hx + r || Math.abs(p.y - c.cy) > c.hy + r || Math.abs(p.z - c.cz) > c.hz + r) continue;
    if (colliderSdf(c, p.x, p.y, p.z) < r) return true;
  }
  return false;
}

/** Remove every agent (tank unmounted). */
export function disposeWorld(w: AIWorld): void {
  for (let i = w.agents.length - 1; i >= 0; i--) removeAgent(w, i);
}

/** Queue a stimulus (glass tap etc.) — agents react with distance-based latency. */
export function addStimulus(w: AIWorld, kind: Stimulus['kind'], pos: THREE.Vector3, strength: number, spam = false): void {
  w.stimuli.push({ id: ++w.stimSeq, kind, pos: pos.clone(), t: w.time, strength, spam });
  if (w.stimuli.length > 16) w.stimuli.shift();
}

/** Advance the world by dt seconds (dt is clamped). */
export function stepWorld(w: AIWorld, dtIn: number): void {
  const dt = clamp(Number.isFinite(dtIn) ? dtIn : 0, 0, 0.05);
  if (dt <= 0) return;
  w.time += dt;
  w.frame++;
  setStepDt(dt); // lane:pc-perf — per-step constants scale with the real step length (stepRate.ts)
  // prune stimuli
  while (w.stimuli.length && w.time - w.stimuli[0].t > 4) w.stimuli.shift();
  if (w.useHash) {
    w.posList.length = w.agents.length;
    for (let i = 0; i < w.agents.length; i++) w.posList[i] = w.agents[i].rt.pos;
    w.hash.rebuild(w.posList);
  }
  stepSchools(w, dt);
  stepFood(w, dt);
  for (let i = 0; i < w.agents.length; i++) {
    const a = w.agents[i];
    if (a.laidToRest) continue;
    stepAgent(a, w, dt);
    if (a.dead) settleDead(a, w, dt);
  }
  stepArcherShot(w, dt); // lane:brackish — the archerfish's fly and jet
}

function stepSchools(w: AIWorld, dt: number): void {
  for (const s of w.schools.values()) {
    s.count = 0;
    s.center.set(0, 0, 0);
    s.heading.set(0, 0, 0);
    s.alarm = Math.max(0, s.alarm - dt * 0.35);
  }
  for (const a of w.agents) {
    if (!a.set.school || a.dead) continue;
    let s = w.schools.get(a.speciesId);
    if (!s) {
      s = { goal: a.rt.pos.clone(), nextChange: 0, alarm: 0, count: 0, center: new THREE.Vector3(), heading: new THREE.Vector3() };
      w.schools.set(a.speciesId, s);
    }
    s.count++;
    s.center.add(a.rt.pos);
    s.heading.add(a.fwd);
  }
  for (const s of w.schools.values()) if (s.count > 0) s.center.multiplyScalar(1 / s.count);
}
