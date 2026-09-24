/**
 * Locomotion: turns the activity's Control (goal / speed / look / attach) into motion.
 *  - swim: vehicle model (heading turns at a species turn rate; forward thrust; hover-capable fish can drift sideways)
 *  - upright: seahorse — heading stays horizontal, motion mostly by fin drift
 *  - crawl / walk: surface-following on floor / glass / decor (orientation follows the surface normal)
 * Obstacle avoidance anticipates glass, substrate, surface and decor; hard constraints then guarantee that no body
 * point penetrates glass, hard decor or the substrate. Zero allocations per frame. OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import { colliderExitXZ, colliderNormal, colliderNormalGrounded, colliderSdf, colliderSdfGrounded, colliderSdfXZ, floorAt, freeExit, freeExitXZ, makeHit, nearestSurface, surfaceById, surfaceId, SURF_DECOR, SURF_FLOOR, SURF_GLASS, type Collider, type TankEnv } from './env';
import { V, approach, clamp, damp, isFiniteVec, noise3, rotateToward, safeNormalize, smoothstep, transport } from './math';
import { neighbors } from './nav';

const UP = new THREE.Vector3(0, 1, 0);
const X1 = new THREE.Vector3(1, 0, 0);
const _desV = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _face = new THREE.Vector3();
const _n = new THREE.Vector3();
const _p = new THREE.Vector3();
const _old = new THREE.Vector3();
const _sep = new THREE.Vector3();
const _prevFwd = new THREE.Vector3();
const _prePush = new THREE.Vector3();
const _swingA = new THREE.Vector3();
const _swingB = new THREE.Vector3();
const _goal = new THREE.Vector3();
const _intent = new THREE.Vector3();
const _gn = new THREE.Vector3();
const _curHit = makeHit();
const _altHit = makeHit();
/**
 * Current locomotion step (for rate-limited push-outs inside the constraint passes). lane:pc-perf — per-step contact
 * damping is written `f ** (_dt * 60)`: identical at 60 Hz, and the same per second at 144 Hz or 30 Hz.
 */
let _dt = 1 / 60;
/** Max speed (m/s) at which a body deep inside decor (e.g. a rock just placed on top of it) is eased out. */
const EASE_OUT_SPEED = 0.3;

export function locomote(a: Agent, w: AIWorld, dt: number): void {
  if (a.loco === 'sessile') {
    a.speed = 0;
    a.drift.set(0, 0, 0);
    a.rt.vel.set(0, 0, 0);
    return;
  }
  _old.copy(a.rt.pos);
  _dt = dt;
  keepAnchorExemption(a, w.env);
  if (a.loco === 'crawl' || a.loco === 'walk') stepCrawl(a, w, dt);
  else stepSwim(a, w, dt);
  if (!isFiniteVec(a.rt.pos) || !isFiniteVec(a.fwd)) recover(a, w);
  a.rt.vel.subVectors(a.rt.pos, _old).multiplyScalar(1 / Math.max(dt, 1e-4));
  if (!isFiniteVec(a.rt.vel)) a.rt.vel.set(0, 0, 0);
}

/**
 * An animal leaving the decor it used as an anchor (hiding in a cave, resting on a leaf, hitched to a post) keeps it
 * exempt until its body is clear, so it swims back out the way it came instead of being shoved through a wall.
 */
function keepAnchorExemption(a: Agent, env: TankEnv): void {
  const ctrl = a.ctrl;
  const id = a.leavingDecor;
  // (moving straight on to another anchor — a seahorse trading a hitching post for a clump of algae — the one it is
  // still touching stays exempt until it is clear; the new one becomes exempt after that. Switching at once left its
  // snout a centimetre inside the post.)
  if (ctrl.ignoreDecor && (!id || ctrl.ignoreDecor === id || !touchingDecor(a, env, id))) {
    a.leavingDecor = ctrl.ignoreDecor;
    return;
  }
  if (!id) return;
  if (touchingDecor(a, env, id)) {
    ctrl.ignoreDecor = id;
    return;
  }
  a.leavingDecor = null;
}

function touchingDecor(a: Agent, env: TankEnv, id: string): boolean {
  const pos = a.rt.pos;
  // (an upright body's snout sticks out ahead of it: see guardSnout)
  const pad = Math.max(a.set.body.hy, a.set.body.hz, a.loco === 'upright' ? 0.45 : 0) * a.L;
  for (const c of env.colliders) {
    if (c.decorId !== id || !c.hard) continue;
    if (colliderSdf(c, pos.x, pos.y, pos.z) < pad) return true;
  }
  return false;
}

function recover(a: Agent, w: AIWorld) {
  const env = w.env;
  a.rt.pos.set(0, (floorAt(env, 0, 0) + env.surfaceY) / 2 + 0.01, 0);
  a.fwd.set(1, 0, 0);
  a.up.set(0, 1, 0);
  a.upVis.set(0, 1, 0);
  a.surfN.set(0, 1, 0);
  a.speed = 0;
  a.drift.set(0, 0, 0);
}

// ───────────────────────────── separation ─────────────────────────────

function separation(a: Agent, w: AIWorld, out: THREE.Vector3): THREE.Vector3 {
  out.set(0, 0, 0);
  const pos = a.rt.pos;
  const r = a.L * 1.6 + 0.01;
  const n = neighbors(w, pos, r + 0.06, a);
  for (let k = 0; k < n; k++) {
    const o = w.agents[w.nbuf[k]];
    // fish ignore crawling inverts and vice versa (they share space at different heights)
    if (a.set.ignoreFish !== o.set.ignoreFish && (a.loco === 'crawl' || o.loco === 'crawl')) continue;
    const rr = (a.L + o.L) * 0.55 + 0.004;
    _tmp.subVectors(pos, o.rt.pos);
    const d = _tmp.length();
    if (d >= rr || d < 1e-6) continue;
    const s = (rr - d) / rr;
    out.addScaledVector(_tmp, (s * s) / d);
  }
  return out;
}

/**
 * Bodies of similar size don't sink into each other: two fish inspecting the same stone, two axolotls resting side by
 * side. Each eases half the overlap per frame (bounded), horizontally for walkers; the constraints that follow keep
 * glass and decor. Steering separation alone loses to a strong goal. Tiny animals (fry, shrimp) are ignored.
 */
function bodySpacing(a: Agent, w: AIWorld, flat: boolean): void {
  // animals holding on (hitched seahorses — often tail-to-tail — perched, attached) aren't shoved
  // nor are bottom crawlers: plecos and shrimp happily pile into the same cave
  if (a.dead || a.loco === 'upright' || a.loco === 'crawl' || a.ctrl.attach > 0.5) return;
  const pos = a.rt.pos;
  const n = neighbors(w, pos, a.L * 0.9 + 0.02, a);
  for (let k = 0; k < n; k++) {
    const o = w.agents[w.nbuf[k]];
    if (o.dead || o.set.ignoreFish !== a.set.ignoreFish || o.L < a.L * 0.35 || a.L < o.L * 0.35) continue;
    if (o.loco === 'sessile' || o.loco === 'crawl') continue;
    const dmin = 0.32 * (a.L + o.L);
    _tmp.subVectors(pos, o.rt.pos);
    if (flat) _tmp.y = 0;
    const d = _tmp.length();
    if (d >= dmin) continue;
    if (d < 1e-6) _tmp.set(a.noiseOff % 2 < 1 ? 1 : -1, 0, 0);
    else _tmp.multiplyScalar(1 / d);
    // a rate, not a per-frame share: against an attached animal's pull toward its spot, a per-frame push would move
    // the balance point with every uneven frame and two neighbours resting side by side would tremble (≈ half the
    // overlap and L·0.03 + 2 mm per frame at 60 fps, as before)
    const push = Math.min((dmin - d) * (1 - Math.exp(-40 * _dt)), (a.L * 1.8 + 0.12) * _dt);
    if (flat) {
      // a walker is only nudged where that doesn't press it into decor (the constraints would push it straight back)
      const climbH = climbHeight(a);
      const before = walkerOverlap(a, env(w), climbH, pos.x, pos.z);
      if (walkerOverlap(a, env(w), climbH, pos.x + _tmp.x * push, pos.z + _tmp.z * push) > before + 1e-4) continue;
    }
    pos.addScaledVector(_tmp, push);
  }
}
const env = (w: AIWorld) => w.env;

// ───────────────────────────── avoidance (anticipatory) ─────────────────────────────

function addWall(out: THREE.Vector3, dA: number, dC: number, nx: number, ny: number, nz: number, cm: number, m: number, band: number): void {
  let s = 0;
  if (dA < m + band) s += Math.pow((m + band - dA) / band, 2);
  if (dC < cm + band * 0.6) s += 1.5 * Math.pow((cm + band * 0.6 - dC) / (band * 0.6), 2);
  if (s > 0) {
    s = Math.min(s, 6);
    out.x += nx * s;
    out.y += ny * s;
    out.z += nz * s;
  }
}

