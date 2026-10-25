/**
 * Chunk 16, wave B — reef fish that live on and around the rock (lane "behavior"): perches on rock and glass (lawnmower
 * blenny, flame hawkfish), a home patch defended against intruders (yellowtail damsel, German blue ram, the blenny
 * against other blennies), and the ram's pair. Shared helpers for acts.ts and brain.ts; the activities themselves are in
 * acts.ts (perch, graze, host, chase).
 */
import * as THREE from 'three';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import type { Anchor, AnchorKind } from './env';
import { colliderNormal, colliderSdf, floorAt, pointFreeExcept, restingGap } from './env';
import { bodyHX, bodySide } from './nav';
import { clamp01, rnd, rrange } from './math';
import { overRock } from './rockshape';

const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Vector3();
const _bn = new THREE.Vector3();
const _bc = new THREE.Vector3();
const _xz = [0, 0];

/** How far inside its rock's collider box the last perch findPerch chose lies (0: on the box, or on the glass). */
export let perchGap = 0;

export interface PerchOpts {
  /** Lowest surface normal y to sit on (1 = only flat tops, 0 = vertical faces too, below 0 = overhangs). */
  minNy: number;
  /** Search around this point, preferring perches within `radius` of it (m)… */
  near: THREE.Vector3;
  radius: number;
  /** …but at least this far from it (a hop to another perch, not the same one). */
  minDist: number;
  /** Chance a candidate is on a pane of glass. */
  glass: number;
  /** Weight for height in the tank (positive: high perches; negative: low ones). */
  high: number;
  /** Weight for sitting at the rim of a rock's top (hawkfish). */
  edge: number;
  tries: number;
}

/**
 * A perch for a fish that sits on a surface: writes the body centre (just off the rock or pane, the body's half-height
 * clear of it) and the surface normal. Returns the rock's decor id ('' for the glass), or null when nothing fits. The
 * candidates are scored (near `near`, the species' height and edge preferences, not where another animal sits) and the
 * best is kept.
 */
