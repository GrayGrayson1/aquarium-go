/**
 * Chunk 16 — the elegant sea star (behaviour set 'starfish', lane "behavior"): a flat arm-span disc that glides on the
 * sand, the glass and the rock, always lying flat on what it is on, rolling round the corner where two surfaces meet;
 * never in the decor, never out of the water, never swims; a scare only stops it.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addStimulus, stepWorld, type AIWorld } from './world';
import { colliderNormalGrounded, colliderSdfGrounded, floorAt, floorNormalAt, makeHit, surfaceById, SURF_ALL } from './env';
import type { Agent } from './agent';
import { decor, makeTestCreature, makeTestTank, makeTestWorld, speciesWith, stubSpecies } from './testkit';

const DT = 1 / 60;
const traits = (cruiseSpeed: number) => ({ cruiseSpeed, burstSpeed: cruiseSpeed * 1.5, turnRate: 0.4, hoverTendency: 0, schoolingTightness: 0, restOnBottom: 1, burrowing: 0, curiosity: 0, nocturnal: 0.7 });
const STAR = stubSpecies('trochus_snail', { id: 'test_starfish', behaviorSet: 'starfish', adultSizeCm: 9, activityZone: ['glass', 'decor', 'bottom'], foods: ['biofilm', 'detritus'], specialBehaviors: [], behaviorTraits: traits(0.02) });
// (the same animal ten times as quick: covers the tank's surfaces, and its corners, in a test's time)
const QUICK = stubSpecies('trochus_snail', { id: 'test_starfish_quick', behaviorSet: 'starfish', adultSizeCm: 9, activityZone: ['glass', 'decor', 'bottom'], foods: ['biofilm', 'detritus'], specialBehaviors: [], behaviorTraits: traits(0.25) });
const species = speciesWith([STAR, QUICK]);

/** How far a flat disc (normal n, radius R, half-thickness s) reaches toward a plane with normal m. */
const reach = (n: THREE.Vector3, m: THREE.Vector3, s: number, R: number) => {
  const c = n.dot(m);
  return s * Math.abs(c) + R * Math.sqrt(Math.max(0, 1 - c * c));
};

