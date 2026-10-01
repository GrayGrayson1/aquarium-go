/**
 * Fix lane AI — feeding loops and leftovers (audit S07-01..04).
 *  - a claim held by a fish that moved on must never keep a leftover alive (S07-01)
 *  - hand-fed (tongs) food the animal ignores is faded like any other leftover, and a full fish still takes a bite (S07-02)
 *  - the starter seahorse and axolotl reach the food they go for, or give it up cleanly (S07-03, S07-04)
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FIXTURES, makeShowcase } from '@/dev/fixtures';
import { getDecorDef } from '@/data/catalog/decor';
import { findSpecies } from '@/data/species';
import { personalityModifiers } from '@/sim/life';
import { advanceWorld } from '@/sim/world';
import { feedTank } from '@/sim/care';
import { equipmentSolids, tankFlow, foodSpecById, foodSpecForTags } from '@/ai/registry';
import { equipmentLayout } from '@/render/decor/emitters';
import { createWorld, stepWorld, syncWorld, type AIWorld } from '@/ai/core/world';
import { spawnFood, noteLocalFeeding, syncFoodWithSim, liveCount } from '@/ai/core/food';
import { makeTestTank, makeTestCreature, makeTestWorld } from '@/ai/core/testkit';
import type { GameState } from '@/types';

const step = (w: AIWorld, secs: number) => {
  for (let i = 0; i < secs * 60; i++) stepWorld(w, 1 / 60);
};

/** A fixture / showcase game with the AI world of its first tank, stepped against the real sim. */
function starterRun(g: GameState, foodId: string, secs: number, setId: string) {
  const tid = g.tankOrder[0];
  const w = createWorld(tid, { resolveDecor: getDecorDef, extras: (t) => equipmentSolids(equipmentLayout(t), t), flowOf: tankFlow, personality: (c) => personalityModifiers(c), species: findSpecies, hooks: {} });
  let eats = 0;
  w.hooks.event = (k) => {
    if (k === 'eat') eats++;
  };
  const sync = () => {
    const cs = Object.values(g.creatures).filter((c) => c.tankId === tid);
    syncWorld(w, { tank: g.tanks[tid], creatures: cs, clutches: [], hour: g.clock.hour, refreshInfo: true });
    syncFoodWithSim(w, g.tanks[tid].water.foodInWater ?? 0, foodSpecForTags, g.tanks[tid].water.foodByTag);
  };
  sync();
  w.env.focused = true;
  const a = w.agents.find((x) => x.setId === setId)!;
  let t = 0;
  let simAcc = 0;
  let feedT = 0;
  let timeouts = 0;
  let prevAct = '';
  let prevActT = 0;
  while (t < secs) {
    if (Math.abs(t - 10) < 1e-6) {
      feedTank(g, tid, foodId, { zone: 'surface' });
      const spec = foodSpecById(foodId);
      const n = spawnFood(w, spec, new THREE.Vector3(a.rt.pos.x, w.env.surfaceY - 0.002, 0.05), { count: 12 });
      noteLocalFeeding(w, spec, n, 1);
    }
    stepWorld(w, 1 / 60);
    t += 1 / 60;
    simAcc += 1 / 60;
    if (simAcc >= 0.25) {
      advanceWorld(g, simAcc * 0.1, { focusTankId: tid });
      simAcc = 0;
      sync();
    }
    if (a.act === 'feed') feedT += 1 / 60;
    if (prevAct === 'feed' && a.act !== 'feed' && prevActT >= 24.9) timeouts++;
    prevAct = a.act;
    prevActT = a.actT;
  }
  return { a, w, eats, feedSeconds: feedT, timeouts, left: liveCount(w), simFood: g.tanks[tid].water.foodInWater };
}

