/**
 * Activity library. Each activity writes the agent's Control each frame (goal, speed, look, attach…) and returns
 * false when it is finished. Species signature behaviours live here too (surface gulps, fin flares, hitching,
 * hosting, snick feeding, stalk-and-strike, cleaning stations, burrows…). OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { CreaturePose, FoodParticle, FoodTag } from '@/types';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import { ACT_DURATION, type ActId } from './sets';
import { V, clamp, clamp01, rchance, rdur, rnd, rrange, safeNormalize, noise3 } from './math';
import { SURF_DECOR, SURF_FLOOR, colliderNormalGrounded, colliderSdf, drawnDepth, floorAt, makeHit, nearestSurface, pointFree, pointFreeExcept, restingGap, surfaceById, type Anchor, type AnchorKind } from './env';
import {
  bodyHX,
  bodyHY,
  bodySide,
  claimAnchor,
  findParticle,
  mouthPos,
  neighbors,
  pointNearDecor,
  randomSurfacePoint,
  randomSwimPoint,
  releaseAnchor,
} from './nav';
import { bodyFits, takeOff } from './loco';
import { biteParticle, particleTags } from './food';
import { spitEnter, spitTick } from './spit'; // lane:brackish
import { buryProfile, frightBuriedTime, onSand, pickSandSpot, rockSleep, sandBuryTick } from './sand'; // chunk 16
import { choosePatch, findPerch, mateOf, perchGap, perchTaken, type PerchOpts } from './reef'; // chunk 16, wave B
import { crownPos, crownR, freeLiveHost, liveHostPos, wanderTick } from './anemone'; // chunk 16, wave B
import { perStep, stepRate } from './stepRate'; // lane:pc-perf — frame-rate independent per-step constants

export interface ActDef {
  prio: number;
  label: string;
  pose: CreaturePose;
  enter?: (a: Agent, w: AIWorld) => boolean;
  tick: (a: Agent, w: AIWorld, dt: number) => boolean;
}

// ───────────────────────────── shared helpers ─────────────────────────────

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

export const cruiseBL = (a: Agent) => Math.max(0.05, a.sp.behaviorTraits.cruiseSpeed) * a.speedMul * (0.6 + 0.4 * a.activeness) * (1 - a.ill * 0.5);
export const burstBL = (a: Agent) => Math.max(a.sp.behaviorTraits.cruiseSpeed * 1.5, a.sp.behaviorTraits.burstSpeed) * (1 - a.ill * 0.4);

function go(a: Agent, p: THREE.Vector3, speedBL: number, arriveR = a.L * 1.5): void {
  const c = a.ctrl;
  c.goal.copy(p);
  c.hasGoal = true;
  c.speedBL = speedBL;
  c.arriveR = arriveR;
}
function look(a: Agent, p: THREE.Vector3): void {
  a.ctrl.look.copy(p);
  a.ctrl.hasLook = true;
}
const dist = (a: Agent, p: THREE.Vector3) => a.rt.pos.distanceTo(p);
const isCrawler = (a: Agent) => a.set.loco === 'crawl' || a.set.loco === 'walk';
/**
 * "Close enough" radius for reaching a roaming goal: k body lengths, but never a big share of the tank — a 22 cm
 * axolotl in a 76 cm tank would otherwise "arrive" at every spot it picks before taking a step.
 */
const reachR = (a: Agent, w: AIWorld, k: number) => Math.min(a.L * k, Math.max(0.03, (w.env.maxX - w.env.minX) * 0.12));
const observe = (a: Agent, w: AIWorld, name: string) => {
  if (w.env.focused && w.hooks.observed) w.hooks.observed(name, a.id);
};
const emit = (w: AIWorld, kind: Parameters<NonNullable<AIWorld['hooks']['event']>>[0], pos: THREE.Vector3, id?: string, strength?: number) => {
  if (w.hooks.event) w.hooks.event(kind, pos, id, strength);
};
const col = (w: AIWorld) => w.env.surfaceY - w.env.floorY;

/** Look around like a living animal: new points of interest every few seconds. */
function lookAround(a: Agent, w: AIWorld, center: THREE.Vector3, every = 3): void {
  if (w.time >= a.actTimer) {
    a.actTimer = w.time + rdur(a, every, 0.5);
    const r = rnd(a);
    if (w.env.pointerActive && w.env.focused && r < a.mods.curiosity * 0.4) a.actNormal.copy(w.env.pointer);
    else if (r < 0.35) a.actNormal.set(center.x + rrange(a, -0.3, 0.3), 0, w.env.maxZ + 0.5); // toward the viewer
    else a.actNormal.set(center.x + rrange(a, -0.4, 0.4), 0, center.z + rrange(a, -0.3, 0.3));
    // glances stay fairly level: vertical offset at most ~20° of the horizontal distance
    const hd = Math.hypot(a.actNormal.x - center.x, a.actNormal.z - center.z);
    if (!(w.env.pointerActive && a.actNormal.equals(w.env.pointer))) a.actNormal.y = center.y + rrange(a, -0.35, 0.35) * hd;
  }
  look(a, a.actNormal);
}

/** Virtual anchors for bare tanks (seahorse holdfasts on the substrate, a cleaning spot…). */
function virtualAnchor(a: Agent, w: AIWorld, kind: AnchorKind): Anchor {
  const env = w.env;
  const list = w.virtualAnchors;
  if (!list.some((v) => v.kind === kind)) {
    const n = kind === 'hitch' ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const fx = (i + 0.5) / n;
      const x = env.minX + (env.maxX - env.minX) * (0.15 + 0.7 * fx);
      const z = env.minZ + (env.maxZ - env.minZ) * (i % 2 ? 0.3 : 0.18);
      list.push({ key: `virtual:${kind}:${i}`, decorId: '', kind, pos: new THREE.Vector3(x, floorAt(env, x, z) + 0.004, z), capacity: kind === 'hitch' ? 1 : 2, virtual: true });
    }
  }
  let best = list[0];
  let bestScore = -Infinity;
  const lift = kind === 'hitch' ? a.L * 0.38 : bodyHY(a);
  for (const v of list) {
    if (v.kind !== kind) continue;
    const taken = (w.claims.get(v.key) ?? 0) >= v.capacity && v.key !== a.anchorKey;
    // a spot under a stone the player set down there is no good (it used to press its snout into the rock for good)
    const blocked = !pointFree(env, v.pos.x, v.pos.y + lift, v.pos.z, bodySide(a));
    const s = -v.pos.distanceTo(a.rt.pos) + (taken ? -5 : 0) + (blocked ? -20 : 0) + rnd(a) * 0.1;
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  if (best.key !== a.anchorKey) {
    if (a.anchorKey) {
      const n = (w.claims.get(a.anchorKey) ?? 1) - 1;
      if (n <= 0) w.claims.delete(a.anchorKey);
      else w.claims.set(a.anchorKey, n);
    }
    a.anchorKey = best.key;
    w.claims.set(best.key, (w.claims.get(best.key) ?? 0) + 1);
  }
  a.anchorDecor = null;
  a.anchorPos.copy(best.pos);
  return best;
}

/** Clamp a body-centre target so the whole body fits in the water. */
function fitInWater(a: Agent, w: AIWorld, p: THREE.Vector3, upright = a.loco === 'upright'): THREE.Vector3 {
  const env = w.env;
  const hx = upright ? bodySide(a) + 0.004 : bodyHX(a) * 0.7 + 0.006;
  const vy = upright ? bodyHY(a) + 0.004 : bodySide(a) + 0.004;
  p.x = clamp(p.x, env.minX + hx, env.maxX - hx);
  p.z = clamp(p.z, env.minZ + hx, env.maxZ - hx);
  p.y = clamp(p.y, floorAt(env, p.x, p.z) + vy, env.surfaceY - vy);
  return p;
}

/**
 * An animal holding at a spot (tucked into a hide, resting on the bottom) that can get no closer to it — the spot sits
 * against decor it may not enter, or a neighbour already lies there — settles where it is. Pulled on toward the spot
 * while the constraints or its neighbour push it back, its body would tremble in place.
 */
function settleIfBlocked(a: Agent, w: AIWorld, spot: THREE.Vector3): void {
  const d = dist(a, spot);
  if (a.settleBest < 0 || d < a.settleBest - a.L * 0.03) {
    a.settleBest = d;
    a.settleT = w.time;
  } else if (d > a.L * 0.08 && w.time - a.settleT > 0.8) {
    spot.copy(a.rt.pos);
    a.settleBest = 0;
    a.settleT = w.time;
  }
}

/** Move a swimmer's target out of hard decor other than `except` (an anchor tucked into a neighbouring rock). */
function clearOfDecor(a: Agent, w: AIWorld, p: THREE.Vector3, except: string | null): void {
  const r = bodySide(a) + 0.002;
  for (const c of w.env.colliders) {
    if (!c.hard || c.decorId === except) continue;
    const d = colliderSdf(c, p.x, p.y, p.z);
    if (d >= r) continue;
    colliderNormalGrounded(c, p.x, p.y, p.z, _c);
    p.addScaledVector(_c, r - d);
  }
}

function partnerOf(a: Agent, w: AIWorld): Agent | null {
  if (a.partnerId) {
    const p = w.byId.get(a.partnerId);
    if (p && !p.dead) return p;
  }
  return null;
}

/** Dominant conspecific for pair-hierarchy species (lowest rank, else the largest). */
function dominantOf(a: Agent, w: AIWorld): Agent | null {
  let best: Agent | null = null;
  for (const o of w.agents) {
    if (o.dead || o.speciesId !== a.speciesId) continue;
    if (!best) {
      best = o;
      continue;
    }
    const ro = o.rank >= 0 ? o.rank : 99;
    const rb = best.rank >= 0 ? best.rank : 99;
    if (ro < rb || (ro === rb && (o.c.sizeCm > best.c.sizeCm || (o.c.sizeCm === best.c.sizeCm && o.id < best.id)))) best = o;
  }
  return best && best !== a ? best : null;
}

// ───────────────────────────── feeding ─────────────────────────────

const edibleCache = new Map<string, Set<string>>();
function edible(a: Agent, tags: readonly FoodTag[] | undefined): boolean {
  if (!tags || !tags.length) return true;
  let s = edibleCache.get(a.speciesId);
  if (!s) {
    s = new Set(a.sp.foods ?? []);
    edibleCache.set(a.speciesId, s);
  }
  if (!s.size) return true;
  for (const t of tags) if (s.has(t)) return true;
  return false;
}

export function appetite(a: Agent): number {
  let d = 0.3 + a.hunger * 0.95 + a.mods.feedingDrive * 0.3;
  if (a.tags.has('food_obsessed')) d += 0.3;
  if (a.tags.has('patient_feeder')) d -= 0.1;
  d *= 1 - a.ill * 0.6;
  if (a.stress > 0.75) d *= 0.6;
  return clamp(d, 0, 1.5);
}

/** Extra satiety a hand-fed animal accepts beyond its capacity (a target feed is at most 4 pieces). */
const TARGET_EXTRA = 4;

/** Can this animal still take `p`? Hand-fed food is accepted a little past a full belly. */
function wantsMore(a: Agent, p: FoodParticle): boolean {
  const c = capacity(a, p);
  return a.satiety <= c || (p.targetCreatureId === a.id && a.satiety <= c + TARGET_EXTRA);
}

/**
 * Let go of the particle this animal was going for: release its claim (so the sim sync may fade it and others may
 * take it) and, when the animal spent a while on it without a bite, remember it as unreachable for a bit so the next
 * think() does not pick the very same piece again.
 */
function dropFood(a: Agent, w: AIWorld, failed: boolean): void {
  if (a.foodId < 0) return;
  const p = findParticle(w, a.foodId);
  if (p && p.claimedBy === a.id) p.claimedBy = undefined;
  if (failed && p) {
    // the oldest entry of the ring goes
    let k = 0;
    for (let i = 1; i < a.badFoodIds.length; i++) if (a.badFoodUntil[i] < a.badFoodUntil[k]) k = i;
    a.badFoodIds[k] = p.id;
    a.badFoodUntil[k] = w.time + 45;
  }
  a.lastFoodId = a.foodId;
  a.foodDropT = w.time;
  a.foodId = -1;
  a.settleBest = -1;
}

function isBadFood(a: Agent, id: number, time: number): boolean {
  for (let i = 0; i < a.badFoodIds.length; i++) if (a.badFoodIds[i] === id && time < a.badFoodUntil[i]) return true;
  return false;
}

function capacity(a: Agent, p: FoodParticle | null): number {
  let c = 2 + a.hunger * 10 + a.mods.feedingDrive * 3;
  if (a.tags.has('food_obsessed')) c += 4;
  if (a.tags.has('competitive_feeder')) c += 2;
  if (p && p.shape === 'mote') c *= 3;
  if (a.setId === 'seahorse' || a.setId === 'shrimp_dwarf' || a.setId === 'snail') c *= 2;
  return c;
}

const LIVE = (p: FoodParticle) => p.motion === 'crawl' || p.motion === 'jitter' || p.motion === 'wriggle';

