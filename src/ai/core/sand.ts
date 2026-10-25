/**
 * Chunk 16 — the sand bed as a place to be: a melanurus wrasse dives into it head first at dusk (and on a hard fright)
 * and sleeps buried, unseen; a fighting conch half-buries itself to rest; a Nassarius lies under it with only its siphon
 * up until it smells food. Shared by acts.ts (sleep / rest / sand_dive / burrow), brain.ts and loco.ts (the crawlers'
 * dig depth, `Agent.sink`). OWNER: lane "behavior".
 *
 * What the renderer can rely on (CreatureRuntime):
 *  - `rt.ai.buried` (number, 0..1): how much of the body is below the sand line — written every frame for the sets that
 *    bury (wrasse, conch, snail_sand, and a snail whose species has the `sand_turn` / `sand_rest` special behaviour).
 *  - wrasse: `rt.visible` is false while the whole body is under the sand (and true otherwise); the body itself is
 *    placed where it really is (head first into the sand on the way down, tail last).
 *  - conch / Nassarius: `rt.visible` stays true; `rt.pos` sinks with the dig (the conch to its middle, a Nassarius until
 *    the top of its shell is flush with the sand), so the renderer only has to let the substrate hide what is below.
 */
import * as THREE from 'three';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import type { BuryProfile } from './sets';
import { clamp, clamp01, rdur, rnd, rrange } from './math';
import { floorAt, pointFree } from './env';
import { bodyHX, bodyHY, bodySide } from './nav';

const _a = new THREE.Vector3();

/** A Cerith-style snail that works through the sand and settles into it to rest (species data: specialBehaviors
 * 'sand_turn' or 'sand_rest'). */
const SAND_REST: BuryProfile = { depth: 1.1, dig: 0.25, rise: 0.8 };

/** How this animal digs into a sand bed, if it does (its set's, or a sand-resting snail's). */
export function buryProfile(a: Agent): BuryProfile | undefined {
  if (a.set.bury) return a.set.bury;
  const sb = a.sp.specialBehaviors;
  if (a.set.loco === 'crawl' && sb && (sb.includes('sand_turn') || sb.includes('sand_rest'))) return SAND_REST;
  return undefined;
}

/**
 * chunk 16 — a wrasse that sleeps in the rockwork, never in the sand (six-line wrasse: in a mucus cocoon in a crevice),
 * and darts in and out of the rock rather than over the sand (species data: specialBehaviors 'rock_sleep').
 */
export const rockSleep = (a: Agent) => !!a.sp.specialBehaviors?.includes('rock_sleep');

/** Does this animal ever go into the sand (so its burial is measured and published)? */
export const buries = (a: Agent) => (a.set.rest === 'sand' && !rockSleep(a)) || buryProfile(a) !== undefined;

/** A crawler standing on the tank's sand bed (not on a rock or the glass, and the bed is sand). */
export const onSand = (a: Agent, w: AIWorld) => w.env.sandBed && a.surfId === -2;

/**
 * Open sand to bury in near `near` (any of the bed as a fallback): clear of hard decor above it with room for the body
 * to tip in head first, a body length from the glass, and not where another animal already lies buried. Writes the
 * spot on the sand surface. False when the bed has no such spot (the animal then sleeps in the rockwork).
 */
export function pickSandSpot(a: Agent, w: AIWorld, out: THREE.Vector3, near: THREE.Vector3 | null, radius: number): boolean {
  const env = w.env;
  if (!env.sandBed) return false;
  const L = a.L;
  const mx = bodyHX(a) + L * 0.35 + 0.01;
  const mz = Math.min(bodyHX(a) + L * 0.2, (env.maxZ - env.minZ) * 0.35) + 0.008;
  if (env.maxX - env.minX < 2 * mx || env.maxZ - env.minZ < 2 * mz) return false;
  const clear = bodySide(a) + L * 0.3;
  for (let i = 0; i < 48; i++) {
    let x: number;
    let z: number;
    if (near && i < 30) {
      const r = radius * Math.sqrt(rnd(a));
      const th = rnd(a) * Math.PI * 2;
      x = near.x + Math.cos(th) * r;
      z = near.z + Math.sin(th) * r * 0.7;
    } else {
      x = rrange(a, env.minX + mx, env.maxX - mx);
      z = rrange(a, env.minZ + mz, env.maxZ - mz);
    }
    x = clamp(x, env.minX + mx, env.maxX - mx);
    z = clamp(z, env.minZ + mz, env.maxZ - mz);
    const fy = floorAt(env, x, z);
    // room above the spot (no rock or plant crown on it) and on the way in
    if (!pointFree(env, x, fy + clear, z, clear) || !pointFree(env, x, fy + L * 0.6, z, clear)) continue;
    if (takenSpot(a, w, x, z)) continue;
    out.set(x, fy, z);
    return true;
  }
  return false;
}