function avoidance(a: Agent, w: AIWorld, out: THREE.Vector3, strength: number): THREE.Vector3 {
  out.set(0, 0, 0);
  const env = w.env;
  const ctrl = a.ctrl;
  const pos = a.rt.pos;
  const L = a.L;
  const hx = a.set.body.hx * L;
  const side = Math.max(a.set.body.hy, a.set.body.hz) * L;
  const upright = a.loco === 'upright';
  const reach = upright ? hx : hx;
  const look = reach + clamp(a.avoidSpeed * 0.8, L * 0.3, L * 2.2);
  // the look-ahead probe points along a slowly smoothed heading (see stepSwim): probed along the heading itself, the
  // push swung with every small turn and fed straight back into the next one — a weave in front of the rock
  _p.copy(pos).addScaledVector(a.probeDir, look);
  const m = side + 0.006;
  const band = L * 0.7 + 0.01;
  // walls: ahead point + body centre
  const cmX = upright ? side + 0.004 : hx * 0.6 + 0.004;
  addWall(out, _p.x - env.minX, pos.x - env.minX, 1, 0, 0, cmX, m, band);
  addWall(out, env.maxX - _p.x, env.maxX - pos.x, -1, 0, 0, cmX, m, band);
  addWall(out, _p.z - env.minZ, pos.z - env.minZ, 0, 0, 1, cmX, m, band);
  addWall(out, env.maxZ - _p.z, env.maxZ - pos.z, 0, 0, -1, cmX, m, band);
  const vy = upright ? a.set.body.hy * L : side;
  if (!ctrl.allowFloor) addWall(out, _p.y - floorAt(env, _p.x, _p.z), pos.y - floorAt(env, pos.x, pos.z), 0, 1, 0, vy + 0.004, m, band);
  if (!ctrl.allowSurface) addWall(out, env.surfaceY - _p.y, env.surfaceY - pos.y, 0, -1, 0, vy * 0.6 + 0.004, m, band);
  // decor
  const cs = env.colliders;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c.decorId === ctrl.ignoreDecor) continue;
    if (!c.hard && (L < 0.035 || a.sp.anemoneRelationship === 'host_seeker')) continue;
    // cheap reject
    const dx = Math.abs(pos.x - c.cx) - c.hx;
    const dy = Math.abs(pos.y - c.cy) - c.hy;
    const dz = Math.abs(pos.z - c.cz) - c.hz;
    if (dx > look + m || dy > look + m || dz > look + m) continue;
    const dA = colliderSdf(c, _p.x, _p.y, _p.z);
    const dC = colliderSdf(c, pos.x, pos.y, pos.z);
    // lane:brackish — a big branchy tangle (soft hardscape: a mangrove spanning half the tank) is mostly open water between
    // limbs, something to swim through rather than around: its soft push weakens with size (small spider wood unchanged)
    const k = c.hard ? 1 : c.category === 'hardscape' ? 0.22 * clamp(0.12 / Math.max(0.02, Math.min(c.hx, c.hz)), 0.2, 1) : 0.22;
    if (dA < m + band) {
      colliderNormal(c, _p.x, _p.y, _p.z, _n);
      if (!c.hard) {
        // plants: weave around them sideways — never get shoved up into the surface film
        _n.y = Math.min(_n.y, 0) * 0.3;
        if (_n.lengthSq() < 1e-6) continue;
        _n.normalize();
      } else if (_n.y < 0) downOnlyIfRoom(env, c, _p, side, L, _n);
      let s = Math.min(4, Math.pow((m + band - dA) / band, 2)) * k;
      // lane:brackish — a branchy canopy (spider wood, mangrove prop roots) is weaved through: its soft push acts at the
      // edge only. From deep inside a big canopy the push would flip direction across its middle and shake the heading.
      if (!c.hard && c.category === 'hardscape' && dA < 0) s *= clamp(1 + dA / band, 0, 1);
      if (s <= 0) continue;
      out.addScaledVector(_n, s);
      // slide around rather than stall head-on — over or sideways, hardly ever down: sliding along a stone's face the
      // way the body already points, nose-down included, tipped a low-cruising cory further down each frame until it
      // hung at the pitch cap, where its heading wobbled against the stone. In proportion to how much the body already
      // points along the face (not a unit push): near head-on the along-face direction is noise, and a full push that
      // flipped side with every small turn weaved the fish left-right in front of the rock.
      _tmp2.copy(a.probeDir).addScaledVector(_n, -a.probeDir.dot(_n));
      if (_tmp2.y < 0) _tmp2.y *= 0.25;
      out.addScaledVector(_tmp2, s * 0.5);
    }
    if (c.hard && dC < m + band * 0.5) {
      colliderNormal(c, pos.x, pos.y, pos.z, _n);
      if (_n.y < 0) downOnlyIfRoom(env, c, pos, side, L, _n);
      out.addScaledVector(_n, Math.min(4, (m + band * 0.5 - dC) / (band * 0.5)) * 1.5 * k);
    }
  }
  return out.multiplyScalar(strength * ctrl.avoid);
}

/**
 * The underside of a ledge or a plant crown sitting on wood pushes a fish below it downwards — fine in open water, but
 * with the substrate just below that only pressed it nose-first into the sand (a foraging cory pinned under a crown).
 * The downward part fades out as the room below runs out; with none left it goes round sideways.
 */
function downOnlyIfRoom(env: TankEnv, c: Collider, p: THREE.Vector3, side: number, L: number, n: THREE.Vector3): void {
  const room = clamp((p.y - floorAt(env, p.x, p.z) - side) / Math.max(L, 0.01), 0, 1);
  if (room >= 1) return;
  n.y *= room;
  if (n.lengthSq() < 0.04) colliderExitXZ(c, p.x, p.z, n);
  else n.normalize();
}

// ───────────────────────────── swimming ─────────────────────────────