/** Choose the best food particle for this animal right now (null = not interested / nothing reachable). */
export function chooseFood(a: Agent, w: AIWorld): FoodParticle | null {
  if (!w.food.length || a.dead || a.loco === 'sessile') return null;
  if (a.stage === 'brooding') return null; // mouthbrooding males do not eat
  // chunk 16 — a wrasse in the sand for the night (or hiding there from a fright) does not come out for food
  if (a.sandMode && a.buried > 0.3 && (a.act === 'sleep' || a.act === 'rest' || a.act === 'sand_dive')) return null;
  // chunk 16 — a sand-sifting star under the sand for the day stays there; a hawkfish that has just pounced goes back to
  // its perch before it pounces again; an anemone only takes what comes within reach of its tentacles
  if (a.set.nightOnly && a.buried > 0.5 && a.activeness < 0.3) return null;
  if (a.setId === 'hawkfish' && a.act === 'perch' && a.actPhase === 0 && w.time - a.lastFedT < 5) return null;
  if (a.set.anemone) return anemoneFood(a, w);
  const drive = appetite(a);
  if (drive < 0.18) return null;
  // full animals ignore food — but one offered by hand (tongs / pipette) still gets a bite or two
  const full = a.satiety > capacity(a, null);
  if (full && a.satiety > capacity(a, null) + TARGET_EXTRA) return null;
  const env = w.env;
  const L = a.L;
  const H = col(w);
  const crawler = isCrawler(a);
  const fs = a.sp.feedingStyle;
  const bottomOk = crawler || a.set.bottomHugger || fs === 'bottom' || fs === 'scavenger' || fs === 'grazer' || fs === 'hunter' || fs === 'picker' || fs === 'ambush' || a.zoneY0 < env.floorY + H * 0.3 || a.hunger > 0.65;
  const surfaceOk = !crawler && !a.set.bottomHugger && (a.zoneY1 > env.floorY + H * 0.62 || fs === 'surface' || fs === 'midwater' || a.hunger > 0.7);
  // perception: seahorses & target feeders only notice food close by; crawlers smell it within ~35 cm (a Nassarius
  // smells it anywhere on the floor, a few seconds after it lands — the farther, the later)
  const smells = !!a.set.smellsFood;
  const R = a.setId === 'seahorse' ? L * 4 : smells ? Infinity : crawler ? 0.35 : 3;
  const m = mouthPos(a, _a);
  let best: FoodParticle | null = null;
  let bestScore = Infinity;
  for (const p of w.food) {
    if (p.amount <= 0 || (p.fade && p.fade > 0)) continue;
    if (full && p.targetCreatureId !== a.id) continue;
    if (isBadFood(a, p.id, w.time)) continue; // gave up on that one a moment ago
    const d = m.distanceTo(p.pos);
    if (p.targetCreatureId && p.targetCreatureId !== a.id) {
      // tong-fed food is reserved; only a pushy, hungry neighbour right next to it steals it
      if (!(a.sp.feedingAggression > 0.6 && a.hunger > 0.5 && d < L * 1.5)) continue;
    }
    if (!edible(a, particleTags(w, p))) continue;
    const h = p.pos.y - floorAt(env, p.pos.x, p.pos.z);
    if (crawler && h > L * 0.8 + 0.012 && p.targetCreatureId !== a.id) continue;
    if (smells && p.targetCreatureId !== a.id && p.age < 1 + d * 6 + ((a.noiseOff * 7.7) % 1) * 2.5) continue;
    if (p.motion === 'float' && !surfaceOk && p.targetCreatureId !== a.id) continue;
    // settled food: bottom feeders take it anywhere; others only if it rests on decor up in their own zone
    if (p.settled && !bottomOk && p.pos.y < a.zoneY0 - H * 0.12) continue;
    if (d > R && p.targetCreatureId !== a.id) continue;
    let score = d / (0.3 + a.sp.feedingSpeed);
    if (p.claimedBy && p.claimedBy !== a.id) score *= a.tags.has('competitive_feeder') ? 1.1 : 1.7;
    // a walker goes for what lies ahead of it first (turning a long body round beside a stone is slow work)
    if (crawler && a.loco !== 'swim' && (p.pos.x - a.rt.pos.x) * a.fwd.x + (p.pos.z - a.rt.pos.z) * a.fwd.z < 0) score *= 1.6;
    if (p.targetCreatureId === a.id) score *= 0.05;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/** chunk 16 — the food within reach of a living anemone's tentacles (the nearest; null: none). */
function anemoneFood(a: Agent, w: AIWorld): FoodParticle | null {
  crownPos(a, _a);
  const reach = crownR(a) * 1.1;
  let best: FoodParticle | null = null;
  let bestD = Infinity;
  for (const p of w.food) {
    if (p.amount <= 0 || (p.fade && p.fade > 0) || isBadFood(a, p.id, w.time)) continue;
    if (p.targetCreatureId && p.targetCreatureId !== a.id) continue;
    if (!edible(a, particleTags(w, p))) continue;
    const d = _a.distanceTo(p.pos) - (p.size ?? 0.003);
    if (d < reach && d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** 'pounce' (chunk 16): watches from a perch and takes food in a quick short dart (flame hawkfish). */
type FeedStyle = 'rush' | 'snick' | 'strike' | 'pick' | 'pounce';
function feedStyle(a: Agent): FeedStyle {
  if (a.setId === 'seahorse') return 'snick';
  if (a.setId === 'hawkfish') return 'pounce';
  if (a.setId === 'axolotl' || a.setId === 'frog_aquatic') return 'strike';
  if (isCrawler(a) && a.loco !== 'swim') return 'pick';
  return 'rush';
}

function biteSize(p: FoodParticle, style: FeedStyle): number {
  if (style === 'pick') return p.shape === 'wafer' ? 0.06 : 0.2;
  switch (p.shape) {
    case 'flake':
      return 0.55;
    case 'worm':
      return p.size && p.size > 0.015 ? 0.34 : 1;
    case 'wafer':
      return 0.15;
    case 'snail':
      return 0.5;
    default:
      return 1;
  }
}

function eat(a: Agent, w: AIWorld, p: FoodParticle, style: FeedStyle): void {
  const gone = biteParticle(p, biteSize(p, style));
  a.settleBest = -1;
  a.satiety += gone ? 1 : 0.5;
  a.mouthPulse = style === 'pick' ? 0.5 : 1;
  a.lastFedT = w.time;
  a.feedSpot.copy(p.pos);
  a.hasFeedSpot = true;
  if (style === 'pick') a.appendage = 1;
  emit(w, 'eat', p.pos, a.id, style === 'pick' ? 0.3 : 0.7);
  if (gone && p.claimedBy === a.id) p.claimedBy = undefined;
}

/** Heading of an agent is aligned toward a point within `tol` radians? (`flat`: compass heading only — an upright body
 * looking down at a piece right under its snout) */
function facing(a: Agent, p: THREE.Vector3, tol: number, flat = false): boolean {
  _b.subVectors(p, a.rt.pos);
  if (flat) _b.y = 0;
  const l = _b.length();
  if (l < 1e-6) return true;
  return a.fwd.dot(_b) / l > Math.cos(tol);
}

// ───────────────────────────── activity table ─────────────────────────────

export const ACTS: Record<ActId, ActDef> = {
  // ── idle movement ──
  cruise: {
    prio: 10,
    label: 'cruising',
    pose: 'swim',
    enter(a, w) {
      if (isCrawler(a)) {
        if (!a.set.canSwim) return false;
        takeOff(a);
      }
      pickCruiseGoal(a, w);
      a.actCount = isCrawler(a) ? 1 : 2 + Math.floor(rnd(a) * 4);
      a.actNormal.x = rrange(a, 0.75, 1.15); // leg speed factor
      return true;
    },
    tick(a, w) {
      const hungry = a.hunger > 0.55 && a.hasFeedSpot;
      go(a, a.actData, cruiseBL(a) * a.actNormal.x * (hungry ? 1.1 : 1), a.L * 2.5);
      a.ctrl.wander = 0.35;
      if (dist(a, a.actData) < reachR(a, w, 2.2)) {
        a.actPhase++;
        if (a.actPhase >= a.actCount) return false;
        pickCruiseGoal(a, w);
        a.actNormal.x = rrange(a, 0.7, 1.2);
      }
      return true;
    },
  },

  school: {
    prio: 10,
    label: 'schooling',
    pose: 'swim',
    enter(a) {
      if (isCrawler(a)) return false;
      return true;
    },
    tick(a, w) {
      const s = w.schools.get(a.speciesId);
      if (hoverShoal(a)) return hoverShoalTick(a, w, s);
      if (!s || s.count < 3) {
        // a lone schooling fish: nervous, hugs cover, loose wandering
        if (dist(a, a.actData) < a.L * 2 || a.actT < 0.05) randomSwimPoint(a, w, a.actData, { zPref: -0.3 });
        go(a, a.actData, cruiseBL(a) * 0.8, a.L * 2);
        a.ctrl.wander = 0.3;
        return true;
      }
      if (w.time > s.nextChange) {
        randomSwimPoint(a, w, s.goal, { zPref: 0.15 });
        s.nextChange = w.time + rdur(a, s.alarm > 0.2 ? 4 : 10, 0.5);
      }
      const tr = a.sp.behaviorTraits;
      const tight = clamp((0.35 + tr.schoolingTightness * 0.8) * (0.75 + a.mods.sociability * 0.5) * (1 + s.alarm) * (0.6 + 0.4 * a.activeness), 0.2, 1.8);
      const L = a.L;
      const R = L * (3 + 3.5 * (1.2 - Math.min(1.2, tight)));
      const n = neighbors(w, a.rt.pos, R, a);
      _a.set(0, 0, 0); // alignment
      _b.set(0, 0, 0); // centroid
      let k = 0;
      for (let i = 0; i < n; i++) {
        const o = w.agents[w.nbuf[i]];
        if (o.speciesId !== a.speciesId || o.act !== 'school') continue;
        _a.add(o.fwd);
        _b.add(o.rt.pos);
        k++;
      }
      const dir = V[5].set(0, 0, 0);
      if (k > 0) {
        _b.multiplyScalar(1 / k).sub(a.rt.pos);
        const dc = _b.length();
        if (dc > 1e-6) dir.addScaledVector(_b, ((0.7 * tight + 0.1) * Math.min(1, dc / R)) / dc);
        safeNormalize(_a, a.fwd);
        dir.addScaledVector(_a, 0.8 * tight + 0.2);
      }
      const leader = (a.noiseOff * 7.13) % 1 < 0.22;
      _c.subVectors(s.goal, a.rt.pos);
      const dg = _c.length();
      if (dg > 1e-6) dir.addScaledVector(_c, (leader ? 0.9 : k > 0 ? 0.22 : 0.6) / dg);
      if (dir.lengthSq() < 1e-8) dir.copy(a.fwd);
      safeNormalize(dir, a.fwd);
      _c.copy(a.rt.pos).addScaledVector(dir, L * 5);
      go(a, _c, cruiseBL(a) * (0.9 + 0.25 * noise3(w.time * 0.3, a.noiseOff, 1)) * (1 + s.alarm * 1.4), 0.001);
      a.ctrl.wander = 0.12;
      a.ctrl.sep = 1.3;
      a.ctrl.urgency = s.alarm * 0.6;
      if (k >= 4 && a.speed > a.L * 0.3) observe(a, w, 'school');
      return true;
    },
  },

  patrol: {
    prio: 10,
    label: 'patrolling open water',
    pose: 'swim',
    enter(a, w) {
      if (isCrawler(a)) return false;
      a.actPhase = a.rt.pos.x < 0 ? 0 : 1;
      a.actCount = 2 + Math.floor(rnd(a) * 4);
      setPatrolEnd(a, w);
      return true;
    },
    tick(a, w) {
      go(a, a.actData, cruiseBL(a) * 1.05, 0.001);
      a.ctrl.wander = 0.18;
      if (Math.abs(a.rt.pos.x - a.actData.x) < patrolTurn(a, w)) {
        a.actPhase = 1 - a.actPhase;
        a.actCount--;
        if (a.actCount <= 0) return false;
        setPatrolEnd(a, w);
      }
      return true;
    },
  },

  hover: {
    prio: 10,
    label: 'hovering',
    pose: 'hover',
    enter(a, w) {
      if (isCrawler(a) && a.loco !== 'swim') return false;
      const nearDecor = (a.setId === 'pea_puffer' || a.setId === 'cardinal_hover' || a.setId === 'lionfish' || a.setId === 'gourami') && rnd(a) < 0.6;
      if (!nearDecor || pointNearDecor(a, w, a.actData, a.actNormal, bodyHX(a) + a.L * 0.9, { soft: true, maxY: a.zoneY1 + a.L }) < 0) {
        randomSwimPoint(a, w, a.actData, { near: a.rt.pos, radius: a.L * 6 });
      }
      a.actTimer = 0;
      return true;
    },
    tick(a, w) {
      const t = w.time * 0.25 + a.noiseOff;
      _a.copy(a.actData);
      _a.x += noise3(t, 1.3, a.noiseOff) * a.L * 0.5;
      _a.y += noise3(2.1, t, a.noiseOff) * a.L * 0.3;
      _a.z += noise3(a.noiseOff, 3.7, t) * a.L * 0.3;
      go(a, fitInWater(a, w, _a), cruiseBL(a) * 0.55, a.L * 1.8);
      a.ctrl.wander = 0.05;
      if (a.setId === 'lionfish') a.ctrl.pitchBias = -0.12;
      if (a.setId === 'pea_puffer' && a.actT > 3) observe(a, w, 'hover');
      lookAround(a, w, a.rt.pos, a.setId === 'pea_puffer' ? 1.6 : 3.5);
      return true;
    },
  },

  // a walker boxed in where it does not fit (between wood and glass, stones at nose and tail) swims up and over to
  // open floor, then settles
  reposition: {
    prio: 40,
    label: 'finding more room',
    pose: 'swim',
    enter(a, w) {
      if (!isCrawler(a) || !a.set.canSwim || !freeFloorSpot(a, w, a.actData, a.actNormal)) return false;
      takeOff(a);
      a.actPhase = 0;
      return true;
    },
    tick(a, w) {
      const clearY = a.actData.y + a.L * 0.7;
      // rise clear of the obstacles (already heading over, not straight up), then glide across and come down
      _a.set(a.actPhase === 0 ? a.rt.pos.x + (a.actData.x - a.rt.pos.x) * 0.4 : a.actData.x, clearY, a.actPhase === 0 ? a.rt.pos.z + (a.actData.z - a.rt.pos.z) * 0.4 : a.actData.z);
      if (a.actPhase === 0 && a.rt.pos.y > clearY - a.L * 0.25) a.actPhase = 1;
      const flat = Math.hypot(a.rt.pos.x - a.actData.x, a.rt.pos.z - a.actData.z);
      if (a.actPhase === 1 && flat < a.L * 0.35) {
        // over the spot: turn to the heading that fits there, then settle (the brain lands walkers once it ends)
        if (a.fwd.x * a.actNormal.x + a.fwd.z * a.actNormal.z > 0.94 || a.actT > 10) return false;
        go(a, _a.set(a.actData.x, a.rt.pos.y, a.actData.z), cruiseBL(a) * 0.4, a.L * 0.6);
        look(a, _b.copy(a.rt.pos).addScaledVector(a.actNormal, a.L * 3));
        return true;
      }
      go(a, fitInWater(a, w, _a), cruiseBL(a) * 1.1, a.L * 0.6);
      a.ctrl.allowFloor = true;
      a.ctrl.avoid = 0.6;
      if (a.actPhase === 1) a.ctrl.pitchBias = -0.15;
      return true;
    },
  },

  crawl_explore: {
    prio: 10,
    label: 'exploring',
    pose: 'swim',
    enter(a, w) {
      if (!isCrawler(a)) return false;
      pickExploreSpot(a, w, 0.25);
      a.actCount = 2 + Math.floor(rnd(a) * 3);
      a.actTimer = w.time + rdur(a, 2.2);
      a.actPhase = 0;
      // chunk 16 — a sea star (or an urchin) glides on without pauses, and needs minutes to get anywhere
      if (a.setId === 'starfish' || a.setId === 'urchin') {
        a.actDur = rdur(a, 150);
        a.actCount = 1 + Math.floor(rnd(a) * 2);
        a.actTimer = Infinity;
      }
      // chunk 16 — a Nassarius out of the sand: a short wander after a meal, a longer roam at night
      if (a.setId === 'snail_sand') a.actDur = rdur(a, w.time - a.lastFedT < 25 ? 18 : 55);
      // chunk 16 — a sand-sifting star roams the sand bed a good while at a time
      if (a.setId === 'starfish_sand') a.actDur = rdur(a, 45);
      return true;
    },
    tick(a, w) {
      // walk in bouts with pauses (axolotl, crayfish, crabs)
      if (w.time > a.actTimer) {
        a.actPhase = a.actPhase === 0 ? 1 : 0;
        a.actTimer = w.time + (a.actPhase === 0 ? rdur(a, 2.4) : rdur(a, 1.8));
      }
      if (a.actPhase === 1) {
        a.ctrl.hasGoal = false;
        a.ctrl.speedBL = 0;
        if (a.setId === 'axolotl') a.ctrl.pitchBias = 0.12 * Math.sin(w.time * 0.5 + a.noiseOff);
        return true;
      }
      go(a, a.actData, cruiseBL(a) * 1.1, a.L * 1.2);
      a.ctrl.wander = 0.4;
      // (Nassarius out on the sand jostle past one another rather than steer round each other)
      if (a.setId === 'snail_sand') a.ctrl.sep = 0.5;
      if (a.setId === 'axolotl' && a.loco === 'walk' && a.speed > a.L * 0.05) observe(a, w, 'walk');
      if (dist(a, a.actData) < reachR(a, w, 1.3)) {
        if (--a.actCount <= 0) return false;
        pickExploreSpot(a, w, 0.3);
      }
      return true;
    },
  },

  // ── rest / sleep / hide ──
  rest: {
    prio: 10,
    label: 'resting',
    pose: 'rest',
    enter(a, w) {
      // chunk 16 — a conch spends much of the day half-buried: its rests are long by day (an urchin's too, parked or in
      // a crevice)
      if (a.setId === 'conch') a.actDur *= w.env.daylight > 0.5 ? 4 : 1.3;
      if (a.setId === 'urchin') a.actDur *= w.env.daylight > 0.5 ? 3 : 1.2;
      return chooseRestSpot(a, w);
    },
    tick(a, w) {
      return restTick(a, w, false);
    },
  },

  sleep: {
    prio: 35,
    label: 'sleeping',
    pose: 'rest',
    enter(a, w) {
      a.actDur = 1e9;
      a.actCount = rrange(a, 0.45, 0.65); // individual wake threshold
      return chooseRestSpot(a, w);
    },
    tick(a, w) {
      if (a.activeness > a.actCount) return false;
      return restTick(a, w, true);
    },
  },

  hide: {
    prio: 20,
    label: 'hiding',
    pose: 'hiding',
    enter(a, w) {
      // chunk 16 — a six-line wrasse darts into the rockwork and out again
      if (rockSleep(a)) a.actDur = rdur(a, 4);
      return chooseHideSpot(a, w);
    },
    tick(a, w) {
      return hideTick(a, w);
    },
  },

  retreat: {
    prio: 70,
    label: 'retreating to cover',
    pose: 'hiding',
    enter(a, w) {
      a.actDur = rdur(a, a.tags.has('shy') ? 14 : 7) * (0.6 + (1 - a.mods.boldness) * 0.8);
      return chooseHideSpot(a, w);
    },
    tick(a, w) {
      // chunk 16 — a fright sends a blenny, a damsel or an emerald crab straight into cover at full speed
      const dash = a.set.startle === 'shelter' || rockSleep(a);
      // a C-start: a startled darter whose cover lies behind it flips round toward it at once, level (the ordinary turn
      // turns round horizontally first, so a blenny perched head up over its hole only backed away: chunk 16)
      // (only with the cover some way off: right beside it the way round is arbitrary, and a flip read as a snap)
      if (dash && a.actPhase === 0 && a.actT < 0.05 && a.loco === 'swim') {
        _a.subVectors(a.actData, a.rt.pos);
        // (the distance in 3D: a hole right below a head-up blenny is far enough; level when the cover lies off to the
        // side, nose down at it when it lies below — the pitch cap then holds the dive in range)
        if (a.fwd.dot(_a) < 0 && _a.lengthSq() > a.L * a.L * 0.64) {
          if (Math.hypot(_a.x, _a.z) > a.L * 0.3) _a.y = 0;
          a.fwd.copy(_a.normalize());
          a.aim.copy(a.fwd);
        }
      }
      a.ctrl.urgency = a.actPhase === 0 ? (dash ? 1 : 0.6) : 0;
      const r = hideTick(a, w, 1.6, dash && a.actT < 4 ? burstBL(a) * 0.8 : 0);
      if (dash && a.actPhase === 0 && a.actT < 0.5) a.pose = 'startle';
      return r;
    },
  },

  // ── curiosity ──
  inspect_glass: {
    prio: 12,
    label: 'watching you through the glass',
    pose: 'hover',
    enter(a, w) {
      const env = w.env;
      if (a.set.loco === 'crawl') return false;
      const x = env.pointerActive && env.focused ? env.pointer.x : a.rt.pos.x + rrange(a, -0.15, 0.15);
      glassPoint(a, w, x, rrange(a, a.zoneY0, a.zoneY1), a.actData);
      return true;
    },
    tick(a, w) {
      const env = w.env;
      if (env.pointerActive && env.focused) a.actData.x += (env.pointer.x - a.actData.x) * perStep(0.02);
      _a.copy(a.actData);
      if (a.actPhase >= 1) _a.x += Math.sin(w.time * 0.45 + a.noiseOff) * a.L * 0.8;
      go(a, fitInWater(a, w, _a), cruiseBL(a) * 0.9, a.L * 1.5);
      a.ctrl.avoid = 0.2;
      if (a.loco === 'walk') a.ctrl.pitchBias = 0.18;
      if (dist(a, a.actData) < a.L * 1.4) a.actPhase = 1;
      if (a.actPhase >= 1) {
        _b.set(a.rt.pos.x + Math.sin(w.time * 0.3 + a.noiseOff) * 0.1, a.rt.pos.y + 0.02, env.maxZ + 0.6);
        look(a, env.pointerActive && env.focused ? V[6].set(env.pointer.x, env.pointer.y, env.maxZ + 0.3) : _b);
        // a betta sees its reflection and may flare at it
        if (a.setId === 'betta' && a.actT > 2 && rnd(a) < 0.004 * stepRate.k * (0.5 + a.mods.displayDrive)) return false;
      }
      return true;
    },
  },

  follow_pointer: {
    prio: 30,
    label: 'following your finger',
    pose: 'hover',
    enter(a, w) {
      if (a.set.loco === 'crawl' || !w.env.pointerActive) return false;
      a.actDur = 1e9;
      a.lastPointerInterestT = w.time;
      return true;
    },
    tick(a, w) {
      const env = w.env;
      if (!env.pointerActive || !env.focused || w.time - env.pointerMoveT > 3 + a.pointerInterest * 6) return false;
      if (a.actT > 12 + a.pointerInterest * 25) return false; // eventually loses interest
      const y = a.loco === 'walk' ? floorAt(env, env.pointer.x, env.maxZ - 0.02) : clamp(env.pointer.y, a.zoneY0 - col(w) * 0.2, a.zoneY1 + col(w) * 0.2);
      glassPoint(a, w, env.pointer.x, y, _a);
      go(a, _a, cruiseBL(a) * (1.2 + a.pointerInterest * 0.6), a.L * 1.8);
      a.ctrl.avoid = 0.2;
      a.ctrl.urgency = 0.3;
      if (a.loco === 'walk') a.ctrl.pitchBias = 0.2;
      look(a, V[6].set(env.pointer.x, env.pointer.y, env.maxZ + 0.35));
      return true;
    },
  },

  inspect_tap: {
    prio: 32,
    label: 'investigating the tap',
    pose: 'hover',
    enter(a) {
      a.actDur = rrange(a, 2.5, 5);
      a.actTimer = 0.25;
      return true;
    },
    tick(a, w) {
      if (a.actPhase === 0) {
        // brief flinch, then turn to investigate
        _a.subVectors(a.rt.pos, a.frightFrom);
        safeNormalize(_a, a.fwd);
        _b.copy(a.rt.pos).addScaledVector(_a, a.L * 2);
        go(a, fitInWater(a, w, _b), burstBL(a) * 0.5, 0.001);
        a.ctrl.urgency = 1;
        if (a.actT > a.actTimer) a.actPhase = 1;
        return true;
      }
      _a.copy(a.frightFrom);
      glassPoint(a, w, _a.x, clamp(_a.y, a.zoneY0 - 0.05, a.zoneY1 + 0.05), _b);
      if (Math.abs(a.frightFrom.z - w.env.maxZ) > 0.03) _b.copy(a.frightFrom).lerp(a.rt.pos, 0.3);
      go(a, fitInWater(a, w, _b), cruiseBL(a), a.L * 2);
      look(a, a.frightFrom);
      a.ctrl.avoid = 0.3;
      return true;
    },
  },

  inspect_decor: {
    prio: 10,
    label: 'inspecting the scenery',
    pose: 'hover',
    enter(a, w) {
      if (isCrawler(a)) return false;
      const standoff = bodyHX(a) + a.L * 0.22 + 0.004;
      // lane:brackish — surface grazers (mollies) also rasp algae off the back and end glass
      if (grazesSurfaces(a) && rnd(a) < 0.3) {
        glassGrazeSpot(a, w, standoff);
        a.actTimer = 0;
        return true;
      }
      const idx = pointNearDecor(a, w, a.actData, a.actNormal, standoff, { soft: true, maxY: a.zoneY1 + a.L * 2 });
      if (idx < 0) return false;
      a.actTarget = w.env.colliders[idx].decorId;
      a.actTimer = 0;
      return true;
    },
    tick(a, w) {
      // surface point being inspected
      _a.copy(a.actData).addScaledVector(a.actNormal, -(bodyHX(a) + a.L * 0.22));
      look(a, _a);
      go(a, a.actData, cruiseBL(a) * 0.85, a.L * 1.5);
      a.ctrl.avoid = 0.35;
      if (a.actPhase === 0 && dist(a, a.actData) < a.L * 0.7) {
        a.actPhase = 1;
        a.actTimer = w.time + rdur(a, 0.8);
      }
      if (a.actPhase === 1 && w.time > a.actTimer) {
        // nibble / pick at the surface, then shuffle along it (grazers pick in quick little bouts)
        a.mouthPulse = 0.8;
        a.actTimer = w.time + rdur(a, grazesSurfaces(a) ? 0.55 : 1.1);
        if (grazesSurfaces(a)) observe(a, w, 'graze');
        _b.set(rrange(a, -1, 1), rrange(a, -0.5, 0.5), rrange(a, -1, 1)).addScaledVector(a.actNormal, -_b.dot(a.actNormal));
        a.actData.addScaledVector(_b, a.L * 0.35);
        fitInWater(a, w, a.actData);
        if (a.setId === 'tang' || a.setId === 'rabbitfish' || a.setId === 'angelfish_dwarf') observe(a, w, 'graze');
      }
      a.pose = a.actPhase === 1 && (a.setId === 'tang' || a.setId === 'rabbitfish' || a.setId === 'angelfish_dwarf' || grazesSurfaces(a)) ? 'feed' : 'hover';
      if (grazesSurfaces(a)) a.behavior = 'grazing algae'; // lane:brackish
      return true;
    },
  },

  // ── foraging ──
  forage: {
    prio: 10,
    label: 'foraging',
    pose: 'feed',
    enter(a, w) {
      if (a.set.picker && a.loco === 'swim') {
        // chunk 16 — a wrasse's foraging bout: many short stops low over rock and sand
        pickPeckSpot(a, w, false);
        a.actTimer = 0;
        a.actCount = 4 + Math.floor(rnd(a) * 6);
        return true;
      }
      pickForageSpot(a, w);
      a.actTimer = 0;
      a.actCount = 2 + Math.floor(rnd(a) * 4);
      return true;
    },
    tick(a, w) {
      if (a.set.picker && a.loco === 'swim') return peckTick(a, w);
      const env = w.env;
      const crawler = a.loco === 'crawl' || a.loco === 'walk';
      const surfaceForager = a.setId === 'surface_dweller';
      if (a.actPhase === 0) {
        const hop = a.set.crawlGait === 'hop' ? (Math.sin(w.time * 5 + a.noiseOff) > 0.2 ? 1.8 : 0.1) : 1;
        go(a, a.actData, cruiseBL(a) * (crawler ? 1 : 0.9) * hop, a.L * 1.2);
        a.ctrl.wander = 0.2;
        a.ctrl.allowFloor = !surfaceForager;
        a.ctrl.allowSurface = surfaceForager;
        if (!crawler && a.rt.pos.y < floorAt(env, a.rt.pos.x, a.rt.pos.z) + a.L * 1.5) a.ctrl.pitchBias = -0.35;
        if (dist(a, a.actData) < a.L * 0.9) {
          a.actPhase = 1;
          // (chunk 16: a sand-sifting star digs in a while at each spot; a ram's stops are short)
          a.actTimer = w.time + rdur(a, a.setId === 'starfish_sand' ? 12 : a.setId === 'cichlid_dwarf' ? 1.8 : crawler ? 1.6 : 2.6);
        }
        return true;
      }
      // sifting / picking in place
      a.ctrl.allowFloor = !surfaceForager;
      a.ctrl.allowSurface = surfaceForager;
      // chunk 16 — a sand-sifting star digs its arms and disc into the sand to feed
      if (a.setId === 'starfish_sand' && crawler) {
        const bp = buryProfile(a);
        if (bp && onSand(a, w)) a.ctrl.sink = bp.depth * 0.45;
      }
      // chunk 16 — a ram takes a mouthful of sand, works it a moment and spits it out
      if (a.setId === 'cichlid_dwarf') {
        if (a.siftT > 0 && w.time >= a.siftT) {
          a.siftT = 0;
          a.sift = 1;
          a.mouthPulse = Math.max(a.mouthPulse, 0.8);
        } else if (a.siftT === 0 && rnd(a) < 0.035 * stepRate.k) {
          a.mouthPulse = 1;
          a.siftT = w.time + rrange(a, 0.5, 0.9);
        }
      }
      if (!crawler) {
        _a.copy(a.actData).addScaledVector(a.fwd, a.L * 0.05 * Math.sin(w.time * 1.3 + a.noiseOff));
        go(a, _a, cruiseBL(a) * 0.4, a.L * 1.2);
        // nose-down to pick at the bottom, but no head-stands (corys and goldfish tip ~30–35°, not vertical)
        a.ctrl.pitchBias = surfaceForager ? 0.35 : hoverShoal(a) ? 0.1 : a.set.bottomHugger || a.setId === 'goldfish' ? -0.42 : -0.3;
        a.ctrl.avoid = 0.4;
      } else {
        a.ctrl.hasGoal = false;
      }
      if (a.setId !== 'cichlid_dwarf' && rnd(a) < 0.12 * stepRate.k) {
        a.mouthPulse = Math.max(a.mouthPulse, 0.6 + rnd(a) * 0.4);
        if (crawler) a.appendage = Math.max(a.appendage, 0.8);
      }
      if (w.time > a.actTimer) {
        if (--a.actCount <= 0) return false;
        pickForageSpot(a, w, true);
        a.actPhase = 0;
      }
      return true;
    },
  },

  graze: {
    prio: 10,
    label: 'grazing',
    pose: 'feed',
    enter(a, w) {
      if (!isCrawler(a)) {
        // chunk 16 — a lawnmower blenny grazes film algae off the rock and glass, face to the surface, in bouts
        if (!a.set.surfaceGrazer) return false;
        blennyGrazeSpot(a, w, false);
        a.actTimer = 0;
        a.actCount = 3 + Math.floor(rnd(a) * 4);
        return true;
      }
      grazePatch(a, w);
      const star = slowGrazer(a);
      // (a sea star starts on the patch it is on: long stays, slow drifts between them — the act runs on its count)
      if (star) {
        a.actPhase = 1;
        a.actDur = 1e9;
      }
      a.actTimer = w.time + (star ? rdur(a, 18) : rdur(a, 1.4));
      a.actCount = star ? 2 + Math.floor(rnd(a) * 3) : 3 + Math.floor(rnd(a) * 5);
      // (chunk 16: by day an urchin grazes a patch or two and parks again)
      if (a.setId === 'urchin' && w.env.daylight > 0.5) a.actCount = Math.max(1, a.actCount - 2);
      return true;
    },
    tick(a, w) {
      if (!isCrawler(a)) return peckTick(a, w);
      const t = w.time;
      const snail = a.setId === 'snail';
      if (!snail && t > a.actTimer) {
        a.actPhase = a.actPhase === 0 ? 1 : 0;
        // chunk 16 — a sea star (an urchin) stays a long while on each patch and drifts slowly to the next; a conch
        // sifts a little longer at each stop than a shrimp picks
        const star = slowGrazer(a);
        // (a sea star drifts on until it gets there: a couple of minutes at most)
        const move = star ? 120 : rdur(a, a.setId === 'algae_grazer' || a.setId === 'hillstream' ? 0.5 : 1.3);
        const stay = star ? rdur(a, 24) : rdur(a, a.setId === 'conch' ? 3.2 : a.setId === 'crab' ? 4 : 2.2);
        a.actTimer = t + (a.actPhase === 0 ? move : stay);
        if (star && a.actPhase === 0 && --a.actCount <= 0) return false;
      }
      if (a.actPhase === 1) {
        // picking in place: shrimp chelipeds flick ~3–4 Hz, otos rasp (chunk 16: an emerald crab picks at the algae
        // with its spoon-tipped claws, ~2 strokes a second, and passes each pinch to its mouth)
        a.ctrl.hasGoal = false;
        a.ctrl.speedBL = 0;
        if (a.setId.startsWith('shrimp')) a.appendage = Math.max(a.appendage, 0.45 + 0.55 * Math.abs(Math.sin(t * 11 + a.noiseOff)));
        else if (a.setId === 'crab') {
          a.appendage = Math.max(a.appendage, 0.4 + 0.6 * Math.abs(Math.sin(t * 6.5 + a.noiseOff)));
          a.mouthPulse = Math.max(a.mouthPulse, 0.3 * Math.abs(Math.sin(t * 6.5 + a.noiseOff + 1.2)));
        } else a.mouthPulse = Math.max(a.mouthPulse, 0.35 + 0.3 * Math.abs(Math.sin(t * 6)));
        if (a.loco !== 'swim') observe(a, w, 'graze');
        return true;
      }
      go(a, a.actData, cruiseBL(a) * (snail ? 1 : 0.9), a.L * (slowGrazer(a) ? 0.4 : 1.2));
      a.ctrl.wander = snail ? 0.25 : 0.15;
      if (snail) {
        a.mouthPulse = Math.max(a.mouthPulse, 0.25 + 0.2 * Math.sin(t * 2.2 + a.noiseOff)); // radula rasping while gliding
        if (a.loco !== 'swim' && a.actT > 3) observe(a, w, 'graze');
      }
      if (dist(a, a.actData) < a.L * (slowGrazer(a) ? 0.5 : 1.2)) {
        if (slowGrazer(a)) {
          // on the new patch: settle down to graze it
          a.actPhase = 1;
          a.actTimer = t + rdur(a, 24);
          grazePatch(a, w);
          return true;
        }
        if (--a.actCount <= 0) return false;
        grazePatch(a, w);
      }
      return true;
    },
  },

  // ── feeding ──
  feed: {
    prio: 60,
    label: 'feeding',
    pose: 'feed',
    enter(a) {
      a.actDur = 25;
      return a.foodId >= 0;
    },
    tick(a, w) {
      return feedTick(a, w);
    },
  },

  hunt: {
    prio: 60,
    label: 'hunting',
    pose: 'feed',
    enter(a) {
      a.actDur = 30;
      return a.foodId >= 0;
    },
    tick(a, w) {
      return huntTick(a, w);
    },
  },

  beg: {
    prio: 12,
    label: 'begging at the glass',
    pose: 'hover',
    enter(a, w) {
      if (isCrawler(a)) return false;
      const env = w.env;
      const x = env.pointerActive && env.focused ? env.pointer.x : a.hasFeedSpot ? a.feedSpot.x : a.rt.pos.x;
      glassPoint(a, w, x, clamp(env.surfaceY - col(w) * 0.25, a.zoneY0, env.surfaceY), a.actData);
      return true;
    },
    tick(a, w) {
      const env = w.env;
      if (env.pointerActive && env.focused) a.actData.x += (env.pointer.x - a.actData.x) * perStep(0.03);
      _a.copy(a.actData);
      _a.y += Math.sin(w.time * 1.1 + a.noiseOff) * a.L * 0.4;
      go(a, fitInWater(a, w, _a), cruiseBL(a), a.L * 1.5);
      a.ctrl.avoid = 0.2;
      look(a, V[6].set(a.rt.pos.x, a.rt.pos.y + 0.05, env.maxZ + 0.5));
      if (rnd(a) < 0.05 * stepRate.k) a.mouthPulse = 0.7;
      return true;
    },
  },

  // ── reactions ──
  startle: {
    prio: 90,
    label: 'startled',
    pose: 'startle',
    enter(a, w) {
      const env = w.env;
      const I = clamp(a.fright, 0.2, 1);
      _a.subVectors(a.rt.pos, a.frightFrom);
      _a.y *= 0.5;
      safeNormalize(_a, V[7].set(-a.fwd.x, 0, -a.fwd.z).normalize());
      switch (a.set.startle) {
        case 'retract':
          a.actDur = rrange(a, 3, 8) * (0.6 + I);
          a.pose = 'hiding';
          return true;
        case 'freeze':
          a.actDur = rrange(a, 2, 4.5);
          // chunk 16 — a sea star just stops where it is (an urchin stops too, its spines stiff: pose 'startle')
          if (isCrawler(a) && a.setId !== 'urchin') a.pose = 'rest';
          return true;
        case 'burrow':
          a.actDur = 0.01; // handled by the burrow activity (dive)
          a.actCount = 1;
          return true;
        case 'tailflip': {
          a.actDur = rrange(a, 0.35, 0.6);
          if (a.set.canSwim) {
            takeOff(a);
            a.drift.copy(_a).multiplyScalar(burstBL(a) * a.L * (0.7 + I * 0.5));
            a.drift.y += a.L * 1.5;
          } else {
            a.speed = -burstBL(a) * a.L * 0.8; // crayfish shoots backwards
          }
          return true;
        }
        default: {
          a.actDur = rrange(a, 0.45, 0.9) * (0.7 + I * 0.6);
          _b.copy(a.rt.pos).addScaledVector(_a, a.L * rrange(a, 3, 6) * (0.6 + I));
          if (a.loco === 'walk' && a.set.canSwim) takeOff(a);
          fitInWater(a, w, _b);
          if (!pointFree(env, _b.x, _b.y, _b.z, bodySide(a))) randomSwimPoint(a, w, _b, { near: _b, radius: a.L * 3 });
          a.actData.copy(_b);
          // instant burst — the C-start
          a.speed = Math.max(a.speed, burstBL(a) * a.L * 0.5 * (0.6 + I));
          return true;
        }
      }
    },
    tick(a, w) {
      switch (a.set.startle) {
        case 'retract':
        case 'freeze':
          // (a conch pulled into its shell stays as deep in the sand as it was)
          if (a.sink > 0) a.ctrl.sink = a.sink;
          a.ctrl.hasGoal = a.act === 'startle' && a.loco !== 'crawl' && a.loco !== 'walk';
          if (a.ctrl.hasGoal) {
            a.ctrl.goal.copy(a.rt.pos);
            a.ctrl.speedBL = 0.1;
            a.ctrl.attach = a.set.startle === 'freeze' ? 0.3 : 0;
          }
          return true;
        case 'tailflip':
          a.ctrl.hasGoal = false;
          a.ctrl.speedBL = 0;
          a.ctrl.allowFloor = true;
          return true;
        default:
          go(a, a.actData, burstBL(a) * (0.55 + a.fright * 0.45), 0.001);
          a.ctrl.urgency = 1;
          a.ctrl.wander = 0;
          a.ctrl.sep = 0.5;
          return true;
      }
    },
  },

  breathe: {
    prio: 58,
    label: 'gulping air at the surface',
    pose: 'surface_breath',
    enter(a, w) {
      const env = w.env;
      if (a.loco === 'walk' || a.loco === 'crawl') takeOff(a);
      const x = a.rt.pos.x + rrange(a, -0.08, 0.08);
      const z = clamp(a.rt.pos.z + rrange(a, -0.04, 0.04), env.minZ + bodyHX(a), env.maxZ - bodyHX(a));
      // the mouth must reach the film: body centre sits just under the surface, nose-up
      a.actData.set(clamp(x, env.minX + bodyHX(a) + 0.01, env.maxX - bodyHX(a) - 0.01), env.surfaceY - bodyHX(a) * 0.55, z);
      a.actDur = 12;
      a.actTimer = 0;
      return true;
    },
    tick(a, w) {
      const env = w.env;
      const tr = a.set.airBreath ?? [60, 180];
      const fast = a.setId === 'betta' || a.setId === 'bottom_forager' || a.setId === 'frog_aquatic' || a.setId === 'gourami';
      if (a.actPhase === 0) {
        go(a, a.actData, fast ? burstBL(a) * 0.45 : cruiseBL(a) * 1.3, a.L * 0.8);
        a.ctrl.allowSurface = true;
        a.ctrl.pitchBias = 0.55;
        a.ctrl.avoid = 0.5;
        a.ctrl.urgency = fast ? 0.7 : 0.2;
        mouthPos(a, _a);
        if (_a.y > env.surfaceY - a.L * 0.12 || dist(a, a.actData) < a.L * 0.35) {
          a.actPhase = 1;
          a.actTimer = w.time + rrange(a, 0.35, 0.7);
          a.mouthPulse = 1;
          emit(w, 'bubble_burst', V[6].set(_a.x, env.surfaceY, _a.z), a.id, 0.25);
          observe(a, w, 'surface_gulp');
          a.breathNext = w.time + rrange(a, tr[0], tr[1]) / (1 + a.stress * 0.8 + (env.oxygen < 0.55 ? 1.5 : 0));
        }
        return true;
      }
      if (a.actPhase === 1) {
        a.ctrl.goal.copy(a.actData);
        a.ctrl.hasGoal = true;
        a.ctrl.speedBL = 0.2;
        a.ctrl.allowSurface = true;
        a.ctrl.pitchBias = 0.6;
        a.mouthPulse = Math.max(a.mouthPulse, 0.8);
        if (w.time > a.actTimer) {
          a.actPhase = 2;
          a.actData.y = env.floorY + (env.surfaceY - env.floorY) * rrange(a, 0.25, 0.6);
          if (isCrawler(a)) a.actData.y = floorAt(env, a.actData.x, a.actData.z) + bodyHY(a);
          a.actTimer = w.time + rrange(a, 1.2, 2.5);
          if (a.setId === 'axolotl') a.gill = 1;
        }
        return true;
      }
      // glide back down (axolotls & corys let themselves sink)
      go(a, a.actData, cruiseBL(a) * (fast ? 1.4 : 0.8), a.L * 1.5);
      a.ctrl.allowFloor = true;
      a.ctrl.pitchBias = -0.25;
      return w.time < a.actTimer;
    },
  },

  gasp: {
    prio: 45,
    label: 'gasping at the surface',
    pose: 'surface_breath',
    enter(a, w) {
      if (isCrawler(a)) return false;
      const env = w.env;
      a.actData.set(a.rt.pos.x, env.surfaceY - bodySide(a) - 0.004, a.rt.pos.z);
      a.actDur = rrange(a, 5, 12);
      return true;
    },
    tick(a, w) {
      go(a, a.actData, cruiseBL(a), a.L * 1.5);
      a.ctrl.allowSurface = true;
      a.ctrl.pitchBias = 0.35;
      return true;
    },
  },

  display: {
    prio: 14,
    label: 'displaying',
    pose: 'display',
    enter(a, w) {
      return chooseDisplayTarget(a, w);
    },
    tick(a, w) {
      const tgt = a.actTarget ? w.byId.get(a.actTarget) : null;
      if (tgt) {
        if (tgt.dead) return false;
        a.actNormal.copy(tgt.rt.pos);
        // side-on, a body length or two away, drifting beside the target
        _a.subVectors(a.rt.pos, tgt.rt.pos);
        _a.y = 0;
        safeNormalize(_a, V[7].set(1, 0, 0));
        _b.copy(tgt.rt.pos).addScaledVector(_a, a.L * 1.6);
        _b.y += Math.sin(w.time * 1.4 + a.noiseOff) * a.L * 0.3;
        // lane:brackish — a sailfin molly holds its display calmly: it glides after its target (a soft attach) and keeps
        // facing it, instead of flicking between "face it" and "swim beside it"
        const sail = !!a.sp.specialBehaviors?.includes('sail_display');
        go(a, fitInWater(a, w, _b), cruiseBL(a) * (sail ? 0.6 : 1.2), a.L * (sail ? 2 : 1));
        if (sail) a.ctrl.attach = 0.35; // glides after its target, facing it, sail up
        look(a, tgt.rt.pos);
        if (a.setId === 'clownfish') tgt.quiverUntil = Math.max(tgt.quiverUntil, w.time + 0.6);
      } else {
        // reflection in the glass (betta): face the mirror image, dance side to side
        _a.copy(a.actData);
        _a.x += Math.sin(w.time * 1.8 + a.noiseOff) * a.L * 0.35;
        go(a, fitInWater(a, w, _a), cruiseBL(a), a.L);
        a.ctrl.avoid = 0.15;
        look(a, a.actNormal);
      }
      a.quiverUntil = Math.max(a.quiverUntil, w.time + 0.2);
      if (a.setId === 'betta' && a.actT > 0.6) observe(a, w, 'fin_flare');
      return true;
    },
  },

  glass_surf: {
    prio: 40,
    label: 'glass surfing (stressed)',
    pose: 'swim',
    enter(a, w) {
      if (isCrawler(a)) return false;
      a.actPhase = 0;
      a.actNormal.x = rnd(a) < 0.5 ? w.env.maxZ : w.env.minZ;
      setSurfPoint(a, w);
      return true;
    },
    tick(a, w) {
      go(a, a.actData, cruiseBL(a) * 1.35, a.L * 0.8);
      a.ctrl.avoid = 0.15;
      if (dist(a, a.actData) < a.L * 1.2) {
        a.actPhase = 1 - a.actPhase;
        setSurfPoint(a, w);
      }
      return true;
    },
  },

  // ── social / breeding ──
  court: {
    prio: 52,
    label: 'courting',
    pose: 'court',
    enter(a, w) {
      a.actDur = 1e9;
      return !!partnerOf(a, w);
    },
    tick(a, w) {
      const p = partnerOf(a, w);
      if (!p || !breedingActFor(a, w)) return false;
      courtTick(a, w, p);
      return true;
    },
  },

  spawn: {
    prio: 56,
    label: 'spawning',
    pose: 'spawn',
    enter(a) {
      a.actDur = 1e9;
      return true;
    },
    tick(a, w) {
      if (breedingActFor(a, w) !== 'spawn') return false;
      const p = partnerOf(a, w);
      if (p) {
        // tight side-by-side embrace / quiver (betta wraps around the female under the nest)
        _a.copy(p.rt.pos).addScaledVector(p.fwd, -a.L * 0.1);
        _a.y += a.L * (a.id < p.id ? 0.15 : -0.15);
        go(a, fitInWater(a, w, _a), cruiseBL(a), a.L);
        look(a, p.rt.pos);
        a.ctrl.sep = 0;
        a.quiverUntil = w.time + 0.3;
      } else {
        // laying alone (axolotl eggs on plants, puffer eggs in moss): nose along the plants
        if (a.actPhase === 0 || dist(a, a.actData) < a.L * 0.8) {
          if (pointNearDecor(a, w, a.actData, a.actNormal, bodyHX(a) + a.L * 0.2, { soft: true }) < 0) randomSwimPoint(a, w, a.actData);
          a.actPhase = 1;
          a.mouthPulse = 0.6;
        }
        go(a, a.actData, cruiseBL(a) * 0.7, a.L);
        a.ctrl.avoid = 0.4;
      }
      return true;
    },
  },

  nest_build: {
    prio: 50,
    label: 'building a nest',
    pose: 'hover',
    enter(a, w) {
      chooseNestSite(a, w);
      a.actTimer = 0;
      return true;
    },
    tick(a, w) {
      return nestTick(a, w);
    },
  },

  guard: {
    prio: 55,
    label: 'guarding eggs',
    pose: 'guard',
    enter(a, w) {
      a.actDur = 1e9;
      return clutchPos(a, w, a.actNormal);
    },
    tick(a, w) {
      if (breedingActFor(a, w) !== 'guard') return false;
      clutchPos(a, w, a.actNormal);
      return guardTick(a, w);
    },
  },

  pair_follow: {
    prio: 11,
    label: 'swimming with its partner',
    pose: 'swim',
    enter(a, w) {
      // (chunk 16: a ram keeps close to its mate)
      const p = partnerOf(a, w) ?? (a.setId === 'clownfish' ? dominantOf(a, w) : a.setId === 'cichlid_dwarf' ? mateOf(a, w) : null);
      if (!p || p === a) return false;
      a.actTarget = p.id;
      a.actNormal.x = rnd(a) < 0.5 ? 1 : -1;
      return true;
    },
    tick(a, w) {
      const p = a.actTarget ? w.byId.get(a.actTarget) : null;
      if (!p || p.dead) return false;
      // behind and a little to the side of the partner, matching its heading
      _a.crossVectors(p.fwd, V[7].set(0, 1, 0));
      if (_a.lengthSq() < 1e-6) _a.set(0, 0, 1);
      _a.normalize();
      _b.copy(p.rt.pos).addScaledVector(p.fwd, -(p.L * 0.6 + a.L * 0.6)).addScaledVector(_a, a.actNormal.x * a.L * 0.45);
      _b.y += Math.sin(w.time * 0.8 + a.noiseOff) * a.L * 0.2;
      const d = dist(a, _b);
      go(a, fitInWater(a, w, _b), Math.max(cruiseBL(a) * 0.6, (p.speed / Math.max(a.L, 1e-3)) * 1.1 + d / a.L), a.L * 0.8);
      if (d < a.L * 1.5) {
        _c.copy(a.rt.pos).addScaledVector(p.fwd, a.L * 3);
        look(a, _c);
      }
      a.ctrl.sep = 0.3;
      if (a.setId === 'clownfish' && d < a.L * 2.5 && p.speed > p.L * 0.15) observe(a, w, 'pair_swim');
      return true;
    },
  },

  host: {
    prio: 11,
    label: 'at home',
    pose: 'hover',
    enter(a, w) {
      ensureHome(a, w);
      a.actPhase = 1;
      a.actTimer = w.time + rdur(a, 5);
      return true;
    },
    tick(a, w) {
      return hostTick(a, w);
    },
  },

  hitch: {
    prio: 11,
    label: 'hitched to a holdfast',
    pose: 'swim',
    enter(a, w) {
      return chooseHitch(a, w, a.prevAct === 'hitch');
    },
    tick(a, w) {
      return hitchTick(a, w);
    },
  },

  visit_cleaner: {
    prio: 25,
    label: 'visiting the cleaner',
    pose: 'hover',
    enter(a, w) {
      const cl = findCleaner(a, w);
      if (!cl) return false;
      a.actTarget = cl.id;
      a.actDur = 25;
      return true;
    },
    tick(a, w) {
      const cl = a.actTarget ? w.byId.get(a.actTarget) : null;
      if (!cl || cl.dead || (cl.act !== 'clean_station' && cl.act !== 'cleaning')) return false;
      // pose above/in front of the station, nose slightly down, gills and mouth open
      _a.copy(cl.rt.pos).add(V[7].set(0, bodySide(a) + cl.L * 0.6, bodySide(a) * 0.6 + a.L * 0.1));
      fitInWater(a, w, _a);
      go(a, _a, cruiseBL(a) * 0.9, a.L);
      a.ctrl.sep = 0;
      a.ctrl.avoid = 0.3;
      if (a.actPhase === 0 && dist(a, _a) < a.L * 0.7) {
        a.actPhase = 1;
        a.actTimer = w.time + rrange(a, 4, 9);
        if (cl.act === 'clean_station') startAct(cl, w, 'cleaning');
        cl.actTarget = a.id;
      }
      if (a.actPhase === 1) {
        a.ctrl.attach = 0.35;
        a.ctrl.pitchBias = -0.28;
        a.mouthPulse = Math.max(a.mouthPulse, 0.55);
        a.gill = Math.max(a.gill, 0.6);
        _b.copy(a.rt.pos).addScaledVector(a.fwd, a.L);
        _b.y -= a.L * 0.3;
        look(a, _b);
        if (w.time > a.actTimer) return false;
      }
      return true;
    },
  },

  clean_station: {
    prio: 11,
    label: 'running a cleaning station',
    pose: 'hover',
    enter(a, w) {
      ensureStation(a, w);
      a.actDur = rdur(a, 45);
      return true;
    },
    tick(a, w) {
      // (a station it cannot get to — a cave mouth under the rock it is standing on — is kept where it stands)
      if (a.actPhase === 0) {
        const d = dist(a, a.home);
        if (a.settleBest < 0 || d < a.settleBest - a.L * 0.05) {
          a.settleBest = d;
          a.settleT = w.time;
        } else if (w.time - a.settleT > 4) a.home.copy(a.rt.pos);
      }
      go(a, a.home, cruiseBL(a), a.L * 0.8);
      if (dist(a, a.home) < a.L * 0.9) {
        a.actPhase = 1;
        a.ctrl.hasGoal = false;
        a.ctrl.speedBL = 0;
      }
      return true;
    },
  },

  cleaning: {
    prio: 45,
    label: 'cleaning a client',
    pose: 'feed',
    enter(a) {
      takeOff(a);
      a.actDur = 20;
      return true;
    },
    tick(a, w) {
      const cl = a.actTarget ? w.byId.get(a.actTarget) : null;
      if (!cl || cl.dead || cl.act !== 'visit_cleaner') return false;
      // climb along the client's flank, picking parasites
      _a.crossVectors(cl.fwd, V[7].set(0, 1, 0));
      if (_a.lengthSq() < 1e-6) _a.set(0, 0, 1);
      _a.normalize();
      const side = Math.sin(w.time * 0.35 + a.noiseOff) > 0 ? 1 : -1;
      _b.copy(cl.rt.pos)
        .addScaledVector(_a, side * (bodySide(cl) + bodyHY(a)))
        .addScaledVector(cl.fwd, Math.sin(w.time * 0.6 + a.noiseOff) * cl.L * 0.3);
      go(a, fitInWater(a, w, _b), burstBL(a) * 0.4, a.L * 0.5);
      a.ctrl.attach = dist(a, _b) < a.L ? 0.6 : 0;
      a.ctrl.sep = 0;
      a.ctrl.avoid = 0.2;
      a.ctrl.allowFloor = true;
      look(a, cl.rt.pos);
      a.appendage = Math.max(a.appendage, 0.5 + 0.5 * Math.abs(Math.sin(w.time * 12)));
      return true;
    },
  },

  perch: {
    prio: 11,
    label: 'perched',
    pose: 'hover',
    enter(a, w) {
      // chunk 16 — a lawnmower blenny or a flame hawkfish sits on the rock (or the glass) itself
      if (a.setId === 'blenny' || a.setId === 'hawkfish') return chooseRockPerch(a, w);
      return choosePerch(a, w);
    },
    tick(a, w) {
      if (a.setId === 'blenny' || a.setId === 'hawkfish') return rockPerchTick(a, w);
      return perchTick(a, w);
    },
  },

  burrow: {
    prio: 11,
    label: 'at its burrow',
    pose: 'hover',
    enter(a, w) {
      if (buryProfile(a) && isCrawler(a)) {
        // chunk 16 — a Nassarius digs in where it is (no burrow of its own) and waits under the sand
        a.actDur = rdur(a, w.env.daylight > 0.5 ? 150 : 70);
        if (a.fright > 0.3 && w.time - a.lastStartleT < 1) a.actPhase = 2;
        a.pose = 'rest';
        a.behavior = 'buried in the sand';
        return true;
      }
      ensureBurrow(a, w);
      a.actDur = rdur(a, 30);
      if (a.fright > 0.3 && w.time - a.lastStartleT < 1) a.actPhase = 2;
      return true;
    },
    tick(a, w) {
      return burrowTick(a, w);
    },
  },

  float: {
    prio: 10,
    label: 'floating (zen)',
    pose: 'hover',
    enter(a, w) {
      const env = w.env;
      a.actData.set(a.rt.pos.x + rrange(a, -0.08, 0.08), env.floorY + col(w) * rrange(a, 0.55, 0.85), a.rt.pos.z + rrange(a, -0.04, 0.04));
      fitInWater(a, w, a.actData);
      return true;
    },
    tick(a, w) {
      go(a, a.actData, cruiseBL(a) * 1.4, a.L * 2);
      if (dist(a, a.actData) < a.L * 1.2) a.actPhase = 1;
      if (a.actPhase === 1) {
        // spread-eagled, motionless, drifting with the water
        a.ctrl.attach = 0.08;
        a.ctrl.speedBL = 0;
        a.actData.y -= 0.0012 * stepRate.dt;
      }
      return true;
    },
  },

  brood: {
    prio: 50,
    label: 'mouthbrooding',
    pose: 'guard',
    enter(a, w) {
      a.actDur = 1e9;
      if (pointNearDecor(a, w, a.actData, a.actNormal, bodyHX(a) + a.L * 0.7, { soft: true }) < 0) randomSwimPoint(a, w, a.actData, { near: a.rt.pos, radius: a.L * 3 });
      return true;
    },
    tick(a, w) {
      if (breedingActFor(a, w) !== 'brood') return false;
      // hangs still near cover, jaw bulging with eggs, occasionally churning them
      _a.copy(a.actData);
      _a.y += Math.sin(w.time * 0.4 + a.noiseOff) * a.L * 0.1;
      go(a, _a, cruiseBL(a) * 0.4, a.L * 1.5);
      a.ctrl.wander = 0.03;
      a.mouthPulse = Math.max(a.mouthPulse, 0.28 + (Math.sin(w.time * 0.7 + a.noiseOff) > 0.95 ? 0.3 : 0));
      lookAround(a, w, a.rt.pos, 5);
      return true;
    },
  },

  // lane:brackish — archerfish: line up under a fly above the water, tilt up, fire a jet, snap the fly off the surface
  spit: {
    prio: 13,
    label: 'taking aim at a fly',
    pose: 'hover',
    enter(a, w) {
      return spitEnter(a, w);
    },
    tick(a, w) {
      return spitTick(a, w);
    },
  },

  // chunk 16 — a badly frightened wrasse dives into the sand bed and stays buried a few seconds to a minute
  sand_dive: {
    prio: 65,
    label: 'hiding in the sand',
    pose: 'hiding',
    enter(a, w) {
      if (isCrawler(a) || !w.env.sandBed || rockSleep(a)) return false;
      a.actDur = 1e9;
      a.sandMode = true;
      if (a.buried > 0.9) {
        a.actPhase = 2;
        a.actData.set(a.rt.pos.x, a.rt.pos.y, a.rt.pos.z);
        return true;
      }
      // straight down into the sand near where it is
      return pickSandSpot(a, w, a.actData, a.rt.pos, a.L * 2.5);
    },
    tick(a, w, dt) {
      if (!w.env.sandBed) return false;
      if (!sandBuryTick(a, w, true)) return true;
      if (a.actCount === 0) {
        a.actCount = 1;
        a.actTimer = w.time + frightBuriedTime(a);
      }
      if (w.time < a.actTimer || a.fright > 0.15) return true;
      // night fell while it hid: it stays in for the night
      if (a.activeness < 0.3 && startAct(a, w, 'sleep')) return ACTS.sleep.tick(a, w, dt);
      return false;
    },
  },

  // chunk 16 — a territorial fish darts at an intruder near its home (it takes the hint and flees), then swims back
  chase: {
    prio: 28,
    label: 'chasing off an intruder',
    pose: 'display',
    enter(a, w) {
      const o = a.chaseId ? w.byId.get(a.chaseId) : undefined;
      a.chaseId = null;
      if (!o || o.dead || o === a) return false;
      a.actTarget = o.id;
      a.actDur = 9;
      a.actTimer = w.time + rrange(a, 0.9, 1.6);
      a.lastChaseT = w.time + rrange(a, 0, a.setId === 'damsel' ? 12 : 6);
      // the intruder takes the hint (it darts off, and then goes about its business: no hiding after it)
      if (o.loco === 'swim' && ACTS[o.act].prio < 30) {
        o.fright = Math.max(o.fright, 0.45);
        o.frightFrom.copy(a.rt.pos);
        o.lastStartleT = w.time;
        o.chasedT = w.time;
        startAct(o, w, 'startle');
      }
      return true;
    },
    tick(a, w) {
      return chaseTick(a, w);
    },
  },

  // chunk 16 — a living anemone creeps toward a spot it likes, in bouts; there, it settles for good (anemone.ts)
  wander: {
    prio: 8,
    label: 'looking for a place to settle',
    pose: 'rest',
    enter(a) {
      if (!a.set.anemone || a.settled) return false;
      a.actPhase = 1; // (the first tick starts a bout on the move)
      a.actTimer = 0;
      a.actCount = 0;
      return true;
    },
    tick(a, w, dt) {
      return wanderTick(a, w, dt);
    },
  },

  still: {
    prio: 5,
    label: 'settled',
    pose: 'rest',
    tick(a) {
      a.ctrl.hasGoal = false;
      return true;
    },
  },

  dead: {
    prio: 100,
    label: 'dead',
    pose: 'dead',
    enter(a, w) {
      a.actDur = 1e12;
      if (a.loco === 'upright' || a.loco === 'swim') a.actData.set(a.rt.pos.x, floorAt(w.env, a.rt.pos.x, a.rt.pos.z) + bodySide(a), a.rt.pos.z);
      return true;
    },
    tick(a, w) {
      if (a.loco === 'crawl' || a.loco === 'walk' || a.loco === 'sessile') {
        a.ctrl.hasGoal = false;
        return true;
      }
      go(a, a.actData, 0.25, a.L * 3);
      a.ctrl.allowFloor = true;
      a.ctrl.sep = 0;
      a.ctrl.wander = 0;
      a.speed = Math.min(a.speed, a.L * 0.3);
      return true;
    },
  },
};

// ───────────────────────────── activity control ─────────────────────────────

/** Switch activity. Returns false if the activity could not start (agent keeps a safe fallback). */
export function startAct(a: Agent, w: AIWorld, act: ActId): boolean {
  const def = ACTS[act];
  const prev = a.act;
  // leaving a meal: let go of the particle (a claim held by a fish that is no longer going for it would keep the
  // leftover on the sand forever); a piece it hovered over for a while without a bite is remembered as unreachable
  if ((prev === 'feed' || prev === 'hunt') && act !== 'feed' && act !== 'hunt') dropFood(a, w, w.time - a.foodT > 6 && w.time - a.lastFedT > 6);
  a.prevAct = prev;
  a.act = act;
  a.actT = 0;
  a.actPhase = 0;
  a.actTimer = 0;
  a.actCount = 0;
  a.actTarget = null;
  a.settleBest = -1;
  a.actDur = rdur(a, ACT_DURATION[act] ?? 10);
  a.pose = def.pose;
  a.behavior = def.label;
  // (chunk 16: only a rest, a sleep or a fright dive is spent in the sand; their enter decides)
  const sandMode = a.sandMode;
  if (act !== 'rest' && act !== 'sleep' && act !== 'sand_dive') a.sandMode = false;
  if (def.enter && !def.enter(a, w)) {
    a.sandMode = sandMode;
    a.act = prev;
    a.pose = ACTS[prev].pose;
    a.behavior = ACTS[prev].label;
    return false;
  }
  // off to do something else: the cave / hide / perch it had claimed is free for the others (a claim used to be held
  // until the animal picked another anchor, so most "full" hides in a community tank stood empty). A home-holder
  // keeps the claim on its home decor (the anemone, the burrow mound, the holdfast).
  if (a.anchorKey && !ANCHOR_ACTS.has(act) && !(a.hasHome && a.homeDecor !== null && a.anchorDecor === a.homeDecor)) releaseAnchor(a, w);
  return true;
}

/** Activities that hold an anchor while they run (their claim stays until the animal moves on to something else). */
const ANCHOR_ACTS = new Set<ActId>(['rest', 'sleep', 'hide', 'retreat', 'nest_build', 'host', 'hitch', 'clean_station', 'perch', 'burrow', 'guard', 'court', 'spawn', 'brood', 'cleaning']);

// ───────────────────────────── helpers used by activities ─────────────────────────────

function pickCruiseGoal(a: Agent, w: AIWorld): void {
  if (a.set.shoal && rnd(a) < 0.6 * (0.5 + a.mods.sociability)) {
    // loose shoal: head toward a conspecific
    const n = neighbors(w, a.rt.pos, 0.6, a);
    for (let i = 0; i < n; i++) {
      const o = w.agents[w.nbuf[i]];
      if (o.speciesId === a.speciesId) {
        randomSwimPoint(a, w, a.actData, { near: o.rt.pos, radius: a.L * 4 });
        return;
      }
    }
  }
  if (a.hunger > 0.55 && a.hasFeedSpot && rnd(a) < 0.5) {
    randomSwimPoint(a, w, a.actData, { near: a.feedSpot, radius: a.L * 5, y0: a.zoneY0, y1: a.zoneY1 });
    return;
  }
  const homebody = a.tags.has('homebody') || a.set.territoryBL !== undefined;
  if (homebody && a.hasHome) {
    randomSwimPoint(a, w, a.actData, { near: a.home, radius: a.L * (a.set.territoryBL ?? 6) });
    return;
  }
  const explorer = a.tags.has('explorer');
  randomSwimPoint(a, w, a.actData, explorer ? { zPref: a.zBias * 0.5 } : { near: a.rt.pos, radius: Math.max(0.12, (w.env.maxX - w.env.minX) * 0.45) });
}

/**
 * How near its turning point a patrolling fish turns back, and how far that point keeps from the end glass: 2.5 body
 * lengths, but never more than an eighth of the tank's length. (chunk 16: a 35 cm sailfin tang in a 6-ft tank only
 * patrolled the middle few centimetres, and in a 4-ft one the "far end" of its lap lay on the near side.)
 */
const patrolTurn = (a: Agent, w: AIWorld) => Math.min(a.L * 2.5, (w.env.maxX - w.env.minX) * 0.125);

function setPatrolEnd(a: Agent, w: AIWorld): void {
  const env = w.env;
  const margin = bodyHX(a) + patrolTurn(a, w) + 0.02;
  const x = a.actPhase === 0 ? env.maxX - margin : env.minX + margin;
  a.actData.set(x, rrange(a, a.zoneY0, a.zoneY1), rrange(a, env.minZ + (env.maxZ - env.minZ) * 0.3, env.maxZ - (env.maxZ - env.minZ) * 0.2));
  if (!pointFree(env, a.actData.x, a.actData.y, a.actData.z, bodySide(a) + 0.01)) randomSwimPoint(a, w, a.actData, { near: a.actData, radius: 0.1 });
}

/** Point just behind the front glass (inside), for glass-facing activities. */
/** Next spot to walk to: for floor walkers one where the whole body fits (else they stall against decor). */
function pickExploreSpot(a: Agent, w: AIWorld, radius: number): void {
  if (a.set.loco === 'walk' && freeFloorSpot(a, w, a.actData, V[7], a.rt.pos, Math.max(radius, a.L * 2), reachR(a, w, 1.3) * 1.6)) {
    a.actNormal.set(0, 1, 0);
    return;
  }
  const mask = a.set.loco === 'walk' ? SURF_FLOOR : a.set.crawlMask;
  // (chunk 16: one that clings to the rock as drawn makes for a spot where there is rock as drawn — rockshape.ts)
  for (let k = 0; k < (a.set.meshCling ? 4 : 1); k++) {
    randomSurfacePoint(a, w, mask, a.actData, a.actNormal, a.rt.pos, radius);
    if (!a.set.meshCling || onDrawnRock(a, w, a.actData)) return;
  }
}

/**
 * Open floor where a walker's whole body fits (writes the spot and a heading that fits there); nearby spots first,
 * at least `minDist` away. Samples the floor directly with the walker-aware fit test (randomSurfacePoint treats the
 * low stones a walker steps over as walls and falls back to "right here").
 */
function freeFloorSpot(a: Agent, w: AIWorld, out: THREE.Vector3, fwdOut: THREE.Vector3, near?: THREE.Vector3, radius = 0.18, minDist = 0): boolean {
  const env = w.env;
  const r = bodySide(a) + 0.004;
  for (let i = 0; i < 90; i++) {
    let x: number;
    let z: number;
    if (near && i < 36) {
      x = near.x + rrange(a, -radius, radius);
      z = near.z + rrange(a, -radius, radius) * 0.8;
    } else {
      x = rrange(a, env.minX + r, env.maxX - r);
      z = rrange(a, env.minZ + r, env.maxZ - r);
    }
    x = clamp(x, env.minX + r, env.maxX - r);
    z = clamp(z, env.minZ + r, env.maxZ - r);
    if (minDist > 0 && i < 72 && Math.hypot(x - a.rt.pos.x, z - a.rt.pos.z) < minDist) continue;
    out.set(x, floorAt(env, x, z) + bodyHY(a), z);
    for (let k = 0; k < 4; k++) {
      const th = rrange(a, 0, Math.PI * 2);
      fwdOut.set(Math.cos(th), 0, Math.sin(th) * 0.5).normalize();
      if (bodyFits(a, w, out, fwdOut)) return true;
    }
  }
  return false;
}

function glassPoint(a: Agent, w: AIWorld, x: number, y: number, out: THREE.Vector3): THREE.Vector3 {
  const env = w.env;
  const up = a.loco === 'upright';
  const back = up ? bodySide(a) * 1.5 + 0.01 : bodyHX(a) + 0.012;
  out.set(x, y, env.maxZ - back);
  if (a.loco === 'walk') out.y = floorAt(env, out.x, out.z) + bodyHY(a);
  fitInWater(a, w, out);
  if (!pointFree(env, out.x, out.y, out.z, bodySide(a))) {
    // blocked by decor at the front: try a little higher
    for (let i = 0; i < 6 && !pointFree(env, out.x, out.y, out.z, bodySide(a)); i++) out.y = Math.min(env.surfaceY - bodySide(a), out.y + a.L);
  }
  return out;
}

function setSurfPoint(a: Agent, w: AIWorld): void {
  const env = w.env;
  const z = a.actNormal.x > 0 ? env.maxZ - bodySide(a) - 0.006 : env.minZ + bodySide(a) + 0.006;
  const y = a.actPhase === 0 ? env.surfaceY - bodySide(a) - a.L * 0.5 : env.floorY + col(w) * 0.2;
  const x = clamp(a.rt.pos.x + rrange(a, -0.05, 0.05), env.minX + bodyHX(a), env.maxX - bodyHX(a));
  a.actData.set(x, y, z);
  fitInWater(a, w, a.actData);
}

function pickForageSpot(a: Agent, w: AIWorld, near = false): void {
  const env = w.env;
  const crawler = a.loco === 'crawl' || a.loco === 'walk';
  if (crawler) {
    randomSurfacePoint(a, w, a.set.loco === 'walk' ? SURF_FLOOR : a.set.crawlMask, a.actData, a.actNormal, a.rt.pos, near ? a.L * 3 : 0.15);
    return;
  }
  if (a.setId === 'surface_dweller') {
    randomSwimPoint(a, w, a.actData, { y0: env.surfaceY - bodySide(a) - 0.012, y1: env.surfaceY - bodySide(a) - 0.004, near: near ? a.rt.pos : undefined, radius: a.L * 5 });
    return;
  }
  // (chunk 16: a fish that holds station in the current — anthias — picks plankton out of the water, not off the bottom)
  if (((a.setId === 'chromis' || a.setId === 'schooling_small') && rnd(a) < 0.5) || hoverShoal(a)) {
    randomSwimPoint(a, w, a.actData, { near: a.rt.pos, radius: a.L * 5 });
    return;
  }
  if ((a.setId === 'livebearer' || a.setId === 'goldfish') && rnd(a) < 0.4) {
    if (pointNearDecor(a, w, a.actData, a.actNormal, bodyHX(a) + a.L * 0.15, { soft: true }) >= 0) return;
  }
  // corydoras-style: pick a spot near a group member
  let ref = a.rt.pos;
  // (chunk 16: a ram sifts the bed about its home)
  if (a.setId === 'cichlid_dwarf' && a.hasHome && a.rt.pos.distanceTo(a.home) > (a.set.territoryBL ?? 5) * a.L * 0.6) ref = a.home;
  if (a.set.shoal && a.set.bottomHugger) {
    const n = neighbors(w, a.rt.pos, 0.3, a);
    for (let i = 0; i < n; i++) {
      const o = w.agents[w.nbuf[i]];
      if (o.speciesId === a.speciesId && rnd(a) < 0.6) {
        ref = o.rt.pos;
        break;
      }
    }
  }
  const r = near ? a.L * 3 : a.L * 8;
  const hy = a.set.bottomHugger ? bodyHY(a) + a.L * 0.12 : bodyHY(a) + a.L * 0.3;
  for (let i = 0; i < 10; i++) {
    const x = clamp(ref.x + rrange(a, -r, r), env.minX + bodyHX(a) + 0.01, env.maxX - bodyHX(a) - 0.01);
    const z = clamp(ref.z + rrange(a, -r, r) * 0.6, env.minZ + bodyHX(a) * 0.7 + 0.01, env.maxZ - bodyHX(a) * 0.7 - 0.01);
    const y = floorAt(env, x, z) + hy;
    if (pointFree(env, x, y, z, bodySide(a) + 0.004)) {
      a.actData.set(x, y, z);
      return;
    }
  }
  randomSwimPoint(a, w, a.actData, { y0: env.floorY + hy, y1: env.floorY + hy + a.L });
}

/** The next spot a grazing crawler moves on to (a sea star: mostly a nearby patch of the surface it is on). */
function grazePatch(a: Agent, w: AIWorld): void {
  // (chunk 16: one that clings to the rock as drawn looks for a patch where there is rock as drawn — rockshape.ts)
  for (let k = 0; k < (a.set.meshCling ? 4 : 1); k++) {
    grazePatchOnce(a, w);
    if (!a.set.meshCling || onDrawnRock(a, w, a.actData)) return;
  }
}

/**
 * chunk 16 — is a crawler's body-centre spot `p` over rock as drawn, if it is on a modelled rock at all (rockshape.ts)?
 * False when it is on such a rock's collider box where the drawn rock is not behind it (over an arch's open middle,
 * past the flank of a dome).
 */
function onDrawnRock(a: Agent, w: AIWorld, p: THREE.Vector3): boolean {
  const near = bodyHY(a) + 0.02;
  for (const c of w.env.colliders) {
    if (!c.hard || !c.shape) continue;
    if (Math.abs(p.x - c.cx) > c.hx + near || Math.abs(p.y - c.cy) > c.hy + near || Math.abs(p.z - c.cz) > c.hz + near) continue;
    if (colliderSdf(c, p.x, p.y, p.z) > near) continue;
    if (!Number.isFinite(drawnDepth(c, p.x, p.y, p.z))) return false;
  }
  return true;
}

function grazePatchOnce(a: Agent, w: AIWorld): void {
  if (a.setId === 'starfish' && rnd(a) < 0.75 && patchOnSurface(a, w, a.actData, a.actNormal, a.L * 0.5, a.L * 1.6)) return;
  // chunk 16 — an urchin rasps the coralline off the rock more than the glass; an emerald crab picks at the rock
  if (a.setId === 'urchin' && rnd(a) < 0.55 && patchOnSurface(a, w, a.actData, a.actNormal, a.L * 0.5, a.L * 1.6)) return;
  if ((a.setId === 'urchin' || a.setId === 'crab') && rnd(a) < 0.7 && pointNearDecor(a, w, a.actData, a.actNormal, bodyHY(a), { preferNear: a.rt.pos }) >= 0) return;
  randomSurfacePoint(a, w, a.set.crawlMask || SURF_FLOOR, a.actData, a.actNormal, a.rt.pos, a.setId === 'snail' ? 0.25 : 0.12);
}

/**
 * chunk 16 — a spot on the very surface the crawler is on (floor, a pane of glass, a rock), `minR`–`maxR` away along it:
 * a step sideways in the surface's plane, put back onto it. False when it is on no surface or the spot falls outside.
 */
function patchOnSurface(a: Agent, w: AIWorld, out: THREE.Vector3, nOut: THREE.Vector3, minR: number, maxR: number): boolean {
  const env = w.env;
  if (a.surfId === -1 || a.loco !== 'crawl') return false;
  const n = a.surfN;
  const reach = Math.max(a.set.body.hx, a.set.body.hz) * a.L + 0.004;
  const standoff = bodyHY(a);
  for (let i = 0; i < 6; i++) {
    // a random direction in the surface's plane
    _b.set(rrange(a, -1, 1), rrange(a, -1, 1), rrange(a, -1, 1)).addScaledVector(n, -_b.dot(n));
    if (_b.lengthSq() < 1e-4) continue;
    _b.normalize();
    out.copy(a.rt.pos).addScaledVector(_b, rrange(a, minR, maxR));
    if (!surfaceById(env, out, a.surfId, a.set.crawlMask || SURF_FLOOR, _patchHit)) return false;
    out.addScaledVector(_patchHit.n, standoff - _patchHit.d);
    if (out.x < env.minX + reach || out.x > env.maxX - reach || out.z < env.minZ + reach || out.z > env.maxZ - reach) continue;
    if (out.y < floorAt(env, out.x, out.z) + standoff * 0.9 || out.y > env.surfaceY - reach - a.L * 0.3) continue;
    nOut.copy(_patchHit.n);
    return true;
  }
  return false;
}
const _patchHit = makeHit();

/**
 * chunk 16 — the next stop of a picker's foraging bout (wrasse): a spot on a rock face low in the tank, or just above
 * the sand, near where it is (`near`: a short hop on). Writes the body position (`actData`) and the surface normal
 * (`actNormal`) it pecks along.
 */
function pickPeckSpot(a: Agent, w: AIWorld, near: boolean): void {
  const env = w.env;
  const L = a.L;
  const standoff = bodyHX(a) * 0.9 + 0.004;
  const radius = near ? L * rrange(a, 1.5, 4) : L * 6;
  a.settleBest = -1;
  a.actTarget = null;
  a.throughDecor = null;
  // (a six-line wrasse works the rock faces far more than the sand)
  if (rnd(a) < (rockSleep(a) ? 0.85 : 0.5)) {
    const idx = pointNearDecor(a, w, a.actData, a.actNormal, standoff, { preferNear: a.rt.pos, maxY: env.floorY + col(w) * 0.5 });
    if (idx >= 0 && dist(a, a.actData) < radius * 2.5 && toDrawnRock(a, w, idx, a.actData, a.actNormal, standoff, L * 0.1)) {
      a.actTarget = env.colliders[idx].decorId;
      fitInWater(a, w, a.actData);
      return;
    }
  }
  const lift = bodySide(a) + L * 0.18;
  for (let i = 0; i < 10; i++) {
    const r = radius * Math.sqrt(rnd(a));
    const th = rnd(a) * Math.PI * 2;
    const x = clamp(a.rt.pos.x + Math.cos(th) * r, env.minX + bodyHX(a) + 0.01, env.maxX - bodyHX(a) - 0.01);
    const z = clamp(a.rt.pos.z + Math.sin(th) * r * 0.7, env.minZ + bodyHX(a) * 0.7 + 0.01, env.maxZ - bodyHX(a) * 0.7 - 0.01);
    const y = floorAt(env, x, z) + lift;
    if (!pointFree(env, x, y, z, bodySide(a) + 0.004)) continue;
    a.actData.set(x, y, z);
    a.actNormal.set(0, 1, 0);
    return;
  }
  pickForageSpot(a, w, near);
  a.actNormal.set(0, 1, 0);
}

/**
 * chunk 16 — a picker's foraging bout: row over to the next stop, hold there a second or so pecking at the rock or the
 * sand (quick little darts of the snout), hop on to the next.
 */
function peckTick(a: Agent, w: AIWorld): boolean {
  const L = a.L;
  const sand = a.actNormal.y > 0.7;
  const c = a.ctrl;
  if (a.actPhase === 0) {
    go(a, a.actData, cruiseBL(a) * 0.95, L * 0.8);
    c.wander = 0.08;
    c.allowFloor = sand;
    const d = dist(a, a.actData);
    if (d < L * 2) c.avoid = 0.4;
    // (the last of the way in to a spot on the rock as drawn, inside its collider box: toDrawnRock)
    if (d < L && a.throughDecor) c.ignoreDecor = a.throughDecor;
    a.pose = 'swim';
    if (a.settleBest < 0 || d < a.settleBest - L * 0.05) {
      a.settleBest = d;
      a.settleT = w.time;
    } else if (w.time - a.settleT > 4) nextPeckSpot(a, w); // no way through to it: another spot
    if (d < L * 0.45) {
      a.actPhase = 1;
      // (a blenny scrapes a while at each patch; a wrasse pecks and moves on)
      a.actTimer = w.time + (a.set.surfaceGrazer ? rdur(a, 2.6, 0.45) : rdur(a, 0.9, 0.5));
    }
    return true;
  }
  // the surface point it pecks at (just under its snout)
  _a.copy(a.actData).addScaledVector(a.actNormal, -(bodyHX(a) * 0.9 + 0.004));
  if (sand) _a.addScaledVector(a.fwd, L * 0.3);
  look(a, _a);
  if (rnd(a) < (a.set.surfaceGrazer ? 0.07 : 0.03) * stepRate.k) a.mouthPulse = 1;
  // a peck: a quick dart of the snout at the surface, then back
  _b.copy(a.actData).addScaledVector(a.actNormal, -L * 0.1 * a.mouthPulse);
  go(a, _b, cruiseBL(a) * 0.6, L * 0.5);
  c.allowFloor = sand;
  c.avoid = 0.3;
  if (a.throughDecor) c.ignoreDecor = a.throughDecor;
  if (sand) c.pitchBias = -0.5;
  a.pose = 'feed';
  if (w.time > a.actTimer) {
    if (--a.actCount <= 0) return false;
    nextPeckSpot(a, w);
    a.actPhase = 0;
  }
  return true;
}

/**
 * chunk 16 — a spot `standoff` off a rock's collider box moved in onto the rock as drawn (rockshape.ts; the box is let
 * through while the animal works there: peckTick). False when the model finds no rock behind the spot (the flank of a
 * dome, the open middle of an arch): look elsewhere.
 */
function toDrawnRock(a: Agent, w: AIWorld, idx: number, spot: THREE.Vector3, n: THREE.Vector3, standoff: number, footR: number): boolean {
  const c = w.env.colliders[idx];
  const g = restingGap(c, spot.x - n.x * standoff, spot.y - n.y * standoff, spot.z - n.z * standoff, n.x, n.y, n.z, footR, footR * 0.8 + 0.005);
  if (!Number.isFinite(g)) return false;
  spot.addScaledVector(n, -g);
  a.throughDecor = g > 0.002 ? c.decorId : null;
  return true;
}

/** The next stop of a picking or grazing bout: a wrasse's (rock and sand), a blenny's (rock and glass). */
function nextPeckSpot(a: Agent, w: AIWorld): void {
  if (a.set.surfaceGrazer) blennyGrazeSpot(a, w, true);
  else pickPeckSpot(a, w, true);
}

/**
 * chunk 16 — the next patch a lawnmower blenny grazes: a spot on a rock face or top in the lower two thirds of the tank,
 * or on the back or end glass, near where it is (`near`) or about its home. Writes the body position (its snout to the
 * surface: `actData`) and the surface normal (`actNormal`), as pickPeckSpot does.
 */
function blennyGrazeSpot(a: Agent, w: AIWorld, near: boolean): void {
  const env = w.env;
  const standoff = bodyHX(a) * 0.9 + 0.004;
  a.settleBest = -1;
  a.actTarget = null;
  a.throughDecor = null;
  const ref = near || !a.hasHome ? a.rt.pos : a.home;
  if (rnd(a) < 0.72) {
    const idx = pointNearDecor(a, w, a.actData, a.actNormal, standoff, { preferNear: ref, maxY: env.floorY + col(w) * 0.66 });
    if (idx >= 0 && a.actData.distanceTo(ref) < a.L * (near ? 6 : 12) && toDrawnRock(a, w, idx, a.actData, a.actNormal, standoff, a.L * 0.12)) {
      a.actTarget = env.colliders[idx].decorId;
      // (on a flat top it leans over the patch rather than standing on its snout)
      if (a.actNormal.y > 0.7) a.actData.addScaledVector(a.actNormal, bodySide(a) + a.L * 0.18 - standoff);
      fitInWater(a, w, a.actData);
      return;
    }
  }
  glassGrazeSpot(a, w, standoff);
}

/** How far the fins hang below the body centre (long-finned betta males trail a lot; most fish little). */
function finDrop(a: Agent): number {
  const fl = a.c.appearance?.finLength;
  const k = Number.isFinite(fl) ? clamp(fl as number, 0.6, 1.6) : 1;
  if (a.setId !== 'betta') return a.L * 0.12 * k;
  // plakats and females carry short fins (render/creatures/fish/betta.ts)
  return a.c.appearance?.finType === 'plakat' || a.c.sex === 'female' ? a.L * 0.15 : a.L * 0.36 * k;
}

function chooseRestSpot(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  let style = a.set.rest;
  a.actPhase = 0;
  a.crevTries = 0;
  a.sandMode = false;
  if (a.loco === 'sessile') return true;
  // chunk 16 — a six-line wrasse sleeps in the rockwork (in a mucus cocoon), never in the sand
  if (style === 'sand' && rockSleep(a)) style = 'cave';
  if (style === 'sand' && !isCrawler(a)) {
    // chunk 16 — a wrasse sleeps buried in the sand bed (already in it after a fright: it stays where it is)
    if (a.buried > 0.9 && env.sandBed) {
      a.sandMode = true;
      a.actPhase = 2;
      a.actData.set(a.rt.pos.x, a.rt.pos.y, a.rt.pos.z);
      return true;
    }
    if (pickSandSpot(a, w, a.actData, a.rt.pos, a.L * 5)) {
      a.sandMode = true;
      return true;
    }
    // no sand bed (bare bottom, gravel, pebbles) or no open sand: wedged into the rockwork instead
    style = 'cave';
  }
  if (isCrawler(a) && a.loco !== 'swim') {
    // chunk 16 — one that rests wedged into the rock makes for a crevice (an urchin about half the time: else it parks)
    if (a.set.creviceRest && (a.setId !== 'urchin' || rnd(a) < 0.6)) {
      const an = claimCrevice(a, w, ['cave', 'hide'], a.rt.pos, Math.max(0.35, a.L * 8), null);
      if (an) {
        a.actData.copy(an.pos);
        a.actTarget = an.decorId;
        return true;
      }
    }
    // crawlers settle where they are (snails, shrimp) or on the floor (axolotl)
    a.actData.copy(a.rt.pos);
    a.actPhase = 1;
    return true;
  }
  // a walker still swimming (after a gulp of air or a short swim) comes down where its whole body fits — not under a
  // plant crown or on a stone it would press against all rest long
  if (a.set.loco === 'walk' && freeFloorSpot(a, w, a.actData, a.actNormal, a.rt.pos)) return true;
  if (style === 'hitch' && a.setId === 'seahorse') return chooseHitch(a, w, false);
  if (style === 'burrow') {
    ensureBurrow(a, w);
    a.actData.copy(a.home);
    a.actData.y = floorAt(env, a.actData.x, a.actData.z) + bodyHY(a);
    return true;
  }
  if (style === 'leaf' || style === 'cave' || style === 'host') {
    const kinds: AnchorKind[] = style === 'leaf' ? ['leaf_rest', 'rest', 'perch'] : style === 'host' ? ['host', 'cave', 'hide'] : ['cave', 'hide', 'rest'];
    // (a leaf or stone so low that the fins would reach the bed is passed over: the body would have to hover well
    // above it, which reads as idling rather than resting — the surface corner below is the betta's other bed)
    const minRise = style === 'leaf' ? bodyHY(a) * 0.2 + finDrop(a) + a.L * 0.08 - a.L * 0.12 : undefined;
    const an = claimAnchor(a, w, kinds, { near: a.rt.pos, minRise });
    if (an) {
      a.actData.copy(an.pos);
      if (style === 'leaf') {
        // draped over a leaf (or a low stone): the body sits a little above it, and never so low over the bed that the
        // long anal and caudal fins hang into the substrate (a resting betta used to read as lying dead on the soil),
        // not even at the bottom of its slow resting bob (restTick: ±0.08 L)
        a.actData.y += bodyHY(a) * 0.8;
        a.actData.y = Math.max(a.actData.y, floorAt(env, a.actData.x, a.actData.z) + bodyHY(a) + finDrop(a) + a.L * 0.08);
      }
      a.ctrl.ignoreDecor = an.decorId;
      a.actTarget = an.decorId;
      fitInWater(a, w, a.actData);
      return true;
    }
    if (style === 'leaf') {
      // no leaves: rest just under the surface in a quiet corner (betta)
      a.actData.set(rnd(a) < 0.5 ? env.minX + bodyHX(a) + 0.03 : env.maxX - bodyHX(a) - 0.03, env.surfaceY - bodySide(a) - a.L * 0.3, env.minZ + (env.maxZ - env.minZ) * 0.35);
      fitInWater(a, w, a.actData);
      return true;
    }
  }
  // chunk 16 — a ram sleeps low over the bed by its home
  if (a.setId === 'cichlid_dwarf' && a.hasHome) {
    for (let i = 0; i < 10; i++) {
      const x = clamp(a.home.x + rrange(a, -1.5, 1.5) * a.L, env.minX + bodyHX(a) + 0.01, env.maxX - bodyHX(a) - 0.01);
      const z = clamp(a.home.z + rrange(a, -1, 1) * a.L, env.minZ + bodyHX(a) * 0.7 + 0.01, env.maxZ - bodyHX(a) * 0.7 - 0.01);
      const y = floorAt(env, x, z) + bodySide(a) + a.L * 0.05;
      if (!pointFree(env, x, y, z, bodySide(a) + 0.003)) continue;
      a.actData.set(x, y, z);
      return true;
    }
  }
  if (style === 'bottom' || a.set.bottomHugger || a.sp.behaviorTraits.restOnBottom > 0.5) {
    pickForageSpot(a, w);
    a.actData.y = floorAt(env, a.actData.x, a.actData.z) + bodyHY(a) * 0.95;
    return true;
  }
  // hover-rest low in cover
  if (pointNearDecor(a, w, a.actData, a.actNormal, bodyHX(a) + a.L * 0.6, { soft: true, maxY: env.floorY + col(w) * 0.55 }) < 0) {
    randomSwimPoint(a, w, a.actData, { y0: env.floorY + col(w) * 0.12, y1: env.floorY + col(w) * 0.45, zPref: -0.4 });
  }
  return true;
}

function restTick(a: Agent, w: AIWorld, sleeping: boolean): boolean {
  const env = w.env;
  if (a.loco === 'sessile') return true;
  if (isCrawler(a) && a.loco !== 'swim') {
    // chunk 16 — wedged into its crevice (an emerald crab out of sight there all day)
    if (a.set.creviceRest && a.actTarget !== null) {
      creviceTick(a, w, a.setId === 'crab' ? 'hiding' : 'rest', false);
      if (a.setId === 'crab') a.behavior = ACTS.hide.label;
      return true;
    }
    a.ctrl.hasGoal = false;
    a.ctrl.speedBL = 0;
    a.pose = 'rest';
    // chunk 16 — a sand dweller resting on the sand bed digs itself in (a conch to half its height; a sand-sifting star
    // or a Nassarius all the way under)
    const bp = buryProfile(a);
    if (bp && onSand(a, w)) {
      a.ctrl.sink = bp.depth;
      if (bp.depth >= 2 && a.sink > 1) a.behavior = 'buried in the sand';
    }
    return true;
  }
  if (a.sandMode) {
    // (the sand was taken out from under it — the bed changed to gravel or bare glass: it comes up and settles anew)
    if (!env.sandBed) return false;
    // chunk 16 — a wrasse: over to its spot, head first into the sand, still and out of sight till morning
    if (sandBuryTick(a, w, false)) {
      a.pose = 'rest';
      a.behavior = sleeping ? 'asleep in the sand' : 'resting in the sand';
    }
    return true;
  }
  a.ctrl.ignoreDecor = a.actTarget;
  if (a.setId === 'seahorse') return hitchTick(a, w);
  // chunk 16 — a clownfish resting in a living anemone stays with it as it moves
  if (a.actTarget) liveHostPos(w, a.actTarget, a.actData);
  const onBottom = a.actData.y < floorAt(env, a.actData.x, a.actData.z) + bodyHY(a) * 1.5;
  if (a.actPhase === 0) {
    go(a, a.actData, cruiseBL(a) * 0.7, a.L * 1.2);
    a.ctrl.allowFloor = onBottom;
    a.ctrl.avoid = 0.4;
    if (dist(a, a.actData) < a.L * 0.6) a.actPhase = 1;
    a.pose = 'swim';
    return true;
  }
  if (onBottom) settleIfBlocked(a, w, a.actData);
  _a.copy(a.actData);
  if (!onBottom) _a.y += Math.sin(w.time * 0.3 + a.noiseOff) * a.L * 0.08;
  go(a, _a, 0.12, a.L);
  a.ctrl.attach = onBottom ? 0.5 : sleeping ? 0.15 : 0.25;
  a.ctrl.allowFloor = onBottom;
  a.ctrl.sep = 0.4;
  a.ctrl.avoid = 0.3;
  // (chunk 16: a blenny or a hawkfish lies on the rock of its crevice, propped on its fins)
  a.pose = onBottom || a.set.rest === 'leaf' || a.setId === 'blenny' || a.setId === 'hawkfish' ? 'rest' : 'hover';
  if (a.actTarget) faceAwayFrom(a, w, a.actTarget);
  else if (!sleeping && a.actT > 3) lookAround(a, w, a.rt.pos, 5);
  return true;
}

/** Resting against a piece of decor: look out, away from it (never nose-first into the rock). */
function faceAwayFrom(a: Agent, w: AIWorld, decorId: string): void {
  const c = w.env.colliders.find((k) => k.decorId === decorId);
  if (!c) return;
  _b.set(a.rt.pos.x - c.cx, 0, a.rt.pos.z - c.cz);
  if (_b.lengthSq() < 1e-8) _b.set(0, 0, 1);
  _b.normalize();
  _c.copy(a.rt.pos).addScaledVector(_b, 0.3);
  look(a, _c);
}

function chooseHideSpot(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  a.actPhase = 0;
  a.crevTries = 0;
  // (chunk 16: a damsel dives into its own patch)
  const near = a.setId === 'damsel' && a.hasHome ? a.home : a.rt.pos;
  const an = a.set.meshCling ? claimCrevice(a, w, ['hide', 'cave', 'burrow'], near, undefined, null) : claimAnchor(a, w, ['hide', 'cave', 'burrow'], { near });
  if (an) {
    a.actData.copy(an.pos);
    a.actTarget = an.decorId;
    if (!isCrawler(a)) {
      // (decor is often placed overlapping: the anchor may lie inside the next rock or coral)
      clearOfDecor(a, w, a.actData, an.decorId);
      fitInWater(a, w, a.actData);
    }
    return true;
  }
  a.actTarget = null;
  // behind the largest hard decor, from the viewer's perspective
  let best = -1;
  let bestS = 0;
  env.colliders.forEach((c, i) => {
    const s = c.hx * c.hy * (c.hard ? 1 : 0.7) + rnd(a) * 1e-4;
    if (s > bestS) {
      bestS = s;
      best = i;
    }
  });
  if (best >= 0) {
    const c = env.colliders[best];
    const x = c.cx + rrange(a, -c.hx, c.hx) * 0.6;
    const z = Math.max(env.minZ + bodySide(a) + 0.01, c.cz - c.hz - bodySide(a) - 0.01);
    const fy = floorAt(env, x, z);
    const y = clamp(fy + col(w) * 0.12 + bodySide(a), fy + bodySide(a), Math.max(fy + bodySide(a), c.top - bodySide(a)));
    a.actData.set(x, y, z);
    if (isCrawler(a)) a.actData.y = fy + bodyHY(a);
    if (pointFree(env, a.actData.x, a.actData.y, a.actData.z, bodySide(a))) return true;
  }
  // back corner, low
  a.actData.set(rnd(a) < 0.5 ? env.minX + bodyHX(a) + 0.02 : env.maxX - bodyHX(a) - 0.02, 0, env.minZ + bodyHX(a) * 0.7 + 0.01);
  a.actData.y = floorAt(env, a.actData.x, a.actData.z) + (isCrawler(a) ? bodyHY(a) : bodySide(a) + col(w) * 0.1);
  fitInWater(a, w, a.actData);
  return true;
}

/** `dashBL` (chunk 16): run for the cover at this speed (body lengths / s) instead. */
function hideTick(a: Agent, w: AIWorld, speedMul = 1, dashBL = 0): boolean {
  // chunk 16 — a crawler that lives in the rock's crevices (emerald crab, urchin) makes for one and wedges in
  if (a.set.creviceRest && isCrawler(a) && a.loco !== 'swim') return creviceTick(a, w, 'hiding', dashBL > 0);
  a.ctrl.ignoreDecor = a.actTarget;
  if (isCrawler(a) && a.loco !== 'swim') {
    // lane:brackish — a crawler that can get no closer (pressed against a plant crown or a stone on the way) settles
    // where it is, instead of pushing into it every frame (that shook a bristlenose in place)
    const d = dist(a, a.actData);
    if (a.actPhase === 0 && (a.actT < 0.05 || d < a.actNormal.x - a.L * 0.05)) {
      a.actNormal.x = d;
      a.actTimer = w.time;
    }
    if (a.actPhase === 0 && w.time - a.actTimer > 0.6) a.actPhase = 2;
    if (a.actPhase === 2 || d < a.L * 1.2) {
      a.ctrl.hasGoal = false;
      a.pose = 'hiding';
      return true;
    }
    go(a, a.actData, cruiseBL(a) * speedMul, a.L);
    return true;
  }
  if (a.actPhase === 0) {
    go(a, a.actData, dashBL > 0 ? dashBL : cruiseBL(a) * speedMul * 1.1, a.L * 1.2);
    a.ctrl.avoid = 0.5;
    a.ctrl.allowFloor = true;
    a.pose = 'swim';
    if (dist(a, a.actData) < a.L * 0.8) a.actPhase = 1;
    return true;
  }
  settleIfBlocked(a, w, a.actData);
  go(a, a.actData, 0.15, a.L);
  a.ctrl.attach = 0.3;
  a.ctrl.allowFloor = true;
  a.ctrl.avoid = 0.3;
  a.pose = 'hiding';
  // peer out toward the room
  _a.set(a.rt.pos.x + Math.sin(w.time * 0.2 + a.noiseOff) * 0.2, a.rt.pos.y, w.env.maxZ + 0.4);
  look(a, _a);
  return true;
}

/**
 * chunk 16 — a crevice for a crawler: claimAnchor, but for one that clings to the rock as drawn (SetProfile.meshCling)
 * never an anchor inside a modelled rock's collider box (under an arch's bridge, say: open water as drawn, but the box
 * is solid to a crawler, which would sit on top of it over nothing — rockshape.ts).
 */
function claimCrevice(a: Agent, w: AIWorld, kinds: readonly AnchorKind[], near: THREE.Vector3, maxDist: number | undefined, avoidKey: string | null): Anchor | null {
  if (!a.set.meshCling) return claimAnchor(a, w, kinds, { near, maxDist, avoidKey });
  const cs = w.env.colliders;
  let best: Anchor | null = null;
  let bestScore = -Infinity;
  for (const k of kinds) {
    for (const an of w.env.byKind[k] ?? []) {
      if (an.key === avoidKey || an.live || (an.key !== a.anchorKey && (w.claims.get(an.key) ?? 0) >= an.capacity)) continue;
      const d = an.pos.distanceTo(near);
      if (maxDist !== undefined && d > maxDist) continue;
      let inBox = false;
      for (const c of cs) if (c.hard && c.shape && colliderSdf(c, an.pos.x, an.pos.y, an.pos.z) < -0.003) inBox = true;
      if (inBox) continue;
      const sc = -d * 4 + rnd(a) * 1.2 + (an.key === a.anchorKey ? 0.8 : 0);
      if (sc > bestScore) {
        bestScore = sc;
        best = an;
      }
    }
  }
  return best ? claimAnchor(a, w, [best.kind], { near: best.pos, maxDist: 1e-4 }) : null;
}

/**
 * chunk 16 — a crawler making for a crevice in the rock (an anchor at the rock's foot or in a cave) and wedged into it:
 * it walks there, then stays (`pose`); one that can get no closer for a while (the gap is tighter than its body, a
 * neighbour lies there) stays where it is. `dash`: running for cover at full speed (a frightened emerald crab).
 * (It holds on to the rock's surface: the crevice's rock is never let through as hideTick lets swimmers through.)
 */
function creviceTick(a: Agent, w: AIWorld, pose: CreaturePose, dash: boolean): boolean {
  const c = a.ctrl;
  const d = dist(a, a.actData);
  if (a.actPhase === 0) {
    const spd = dash ? burstBL(a) : cruiseBL(a);
    // (patience in proportion to its pace: an urchin covers a tenth of a body length in a quarter of a minute)
    const patience = Math.max(3, (a.L * 0.5) / Math.max(1e-4, spd * a.L));
    if (a.settleBest < 0 || d < a.settleBest - a.L * 0.05) {
      a.settleBest = d;
      a.settleT = w.time;
    } else if (w.time - a.settleT > patience) {
      // no way to that crevice (round the far side of a rock it cannot get over): another one near, then where it is
      const an = d > a.L * 1.5 && a.crevTries < 2 ? claimCrevice(a, w, ['cave', 'hide'], a.rt.pos, Math.max(0.35, a.L * 8), a.anchorKey) : null;
      if (an) {
        a.crevTries++;
        a.actData.copy(an.pos);
        a.actTarget = an.decorId;
        a.settleBest = -1;
      } else a.actPhase = 1;
    }
    if (d < a.L * 0.7) a.actPhase = 1;
    if (a.actPhase === 0) {
      go(a, a.actData, spd, a.L * 0.5);
      c.urgency = dash ? 1 : 0;
      a.pose = dash ? 'startle' : 'swim';
      return true;
    }
  }
  c.hasGoal = false;
  c.speedBL = 0;
  a.pose = pose;
  return true;
}

function chooseDisplayTarget(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  a.actTarget = null;
  if (a.juvenile && a.setId !== 'betta') return false;
  // rivals / females nearby
  let best: Agent | null = null;
  let bestD = Infinity;
  for (const o of w.agents) {
    if (o === a || o.dead) continue;
    const d = o.rt.pos.distanceTo(a.rt.pos);
    if (d > 0.35) continue;
    let ok = false;
    if (a.setId === 'betta') ok = o.setId === 'betta' || o.sp.hasLongFins || o.setId === 'gourami';
    else if (a.setId === 'livebearer') ok = a.c.sex === 'male' && o.speciesId === a.speciesId && (o.c.sex === 'female' || (o.c.sex === 'male' && o.act !== 'display' && !!a.sp.specialBehaviors?.includes('sail_display'))); // lane:brackish: sailfin males also spar (one flaring at a time)
    else if (a.setId === 'clownfish') ok = o.speciesId === a.speciesId && dominantOf(o, w) === a;
    else ok = o.speciesId === a.speciesId;
    if (ok && d < bestD) {
      bestD = d;
      best = o;
    }
  }
  if (best) {
    a.actTarget = best.id;
    a.actDur = rrange(a, 3, 7);
    return true;
  }
  if (a.setId !== 'betta') return false;
  // flare at its own reflection — usually in the front pane (where the player sees it), sometimes a side pane,
  // the back only when it is already right there
  const dxL = a.rt.pos.x - env.minX;
  const dxR = env.maxX - a.rt.pos.x;
  const dzF = env.maxZ - a.rt.pos.z;
  const dzB = a.rt.pos.z - env.minZ;
  const r = rnd(a);
  const side = Math.min(dxL, dxR);
  const m = dzB < a.L * 1.2 && r < 0.15 ? dzB : r < 0.7 ? dzF : side;
  const off = bodyHX(a) + a.L * 0.25;
  if (m === dzF) {
    a.actData.set(a.rt.pos.x, a.rt.pos.y, env.maxZ - off);
    a.actNormal.set(a.rt.pos.x, a.rt.pos.y, env.maxZ + 0.2);
  } else if (m === dzB) {
    a.actData.set(a.rt.pos.x, a.rt.pos.y, env.minZ + off);
    a.actNormal.set(a.rt.pos.x, a.rt.pos.y, env.minZ - 0.2);
  } else if (m === dxL) {
    a.actData.set(env.minX + off, a.rt.pos.y, a.rt.pos.z);
    a.actNormal.set(env.minX - 0.2, a.rt.pos.y, a.rt.pos.z);
  } else {
    a.actData.set(env.maxX - off, a.rt.pos.y, a.rt.pos.z);
    a.actNormal.set(env.maxX + 0.2, a.rt.pos.y, a.rt.pos.z);
  }
  fitInWater(a, w, a.actData);
  a.actDur = rrange(a, 3, 7) * (0.7 + a.mods.displayDrive * 0.6);
  return true;
}

// ── breeding helpers ──

/** Map the breeding lane's repro.stage to an activity. */
export function breedingActFor(a: Agent, w: AIWorld): ActId | null {
  const st = a.stage;
  switch (st) {
    case 'courting':
    case 'following':
    case 'depositing':
      return partnerOf(a, w) ? 'court' : null;
    case 'spawning':
    case 'laying':
      return 'spawn';
    case 'nest_building':
    case 'nest_preparing':
    case 'nest_ready':
      return 'nest_build';
    case 'guarding':
      return 'guard';
    case 'brooding':
      return 'brood';
    case 'bonding': {
      // seahorse pairs greet each other each morning: a short dance soon after the lights come on
      const p = partnerOf(a, w);
      if (!p) return null;
      const h = w.env.hourOfDay;
      return w.env.daylight > 0.3 && ((h - w.env.dawnHour + 24) % 24) < 1.6 ? 'court' : null;
    }
    default:
      if (/court|dance/.test(st)) return partnerOf(a, w) ? 'court' : null;
      if (/guard|tend|fann/.test(st)) return 'guard';
      return null;
  }
}

function courtTick(a: Agent, w: AIWorld, p: Agent): void {
  const t = w.time;
  if (a.setId === 'seahorse') {
    // carousel "dance": the pair circles a shared point, brightening, heads tilted toward each other
    _c.addVectors(a.rt.pos, p.rt.pos).multiplyScalar(0.5);
    const ang = t * 0.35 + (a.id < p.id ? 0 : Math.PI);
    _a.set(_c.x + Math.cos(ang) * a.L * 0.55, _c.y + Math.sin(t * 0.2) * a.L * 0.2, _c.z + Math.sin(ang) * a.L * 0.35);
    go(a, fitInWater(a, w, _a), cruiseBL(a) * 1.5, a.L * 0.5);
    look(a, p.rt.pos);
    a.ctrl.sep = 0.2;
    a.ctrl.pitchBias = 0.12;
    return;
  }
  if (a.setId === 'axolotl' && a.stage === 'following') {
    // female follows the male nose-to-tail ("waltz")
    _a.copy(p.rt.pos).addScaledVector(p.fwd, -(p.L * 0.55 + a.L * 0.5));
    go(a, _a, cruiseBL(a) * 1.2, a.L * 0.5);
    a.ctrl.sep = 0;
    return;
  }
  if (a.loco === 'walk' || a.loco === 'crawl') {
    // lead the partner in slow loops along the bottom
    _a.set(Math.cos(t * 0.25 + a.noiseOff) * 0.08, 0, Math.sin(t * 0.25 + a.noiseOff) * 0.05).add(p.rt.pos);
    go(a, _a, cruiseBL(a) * 0.9, a.L);
    return;
  }
  // fish: swim alongside, circling and displaying
  const ang = t * 0.9 + (a.id < p.id ? 0 : Math.PI);
  _a.set(p.rt.pos.x + Math.cos(ang) * a.L * 1.2, p.rt.pos.y + Math.sin(t * 0.7) * a.L * 0.3, p.rt.pos.z + Math.sin(ang) * a.L * 0.8);
  go(a, fitInWater(a, w, _a), cruiseBL(a) * 1.3, a.L * 0.6);
  look(a, p.rt.pos);
  a.ctrl.sep = 0.3;
  a.quiverUntil = w.time + 0.2;
}

function chooseNestSite(a: Agent, w: AIWorld): void {
  const env = w.env;
  const na = a.c.repro?.nestAnchor;
  const bubble = a.setId === 'betta' || a.setId === 'gourami';
  if (na) {
    a.actNormal.set(na.x, na.y, na.z);
  } else {
    const an = claimAnchor(a, w, bubble ? ['nest_site', 'leaf_rest', 'rest'] : ['nest_site', 'host', 'cave', 'rest'], { near: a.hasHome ? a.home : a.rt.pos });
    const live = an?.live ? w.byId.get(an.live) : undefined;
    if (live) {
      // chunk 16 — beside a living anemone: on the rock (or glass) at its foot, just clear of the crown
      a.actNormal.set(-live.upVis.z, 0, live.upVis.x);
      if (a.actNormal.lengthSq() < 1e-6) a.actNormal.set(1, 0, 0);
      a.actNormal.normalize().multiplyScalar(crownR(live) * 0.9).add(live.rt.pos).addScaledVector(live.upVis, -live.set.body.hy * live.L * 0.8);
    } else if (an) a.actNormal.copy(an.pos);
    else if (bubble) a.actNormal.set(rnd(a) < 0.5 ? env.minX + 0.05 : env.maxX - 0.05, env.surfaceY, env.minZ + (env.maxZ - env.minZ) * 0.3);
    else if (a.hasHome) a.actNormal.copy(a.home);
    else randomSwimPoint(a, w, a.actNormal, { y0: env.floorY, y1: env.floorY + col(w) * 0.3 });
  }
  if (bubble) a.actNormal.y = env.surfaceY;
  a.actData.copy(a.actNormal);
  if (bubble) a.actData.y = env.surfaceY - bodyHX(a) * 0.6;
  else a.actData.addScaledVector(V[7].set(0, 1, 0.6).normalize(), bodyHX(a) + a.L * 0.2);
  fitInWater(a, w, a.actData);
}

function nestTick(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  const bubble = a.setId === 'betta' || a.setId === 'gourami';
  if (!breedingActFor(a, w) && a.actT > a.actDur) return false;
  if (bubble) {
    // rise to the film, gulp, blow a bubble into the nest, drift down a little, repeat
    const cyc = (w.time * 0.55 + a.noiseOff) % 1;
    _a.copy(a.actData);
    _a.x += Math.sin(w.time * 0.4 + a.noiseOff) * a.L * 0.6;
    if (cyc > 0.55) _a.y = env.surfaceY - bodyHX(a) * 1.4;
    go(a, fitInWater(a, w, _a), cruiseBL(a) * 1.3, a.L * 0.7);
    a.ctrl.allowSurface = true;
    a.ctrl.pitchBias = cyc < 0.55 ? 0.45 : 0.1;
    a.ctrl.avoid = 0.3;
    if (w.time > a.actTimer && dist(a, a.actData) < a.L * 1.5) {
      a.actTimer = w.time + rrange(a, 1.2, 2.6);
      a.mouthPulse = 1;
      mouthPos(a, _b);
      emit(w, 'bubble_burst', V[6].set(_b.x, env.surfaceY, _b.z), a.id, 0.15);
      observe(a, w, 'bubble_nest');
    }
    return true;
  }
  // clean the chosen rock face (clownfish nest preparation, cave spawners)
  _a.copy(a.actData);
  _a.x += Math.sin(w.time * 0.7 + a.noiseOff) * a.L * 0.3;
  go(a, fitInWater(a, w, _a), cruiseBL(a), a.L * 0.8);
  look(a, a.actNormal);
  a.ctrl.avoid = 0.2;
  if (rnd(a) < 0.08 * stepRate.k) a.mouthPulse = 0.9;
  return true;
}

function clutchPos(a: Agent, w: AIWorld, out: THREE.Vector3): boolean {
  for (const c of w.env.clutches) {
    if (c.guardedById === a.id || (a.clutchId && c.id === a.clutchId)) {
      if (c.pos) {
        out.copy(c.pos);
        return true;
      }
    }
  }
  const na = a.c.repro?.nestAnchor;
  if (na) {
    out.set(na.x, na.y, na.z);
    return true;
  }
  if (a.hasHome) {
    out.copy(a.home);
    return true;
  }
  return false;
}

function guardTick(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  const bubble = a.setId === 'betta' || a.setId === 'gourami';
  const eggs = a.actNormal;
  // hover beside/below the eggs, facing them, fanning with pectorals
  if (bubble) _a.set(eggs.x + Math.sin(w.time * 0.3) * a.L * 0.5, env.surfaceY - bodyHX(a) - a.L * 0.8, eggs.z);
  else {
    _b.subVectors(a.rt.pos, eggs);
    _b.y = 0;
    safeNormalize(_b, V[7].set(0, 0, 1));
    _a.copy(eggs).addScaledVector(_b, bodyHX(a) + a.L * 0.35);
    _a.y = eggs.y + a.L * 0.15;
  }
  fitInWater(a, w, _a);
  go(a, _a, cruiseBL(a), a.L * 0.8);
  look(a, eggs);
  a.ctrl.avoid = 0.2;
  a.ctrl.sep = 0.3;
  if (rnd(a) < 0.03 * stepRate.k) a.mouthPulse = 0.8; // mouthing the eggs / repairing the nest
  if (a.setId === 'clownfish' && rnd(a) < 0.01 * stepRate.k) observe(a, w, 'pair_swim');
  // chase intruders away
  const n = neighbors(w, eggs, a.L * 3, a);
  for (let i = 0; i < n; i++) {
    const o = w.agents[w.nbuf[i]];
    if (o.id === a.partnerId || o.set.ignoreFish) continue;
    go(a, o.rt.pos, burstBL(a) * 0.5, 0.001);
    a.ctrl.urgency = 0.8;
    break;
  }
  return true;
}

function ensureHome(a: Agent, w: AIWorld): void {
  if (a.hasHome) return;
  // chunk 16 — a damsel's patch of rock, a ram's home on the bed
  if (a.setId === 'damsel' || a.setId === 'cichlid_dwarf') {
    patchHome(a, w);
    return;
  }
  const env = w.env;
  // a partner shares the dominant fish's home
  const dom = a.setId === 'clownfish' ? dominantOf(a, w) : null;
  if (dom && dom.hasHome && dom.home.distanceTo(a.rt.pos) < 10) {
    a.home.copy(dom.home);
    a.homeDecor = dom.homeDecor;
    a.hasHome = true;
    return;
  }
  // (chunk 16: two clownfish species share no anemone — a maroon pair and an ocellaris pair each want their own)
  const host = a.sp.anemoneRelationship === 'host_seeker' ? claimAnchor(a, w, ['host'], { avoidDecor: otherClownHost(a, w) }) : null;
  const an = host ?? claimAnchor(a, w, ['nest_site', 'cave', 'hide', 'perch', 'rest'], { near: a.rt.pos });
  if (an) {
    a.home.copy(an.pos);
    a.homeDecor = an.kind === 'host' ? an.decorId : null;
    a.hasHome = true;
    fitInWater(a, w, a.home);
    if (an.kind === 'host') a.home.copy(an.pos);
    return;
  }
  if (pointNearDecor(a, w, a.home, a.actNormal, bodyHX(a) + a.L * 0.8, { maxY: env.floorY + col(w) * 0.6 }) < 0) {
    randomSwimPoint(a, w, a.home, { y0: env.floorY + col(w) * 0.2, y1: env.floorY + col(w) * 0.55 });
  }
  a.homeDecor = null;
  a.hasHome = true;
}

/** chunk 16 — the anemone a clownfish of another species already calls home (null: none). */
function otherClownHost(a: Agent, w: AIWorld): string | null {
  if (a.setId !== 'clownfish') return null;
  for (const o of w.agents) if (o !== a && !o.dead && o.setId === 'clownfish' && o.speciesId !== a.speciesId && o.hasHome && o.homeDecor) return o.homeDecor;
  return null;
}

function hostTick(a: Agent, w: AIWorld): boolean {
  // chunk 16 — a damsel over its patch of rock, a ram about its home on the bed
  if (a.setId === 'damsel' || a.setId === 'cichlid_dwarf') return patchTick(a, w);
  // chunk 16 — a living anemone moves: its clownfish keep to its crown; one with no anemone of its own takes up one
  // that has come into the tank
  if (a.homeDecor) liveHostPos(w, a.homeDecor, a.home);
  else if (a.sp.anemoneRelationship === 'host_seeker' && w.liveAnchors.length && w.time > a.actTimer && freeLiveHost(a, w, otherClownHost(a, w))) {
    a.hasHome = false;
    ensureHome(a, w);
  }
  const hosted = !!a.homeDecor;
  if (w.time > a.actTimer) {
    a.actPhase = hosted && a.actPhase !== 2 && rnd(a) < 0.6 ? 2 : 1;
    a.actTimer = w.time + (a.actPhase === 2 ? rdur(a, 5) : rdur(a, 6));
    a.actNormal.set(rrange(a, -1, 1), rrange(a, -0.3, 0.6), rrange(a, -0.4, 1));
  }
  if (a.actPhase === 2) {
    // nestle deep into the anemone's tentacles, rubbing and wiggling
    _a.copy(a.home);
    _a.x += Math.sin(w.time * 0.9 + a.noiseOff) * a.L * 0.25;
    _a.y += a.L * 0.25 + Math.sin(w.time * 1.3) * a.L * 0.1;
    go(a, _a, cruiseBL(a) * 0.8, a.L * 0.6);
    a.ctrl.ignoreDecor = a.homeDecor;
    a.ctrl.attach = dist(a, _a) < a.L ? 0.35 : 0;
    a.ctrl.sep = 0.2;
    if (dist(a, _a) < a.L * 1.2) observe(a, w, 'host_nestle');
    return true;
  }
  // waddle around the territory
  const R = a.L * (a.set.territoryBL ?? 4) * 0.5;
  _a.copy(a.home).addScaledVector(a.actNormal, R);
  _a.x += noise3(w.time * 0.15, a.noiseOff, 0) * R * 0.5;
  _a.y += noise3(a.noiseOff, w.time * 0.15, 4) * R * 0.3;
  fitInWater(a, w, _a);
  if (!pointFree(w.env, _a.x, _a.y, _a.z, bodySide(a))) _a.copy(a.home).y += a.L;
  go(a, fitInWater(a, w, _a), cruiseBL(a) * 0.7, a.L * 1.5);
  a.ctrl.wander = 0.25;
  a.ctrl.ignoreDecor = a.homeDecor;
  if (a.actT > 2) lookAround(a, w, a.home, 3);
  if (a.actT > 4 && a.setId === 'clownfish') observe(a, w, 'host_zone');
  return true;
}

function chooseHitch(a: Agent, w: AIWorld, moveOn: boolean): boolean {
  const avoid = moveOn ? a.anchorKey : null;
  let an = claimAnchor(a, w, ['hitch'], { near: a.rt.pos, avoidKey: avoid });
  if (!an) an = claimAnchor(a, w, ['perch', 'graze', 'rest', 'leaf_rest'], { near: a.rt.pos, avoidKey: avoid });
  if (!an) an = virtualAnchor(a, w, 'hitch');
  const env = w.env;
  // body sits above the holdfast, leaning slightly away from the decor
  _a.copy(an.pos);
  const colI = an.decorId ? env.colliders.findIndex((c) => c.decorId === an!.decorId) : -1;
  if (colI >= 0) {
    const c = env.colliders[colI];
    _b.set(an.pos.x - c.cx, 0, an.pos.z - c.cz);
    safeNormalize(_b, V[7].set(0, 0, 1));
    _a.addScaledVector(_b, a.L * 0.08);
  }
  // the tail loop (lower ~40% of the body) wraps the post: body centre sits ~0.38 L above the holdfast
  _a.y += a.L * 0.38;
  fitInWater(a, w, _a, true);
  // a holdfast tucked into a neighbouring stone (stones pushed together, a sea fan planted against live rock): the
  // body settles beside that stone instead of pressing into it
  clearOfDecor(a, w, _a, an.decorId || null);
  fitInWater(a, w, _a, true);
  a.home.copy(_a);
  a.hasHome = true;
  a.homeDecor = an.decorId || null;
  a.actData.copy(_a);
  a.actTarget = an.decorId || null;
  a.actPhase = 0;
  a.actDur = rdur(a, 45) * (a.belly > 0.3 ? 2 : 1) * (a.activeness < 0.4 ? 3 : 1);
  return true;
}

function hitchTick(a: Agent, w: AIWorld): boolean {
  a.ctrl.ignoreDecor = a.actTarget;
  if (a.actPhase === 0) {
    const d = dist(a, a.actData);
    go(a, a.actData, cruiseBL(a) * 1.15, a.L * 0.9);
    a.ctrl.avoid = d < a.L * 2 ? 0.2 : 0.8;
    a.pose = 'swim';
    if (d < a.L * 0.35) {
      a.actPhase = 1;
      a.actTimer = 0;
      observe(a, w, 'hitch');
    } else if (a.settleBest < 0 || d < a.settleBest - a.L * 0.03) {
      a.settleBest = d;
      a.settleT = w.time;
    } else if (w.time - a.settleT > 3) {
      // no headway for a while (the spot lies behind a stone it cannot pass): hitch right here if it is close, else
      // let go of this holdfast and pick another
      if (d < a.L * 1.2) {
        a.actData.copy(a.rt.pos);
        a.home.copy(a.rt.pos);
        a.actPhase = 1;
        a.actTimer = 0;
      } else if (!chooseHitch(a, w, true)) return false;
      a.settleBest = -1;
    }
    return true;
  }
  // hitched: sway with the water, turn the head to look about
  _a.copy(a.actData);
  const t = w.time * 0.4 + a.noiseOff;
  _a.x += noise3(t, 0.5, a.noiseOff) * a.L * 0.05 * (0.5 + w.env.flow);
  _a.z += noise3(0.5, t, a.noiseOff) * a.L * 0.04 * (0.5 + w.env.flow);
  go(a, _a, 0.2, a.L);
  a.ctrl.attach = 0.9;
  a.ctrl.sep = 0;
  a.pose = 'hitched';
  lookAround(a, w, a.rt.pos, 6);
  return true;
}

function findCleaner(a: Agent, w: AIWorld): Agent | null {
  if (a.sp.category !== 'fish' || a.set.loco !== 'swim' || a.L < 0.025) return null;
  const pt = a.sp.predatorTags ?? [];
  if ((pt.includes('shrimp') || pt.includes('crustacean') || pt.includes('shrimp_dwarf')) && a.sp.adultSizeCm < 25) return null;
  let best: Agent | null = null;
  let bestD = Infinity;
  for (const o of w.agents) {
    if (o.setId !== 'shrimp_cleaner' || o.dead || o.act !== 'clean_station' || o.actPhase < 1) continue;
    let busy = false;
    for (const q of w.agents) if (q !== a && q.act === 'visit_cleaner' && q.actTarget === o.id) busy = true;
    if (busy) continue;
    const d = o.rt.pos.distanceTo(a.rt.pos);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function ensureStation(a: Agent, w: AIWorld): void {
  if (a.hasHome) return;
  const env = w.env;
  const an = claimAnchor(a, w, ['cave', 'hide', 'perch', 'rest'], { near: a.rt.pos });
  if (an) {
    a.home.copy(an.pos);
  } else if (pointNearDecor(a, w, a.home, a.actNormal, bodyHY(a), {}) < 0) {
    a.home.set(rrange(a, env.minX * 0.4, env.maxX * 0.4), 0, env.minZ + (env.maxZ - env.minZ) * 0.35);
    a.home.y = floorAt(env, a.home.x, a.home.z) + bodyHY(a);
  }
  a.hasHome = true;
}

function choosePerch(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  const kinds: AnchorKind[] =
    a.setId === 'goby_perch' ? ['perch', 'rest', 'graze', 'hide'] : a.setId === 'reef_basslet' ? ['cave', 'hide', 'perch'] : a.setId === 'grouper' ? ['cave', 'hide', 'rest'] : ['perch', 'cave', 'hide', 'rest'];
  // lane:brackish — hopping gobies (bumblebee goby) sit a few seconds, then hop to a nearby stone, shell, root or patch of sand
  const hopper = a.setId === 'goby_perch' && hops(a);
  if (hopper) {
    a.actDur = rdur(a, 7);
    if (rnd(a) < 0.35 && floorPerch(a, w)) {
      a.actPhase = 0;
      a.actTarget = null;
      if (!a.hasHome) {
        a.home.copy(a.actData);
        a.hasHome = true;
      }
      return true;
    }
  }
  const an = claimAnchor(a, w, kinds, { near: hopper ? a.rt.pos : a.hasHome ? a.home : a.rt.pos, maxDist: hopper ? 0.3 : a.setId === 'goby_perch' ? undefined : 0.8 });
  a.actPhase = 0;
  if (an) {
    a.actData.copy(an.pos);
    a.actTarget = an.decorId;
    if (a.setId === 'goby_perch') a.actData.y += bodyHY(a);
    else a.actData.addScaledVector(V[7].set(0, 0.3, 1).normalize(), bodyHX(a) * 0.8);
  } else if (pointNearDecor(a, w, a.actData, a.actNormal, bodySide(a) + (a.setId === 'goby_perch' ? 0.002 : a.L * 0.35), { maxY: env.floorY + col(w) * 0.7 }) >= 0) {
    a.actTarget = null;
  } else {
    randomSwimPoint(a, w, a.actData, { y0: env.floorY + col(w) * 0.1, y1: env.floorY + col(w) * 0.5 });
    a.actTarget = null;
  }
  fitInWater(a, w, a.actData);
  if (!a.hasHome) {
    a.home.copy(a.actData);
    a.hasHome = true;
  }
  return true;
}

/** chunk 16 — species that hold station in a loose group in open water, facing into the current (lyretail anthias). */
const hoverShoal = (a: Agent) => !!a.sp.specialBehaviors?.includes('hover_in_current');

/**
 * chunk 16 — a hover shoal (lyretail anthias): each fish holds its own station in a loose cloud over the reef, all of
 * them facing into the current, darting out now and then to snap at plankton and drifting back; alarmed, the cloud
 * draws in. The cloud's centre moves rarely (the school state's goal).
 */
function hoverShoalTick(a: Agent, w: AIWorld, s: ReturnType<AIWorld['schools']['get']>): boolean {
  const env = w.env;
  const L = a.L;
  const c = a.ctrl;
  if (s && w.time > s.nextChange) {
    randomSwimPoint(a, w, s.goal, { zPref: 0.1 });
    s.nextChange = w.time + rdur(a, s.alarm > 0.2 ? 6 : 45, 0.4);
  }
  if (!s && a.actT < 0.05) randomSwimPoint(a, w, a.actNormal, { near: a.rt.pos, radius: L * 4 });
  const alarm = s ? s.alarm : 0;
  const loose = clamp(1.4 - a.sp.behaviorTraits.schoolingTightness, 0.4, 1.4) * (1 - 0.6 * clamp01(alarm * 2));
  // its own station in the cloud (fixed per fish, drifting slowly)
  const th = ((a.noiseOff * 13.37) % 1) * Math.PI * 2;
  const r = L * (1.2 + 3 * ((a.noiseOff * 5.71) % 1)) * loose;
  const t = w.time * 0.05;
  _a.copy(s ? (alarm > 0.25 ? s.center : s.goal) : a.actNormal);
  _a.x += Math.cos(th) * r + noise3(t, a.noiseOff, 1.7) * L * 1.2;
  _a.z += Math.sin(th) * r * 0.6 + noise3(4.1, t, a.noiseOff) * L * 0.8;
  _a.y += (((a.noiseOff * 3.31) % 1) - 0.5) * L * 3 * loose + noise3(a.noiseOff, 2.3, t) * L * 0.6;
  fitInWater(a, w, _a);
  if (!pointFree(env, _a.x, _a.y, _a.z, bodySide(a) + 0.004)) _a.y = Math.min(env.surfaceY - bodySide(a) - 0.004, _a.y + L * 1.5);
  // now and then a dart out into the current to snap at plankton, then back
  if (a.actPhase === 0 && w.time > a.actTimer) {
    if (a.actTimer > 0) {
      a.actPhase = 1;
      a.actCount = w.time + 0.8;
      a.actData.copy(a.rt.pos).addScaledVector(env.currentDir, -L * rrange(a, 1, 2));
      a.actData.y += L * rrange(a, -0.3, 0.8);
      fitInWater(a, w, a.actData);
    }
    a.actTimer = w.time + rdur(a, 5);
  }
  if (a.actPhase === 1) {
    go(a, a.actData, burstBL(a) * 0.35, L * 0.4);
    if (dist(a, a.actData) < L * 0.5 || w.time > a.actCount) {
      a.mouthPulse = 1;
      a.actPhase = 0;
    }
  } else go(a, _a, cruiseBL(a) * (0.6 + alarm), L * 2);
  // facing into the current
  look(a, _b.copy(a.rt.pos).addScaledVector(env.currentDir, -L * 6));
  c.wander = 0.04;
  c.sep = 1.1;
  c.urgency = alarm * 0.6;
  a.pose = a.actPhase === 1 ? 'feed' : 'hover';
  return true;
}

/** lane:brackish — species that hop from perch to perch (bumblebee goby). */
const hops = (a: Agent) => !!a.sp.specialBehaviors?.includes('hop');
/** lane:brackish — species that rasp algae and biofilm off every surface (mollies). */
const grazesSurfaces = (a: Agent) => !!a.sp.specialBehaviors?.includes('graze_surfaces');

/** lane:brackish — a patch of open substrate near the goby to perch on (belly on the sand). */
function floorPerch(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  const r = bodySide(a) + 0.004;
  for (let i = 0; i < 12; i++) {
    const x = clamp(a.rt.pos.x + rrange(a, -0.2, 0.2), env.minX + bodyHX(a) + 0.01, env.maxX - bodyHX(a) - 0.01);
    const z = clamp(a.rt.pos.z + rrange(a, -0.12, 0.16), env.minZ + bodyHX(a) + 0.01, env.maxZ - bodyHX(a) - 0.01);
    const y = floorAt(env, x, z) + bodyHY(a);
    if (pointFree(env, x, y, z, r)) {
      a.actData.set(x, y, z);
      return true;
    }
  }
  return false;
}

/** lane:brackish — a spot on the back or end glass for a surface grazer: writes actData (standoff point) + actNormal. */
function glassGrazeSpot(a: Agent, w: AIWorld, standoff: number): void {
  const env = w.env;
  const y = rrange(a, Math.max(a.zoneY0, env.floorY + a.L), Math.min(a.zoneY1, env.surfaceY - a.L * 0.5));
  if (rnd(a) < 0.7) {
    a.actNormal.set(0, 0, 1);
    a.actData.set(clamp(a.rt.pos.x + rrange(a, -0.15, 0.15), env.minX + standoff, env.maxX - standoff), y, env.minZ + standoff);
  } else {
    const s = a.rt.pos.x >= 0 ? 1 : -1;
    a.actNormal.set(-s, 0, 0);
    a.actData.set(s > 0 ? env.maxX - standoff : env.minX + standoff, y, clamp(a.rt.pos.z + rrange(a, -0.08, 0.08), env.minZ + standoff, env.maxZ - standoff));
  }
  fitInWater(a, w, a.actData);
  a.actTarget = null;
}

function perchTick(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  a.ctrl.ignoreDecor = a.actTarget;
  const d = dist(a, a.actData);
  if (a.actPhase === 0 && a.setId === 'goby_perch' && hops(a)) {
    // lane:brackish — a goby hop: short darts with pauses, low over the bottom, then a settle
    // (hops along the bottom; a climb or a drop to a higher/lower perch is just swum)
    const level = Math.abs(a.actData.y - a.rt.pos.y) < a.L * 1.5;
    const burst = !level || Math.sin(w.time * 5.2 + a.noiseOff) > 0.3;
    go(a, a.actData, cruiseBL(a) * (level ? (burst ? 2.1 : 0.4) : 1), a.L * 0.8);
    a.ctrl.avoid = d < a.L * 2 ? 0.3 : 1;
    a.ctrl.allowFloor = true;
    a.pose = 'swim';
    if (d < a.L * 0.6) a.actPhase = 1;
    return true;
  }
  if (a.actPhase === 0) {
    go(a, a.actData, cruiseBL(a), a.L);
    a.ctrl.avoid = d < a.L * 2 ? 0.3 : 1;
    if (d < a.L * 0.6) a.actPhase = 1;
    return true;
  }
  if (a.setId === 'goby_perch') {
    go(a, a.actData, 0.2, a.L);
    a.ctrl.attach = 0.7;
    a.ctrl.allowFloor = true;
    a.pose = 'rest';
    lookAround(a, w, a.rt.pos, 3);
    if (hops(a)) {
      // lane:brackish — a hopping goby sits belly-down on its stone, head up a touch: it looks about, not down its nose
      a.ctrl.look.y = a.rt.pos.y + a.L * 0.15;
      a.ctrl.pitchCap = 0.3;
    }
    return true;
  }
  // small movements around the station
  _a.copy(a.actData);
  _a.x += noise3(w.time * 0.2, a.noiseOff, 2) * a.L * 0.6;
  _a.y += noise3(a.noiseOff, w.time * 0.2, 5) * a.L * 0.3;
  go(a, fitInWater(a, w, _a), cruiseBL(a) * 0.5, a.L);
  a.ctrl.avoid = 0.35;
  if (a.setId === 'lionfish') a.ctrl.pitchBias = -0.25;
  if (a.set.hugRock) {
    // royal gramma: belly toward the nearest rock face — upside down under ledges
    const hit = nearestSurface(env, a.rt.pos, SURF_DECOR, a.hit, undefined);
    if (hit.kind !== 'none' && hit.d < a.L * 1.4) {
      a.ctrl.wantUp.copy(hit.n);
      a.ctrl.hasWantUp = true;
    }
  }
  if (a.setId === 'grouper' || a.setId === 'reef_basslet') {
    _b.set(a.rt.pos.x + Math.sin(w.time * 0.1 + a.noiseOff) * 0.3, a.rt.pos.y, env.maxZ + 0.3);
    look(a, _b);
  } else lookAround(a, w, a.rt.pos, 4);
  return true;
}

// ── chunk 16, wave B: perching, patches, chases ──

/** Grazers that stay a long while on each patch and drift slowly to the next (sea star, urchin). */
const slowGrazer = (a: Agent) => a.setId === 'starfish' || a.setId === 'urchin';

/** Where a perching fish looks for a perch: a hawkfish high on the tops and rims of the rock; a blenny low, on rock or
 * glass, about its home. `hop`: the next perch of a bout, a short swim on. */
function perchOpts(a: Agent, near: THREE.Vector3, hop: boolean): PerchOpts {
  if (a.setId === 'hawkfish') return { minNy: 0.55, near, radius: hop ? a.L * 8 : 0.35, minDist: hop ? a.L * 2 : 0, glass: 0, high: 1.4, edge: 0.9, tries: 24 };
  return { minNy: -0.1, near, radius: hop ? a.L * 6 : a.L * 8, minDist: hop ? a.L * 1.5 : 0, glass: 0.3, high: -0.8, edge: 0, tries: 20 };
}

/**
 * A perching bout (lawnmower blenny, flame hawkfish): a perch on the rock (a blenny also on the glass), a few hops from
 * one to the next. A hawkfish goes back to its favourite perch (its home) most of the time; with no rock at all it sits
 * on the bed. The bout runs on its hops (a.hops), each stay timed by a.actCount.
 */
function chooseRockPerch(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  const hawk = a.setId === 'hawkfish';
  a.actPhase = 0;
  a.actTarget = null;
  a.actDur = 1e9;
  a.settleBest = -1;
  a.hops = hawk ? (rnd(a) < 0.3 ? 2 : 1) : 2 + Math.floor(rnd(a) * 4);
  if (hawk && a.hasHome && rnd(a) < 0.7 && !perchTaken(a, w, a.home) && pointFreeExcept(env, a.home.x, a.home.y, a.home.z, bodySide(a) * 0.85, a.patchDecor)) {
    a.actData.copy(a.home);
    a.perchN.copy(a.homeN);
    a.actTarget = a.patchDecor;
    // (its favourite perch lies inside its rock's box when it was found there: the box let through)
    a.throughDecor = a.patchDecor && !pointFreeExcept(env, a.home.x, a.home.y, a.home.z, bodySide(a) * 0.85, null) ? a.patchDecor : null;
  } else {
    a.throughDecor = null;
    const id = findPerch(a, w, a.actData, a.perchN, perchOpts(a, !hawk && a.hasHome ? a.home : a.rt.pos, false));
    if (id !== null) {
      a.actTarget = id || null;
      if (id && perchGap > 0.002) a.throughDecor = id;
    } else if (hawk && floorPerch(a, w)) {
      a.actData.y = floorAt(env, a.actData.x, a.actData.z) + bodySide(a) + 0.002;
      a.perchN.set(0, 1, 0);
    } else return false;
  }
  a.perchSide = rnd(a) < 0.5 ? 1 : -1;
  if (!a.hasHome) {
    a.home.copy(a.actData);
    a.homeN.copy(a.perchN);
    a.patchDecor = a.actTarget;
    a.hasHome = true;
  }
  return true;
}

/** The next perch of a bout, a short hop on. False: none. */
function nextRockPerch(a: Agent, w: AIWorld): boolean {
  const id = findPerch(a, w, a.actData, a.perchN, perchOpts(a, a.rt.pos, true));
  if (id === null) return false;
  a.actTarget = id || null;
  a.throughDecor = id && perchGap > 0.002 ? id : null;
  a.actPhase = 0;
  a.perchSide = rnd(a) < 0.5 ? 1 : -1;
  a.settleBest = -1;
  return true;
}

/**
 * Perched on the rock (or the glass): a short swim to the perch (a blenny's a burst and a glide), then still on its fins
 * looking about — on a top lying along it, head raised; on a steep face or the glass head-up along it, belly to it — then
 * a hop to the next perch, or the bout ends. (A hawkfish's pounces are the feed act; it comes back here after.)
 */
function rockPerchTick(a: Agent, w: AIWorld): boolean {
  const L = a.L;
  const c = a.ctrl;
  const hawk = a.setId === 'hawkfish';
  const n = a.perchN;
  const d = dist(a, a.actData);
  if (a.actPhase === 0) {
    const burst = hawk || Math.sin(w.time * 4.5 + a.noiseOff) > 0.1;
    go(a, a.actData, cruiseBL(a) * (hawk ? 1.4 : burst ? 1.8 : 0.7), L * 0.5);
    c.avoid = d < L * 2.5 ? 0.25 : 1;
    c.allowFloor = true;
    c.sep = 0.4;
    a.pose = 'swim';
    if (a.settleBest < 0 || d < a.settleBest - L * 0.05) {
      a.settleBest = d;
      a.settleT = w.time;
    } else if (w.time - a.settleT > 3) {
      // no way through to it: it sits where it is if that is close, else it tries another perch
      a.settleBest = -1;
      if (d < L * 1.2) a.actData.copy(a.rt.pos);
      else if (!nextRockPerch(a, w)) return false;
      return true;
    }
    if (d < L * 0.45) {
      a.actPhase = 1;
      a.actCount = w.time + (hawk ? rdur(a, 26) : rdur(a, 7));
      a.settleBest = -1;
    }
    // (the last of the way in, to a perch inside the rock's collider box)
    if (d < L * 0.8 && a.throughDecor) c.ignoreDecor = a.throughDecor;
    return true;
  }
  settleIfBlocked(a, w, a.actData);
  go(a, a.actData, 0.15, L);
  c.attach = 0.7;
  c.allowFloor = true;
  c.avoid = 0.2;
  c.sep = 0.2;
  // (on the rock as drawn, inside the collider box round it: the box is let through — findPerch)
  if (a.throughDecor) c.ignoreDecor = a.throughDecor;
  a.pose = 'rest';
  if (n.y < 0.6) {
    // head up along the face, belly to it, looking out along it
    c.wantUp.copy(n);
    c.hasWantUp = true;
    _b.set(-n.z, 0, n.x);
    if (_b.lengthSq() < 1e-6) _b.set(1, 0, 0);
    _b.normalize().multiplyScalar(a.perchSide);
    look(a, _c.copy(a.rt.pos).addScaledVector(_b, L * 3));
    c.pitchBias = 0.95;
    c.pitchCap = 1.15;
  } else {
    lookAround(a, w, a.rt.pos, hawk ? 2.4 : 1.6);
    c.look.y = a.rt.pos.y + L * 0.1;
    c.pitchBias = hawk ? 0.12 : 0.3;
    c.pitchCap = 0.5;
  }
  if (w.time > a.actCount) {
    if (--a.hops <= 0) return false;
    if (!nextRockPerch(a, w)) return false;
  }
  return true;
}

/**
 * The chase: a dart at the intruder (a second or so, or until it is a nip away, or it has left the territory), then
 * back to the patch (a blenny's next perch is the planner's).
 */
function chaseTick(a: Agent, w: AIWorld): boolean {
  const L = a.L;
  const c = a.ctrl;
  const o = a.actTarget ? w.byId.get(a.actTarget) : undefined;
  const R = (a.set.territoryBL ?? 4) * L;
  if (a.actPhase === 0) {
    if (!o || o.dead || w.time > a.actTimer || (a.hasHome && o.rt.pos.distanceTo(a.home) > R * 1.8)) a.actPhase = 1;
    else {
      go(a, o.rt.pos, burstBL(a) * 0.75, 0.001);
      c.urgency = 0.8;
      c.sep = 0.2;
      c.avoid = 0.7;
      look(a, o.rt.pos);
      if (dist(a, o.rt.pos) < (L + o.L) * 0.6) {
        a.mouthPulse = 1; // a nip
        a.actPhase = 1;
      }
      a.pose = 'display';
      return true;
    }
  }
  if (!a.hasHome || a.setId === 'blenny') return false;
  _a.copy(a.home);
  if (a.setId === 'damsel') _a.y += L * 0.8;
  else _a.y = Math.max(_a.y, floorAt(w.env, _a.x, _a.z) + bodySide(a) + L * 0.25);
  fitInWater(a, w, _a);
  go(a, _a, cruiseBL(a) * 1.3, L);
  a.pose = 'swim';
  return dist(a, _a) > L * 1.5 && a.actT < 7;
}

/**
 * A home patch (damsel: a cave or hide in the rock, away from the other damsels' patches; ram: a flat stone or a cave
 * low on the bed — its mate shares it). Without a free anchor: a spot by a rock (damsel) or on open bed (ram).
 */
function patchHome(a: Agent, w: AIWorld): void {
  const env = w.env;
  const ram = a.setId === 'cichlid_dwarf';
  a.homeDecor = null;
  if (ram) {
    const m = mateOf(a, w);
    if (m && m.hasHome) {
      a.home.copy(m.home);
      a.patchDecor = m.patchDecor;
      a.hasHome = true;
      return;
    }
  }
  const best = choosePatch(a, w, ram ? ['rest', 'cave', 'nest_site', 'hide'] : ['cave', 'hide', 'rest', 'perch']);
  const an = best ? claimAnchor(a, w, [best.kind], { near: best.pos, maxDist: 1e-4 }) : null;
  a.hasHome = true;
  if (an) {
    a.patchDecor = an.decorId || null;
    a.home.copy(an.pos);
    // (a ram's home is the water just over its stone)
    if (ram) a.home.y = Math.max(a.home.y, floorAt(env, a.home.x, a.home.z)) + bodySide(a) + a.L * 0.2;
    fitInWater(a, w, a.home);
    return;
  }
  a.patchDecor = null;
  if (ram) {
    pickForageSpot(a, w);
    a.home.copy(a.actData);
    return;
  }
  const idx = pointNearDecor(a, w, a.home, a.actNormal, bodyHX(a) + a.L * 0.8, { maxY: env.floorY + col(w) * 0.6 });
  if (idx >= 0) a.patchDecor = env.colliders[idx].decorId;
  else randomSwimPoint(a, w, a.home, { y0: env.floorY + col(w) * 0.2, y1: env.floorY + col(w) * 0.5 });
}

/**
 * At home on its patch (the 'host' act's label, "at home"): a damsel hovers over its rock — a new spot every few
 * seconds, now and then a quick duck into the rock and out; a ram glides low over the bed about its stone, stopping
 * and going. (Intruders are the chase act's: brain think.)
 */
function patchTick(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  const L = a.L;
  const c = a.ctrl;
  const ram = a.setId === 'cichlid_dwarf';
  const R = (a.set.territoryBL ?? 4) * L;
  if (!a.hasHome) ensureHome(a, w);
  if (w.time > a.actTimer) {
    if (!ram && a.patchDecor && rnd(a) < 0.22) {
      a.actPhase = 3;
      a.actTimer = w.time + rrange(a, 0.8, 2.2);
    } else {
      a.actPhase = 1;
      a.actTimer = w.time + (ram ? rdur(a, 2.2) : rdur(a, 4));
      if (ram) a.actNormal.set(rrange(a, -1, 1) * R * 0.5, 0, rrange(a, -1, 1) * R * 0.35);
      else a.actNormal.set(rrange(a, -1, 1) * R * 0.3, rrange(a, 0.5, 1.8) * L, rrange(a, -0.2, 1) * R * 0.25);
    }
  }
  if (a.actPhase === 3) {
    go(a, a.home, cruiseBL(a) * 1.5, L * 0.5);
    c.ignoreDecor = a.patchDecor;
    c.allowFloor = true;
    c.avoid = 0.3;
    a.pose = 'hiding';
    return true;
  }
  _a.copy(a.home).add(a.actNormal);
  if (ram) _a.y = floorAt(env, _a.x, _a.z) + bodySide(a) + L * 0.25;
  fitInWater(a, w, _a);
  if (!pointFree(env, _a.x, _a.y, _a.z, bodySide(a) + 0.003)) {
    _a.copy(a.home);
    if (!ram) _a.y += L;
    fitInWater(a, w, _a);
  }
  go(a, _a, cruiseBL(a) * (ram ? 0.9 : 0.6), L * (ram ? 0.6 : 1.5));
  c.wander = ram ? 0.04 : 0.15;
  c.allowFloor = ram;
  if (ram) c.pitchBias = -0.12;
  else look(a, _b.set(a.home.x + Math.sin(w.time * 0.2 + a.noiseOff) * 0.2, a.rt.pos.y, env.maxZ + 0.4));
  a.pose = 'hover';
  return true;
}

function ensureBurrow(a: Agent, w: AIWorld): void {
  if (a.hasHome) return;
  const env = w.env;
  const an = claimAnchor(a, w, ['burrow'], { near: a.rt.pos });
  // the burrow is dug into the decor that carries it (a rubble mound): remember which, so the animal can get into it
  a.homeDecor = an?.decorId || null;
  if (an) {
    a.home.copy(an.pos);
    a.home.y = floorAt(env, a.home.x, a.home.z);
  } else {
    // dig one at the foot of a rock (front side) or in open sand
    let placed = false;
    for (let i = 0; i < env.colliders.length && !placed; i++) {
      const c = env.colliders[(i + Math.floor(rnd(a) * env.colliders.length)) % env.colliders.length];
      if (!c.hard) continue;
      const x = clamp(c.cx + rrange(a, -c.hx, c.hx) * 0.7, env.minX + a.L, env.maxX - a.L);
      const z = clamp(c.cz + c.hz + a.L * 0.5, env.minZ + a.L, env.maxZ - a.L);
      if (pointFree(env, x, floorAt(env, x, z) + bodyHY(a), z, bodySide(a))) {
        a.home.set(x, floorAt(env, x, z), z);
        placed = true;
      }
    }
    if (!placed) {
      a.home.set(rrange(a, env.minX * 0.6, env.maxX * 0.6), 0, rrange(a, env.minZ * 0.2, env.maxZ * 0.5));
      a.home.y = floorAt(env, a.home.x, a.home.z);
    }
  }
  a.hasHome = true;
}

/**
 * chunk 16 — a buried sand dweller (Nassarius): dug into the sand where it is, shell under, siphon up and swaying,
 * tasting the water; scared (phase 2) it digs in fast. On a bed it cannot dig into it just sits.
 */
function sandBurrowTick(a: Agent, w: AIWorld): boolean {
  const c = a.ctrl;
  const bp = buryProfile(a)!;
  c.hasGoal = false;
  c.speedBL = 0;
  if (!onSand(a, w)) {
    a.pose = a.actPhase === 2 ? 'hiding' : 'rest';
    return true;
  }
  c.sink = bp.depth;
  if (a.actPhase === 2) {
    c.sinkRate = bp.dig * 3;
    if (a.sink >= bp.depth - 0.05) a.actPhase = 1;
  }
  a.pose = a.actPhase === 2 ? 'hiding' : 'rest';
  // the siphon sways, tasting the water for food (a Nassarius's)
  if (a.sink > 0.5 && a.setId === 'snail_sand') a.appendage = Math.max(a.appendage, 0.3 + 0.25 * Math.sin(w.time * 0.8 + a.noiseOff));
  return true;
}

function burrowTick(a: Agent, w: AIWorld): boolean {
  if (buryProfile(a) && isCrawler(a)) return sandBurrowTick(a, w);
  const env = w.env;
  const home = a.home;
  const mantis = a.setId === 'mantis_shrimp';
  const dart = a.setId === 'dartfish';
  // a mantis lives down inside its burrow (in the rubble): the mound is no obstacle to it. (Without this it pressed
  // against the mound's side, the floor and the wall trading its heading back and forth ~12×/s.)
  if (mantis) a.ctrl.ignoreDecor = a.homeDecor;
  if (a.actPhase === 2) {
    // diving into / sheltering in the burrow
    _a.set(home.x, home.y - a.L * (mantis ? 0.35 : 0.6), home.z);
    go(a, _a, burstBL(a) * 0.5, a.L * 0.5);
    a.ctrl.allowFloor = true;
    a.ctrl.burrow = 1;
    a.ctrl.pitchBias = mantis ? 0 : -1.1;
    a.ctrl.urgency = 1;
    a.ctrl.avoid = 0;
    a.pose = 'hiding';
    if (a.rt.pos.y < floorAt(env, a.rt.pos.x, a.rt.pos.z) - 0.1 * a.L && !mantis) a.rt.visible = false;
    if (a.actTimer === 0) a.actTimer = w.time + rrange(a, 5, 18) * (1.5 - a.mods.boldness);
    if (w.time > a.actTimer && a.fright < 0.15) {
      a.actPhase = 0;
      a.actTimer = 0;
      a.rt.visible = true;
    }
    return true;
  }
  a.rt.visible = true;
  if (mantis) {
    _a.set(home.x, home.y + bodyHY(a) * 0.3, home.z);
    const d = Math.hypot(a.rt.pos.x - _a.x, a.rt.pos.z - _a.z);
    if (a.actPhase === 0 || d > a.L * 0.6) {
      // walking back to the burrow mouth (level, not yet tipped into the peek)
      a.actPhase = 0;
      go(a, _a, cruiseBL(a), a.L * 0.8);
      a.ctrl.burrow = 0.3;
      a.pose = 'swim';
      if (d < a.L * 0.15) {
        a.actPhase = 1;
        a.actTimer = 0;
        a.actCount = w.time;
      }
      return true;
    }
    // settled in the mouth: the body eases down into the burrow (the renderer tips it tail-down, so eyes, antennules
    // and clubs show above the rubble), facing out into the tank; now and then a small, deliberate turn to scan
    // another patch (only the eyes swivel constantly — see cosmetics)
    const sink = clamp((w.time - a.actCount) / 1.2, 0, 1);
    a.ctrl.burrow = 0.3 + 0.7 * sink;
    a.ctrl.pitchBias = 0.25 * sink;
    a.pose = 'hiding';
    if (w.time >= a.actTimer) {
      a.actTimer = w.time + rdur(a, 3.5, 0.5);
      const out = Math.atan2(env.maxZ - home.z, -home.x * 0.3);
      const yaw = out + rrange(a, -0.55, 0.55);
      a.actNormal.set(home.x + Math.cos(yaw) * 0.3, a.rt.pos.y, home.z + Math.sin(yaw) * 0.3);
    }
    look(a, a.actNormal);
    a.ctrl.faceLook = true;
    return true;
  }
  const hoverH = dart ? a.L * 2.2 : bodyHY(a) * 0.95;
  _a.set(home.x, home.y + hoverH, home.z);
  // a burrow dug into a rubble mound: the goby perches on the mound at the entrance, not inside it (pulled toward a
  // spot in the rock and pushed back out every frame, it sat there trembling)
  clearOfDecor(a, w, _a, null);
  if (a.actPhase === 0) {
    go(a, _a, cruiseBL(a), a.L);
    a.ctrl.allowFloor = !dart;
    if (dist(a, _a) < a.L * 0.8) {
      a.actPhase = 1;
      a.actTimer = w.time + rdur(a, 6);
    }
    return true;
  }
  if (dart) {
    // hover above the burrow, facing into the current; now and then dart up to snatch plankton
    if (w.time > a.actTimer) {
      a.actTimer = w.time + rdur(a, 7);
      a.actNormal.set(home.x + rrange(a, -2, 2) * a.L, home.y + hoverH + a.L * rrange(a, 1.5, 3), home.z + rrange(a, -1, 1) * a.L);
      a.actCount = w.time + 0.7;
    }
    if (w.time < a.actCount) {
      go(a, fitInWater(a, w, a.actNormal), burstBL(a) * 0.35, a.L * 0.4);
      if (dist(a, a.actNormal) < a.L * 0.5) a.mouthPulse = 1;
    } else {
      _a.y += Math.sin(w.time * 0.8 + a.noiseOff) * a.L * 0.15;
      go(a, _a, cruiseBL(a) * 0.4, a.L);
      look(a, V[6].set(home.x + 0.3, _a.y, home.z + 0.15));
    }
    return true;
  }
  // watchman goby: perched at the entrance, head up, eyes scanning
  go(a, _a, 0.3, a.L);
  a.ctrl.attach = 0.5;
  a.ctrl.allowFloor = true;
  a.ctrl.pitchBias = 0.15;
  a.pose = 'rest';
  if (rnd(a) < 0.004 * stepRate.k) a.mouthPulse = 1; // spits out a mouthful of sand
  lookAround(a, w, a.rt.pos, 2.5);
  return true;
}

// ── feeding ticks ──

function feedTick(a: Agent, w: AIWorld): boolean {
  let p = findParticle(w, a.foodId);
  // lane:pc-perf — re-pick ~3×/s of AI time (was every 20th step: 3×/s at 60 Hz, 7×/s at 144 Hz)
  if (!p || (a.actPhase === 0 && Math.floor(w.time * 3) !== Math.floor((w.time - stepRate.dt) * 3))) {
    const q = chooseFood(a, w);
    if (!q) return false;
    if (!p || q !== p) {
      if (p && p.claimedBy === a.id) p.claimedBy = undefined; // let go of the old piece
      a.foodId = q.id;
      a.foodT = w.time;
      p = q;
    }
  }
  if (!wantsMore(a, p)) return false;
  p.claimedBy = a.id;
  if (a.set.anemone) return anemoneFeedTick(a, w, p);
  const style = feedStyle(a);
  const env = w.env;
  const m = mouthPos(a, _a);
  const d = m.distanceTo(p.pos);
  const size = p.size ?? 0.003;
  // no headway toward the piece for a while (it lies in a crevice the body cannot enter, under a rock, or the animal
  // is held off by its neighbours): give it up rather than hover over it until the act times out — and try another.
  // (only once the piece has come to rest or the animal has: a slow seahorse chasing a mysis that sinks as fast as it
  // swims is making headway of a kind — it gets the piece once it lands. The best distance is kept across re-picks
  // among a cluster of equally far pieces: flipping between two it cannot reach is no headway either)
  // (the clock starts when the animal first went for this piece, not when the act began: a walker pressing at a stone
  // has its act cut and restarted by the brain's blocked-detector every second or two)
  if (a.actPhase === 0) {
    if (a.settleBest < 0) {
      a.settleBest = d;
      a.settleT = Math.max(a.foodT, a.lastFedT);
    } else if (d < a.settleBest - Math.max(size * 0.5, a.L * 0.04)) {
      a.settleBest = d;
      a.settleT = w.time;
    } else if (w.time - a.settleT > 5 && d > a.L * 0.3 && (p.settled || a.speed + a.drift.length() < cruiseBL(a) * a.L * 0.3)) {
      dropFood(a, w, true);
      return false;
    }
  }
  // chewing pause after a bite
  if (a.actPhase === 1) {
    a.ctrl.hasGoal = a.loco !== 'crawl' && a.loco !== 'walk';
    a.ctrl.goal.copy(a.rt.pos);
    a.ctrl.speedBL = 0.2;
    if (rnd(a) < 0.15 * stepRate.k) a.mouthPulse = Math.max(a.mouthPulse, 0.4);
    if (w.time > a.actTimer) {
      // (chunk 16: a hawkfish goes back to a perch after each pounce — the perch act; it pounces again from there)
      if (style === 'pounce') return false;
      a.actPhase = 0;
    }
    return true;
  }
  look(a, p.pos);
  a.ctrl.allowSurface = p.pos.y > env.surfaceY - a.L * 1.2;
  a.ctrl.allowFloor = p.pos.y < floorAt(env, p.pos.x, p.pos.z) + a.L * 1.2;
  a.ctrl.avoid = 0.45;
  // aim at the food; only tilt extra for food on the surface film (up) or lying on the bottom (down)
  if (p.motion === 'float' && p.pos.y > m.y) a.ctrl.pitchBias = 0.2;
  else if (p.settled && a.loco !== 'crawl' && a.loco !== 'walk' && p.pos.y < m.y) a.ctrl.pitchBias = -0.3;
  const L = a.L;
  switch (style) {
    case 'snick': {
      // seahorse: stay on the holdfast if the food drifts within reach, else creep over; pivot, then snick
      // A piece lying on the bottom is below anything the snout can reach (the upright body cannot pitch, and stands
      // about half a body length above the sand): the seahorse hovers over it, snout above the piece, and snicks it
      // up from there.
      // (or, once it can get no lower — a stone under it — from a little higher still)
      const onBottom = p.settled || p.pos.y < floorAt(env, p.pos.x, p.pos.z) + L * 0.45;
      const dh = Math.hypot(m.x - p.pos.x, m.z - p.pos.z);
      const dy = m.y - p.pos.y;
      const stalled = a.settleBest >= 0 && w.time - a.settleT > 2;
      const inReach = onBottom ? dh < L * 0.3 + size && (dy < L * 1.05 || (stalled && dy < L * 1.3)) : d < L * 0.45 + size;
      const hitched = a.hasHome && a.rt.pos.distanceTo(a.home) < L * 0.6;
      // (waiting on the holdfast only while the piece is still coming down toward the snout: one that has sunk past
      // it, or lies on the sand, has to be fetched)
      if (hitched && p.pos.distanceTo(a.home) < L * 1.4 && (inReach || p.pos.y > m.y - L * 0.15)) {
        a.settleBest = -1;
        go(a, a.home, 0.2, L);
        a.ctrl.attach = 0.8;
        a.ctrl.pitchBias = clamp((p.pos.y - m.y) / L, -0.5, 0.4);
        a.pose = 'hitched';
      } else {
        _b.copy(p.pos).addScaledVector(a.fwd, -L * 0.3);
        _b.y -= L * 0.3;
        fitInWater(a, w, _b);
        if (onBottom) clearOfDecor(a, w, _b, null);
        // (a tight arrive radius: with a wide one it stopped short, a snout-length off, while the piece sank away)
        go(a, _b, cruiseBL(a) * 1.4, L * 0.2);
        a.pose = 'feed';
      }
      if (inReach && facing(a, p.pos, 0.9, onBottom)) {
        eat(a, w, p, style);
        observe(a, w, 'snick_feed');
        a.actPhase = 1;
        a.actTimer = w.time + rrange(a, 0.6, 1.4);
      }
      return true;
    }
    case 'strike': {
      // axolotl / frog: slow approach, then a sudden suction strike
      const floorH = p.pos.y - floorAt(env, p.pos.x, p.pos.z);
      if (a.loco === 'walk' && floorH > L * 0.9) takeOff(a);
      if (a.loco === 'walk') {
        // on foot: walk straight at the piece (the mouth leads; the strike fires before the body gets there)
        go(a, p.pos, cruiseBL(a) * (d < L ? 0.6 : 1.2), L * 0.3);
        a.ctrl.pitchBias = 0.1;
      } else {
        // swimming: steer so the MOUTH arrives at the piece (the body stops a head-length short along the approach
        // line, nosing straight at it once within one) — aimed at the body centre with a wide arrive radius it used to
        // "arrive" hovering a hand above a pellet on the sand and never strike
        _b.subVectors(p.pos, a.rt.pos);
        const dc = _b.length();
        _c.copy(p.pos);
        if (dc > bodyHX(a) * 1.1) _c.addScaledVector(_b, -(bodyHX(a) * 0.9) / dc);
        go(a, _c, cruiseBL(a) * (d < L ? 0.6 : 1.2), L * 0.12);
        if (floorH < L * 0.5) a.ctrl.pitchBias = -0.45; // nose down onto a piece lying on the bottom
      }
      if (d < L * 0.55 + size) {
        a.speed = Math.max(a.speed, burstBL(a) * L * 0.25);
        eat(a, w, p, style);
        a.gill = 1;
        a.actPhase = 1;
        a.actTimer = w.time + rrange(a, 0.8, 2);
      }
      return true;
    }
    case 'pounce': {
      // chunk 16 — flame hawkfish: a piece within a short dart is pounced on at full speed; one that is still coming
      // down farther off it watches from its perch (unless hungry); one lying farther off it swims over to
      const reachP = Math.max(L * 7, 0.14);
      _b.subVectors(p.pos, a.rt.pos);
      const dc = _b.length();
      _c.copy(p.pos);
      if (dc > 1e-5) _c.addScaledVector(_b, -Math.min(dc, bodyHX(a) * 0.9) / dc);
      a.pose = 'feed';
      if (d < reachP) {
        go(a, _c, burstBL(a) * 0.9, L * 0.25);
        a.ctrl.urgency = 1;
        a.ctrl.avoid = 0.3;
        a.ctrl.sep = 0.2;
        if (d < L * 2) a.mouthPulse = Math.max(a.mouthPulse, 0.6);
      } else if (a.hasHome && !p.settled && a.hunger < 0.6 && a.home.distanceTo(p.pos) < reachP * 2.5) {
        go(a, a.home, 0.2, L);
        a.ctrl.attach = 0.6;
        a.ctrl.allowFloor = true;
        a.pose = 'rest';
        // (waiting for it to come is not a pursuit stalled)
        a.settleBest = d;
        a.settleT = w.time;
      } else go(a, _c, cruiseBL(a) * 1.3, L * 0.7);
      if (d < L * 0.3 + size + 0.003) {
        emit(w, 'bite', p.pos, a.id, 0.7);
        eat(a, w, p, 'rush');
        a.actPhase = 1;
        a.actTimer = w.time + rrange(a, 0.3, 0.7);
      }
      return true;
    }
    case 'pick': {
      if (a.loco === 'swim') {
        go(a, p.pos, cruiseBL(a), L);
        return true;
      }
      // (a Nassarius races to food — fast, for a snail)
      go(a, p.pos, a.set.smellsFood ? Math.max(cruiseBL(a) * 1.3, burstBL(a) * 0.85) : cruiseBL(a) * 1.3, L * 0.8);
      if (d < L * 0.5 + size) {
        a.ctrl.hasGoal = false;
        a.ctrl.speedBL = 0;
        if (w.time > a.actTimer) {
          eat(a, w, p, style);
          a.actTimer = w.time + rrange(a, 0.35, 0.8);
        }
        a.appendage = Math.max(a.appendage, 0.5 + 0.5 * Math.abs(Math.sin(w.time * 10)));
      }
      return true;
    }
    default: {
      const tr = a.sp.behaviorTraits;
      const rush = cruiseBL(a) + (burstBL(a) - cruiseBL(a)) * (0.2 + 0.5 * a.sp.feedingSpeed * Math.min(1, appetite(a)));
      // steer so the MOUTH arrives at the food: the body stops a head-length short along the approach line
      _b.subVectors(p.pos, a.rt.pos);
      const dc = _b.length();
      _c.copy(p.pos);
      if (dc > 1e-5) _c.addScaledVector(_b, -Math.min(dc, bodyHX(a) * 0.9) / dc);
      go(a, _c, a.tags.has('patient_feeder') ? rush * 0.8 : rush, L * 0.7);
      a.ctrl.urgency = 0.35 + a.sp.feedingAggression * 0.5;
      a.ctrl.sep = 0.35;
      a.ctrl.avoid = 0.3;
      if (d < L * 0.28 + size + 0.003) {
        eat(a, w, p, style);
        a.actPhase = 1;
        a.actTimer = w.time + rrange(a, 0.15, 0.55) * (tr.hoverTendency > 0.5 ? 1.5 : 1);
      }
      return true;
    }
  }
}

/** chunk 16 — a living anemone takes a piece that came within reach: its tentacles close round it and pass it in. */
function anemoneFeedTick(a: Agent, w: AIWorld, p: FoodParticle): boolean {
  a.ctrl.hasGoal = false;
  a.ctrl.speedBL = 0;
  crownPos(a, _a);
  if (_a.distanceTo(p.pos) - (p.size ?? 0.003) > crownR(a) * 1.25) return false;
  if (a.actTimer === 0) a.actTimer = w.time + rrange(a, 0.6, 1.4);
  else if (w.time > a.actTimer) {
    eat(a, w, p, 'pick');
    a.actTimer = w.time + rrange(a, 1.2, 2.5);
  }
  return true;
}

function huntTick(a: Agent, w: AIWorld): boolean {
  const p = findParticle(w, a.foodId);
  if (!p) return false;
  p.claimedBy = a.id;
  const L = a.L;
  const m = mouthPos(a, _a);
  const d = m.distanceTo(p.pos);
  const size = p.size ?? 0.003;
  const mantis = a.setId === 'mantis_shrimp';
  look(a, p.pos);
  a.ctrl.allowFloor = p.pos.y < floorAt(w.env, p.pos.x, p.pos.z) + L * 1.5;
  a.ctrl.avoid = 0.35;
  switch (a.actPhase) {
    case 0:
    case 1: {
      // stalk from a level stand-off beside the prey (so it ends up in front of the eyes, not under the chin)
      _b.subVectors(a.rt.pos, p.pos);
      _b.y = 0;
      if (_b.lengthSq() < 1e-8) _b.set(-a.fwd.x, 0, -a.fwd.z);
      if (_b.lengthSq() < 1e-8) _b.set(1, 0, 0);
      _b.normalize();
      _c.copy(p.pos).addScaledVector(_b, L * (mantis ? 0.6 : 1.15));
      if (!mantis) _c.y = p.pos.y + L * 0.15;
      if (a.loco !== 'crawl') fitInWater(a, w, _c);
      if (a.actPhase === 0) {
        // brisk while far, a slow deliberate creep for the last few body lengths
        go(a, _c, cruiseBL(a) * (d > L * 5 ? 1.6 : 0.6), L * 0.8);
        if (d < L * (mantis ? 0.9 : 1.6) + size) {
          a.actPhase = 1;
          a.actTimer = w.time + rrange(a, 0.4, 1.6);
          a.actCount = w.time;
        }
        return true;
      }
      // aim: settle into position, tiny corrections, body quivering — then strike
      go(a, _c, cruiseBL(a) * 0.35, L * 0.8);
      a.quiverUntil = w.time + 0.1;
      if (w.time > a.actTimer && (facing(a, p.pos, 0.7) || w.time - a.actCount > 3.5)) {
        a.actPhase = 2;
        a.actTimer = w.time + 0.45;
      }
      if (d > L * 2.8) a.actPhase = 0;
      return true;
    }
    case 2: {
      if (mantis) {
        // the smash: fastest strike in the animal kingdom
        a.appendage = 1;
        emit(w, 'smash', p.pos, a.id, 1);
        observe(a, w, 'smash');
        eat(a, w, p, 'rush');
        biteParticle(p, 1);
        a.actPhase = 3;
        a.actTimer = w.time + rrange(a, 1.5, 3);
        return true;
      }
      go(a, p.pos, burstBL(a) * 0.9, 0.001);
      a.ctrl.urgency = 1;
      a.mouthPulse = Math.max(a.mouthPulse, 0.7);
      if (d < L * 0.3 + size) {
        emit(w, 'bite', p.pos, a.id, 0.8);
        eat(a, w, p, 'rush');
        if (a.setId === 'pea_puffer') observe(a, w, 'hunt');
        a.actPhase = 3;
        a.actTimer = w.time + rrange(a, 0.8, 1.6);
      } else if (w.time > a.actTimer) a.actPhase = 0;
      return true;
    }
    default: {
      // crunching the prey
      if (a.loco !== 'crawl') {
        a.ctrl.goal.copy(a.rt.pos);
        a.ctrl.hasGoal = true;
        a.ctrl.speedBL = 0.1;
      } else a.ctrl.hasGoal = false;
      if (rnd(a) < 0.2 * stepRate.k) a.mouthPulse = Math.max(a.mouthPulse, 0.6);
      if (w.time > a.actTimer) {
        if (p.amount > 0 && !p.fade) a.actPhase = 0;
        else return false;
      }
      return true;
    }
  }
}

/** Is this particle live prey for a hunting-style animal? */
export function isLivePrey(a: Agent, p: FoodParticle): boolean {
  if (!LIVE(p)) return false;
  if (a.setId === 'pea_puffer' || a.setId === 'lionfish' || a.setId === 'grouper') return true;
  if (a.setId === 'mantis_shrimp') return p.shape === 'snail' || p.shape === 'chunk';
  return false;
}

/** Validate a particle is still within the water (used by tests). */
export function particleInWater(w: AIWorld, p: FoodParticle): boolean {
  const e = w.env;
  return p.pos.x >= e.minX && p.pos.x <= e.maxX && p.pos.z >= e.minZ && p.pos.z <= e.maxZ && p.pos.y >= floorAt(e, p.pos.x, p.pos.z) - 1e-6 && p.pos.y <= e.surfaceY + 1e-6;
}

export { clamp01, rchance, colliderSdf };