export function findPerch(a: Agent, w: AIWorld, out: THREE.Vector3, nOut: THREE.Vector3, o: PerchOpts): string | null {
  const env = w.env;
  const L = a.L;
  const side = bodySide(a);
  const hx = bodyHX(a);
  const standoff = side + 0.002;
  const col = Math.max(0.05, env.surfaceY - env.floorY);
  const cs = env.colliders;
  let best: string | null = null;
  let bestScore = -Infinity;
  let bestGap = 0;
  for (let t = 0; t < o.tries; t++) {
    let decor = '';
    let edge = 0;
    let gapHere = 0;
    if (rnd(a) < o.glass || !cs.length) {
      // a pane: mostly the back or an end, now and then the front
      const r = rnd(a);
      const y = rrange(a, env.floorY + hx + 0.012, env.floorY + col * 0.7);
      if (r < 0.45) {
        _n.set(0, 0, 1);
        _c.set(rrange(a, env.minX + hx + 0.01, env.maxX - hx - 0.01), y, env.minZ + standoff);
      } else if (r < 0.85) {
        const s = rnd(a) < 0.5 ? 1 : -1;
        _n.set(s, 0, 0);
        _c.set(s > 0 ? env.minX + standoff : env.maxX - standoff, y, rrange(a, env.minZ + hx + 0.01, env.maxZ - hx - 0.01));
      } else {
        _n.set(0, 0, -1);
        _c.set(rrange(a, env.minX + hx + 0.01, env.maxX - hx - 0.01), y, env.maxZ - standoff);
      }
    } else {
      // a point on a rock: a random direction from its centre (up to the top, round the sides) projected onto it
      const c = cs[Math.floor(rnd(a) * cs.length) % cs.length];
      if (!c.hard || c.category === 'unknown' || c.part === 'base') continue;
      let px: number;
      let py: number;
      let pz: number;
      if (c.shape && rnd(a) < 0.6) {
        // over the top of one of the rock's drawn parts (rockshape.ts): where there is rock to sit on
        overRock(c.shape, rnd(a), rnd(a), rnd(a), _xz);
        px = _xz[0];
        py = c.cy + c.hy + 0.02;
        pz = _xz[1];
      } else {
        const th = rnd(a) * Math.PI * 2;
        const dy = rrange(a, Math.max(-0.2, o.minNy - 0.25), 1);
        const h = Math.sqrt(Math.max(0, 1 - dy * dy));
        px = c.cx + Math.cos(th) * h * (c.hx + 0.02);
        py = c.cy + dy * (c.hy + 0.02);
        pz = c.cz + Math.sin(th) * h * (c.hz + 0.02);
      }
      colliderNormal(c, px, py, pz, _n);
      const d = colliderSdf(c, px, py, pz);
      _s.set(px - _n.x * d, py - _n.y * d, pz - _n.z * d);
      // on the rock as drawn, not on the box round it (rockshape.ts): a perch over nothing (off the flank of a dome,
      // over the open middle of an arch) is no perch; else the fish sits that much further in (its rock let through)
      const gap = restingGap(c, _s.x, _s.y, _s.z, _n.x, _n.y, _n.z, hx * 0.5, side * 0.8);
      if (!Number.isFinite(gap)) continue;
      gapHere = gap;
      _c.copy(_s).addScaledVector(_n, standoff - gap);
      decor = c.decorId;
      edge = _n.y > 0.6 ? clamp01(Math.max(Math.abs(_s.x - c.cx) / c.hx, Math.abs(_s.z - c.cz) / c.hz)) : 0;
    }
    if (_n.y < o.minNy) continue;
    // the whole body in the water and inside the glass: lying along a top, or head-up along a steep face
    const face = _n.y < 0.6;
    // (along a face the body points up it, so it reaches out sideways less than lying along a top)
    const reachH = (face ? hx * 0.6 : hx * 0.75) + 0.004;
    const mx = Math.abs(_n.x) > 0.9 ? standoff : reachH;
    const mz = Math.abs(_n.z) > 0.9 ? standoff : reachH;
    if (_c.x < env.minX + mx - 1e-6 || _c.x > env.maxX - mx + 1e-6 || _c.z < env.minZ + mz - 1e-6 || _c.z > env.maxZ - mz + 1e-6) continue;
    const up = face ? hx * 0.85 : side;
    if (_c.y + up > env.surfaceY - 0.008 || _c.y - (face ? hx * 0.85 : 0) < floorAt(env, _c.x, _c.z) + side * 0.9) continue;
    if (!pointFreeExcept(env, _c.x, _c.y, _c.z, side * 0.85, decor || null)) continue;
    if (face && !pointFreeExcept(env, _c.x, _c.y + hx * 0.75, _c.z, side * 0.5, decor || null)) continue;
    const dn = _c.distanceTo(o.near);
    if (dn < o.minDist) continue;
    let score = -Math.max(0, dn - o.radius) / Math.max(0.02, o.radius) * 2 - (dn / Math.max(0.02, o.radius)) * 0.3;
    score += o.high * clamp01((_c.y - env.floorY) / col) + o.edge * edge + rnd(a) * 0.35;
    // not where another animal already sits
    for (const q of w.agents) if (q !== a && !q.dead && q.rt.pos.distanceTo(_c) < (q.L + L) * 0.45) score -= 2;
    if (score > bestScore) {
      bestScore = score;
      best = decor;
      bestGap = gapHere;
      _bc.copy(_c);
      _bn.copy(_n);
    }
  }
  if (best !== null) {
    out.copy(_bc);
    nOut.copy(_bn);
    perchGap = bestGap;
  }
  return best;
}

/** Is anyone else sitting at (or making for) this perch? */
export function perchTaken(a: Agent, w: AIWorld, p: THREE.Vector3): boolean {
  for (const q of w.agents) {
    if (q === a || q.dead) continue;
    if (q.rt.pos.distanceTo(p) < (q.L + a.L) * 0.45) return true;
    if (q.act === 'perch' && q.actData.distanceTo(p) < (q.L + a.L) * 0.45) return true;
  }
  return false;
}

/**
 * A ram's mate: its breeding partner if the breeding module has paired it, else the opposite-sex adult of its species it
 * pairs with by order (the males and the females each counted in id order, the first with the first). Null: none.
 */