function stepSwim(a: Agent, w: AIWorld, dt: number): void {
  const env = w.env;
  const ctrl = a.ctrl;
  const pos = a.rt.pos;
  const L = a.L;
  const tr = a.sp.behaviorTraits;
  const upright = a.loco === 'upright';
  const rm = env.reducedMotion ? 0.75 : 1;
  const cruise = Math.max(0.05, tr.cruiseSpeed) * L;
  const burst = Math.max(tr.cruiseSpeed * 1.5, tr.burstSpeed) * L * rm;
  // calm swimming stays calm: full burst speed only when something is urgent (a startle, a strike, alarm)
  const maxSpd = ctrl.urgency > 0.05 ? burst : Math.min(burst, cruise * 2.4);
  _desV.set(0, 0, 0);
  // 1. goal seeking with arrival
  let dist = 0;
  if (ctrl.hasGoal) {
    _tmp.subVectors(ctrl.goal, pos);
    dist = _tmp.length();
    if (dist > 1e-5) {
      const spd = Math.min(ctrl.speedBL * L, maxSpd) * Math.min(1, dist / Math.max(1e-3, ctrl.arriveR));
      _desV.addScaledVector(_tmp, spd / dist);
    }
  }
  // 2. organic wander (smooth noise)
  if (ctrl.wander > 0) {
    const t = w.time * 0.16 + a.noiseOff;
    const mag = Math.max(_desV.length(), cruise * 0.5) * ctrl.wander * (env.reducedMotion ? 0.6 : 1);
    _desV.x += noise3(t, a.noiseOff, 0.5) * mag;
    _desV.y += noise3(a.noiseOff, t, 7.1) * mag * 0.45;
    _desV.z += noise3(3.3, a.noiseOff, t) * mag * 0.8;
  }
  // 3. personal space
  if (ctrl.sep > 0) {
    separation(a, w, _sep);
    // bounded: in a dense school the summed push would otherwise sprint fish at burst speed
    const sl = _sep.length();
    if (sl > 1) _sep.multiplyScalar(1 / sl);
    _desV.addScaledVector(_sep, cruise * 1.6 * ctrl.sep);
  }
  // 4. anticipatory obstacle avoidance
  // (avoidance scales with speed — a peak-held speed: rises at once with a burst, decays over ~0.3 s. The raw speed
  // dips at every brush with a stone, the avoidance weakened with it, the fish turned back into the stone and brushed
  // it again: a heading wobble along the rock face)
  a.avoidSpeed = Math.max(a.speed, a.avoidSpeed * Math.exp(-dt / 0.3));
  if (a.probeDir.lengthSq() < 0.5) a.probeDir.copy(a.fwd);
  a.probeDir.lerp(a.fwd, 1 - Math.exp(-dt / 0.25));
  safeNormalize(a.probeDir, a.fwd);
  let avStrength = (cruise * 1.2 + a.avoidSpeed * 1.4) * (ctrl.attach > 0 ? 0.2 : 1);
  // activities that deliberately work close to things (feeding, inspecting, hiding) fade avoidance near the goal —
  // the hard constraints below still guarantee no penetration
  if (ctrl.hasGoal && ctrl.avoid < 0.99) avStrength *= clamp(dist / (L * 2.5), 0.15, 1);
  avoidance(a, w, V[3], avStrength);
  // low-passed (≈0.08 s): the look-ahead probe moves with the heading, so raw avoidance feeds straight back into the
  // turn and rings at frame rate; hard constraints still guarantee no penetration
  a.avoidLP.lerp(V[3], 1 - Math.exp(-dt / 0.08));
  _desV.add(a.avoidLP);
  let desSpeed = _desV.length();
  if (desSpeed > maxSpd) {
    _desV.multiplyScalar(maxSpd / desSpeed);
    desSpeed = maxSpd;
  }
  // 5. choose facing
  const hoverCap = a.set.hover;
  const slowV = cruise * (0.35 + hoverCap * 0.5);
  // Facing is a blend, never a switch (a switch flips the heading back and forth whenever the desired speed hovers at
  // its threshold): hold the current heading, levelled, when there is nowhere in particular to go (near a goal the
  // direction to it is noise) → face the way it is going as it gets under way → face the look target when slow.
  _face.set(a.fwd.x, a.fwd.y * 0.2, a.fwd.z);
  safeNormalize(_face, a.fwd);
  const velW = smoothstep(cruise * 0.05, cruise * 0.35, desSpeed);
  if (velW > 0) {
    _face.multiplyScalar(1 - velW).addScaledVector(_desV, velW / desSpeed);
    safeNormalize(_face, a.fwd);
  }
  const lookW = !ctrl.hasLook ? 0 : upright || ctrl.attach > 0 ? 1 : 1 - smoothstep(slowV * 0.6, slowV * 1.4, desSpeed);
  if (lookW > 0) {
    _tmp.subVectors(ctrl.look, pos);
    // a hovering fish watches something below or above it by tilting a little, not by pointing its body at it
    if (!upright) _tmp.y *= 0.45;
    safeNormalize(_tmp, a.fwd);
    _face.multiplyScalar(1 - lookW).addScaledVector(_tmp, lookW);
    safeNormalize(_face, a.fwd);
  }
  // pitch limits (+ bias)
  if (upright) {
    _face.y = 0;
    safeNormalize(_face, a.fwd.y === 0 ? a.fwd : X1);
  } else {
    const maxP = ctrl.pitchCap > 0 ? ctrl.pitchCap : Math.min(a.set.maxPitch + Math.abs(ctrl.pitchBias) * 0.3, a.set.maxPitch > 1 ? 1.05 : 0.8); // lane:brackish: pitchCap
    let p = Math.asin(clamp(_face.y, -1, 1));
    p = clamp(p + ctrl.pitchBias, -maxP, maxP);
    // a mostly vertical aim has no reliable compass heading (its sideways part is noise): keep the current one —
    // fish rise and sink without spinning round
    const h = Math.hypot(_face.x, _face.z);
    const fh = Math.hypot(a.fwd.x, a.fwd.z);
    let hx = fh > 1e-4 ? a.fwd.x / fh : 1;
    let hz = fh > 1e-4 ? a.fwd.z / fh : 0;
    if (h > 1e-4) {
      const hw = smoothstep(0.12, 0.45, h);
      hx += (_face.x / h - hx) * hw;
      hz += (_face.z / h - hz) * hw;
    }
    let hh = Math.hypot(hx, hz);
    if (hh < 1e-3) {
      hx = fh > 1e-4 ? a.fwd.x : 1;
      hz = fh > 1e-4 ? a.fwd.z : 0;
      hh = Math.hypot(hx, hz);
    }
    const cp = Math.cos(p);
    _face.set((hx / hh) * cp, Math.sin(p), (hz / hh) * cp);
  }
  // 6. turn — toward a low-passed aim (≈0.1 s, quicker when urgent). The look-ahead avoidance feeds back on the
  // heading and "face the look target" vs "face the way I'm going" is a hard switch; aimed at directly, both flip the
  // heading frame to frame (a visible shiver). The hard constraints below still keep every body out of the decor.
  if (a.aim.lengthSq() < 0.5) a.aim.copy(a.fwd);
  a.aim.lerp(_face, 1 - Math.exp(-dt / (0.1 * (1 - 0.7 * clamp(ctrl.urgency, 0, 1)))));
  safeNormalize(a.aim, _face);
  const turnRate = Math.max(0.3, tr.turnRate) * (1 + ctrl.urgency * 0.9) * rm;
  // big fish turn slower when fast; hover fish can spin in place
  const turnScale = hoverCap > 0.5 ? 1 : 0.55 + 0.45 * smoothstep(0, cruise, a.speed + cruise * 0.3);
  _prevFwd.copy(a.fwd);
  // an upright body that has just swung its snout clear of a rock does not turn straight back into it (turn in, swing
  // out, turn in… read as a head-shake while a seahorse drifted to its holdfast past a stone)
  const held = upright && w.time < a.snoutHoldT && (a.fwd.z * a.aim.x - a.fwd.x * a.aim.z) * a.snoutHoldSign < 0;
  if (!held) {
    const maxTurn = turnRate * turnScale * dt;
    // an aim more than a right angle away (behind): turn round horizontally first. The shortest path to it runs over
    // the top, and the pitch cap below folded every such step back — the fish hung at the cap, nose up and twitching,
    // instead of turning round (a schooler rejoining its school)
    const hf = Math.hypot(a.fwd.x, a.fwd.z);
    const ha = Math.hypot(a.aim.x, a.aim.z);
    if (!upright && a.fwd.dot(a.aim) < 0 && hf > 0.05 && ha > 0.05) {
      const s = (a.fwd.z * a.aim.x - a.fwd.x * a.aim.z) / (hf * ha);
      const c = (a.fwd.x * a.aim.x + a.fwd.z * a.aim.z) / (hf * ha);
      a.fwd.applyAxisAngle(UP, clamp(Math.atan2(s, c), -maxTurn, maxTurn));
    } else rotateToward(a.fwd, a.aim, maxTurn, UP);
  }
  if (upright) {
    a.fwd.y = 0;
    safeNormalize(a.fwd, X1);
    guardSnout(a, env, dt, w.time);
  } else {
    // hard pitch cap: species limit, a little more for a deliberate bias, but no head-stands — a foraging cory or
    // goldfish tips ~35–45°, and only frogs (maxPitch > 1) may go steeper
    let capP = ctrl.pitchCap > 0 ? ctrl.pitchCap : Math.min(a.set.maxPitch + Math.abs(ctrl.pitchBias) * 0.3, a.set.maxPitch > 1 ? 1.05 : 0.8); // lane:brackish: pitchCap
    // lane:brackish — a body already steeper than the cap (an archerfish leaving its aim) levels off over a few frames
    // instead of snapping flat in one
    capP = Math.max(capP, Math.abs(Math.asin(clamp(_prevFwd.y, -1, 1))) - 3 * dt);
    const py = Math.asin(clamp(a.fwd.y, -1, 1));
    if (Math.abs(py) > capP) {
      const h = Math.hypot(a.fwd.x, a.fwd.z);
      const cp = Math.cos(capP);
      if (h > 1e-6) a.fwd.set((a.fwd.x / h) * cp, Math.sign(py) * Math.sin(capP), (a.fwd.z / h) * cp);
    }
  }
  // 7. thrust along heading
  const along = _desV.dot(a.fwd);
  const back = -hoverCap * 0.25 * cruise;
  // hover-capable fish back up only when the wish to go backwards is clear: where the desired direction lies across
  // the body (a schooler turning to rejoin, a clownfish holding in front of the glass) `along` hovers about zero and
  // the thrust flipped between forward and reverse every frame
  const targetFwd = along >= 0 || upright ? Math.max(0, along) : Math.max(back, along) * smoothstep(cruise * 0.1, cruise * 0.4, -along);
  const accel = (burst * (1.5 + ctrl.urgency * 3) + cruise * 1.5) * rm;
  a.speed = approach(a.speed, targetFwd, accel * dt);
  // 8. sideways / vertical drift (fin sculling). Non-hover fish still get a little vertical control.
  _tmp.copy(_desV).addScaledVector(a.fwd, -along);
  const latMax = cruise * (upright ? 1.2 : 0.12 + hoverCap * 0.8) + (upright ? tr.burstSpeed * L * 0.3 : 0);
  const lm = _tmp.length();
  if (lm > latMax) _tmp.multiplyScalar(latMax / lm);
  a.drift.x = damp(a.drift.x, _tmp.x, 3, dt);
  a.drift.y = damp(a.drift.y, _tmp.y, 3, dt);
  a.drift.z = damp(a.drift.z, _tmp.z, 3, dt);
  // 9. integrate
  if (ctrl.attach > 0 && ctrl.hasGoal) {
    const k = 1 - Math.exp(-ctrl.attach * 5 * dt);
    pos.lerp(ctrl.goal, k);
    a.speed = damp(a.speed, 0, 4, dt);
    a.drift.multiplyScalar(Math.exp(-4 * dt));
  } else {
    pos.addScaledVector(a.fwd, a.speed * dt).addScaledVector(a.drift, dt);
    // gentle water movement moves small/slow animals a little
    if (env.flow > 0.05) {
      const t = w.time * 0.07;
      const amp = env.flow * 0.006 * (1 / (1 + L * 20));
      pos.x += noise3(t, pos.y * 4, 11) * amp * dt;
      pos.z += noise3(pos.x * 4, t, 23) * amp * 0.5 * dt;
    }
  }
  a.grounded = ctrl.allowFloor && pos.y - floorAt(env, pos.x, pos.z) < a.set.body.hy * L + 0.004;
  bodySpacing(a, w, false);
  _intent.copy(pos);
  constrainBody(a, w);
  // pinned: a fish swimming at its goal through decor it cannot pass (nosing under a plant crown, a rock between it
  // and the spot) makes no headway — the constraints hand back nearly every step, and it sits there shivering by a
  // fraction of a millimetre. After a moment the brain gives that goal up (brain: blockedT), as it does for walkers.
  if (ctrl.hasGoal && !(ctrl.attach > 0) && !upright) {
    const want = a.speed * dt;
    const handedBack = (_intent.x - pos.x) * a.fwd.x + (_intent.y - pos.y) * a.fwd.y + (_intent.z - pos.z) * a.fwd.z;
    if (want > cruise * 0.3 * dt && handedBack > want * 0.6 && dist > ctrl.arriveR) a.blockedT += dt;
    else a.blockedT = Math.max(0, a.blockedT - dt);
  }
}

/** How deep an upright body's snout (ahead along `fwd`) or back (behind it) is inside hard decor. */
function snoutPenetration(a: Agent, env: TankEnv, fwd: THREE.Vector3): number {
  const pos = a.rt.pos;
  const r = 0.002;
  let worst = 0;
  for (let e = 0; e < 2; e++) {
    const k = a.L * (e === 0 ? 0.42 : -0.4);
    const px = pos.x + fwd.x * k;
    const py = pos.y;
    const pz = pos.z + fwd.z * k;
    for (const c of env.colliders) {
      if (!c.hard || c.decorId === a.ctrl.ignoreDecor) continue;
      if (Math.abs(px - c.cx) > c.hx + r || Math.abs(py - c.cy) > c.hy + r || Math.abs(pz - c.cz) > c.hz + r) continue;
      const pen = r - colliderSdf(c, px, py, pz);
      if (pen > worst) worst = pen;
    }
  }
  return worst;
}

/**
 * A seahorse's snout and back stick out ahead of and behind its upright body (the body samples do not cover them).
 * Hitched beside a rock and looking about, it must not swing them into the rock: a turn that would is not made, and
 * one already inside turns away a little each frame.
 */
