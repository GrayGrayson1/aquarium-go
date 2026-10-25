/**
 * Chunk 16 — a living anemone (behaviour set 'anemone': the bubble-tip anemone, Entacmaea quadricolor). OWNER: lane
 * "behavior".
 *
 * It holds on with its foot (a flat-body crawler: loco.ts projectFlat) and wanders until it finds a spot it likes — its
 * foot on rock, ideally wedged into a crevice, its crown up in the light, clear of the pumps and of other anemones — then
 * stays there for good (`a.settled`). Where it wants to go is chosen from a stream keyed by the creature and the tank
 * layout (never the agent's own rng), so it is the same spot every time the tank is loaded: an anemone that has been in
 * the tank a while is placed straight on it, settled; a new one creeps there from where it was put down.
 *
 * Clownfish host in it as in a bubble-tip anemone decor piece: every living anemone carries a 'host' anchor (capacity 2)
 * at its crown, in env.byKind.host, keyed `live:<creature id>`, with decorId = the creature id — the same rule that one
 * clownfish species owns an anemone applies (acts.ts ensureHome / otherClownHost). The anchor moves with the anemone; the
 * clownfish that host in it follow it (acts.ts hostTick / restTick). Fish that are not clownfish keep a little way off
 * its crown: it stings (loco.ts avoidance).
 *
 * What the renderer can rely on (CreatureRuntime), written every frame:
 *  - `rt.ai.closed` 0..1 — how far the crown has pulled in (0 open; ~0.65 at night; 1 when disturbed; ~0.35 while it
 *    creeps; ~0.55 while it takes food).
 *  - `rt.ai.deflate` 0..1 — the slow deflate-and-refill it does every several minutes (0 = full).
 *  - `rt.ai.settled` 1 once it has settled, else 0.
 *  - `rt.pose`: 'hiding' while closed more than half, 'rest' otherwise ('dead' when dead).
 *  - orientation: local +Y = the normal of the surface its foot holds (as every crawler).
 */
import * as THREE from 'three';
import type { Agent } from './agent';
import type { AIWorld } from './world';
import type { Anchor } from './env';
import { colliderNormalGrounded, colliderSdfGrounded, drawnDepth, floorAt, floorNormalAt, makeHit, nearestSurface, restingGap, surfaceId, SURF_ALL } from './env';
import { clamp, clamp01, damp, hashString, rdur, rnd, rrange, smoothstep, type HasRng } from './math';
import { overRock } from './rockshape';

const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Vector3();
const _best = new THREE.Vector3();
const _bestN = new THREE.Vector3();
const _site: HasRng = { rs: 1 };

export const isAnemone = (a: Agent) => !!a.set.anemone;

/** Where clownfish nestle: just above the middle of the oral disc. */
export function crownPos(a: Agent, out: THREE.Vector3): THREE.Vector3 {
  return out.copy(a.rt.pos).addScaledVector(a.upVis, a.L * 0.1);
}

/** Radius of the spread crown (m). */
export const crownR = (a: Agent) => Math.max(a.set.body.hx, a.set.body.hz) * a.L;

// ───────────────────────────── host anchors ─────────────────────────────

/**
 * Keep the living anemones' host anchors in step with the agents: one per live anemone in env.byKind.host (a decor
 * rebuild empties byKind), none for one that is gone or dead — its clownfish lose their home and look for another.
 * Also refreshes `w.anemones`. Cheap: run on every sync.
 */