/** Another animal lies buried (or is going in) within a body length of (x, z). */
function takenSpot(a: Agent, w: AIWorld, x: number, z: number): boolean {
  for (const o of w.agents) {
    if (o === a || o.dead || !o.sandMode) continue;
    const r = Math.max(a.L, o.L) * 0.9;
    const ox = o.actPhase >= 2 ? o.rt.pos.x : o.actData.x;
    const oz = o.actPhase >= 2 ? o.rt.pos.z : o.actData.z;
    if ((ox - x) * (ox - x) + (oz - z) * (oz - z) < r * r) return true;
  }
  return false;
}

/** How deep (below the sand line) a buried swimmer's body centre lies. */
const buriedDepth = (a: Agent) => a.L * 0.62;

/**
 * A swimmer going into the sand (wrasse): `a.actData` holds the spot on the sand surface. Phase 0: swims over it, low
 * and level; 1: dives in head first (steeply nose-down, fast, the body sliding under); 2: buried, still, out of sight.
 * `urgent`: a fright dive (straight in from where it is, at a burst). Returns true once it is buried.
 */
export function sandBuryTick(a: Agent, w: AIWorld, urgent: boolean): boolean {
  const env = w.env;
  const c = a.ctrl;
  const L = a.L;
  const spot = a.actData;
  const pos = a.rt.pos;
  c.allowFloor = true;
  c.sep = 0;
  if (a.actPhase === 0) {
    // over the spot, low and level (a fright dive does not line up: it goes straight down from where it is)
    const lift = urgent ? L * 0.25 : L * 0.45;
    _a.set(spot.x, floorAt(env, spot.x, spot.z) + bodySide(a) + lift, spot.z);
    const d = Math.hypot(pos.x - _a.x, pos.z - _a.z);
    c.goal.copy(_a);
    c.hasGoal = true;
    c.speedBL = urgent ? Math.max(a.sp.behaviorTraits.burstSpeed * 0.6, a.sp.behaviorTraits.cruiseSpeed * 2) : a.sp.behaviorTraits.cruiseSpeed * 0.9;
    c.arriveR = L * 0.6;
    c.urgency = urgent ? 1 : 0;
    c.avoid = 0.5;
    a.pose = urgent ? 'startle' : 'swim';
    // (no headway — the spot lies past a rock it cannot get round: dive in where it is, if it is over open sand)
    if (a.settleBest < 0 || d < a.settleBest - L * 0.05) {
      a.settleBest = d;
      a.settleT = w.time;
    } else if (w.time - a.settleT > 3 && pickSandSpot(a, w, spot, pos, L * 1.2)) {
      a.settleBest = -1;
    }
    if (d < L * (urgent ? 0.9 : 0.5) && pos.y < _a.y + L * (urgent ? 1.5 : 0.5)) {
      a.actPhase = 1;
      a.actTimer = w.time;
      a.settleBest = -1;
    }
    return false;
  }
  if (a.actPhase === 1) {
    // head first, steeply nose-down, the body following the head into the sand
    _a.set(spot.x + a.fwd.x * L * 0.2, floorAt(env, spot.x, spot.z) - buriedDepth(a), spot.z + a.fwd.z * L * 0.2);
    c.goal.copy(_a);
    c.hasGoal = true;
    c.speedBL = Math.max(a.sp.behaviorTraits.burstSpeed * (urgent ? 0.7 : 0.45), a.sp.behaviorTraits.cruiseSpeed * 1.5);
    c.arriveR = L * 0.2;
    c.burrow = 1;
    c.pitchBias = -1.2;
    c.pitchCap = 1.15;
    c.urgency = 1;
    c.avoid = 0;
    c.wander = 0;
    a.pose = 'hiding';
    if (a.buried > 0.985 || pos.y < _a.y + L * 0.06 || w.time - a.actTimer > 2.5) {
      a.actPhase = 2;
      spot.set(pos.x, floorAt(env, pos.x, pos.z) - buriedDepth(a), pos.z);
    }
    return false;
  }
  // buried: still, under the sand
  c.goal.copy(spot);
  c.hasGoal = true;
  c.speedBL = 0.1;
  c.arriveR = L;
  c.attach = 1;
  c.burrow = 1;
  c.avoid = 0;
  c.wander = 0;
  return true;
}

