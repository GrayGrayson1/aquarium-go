/**
 * Decor solidity for the AI: marimo, stones, caves, wood and plant crowns are solid; stems/grasses/carpets are soft;
 * walkers step over low decor and walk around the rest; bodies trapped under newly placed decor ease out.
 * OWNER: lane "behavior" (polish-render pass).
 */
import { describe, it, expect } from 'vitest';
import { getDecorDef } from '@/data/catalog/decor';
import { findSpecies } from '@/data/species';
import type { Creature, DecorInstance } from '@/types';
import { colliderSdf, colliderSdfXZ, decorSolidity, floorAt } from './env';
import { stepWorld, syncWorld, type AIWorld } from './world';
import { makeTestCreature, makeTestTank, makeTestWorld, decor } from './testkit';

const DT = 1 / 60;

function def(id: string) {
  const d = getDecorDef(id);
  if (!d) throw new Error(`missing decor ${id}`);
  return d;
}

/** Axolotl-showcase-like layout: marimo and pebbles in the front walking lane, crowned plants, low leaf + dish. */
function layout(): DecorInstance[] {
  return [
    decor('marimo_ball', 0.026, 0.1, { scale: 1.03 }),
    decor('marimo_ball', 0.085, 0.11, { scale: 0.8 }),
    decor('marimo_ball', -0.21, 0.1, { scale: 0.72 }),
    decor('river_stone', 0.2, 0.06, { scale: 1.2 }),
    decor('river_stone', -0.3, 0.05, { scale: 0.9 }),
    decor('smooth_hide', 0.2, -0.05, { scale: 1.1 }),
    decor('java_fern', -0.12, -0.06, { scale: 1.1 }),
    decor('cryptocoryne', 0.3, -0.08),
    decor('vallisneria', -0.3, -0.1, { scale: 0.65 }),
    decor('almond_leaf', -0.08, 0.08),
    decor('feeding_dish', 0.1, -0.02),
  ];
}

function crew(tankId: string): Creature[] {
  const out: Creature[] = [];
  const add = (id: string, n: number) => {
    if (!findSpecies(id)) return;
    for (let i = 0; i < n; i++) out.push(makeTestCreature(id, tankId, { temperament: 30 + ((i * 37) % 60), curiosity: 40 + ((i * 53) % 50) }));
  };
  add('axolotl', 2);
  add('panda_corydoras', 3);
  add('kuhli_loach', 2);
  add('neon_tetra', 5);
  add('cherry_shrimp', 3);
  add('mystery_snail', 1);
  return out;
}

/** Body points of every agent inside solid (non-exempt, non-climbable-for-walkers) decor, beyond a small tolerance. */
function penetrations(w: AIWorld, tol = 0.004, endTol = 0.006): string[] {
  const bad: string[] = [];
  const e = w.env;
  for (const a of w.agents) {
    const climber = a.loco === 'crawl' && (a.set.crawlMask & 4) !== 0;
    if (climber || a.act === 'burrow') continue;
    const walker = a.loco === 'walk';
    const climbH = Math.max(0.006, a.set.body.hy * a.L * 2 * 0.95);
    for (const k of [0, 0.42, -0.4]) {
      const x = a.rt.pos.x + a.fwd.x * a.L * k;
      const y = a.rt.pos.y + a.fwd.y * a.L * k;
      const z = a.rt.pos.z + a.fwd.z * a.L * k;
      for (const c of e.colliders) {
        if (!c.hard || c.decorId === a.ctrl.ignoreDecor) continue;
        if (walker) {
          if (c.rise <= climbH) continue;
          if (y < c.cy - c.hy || y > c.top) continue;
          const d = colliderSdfXZ(c, x, z);
          if (d < -(k === 0 ? tol : endTol)) bad.push(`${a.speciesId} ${k} in ${c.decorId}/${c.part} d=${d.toFixed(4)} act=${a.act}`);
        } else {
          const d = colliderSdf(c, x, y, z);
          if (d < -(k === 0 ? tol : endTol)) bad.push(`${a.speciesId} ${k} in ${c.decorId}/${c.part} d=${d.toFixed(4)} act=${a.act}`);
        }
      }
    }
  }
  return bad;
}