export function syncLiveHosts(w: AIWorld): void {
  const env = w.env;
  w.anemones.length = 0;
  for (const a of w.agents) if (a.set.anemone && !a.dead) w.anemones.push(a);
  // drop the anchors of anemones that are gone
  for (let i = w.liveAnchors.length - 1; i >= 0; i--) {
    const an = w.liveAnchors[i];
    const o = w.byId.get(an.live!);
    if (o && o.set.anemone && !o.dead) continue;
    w.liveAnchors.splice(i, 1);
    const k = env.byKind.host.indexOf(an);
    if (k >= 0) env.byKind.host.splice(k, 1);
    w.claims.delete(an.key);
    for (const f of w.agents) {
      if (f.anchorKey === an.key) {
        f.anchorKey = null;
        f.anchorDecor = null;
      }
      if (f.homeDecor === an.decorId) {
        f.hasHome = false;
        f.homeDecor = null;
        f.actDur = Math.min(f.actDur, f.actT + 0.1);
      }
      if (f.actTarget === an.decorId) f.actDur = Math.min(f.actDur, f.actT + 0.1);
    }
  }
  // one for each live anemone, listed among the tank's host anchors
  for (const a of w.anemones) {
    let an = w.liveAnchors.find((x) => x.live === a.id);
    if (!an) {
      an = { key: `live:${a.id}`, decorId: a.id, kind: 'host', pos: new THREE.Vector3(), capacity: 2, live: a.id };
      w.liveAnchors.push(an);
    }
    crownPos(a, an.pos);
    if (!env.byKind.host.includes(an)) env.byKind.host.push(an);
  }
  env.hasHost = env.byKind.host.length > 0;
}

/** Move the living hosts' anchors with their anemones (at the end of every step: the fish read them in the next). */
export function updateLiveHosts(w: AIWorld): void {
  for (const an of w.liveAnchors) {
    const o = w.byId.get(an.live!);
    if (o) crownPos(o, an.pos);
  }
}

/** If `decorId` is a living anemone's anchor id, write its crown position into `out` and return true. */
export function liveHostPos(w: AIWorld, decorId: string | null, out: THREE.Vector3): boolean {
  if (!decorId || !w.liveAnchors.length) return false;
  for (const an of w.liveAnchors) {
    if (an.decorId !== decorId) continue;
    out.copy(an.pos);
    return true;
  }
  return false;
}

/** A living host anchor that is free (and not the home of another clownfish species), if any. */
export function freeLiveHost(a: Agent, w: AIWorld, avoidDecor: string | null): Anchor | null {
  for (const an of w.liveAnchors) {
    if (an.decorId === avoidDecor) continue;
    if ((w.claims.get(an.key) ?? 0) < an.capacity) return an;
  }
  return null;
}

// ───────────────────────────── where it likes to be ─────────────────────────────

/** How far a flat disc (normal n, half-thickness s, radius R) reaches toward a plane with unit normal (mx, my, mz). */
function reach(n: THREE.Vector3, mx: number, my: number, mz: number, s: number, R: number): number {
  const c = n.x * mx + n.y * my + n.z * mz;
  return s * Math.abs(c) + R * Math.sqrt(Math.max(0, 1 - c * c));
}

/**
 * Does the anemone fit with its body centre at `p`, foot on the surface with normal `n` (`own`: the collider it holds,
 * -1 floor/glass)? The whole crown inside the glass, under the water (with room for the tentacles), clear of the bed and
 * of every rock but the one it holds.
 */
function fits(a: Agent, w: AIWorld, p: THREE.Vector3, n: THREE.Vector3, own: number): boolean {
  const env = w.env;
  const s = a.set.body.hy * a.L;
  const R = crownR(a);
  const tol = 0.002;
  if (p.x - reach(n, 1, 0, 0, s, R) < env.minX - tol || p.x + reach(n, 1, 0, 0, s, R) > env.maxX + tol) return false;
  if (p.z - reach(n, 0, 0, 1, s, R) < env.minZ - tol || p.z + reach(n, 0, 0, 1, s, R) > env.maxZ + tol) return false;
  if (p.y + reach(n, 0, 1, 0, s, R) + a.L * 0.25 > env.surfaceY) return false;
  floorNormalAt(env, p.x, p.z, _m);
  if (p.y - floorAt(env, p.x, p.z) < reach(n, _m.x, _m.y, _m.z, s, R) * _m.y - tol) return false;
  const cs = env.colliders;
  for (let i = 0; i < cs.length; i++) {
    if (i === own) continue;
    const c = cs[i];
    if (!c.hard) continue;
    if (Math.abs(p.x - c.cx) > c.hx + R * 1.5 || Math.abs(p.y - c.cy) > c.hy + R * 1.5 || Math.abs(p.z - c.cz) > c.hz + R * 1.5) continue;
    const d = colliderSdfGrounded(c, p.x, p.y, p.z);
    colliderNormalGrounded(c, p.x, p.y, p.z, _m);
    // (a neighbouring rock counts as drawn, not as its box — rockshape.ts — or every spot in a packed ridge is "in" one)
    const deeper = drawnDepth(c, p.x, p.y, p.z);
    if (!Number.isFinite(deeper)) continue;
    if (d < reach(n, _m.x, _m.y, _m.z, s, R) - tol - deeper) return false;
  }
  return true;
}