/** How long a frightened wrasse stays in the sand (s): a few seconds to a minute, shy ones longer. */
export function frightBuriedTime(a: Agent): number {
  return clamp(rdur(a, 14, 0.6) * (1.45 - a.mods.boldness * 0.9), 3, 60);
}

/** How high above the sand line a swimmer's centre must be for its whole body (tail included, at its pitch) to clear it. */
function clearance(a: Agent): number {
  return bodySide(a) * 0.85 + Math.abs(a.fwd.y) * bodyHX(a) * 0.92;
}

/**
 * Once the activity that held a swimmer in the sand has moved on (it woke, or a fright, a breeding call or a meal took
 * over), it comes up out of the sand over half a second or so — head first — instead of being pushed out by the floor
 * constraint in a frame or two. Its centre may be no deeper below the sand line than an allowance that shrinks at about
 * a body length a second (sandHold enforces it after the step). `a.sandAllow` encodes it as allowance + L: negative
 * while an activity holds the body in the sand, positive while it comes up, 0 once it is out. Runs after the
 * activity's tick.
 */
export function sandEmerge(a: Agent, w: AIWorld, dt: number): void {
  const c = a.ctrl;
  const L = a.L;
  const under = floorAt(w.env, a.rt.pos.x, a.rt.pos.z) - a.rt.pos.y; // > 0: the centre is below the sand line
  if (c.burrow > 0) {
    a.sandAllow = under + clearance(a) > 0 ? -(Math.max(under, -L * 0.99) + L) : 0;
    return;
  }
  if (a.sandAllow === 0) return;
  const allow = Math.min(Math.abs(a.sandAllow) - L, under) - L * 1.2 * dt;
  if (allow < -clearance(a)) {
    a.sandAllow = 0;
    return;
  }
  a.sandAllow = allow + L;
  // (the floor constraint is off below the sand line meanwhile: sandHold lets the body up at this pace)
  c.burrow = 1;
  c.allowFloor = true;
  c.pitchBias = Math.max(c.pitchBias, 0.45);
  c.pitchCap = Math.max(c.pitchCap, 0.9);
  c.speedBL = Math.min(c.speedBL, a.sp.behaviorTraits.cruiseSpeed * 0.6);
  c.avoid = Math.min(c.avoid, 0.4);
}

/** After the step: a swimmer coming up out of the sand is no deeper than its allowance (see sandEmerge). */
export function sandHold(a: Agent, w: AIWorld): void {
  if (a.sandAllow <= 0) return;
  const lo = floorAt(w.env, a.rt.pos.x, a.rt.pos.z) - (a.sandAllow - a.L);
  if (a.rt.pos.y < lo) a.rt.pos.y = lo;
}

/**
 * Measure how much of the body is below the sand line (`a.buried`, published as `rt.ai.buried`). A swimmer that is all
 * the way under is not drawn. Runs after locomotion, for the animals that bury.
 */
export function updateBuried(a: Agent, w: AIWorld): void {
  const env = w.env;
  const pos = a.rt.pos;
  const fy = floorAt(env, pos.x, pos.z);
  let e: number;
  if (a.loco === 'swim' || a.loco === 'upright') {
    // half the body's vertical extent at its pitch (the tail sticks up out of the sand while the head goes in)
    const fyv = Math.abs(a.fwd.y);
    e = fyv * bodyHX(a) + Math.sqrt(Math.max(0, 1 - fyv * fyv)) * bodySide(a);
  } else e = bodyHY(a);
  const b = e > 1e-6 ? clamp01((fy - (pos.y - e)) / (2 * e)) : 0;
  a.buried = b;
  a.rt.ai.buried = b;
  if (a.loco === 'swim' && a.set.rest === 'sand') a.rt.visible = b < 0.985 || a.dead;
}
