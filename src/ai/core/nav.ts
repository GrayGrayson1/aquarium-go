/**
 * Navigation helpers: zone bands, goal sampling (never inside decor), anchors & claims, neighbours, food lookup.
 * OWNER: lane "behavior".
 */
import * as THREE from 'three';
import type { ActivityZone, FoodParticle } from '@/types';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import { type Anchor, type AnchorKind, colliderSdf, colliderNormal, floorAt, pointFree, SURF_DECOR, SURF_FLOOR, SURF_GLASS, groundHeightAt } from './env';
import { clamp, lerp, rnd, rrange } from './math';

const ZONE_BANDS: Record<ActivityZone, [number, number]> = {
  surface: [0.84, 0.97],
  upper: [0.62, 0.9],
  middle: [0.34, 0.7],
  lower: [0.12, 0.42],
  bottom: [0.02, 0.18],
  substrate: [0.0, 0.08],
  glass: [0.1, 0.9],
  decor: [0.08, 0.6],
  all: [0.05, 0.95],
};

/** Half-extents in metres. */
export const bodyHX = (a: Agent) => a.set.body.hx * a.L;
export const bodyHY = (a: Agent) => a.set.body.hy * a.L;
export const bodyHZ = (a: Agent) => a.set.body.hz * a.L;
export const bodySide = (a: Agent) => Math.max(a.set.body.hy, a.set.body.hz) * a.L;

/** Compute the vertical preference band (absolute y) from the species' activity zones. */
export function computeZoneBand(a: Agent, w: AIWorld): void {
  const env = w.env;
  const zones = a.sp.activityZone?.length ? a.sp.activityZone : (['middle'] as ActivityZone[]);
  let lo = 1;
  let hi = 0;
  for (const z of zones) {
    const b = ZONE_BANDS[z] ?? ZONE_BANDS.middle;
    lo = Math.min(lo, b[0]);
    hi = Math.max(hi, b[1]);
  }
  if (hi <= lo) {
    lo = 0.2;
    hi = 0.8;
  }
  const col = env.surfaceY - env.floorY;
  const m = bodySide(a) + 0.008;
  a.zoneY0 = clamp(env.floorY + lo * col, env.floorY + m, env.surfaceY - m);
  a.zoneY1 = clamp(env.floorY + hi * col, a.zoneY0 + 0.001, env.surfaceY - m);
  if (a.zoneY1 - a.zoneY0 < a.L * 0.6) {
    const mid = (a.zoneY0 + a.zoneY1) / 2;
    a.zoneY0 = clamp(mid - a.L * 0.3, env.floorY + m, env.surfaceY - m);
    a.zoneY1 = clamp(mid + a.L * 0.3, a.zoneY0 + 0.001, env.surfaceY - m);
  }
}

export interface SwimPointOpts {
  y0?: number;
  y1?: number;
  /** Stay within this radius of a centre (home range). */
  near?: THREE.Vector3;
  radius?: number;
  /** -1 back … +1 front preference. */
  zPref?: number;
  /** Extra clearance from decor. */
  clear?: number;
}

/** Random free swim point in the preferred zone. Always returns a valid point (falls back to a safe spot). */
export function randomSwimPoint(a: Agent, w: AIWorld, out: THREE.Vector3, o: SwimPointOpts = {}): THREE.Vector3 {
  const env = w.env;
  const mx = bodyHX(a) + 0.012;
  const mz = Math.min(bodyHX(a), (env.maxZ - env.minZ) * 0.3) + 0.01;
  const y0 = o.y0 ?? a.zoneY0;
  const y1 = o.y1 ?? a.zoneY1;
  const rad = bodySide(a) + (o.clear ?? 0.01);
  const zPref = clamp(o.zPref ?? a.zBias, -1, 1);
  for (let i = 0; i < 24; i++) {
    let x: number;
    let z: number;
    if (o.near) {
      const r = (o.radius ?? 0.1) * Math.sqrt(rnd(a));
      const th = rnd(a) * Math.PI * 2;
      x = o.near.x + Math.cos(th) * r;
      z = o.near.z + Math.sin(th) * r * 0.7;
    } else {
      x = rrange(a, env.minX + mx, env.maxX - mx);
      // bias depth: bold toward the front glass, shy toward the back
      const u = rnd(a);
      const biased = zPref >= 0 ? Math.pow(u, 1 / (1 + zPref * 1.6)) : 1 - Math.pow(1 - u, 1 / (1 - zPref * 1.6));
      z = lerp(env.minZ + mz, env.maxZ - mz, biased);
    }
    x = clamp(x, env.minX + mx, env.maxX - mx);
    z = clamp(z, env.minZ + mz, env.maxZ - mz);
    let y = o.near && o.y0 === undefined ? clamp(o.near.y + rrange(a, -1, 1) * (o.radius ?? 0.1) * 0.5, y0, y1) : rrange(a, y0, y1);
    y = Math.max(y, floorAt(env, x, z) + rad);
    if (y > env.surfaceY - rad) continue;
    if (pointFree(env, x, y, z, rad)) return out.set(x, y, z);
  }
  // fallback: above the tallest decor in the middle of the tank
  return out.set(0, clamp((y0 + y1) / 2, floorAt(env, 0, 0) + rad, env.surfaceY - rad), 0);
}