/**
 * How much the anemone likes a spot (body centre `p`, surface normal `n`, holding collider `own` or the floor (-2) or a
 * pane (-3)): light (high in the tank, the crown facing up, nothing overhead), its foot on rock — best wedged into a
 * crevice — and away from the pumps, the corals, the other anemones and the front glass.
 */
export function siteScore(a: Agent, w: AIWorld, p: THREE.Vector3, n: THREE.Vector3, own: number, gap = 0): number {
  const env = w.env;
  const L = a.L;
  const s = a.set.body.hy * L;
  const R = crownR(a);
  const col = Math.max(0.05, env.surfaceY - env.floorY);
  let light = clamp01((p.y - env.floorY) / col) * (0.45 + 0.55 * clamp01(n.y + 0.25));
  const cs = env.colliders;
  // shaded: a rock or ledge over the crown
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (i === own || !c.hard || c.category === 'unknown') continue;
    if (Math.abs(p.x - c.cx) < c.hx + R * 0.3 && Math.abs(p.z - c.cz) < c.hz + R * 0.3 && c.cy - c.hy > p.y + s) {
      light *= 0.35;
      break;
    }
  }
  let score = light * 2.2;
  // (its foot well down inside the rock's box — on the flank of a dome, low on an arch — is a less sure hold)
  score -= Math.min(2, gap / (0.25 * L)) * 0.4;
  // what the foot holds
  if (own >= 0 && own < cs.length) {
    const cat = cs[own].category;
    score += cat === 'hardscape' ? 1.2 : cat === 'ornament' ? 0.6 : cat === 'coral' ? 0.1 : 0;
  } else if (own === -2) score += env.sandBed ? 0.25 : 0.1;
  else score -= own === -6 ? 1.1 : 0.5; // glass (the front pane, -6, least of all)
  // a crevice: another surface right by the foot (a second rock, the bed at a rock's foot, the glass)
  const fx = p.x - n.x * s;
  const fy = p.y - n.y * s;
  const fz = p.z - n.z * s;
  let near = Infinity;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (i === own || !c.hard || c.category === 'unknown') continue;
    if (Math.abs(fx - c.cx) > c.hx + L || Math.abs(fy - c.cy) > c.hy + L || Math.abs(fz - c.cz) > c.hz + L) continue;
    near = Math.min(near, colliderSdfGrounded(c, fx, fy, fz));
  }
  if (own !== -2) near = Math.min(near, fy - floorAt(env, fx, fz));
  if (own > -3) near = Math.min(near, fx - env.minX, env.maxX - fx, fz - env.minZ, env.maxZ - fz);
  if (near < L * 0.35) score += 0.9;
  else if (near < L * 0.7) score += 0.4;
  // hazards and neighbours: a pump's intake or outflow (anemones that settle there get shredded), stinging distance of
  // corals and of other anemones (living or decor)
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (i === own) continue;
    const d = Math.max(Math.abs(p.x - c.cx) - c.hx, Math.abs(p.y - c.cy) - c.hy, Math.abs(p.z - c.cz) - c.hz, 0);
    if (c.category === 'unknown' && d < 0.12) score -= 3;
    else if (c.category === 'anemone' && d < R * 1.6) score -= 1.2;
    else if (c.category === 'coral' && d < R * 0.8) score -= 0.5;
  }
  // (from the agent list: anemones added in the same sync are not in w.anemones yet)
  for (const o of w.agents) {
    if (o === a || !o.set.anemone || o.dead) continue;
    const q = o.settled || !o.hasSite ? o.rt.pos : o.site;
    if (q.distanceTo(p) < (R + crownR(o)) * 1.3) score -= 1.5;
  }
  return score;
}

