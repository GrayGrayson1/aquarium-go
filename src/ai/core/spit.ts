/**
 * The archerfish's signature act (species with 'spit_shot' in specialBehaviors). OWNER: lane "brackish".
 *
 * A fly settles in the air gap above the water — on the inside of the end or front glass, or on an emergent leaf. The archerfish lines up beneath it, tilts steeply up with its mouth just under the surface (it aims
 * with its whole body), holds still for a moment, then fires: the jet knocks the fly down, and the fish darts to the
 * spot where it lands and snaps it off the surface film. Real archerfish shoot at ~74° on average; the game settles for
 * 50–65° so the steep pose stays calm under the surface (see ctrl.pitchCap).
 *
 * Shot state lives in src/runtime/archerShots.ts (read by the jet renderer). The fly is cosmetic: it never feeds the
 * sim (a game abstraction). One shot per tank at a time, a 15–45 s cooldown per fish, daylight only, calm fish only.
 */
import * as THREE from 'three';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import { archerShots, hasArcherRequest, JET_FLIGHT_S, newArcherShot, shotActive, takeArcherRequest, type ArcherPerch, type ArcherShot } from '@/runtime/archerShots';
import { bodyFits } from './loco';
import { bodyHX, bodySide, mouthPos } from './nav';
import { floorAt } from './env';
import { clamp, rnd, rrange } from './math';

interface AimState {
  /** Fly position (target). */
  T: THREE.Vector3;
  /** Body centre while aiming. */
  C: THREE.Vector3;
  /** Horizontal heading (unit). */
  hdir: THREE.Vector3;
  /** Aim pitch (radians, nose up). */
  P: number;
  phaseT: number;
  /** Longest the swim over to the aiming spot may take (s). */
  approachMax: number;
  settledAt: number;
  holdFor: number;
  firedAt: number;
  ateAt: number;
}

const aims = new WeakMap<Agent, AimState>();
const nextShotAt = new WeakMap<Agent, number>();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();
const _fwd = new THREE.Vector3();

/** Where the drawn snout sits along the body, as a fraction of the AI body half-length (fish plans put the snout ~0.42 L ahead). */
const SNOUT = 0.84;

/** Gravity used for the knocked-down fly (m/s², slowed: a stunned fly flutters as it falls — cosmetic). */
const FLY_G = 0.8;

export const canSpit = (a: Agent) => !a.dead && a.loco === 'swim' && !!a.sp.specialBehaviors?.includes('spit_shot');

function aimOf(a: Agent): AimState {
  let s = aims.get(a);
  if (!s) {
    s = { T: new THREE.Vector3(), C: new THREE.Vector3(), hdir: new THREE.Vector3(1, 0, 0), P: 1, phaseT: 0, approachMax: 10, settledAt: -1, holdFor: 0.8, firedAt: -1, ateAt: -1 };
    aims.set(a, s);
  }
  return s;
}

/** Nobody else is mid-shot in this tank. */
function tankFree(a: Agent, w: AIWorld): boolean {
  const s = archerShots.get(w.tankId);
  return !shotActive(s) || s.shooterId === a.id;
}

/** Calm, daylit, fed-enough, off cooldown. `forced` (QA) ignores the cooldown and the mood checks. */
export function canSpitNow(a: Agent, w: AIWorld, forced = false): boolean {
  if (!canSpit(a) || !tankFree(a, w)) return false;
  if (forced) return true;
  if (w.env.daylight < 0.55 || a.stress > 0.55 || a.ill > 0.2 || a.hunger > 0.9 || a.fright > 0.3) return false;
  let next = nextShotAt.get(a);
  if (next === undefined) {
    next = w.time + rrange(a, 6, 30);
    nextShotAt.set(a, next);
  }
  return w.time >= next;
}

/** Planner weight for 'spit' (0 when not possible right now). */
export function spitWeight(a: Agent, w: AIWorld): number {
  if (!canSpitNow(a, w)) return 0;
  return 0.8 * (0.6 + a.mods.curiosity * 0.8);
}