function guardSnout(a: Agent, env: TankEnv, dt: number, time: number): void {
  const now = snoutPenetration(a, env, a.fwd);
  if (now < 1e-4) return;
  const prev = snoutPenetration(a, env, _prevFwd);
  if (prev < now) {
    a.fwd.copy(_prevFwd);
    if (prev < 1e-4) return;
  }
  const cur = Math.min(prev, now);
  const ang = Math.min(0.15, 2.5 * dt);
  _swingA.copy(a.fwd).applyAxisAngle(UP, ang);
  _swingB.copy(a.fwd).applyAxisAngle(UP, -ang);
  const pa = snoutPenetration(a, env, _swingA);
  const pb = snoutPenetration(a, env, _swingB);
  if (Math.min(pa, pb) < cur) {
    a.fwd.copy(pa <= pb ? _swingA : _swingB);
    a.snoutHoldT = time + 0.4;
    a.snoutHoldSign = pa <= pb ? 1 : -1;
  }
}

// ───────────────────────────── hard constraints ─────────────────────────────

/** Push the body out of glass / substrate / surface / hard decor. Samples centre, nose and tail (or top/bottom). */
export function constrainBody(a: Agent, w: AIWorld): void {
  const env = w.env;
  const ctrl = a.ctrl;
  const pos = a.rt.pos;
  const L = a.L;
  const b = a.set.body;
  const upright = a.loco === 'upright';
  const side = Math.max(b.hy, b.hz) * L;
  // a body caught inside decor (a rock just placed on top of it) glides out toward open water at a bounded speed —
  // one push per collider per frame; the sampled constraints below skip that collider meanwhile
  const deep = easeOutOfDecor(a, env, pos, side, false, 0);
  _prePush.copy(pos);
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    const ns = upright ? 3 : 5;
    for (let s = 0; s < ns; s++) {
      // sample offsets: centre, nose, tail (+ mid-body points for long bodies)
      let ox = 0;
      let oy = 0;
      let oz = 0;
      let r = side;
      if (s >= 3) {
        const k = (s === 3 ? 0.26 : -0.24) * b.hx * L * 2;
        ox = a.fwd.x * k;
        oy = a.fwd.y * k;
        oz = a.fwd.z * k;
        r = side * 0.8;
      } else if (s === 1) {
        if (upright) {
          oy = b.hy * L * 0.9;
          r = b.hz * L * 1.5;
        } else {
          ox = a.fwd.x * b.hx * L;
          oy = a.fwd.y * b.hx * L;
          oz = a.fwd.z * b.hx * L;
          r = side * 0.45;
        }
      } else if (s === 2) {
        if (upright) {
          oy = -b.hy * L * 0.9;
          r = b.hz * L * 1.5;
        } else {
          ox = -a.fwd.x * b.hx * L * 0.92;
          oy = -a.fwd.y * b.hx * L * 0.92;
          oz = -a.fwd.z * b.hx * L * 0.92;
          r = side * 0.4;
        }
      } else if (upright) {
        r = Math.max(b.hx, b.hz) * L;
      }
      const px = pos.x + ox;
      const py = pos.y + oy;
      const pz = pos.z + oz;
      // glass
      if (px < env.minX + r) {
        pos.x += env.minX + r - px;
        moved = true;
      } else if (px > env.maxX - r) {
        pos.x -= px - (env.maxX - r);
        moved = true;
      }
      if (pz < env.minZ + r) {
        pos.z += env.minZ + r - pz;
        moved = true;
      } else if (pz > env.maxZ - r) {
        pos.z -= pz - (env.maxZ - r);
        moved = true;
      }
      // substrate & surface
      const rf = (ctrl.allowFloor ? r * 0.85 : r + 0.001) - ctrl.burrow * L * 1.1;
      const fy = floorAt(env, px, pz);
      if (py < fy + rf) {
        pos.y += fy + rf - py;
        moved = true;
      }
      // lane:brackish — ctrl.noseAbove lets the nose sample (s = 1) poke that far through the surface (an aiming archerfish)
      const rs = (ctrl.allowSurface ? Math.min(r * 0.3, 0.002) : r * 0.6 + 0.002) - (s === 1 && !upright ? ctrl.noseAbove : 0);
      if (py > env.surfaceY - rs) {
        pos.y -= py - (env.surfaceY - rs);
        moved = true;
      }
      // hard decor
      const cs = env.colliders;
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i];
        if (!c.hard || c.decorId === ctrl.ignoreDecor || (deep & (1 << Math.min(i, 30))) !== 0) continue;
        const qx = pos.x + ox;
        const qy = pos.y + oy;
        const qz = pos.z + oz;
        if (Math.abs(qx - c.cx) > c.hx + r || Math.abs(qy - c.cy) > c.hy + r || Math.abs(qz - c.cz) > c.hz + r) continue;
        // decor standing on the substrate has no way out underneath: never push down into the floor (the floor would
        // push straight back and the body would stay wedged) — slide out sideways or over the top instead
        const d = colliderSdfGrounded(c, qx, qy, qz);
        if (d < r) {
          colliderNormalGrounded(c, qx, qy, qz, _n);
          pos.addScaledVector(_n, r - d);
          moved = true;
          // lose speed into the obstacle
          const into = a.fwd.dot(_n);
          // (in proportion to how squarely it hits, per second rather than per frame: ≈ ×0.9 per 60 fps frame head-on)
          if (into < 0) a.speed *= Math.exp(6 * into * _dt);
        }
      }
    }
    if (!moved) break;
  }
  // Push-outs move a body by at most about half its width per frame: a rock dropped onto a swimming animal eases it
  // out over a few frames instead of popping it several centimetres at once (the glass, floor and surface still hold).
  // (at least a fifth of a body length, so ordinary contact — a slim loach's tail swinging onto a stone — still clears)
  const cap = Math.max(side * 0.5 + EASE_OUT_SPEED * _dt, L * 0.2);
  _tmp.subVectors(pos, _prePush);
  const moved = _tmp.length();
  if (moved > cap) {
    pos.copy(_prePush).addScaledVector(_tmp, cap / moved);
    const rc = upright ? Math.max(b.hx, b.hz) * L : side;
    pos.x = clamp(pos.x, env.minX + rc, env.maxX - rc);
    pos.z = clamp(pos.z, env.minZ + rc, env.maxZ - rc);
    pos.y = clamp(pos.y, floorAt(env, pos.x, pos.z) + (ctrl.allowFloor ? rc * 0.85 : rc), env.surfaceY - (ctrl.allowSurface ? 0.002 : rc * 0.6));
  }
  // If the tank is too narrow for the body across z (big animal, slim tank), steer the heading parallel to the glass.
  if (!upright) {
    const span = (env.maxZ - env.minZ) - 2 * side * 0.45;
    const need = Math.abs(a.fwd.z) * b.hx * L * 1.92;
    if (need > span && span > 0) {
      a.fwd.z *= Math.pow(0.85, _dt * 60);
      safeNormalize(a.fwd, X1);
    }
  }
}

// ───────────────────────────── crawling / walking ─────────────────────────────