/** A random candidate spot from the keyed stream: on a rock, the bed or a pane. Returns its surface (as siteScore). */
/** How far into its rock's box the last rock candidate's foot went (see candidate). */
let _candGap = 0;
/**
 * The rocks a site may be on (chooseSite fills it): only rock whose drawn shape the AI knows (rockshape.ts) — its foot
 * must be on the rock itself, not on a collider box that stands proud of it; never a coral (it would sting it), an
 * ornament, a post or a pump.
 */
const _rocks: number[] = [];
const _xz = [0, 0];
let _bestGap = 0;
let _bestOwn = -2;
/** How far into its rock's collider box the last chosen site's foot is (0 on the bed or glass), and the surface it is
 * on (as Agent.surfId: a collider, -2 the bed, -3…-6 a pane). */
let siteGap = 0;
let siteOwn = -2;

function candidate(a: Agent, w: AIWorld, out: THREE.Vector3, nOut: THREE.Vector3, onRock: boolean): number {
  const env = w.env;
  _candGap = 0;
  const s = a.set.body.hy * a.L;
  const R = crownR(a);
  const cs = env.colliders;
  const u = onRock ? 0 : 0.62 + rnd(_site) * 0.38;
  if (u < 0.62 && _rocks.length) {
    // a point on a rock: a random direction from its centre, mostly sideways or up, onto its surface
    const i = _rocks[Math.floor(rnd(_site) * _rocks.length) % _rocks.length];
    const c = cs[i];
    let px: number;
    let py: number;
    let pz: number;
    if (rnd(_site) < 0.7) {
      // over the top of one of the rock's drawn parts (a dome's crown, a piece of an arch's bridge): the box top there
      overRock(c.shape!, rnd(_site), rnd(_site), rnd(_site), _xz);
      px = _xz[0];
      py = c.cy + c.hy + 0.02;
      pz = _xz[1];
    } else {
      // anywhere round it, mostly toward the top
      const th = rnd(_site) * Math.PI * 2;
      const r = rnd(_site);
      const y = 1 - r * r * 1.15;
      const h = Math.sqrt(Math.max(0, 1 - y * y));
      px = c.cx + Math.cos(th) * h * (c.hx + 0.02);
      py = c.cy + y * (c.hy + 0.02);
      pz = c.cz + Math.sin(th) * h * (c.hz + 0.02);
    }
    colliderNormalGrounded(c, px, py, pz, nOut);
    if (nOut.y < -0.2) return -99;
    const d = colliderSdfGrounded(c, px, py, pz);
    const sx = px - nOut.x * d;
    const sy = py - nOut.y * d;
    const sz = pz - nOut.z * d;
    // its foot on the rock as drawn, not on the box round it: none there (off a dome's flank, over an arch's open
    // middle) and the spot is no good; else the foot goes in to it (rockshape.ts)
    const gap = restingGap(c, sx, sy, sz, nOut.x, nOut.y, nOut.z, a.L * 0.14, s * 0.4 + 0.01);
    if (!Number.isFinite(gap)) return -99;
    _candGap = gap;
    out.set(sx + nOut.x * (s - gap), sy + nOut.y * (s - gap), sz + nOut.z * (s - gap));
    return i;
  }
  if (u < 0.85) {
    const x = rrange(_site, env.minX + R, env.maxX - R);
    const z = rrange(_site, env.minZ + R, env.maxZ - R);
    floorNormalAt(env, x, z, nOut);
    out.set(x, floorAt(env, x, z) + s / Math.max(0.5, nOut.y), z);
    return -2;
  }
  // a pane (back, ends, front)
  const k = Math.floor(rnd(_site) * 4) % 4;
  const y = rrange(_site, env.floorY + R + 0.01, env.surfaceY - R - a.L * 0.3);
  if (k < 2) {
    nOut.set(k === 0 ? 1 : -1, 0, 0);
    out.set(k === 0 ? env.minX + s : env.maxX - s, y, rrange(_site, env.minZ + R, env.maxZ - R));
    return k === 0 ? -3 : -4;
  }
  nOut.set(0, 0, k === 2 ? 1 : -1);
  out.set(rrange(_site, env.minX + R, env.maxX - R), y, k === 2 ? env.minZ + s : env.maxZ - s);
  return k === 2 ? -5 : -6;
}