export function mateOf(a: Agent, w: AIWorld): Agent | null {
  if (a.partnerId) {
    const p = w.byId.get(a.partnerId);
    if (p && !p.dead) return p;
  }
  const sex = a.c.sex;
  if (a.juvenile || (sex !== 'male' && sex !== 'female')) return null;
  const other = sex === 'male' ? 'female' : 'male';
  let rank = 0;
  for (const o of w.agents) if (o !== a && !o.dead && !o.juvenile && o.speciesId === a.speciesId && o.c.sex === sex && o.id < a.id) rank++;
  // the opposite-sex adult with exactly `rank` others before it
  for (const o of w.agents) {
    if (o.dead || o.juvenile || o.speciesId !== a.speciesId || o.c.sex !== other) continue;
    let k = 0;
    for (const q of w.agents) if (q !== o && !q.dead && !q.juvenile && q.speciesId === a.speciesId && q.c.sex === other && q.id < o.id) k++;
    if (k === rank) return o;
  }
  return null;
}

/**
 * The fish a territorial animal would chase off now (null: none): within its territory (territoryBL body lengths of
 * its home); a blenny only minds other blennies; a damsel or a ram any fish not much bigger than itself (its own kind
 * only when it crowds right in — a loose group shares the rock), never its mate, nor one asleep or in the sand. A ram
 * minds only fish that come right down to its patch of the bed.
 */
export function intruder(a: Agent, w: AIWorld): Agent | null {
  const env = w.env;
  const ram = a.setId === 'cichlid_dwarf';
  const R = (a.set.territoryBL ?? 4) * a.L * (ram ? 0.6 : 1);
  const c = a.hasHome ? a.home : a.rt.pos;
  // (only while it is about its home itself)
  if (a.rt.pos.distanceTo(c) > R * 2) return null;
  const mate = ram ? mateOf(a, w) : null;
  const lowY = env.floorY + (env.surfaceY - env.floorY) * 0.3;
  let best: Agent | null = null;
  let bestD = Infinity;
  for (const o of w.agents) {
    if (o === a || o === mate || o.dead || o.loco !== 'swim' || o.set.ignoreFish || o.sp.category !== 'fish') continue;
    if (o.act === 'sleep' || o.buried > 0.5) continue;
    if (ram && o.rt.pos.y > lowY) continue;
    let r = R;
    if (a.set.chases === 'kin') {
      if (o.setId !== a.setId) continue;
    } else {
      if (o.L > a.L * 1.8) continue;
      if (o.speciesId === a.speciesId) r = R * 0.45;
    }
    const d = o.rt.pos.distanceTo(c);
    if (d < r && d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

/**
 * A home patch for a damsel or a ram: a free anchor of `kinds` (a ram's low, near the bed), near where it is, away from
 * the homes others of its kind already hold (each damsel its own patch). Null when the tank has none free.
 */
export function choosePatch(a: Agent, w: AIWorld, kinds: readonly AnchorKind[]): Anchor | null {
  const env = w.env;
  const col = Math.max(0.05, env.surfaceY - env.floorY);
  const R = (a.set.territoryBL ?? 4) * a.L;
  const ram = a.setId === 'cichlid_dwarf';
  let best: Anchor | null = null;
  let bestScore = -Infinity;
  for (const k of kinds) {
    for (const an of env.byKind[k] ?? []) {
      if (an.live || (w.claims.get(an.key) ?? 0) >= an.capacity) continue;
      let s = -an.pos.distanceTo(a.rt.pos) * 2 + rnd(a) * 0.5;
      if (ram) s -= clamp01((an.pos.y - floorAt(env, an.pos.x, an.pos.z)) / col) * 3;
      for (const o of w.agents) {
        if (o === a || o.dead || o.setId !== a.setId || !o.hasHome) continue;
        if (ram && mateOf(a, w) === o) continue;
        const d = o.home.distanceTo(an.pos);
        if (d < R) s -= 3 * (1 - d / R);
      }
      if (s > bestScore) {
        bestScore = s;
        best = an;
      }
    }
  }
  return best;
}