function stepCrawl(a: Agent, w: AIWorld, dt: number): void {
  const env = w.env;
  const ctrl = a.ctrl;
  const pos = a.rt.pos;
  const L = a.L;
  const tr = a.sp.behaviorTraits;
  const mask = a.loco === 'walk' ? SURF_FLOOR : a.set.crawlMask || SURF_FLOOR;
  // take last frame's step-up lift off before re-projecting onto the substrate: projecting it away along a sloped
  // floor's normal would slide the body sideways every frame (and decor would push it back — a vibration)
  pos.y -= a.liftApplied;
  a.liftApplied = 0;
  const standoff = a.set.body.hy * L * (1 - ctrl.burrow * 0.9);
  const side = a.set.body.hz * L;
  const n = a.surfN;
  // floor walkers (axolotl) step over decor lower than about their own body height and walk around the rest
  const walker = !(mask & SURF_DECOR);
  const climbH = walker ? climbHeight(a) : 0;
  const goal = ctrl.hasGoal ? crawlGoal(a, env, mask, standoff, side, _goal) : ctrl.goal;
  // desired tangent direction
  _face.copy(a.fwd);
  let spd = 0;
  if (ctrl.hasGoal) {
    _tmp.subVectors(goal, pos);
    const dist = _tmp.length();
    _tmp.addScaledVector(n, -_tmp.dot(n));
    if (_tmp.lengthSq() > 1e-10 && dist > 1e-4) {
      _face.copy(_tmp).normalize();
      spd = ctrl.speedBL * L * Math.min(1, dist / Math.max(1e-3, ctrl.arriveR));
    }
  } else if (ctrl.speedBL > 0) {
    spd = ctrl.speedBL * L;
  }
  // standing still with something to watch: turn to face it (along the surface it stands on)
  if (ctrl.faceLook && ctrl.hasLook && spd === 0) {
    _tmp.subVectors(ctrl.look, pos);
    _tmp.addScaledVector(n, -_tmp.dot(n));
    if (_tmp.lengthSq() > 1e-8) _face.copy(_tmp).normalize();
  }
  if (ctrl.wander > 0) {
    const ang = noise3(w.time * 0.2 + a.noiseOff, a.noiseOff, 3.7) * ctrl.wander * 1.4;
    _tmp.copy(_face).applyAxisAngle(n, ang);
    _face.copy(_tmp);
  }
  // floor walkers that mean to go somewhere pick a free heading with a small local planner (walkerPlan) instead of
  // the reactive steering below
  const planner = a.loco === 'walk' && spd > 1e-4 && !(ctrl.attach > 0);
  // obstacle anticipation for surfaces we may NOT crawl on
  _p.copy(pos).addScaledVector(a.fwd, a.set.body.hx * L + L * 0.4);
  const m = side + 0.004;
  _tmp.set(0, 0, 0);
  // (ramped, not switched: the probe swings with the heading, and an on/off push flipped the heading every frame
  // whenever the probe sat on the threshold — a shrimp grazing along the glass)
  const band = L * 0.4 + 0.002;
  if (!(mask & SURF_GLASS)) {
    _tmp.x += ramp(env.minX + m - _p.x, band) - ramp(_p.x - (env.maxX - m), band);
    _tmp.z += ramp(env.minZ + m - _p.z, band) - ramp(_p.z - (env.maxZ - m), band);
  }
  // stay below the waterline
  _tmp.y -= 1.5 * ramp(_p.y - (env.surfaceY - L * 0.8), band);
  if (walker && !planner) {
    for (const c of env.colliders) {
      if (!c.hard || c.decorId === ctrl.ignoreDecor || c.rise <= climbH) continue;
      if (Math.abs(_p.y - c.cy) > c.hy + side + L * 0.3) continue;
      const d = colliderSdfXZ(c, _p.x, _p.z);
      const band = m + L * 0.3;
      if (d < band) {
        colliderExitXZ(c, _p.x, _p.z, _n);
        const s = 1.2 * clamp((band - d) / band, 0.35, 1.6);
        _tmp.addScaledVector(_n, s);
        // slide around the obstacle instead of stalling head-on (pick a consistent side when dead ahead)
        _tmp2.copy(a.fwd).addScaledVector(_n, -a.fwd.dot(_n));
        _tmp2.y = 0;
        if (_tmp2.lengthSq() < 0.04) _tmp2.set(-_n.z, 0, _n.x).multiplyScalar(a.noiseOff % 2 < 1 ? 1 : -1);
        _tmp.addScaledVector(_tmp2.normalize(), s * 0.8);
      }
    }
  }
  // crawler personal space (shrimp crowding food is fine; they just jostle)
  if (ctrl.sep > 0) {
    separation(a, w, _sep);
    _tmp.addScaledVector(_sep, 0.6 * ctrl.sep);
  }
  // (steering only while it means to walk: a resting animal does not turn away from the stone it lies beside. Gated
  // on the intended speed — the actual one drops to 0 on a blocked step, which would toggle the steering each frame)
  if (_tmp.lengthSq() > 0 && spd > 1e-4) {
    _tmp.addScaledVector(n, -_tmp.dot(n));
    _face.addScaledVector(_tmp, 1.2);
    _face.addScaledVector(n, -_face.dot(n));
    safeNormalize(_face, a.fwd);
  }
  const rm = env.reducedMotion ? 0.8 : 1;
  if (planner) {
    const reach = ctrl.hasGoal ? Math.hypot(ctrl.goal.x - pos.x, ctrl.goal.z - pos.z) : Infinity;
    if (!walkerPlan(a, env, climbH, n, _face, dt, reach)) _face.copy(a.fwd);
  } else a.hasWalkDir = false;
  // squeezed where the body does not fit: hold the heading while it shuffles out (resolveWedge)
  if (walker && a.stuckT > 0.05) _face.copy(a.fwd);
  _prevFwd.copy(a.fwd);
  // turn toward a low-passed aim (≈0.12 s): the look-ahead obstacle probe swings with the heading, so aiming straight
  // at it turns the body away and back again every frame
  if (a.aim.lengthSq() < 0.5) a.aim.copy(a.fwd);
  a.aim.lerp(_face, 1 - Math.exp(-dt / (0.12 * (1 - 0.7 * clamp(ctrl.urgency, 0, 1)))));
  a.aim.addScaledVector(n, -a.aim.dot(n));
  safeNormalize(a.aim, _face);
  rotateToward(a.fwd, a.aim, Math.max(0.4, tr.turnRate) * (1 + ctrl.urgency) * dt * rm, n);
  if (walker) {
    // a turn that would swing nose or tail into a stone or the glass is not made (decided before moving, so the
    // step and every constraint below see one consistent heading — turning then un-turning each frame jitters)
    const hx = a.set.body.hx * L;
    const r = Math.max(a.set.body.hz, a.set.body.hy) * L * 0.45;
    const pNew = endPenetration(a, env, climbH, a.fwd, hx, r);
    if (pNew > 1e-4 && pNew > endPenetration(a, env, climbH, _prevFwd, hx, r) + 1e-5) a.fwd.copy(_prevFwd);
  }
  const maxSpd = Math.max(tr.cruiseSpeed * 1.5, tr.burstSpeed) * L;
  a.speed = approach(a.speed, Math.min(spd, maxSpd), (maxSpd * 2 + 0.01) * dt);
  if (ctrl.attach > 0 && ctrl.hasGoal) {
    pos.lerp(goal, 1 - Math.exp(-ctrl.attach * 5 * dt));
    a.speed = damp(a.speed, 0, 5, dt);
  } else if (walker && a.speed > 1e-6 && (planner && !a.hasWalkDir || walkerStepBlocked(a, env, climbH, a.speed * dt, a.fwd.x, a.fwd.z))) {
    // A step the constraints would shove straight back (nose into a stone, body into a gap it does not fit) is not
    // taken — step-and-shove every frame reads as a vibration. The walker stops (turning toward the free heading its
    // planner chose); with no free heading at all the brain re-plans after a moment.
    a.speed = 0;
    // (only counts as stuck while still properly on its way — pressing gently at the goal itself is fine)
    if (spd > ctrl.speedBL * L * 0.5) a.blockedT += dt;
  } else {
    pos.addScaledVector(a.fwd, a.speed * dt);
    if (a.speed > 1e-6) a.blockedT = Math.max(0, a.blockedT - dt);
  }
  // re-project onto the nearest allowed surface — but keep to the one it is on unless another is clearly nearer or it
  // walks onto it. In a corner (floor and rock face, rock and glass) both are about equally near: taking whichever
  // won each frame turned the body between the two every frame.
  const ign = ctrl.ignoreDecor ?? undefined;
  let hit = nearestSurface(env, pos, mask, a.hit, ign);
  if (hit.kind !== 'none' && Number.isFinite(hit.d)) {
    let id = surfaceId(hit);
    if (a.surfId !== -1 && surfaceById(env, pos, a.surfId, mask, _curHit, ign)) {
      // walking into another kind of surface within reach — from the sand onto a rock face or the glass, down a rock
      // onto the sand — steps onto it even while it is not the nearest (a broad snail on the sand is held off the glass
      // by its half-width, so the glass never came nearer than the sand beneath it); never straight back onto the
      // surface it has just left
      const other = nearestSurface(env, pos, mask & ~surfaceKind(a.surfId), _altHit, ign);
      const otherId = other.kind === 'none' ? -1 : surfaceId(other);
      const onto =
        otherId !== -1 && a.fwd.dot(other.n) < -0.3 && other.d < Math.max(standoff, side) * 1.25 && !(otherId === a.surfPrev && w.time - a.surfT < 0.5);
      if (onto) {
        hit = other;
        id = otherId;
      } else if (id !== a.surfId && _curHit.d < hit.d + Math.max(0.0015, standoff * 0.35)) {
        // otherwise keep to the surface it is on unless another is clearly nearer
        hit = _curHit;
        id = a.surfId;
      }
    }
    if (id !== a.surfId) {
      a.surfPrev = a.surfId;
      a.surfId = id;
      a.surfT = w.time;
    }
    if (hit.n.dot(n) < 0.9995) {
      transport(a.fwd, n, hit.n);
      n.copy(hit.n);
    }
    // just onto a new surface, the body settles against it over a few frames rather than snapping across the gap
    let settle = standoff - hit.d;
    if (settle < 0 && w.time - a.surfT < 0.5) settle = Math.max(settle, -(0.03 + a.speed) * dt);
    pos.addScaledVector(hit.n, settle);
  }
  a.fwd.addScaledVector(n, -a.fwd.dot(n));
  if (a.fwd.lengthSq() < 1e-8) {
    // pick any tangent
    _tmp.set(1, 0, 0).addScaledVector(n, -n.x);
    if (_tmp.lengthSq() < 1e-6) _tmp.set(0, 0, 1).addScaledVector(n, -n.z);
    a.fwd.copy(_tmp);
  }
  a.fwd.normalize();
  // glass/bounds clamp (respect standoff on the wall we are on)
  const rx = Math.abs(n.x) > 0.7 ? standoff * 0.98 : side;
  const rz = Math.abs(n.z) > 0.7 ? standoff * 0.98 : side;
  pos.x = clamp(pos.x, env.minX + rx, env.maxX - rx);
  pos.z = clamp(pos.z, env.minZ + rz, env.maxZ - rz);
  pos.y = clamp(pos.y, floorAt(env, pos.x, pos.z) + (n.y > 0.7 ? standoff * 0.98 : side * (1 - ctrl.burrow)), env.surfaceY - side);
  if (a.loco === 'walk') bodySpacing(a, w, true);
  // hard decor we cannot crawl on: walk around it (pushes are horizontal — walkers never get lifted into the water)
  let deep = 0;
  _prePush.copy(pos);
  if (walker) {
    deep = easeOutOfDecor(a, env, pos, side, true, climbH);
    for (let i = 0; i < env.colliders.length; i++) {
      const c = env.colliders[i];
      if (!c.hard || c.decorId === ctrl.ignoreDecor || c.rise <= climbH || (deep & (1 << Math.min(i, 30))) !== 0) continue;
      if (pos.y + side < c.cy - c.hy || pos.y - side > c.top) continue;
      const d = colliderSdfXZ(c, pos.x, pos.z);
      if (d < side) {
        colliderExitXZ(c, pos.x, pos.z, _n).multiplyScalar(side - d);
        // never past the glass: the glass would push straight back and the two would fight every frame (the animal
        // vibrates in place). A body squeezed into such a gap walks out instead (resolveWedge).
        clipPushToGlass(env, pos, side, _n);
        pos.x += _n.x;
        pos.z += _n.z;
        a.speed *= Math.pow(0.8, _dt * 60);
      }
    }
  }
  constrainCrawlBody(a, w, mask, _prevFwd, deep);
  if (walker) {
    // decor pushes move the body by at most a fraction of its width per frame: a walker never pops through a rock
    const dx = pos.x - _prePush.x;
    const dz = pos.z - _prePush.z;
    const dl = Math.hypot(dx, dz);
    const cap = side + EASE_OUT_SPEED * dt;
    if (dl > cap) {
      pos.x = _prePush.x + (dx / dl) * cap;
      pos.z = _prePush.z + (dz / dl) * cap;
    }
    // step up onto low decor under the body (smoothed so the walker climbs rather than pops)
    const target = stepHeight(env, a, climbH, side);
    a.stepLift += (target - a.stepLift) * (1 - Math.exp(-(target > a.stepLift ? 12 : 7) * dt));
    if (a.stepLift > 1e-5) {
      const y0 = pos.y;
      pos.y = Math.min(pos.y + a.stepLift, env.surfaceY - side);
      a.liftApplied = pos.y - y0;
    }
    // squeezed into a gap the body does not fit (decor right against the glass): walk out of it
    resolveWedge(a, env, climbH, dt);
  }
  // visual up follows the surface smoothly
  const k = 1 - Math.exp(-9 * dt);
  a.upVis.lerp(n, k);
  safeNormalize(a.upVis, UP);
  a.grounded = true;
}