/** A QA request (window.__AQ_SPIT) waits for this tank and this fish could take it. */
export function spitRequested(a: Agent, w: AIWorld): boolean {
  return hasArcherRequest(w.tankId) && canSpitNow(a, w, true);
}
export const consumeSpitRequest = (w: AIWorld) => takeArcherRequest(w.tankId);

// ───────────────────────────── choosing the fly and the aim ─────────────────────────────

/** Emergent plant crowns reaching above the water (e.g. a mangrove seedling): the fly can sit on a leaf. */
function emergentLeaf(a: Agent, w: AIWorld, out: THREE.Vector3, reach: number): boolean {
  const env = w.env;
  const H = env.dims.H;
  const ok = (c: (typeof env.colliders)[number]) => c.category === 'plant' && c.part === 'body' && c.top > env.surfaceY + 0.006 && Math.abs(c.cx - a.rt.pos.x) < reach;
  let n = 0;
  for (const c of env.colliders) if (ok(c)) n++;
  if (!n) return false;
  let k = Math.floor(rnd(a) * n);
  for (const c of env.colliders) {
    if (!ok(c)) continue;
    if (k-- > 0) continue;
    out.set(c.cx + rrange(a, -0.3, 0.3) * c.hx, Math.min(c.top - 0.004, H - 0.006), c.cz + rrange(a, -0.3, 0.3) * c.hz);
    return out.y > env.surfaceY + 0.006;
  }
  return false;
}

/**
 * Where the body must sit to shoot the fly at T from heading `hdir` with aim pitch ~P: the nose just under the
 * surface, the jet leaving the water along the body axis and arcing over (gravity) onto the fly. The fish aims
 * steeply even at a fly close by — a steep jet that lobs over onto its target — but a jet that would have to climb
 * far above the fly (into the lid) makes it aim lower. Fills st.C / st.P.
 */
function planAim(a: Agent, w: AIWorld, st: AimState, P0: number): boolean {
  const env = w.env;
  const hx = bodyHX(a);
  const side = bodySide(a);
  const sy = env.surfaceY;
  const T = st.T;
  const hdir = st.hdir;
  const h = T.y - sy;
  if (h < 0.004) return false;
  let P = P0;
  let dh = h / Math.tan(P - 0.1);
  const rn = side * 0.45 + 0.003;
  const room = Math.max(0.004, visibleAirTop(w) + 0.012 - T.y); // how far the arc may rise above the fly
  for (let iter = 0; iter < 4; iter++) {
    const sinP = Math.sin(P);
    const cosP = Math.cos(P);
    // the snout (drawn ~0.42 L ahead of the body centre) just touches the surface film
    const cy = sy - 0.002 - sinP * hx * SNOUT;
    const back = dh + cosP * hx * SNOUT;
    st.C.set(T.x - hdir.x * back, cy, T.z - hdir.z * back);
    // the nose (the body sample ahead of the mouth) keeps its distance from the glass, or the constraints would push
    // the aiming body back and forth
    const nx = st.C.x + hdir.x * cosP * hx;
    const nz = st.C.z + hdir.z * cosP * hx;
    const over = Math.max(nx - (env.maxX - rn), env.minX + rn - nx, nz - (env.maxZ - rn), env.minZ + rn - nz, 0);
    if (over <= 0) break;
    dh += over + 0.002;
    // a straight-line jet at P would pass well above the fly: flatten the aim so the lob stays under the lid
    if (dh * Math.tan(P) > h + room * 2) P = Math.atan((h + room * 2) / dh);
  }
  if (P < 0.55 || P > 1.2) return false;
  st.P = P;
  const cosP = Math.cos(P);
  _fwd.set(hdir.x * cosP, Math.sin(P), hdir.z * cosP);
  const C = st.C;
  // the whole body in the water, clear of the glass, the substrate and hard decor
  if (C.x < env.minX + side + 0.002 || C.x > env.maxX - side - 0.002 || C.z < env.minZ + side + 0.002 || C.z > env.maxZ - side - 0.002) return false;
  const tailY = C.y - Math.sin(P) * hx * 0.92;
  if (tailY < floorAt(env, C.x - hdir.x * cosP * hx, C.z - hdir.z * cosP * hx) + side * 0.4 + 0.01) return false;
  // (the nose sample pokes through the film while aiming, so test the fit a touch lower)
  _b.copy(C);
  _b.y -= noseLift(a, P) + 0.004;
  return bodyFits(a, w, _b, _fwd);
}

