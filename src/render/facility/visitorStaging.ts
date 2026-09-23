/**
 * Camera-aware staging for facility visitors (render-side, cosmetic). People looking at an exhibit should never
 * stand between the player's camera and the tanks: whenever the camera has settled, anyone whose standing spot
 * covers a real part of an exhibit on screen (or who crowds another viewer, or plants themselves dead centre in front
 * of the glass) steps aside to a nearby free spot off to the side of the tank front or beside its end, keeping a
 * clear viewing lane. `ExhibitFocus` measures, every frame, how much a person covers the exhibit the camera is
 * centred on (VisitorsLayer dithers such people out). Only the non-persisted visitor runtime is adjusted (the
 * renderer already drives it); game state is never touched. OWNER: lane "facility".
 */
import * as THREE from 'three';
import type { GameState, Tank } from '@/types';
import type { VisitorAgent } from '@/runtime/visitors';
import { findPath, isWalkable, lineOfSight, tankFootprint, tankOuterSize, type Reachability } from '@/sim/facility/layout';
import { standHeight } from '@/sim/tankSpace';

const EVAL_EVERY = 0.35;
/** The camera must hold still this long before anyone moves (no shuffling while the player pans). */
const SETTLE = 0.4;
const COOLDOWN = 4;
/** Fraction of an exhibit's on-screen rectangle a person may cover before they step aside. */
const OCC_T = 0.14;
/** Preferred spacing between viewers' spots (m). */
const SPACING = 0.58;
/** Spots closer than this fraction of the half-length to the tank's centre line count as "dead centre". */
const CENTRE = 0.3;
const MAX_MOVES = 4;
const BODY_HALF_W = 0.23;

export interface ScreenRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  area: number;
  /** Horizontal camera → tank-centre distance (m). */
  depth: number;
}

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

function newRect(): ScreenRect {
  return { x0: 0, x1: 0, y0: 0, y1: 0, area: 0, depth: 0 };
}

/** On-screen (NDC) rectangle of a tank's glass box, clipped to the viewport. False when off-screen / behind. */
export function tankScreenRect(cam: THREE.Camera, t: Pick<Tank, 'tierId' | 'placement'>, out: ScreenRect): boolean {
  if (!t?.placement) return false;
  const o = tankOuterSize(t.tierId);
  const y0 = standHeight(t.tierId);
  const c = Math.cos(t.placement.rotY);
  const s = Math.sin(t.placement.rotY);
  let x0 = Infinity;
  let x1 = -Infinity;
  let yy0 = Infinity;
  let yy1 = -Infinity;
  const proj = (cam as THREE.PerspectiveCamera).projectionMatrix;
  for (let k = 0; k < 8; k++) {
    const lx = (k & 1 ? 0.5 : -0.5) * o.L;
    const ly = k & 2 ? o.H : 0;
    const lz = (k & 4 ? 0.5 : -0.5) * o.W;
    _v.set(t.placement.x + lx * c + lz * s, y0 + ly, t.placement.z - lx * s + lz * c).applyMatrix4(cam.matrixWorldInverse);
    if (-_v.z < 0.1) return false;
    _v.applyMatrix4(proj);
    x0 = Math.min(x0, _v.x);
    x1 = Math.max(x1, _v.x);
    yy0 = Math.min(yy0, _v.y);
    yy1 = Math.max(yy1, _v.y);
  }
  out.x0 = Math.max(-1, x0);
  out.x1 = Math.min(1, x1);
  out.y0 = Math.max(-1, yy0);
  out.y1 = Math.min(1, yy1);
  if (!(out.x1 > out.x0) || !(out.y1 > out.y0)) return false;
  out.area = (out.x1 - out.x0) * (out.y1 - out.y0);
  // compare distances on the floor plane (a pitched camera sees feet "deeper" than a tank's middle)
  out.depth = Math.hypot(t.placement.x - cam.position.x, t.placement.z - cam.position.z);
  return true;
}