/**
 * Choose where to settle: the best of a few dozen candidate spots from a stream keyed by the creature, the tank layout
 * and how many spots it has given up on (deterministic: the same spot on every load). Writes `a.site`/`a.siteN`;
 * returns its score (-Infinity: nowhere fits).
 */
export function chooseSite(a: Agent, w: AIWorld): number {
  _site.rs = hashString(`${a.id}|site|${w.env.decorSig}|${a.siteTries}`) || 1;
  _rocks.length = 0;
  w.env.colliders.forEach((c, i) => {
    if (c.hard && c.shape && c.part === 'body') _rocks.push(i);
  });
  let best = -Infinity;
  // (most of the candidates on the rocks — few of their surface points give a foot room — the rest on the bed and panes)
  for (let i = 0; i < 144; i++) {
    const own = candidate(a, w, _p, _n, i < 112 && _rocks.length > 0);
    if (own === -99 || !fits(a, w, _p, _n, own)) continue;
    const sc = siteScore(a, w, _p, _n, own, _candGap) + rnd(_site) * 0.05;
    if (sc > best) {
      best = sc;
      _best.copy(_p);
      _bestN.copy(_n);
      _bestGap = own >= 0 ? _candGap : 0;
      _bestOwn = own;
    }
  }
  a.hasSite = best > -Infinity;
  if (a.hasSite) {
    a.site.copy(_best);
    a.siteN.copy(_bestN);
    siteGap = _bestGap;
    siteOwn = _bestOwn;
  }
  return best;
}

const _here = makeHit();

/** Score of the spot it is on now (the surface found afresh: a layout change renumbers the rocks). */
export function hereScore(a: Agent, w: AIWorld): number {
  const id = surfaceId(nearestSurface(w.env, a.rt.pos, SURF_ALL, _here));
  return siteScore(a, w, a.rt.pos, a.upVis, id === -1 ? -2 : id, id >= 0 ? a.embed : 0);
}

/**
 * The layout changed (syncWorld): a settled anemone stays where it is if it still likes it well enough; one whose rock
 * was taken away, or that is now shaded, sets off again (as does one still on its way: to a spot chosen afresh).
 */
export function anemoneLayoutChanged(a: Agent, w: AIWorld): void {
  if (!a.set.anemone || a.dead) return;
  a.siteTries = 0;
  // the rock it holds: still there, and still under its foot? (rocks are renumbered on a rebuild)
  if (a.settled && a.patchDecor !== null) {
    const id = w.env.colliders.findIndex((c) => c.decorId === a.patchDecor && c.part === 'body' && c.hard);
    const c = id >= 0 ? w.env.colliders[id] : undefined;
    const depth = c ? drawnDepth(c, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z) : Infinity;
    if (!c || !Number.isFinite(depth) || Math.abs(colliderSdfGrounded(c, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z) + depth - a.set.body.hy * a.L) > 0.02) {
      // (its rock taken away, or moved from under it: it lets go and sets off again)
      a.settled = false;
      a.surfId = -1;
      a.embed = 0;
      a.actDur = Math.min(a.actDur, a.actT + 0.1);
      chooseSite(a, w);
      return;
    }
    a.surfId = id;
  }
  const best = chooseSite(a, w);
  if (!a.hasSite) return;
  if (a.settled && hereScore(a, w) >= best - 0.6) return;
  a.settled = false;
  a.actDur = Math.min(a.actDur, a.actT + 0.1);
}

