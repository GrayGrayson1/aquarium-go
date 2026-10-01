/**
 * Visible food particles. The SIM is the truth (`tank.water.foodInWater`, food units): feeding spawns particles
 * sized so their count tracks the sim amount; creatures visibly eat them; when the sim has consumed / dissolved food
 * the leftovers fade; food the sim still holds but nobody visibly ate lies on the substrate as leftovers.
 * OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { FoodDef, FoodParticle, FoodTag } from '@/types';
import type { AIWorld } from './world';
import { floorAt, groundHeightAt, type TankEnv } from './env';
import { clamp, noise3, rnd, rrange, type HasRng } from './math';

const groundHeight = (env: TankEnv, x: number, z: number) => groundHeightAt(env, x, z, true);

export interface FoodSpec {
  foodId: string;
  delivery: FoodDef['delivery'];
  color: string;
  tags: readonly FoodTag[];
  /** Food units per serving (sim nutrition). */
  nutrition: number;
}

export interface FoodState extends HasRng {
  seq: number;
  lastSimFood: number;
  /** Food units represented by one visible particle (learned from the latest feeding). */
  unitsPerParticle: number;
  /** True once the sim has been seen tracking food for this tank. */
  simTracked: boolean;
  lastLocalSpawnT: number;
  lastLocalSpawnCount: number;
  lastSpec: FoodSpec | null;
  leftoverCheckT: number;
  tags: Map<string, readonly FoodTag[]>;
}

export function makeFoodState(): FoodState {
  return {
    rs: 0xf00d,
    seq: 0,
    lastSimFood: 0,
    unitsPerParticle: 3,
    simTracked: false,
    lastLocalSpawnT: -1e9,
    lastLocalSpawnCount: 0,
    lastSpec: null,
    leftoverCheckT: 0,
    tags: new Map(),
  };
}

type Shape = NonNullable<FoodParticle['shape']>;
type Motion = NonNullable<FoodParticle['motion']>;

export function shapeFor(tags: readonly FoodTag[], delivery: FoodDef['delivery']): { shape: Shape; motion: Motion; size: number; perServing: number } {
  const has = (t: FoodTag) => tags.includes(t);
  if (has('snail_live')) return { shape: 'snail', motion: 'crawl', size: 0.0045, perServing: 4 };
  if (has('copepod_live') || has('baby_brine') || has('infusoria')) return { shape: 'mote', motion: 'jitter', size: has('infusoria') ? 0.0006 : 0.0011, perServing: 26 };
  if (has('daphnia')) return { shape: 'mote', motion: delivery === 'live' ? 'jitter' : 'sink', size: 0.0016, perServing: 18 };
  if (has('earthworm')) return { shape: 'worm', motion: delivery === 'live' ? 'wriggle' : 'sink', size: 0.022, perServing: 2 };
  if (has('bloodworm')) return { shape: 'worm', motion: delivery === 'live' ? 'wriggle' : 'sink', size: 0.011, perServing: 12 };
  if (has('mysis') || has('brine_shrimp')) return { shape: 'chunk', motion: delivery === 'live' ? 'jitter' : 'sink', size: has('mysis') ? 0.007 : 0.0045, perServing: 12 };
  if (has('algae_wafer') || has('nori')) return { shape: 'wafer', motion: 'sink', size: has('nori') ? 0.018 : 0.012, perServing: has('nori') ? 1 : 2 };
  if (has('vegetable')) return { shape: 'wafer', motion: 'sink', size: 0.01, perServing: 2 };
  if (has('pellet_large')) return { shape: 'pellet', motion: delivery === 'floating' ? 'float' : 'sink', size: 0.0055, perServing: 4 };
  if (has('pellet_sinking')) return { shape: 'pellet', motion: delivery === 'floating' ? 'float' : 'sink', size: 0.0035, perServing: 6 };
  if (has('pellet_small')) return { shape: 'pellet', motion: delivery === 'floating' ? 'float' : 'sink', size: 0.0018, perServing: 10 };
  if (has('flake')) return { shape: 'flake', motion: delivery === 'floating' ? 'float' : 'sink', size: 0.006, perServing: 12 };
  if (has('coral_food')) return { shape: 'mote', motion: 'sink', size: 0.0009, perServing: 22 };
  return { shape: 'pellet', motion: delivery === 'floating' ? 'float' : 'sink', size: 0.003, perServing: 8 };
}

function sinkSpeed(p: FoodParticle): number {
  if (p.delivery === 'fast_sink') return p.shape === 'worm' ? 0.03 : 0.05;
  if (p.shape === 'flake') return 0.009;
  if (p.shape === 'mote') return 0.004;
  if (p.shape === 'worm') return 0.018;
  return 0.014;
}