describe('fix AI: feeding leftovers and claims', () => {
  it('S07-01: fish that get full before the food is gone do not leave a carpet of claimed flakes behind', () => {
    const tank = makeTestTank({ id: 't1' });
    const hunger = { health: 100, hunger: 45, stress: 10, energy: 80, social: 70, comfort: 80, breedingReadiness: 0, enrichment: 60 };
    const w = makeTestWorld(tank, [makeTestCreature('betta', 't1', { id: 'b1', stats: hunger }), makeTestCreature('betta', 't1', { id: 'b2', stats: hunger })], 12);
    const spec = foodSpecById('flake_tropical');
    step(w, 2);
    for (let feeding = 0; feeding < 4; feeding++) {
      const n = spawnFood(w, spec, new THREE.Vector3(0, w.env.surfaceY - 0.003, 0), { count: 36 });
      noteLocalFeeding(w, spec, n, 3);
      step(w, 0.25);
      syncFoodWithSim(w, spec.nutrition * 3, foodSpecForTags, { flake: spec.nutrition * 3 });
      // the fish eat their fill in the first minute; the sim then reports the rest consumed / dissolved
      for (let s = 0; s < 60; s++) {
        step(w, 1);
        syncFoodWithSim(w, s < 30 ? spec.nutrition * 3 : 0, foodSpecForTags, {});
      }
      for (let s = 0; s < 40; s++) {
        step(w, 1);
        syncFoodWithSim(w, 0, foodSpecForTags, {});
      }
      const stale = w.food.filter((p) => p.amount > 0 && !p.fade && p.claimedBy && !w.agents.some((a) => a.foodId === p.id && (a.act === 'feed' || a.act === 'hunt')));
      expect(stale.length, `feeding ${feeding + 1}: stale-claimed leftovers`).toBe(0);
      expect(liveCount(w), `feeding ${feeding + 1}: live particles after the sim reports no food`).toBe(0);
    }
  });

  it('S07-02: tong-fed food the animal does not take fades once the sim has consumed it, and a full fish still takes a bite', () => {
    const tank = makeTestTank({ id: 't1' });
    const c = makeTestCreature('betta', 't1', { id: 'b1', stats: { health: 100, hunger: 10, stress: 10, energy: 80, social: 70, comfort: 80, breedingReadiness: 0, enrichment: 60 } });
    const w = makeTestWorld(tank, [c], 12);
    const a = w.agents[0];
    step(w, 2);
    a.satiety = 20; // stuffed
    const spec = foodSpecById('bloodworm_frozen');
    const n = spawnFood(w, spec, new THREE.Vector3(a.rt.pos.x, a.rt.pos.y, a.rt.pos.z), { count: 3, targetCreatureId: 'b1' });
    noteLocalFeeding(w, spec, n, 1);
    step(w, 0.25);
    syncFoodWithSim(w, spec.nutrition, foodSpecForTags, { bloodworm: spec.nutrition });
    for (let s = 0; s < 120; s++) {
      step(w, 1);
      syncFoodWithSim(w, 0, foodSpecForTags, {});
    }
    expect(liveCount(w), 'ignored tong-fed pieces still lying on the sand').toBe(0);

    // a fish that has just eaten its fill (satiety a little over capacity) still takes what is held out to it
    const w2 = makeTestWorld(tank, [makeTestCreature('betta', 't1', { id: 'b2', stats: { health: 100, hunger: 10, stress: 10, energy: 80, social: 70, comfort: 80, breedingReadiness: 0, enrichment: 60 } })], 12);
    const b = w2.agents[0];
    let eats = 0;
    w2.hooks.event = (k) => {
      if (k === 'eat') eats++;
    };
    step(w2, 2);
    b.satiety = 5; // capacity at hunger 0.1 is ≈ 4.5: "full"
    const m = spawnFood(w2, spec, new THREE.Vector3(b.rt.pos.x, b.rt.pos.y, b.rt.pos.z), { count: 3, targetCreatureId: 'b2' });
    noteLocalFeeding(w2, spec, m, 1);
    step(w2, 20);
    expect(eats, 'bites taken from hand-fed worms by a full betta').toBeGreaterThan(0);
  });
});