/** How far the body's nose sample (0.5 L ahead) sits above the film when the drawn snout (SNOUT × that) touches it. */
const noseLift = (a: Agent, P: number) => Math.max(0, (1 - SNOUT) * bodyHX(a) * Math.sin(P) + 0.002);

/**
 * Top of the air gap a viewer can actually see: a glass tank's black rim trim hides the top of it (mirrors the shell's
 * rim height in src/render/tank/shell/Glass.tsx), so the fly settles below that line.
 */
function visibleAirTop(w: AIWorld): number {
  const H = w.env.dims.H;
  return H - (Math.min(0.03, 0.013 + H * 0.01) * 0.6 + 0.003);
}

/** Pick a fly spot + an aim that fits; writes the aim state. */
function chooseShot(a: Agent, w: AIWorld, st: AimState): { perch: ArcherPerch; normal: THREE.Vector3 } | null {
  const env = w.env;
  const sy = env.surfaceY;
  const top = visibleAirTop(w);
  if (top < sy + 0.007) return null;
  const pos = a.rt.pos;
  const reach = Math.max(0.2, (env.maxX - env.minX) * 0.3);
  const flyY = () => sy + rrange(a, Math.min(0.006, (top - sy) * 0.5), top - sy);
  for (let i = 0; i < 24; i++) {
    const r = rnd(a);
    let perch: ArcherPerch;
    if (r < 0.28 && emergentLeaf(a, w, st.T, reach)) {
      // on an emergent leaf (a mangrove seedling breaking the surface)
      perch = 'leaf';
      st.T.y = Math.min(st.T.y, top);
      _n.set(0, 1, 0);
      const dx = st.T.x - pos.x;
      st.hdir.set(Math.abs(dx) > 0.02 ? Math.sign(dx) : rnd(a) < 0.5 ? -1 : 1, 0, rrange(a, -0.35, 0.35)).normalize();
    } else if (r < 0.72) {
      // on the inside of the end glass just above the waterline (seen side-on, like the fish) — usually the nearer end
      perch = 'glass';
      const sx = rnd(a) < 0.75 ? (pos.x >= 0 ? 1 : -1) : pos.x >= 0 ? -1 : 1;
      st.T.set(sx > 0 ? env.maxX - 0.0035 : env.minX + 0.0035, flyY(), rrange(a, env.minZ + (env.maxZ - env.minZ) * 0.35, env.maxZ - 0.05));
      _n.set(-sx, 0, 0);
      st.hdir.set(sx, 0, 0);
    } else {
      // a fly on the front glass, right in front of the viewer; the fish comes at it on a diagonal
      perch = 'glass';
      st.T.set(clamp(pos.x + rrange(a, -reach, reach), env.minX + 0.12, env.maxX - 0.12), flyY(), env.maxZ - 0.0035);
      _n.set(0, 0, -1);
      const dx = st.T.x - pos.x;
      st.hdir.set((Math.abs(dx) > 0.02 ? Math.sign(dx) : rnd(a) < 0.5 ? -1 : 1) * rrange(a, 0.6, 0.85), 0, 1).normalize();
    }
    if (planAim(a, w, st, rrange(a, 0.92, 1.12))) return { perch, normal: _n };
  }
  return null;
}