/** A point just outside a hard (or any) decor surface, facing mostly front/up. Returns collider index or -1. */
export function pointNearDecor(a: Agent, w: AIWorld, out: THREE.Vector3, nOut: THREE.Vector3, standoff: number, opts: { soft?: boolean; preferNear?: THREE.Vector3; maxY?: number } = {}): number {
  const cs = w.env.colliders;
  if (!cs.length) return -1;
  // weighted pick (nearer + bigger)
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (!c.hard && !opts.soft) continue;
    const ref = opts.preferNear ?? a.rt.pos;
    const d = Math.hypot(c.cx - ref.x, c.cz - ref.z);
    const score = -d * 3 + Math.log(0.001 + c.hx * c.hz) * 0.3 + rnd(a) * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best < 0) return -1;
  const c = cs[best];
  const env = w.env;
  for (let k = 0; k < 10; k++) {
    // direction: mostly front/sides/top
    const th = rrange(a, -Math.PI * 0.95, Math.PI * 0.95);
    const ph = rrange(a, -0.2, 1.0);
    const dx = Math.sin(th) * Math.cos(ph);
    const dz = Math.cos(th) * Math.cos(ph);
    const dy = Math.sin(ph);
    const px = c.cx + dx * (c.hx + 0.02);
    const py = c.cy + dy * (c.hy + 0.02);
    const pz = c.cz + dz * (c.hz + 0.02);
    colliderNormal(c, px, py, pz, nOut);
    // project to surface
    const d = colliderSdf(c, px, py, pz);
    out.set(px - nOut.x * d, py - nOut.y * d, pz - nOut.z * d);
    out.addScaledVector(nOut, standoff);
    const m = bodySide(a) + 0.004;
    if (out.x < env.minX + m || out.x > env.maxX - m || out.z < env.minZ + m || out.z > env.maxZ - m) continue;
    if (out.y < floorAt(env, out.x, out.z) + m || out.y > (opts.maxY ?? env.surfaceY - m)) continue;
    if (!pointFree(env, out.x, out.y, out.z, Math.min(standoff * 0.8, m))) continue;
    return best;
  }
  return -1;
}

/** A random point on an allowed crawl surface (floor / glass / decor), with its normal. */
export function randomSurfacePoint(a: Agent, w: AIWorld, mask: number, out: THREE.Vector3, nOut: THREE.Vector3, near?: THREE.Vector3, radius = 0.15): void {
  const env = w.env;
  const r = bodySide(a) + 0.004;
  const hy = bodyHY(a);
  const wantGlass = (mask & SURF_GLASS) !== 0 ? 0.3 : 0;
  const wantDecor = (mask & SURF_DECOR) !== 0 && env.colliders.some((c) => c.hard) ? 0.35 : 0;
  for (let i = 0; i < 12; i++) {
    const u = rnd(a);
    if (u < wantGlass) {
      // glass wall point below the waterline
      const wall = Math.floor(rnd(a) * 4);
      const y = rrange(a, env.floorY + r + 0.03, env.surfaceY - r - a.L);
      if (wall < 2) {
        const x = wall === 0 ? env.minX + hy : env.maxX - hy;
        const z = rrange(a, env.minZ + r, env.maxZ - r);
        out.set(x, y, z);
        nOut.set(wall === 0 ? 1 : -1, 0, 0);
      } else {
        const z = wall === 2 ? env.minZ + hy : env.maxZ - hy;
        const x = near ? clamp(near.x + rrange(a, -radius, radius), env.minX + r, env.maxX - r) : rrange(a, env.minX + r, env.maxX - r);
        out.set(x, y, z);
        nOut.set(0, 0, wall === 2 ? 1 : -1);
      }
      return;
    }
    if (u < wantGlass + wantDecor) {
      const idx = pointNearDecor(a, w, out, nOut, hy, { preferNear: near });
      if (idx >= 0) return;
      continue;
    }
    if (mask & SURF_FLOOR) {
      let x: number;
      let z: number;
      if (near) {
        x = near.x + rrange(a, -radius, radius);
        z = near.z + rrange(a, -radius, radius) * 0.7;
      } else {
        x = rrange(a, env.minX + r, env.maxX - r);
        z = rrange(a, env.minZ + r, env.maxZ - r);
      }
      x = clamp(x, env.minX + r, env.maxX - r);
      z = clamp(z, env.minZ + r, env.maxZ - r);
      const gy = groundHeightAt(env, x, z, (mask & SURF_DECOR) !== 0);
      if ((mask & SURF_DECOR) === 0 && !pointFree(env, x, gy + hy, z, r)) continue;
      out.set(x, gy + hy, z);
      nOut.set(0, 1, 0);
      return;
    }
  }
  const fx = clamp(a.rt.pos.x, env.minX + r, env.maxX - r);
  const fz = clamp(a.rt.pos.z, env.minZ + r, env.maxZ - r);
  out.set(fx, floorAt(env, fx, fz) + hy, fz);
  nOut.set(0, 1, 0);
}