/** The surface-mask bit of a surface id (see env surfaceId). */
const surfaceKind = (id: number) => (id === -2 ? SURF_FLOOR : id <= -3 ? SURF_GLASS : id >= 0 ? SURF_DECOR : 0);

/** 0 → 1 as `over` goes from −band/2 to +band/2 (a soft threshold). */
const ramp = (over: number, band: number) => clamp(0.5 + over / band, 0, 1);

/**
 * Where a crawler that climbs decor actually heads for: its goal, moved out onto the surface of any hard decor the goal
 * lies inside (a cave or station anchor, a spot on a rock that sits a little inside it) and off glass it cannot climb.
 * Aiming inside the decor, it would press into the corner between that decor and the floor and never arrive.
 */
function crawlGoal(a: Agent, env: TankEnv, mask: number, standoff: number, side: number, out: THREE.Vector3): THREE.Vector3 {
  out.copy(a.ctrl.goal);
  if (!(mask & SURF_DECOR)) return out;
  if (!(mask & SURF_GLASS)) {
    out.x = clamp(out.x, env.minX + side, env.maxX - side);
    out.z = clamp(out.z, env.minZ + side, env.maxZ - side);
  }
  const ign = a.ctrl.ignoreDecor;
  const cs = env.colliders;
  for (let iter = 0; iter < 2; iter++) {
    let moved = false;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!c.hard || c.decorId === ign) continue;
      if (Math.abs(out.x - c.cx) > c.hx + standoff || Math.abs(out.y - c.cy) > c.hy + standoff || Math.abs(out.z - c.cz) > c.hz + standoff) continue;
      const d = colliderSdf(c, out.x, out.y, out.z);
      if (d >= standoff * 0.9) continue;
      colliderNormal(c, out.x, out.y, out.z, _gn);
      // decor standing on the substrate has no way out underneath: onto its top instead
      if (c.grounded && _gn.y < -0.3) out.y = c.top + standoff;
      else out.addScaledVector(_gn, standoff - d);
      moved = true;
    }
    if (!moved) break;
  }
  return out;
}

/**
 * Long crawlers/walkers (axolotl, crayfish, pleco) must keep nose and tail out of the glass and out of any hard decor
 * they cannot climb. Pushes are horizontal for walkers so they never get lifted into the water column.
 */
function constrainCrawlBody(a: Agent, w: AIWorld, mask: number, prevFwd: THREE.Vector3, deep: number): void {
  const env = w.env;
  const ctrl = a.ctrl;
  const pos = a.rt.pos;
  const L = a.L;
  const hx = a.set.body.hx * L;
  const side = Math.max(a.set.body.hz, a.set.body.hy) * L;
  const walk = a.loco === 'walk';
  const climbH = mask & SURF_DECOR ? 0 : climbHeight(a);
  for (let iter = 0; iter < 2; iter++) {
    let moved = false;
    for (let s = walk ? 0 : 1; s <= 2; s++) {
      const k = s === 0 ? 0 : s === 1 ? hx * 0.92 : -hx * 0.88;
      const px = pos.x + a.fwd.x * k;
      const py = pos.y + a.fwd.y * k;
      const pz = pos.z + a.fwd.z * k;
      const r = s === 0 ? a.set.body.hz * L : side * 0.45;
      if (!(mask & SURF_GLASS)) {
        if (px < env.minX + r) {
          pos.x += env.minX + r - px;
          moved = true;
        } else if (px > env.maxX - r) {
          pos.x -= px - (env.maxX - r);
          moved = true;
        }
        if (pz < env.minZ + r) {
          pos.z += env.minZ + r - pz;
          moved = true;
        } else if (pz > env.maxZ - r) {
          pos.z -= pz - (env.maxZ - r);
          moved = true;
        }
      }
      if (mask & SURF_DECOR) continue;
      for (let i = 0; i < env.colliders.length; i++) {
        const c = env.colliders[i];
        if (!c.hard || c.decorId === ctrl.ignoreDecor || c.rise <= climbH || (deep & (1 << Math.min(i, 30))) !== 0) continue;
        if (Math.abs(px - c.cx) > c.hx + r || Math.abs(pz - c.cz) > c.hz + r) continue;
        if (walk ? py + r < c.cy - c.hy || py - r - a.stepLift > c.top : Math.abs(py - c.cy) > c.hy + r) continue;
        let d: number;
        if (walk) {
          // walkers: footprint distance, pushed sideways only — always away from the obstacle as seen from the body
          // centre, so a nose reaching past a stone's midline never drags the body through it
          d = colliderSdfXZ(c, px, pz);
          if (d >= r) continue;
          colliderExitXZ(c, pos.x, pos.z, _n);
        } else {
          d = colliderSdf(c, px, py, pz);
          if (d >= r) continue;
          colliderNormal(c, px, py, pz, _n);
        }
        _n.multiplyScalar(Math.min(r - d, L * 0.5));
        // walkers: never shove the body past the glass (see stepCrawl) — a wedged body walks out (resolveWedge)
        if (walk) clipPushToGlass(env, pos, a.set.body.hz * L, _n);
        pos.add(_n);
        a.speed *= Math.pow(0.85, _dt * 60);
        moved = true;
      }
    }
    if (!moved) break;
  }
  // the glass has the last word (decor pushes above never leave the body half through a pane)
  if (walk && !(mask & SURF_GLASS)) clampWalkerToGlass(a, env);
  // a turn that swings nose or tail into decor on both sides (wedged between a stone and a plant crown) cannot be
  // resolved by pushing — keep the previous heading instead of sweeping through the obstacle
  if (!(mask & SURF_DECOR)) {
    const r = side * 0.45;
    let now = endPenetration(a, env, climbH, a.fwd, hx, r);
    if (now > r * 0.3) {
      const prev = endPenetration(a, env, climbH, prevFwd, hx, r);
      if (prev < now) {
        a.fwd.copy(prevFwd);
        a.speed *= Math.pow(0.5, _dt * 60);
        now = prev;
      }
      // still wedged (tail against a stone, nose against the glass): swing the body toward whichever side frees it
      if (now > r * 0.5) {
        const ang = Math.min(0.12, 2.2 * _dt);
        _swingA.copy(a.fwd).applyAxisAngle(a.surfN, ang);
        _swingB.copy(a.fwd).applyAxisAngle(a.surfN, -ang);
        const pa = endPenetration(a, env, climbH, _swingA, hx, r);
        const pb = endPenetration(a, env, climbH, _swingB, hx, r);
        if (Math.min(pa, pb) < now) a.fwd.copy(pa <= pb ? _swingA : _swingB);
      }
    }
  }
  // the whole body must fit across the tank: turn parallel to the glass if it cannot
  if (!(mask & SURF_GLASS)) {
    const spanZ = env.maxZ - env.minZ - side;
    if (Math.abs(a.fwd.z) * hx * 1.8 > spanZ) {
      a.fwd.z *= Math.pow(0.85, _dt * 60);
      safeNormalize(a.fwd, X1);
    }
  }
}

/**
 * Translate a walker so its centre (half-width) and nose/tail points (end radius) are all inside the glass. When the
 * body cannot fit along an axis (longer than the tank is deep), it is centred on that axis.
 */
function clampWalkerToGlass(a: Agent, env: TankEnv): void {
  const pos = a.rt.pos;
  const L = a.L;
  const hx = a.set.body.hx * L;
  const rc = a.set.body.hz * L;
  const re = Math.max(a.set.body.hz, a.set.body.hy) * L * 0.45;
  const kn = hx * 0.92;
  const kt = -hx * 0.88;
  // allowed shift interval per axis = intersection over the three sample points
  let loX = env.minX + rc - pos.x;
  let hiX = env.maxX - rc - pos.x;
  let loZ = env.minZ + rc - pos.z;
  let hiZ = env.maxZ - rc - pos.z;
  for (let e = 0; e < 2; e++) {
    const k = e === 0 ? kn : kt;
    const px = pos.x + a.fwd.x * k;
    const pz = pos.z + a.fwd.z * k;
    loX = Math.max(loX, env.minX + re - px);
    hiX = Math.min(hiX, env.maxX - re - px);
    loZ = Math.max(loZ, env.minZ + re - pz);
    hiZ = Math.min(hiZ, env.maxZ - re - pz);
  }
  pos.x += loX <= hiX ? clamp(0, loX, hiX) : (loX + hiX) / 2;
  pos.z += loZ <= hiZ ? clamp(0, loZ, hiZ) : (loZ + hiZ) / 2;
}