// ───────────────────────────── the act ─────────────────────────────

function go(a: Agent, p: THREE.Vector3, speedBL: number, arriveR: number): void {
  const c = a.ctrl;
  c.goal.copy(p);
  c.hasGoal = true;
  c.speedBL = speedBL;
  c.arriveR = arriveR;
}
function lookAt(a: Agent, p: THREE.Vector3): void {
  a.ctrl.look.copy(p);
  a.ctrl.hasLook = true;
}
const cruise = (a: Agent) => Math.max(0.05, a.sp.behaviorTraits.cruiseSpeed) * a.speedMul;

export function spitEnter(a: Agent, w: AIWorld): boolean {
  if (!canSpit(a) || !tankFree(a, w)) return false;
  const st = aimOf(a);
  const pick = chooseShot(a, w, st);
  if (!pick) {
    // nowhere to aim from right now: try again a little later
    nextShotAt.set(a, w.time + rrange(a, 8, 16));
    return false;
  }
  newArcherShot(w.tankId, a.id, pick.perch, st.T, pick.normal, rnd(a));
  st.phaseT = w.time;
  st.approachMax = 5 + a.rt.pos.distanceTo(st.C) / Math.max(0.02, cruise(a) * a.L * 0.5);
  st.settledAt = -1;
  st.holdFor = rrange(a, 0.6, 1.1);
  st.firedAt = -1;
  st.ateAt = -1;
  a.actDur = 1e9;
  a.actPhase = 0;
  a.actData.copy(st.C);
  return true;
}

function abort(a: Agent, w: AIWorld, s: ArcherShot | undefined): boolean {
  if (s && s.shooterId === a.id && s.phase === 'rest') {
    s.phase = 'flyoff';
    s.age = 0;
  }
  nextShotAt.set(a, w.time + rrange(a, 12, 30));
  return false;
}