/** Fraction of `r` covered by a person of height h standing at (x, z), if they are in front of that exhibit. */
export function personCoverage(cam: THREE.Camera, r: ScreenRect, x: number, z: number, h: number): number {
  const flat = Math.hypot(x - cam.position.x, z - cam.position.z);
  if (!(flat < r.depth - 0.12)) return 0;
  const proj = (cam as THREE.PerspectiveCamera).projectionMatrix;
  _v.set(x, 0.02, z).applyMatrix4(cam.matrixWorldInverse);
  const depth = -_v.z;
  if (depth < 0.1) return 0;
  _v.applyMatrix4(proj);
  const fy = _v.y;
  const cx = _v.x;
  _v.set(x, h + 0.06, z).applyMatrix4(cam.matrixWorldInverse).applyMatrix4(proj);
  const hy = _v.y;
  const hw = (BODY_HALF_W * proj.elements[0]) / depth;
  const ox = Math.min(cx + hw, r.x1) - Math.max(cx - hw, r.x0);
  const oy = Math.min(Math.max(fy, hy), r.y1) - Math.max(Math.min(fy, hy), r.y0);
  if (!(ox > 0) || !(oy > 0) || !(r.area > 0)) return 0;
  return (ox * oy) / r.area;
}

/**
 * lane:w2-visual — is a person in the FOREGROUND of the facility shot: much closer to the camera than the exhibit in
 * view (floor distance below ~⅔ of it) AND big on screen (taller than ~30% of the view)? Everyone walks in from
 * the entrance on the camera side, so such figures used to loom over the bottom of the frame; the visitor and staff
 * layers dissolve them, and anyone taller than about half the view short of the exhibit (a small room's close camera).
 * Far-out overview shots keep them (they are small there). `wasHidden` adds hysteresis so
 * nobody hovers half-dithered at the edge. Cheap: one matrix transform per person.
 */
export function inForeground(cam: THREE.Camera, r: ScreenRect, x: number, z: number, h: number, wasHidden: boolean): boolean {
  if (!(r.depth > 0.5)) return false;
  const ratio = Math.hypot(x - cam.position.x, z - cam.position.z) / r.depth;
  if (ratio > 1) return false;
  _v.set(x, h * 0.5, z).applyMatrix4(cam.matrixWorldInverse);
  const d = -_v.z;
  if (d < 0.05) return true;
  const frac = (h * (cam as THREE.PerspectiveCamera).projectionMatrix.elements[5]) / (2 * d);
  // …or looming: taller than about half the view and not behind the exhibit (small rooms put viewers right by the lens)
  if (wasHidden ? ratio < 0.98 && frac > 0.48 : ratio < 0.94 && frac > 0.55) return true;
  // …or cut off by the bottom of the frame (feet under the dock), which reads as someone standing at the lens
  if (ratio < 0.8 && frac > 0.18) {
    _v.set(x, 0.02, z).applyMatrix4(cam.matrixWorldInverse).applyMatrix4((cam as THREE.PerspectiveCamera).projectionMatrix);
    if (_v.y < (wasHidden ? -0.72 : -0.78)) return true;
  }
  // mid-floor walkers stay unless they are big; the near half of the floor is for the view
  if (wasHidden) return ratio < 0.56 ? frac > 0.22 : ratio < 0.7 && frac > 0.3;
  return ratio < 0.5 ? frac > 0.26 : ratio < 0.64 && frac > 0.34;
}

/** The exhibit the camera is looking at (the focused tank if on screen, else the tank nearest the view centre). */
export class ExhibitFocus {
  rect = newRect();
  valid = false;
  private tmp = newRect();

  update(cam: THREE.Camera, g: GameState, focusedId: string | null | undefined): void {
    this.valid = false;
    cam.updateMatrixWorld();
    const focused = focusedId ? g.tanks[focusedId] : undefined;
    if (focused && tankScreenRect(cam, focused, this.tmp) && Math.abs((this.tmp.x0 + this.tmp.x1) / 2) < 0.75 && Math.abs((this.tmp.y0 + this.tmp.y1) / 2) < 0.8) {
      Object.assign(this.rect, this.tmp);
      this.valid = true;
      return;
    }
    let best = Infinity;
    for (const id of g.tankOrder ?? []) {
      const t = g.tanks[id];
      if (!t || !tankScreenRect(cam, t, this.tmp)) continue;
      const cx = (this.tmp.x0 + this.tmp.x1) / 2;
      const cy = (this.tmp.y0 + this.tmp.y1) / 2;
      // prefer big, central exhibits
      const d = Math.hypot(cx, cy * 0.8) - Math.sqrt(this.tmp.area) * 0.35;
      if (d < best && Math.abs(cx) < 0.9) {
        best = d;
        Object.assign(this.rect, this.tmp);
        this.valid = true;
      }
    }
  }