/** Game hours since this animal came into this tank (bought into it, or moved). */
function hoursInTank(a: Agent, w: AIWorld): number {
  let since = Number.isFinite(a.c.acquiredHour) ? a.c.acquiredHour : -Infinity;
  for (const e of a.c.history ?? []) if (e.kind === 'moved' && e.hour > since) since = e.hour;
  return w.env.hour - since;
}

/** An anemone that has been in the tank this long (game hours) has long since found its spot. */
const SETTLED_AFTER_H = 8;

/**
 * Placement (brain.ts initialPlacement, after the generic placement): a remounted tank keeps it where it was; one that
 * has been in the tank a while is put straight on its spot, settled; a new arrival stays where it was put down and
 * creeps off to its spot — unless it already likes where it is.
 */
export function anemonePlace(a: Agent, w: AIWorld, kept: boolean): void {
  a.hasSite = false;
  a.siteTries = 0;
  a.closed = 0.25;
  a.deflate = 0;
  a.deflatePh = -1;
  a.deflateT = w.time + rrange(a, 60, 420);
  if (kept && a.rt.ai.settled === 1) {
    const hit = nearestSurface(w.env, a.rt.pos, a.set.crawlMask, _hh);
    a.surfId = surfaceId(hit);
    if (a.surfId >= 0) {
      const c = w.env.colliders[a.surfId];
      const dd = drawnDepth(c, a.rt.pos.x, a.rt.pos.y, a.rt.pos.z);
      a.embed = Number.isFinite(dd) ? dd : 0;
    }
    hold(a, w);
    return;
  }
  a.settled = false;
  // a clone just split off its parent (the sim's fission) starts right beside the parent's crown, on the same rock
  const cloned = !kept && besideParent(a, w);
  const best = chooseSite(a, w);
  if (!a.hasSite) {
    if (settleHere(a, w)) hold(a, w);
    return;
  }
  if (!cloned && hoursInTank(a, w) > SETTLED_AFTER_H) {
    a.rt.pos.copy(a.site);
    a.surfN.copy(a.siteN);
    a.upVis.copy(a.siteN);
    // (its foot straight on the rock as drawn — rockshape.ts — holding that very surface: in a packed ridge of rock the
    // nearest collider box is often a neighbour's)
    a.surfId = siteOwn;
    a.surfPrev = -1;
    a.surfT = w.time;
    a.embed = siteGap;
    a.fwd.set(1, 0, 0).addScaledVector(a.siteN, -a.siteN.x);
    if (a.fwd.lengthSq() < 1e-6) a.fwd.set(0, 0, 1).addScaledVector(a.siteN, -a.siteN.z);
    a.fwd.normalize();
    hold(a, w);
    return;
  }
  // (it may already be somewhere it likes about as well — if its foot is really on something there: it stays put for
  // good once settled, so where the generic placement put it must be on the rock as drawn, the bed or a pane)
  if (hereScore(a, w) >= best - 0.3 && settleHere(a, w)) hold(a, w);
}

const _hh = makeHit();

/** Settled: remember the rock it holds (Agent.patchDecor; null on the bed or a pane), for a layout change. */
function hold(a: Agent, w: AIWorld): void {
  a.settled = true;
  a.patchDecor = a.surfId >= 0 && a.surfId < w.env.colliders.length ? w.env.colliders[a.surfId].decorId : null;
}

/**
 * Take hold of the surface under it where it was put down: its id, its normal, and its foot in to the rock as drawn
 * (rockshape.ts). False when that is not a surface it can rest on for good (a collider box with no drawn rock behind,
 * or a decor box the AI does not model).
 */
function settleHere(a: Agent, w: AIWorld): boolean {
  const env = w.env;
  const pos = a.rt.pos;
  const hit = nearestSurface(env, pos, a.set.crawlMask, _hh);
  const id = surfaceId(hit);
  if (id === -1) return false;
  let depth = 0;
  if (id >= 0) {
    const c = env.colliders[id];
    if (!c.shape) return false;
    depth = drawnDepth(c, pos.x, pos.y, pos.z);
    if (!Number.isFinite(depth)) return false;
  }
  const s = a.set.body.hy * a.L;
  // (the body centre a half-height off the surface, the foot as far in as the drawn rock is)
  pos.addScaledVector(hit.n, s - depth - hit.d);
  a.surfId = id;
  a.surfN.copy(hit.n);
  a.upVis.copy(hit.n);
  a.embed = depth;
  return true;
}