describe('AI decor colliders', () => {
  it('classifies decor solidity by category and visual', () => {
    expect(decorSolidity(def('marimo_ball'))).toMatchObject({ body: 'hard', round: true, base: null });
    expect(decorSolidity(def('river_stone')).body).toBe('hard');
    expect(decorSolidity(def('smooth_hide')).body).toBe('hard');
    // branchy driftwood: a soft canopy of thin limbs over a solid boss (chunky mopani stays solid)
    expect(decorSolidity(def('spider_wood'))).toMatchObject({ body: 'soft', base: expect.any(Array) });
    expect(decorSolidity(def('mopani_wood')).body).toBe('hard');
    expect(decorSolidity(def('almond_leaf')).body).toBe('hard');
    expect(decorSolidity(def('ceramic_ruins')).body).toBe('hard');
    for (const soft of ['vallisneria', 'rotala', 'ludwigia', 'dwarf_hairgrass', 'monte_carlo', 'java_moss', 'floating_plants', 'chaetomorpha']) {
      expect(decorSolidity(def(soft)), soft).toMatchObject({ body: 'soft', base: null });
    }
    for (const crowned of ['java_fern', 'anubias_nana', 'amazon_sword', 'cryptocoryne', 'water_sprite']) {
      const s = decorSolidity(def(crowned));
      expect(s.body, crowned).toBe('soft');
      expect(s.base, crowned).not.toBeNull();
    }
    expect(decorSolidity(def('bubble_tip_anemone')).body).toBe('soft');
  });

  it('builds a solid crown under crowned plants and a sphere for marimo', () => {
    const tank = makeTestTank({ decor: layout() });
    const w = makeTestWorld(tank, []);
    const fern = tank.decor.find((d) => d.defId === 'java_fern')!;
    const parts = w.env.colliders.filter((c) => c.decorId === fern.id);
    expect(parts.map((c) => `${c.part}:${c.hard}`)).toEqual(['body:false', 'base:true']);
    const base = parts[1];
    expect(base.top - (parts[0].cy - parts[0].hy)).toBeLessThanOrEqual(0.036);
    const marimo = w.env.colliders.find((c) => c.decorId === tank.decor[0].id)!;
    expect(marimo.hard).toBe(true);
    expect(marimo.r).toBeGreaterThan(Math.min(marimo.hx, marimo.hy, marimo.hz) * 0.9);
    const leaf = w.env.colliders.find((c) => c.decorId === tank.decor.find((d) => d.defId === 'almond_leaf')!.id)!;
    expect(leaf.rise).toBeLessThan(0.025);
  });

  it('20k steps: nobody passes through marimo, stones, caves or plant crowns; walkers keep moving', () => {
    const tank = makeTestTank({ tierId: 'g20L', decor: layout() });
    const cs = crew(tank.id);
    const w = makeTestWorld(tank, cs);
    const axo = w.agents.filter((a) => a.speciesId === 'axolotl');
    expect(axo.length).toBeGreaterThan(0);
    const start = axo.map((a) => a.rt.pos.clone());
    let travelled = 0;
    const prev = axo.map((a) => a.rt.pos.clone());
    const bad: string[] = [];
    let maxLift = 0;
    for (let i = 0; i < 20000; i++) {
      stepWorld(w, DT);
      axo.forEach((a, j) => {
        travelled += a.rt.pos.distanceTo(prev[j]);
        prev[j].copy(a.rt.pos);
        maxLift = Math.max(maxLift, a.stepLift);
      });
      if (i % 20 === 0) {
        const b = penetrations(w);
        if (b.length) bad.push(`t=${(i * DT).toFixed(1)} ${b[0]}`);
      }
    }
    for (const a of w.agents) expect([a.rt.pos.x, a.rt.pos.y, a.rt.pos.z].every(Number.isFinite)).toBe(true);
    expect(bad.slice(0, 5)).toEqual([]);
    // the axolotls explored (not pinned against a marimo) — > 1 m of walking in ~5.5 minutes
    expect(travelled).toBeGreaterThan(1);
    expect(axo.some((a, j) => a.rt.pos.distanceTo(start[j]) > 0.02)).toBe(true);
    expect(maxLift).toBeLessThan(0.04);
  });

  it('marine soak: hosting, hitching, perching and burrowing still work around solid decor', () => {
    const tank = makeTestTank({
      tierId: 'g29',
      waterClass: 'marine_live_rock',
      decor: [
        decor('live_rock', -0.2, -0.05, { scale: 1.2 }),
        decor('live_rock_arch', 0.12, -0.06),
        decor('rubble', -0.05, 0.07),
        decor('bubble_tip_anemone', 0.22, 0.05),
        decor('hitching_post', -0.3, 0.06),
        decor('gorgonian', 0.3, -0.1),
        decor('feeding_dish', 0.02, 0.1),
        decor('chaetomorpha', -0.1, -0.1),
      ],
    });
    const cs: Creature[] = [];
    const add = (id: string, n: number) => {
      if (!findSpecies(id)) return;
      for (let i = 0; i < n; i++) cs.push(makeTestCreature(id, tank.id, { temperament: 40 + i * 13, curiosity: 50 + i * 11 }));
    };
    add('ocellaris_clownfish', 2);
    add('lined_seahorse', 2);
    add('watchman_goby', 1);
    add('royal_gramma', 1);
    add('cleaner_shrimp', 1);
    add('hermit_crab', 1);
    add('mandarin_dragonet', 1);
    const w = makeTestWorld(tank, cs);
    const bad: string[] = [];
    const acts = new Set<string>();
    for (let i = 0; i < 15000; i++) {
      stepWorld(w, DT);
      if (i % 20 === 0) {
        for (const a of w.agents) acts.add(`${a.setId}:${a.act}`);
        const b = penetrations(w);
        if (b.length) bad.push(`t=${(i * DT).toFixed(1)} ${b[0]}`);
      }
    }
    for (const a of w.agents) expect([a.rt.pos.x, a.rt.pos.y, a.rt.pos.z].every(Number.isFinite)).toBe(true);
    expect(bad.slice(0, 5)).toEqual([]);
    // the anchor behaviours still happen (exempt decor)
    expect([...acts].some((s) => s.startsWith('seahorse:') && s !== 'seahorse:cruise')).toBe(true);
  });

  it('a creature under newly placed decor eases out instead of popping', () => {
    const tank = makeTestTank({ decor: [] });
    const cs = [makeTestCreature('neon_tetra', tank.id), makeTestCreature('axolotl', tank.id)];
    const w = makeTestWorld(tank, cs);
    for (let i = 0; i < 60; i++) stepWorld(w, DT);
    // drop a big cave right on top of each creature
    const placed: DecorInstance[] = [];
    for (const a of w.agents) {
      const p = a.rt.pos;
      placed.push(decor('stone_cave', p.x, p.z, { scale: 2, y: floorAt(w.env, p.x, p.z) }));
    }
    const t2 = { ...tank, decor: placed };
    syncWorld(w, { tank: t2, creatures: cs, clutches: [], hour: 12, refreshInfo: false });
    let maxStep = 0;
    const last = w.agents.map((a) => a.rt.pos.clone());
    for (let i = 0; i < 180; i++) {
      stepWorld(w, DT);
      w.agents.forEach((a, j) => {
        maxStep = Math.max(maxStep, Math.hypot(a.rt.pos.x - last[j].x, a.rt.pos.z - last[j].z));
        last[j].copy(a.rt.pos);
      });
    }
    // eased: no single-frame horizontal jump bigger than a few cm
    expect(maxStep).toBeLessThan(0.05);
    expect(penetrations(w, 0.006)).toEqual([]);
  });
});