  coverage(cam: THREE.Camera, x: number, z: number, h: number): number {
    return this.valid ? personCoverage(cam, this.rect, x, z, h) : 0;
  }
}

export class VisitorStager {
  private t = 0;
  private last = -1;
  private stable = 0;
  private camPos = new THREE.Vector3(Infinity, 0, 0);
  private camQ = new THREE.Quaternion();
  private cool = new Map<number, number>();
  private rects: ScreenRect[] = [];
  private nRects = 0;
  private cam: THREE.Camera | null = null;
  /** Last evaluation, for dev inspection: [agent id, occlusion, crowding, moved]. */
  debug: [number, number, number, boolean][] = [];

  /** Call every frame (facility view only) after the visitor runtime has stepped. */
  update(dt: number, camera: THREE.Camera, g: GameState, agents: VisitorAgent[], reach: Reachability | null): void {
    this.t += dt;
    // camera settle detection (tolerant of tiny idle drift)
    camera.getWorldQuaternion(_q);
    if (camera.position.distanceToSquared(this.camPos) > 0.03 * 0.03 || 1 - Math.abs(_q.dot(this.camQ)) > 2e-5) {
      this.camPos.copy(camera.position);
      this.camQ.copy(_q);
      this.stable = 0;
    } else this.stable += dt;
    if (!reach?.grid || this.stable < SETTLE || this.t - this.last < EVAL_EVERY) return;
    this.last = this.t;
    this.cam = camera;
    camera.updateMatrixWorld();
    this.nRects = 0;
    for (const id of g.tankOrder ?? []) {
      const t = g.tanks[id];
      if (!t) continue;
      const r = this.rects[this.nRects] ?? (this.rects[this.nRects] = newRect());
      if (tankScreenRect(camera, t, r)) this.nRects++;
    }
    this.debug.length = 0;
    if (!this.nRects) return;
    let moves = 0;
    for (const a of agents) {
      if (moves >= MAX_MOVES) break;
      const tankId = a.targetTankId;
      if (!tankId || (a.state !== 'view' && a.state !== 'walk') || !a.path) continue;
      const tank = g.tanks[tankId];
      if (!tank?.placement) continue;
      if ((this.cool.get(a.id) ?? -1) > this.t) continue;
      const spot = spotOf(a);
      if (!spot) continue;
      // walkers are only re-aimed near the end of their trip (their final waypoint is what matters)
      if (a.state === 'walk' && Math.hypot(spot.x - a.x, spot.z - a.z) > 6) continue;
      const cur = this.score(a, spot.x, spot.z, agents, a.x, a.z);
      const centre = this.centred(tank, spot.x, spot.z);
      if (import.meta.env.DEV) this.debug.push([a.id, +cur.occ.toFixed(3), +cur.crowd.toFixed(2), false]);
      if (cur.occ < OCC_T && cur.crowd < 0.5 && !centre) continue;
      const best = this.bestSpot(a, tank, agents, reach);
      const curScore = cur.score + (centre ? 0.4 : 0);
      if (!best || best.score > curScore - 0.25 || Math.hypot(best.x - spot.x, best.z - spot.z) < 0.2) {
        this.cool.set(a.id, this.t + COOLDOWN * 0.5);
        continue;
      }
      if (this.moveTo(a, best.x, best.z, reach)) {
        moves++;
        if (import.meta.env.DEV) this.debug.push([a.id, +this.occlusion(best.x, best.z, a.height).toFixed(3), -1, true]);
      }
      this.cool.set(a.id, this.t + COOLDOWN);
    }
    if (this.cool.size > 200) for (const [id, until] of this.cool) if (until < this.t) this.cool.delete(id);
  }

  /** Is (x, z) within the dead-centre band in front of the tank? */
  private centred(tank: Tank, x: number, z: number): boolean {
    const p = tank.placement;
    const fp = tankFootprint(tank.tierId, p);
    const lat = (x - p.x) * Math.cos(p.rotY) - (z - p.z) * Math.sin(p.rotY);
    const fwd = (x - p.x) * Math.sin(p.rotY) + (z - p.z) * Math.cos(p.rotY);
    return fwd > fp.hz && Math.abs(lat) < CENTRE * fp.hx;
  }