export interface SpawnOpts {
  count?: number;
  targetCreatureId?: string;
  /** Spread radius (metres). */
  spread?: number;
  /** Units the sim added for this feeding (if known). */
  units?: number;
  settled?: boolean;
}

/** Spawn a feeding's particles at a tank-local point (clamped inside the water). Returns number spawned. */
export function spawnFood(w: AIWorld, spec: FoodSpec, at: THREE.Vector3, o: SpawnOpts = {}): number {
  const env = w.env;
  const fs = w.foodState;
  fs.tags.set(spec.foodId, spec.tags);
  const sh = shapeFor(spec.tags, spec.delivery);
  const count = Math.max(1, Math.min(40, Math.round(o.count ?? sh.perServing)));
  const spread = o.spread ?? (o.targetCreatureId ? 0.006 : sh.motion === 'float' ? 0.035 : 0.025);
  const margin = 0.008;
  for (let i = 0; i < count; i++) {
    const x = clamp(at.x + rrange(fs, -spread, spread), env.minX + margin, env.maxX - margin);
    const z = clamp(at.z + rrange(fs, -spread, spread) * 0.7, env.minZ + margin, env.maxZ - margin);
    let y = at.y;
    if (sh.motion === 'float' && !o.targetCreatureId) y = env.surfaceY - sh.size * 0.3;
    y = clamp(y + (o.targetCreatureId ? rrange(fs, -0.003, 0.003) : 0), floorAt(env, x, z) + sh.size, env.surfaceY - sh.size * 0.3);
    const motion: Motion = o.targetCreatureId && sh.motion !== 'crawl' ? 'hold' : sh.motion;
    const p: FoodParticle = {
      id: ++fs.seq,
      foodId: spec.foodId,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(rrange(fs, -0.01, 0.01), motion === 'float' ? 0 : -0.02, rrange(fs, -0.01, 0.01)),
      amount: 1,
      delivery: o.targetCreatureId ? 'target' : spec.delivery,
      color: spec.color,
      targetCreatureId: o.targetCreatureId,
      age: 0,
      settled: false,
      motion,
      shape: sh.shape,
      size: sh.size * rrange(fs, 0.8, 1.2),
      seed: rnd(fs),
      fade: 0,
    };
    if (o.settled) {
      p.settled = true;
      p.motion = sh.motion === 'crawl' ? 'crawl' : 'sink';
      p.pos.y = groundHeight(env, x, z) + (p.size ?? 0.003) * 0.4;
      p.vel.set(0, 0, 0);
      p.age = 30;
    }
    w.food.push(p);
  }
  if (w.food.length > 220) {
    // keep the oldest settled leftovers out first
    w.food.sort((a, b) => Number(b.settled) - Number(a.settled) || b.age - a.age);
    w.food.splice(0, w.food.length - 220);
  }
  return count;
}

/** Record a player feeding (local spawn) so the next sim food increase calibrates units/particle. */
export function noteLocalFeeding(w: AIWorld, spec: FoodSpec, spawned: number, servings = 1): void {
  const fs = w.foodState;
  fs.lastLocalSpawnT = w.time;
  fs.lastLocalSpawnCount = spawned;
  fs.lastSpec = spec;
  if (spec.nutrition > 0 && spawned > 0) fs.unitsPerParticle = (spec.nutrition * servings) / spawned;
}

const _v = new THREE.Vector3();