// ───────────────────────────── anchors ─────────────────────────────

export function anchorFree(w: AIWorld, an: Anchor): boolean {
  return (w.claims.get(an.key) ?? 0) < an.capacity;
}

export function releaseAnchor(a: Agent, w: AIWorld): void {
  if (!a.anchorKey) return;
  const n = (w.claims.get(a.anchorKey) ?? 1) - 1;
  if (n <= 0) w.claims.delete(a.anchorKey);
  else w.claims.set(a.anchorKey, n);
  a.anchorKey = null;
  a.anchorDecor = null;
}

/** Claim the best free anchor among `kinds` (closer + random). Returns the anchor or null. */
export function claimAnchor(a: Agent, w: AIWorld, kinds: readonly AnchorKind[], opts: { near?: THREE.Vector3; maxDist?: number; avoidKey?: string | null; minRise?: number } = {}): Anchor | null {
  let best: Anchor | null = null;
  let bestScore = -Infinity;
  const ref = opts.near ?? a.rt.pos;
  for (const k of kinds) {
    const list = w.env.byKind[k];
    if (!list) continue;
    for (const an of list) {
      if (an.key !== a.anchorKey && !anchorFree(w, an)) continue;
      if (opts.avoidKey && an.key === opts.avoidKey) continue;
      if (opts.minRise !== undefined && an.pos.y - floorAt(w.env, an.pos.x, an.pos.z) < opts.minRise) continue;
      const d = an.pos.distanceTo(ref);
      if (opts.maxDist !== undefined && d > opts.maxDist) continue;
      const score = -d * 4 + rnd(a) * 1.2 + (an.key === a.anchorKey ? 0.8 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = an;
      }
    }
  }
  if (best) {
    if (best.key !== a.anchorKey) {
      releaseAnchor(a, w);
      a.anchorKey = best.key;
      w.claims.set(best.key, (w.claims.get(best.key) ?? 0) + 1);
    }
    a.anchorDecor = best.virtual ? null : best.decorId;
    a.anchorPos.copy(best.pos);
  }
  return best;
}

// ───────────────────────────── neighbours ─────────────────────────────

/** Fill w.nbuf with indices of agents within r of `p` (excluding `self`). Returns count. */
export function neighbors(w: AIWorld, p: THREE.Vector3, r: number, self: Agent | null): number {
  const agents = w.agents;
  const buf = w.nbuf;
  let n = 0;
  if (w.useHash) {
    const m = w.hash.gather(p.x, p.y, p.z, r, w.hbuf);
    const r2 = r * r;
    for (let k = 0; k < m && n < buf.length; k++) {
      const i = w.hbuf[k];
      const o = agents[i];
      if (!o || o === self || o.dead) continue;
      if (o.rt.pos.distanceToSquared(p) <= r2) buf[n++] = i;
    }
    return n;
  }
  const r2 = r * r;
  for (let i = 0; i < agents.length && n < buf.length; i++) {
    const o = agents[i];
    if (o === self || o.dead) continue;
    if (o.rt.pos.distanceToSquared(p) <= r2) buf[n++] = i;
  }
  return n;
}

// ───────────────────────────── food ─────────────────────────────

export function findParticle(w: AIWorld, id: number): FoodParticle | null {
  if (id < 0) return null;
  for (const p of w.food) if (p.id === id) return p.amount > 0 && !(p.fade && p.fade > 0) ? p : null;
  return null;
}

/** Mouth position of an agent (tank-local), written to out. */
export function mouthPos(a: Agent, out: THREE.Vector3): THREE.Vector3 {
  if (a.loco === 'upright') {
    // seahorse snout: forward of the head, near the top of the body
    return out.copy(a.rt.pos).addScaledVector(a.fwd, a.L * 0.26).addScaledVector(a.up, a.L * 0.3);
  }
  return out.copy(a.rt.pos).addScaledVector(a.fwd, a.L * a.set.body.hx * 0.95);
}