export function spitTick(a: Agent, w: AIWorld): boolean {
  const st = aimOf(a);
  const s = archerShots.get(w.tankId);
  if (!s || s.shooterId !== a.id) return false;
  const env = w.env;
  const t = w.time;
  const c = a.ctrl;
  c.allowSurface = true;
  c.sep = 0.35;
  switch (a.actPhase) {
    case 0: {
      // swim over, level, to the aiming spot under the fly
      if (s.phase !== 'rest') return abort(a, w, s);
      const d = a.rt.pos.distanceTo(st.C);
      go(a, st.C, cruise(a) * 0.9, a.L * 1.4);
      lookAt(a, st.T);
      c.avoid = d < a.L * 2 ? 0.45 : 1;
      if (d < a.L * 0.4 || (t - st.phaseT > st.approachMax * 0.6 && d < a.L)) {
        a.actPhase = 1;
        st.phaseT = t;
      } else if (t - st.phaseT > st.approachMax) return abort(a, w, s);
      return true;
    }
    case 1:
    case 2: {
      // tilt up and hold the aim: body steady on the spot, eyes on the fly
      const since = t - st.phaseT;
      _a.copy(st.C);
      if (st.firedAt >= 0) {
        // a little recoil as the jet leaves
        const k = Math.exp(-(t - st.firedAt) / 0.1);
        _a.addScaledVector(st.hdir, -0.004 * k);
      }
      go(a, _a, cruise(a) * 0.5, a.L * 0.8);
      c.attach = Math.min(0.9, 0.15 + since * 1.6);
      c.avoid = 0.3;
      lookAt(a, st.T);
      // the planner damps vertical looks (×0.45); bias the pitch so the body settles at exactly the aim pitch
      _b.subVectors(st.T, a.rt.pos);
      const lh = Math.hypot(_b.x, _b.z);
      const base = Math.atan2(_b.y * 0.45, Math.max(1e-4, lh));
      c.pitchBias = st.P - base;
      c.pitchCap = st.P + 0.02;
      c.noseAbove = noseLift(a, st.P) + 0.003;
      a.rt.surfaceSnout = Math.min(1, (a.rt.surfaceSnout ?? 0) + 0.05);
      a.pose = 'hover';
      if (a.actPhase === 1) {
        if (s.phase !== 'rest') return abort(a, w, s);
        const pitch = Math.asin(clamp(a.fwd.y, -1, 1));
        const fh = Math.hypot(a.fwd.x, a.fwd.z);
        const align = fh > 1e-4 ? (a.fwd.x * st.hdir.x + a.fwd.z * st.hdir.z) / fh : 0;
        if (st.settledAt < 0 && Math.abs(pitch - st.P) < 0.06 && align > 0.985) st.settledAt = t;
        if (st.settledAt < 0 && since > 3.2) {
          // close enough after a while: take the shot; otherwise give up (the fly buzzes off)
          if (Math.abs(pitch - st.P) < 0.2 && align > 0.9) st.settledAt = t - st.holdFor;
          else return abort(a, w, s);
        }
        if (st.settledAt >= 0 && t - st.settledAt >= st.holdFor) fire(a, w, s, st);
        return true;
      }
      // fired: watch the jet land, then go for the falling fly
      if (s.phase !== 'shot' && t - st.firedAt > JET_FLIGHT_S + 0.06) {
        a.actPhase = 3;
        st.phaseT = t;
      }
      return true;
    }
    case 3: {
      // dart to where the fly is coming down and snap it off the surface
      if (s.phase === 'gone' || s.phase === 'flyoff') return false;
      const L = a.L;
      _a.subVectors(s.insect, a.rt.pos);
      _a.y = 0;
      const dh = _a.length();
      if (dh > 1e-4) _a.multiplyScalar(1 / dh);
      else _a.copy(st.hdir);
      _b.copy(s.insect).addScaledVector(_a, -bodyHX(a) * 0.8);
      _b.y = env.surfaceY - bodySide(a) - 0.004;
      go(a, _b, cruise(a) * 2.2, L * 0.6);
      // the snout sinks back under the film as the body levels off (no sudden push-down)
      c.noseAbove = Math.max(0, (noseLift(a, st.P) + 0.003) * (1 - (t - st.phaseT) / 0.4));
      a.rt.surfaceSnout = 1; // it snaps the fly off the film: the drawn snout goes all the way up
      c.urgency = 0.7;
      c.pitchBias = 0.28;
      c.avoid = 0.5;
      lookAt(a, s.insect);
      a.pose = 'feed';
      const m = mouthPos(a, _n);
      const near = Math.hypot(m.x - s.insect.x, m.z - s.insect.z) < Math.max(0.012, L * 0.18) && Math.abs(s.insect.y - m.y) < Math.max(0.025, L * 0.2);
      // it lets the fly hit the film and struggle for a moment, then takes it
      if (near && s.phase === 'float' && s.age > 0.18) {
        s.phase = 'gone';
        s.age = 0;
        a.mouthPulse = 1;
        a.satiety += 1;
        st.ateAt = t;
        w.hooks.event?.('eat', s.insect, a.id, 0.9);
        a.actPhase = 4;
        st.phaseT = t;
        return true;
      }
      if (t - st.phaseT > 6) return false;
      return true;
    }
    default: {
      // swallow and glide on
      a.rt.surfaceSnout = Math.max(0, 1 - (t - st.phaseT) * 2);
      go(a, _a.copy(a.rt.pos).addScaledVector(st.hdir, a.L * 0.6).setY(env.surfaceY - bodySide(a) - a.L * 0.3), cruise(a) * 0.8, a.L);
      return t - st.phaseT < 0.5;
    }
  }
}