/** Physics + ageing for all particles. */
export function stepFood(w: AIWorld, dt: number): void {
  const env = w.env;
  const list = w.food;
  const t = w.time;
  let write = 0;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    p.age += dt;
    if (p.fade && p.fade > 0) p.fade += dt * 1.6;
    if (p.amount <= 0 || (p.fade ?? 0) >= 1) continue; // drop
    const size = p.size ?? 0.003;
    const seed = p.seed ?? 0.5;
    const floor = groundHeight(env, p.pos.x, p.pos.z);
    switch (p.motion) {
      case 'float': {
        // drifts on the surface film; flakes soak and start to sink after a while
        const cur = 0.004 + env.flow * 0.01;
        p.vel.x += (noise3(t * 0.2, seed * 10, 1) * cur - p.vel.x) * Math.min(1, dt * 1.5);
        p.vel.z += (noise3(seed * 10, t * 0.2, 2) * cur * 0.6 - p.vel.z) * Math.min(1, dt * 1.5);
        p.pos.x += p.vel.x * dt;
        p.pos.z += p.vel.z * dt;
        p.pos.y = env.surfaceY - size * 0.25 + Math.sin(t * 2 + seed * 20) * 0.0004;
        if (p.shape === 'flake' && p.age > 18 + seed * 30) p.motion = 'sink';
        break;
      }
      case 'hold': {
        // held out by tongs / pipette: barely drifts, then sinks if ignored
        p.pos.y -= 0.0015 * dt;
        p.pos.x += Math.sin(t * 1.3 + seed * 9) * 0.0006 * dt;
        if (p.age > 25) {
          // ignored: it is just food on the bottom now — anyone may take it and the sim sync may fade it
          p.motion = 'sink';
          p.targetCreatureId = undefined;
        }
        break;
      }
      case 'jitter': {
        // copepods / daphnia / baby brine: hop-and-glide
        if (rnd(w.foodState) < dt * 2.5) {
          p.vel.x += rrange(w.foodState, -0.02, 0.02);
          p.vel.y += rrange(w.foodState, -0.012, 0.018);
          p.vel.z += rrange(w.foodState, -0.015, 0.015);
        }
        p.vel.multiplyScalar(Math.exp(-2.2 * dt));
        p.vel.y -= 0.002 * dt;
        p.pos.addScaledVector(p.vel, dt);
        break;
      }
      case 'crawl': {
        // live snails: sink, then glide along the bottom
        if (!p.settled) {
          p.pos.y -= 0.03 * dt;
          if (p.pos.y <= floor + size * 0.5) {
            p.settled = true;
            p.pos.y = floor + size * 0.5;
          }
        } else {
          const ang = noise3(t * 0.05, seed * 13, 5) * Math.PI * 2;
          const sp = 0.0022;
          p.vel.set(Math.cos(ang) * sp, 0, Math.sin(ang) * sp);
          p.pos.x += p.vel.x * dt;
          p.pos.z += p.vel.z * dt;
          p.pos.y = groundHeight(env, p.pos.x, p.pos.z) + size * 0.5;
        }
        break;
      }
      case 'wriggle':
      case 'sink':
      default: {
        if (!p.settled) {
          const vs = sinkSpeed(p);
          p.vel.y += (-vs - p.vel.y) * Math.min(1, dt * 3);
          // flutter while sinking (flakes rock side to side)
          const fl = p.shape === 'flake' ? 0.012 : p.shape === 'mote' ? 0.004 : 0.003;
          p.vel.x += (Math.sin(t * 3 + seed * 17) * fl + noise3(t * 0.3, seed * 7, 3) * env.flow * 0.01 - p.vel.x) * Math.min(1, dt * 2);
          p.vel.z += (Math.cos(t * 2.3 + seed * 11) * fl * 0.6 - p.vel.z) * Math.min(1, dt * 2);
          p.pos.addScaledVector(p.vel, dt);
          if (p.pos.y <= floor + size * 0.4) {
            p.settled = true;
            p.pos.y = floor + size * 0.4;
            p.vel.set(0, 0, 0);
          }
        } else if (env.flow > 0.4 && p.shape !== 'wafer') {
          // strong flow rolls settled bits around a little
          p.pos.x += noise3(t * 0.2, seed * 5, 9) * env.flow * 0.002 * dt;
          p.pos.y = groundHeight(env, p.pos.x, p.pos.z) + size * 0.4;
        }
      }
    }
    // keep inside the water box
    const m = size * 0.5 + 0.002;
    if (p.pos.x < env.minX + m) {
      p.pos.x = env.minX + m;
      p.vel.x = Math.abs(p.vel.x);
    } else if (p.pos.x > env.maxX - m) {
      p.pos.x = env.maxX - m;
      p.vel.x = -Math.abs(p.vel.x);
    }
    if (p.pos.z < env.minZ + m) {
      p.pos.z = env.minZ + m;
      p.vel.z = Math.abs(p.vel.z);
    } else if (p.pos.z > env.maxZ - m) {
      p.pos.z = env.maxZ - m;
      p.vel.z = -Math.abs(p.vel.z);
    }
    if (p.pos.y > env.surfaceY - size * 0.2) p.pos.y = env.surfaceY - size * 0.2;
    const fl = groundHeight(env, p.pos.x, p.pos.z) + size * 0.3;
    if (p.pos.y < fl) p.pos.y = fl;
    // untracked (no sim) food eventually dissolves
    if (!w.foodState.simTracked && p.age > 120 && !p.fade) p.fade = 0.001;
    list[write++] = p;
  }
  list.length = write;
}

/**
 * Keep the visible amount roughly proportional to the sim's food units (called on each sim sync).
 * `spawnFallback` creates particles when the sim gained food we did not see being dropped (autofeeder, panel button).
 */