function tank(id: string, rocks = true) {
  return makeTestTank({
    id,
    tierId: 'g40B',
    waterClass: 'reef',
    decor: rocks ? [decor('test_rock', -0.22, -0.04, { scale: 1.4 }), decor('test_rock', 0.25, -0.08), decor('test_rock', 0.0, 0.1, { scale: 0.8 })] : [],
  });
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
const _n = new THREE.Vector3();
const hit = makeHit();

/** Everything wrong with a sea star's placement this frame. */
function check(a: Agent, w: AIWorld, bad: string[], stats: { onSurface: number; flat: number; frames: number }) {
  const e = w.env;
  const p = a.rt.pos;
  const s = a.set.body.hy * a.L;
  const R = Math.max(a.set.body.hx, a.set.body.hz) * a.L;
  const n = a.upVis;
  const tol = 1e-4;
  const tag = `${a.id} ${a.act} surf=${a.surfId}`;
  if (![p.x, p.y, p.z, a.rt.yaw, a.rt.pitch, a.rt.roll].every(Number.isFinite)) bad.push(`${tag} NaN`);
  if (a.loco !== 'crawl') bad.push(`${tag} loco ${a.loco}`);
  // the whole disc inside the glass, above the sand, under the water
  if (p.x - reach(n, X, s, R) < e.minX - tol || p.x + reach(n, X, s, R) > e.maxX + tol) bad.push(`${tag} an arm through the end glass`);
  if (p.z - reach(n, Z, s, R) < e.minZ - tol || p.z + reach(n, Z, s, R) > e.maxZ + tol) bad.push(`${tag} an arm through the front/back glass`);
  floorNormalAt(e, p.x, p.z, _n);
  if (p.y - floorAt(e, p.x, p.z) < reach(n, _n, s, R) * _n.y - 0.002) bad.push(`${tag} an arm in the sand`);
  if (p.y + reach(n, Y, s, R) > e.surfaceY + tol) bad.push(`${tag} out of the water`);
  // no part of it in a rock
  for (const c of e.colliders) {
    if (!c.hard) continue;
    const d = colliderSdfGrounded(c, p.x, p.y, p.z);
    colliderNormalGrounded(c, p.x, p.y, p.z, _n);
    if (d < reach(n, _n, s, R) - 0.002) bad.push(`${tag} inside ${c.decorId} by ${(reach(n, _n, s, R) - d).toFixed(4)}`);
  }
  // on its surface (resting on it, not hovering off it), and flat on it once settled there
  stats.frames++;
  if (surfaceById(e, p, a.surfId, SURF_ALL, hit)) {
    const gap = hit.d - reach(n, hit.n, s, R);
    if (gap > 0.003 && w.time - a.surfT > 3) bad.push(`${tag} ${gap.toFixed(4)} off its surface`);
    if (Math.abs(gap) < 0.003) stats.onSurface++;
    if (n.dot(hit.n) > 0.97) stats.flat++;
  } else bad.push(`${tag} on no surface`);
}

describe('elegant sea star (starfish)', () => {
  it('long soak: stays on surfaces, flat against them, in the water and out of the rock; never swims; drifts slowly', () => {
    const t = tank('star_soak');
    const crew = Array.from({ length: 4 }, (_, i) => makeTestCreature(STAR.id, t.id, { species: STAR, sizeCm: 8.1, temperament: 30 + i * 13 }));
    const w = makeTestWorld(t, crew, 12, {}, species);
    const bad: string[] = [];
    const stats = { onSurface: 0, flat: 0, frames: 0 };
    let maxStep = 0;
    const prev = new Map(w.agents.map((a) => [a.id, a.rt.pos.clone()]));
    const start = new Map(w.agents.map((a) => [a.id, a.rt.pos.clone()]));
    for (let i = 0; i < 60 * 60 * 15; i++) {
      stepWorld(w, i % 4 === 0 ? 1 / 30 : DT);
      if (i % 5) continue;
      for (const a of w.agents) {
        check(a, w, bad, stats);
        // (from the second second: the first frame settles a freshly placed animal onto its surface)
        if (i > 60) maxStep = Math.max(maxStep, a.rt.pos.distanceTo(prev.get(a.id)!) / a.L);
        prev.get(a.id)!.copy(a.rt.pos);
      }
    }
    expect([...new Set(bad)].slice(0, 10)).toEqual([]);
    expect(stats.onSurface / stats.frames).toBeGreaterThan(0.97);
    expect(stats.flat / stats.frames).toBeGreaterThan(0.9);
    // a slow glide (never a jump: at most a few hundredths of its span between checks), and it does get about
    expect(maxStep).toBeLessThan(0.05);
    const moved = w.agents.filter((a) => a.rt.pos.distanceTo(start.get(a.id)!) > a.L * 0.5).length;
    expect(moved).toBeGreaterThanOrEqual(2);
  });

  it('climbs between the sand, the glass and the rock, rolling round each corner without a jump', () => {
    for (const rocks of [false, true]) {
      const t = tank(rocks ? 'star_rock' : 'star_glass', rocks);
      const crew = Array.from({ length: 3 }, (_, i) => makeTestCreature(QUICK.id, t.id, { species: QUICK, sizeCm: 8.1, temperament: 30 + i * 13 }));
      const w = makeTestWorld(t, crew, 12, {}, species);
      const bad: string[] = [];
      const stats = { onSurface: 0, flat: 0, frames: 0 };
      const kinds = new Set<string>();
      let maxStep = 0;
      const prev = new Map(w.agents.map((a) => [a.id, a.rt.pos.clone()]));
      for (let i = 0; i < 60 * 60 * 8; i++) {
        stepWorld(w, DT);
        for (const a of w.agents) {
          if (i > 60) maxStep = Math.max(maxStep, a.rt.pos.distanceTo(prev.get(a.id)!) / a.L);
          prev.get(a.id)!.copy(a.rt.pos);
          kinds.add(a.surfId === -2 ? 'floor' : a.surfId <= -3 ? 'glass' : 'rock');
          if (i % 3 === 0) check(a, w, bad, stats);
        }
      }
      expect([...new Set(bad)].slice(0, 10), rocks ? 'rock tank' : 'bare tank').toEqual([]);
      expect([...kinds].sort()).toEqual(rocks ? ['floor', 'glass', 'rock'] : ['floor', 'glass']);
      // (crawling at a quarter of its span a second: one frame is 0.4 % of it; a jump round a corner would be ~40 %)
      expect(maxStep).toBeLessThan(0.03);
    }
  });

  it('a tap on the glass only stops it: no swim, no retreat', () => {
    const t = tank('star_tap');
    const w = makeTestWorld(t, [makeTestCreature(QUICK.id, t.id, { species: QUICK, sizeCm: 8.1 })], 12, {}, species);
    const a = w.agents[0];
    for (let i = 0; i < 60 * 20; i++) stepWorld(w, DT);
    addStimulus(w, 'tap', new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, w.env.maxZ), 1, true);
    for (let i = 0; i < 60; i++) stepWorld(w, DT);
    expect(a.act).toBe('startle');
    expect(a.loco).toBe('crawl');
    const p = a.rt.pos.clone();
    for (let i = 0; i < 60; i++) stepWorld(w, DT);
    expect(a.rt.pos.distanceTo(p)).toBeLessThan(a.L * 0.02);
    expect(a.rt.pose).toBe('rest');
  });
});
