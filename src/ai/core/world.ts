/**
 * AIWorld: all per-tank AI state, pure and headless-testable. `syncWorld` mirrors the sim (creatures in/out, stats,
 * decor, clock); `stepWorld` advances every agent + food particles by dt seconds. OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { Creature, CreatureRuntime, FoodParticle, SpeciesDefinition, Tank, Clutch, VisualEventKind } from '@/types';
import type { PersonalityModifiers } from '@/sim/life';
import { createEnv, syncEnvDynamic, syncEnvStatic, type Anchor, type DecorResolver, type ExtraResolver, type FlowResolver, type TankEnv } from './env';
import { createAgent, makeRuntime, refreshAgentInfo, type Agent } from './agent';
import { SpatialHash } from './spatialHash';
import { clamp } from './math';
import { computeZoneBand, releaseAnchor } from './nav';
import { initialPlacement, stepAgent } from './brain';
import { stepFood, type FoodState, makeFoodState } from './food';
import { stepArcherShot } from './spit'; // lane:brackish

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
  const decorChanged = syncEnvStatic(w.env, tank, w.resolveDecor, w.extras);
  syncEnvDynamic(w.env, tank, input.hour, input.clutches, w.flowOf);
  if (decorChanged) {
    w.virtualAnchors.length = 0;
    w.claims.clear();
    for (const a of w.agents) {
      a.anchorKey = null;
      a.anchorDecor = null;
      a.hasHome = false;
      computeZoneBand(a, w);
      a.actDur = Math.min(a.actDur, a.actT + 0.1); // replan soon with the new layout
    }
    const env = w.env;
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
  // prune stimuli
  while (w.stimuli.length && w.time - w.stimuli[0].t > 4) w.stimuli.shift();
  if (w.useHash) {
    w.posList.length = w.agents.length;
    for (let i = 0; i < w.agents.length; i++) w.posList[i] = w.agents[i].rt.pos;
    w.hash.rebuild(w.posList);
  }
  stepSchools(w, dt);
  stepFood(w, dt);
  for (let i = 0; i < w.agents.length; i++) stepAgent(w.agents[i], w, dt);
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