export function syncFoodWithSim(w: AIWorld, simFood: number, fallbackSpec: (tags: FoodTag[]) => FoodSpec | null, byTag?: Partial<Record<FoodTag, number>>): void {
  const fs = w.foodState;
  const env = w.env;
  const prev = fs.lastSimFood;
  fs.lastSimFood = simFood;
  const inc = simFood - prev;
  if (inc > 0.5) {
    if (w.time - fs.lastLocalSpawnT < 3) {
      // our own feeding landed in the sim — calibrate
      fs.simTracked = true;
      if (fs.lastLocalSpawnCount > 0) fs.unitsPerParticle = Math.max(0.2, inc / fs.lastLocalSpawnCount);
      fs.lastLocalSpawnT = -1e9;
    } else {
      // food arrived from elsewhere (autofeeder / panel): show it dropping in
      fs.simTracked = true;
      const tags = (byTag ? (Object.keys(byTag) as FoodTag[]) : []).filter((k) => (byTag?.[k] ?? 0) > 0);
      const spec = fallbackSpec(tags) ?? fs.lastSpec;
      if (spec) {
        const sh = shapeFor(spec.tags, spec.delivery);
        const n = Math.max(1, Math.min(30, Math.round((inc / Math.max(1, spec.nutrition)) * sh.perServing)));
        _v.set(rrange(fs, env.minX * 0.5, env.maxX * 0.5), env.surfaceY - 0.004, rrange(fs, env.minZ * 0.3, env.maxZ * 0.3));
        spawnFood(w, spec, _v, { count: n });
        fs.unitsPerParticle = Math.max(0.2, inc / n);
        fs.lastSpec = spec;
      }
    }
    return;
  }
  if (!fs.simTracked) return;
  const live = liveCount(w);
  const target = simFood <= 0.05 ? 0 : Math.ceil(simFood / Math.max(0.2, fs.unitsPerParticle));
  // (one particle of slack while the sim still holds food; none once it reports the water clean — a last flake used
  // to lie on the sand for good)
  if (live > target + (target > 0 ? 1 : 0)) {
    // the sim has consumed / dissolved food: fade the oldest settled leftovers first, then the oldest free ones
    let excess = live - target;
    for (const pass of [0, 1]) {
      for (const p of w.food) {
        if (excess <= 0) break;
        if (p.fade || p.amount <= 0) continue;
        if (pass === 0 && !p.settled) continue;
        if (p.age < 4) continue; // let fresh food reach the fish first
        if (p.targetCreatureId && goingFor(w, p.targetCreatureId, p)) continue; // held out to an animal that is coming for it
        if (p.claimedBy) {
          if (goingFor(w, p.claimedBy, p)) continue; // someone is visibly going for it
          p.claimedBy = undefined; // a stale claim (the fish moved on) must never keep a leftover alive
        }
        if ((p.motion === 'crawl' || p.motion === 'jitter' || p.motion === 'wriggle') && p.age < 40) continue; // live prey keeps moving until caught
        p.fade = 0.001;
        excess--;
      }
    }
  } else if (live === 0 && target > 0 && w.time - fs.leftoverCheckT > 8) {
    // the sim still holds food nobody visibly ate: it lies on the substrate
    fs.leftoverCheckT = w.time;
    const spec = fs.lastSpec ?? fallbackSpec([]);
    if (spec) {
      const n = Math.min(6, target);
      for (let i = 0; i < n; i++) {
        _v.set(rrange(fs, env.minX * 0.8, env.maxX * 0.8), env.floorY, rrange(fs, env.minZ * 0.7, env.maxZ * 0.7));
        spawnFood(w, spec, _v, { count: 1, settled: true, spread: 0.01 });
      }
    }
  }
}

/** Is agent `id` in this tank and actually going for particle `p` right now? */
function goingFor(w: AIWorld, id: string, p: FoodParticle): boolean {
  const a = w.byId.get(id);
  return !!a && !a.dead && a.foodId === p.id && (a.act === 'feed' || a.act === 'hunt');
}

export function liveCount(w: AIWorld): number {
  let n = 0;
  for (const p of w.food) if (p.amount > 0 && !(p.fade && p.fade > 0)) n++;
  return n;
}

/** Take a bite from a particle. Returns true if it is gone. */
export function biteParticle(p: FoodParticle, bite: number): boolean {
  p.amount -= bite;
  if (p.amount <= 0.001) {
    p.amount = 0;
    p.fade = 1;
    return true;
  }
  return false;
}

export function particleTags(w: AIWorld, p: FoodParticle): readonly FoodTag[] | undefined {
  return w.foodState.tags.get(p.foodId);
}