/** Deepest overlap of a walker's footprint (centre + nose + tail at x, z) with hard decor it cannot step over. */
function walkerOverlap(a: Agent, env: TankEnv, climbH: number, x: number, z: number, fx = a.fwd.x, fz = a.fwd.z): number {
  const L = a.L;
  const hx = a.set.body.hx * L;
  const rc = a.set.body.hz * L;
  const re = Math.max(a.set.body.hz, a.set.body.hy) * L * 0.45;
  const y = a.rt.pos.y;
  let worst = 0;
  for (let s = 0; s <= 2; s++) {
    const k = s === 0 ? 0 : s === 1 ? hx * 0.92 : -hx * 0.88;
    const px = x + fx * k;
    const pz = z + fz * k;
    const r = s === 0 ? rc : re;
    for (let i = 0; i < env.colliders.length; i++) {
      const c = env.colliders[i];
      if (!c.hard || c.decorId === a.ctrl.ignoreDecor || c.rise <= climbH) continue;
      if (y + r < c.cy - c.hy || y - r - a.stepLift > c.top) continue;
      if (Math.abs(px - c.cx) > c.hx + r || Math.abs(pz - c.cz) > c.hz + r) continue;
      const pen = r - colliderSdfXZ(c, px, pz);
      if (pen > worst) worst = pen;
    }
  }
  return worst;
}

/** How far a walker's centre or nose/tail at (x, z) would stick out through the glass. */
function walkerGlassPen(a: Agent, env: TankEnv, x: number, z: number, fx = a.fwd.x, fz = a.fwd.z): number {
  const L = a.L;
  const hx = a.set.body.hx * L;
  const rc = a.set.body.hz * L;
  const re = Math.max(a.set.body.hz, a.set.body.hy) * L * 0.45;
  let worst = 0;
  for (let s = 0; s <= 2; s++) {
    const k = s === 0 ? 0 : s === 1 ? hx * 0.92 : -hx * 0.88;
    const px = x + fx * k;
    const pz = z + fz * k;
    const r = s === 0 ? rc : re;
    worst = Math.max(worst, env.minX + r - px, px - (env.maxX - r), env.minZ + r - pz, pz - (env.maxZ - r));
  }
  return worst;
}

/** Would stepping `step` metres along (dx, dz) push the walker deeper into decor or glass? */
function walkerStepBlocked(a: Agent, env: TankEnv, climbH: number, step: number, dx: number, dz: number): boolean {
  const pos = a.rt.pos;
  const x = pos.x + dx * step;
  const z = pos.z + dz * step;
  const now = walkerOverlap(a, env, climbH, pos.x, pos.z) + walkerGlassPen(a, env, pos.x, pos.z);
  const next = walkerOverlap(a, env, climbH, x, z) + walkerGlassPen(a, env, x, z);
  // (even a slight new contact counts: the constraints would push it back out next frame — a slow back-and-forth)
  return next > now + 1e-5 && next > 1e-4;
}

const PLAN_ANGLES = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4];
const FWD_ANGLES = [0, 0.3, -0.3, 0.6, -0.6];
/**
 * Local planner for floor walkers: about five times a second, try headings fanned ±80° around the way it wants to go
 * and keep the best one along which the whole body (centre, nose, tail) stays clear of decor and glass a short walk
 * ahead. Scores favour the wanted direction, the heading it already follows (so it does not dither between two ways
 * round a stone) and its current facing. Re-plans at once if the chosen way gets blocked. Writes the heading to turn
 * toward into `face`; returns false when no heading is free (the walker stops and the brain re-plans).
 */
function walkerPlan(a: Agent, env: TankEnv, climbH: number, n: THREE.Vector3, face: THREE.Vector3, dt: number, reach: number): boolean {
  const pos = a.rt.pos;
  _planReach = reach;
  const ok = Math.max(walkerOverlap(a, env, climbH, pos.x, pos.z) + walkerGlassPen(a, env, pos.x, pos.z), 1e-4) + 1e-5;
  a.walkPlanT -= dt;
  if (a.hasWalkDir && a.walkPlanT > 0 && headingClear(a, env, climbH, a.walkDir.x, a.walkDir.z, ok)) {
    face.copy(a.walkDir);
    return true;
  }
  // wanted direction, flattened
  let wx = face.x;
  let wz = face.z;
  const wl = Math.hypot(wx, wz);
  if (wl < 1e-6) {
    wx = a.fwd.x;
    wz = a.fwd.z;
  } else {
    wx /= wl;
    wz /= wl;
  }
  let best = -Infinity;
  let bx = 0;
  let bz = 0;
  const fl = Math.hypot(a.fwd.x, a.fwd.z) || 1;
  const fx = a.fwd.x / fl;
  const fz = a.fwd.z / fl;
  // candidates fanned round the wanted direction, and round the current heading: a long body in a tight spot cannot
  // pivot on the spot — it walks on (or veers a little) until there is room to turn toward its goal
  for (let i = 0; i < PLAN_ANGLES.length + FWD_ANGLES.length; i++) {
    const aroundWant = i < PLAN_ANGLES.length;
    const ang = aroundWant ? PLAN_ANGLES[i] : FWD_ANGLES[i - PLAN_ANGLES.length];
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const dx = aroundWant ? wx * c - wz * s : fx * c - fz * s;
    const dz = aroundWant ? wx * s + wz * c : fx * s + fz * c;
    if (!headingClear(a, env, climbH, dx, dz, ok)) continue;
    let score = dx * wx + dz * wz;
    if (a.hasWalkDir) score += 0.4 * (dx * a.walkDir.x + dz * a.walkDir.z);
    score += 0.2 * (dx * fx + dz * fz);
    if (score > best) {
      best = score;
      bx = dx;
      bz = dz;
    }
  }
  a.walkPlanT = 0.2 + (a.noiseOff % 1) * 0.08;
  // the heading it already follows stays unless another is clearly better: the fan round the body's heading turns
  // with the body, so each re-plan offered a slightly different set, and taking the best each time swung the walker
  // between two neighbouring headings a few times a second (seen at low frame rates)
  if (a.hasWalkDir && headingClear(a, env, climbH, a.walkDir.x, a.walkDir.z, ok)) {
    const keep = a.walkDir.x * wx + a.walkDir.z * wz + 0.4 + 0.2 * (a.walkDir.x * fx + a.walkDir.z * fz);
    if (best < keep + 0.06) {
      bx = a.walkDir.x;
      bz = a.walkDir.z;
      best = keep;
    }
  }
  if (best === -Infinity) {
    a.hasWalkDir = false;
    return false;
  }
  a.walkDir.set(bx, 0, bz);
  a.hasWalkDir = true;
  face.copy(a.walkDir).addScaledVector(n, -a.walkDir.dot(n));
  safeNormalize(face, a.fwd);
  return true;
}
/** Look-ahead distances (body lengths) a planned heading must be clear at. */
const PLAN_REACH = [0.2, 0.45];
/** Distance to the goal (m): look-ahead never probes past it (walking up to the glass is not "blocked by glass"). */
let _planReach = Infinity;
/** Is the whole body, turned to (dx, dz), no deeper in decor/glass than `ok` at each look-ahead point along it? */
function headingClear(a: Agent, env: TankEnv, climbH: number, dx: number, dz: number, ok: number): boolean {
  const pos = a.rt.pos;
  for (let i = 0; i < PLAN_REACH.length; i++) {
    const d = Math.min(a.L * PLAN_REACH[i], Math.max(0.004, _planReach));
    const x = pos.x + dx * d;
    const z = pos.z + dz * d;
    if (walkerOverlap(a, env, climbH, x, z, dx, dz) + walkerGlassPen(a, env, x, z, dx, dz) > ok) return false;
  }
  return true;
}

/** Walking speed (m/s) of a walker leaving a gap it does not fit in. */
const WEDGE_SPEED = 0.05;

/**
 * A walker squeezed where its body cannot fit (between a big piece of wood and the front glass, say) is held still by
 * the constraints — pushes past the glass are refused — so it would sit half inside the decor. Instead it walks out:
 * along the heading or along the glass, toward the nearest spot where the whole body fits. The exit direction is
 * chosen once and kept until the body is clear, so it never dithers. Boxed in on every side, it swims out.
 */
function resolveWedge(a: Agent, env: TankEnv, climbH: number, dt: number): void {
  const pos = a.rt.pos;
  const rc = a.set.body.hz * a.L;
  const over = walkerOverlap(a, env, climbH, pos.x, pos.z);
  if (over < rc * 0.25) {
    // clear (or only brushing): forget the exit a moment later
    a.stuckT = Math.max(0, a.stuckT - dt);
    if (a.stuckT === 0) a.wedgeDir.set(0, 0, 0);
    a.drift.set(0, 0, 0);
    return;
  }
  a.stuckT = Math.min(a.stuckT + dt, 5);
  if (a.wedgeDir.lengthSq() < 0.5 && !chooseWedgeExit(a, env, climbH, over, a.wedgeDir)) {
    // boxed in on every side (glass, wood, stones at nose and tail): swim out of it if it can, else stay put
    a.wedgeSwim = a.set.canSwim;
    a.drift.set(0, 0, 0);
    return;
  }
  const step = WEDGE_SPEED * dt;
  pos.x += a.wedgeDir.x * step;
  pos.z += a.wedgeDir.z * step;
  clampWalkerToGlass(a, env);
  // legs keep walking while it shuffles out (walkers ignore drift in motion; the gait reads it)
  a.drift.set(a.wedgeDir.x * WEDGE_SPEED, 0, a.wedgeDir.z * WEDGE_SPEED);
}