/**
 * A clone the sim's fission split off a living anemone (lineage.motherId is that anemone, still in this tank): put it
 * right beside its parent's crown — crowns touching — on the same rock, on the rock as drawn. The parent does not move.
 * False when it has no such parent, or there is no room round it (it stays where the generic placement put it).
 */
function besideParent(a: Agent, w: AIWorld): boolean {
  const pid = a.c.lineage?.motherId;
  const p = pid ? w.byId.get(pid) : undefined;
  if (!p || !p.set.anemone || p.dead) return false;
  const env = w.env;
  const n = p.upVis;
  const s = a.set.body.hy * a.L;
  // two tangents of the parent's surface
  _p.set(-n.z, 0, n.x);
  if (_p.lengthSq() < 1e-6) _p.set(1, 0, 0);
  _p.normalize();
  _m.crossVectors(n, _p);
  const dist = (crownR(p) + crownR(a)) * 0.95;
  const th0 = ((hashString(`${a.id}|split`) % 1000) / 1000) * Math.PI * 2;
  const own = p.surfId;
  // (the spot round the parent whose crown comes nearest to just touching the parent's: a small rock may only have room
  // for the two crowns overlapping)
  let bestErr = Infinity;
  let bestGap = 0;
  for (let k = 0; k < 12; k++) {
    const th = th0 + (k * Math.PI * 2) / 12;
    // the point on the parent's surface plane, then onto the surface (box, then the rock as drawn behind it)
    _best.copy(p.rt.pos).addScaledVector(_p, Math.cos(th) * dist).addScaledVector(_m, Math.sin(th) * dist);
    _bestN.copy(n);
    let gap = 0;
    if (own >= 0 && own < env.colliders.length) {
      const c = env.colliders[own];
      const d = colliderSdfGrounded(c, _best.x, _best.y, _best.z);
      colliderNormalGrounded(c, _best.x, _best.y, _best.z, _bestN);
      if (_bestN.dot(n) < 0.7) continue; // (round the edge of its rock: not the same face)
      _best.addScaledVector(_bestN, -d);
      gap = restingGap(c, _best.x, _best.y, _best.z, _bestN.x, _bestN.y, _bestN.z, a.L * 0.14, s * 0.4 + 0.01);
      if (!Number.isFinite(gap)) continue;
      _best.addScaledVector(_bestN, s - gap);
    } else {
      // the bed or a pane: put it a half-height off that surface
      const hit = nearestSurface(env, _best, a.set.crawlMask, _hh);
      if (surfaceId(hit) !== own) continue;
      _best.addScaledVector(hit.n, s - hit.d);
      _bestN.copy(hit.n);
    }
    if (!fits(a, w, _best, _bestN, own)) continue;
    const err = Math.abs(_best.distanceTo(p.rt.pos) - dist) + (1 - _bestN.dot(n)) * a.L;
    if (err >= bestErr) continue;
    bestErr = err;
    bestGap = gap;
    _site2.copy(_best);
    _site2N.copy(_bestN);
  }
  if (bestErr === Infinity) return false;
  a.rt.pos.copy(_site2);
  a.surfN.copy(_site2N);
  a.upVis.copy(_site2N);
  a.surfId = own;
  a.surfPrev = -1;
  a.surfT = w.time;
  a.embed = bestGap;
  a.fwd.copy(_p).addScaledVector(_site2N, -_p.dot(_site2N));
  if (a.fwd.lengthSq() < 1e-6) a.fwd.copy(_m);
  a.fwd.normalize();
  return true;
}
const _site2 = new THREE.Vector3();
const _site2N = new THREE.Vector3();

/** Creeping speed (body lengths a second): the species' crawl, kept to an anemone's pace. */
export const creepBL = (a: Agent) => clamp(a.sp.behaviorTraits.cruiseSpeed, 0.002, 0.03);