  /** Largest fraction of any exhibit's screen rect covered by a person standing at (x, z). */
  private occlusion(x: number, z: number, h: number): number {
    let occ = 0;
    for (let i = 0; i < this.nRects; i++) occ = Math.max(occ, personCoverage(this.cam!, this.rects[i], x, z, h));
    return occ;
  }

  private score(a: VisitorAgent, x: number, z: number, agents: VisitorAgent[], fromX: number, fromZ: number): { score: number; occ: number; crowd: number } {
    const occ = this.occlusion(x, z, Number.isFinite(a.height) ? a.height : 1.7);
    let crowd = 0;
    for (const o of agents) {
      if (o === a || o.state === 'leave') continue;
      let ox: number;
      let oz: number;
      if (o.state === 'sit' && o.seat) {
        ox = o.seat.x;
        oz = o.seat.z;
      } else if (o.state === 'view') {
        ox = o.x;
        oz = o.z;
      } else {
        const e = o.path?.[o.path.length - 1];
        if (!e || !o.targetTankId) continue;
        ox = e.x;
        oz = e.z;
      }
      const d = Math.hypot(ox - x, oz - z);
      if (d < SPACING) crowd += (SPACING - d) / SPACING;
    }
    const walk = Math.hypot(x - fromX, z - fromZ);
    return { score: occ * 8 + crowd * 2.5 + walk * 0.22, occ, crowd };
  }

  private bestSpot(a: VisitorAgent, tank: Tank, agents: VisitorAgent[], reach: Reachability): { x: number; z: number; score: number } | null {
    const p = tank.placement;
    const fp = tankFootprint(tank.tierId, p);
    const fx = Math.sin(p.rotY);
    const fz = Math.cos(p.rotY);
    const lx = Math.cos(p.rotY);
    const lz = -Math.sin(p.rotY);
    const hx = fp.hx;
    let best: { x: number; z: number; score: number } | null = null;
    const tryAt = (lat: number, dist: number, penalty: number) => {
      const x = p.x + fx * (fp.hz + dist) + lx * lat;
      const z = p.z + fz * (fp.hz + dist) + lz * lat;
      if (!isWalkable(reach.grid, x, z)) return;
      const s = this.score(a, x, z, agents, a.x, a.z);
      const sc = s.score + penalty;
      if (!best || sc < best.score) best = { x, z, score: sc };
    };
    const front = a.kid ? [0.28, 0.45, 0.65] : [0.45, 0.7, 0.95];
    // off to either side of the glass (never dead centre: that is where the camera looks in)
    for (const f of [0.42, 0.62, 0.82]) for (const sgn of [-1, 1]) for (const d of front) tryAt(sgn * f * hx, d, 0);
    // beside the ends of the tank, looking along the glass at an angle
    for (const e of [0.32, 0.6, 0.95, 1.3]) for (const sgn of [-1, 1]) for (const d of [0.05, 0.3, 0.6]) tryAt(sgn * (hx + e), d, 0.05 + e * 0.12);
    return best;
  }

  private moveTo(a: VisitorAgent, x: number, z: number, reach: Reachability): boolean {
    if (a.state === 'view') {
      if (lineOfSight(reach.grid, { x: a.x, z: a.z }, { x, z })) a.path = [{ x, z }];
      else {
        const p = findPath(reach.grid, { x: a.x, z: a.z }, { x, z });
        if (!p) return false;
        p.push({ x, z });
        a.path = p;
      }
      a.pathIdx = 0;
      a.state = 'walk';
      return true;
    }
    // walking: re-aim the end of the trip
    const n = a.path.length;
    const prev = n >= 2 ? a.path[n - 2] : { x: a.x, z: a.z };
    if (n >= 1 && lineOfSight(reach.grid, prev, { x, z })) {
      a.path[n - 1] = { x, z };
      if (a.pathIdx > n - 1) a.pathIdx = n - 1;
      return true;
    }
    const p = findPath(reach.grid, { x: a.x, z: a.z }, { x, z });
    if (!p) return false;
    p.push({ x, z });
    a.path = p;
    a.pathIdx = 0;
    return true;
  }
}

function spotOf(a: VisitorAgent): { x: number; z: number } | null {
  if (a.state === 'view') return { x: a.x, z: a.z };
  const e = a.path?.[a.path.length - 1];
  return e ?? null;
}