const WEDGE_DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function chooseWedgeExit(a: Agent, env: TankEnv, climbH: number, over0: number, out: THREE.Vector3): boolean {
  const pos = a.rt.pos;
  const rc = a.set.body.hz * a.L;
  let fx = a.fwd.x;
  let fz = a.fwd.z;
  const fl = Math.hypot(fx, fz) || 1;
  fx /= fl;
  fz /= fl;
  let best = Infinity;
  out.set(0, 0, 0);
  // candidates: forward, backward (a walk along the body axis looks natural) and the four glass-parallel axes
  for (let i = 0; i < 6; i++) {
    const dx = i === 0 ? fx : i === 1 ? -fx : WEDGE_DIRS[i - 2][0];
    const dz = i === 0 ? fz : i === 1 ? -fz : WEDGE_DIRS[i - 2][1];
    const bias = i === 0 ? 0.75 : i === 1 ? 0.9 : 1;
    // walk the line: it must lead out without pushing deeper into something else on the way
    for (let s = 0.01; s <= 0.45; s += 0.01) {
      const x = pos.x + dx * s;
      const z = pos.z + dz * s;
      if (x < env.minX + rc || x > env.maxX - rc || z < env.minZ + rc || z > env.maxZ - rc) break;
      const ov = walkerOverlap(a, env, climbH, x, z);
      if (ov > over0 + rc * 0.15) break;
      if (ov < rc * 0.1) {
        if (s * bias < best) {
          best = s * bias;
          out.set(dx, 0, dz);
        }
        break;
      }
    }
  }
  return best < Infinity;
}

/** Shortens a horizontal push so it cannot carry a body (half-width `rc`) past the glass. */
function clipPushToGlass(env: TankEnv, pos: THREE.Vector3, rc: number, push: THREE.Vector3): void {
  push.x = clamp(push.x, Math.min(0, env.minX + rc - pos.x), Math.max(0, env.maxX - rc - pos.x));
  push.z = clamp(push.z, Math.min(0, env.minZ + rc - pos.z), Math.max(0, env.maxZ - rc - pos.z));
}

/**
 * Bodies whose centre is inside hard decor (decor placed on top of them) leave toward open water — not into the
 * glass or the next rock — at a bounded speed, one push per collider per frame. Returns a bitmask of the colliders
 * handled (the sampled constraints skip them this frame so nose/tail pushes never pull the body back in).
 */
function easeOutOfDecor(a: Agent, env: TankEnv, pos: THREE.Vector3, side: number, walker: boolean, climbH: number): number {
  let mask = 0;
  const cs = env.colliders;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (!c.hard || c.decorId === a.ctrl.ignoreDecor) continue;
    if (Math.abs(pos.x - c.cx) > c.hx || Math.abs(pos.z - c.cz) > c.hz || pos.y < c.cy - c.hy - side || pos.y > c.top) continue;
    // shallow overlaps (a fast swimmer clipping an edge) are resolved by the sampled constraints; only a centre
    // well inside the decor counts as caught
    const depth = -Math.max(side, 0.008);
    let d: number;
    if (walker) {
      if (c.rise <= climbH) continue;
      d = colliderSdfXZ(c, pos.x, pos.z);
      if (d >= depth) continue;
      freeExitXZ(env, c, pos.x, pos.y, pos.z, side, climbH, true, _n, a.fwd, a.set.body.hx * a.L * 0.9);
    } else {
      d = colliderSdfGrounded(c, pos.x, pos.y, pos.z);
      if (d >= depth) continue;
      freeExit(env, c, pos.x, pos.y, pos.z, side, _n);
    }
    pos.addScaledVector(_n, side * (1 - Math.pow(0.5, _dt * 60)) + EASE_OUT_SPEED * _dt);
    a.speed *= Math.pow(0.6, _dt * 60);
    mask |= 1 << Math.min(i, 30);
  }
  return mask;
}

/** Deepest penetration (r − distance) of the nose/tail points into non-climbable hard decor for a heading. */
function endPenetration(a: Agent, env: TankEnv, climbH: number, fwd: THREE.Vector3, hx: number, r: number): number {
  const pos = a.rt.pos;
  const walk = a.loco === 'walk';
  let worst = 0;
  for (let s = 1; s <= 2; s++) {
    const k = s === 1 ? hx * 0.92 : -hx * 0.88;
    const px = pos.x + fwd.x * k;
    const py = pos.y + fwd.y * k;
    const pz = pos.z + fwd.z * k;
    // the glass counts too (a long body wedged between the front pane and a stone)
    worst = Math.max(worst, env.minX + r - px, px - (env.maxX - r), env.minZ + r - pz, pz - (env.maxZ - r));
    for (let i = 0; i < env.colliders.length; i++) {
      const c = env.colliders[i];
      if (!c.hard || c.decorId === a.ctrl.ignoreDecor || c.rise <= climbH) continue;
      if (Math.abs(px - c.cx) > c.hx + r || Math.abs(pz - c.cz) > c.hz + r || Math.abs(py - c.cy) > c.hy + r + a.stepLift) continue;
      const d = walk ? colliderSdfXZ(c, px, pz) : colliderSdf(c, px, py, pz);
      if (r - d > worst) worst = r - d;
    }
  }
  return worst;
}

/** Decor lower than this (above the substrate) is stepped over by a floor walker: about its own body height. */
function climbHeight(a: Agent): number {
  return Math.max(0.006, a.set.body.hy * a.L * 2 * 0.95);
}

/** Extra height a walker needs to stand on the low decor under its body (0 on bare substrate). */
function stepHeight(env: TankEnv, a: Agent, climbH: number, side: number): number {
  const pos = a.rt.pos;
  const hx = a.set.body.hx * a.L * 0.8;
  const ramp = Math.max(0.008, side * 0.7);
  const base = floorAt(env, pos.x, pos.z);
  let best = 0;
  const cs = env.colliders;
  for (let i = 0; i < cs.length; i++) {
    const c: Collider = cs[i];
    if (!c.hard || c.rise > climbH || c.decorId === a.ctrl.ignoreDecor) continue;
    for (let s = -1; s <= 1; s++) {
      const px = pos.x + a.fwd.x * hx * s;
      const pz = pos.z + a.fwd.z * hx * s;
      const d = colliderSdfXZ(c, px, pz);
      if (d >= ramp) continue;
      // feet on the rounded top: full height inside the footprint, easing down over a short ramp outside it
      const k = d <= 0 ? 1 : 1 - smoothstep(0, ramp, d);
      const h = (c.top - base) * k * (s === 0 ? 1 : 0.85);
      if (h > best) best = h;
    }
  }
  return Math.max(0, best);
}

/** Does a body of this agent fit at `pos` with heading `fwd` (no glass / hard-decor overlap)? */
export function bodyFits(a: Agent, w: AIWorld, pos: THREE.Vector3, fwd: THREE.Vector3): boolean {
  const env = w.env;
  const L = a.L;
  const hx = a.loco === 'upright' ? a.set.body.hy * L : a.set.body.hx * L;
  const side = Math.max(a.set.body.hy, a.set.body.hz) * L;
  const crawlsDecor = (a.set.loco === 'crawl' && (a.set.crawlMask & SURF_DECOR) !== 0) || a.set.loco === 'sessile';
  const walker = a.set.loco === 'walk' && a.loco !== 'upright';
  const climbH = walker ? climbHeight(a) : 0;
  for (let s = 0; s < 3; s++) {
    const k = s === 0 ? 0 : s === 1 ? hx * 0.9 : -hx * 0.9;
    const px = pos.x + (a.loco === 'upright' ? 0 : fwd.x * k);
    const py = pos.y + (a.loco === 'upright' ? k : fwd.y * k);
    const pz = pos.z + (a.loco === 'upright' ? 0 : fwd.z * k);
    const r = s === 0 ? side * 0.8 : side * 0.4;
    if (px < env.minX + r || px > env.maxX - r || pz < env.minZ + r || pz > env.maxZ - r) return false;
    if (py > env.surfaceY) return false;
    if (crawlsDecor) continue;
    for (const c of env.colliders) {
      if (!c.hard) continue;
      if (walker) {
        // floor walkers step over low decor, and only the footprint matters (same test as the walking constraints)
        if (c.rise <= climbH || py + r < c.cy - c.hy || py - r > c.top) continue;
        if (colliderSdfXZ(c, px, pz) < r) return false;
      } else if (colliderSdf(c, px, py, pz) < r) return false;
    }
  }
  return true;
}

/** Switch a crawler to swimming (short swim / tail flip). */
export function takeOff(a: Agent): void {
  a.liftApplied = 0;
  a.surfId = -1;
  a.aim.set(0, 0, 0);
  a.avoidLP.set(0, 0, 0);
  a.probeDir.set(0, 0, 0);
  if (a.loco === 'crawl' || a.loco === 'walk') {
    a.loco = 'swim';
    a.grounded = false;
    // start with a heading that leaves the surface a little
    a.fwd.addScaledVector(a.surfN, 0.35).normalize();
    a.up.set(0, 1, 0);
  }
}

/** Crawler in swim mode lands when close to an allowed surface. Returns true when landed. */
export function tryLand(a: Agent, w: AIWorld, force = false): boolean {
  if (a.loco !== 'swim' || a.set.loco === 'swim' || a.set.loco === 'upright') return false;
  const mask = a.set.loco === 'walk' ? SURF_FLOOR : a.set.crawlMask || SURF_FLOOR;
  const hit = nearestSurface(w.env, a.rt.pos, mask, a.hit);
  const standoff = a.set.body.hy * a.L;
  if (force || hit.d < standoff + a.L * 0.35) {
    a.loco = a.set.loco;
    a.surfId = -1;
    a.aim.set(0, 0, 0);
    a.surfN.copy(hit.kind === 'none' ? UP : hit.n);
    a.fwd.addScaledVector(a.surfN, -a.fwd.dot(a.surfN));
    safeNormalize(a.fwd, X1);
    return true;
  }
  return false;
}

export { UP as WORLD_UP };