/**
 * The anemone on its way: it creeps toward its spot in bouts (a minute or so on the move, a while still), its crown
 * half pulled in as it goes; there (or as good as there), it settles for good. No headway for a long while (the way is
 * blocked): it picks another spot, and after a few it settles where it is.
 */
export function wanderTick(a: Agent, w: AIWorld, dt: number): boolean {
  const c = a.ctrl;
  c.sep = 0;
  if (a.settled) return false;
  if (!a.hasSite && chooseSite(a, w) === -Infinity) {
    hold(a, w);
    return false;
  }
  const d = a.rt.pos.distanceTo(a.site);
  if (d < a.L * 0.3 && a.upVis.dot(a.siteN) > 0.8) {
    hold(a, w);
    return false;
  }
  if (w.time > a.actTimer) {
    a.actPhase = a.actPhase === 0 ? 1 : 0;
    a.actTimer = w.time + (a.actPhase === 0 ? rdur(a, 45, 0.4) : rdur(a, 25, 0.5));
  }
  if (a.actPhase === 1) {
    c.hasGoal = false;
    c.speedBL = 0;
    a.pose = 'rest';
    return true;
  }
  c.goal.copy(a.site);
  c.hasGoal = true;
  c.speedBL = creepBL(a);
  c.arriveR = a.L * 0.2;
  c.wander = 0.05;
  a.pose = 'rest';
  // headway, counted over its time on the move
  const patience = Math.max(60, (a.L * 0.2) / Math.max(1e-5, creepBL(a) * a.L));
  if (a.settleBest < 0 || d < a.settleBest - a.L * 0.08) {
    a.settleBest = d;
    a.settleT = a.actCount;
  } else if (a.actCount - a.settleT > patience) {
    a.settleBest = -1;
    a.settleT = 0;
    a.actCount = 0;
    if (++a.siteTries >= 3 || chooseSite(a, w) === -Infinity) {
      hold(a, w);
      return false;
    }
  }
  a.actCount += dt; // (seconds spent on the move)
  return true;
}

// ───────────────────────────── looks ─────────────────────────────

/** Crown open/closed, the slow deflate cycle, pose, and the renderer outputs (see the header). */
export function anemoneCosmetics(a: Agent, w: AIWorld, dt: number): void {
  const rt = a.rt;
  if (a.dead) {
    rt.ai.closed = 1;
    rt.ai.deflate = 1;
    rt.ai.settled = a.settled ? 1 : 0;
    return;
  }
  // now and then it deflates, hangs limp a while and slowly fills again (never while disturbed)
  if (a.deflatePh < 0) {
    if (w.time >= a.deflateT && a.act !== 'startle') {
      a.deflatePh = 0;
      a.deflateT = rdur(a, 25, 0.4); // (while deflated: how long it hangs limp)
    }
  } else {
    a.deflatePh += dt;
    if (a.deflatePh > 8 + a.deflateT + 22) {
      a.deflatePh = -1;
      a.deflateT = w.time + rdur(a, 420, 0.45);
    }
  }
  const ph = a.deflatePh;
  const defT = ph < 0 ? 0 : ph < 8 ? smoothstep(0, 8, ph) : ph < 8 + a.deflateT ? 1 : 1 - smoothstep(8 + a.deflateT, 8 + a.deflateT + 22, ph);
  a.deflate = defT;
  let T = 0;
  if (a.act === 'startle') T = 1;
  else if (a.act === 'feed') T = 0.55;
  else if (a.act === 'wander' && a.actPhase === 0) T = 0.35;
  const night = 1 - smoothstep(0.1, 0.6, w.env.daylight);
  T = Math.max(T, night * 0.65, defT * 0.5);
  a.closed = damp(a.closed, clamp01(T), T > a.closed ? 1.6 : 0.3, dt);
  if (a.act !== 'startle' && a.act !== 'feed') a.pose = a.closed > 0.55 ? 'hiding' : 'rest';
  rt.ai.closed = a.closed;
  rt.ai.deflate = a.deflate;
  rt.ai.settled = a.settled ? 1 : 0;
}