function fire(a: Agent, w: AIWorld, s: ArcherShot, st: AimState): void {
  // the jet leaves from the snout at the surface film
  const m = _n.copy(a.rt.pos).addScaledVector(a.fwd, bodyHX(a) * SNOUT);
  m.y = Math.min(m.y, w.env.surfaceY);
  s.from.copy(m);
  s.to.copy(s.insect);
  s.dir.copy(a.fwd);
  s.phase = 'shot';
  s.age = 0;
  s.jetAge = 0;
  st.firedAt = w.time;
  a.actPhase = 2;
  a.mouthPulse = 1;
  nextShotAt.set(a, w.time + rrange(a, 15, 45));
  w.hooks.event?.('spit', m, a.id, 1);
  if (w.env.focused && w.hooks.observed) w.hooks.observed('spit_shot', a.id);
}

// ───────────────────────────── the fly (per world step) ─────────────────────────────

/** Advance the tank's shot: the jet reaching the fly, the fly tumbling onto the water and drifting there. */
export function stepArcherShot(w: AIWorld, dt: number): void {
  const s = archerShots.get(w.tankId);
  if (!s) return;
  s.age += dt;
  if (s.jetAge >= 0) s.jetAge += dt;
  const shooter = w.byId.get(s.shooterId);
  // the drawn body lets go of the surface film smoothly once the shooter is done
  if (shooter && shooter.act !== 'spit' && (shooter.rt.surfaceSnout ?? 0) > 0) shooter.rt.surfaceSnout = Math.max(0, (shooter.rt.surfaceSnout ?? 0) - dt * 2.5);
  if (s.phase === 'gone' || s.phase === 'flyoff') return;
  const env = w.env;
  if (s.phase === 'rest') {
    if (!shooter || shooter.dead || shooter.act !== 'spit') {
      s.phase = 'flyoff';
      s.age = 0;
    }
    return;
  }
  if (s.phase === 'shot') {
    if (s.jetAge < JET_FLIGHT_S) return;
    // hit: knocked off its perch along the jet
    _a.subVectors(s.to, s.from);
    _a.y = 0;
    const l = _a.length();
    if (l > 1e-5) _a.multiplyScalar(1 / l);
    else _a.set(1, 0, 0);
    const v = s.insectVel;
    // flung along the jet: it lands a hand's width away and the fish has to dart for it
    if (s.perch === 'glass') v.copy(s.perchN).multiplyScalar(0.2).addScaledVector(_a, 0.03).setY(0.08);
    else v.copy(_a).multiplyScalar(0.2).setY(0.1);
    s.phase = 'fall';
    s.age = 0;
    return;
  }
  const H = env.dims.H;
  const x0 = env.minX + 0.005;
  const x1 = env.maxX - 0.005;
  const z0 = env.minZ + 0.005;
  const z1 = env.maxZ - 0.005;
  if (s.phase === 'fall') {
    const v = s.insectVel;
    v.y -= FLY_G * dt;
    const drag = Math.exp(-1.2 * dt);
    v.x *= drag;
    v.z *= drag;
    s.insect.addScaledVector(v, dt);
    s.insect.x = clamp(s.insect.x, x0, x1);
    s.insect.z = clamp(s.insect.z, z0, z1);
    if (s.insect.y > H - 0.004) {
      s.insect.y = H - 0.004;
      v.y = Math.min(0, v.y);
    }
    s.spin += dt * 11;
    if (s.insect.y <= env.surfaceY) {
      s.insect.y = env.surfaceY;
      v.set(0, 0, 0);
      s.phase = 'float';
      s.age = 0;
    }
    return;
  }
  // float: struggling on the surface film, drifting slowly; it sinks out of sight if nobody takes it
  s.insect.x = clamp(s.insect.x + Math.sin(s.age * 0.9 + s.seed * 17) * 0.004 * dt, x0, x1);
  s.insect.z = clamp(s.insect.z + Math.cos(s.age * 0.7 + s.seed * 11) * 0.003 * dt, z0, z1);
  s.insect.y = env.surfaceY;
  if (s.age > 6) {
    s.phase = 'gone';
    s.age = 0;
  }
}