describe('fix AI: starter animals reach their food or give it up', () => {
  it('S07-03: the starter seahorse eats a mysis feeding instead of hovering over unreachable shrimp for minutes', () => {
    const r = starterRun(FIXTURES.lined_seahorse(), 'mysis_frozen', 240, 'seahorse');
    // it used to eat 3 of 12 and spend 286 of 300 s "feeding", timing out 11 times, with two shrimp left in a crevice
    expect(r.eats, 'snicks').toBeGreaterThanOrEqual(4);
    expect(r.feedSeconds, 'seconds spent in the feed act').toBeLessThan(90);
    expect(r.timeouts, 'feed acts that ran into the 25 s timeout').toBeLessThanOrEqual(2);
    expect(r.left, 'leftovers after the sim reports no food').toBe(0);
    expect(r.simFood).toBeLessThan(0.05);
  });

  it('S07-04: the starter axolotl strikes pellets on the sand instead of hovering above them', () => {
    for (const seed of [1, 4]) {
      const r = starterRun(makeShowcase("axolotl", seed), "axolotl_pellets", 200, "axolotl");
      // layouts 1 and 4 used to time out 4× each, eating 5 pellets in 110–140 feed-seconds and leaving 2–5 behind
      expect(r.eats, `seed ${seed}: pellets eaten`).toBeGreaterThanOrEqual(4);
      expect(r.timeouts, `seed ${seed}: feed timeouts`).toBe(0);
      expect(r.feedSeconds, `seed ${seed}: seconds spent feeding`).toBeLessThan(80);
      expect(r.left, `seed ${seed}: leftovers`).toBe(0);
    }
  });

  it('R04-01: a fish going back to a piece it let go of a while ago pursues it afresh instead of giving it up at once', () => {
    for (let seed = 0; seed < 3; seed++) {
      const tank = makeTestTank({ id: 't1' });
      const stats = { health: 100, hunger: 75, stress: 10, energy: 80, social: 70, comfort: 80, breedingReadiness: 0, enrichment: 60 };
      const w = makeTestWorld(tank, [makeTestCreature('betta', 't1', { id: 'f1', stats, temperament: 30 + seed * 7 })], 12);
      const a = w.agents[0];
      step(w, 2 + seed);
      a.satiety = 100; // full: it ignores the piece while it sinks
      const spec = foodSpecById('micro_pellets');
      const x = a.rt.pos.x + (a.rt.pos.x > 0 ? -1 : 1) * a.L * 3;
      noteLocalFeeding(w, spec, spawnFood(w, spec, new THREE.Vector3(x, w.env.surfaceY - 0.01, a.rt.pos.z), { count: 1 }), 1);
      for (let i = 0; i < 60 * 30; i++) {
        stepWorld(w, 1 / 60);
        if (i % 15 === 0) syncFoodWithSim(w, spec.nutrition, foodSpecForTags, {});
      }
      const p = w.food.find((q) => q.amount > 0)!;
      expect(p, 'the piece on the sand').toBeTruthy();
      // it went for this piece half a minute ago and let go of it (startled, full, asleep)
      a.lastFoodId = p.id;
      a.foodDropT = w.time - 30;
      a.foodT = w.time - 30;
      a.lastFedT = w.time - 30;
      a.satiety = 0;
      let eats = 0;
      w.hooks.event = (k) => {
        if (k === 'eat') eats++;
      };
      const t0 = w.time;
      for (let i = 0; i < 60 * 8; i++) {
        stepWorld(w, 1 / 60);
        if (i % 15 === 0) syncFoodWithSim(w, spec.nutrition, foodSpecForTags, {});
        const k = a.badFoodIds.indexOf(p.id);
        // (it used to give it up 0.1-0.4 s in, on a 45 s ban)
        expect(k >= 0 && a.badFoodUntil[k] > w.time, `seed ${seed}: gave the piece up ${(w.time - t0).toFixed(2)} s in`).toBe(false);
      }
      expect(eats, `seed ${seed} bites`).toBeGreaterThan(0);
    }
  });
});
