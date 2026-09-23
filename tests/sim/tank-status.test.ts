/**
 * Tank status = worst of water, animal welfare and food in stock (QA: the tank bar said "Healthy" and the alerts
 * "All tanks look healthy." while the creature card said "Danger — Starving"), low/out-of-food signals, and
 * welfare-gated friend/visitor tips (QA: friends kept praising and tipping while animals starved).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { refreshTankCache, advanceWorld } from '@/sim/world';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature, creatureWellbeing } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { makeContext } from '@/sim/context';
import { dayOf } from '@/sim/time';
import { feedTank } from '@/sim/care';
import { buyFood } from '@/sim/economy';
import * as F from '@/sim/facility';
import { initialFacility } from '@/sim/facility';
import { exhibitInfo } from '@/sim/facility/exhibit';
import { animalStatus, tankFoodOutlook, foodOutlookAll, needsFedFood, LOW_FOOD_MEALS, refreshFoodStatus } from '@/sim/tankStatus';
import { listSpecies } from '@/data/species';

const betta = (seed = 5) => {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed });
  const tank = g.tanks[g.tankOrder[0]];
  const ember = Object.values(g.creatures).find((c) => c.isStarter)!;
  return { g, tank, ember };
};

describe('tank status reflects the animals, not just the water', () => {
  it('a starving betta makes the tank DANGER with a plain reason (and agrees with the creature card)', () => {
    const { g, tank, ember } = betta();
    refreshTankCache(g, tank);
    expect(tank.cache.status).toBe('good');
    expect(tank.cache.statusReason).toBeUndefined();
    ember.stats.hunger = 95;
    refreshTankCache(g, tank);
    expect(tank.cache.waterStatus).toBe('good');
    expect(tank.cache.animalStatus).toBe('danger');
    expect(tank.cache.status).toBe('danger');
    expect(tank.cache.statusSource).toBe('animals');
    expect(tank.cache.statusReason).toBe('Ember is starving — feed right away.');
    expect(creatureWellbeing(g, ember).status).toBe('danger');
  });

  it('very hungry → WATCH; seriously ill / badly stressed / failing health → DANGER', () => {
    const { g, tank, ember } = betta();
    ember.stats.hunger = 75;
    refreshTankCache(g, tank);
    expect(tank.cache.status).toBe('watch');
    expect(tank.cache.statusReason).toMatch(/Ember is very hungry/);
    ember.stats.hunger = 10;
    ember.illness = { kind: 'fin_rot', severity: 70, sinceHour: 0 };
    refreshTankCache(g, tank);
    expect(tank.cache.status).toBe('danger');
    expect(tank.cache.statusReason).toMatch(/Ember is seriously ill with .+ — treat it now\./);
    delete ember.illness;
    ember.stats.stress = 90;
    expect(animalStatus([ember]).issue).toBe('badly_stressed');
    ember.stats.stress = 10;
    ember.stats.health = 20;
    expect(animalStatus([ember])).toMatchObject({ status: 'danger', issue: 'dying' });
    ember.stats.health = 100;
    expect(animalStatus([ember])).toMatchObject({ status: 'good', issue: null, reason: null });
  });

  it('groups are summarised ("3 neon tetras are starving")', () => {
    const { g, tank } = betta();
    const rng = simRng(g);
    const fish = [0, 1, 2].map(() => addCreature(g, createCreature(g, rng, 'neon_tetra', { ageDays: 40 }), tank.id));
    for (const f of fish) f.stats.hunger = 96;
    expect(animalStatus(fish).reason).toBe('3 neon tetras are starving — feed right away.');
  });

  it('bad water AND a starving animal: both reasons, starvation first (the water does not explain it)', () => {
    const { g, tank, ember } = betta();
    tank.water.ammonia = 3;
    ember.stats.hunger = 95;
    refreshTankCache(g, tank);
    expect(tank.cache.waterStatus).toBe('danger');
    expect(tank.cache.status).toBe('danger');
    expect(tank.cache.statusSource).toBe('animals');
    expect(tank.cache.statusReasons!.length).toBe(2);
  });

  it('water-only systems still read the water: the "keep water GOOD" streak survives a hungry morning', () => {
    const { g, tank, ember } = betta();
    ember.stats.hunger = 75;
    refreshTankCache(g, tank);
    expect(tank.cache.status).toBe('watch');
    expect(tank.cache.waterStatus).toBe('good');
    g.progress.counters._badToday = 0;
    F.stepProgression(g, 0.1, makeContext(g, 0.1));
    expect(g.progress.counters._badToday ?? 0).toBe(0);
  });
});

describe('food in stock: low / out signals for foods the animals actually eat', () => {
  it('out of everything the betta eats → foodLevel "out", status WATCH, a clear reason and a restock suggestion', () => {
    const { g, tank } = betta();
    g.inventory.foods = {};
    const o = tankFoodOutlook(g, tank.id);
    expect(o.level).toBe('out');
    expect(o.text).toBe('No food left that Ember eats');
    expect(o.restockId).toBeTruthy();
    refreshTankCache(g, tank);
    expect(tank.cache.foodLevel).toBe('out');
    expect(tank.cache.status).toBe('watch');
    expect(tank.cache.statusSource).toBe('food');
  });

  it('food the animals do not eat does not count', () => {
    const { g, tank } = betta();
    g.inventory.foods = { nori_sheet: 30, algae_wafers: 60 };
    expect(tankFoodOutlook(g, tank.id).level).toBe('out');
  });

  it(`fewer than ${LOW_FOOD_MEALS} typical meals → "low" (status unchanged); plenty → ok`, () => {
    const { g, tank } = betta();
    g.inventory.foods = { micro_pellets: 2 };
    const low = tankFoodOutlook(g, tank.id);
    expect(low.level).toBe('low');
    expect(low.text).toMatch(/^Food for Ember is running low \(about \d+ meals?\ left\)$/);
    refreshTankCache(g, tank);
    expect(tank.cache.foodLevel).toBe('low');
    expect(tank.cache.status).toBe('good');
    g.inventory.foods = { micro_pellets: 150 };
    expect(tankFoodOutlook(g, tank.id).level).toBe('ok');
  });

  it('the cupboard is shared: more mouths across tanks means fewer meals each', () => {
    const { g, tank } = betta();
    g.inventory.foods = { micro_pellets: 30 };
    const alone = tankFoodOutlook(g, tank.id).meals;
    const t2 = createTank(g, 'g20L', 'freshwater_planted', { cycled: true });
    const rng = simRng(g);
    for (let i = 0; i < 8; i++) addCreature(g, createCreature(g, rng, 'neon_tetra', { ageDays: 40 }), t2.id);
    const shared = foodOutlookAll(g)[tank.id].meals;
    expect(shared).toBeLessThan(alone);
  });

  it('animals that graze biofilm or live on light never raise a food alert', () => {
    const selfFed = listSpecies().filter((sp) => !needsFedFood(sp));
    expect(selfFed.length).toBeGreaterThan(0);
    const { g } = betta();
    g.inventory.foods = {};
    const sp = selfFed[0];
    const t = createTank(g, 'g20L', sp.environment === 'marine' ? 'marine_live_rock' : 'freshwater_planted', { cycled: true });
    addCreature(g, createCreature(g, simRng(g), sp.id, { ageDays: 40 }), t.id);
    expect(tankFoodOutlook(g, t.id).level).toBe('ok');
  });

  it('warns once when food runs low and once when it runs out (throttled toasts), and re-arms after restocking', () => {
    const { g, tank } = betta();
    g.inventory.foods = { micro_pellets: 3 };
    const res = feedTank(g, tank.id, 'micro_pellets', { servings: 1 });
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/about \d+ meals? of food here\. Stock up soon\./);
    const lows = () => g.log.filter((e) => /running low/.test(e.text));
    const outs = () => g.log.filter((e) => /^No food left/.test(e.text));
    expect(lows().length).toBe(1);
    expect(lows()[0].toast).toBe(true);
    expect(lows()[0].text).toMatch(/Buy .+ in Market › Supplies\./);
    feedTank(g, tank.id, 'micro_pellets', { servings: 1 });
    expect(lows().length).toBe(1); // no repeat while still low
    const last = feedTank(g, tank.id, 'micro_pellets', { servings: 5 });
    expect(last.message).toMatch(/That was the last of your micro pellets — buy more in Market › Supplies\./);
    expect(outs().length).toBe(1);
    expect(outs()[0].kind).toBe('danger');
    advanceWorld(g, 6, { focusTankId: tank.id });
    expect(outs().length).toBe(1);
    expect(tank.cache.foodLevel).toBe('out');
    g.finance.money = 500;
    expect(buyFood(g, 'micro_pellets', 1).ok).toBe(true);
    expect(tank.cache.foodLevel).toBe('ok'); // updated right away, not at the next tank step
    refreshFoodStatus(g, { notify: true });
    g.clock.hour += 13; // later on, the new bag runs low too
    g.inventory.foods = { micro_pellets: 1 };
    refreshFoodStatus(g, { notify: true });
    expect(lows().length).toBe(2); // re-armed after the restock
  });

  it('tanks sharing one food get one "running low" line, not one each', () => {
    const { g, tank } = betta();
    const t2 = createTank(g, 'g20L', 'freshwater_planted', { cycled: true });
    const rng = simRng(g);
    for (let i = 0; i < 6; i++) addCreature(g, createCreature(g, rng, 'neon_tetra', { ageDays: 40 }), t2.id);
    g.inventory.foods = { micro_pellets: 2 };
    refreshFoodStatus(g, { notify: true });
    expect(foodOutlookAll(g)[tank.id].level).toBe('low');
    expect(foodOutlookAll(g)[t2.id].level).toBe('low');
    expect(g.log.filter((e) => /running low/.test(e.text)).length).toBe(1);
  });
});

// ───────────────────────────── tips gated by welfare ─────────────────────────────

function hobbyRoom(seed: number): { g: GameState; t: Tank } {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed });
  g.tanks = {};
  g.tankOrder = [];
  g.creatures = {};
  g.clutches = {};
  g.log = [];
  g.facility = initialFacility('hobby_room');
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  g.clock.hour = 24 * 3 + 8;
  g.visitors.today = { day: dayOf(g.clock.hour), count: 0, revenue: 0, tips: 0, satisfactionSum: 0 };
  const t = createTank(g, 'g10', 'freshwater_planted', { cycled: true, placement: F.findFreeSpot(g, 'g10')! });
  const c = createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 40 });
  addCreature(g, c, t.id);
  c.stats.health = 95;
  c.stats.stress = 10;
  delete c.illness;
  t.cache.beauty = 75;
  t.cache.welfare = 92;
  t.cache.compatVerdict = 'excellent';
  return { g, t };
}

function runVisitors(g: GameState, t: Tank, hours: number, hunger: number): void {
  const c = Object.values(g.creatures).find((x) => x.tankId === t.id)!;
  for (let h = 0; h < hours; h += 0.25) {
    c.stats.hunger = hunger;
    c.stats.health = 95;
    refreshTankCache(g, t);
    F.stepVisitors(g, 0.25, makeContext(g, 0.25));
    g.clock.hour += 0.25;
  }
}

describe('friend and visitor tips are gated by welfare', () => {
  it('friends leave no tip or praise while an animal is starving — they leave worried instead', () => {
    const { g, t } = hobbyRoom(81);
    const money0 = g.finance.money;
    const rep0 = g.progress.reputation;
    runVisitors(g, t, 48, 95);
    expect(g.progress.counters.friend_visits ?? 0).toBe(0);
    expect(g.finance.money).toBe(money0);
    expect(g.progress.reputation).toBeLessThanOrEqual(rep0);
    const worried = g.log.filter((e) => /left worried: \S+ is starving\. No tip today\./.test(e.text));
    expect(worried.length).toBeGreaterThanOrEqual(1);
    expect(worried.length).toBeLessThanOrEqual(3); // throttled
  });

  it('a fed betta gets full tips; a very hungry one (WATCH) gets smaller ones', () => {
    const tipsWith = (hunger: number) => {
      let tips = 0;
      let visits = 0;
      for (const seed of [81, 82, 83, 84]) {
        const { g, t } = hobbyRoom(seed);
        runVisitors(g, t, 72, hunger);
        tips += g.finance.ledger.filter((l) => l.category === 'tips').reduce((a, l) => a + l.amount, 0);
        visits += g.progress.counters.friend_visits ?? 0;
      }
      return { tips, visits };
    };
    const fed = tipsWith(20);
    const hungry = tipsWith(75);
    expect(fed.visits).toBeGreaterThan(0);
    expect(hungry.visits).toBeGreaterThan(0);
    expect(hungry.tips / hungry.visits).toBeLessThan((fed.tips / fed.visits) * 0.75);
  });

  it('a starving exhibit concerns visitors (suffering at the same line as the tank status)', () => {
    const { g, t } = hobbyRoom(90);
    const c = Object.values(g.creatures).find((x) => x.tankId === t.id)!;
    c.stats.hunger = 91;
    refreshTankCache(g, t);
    const e = exhibitInfo(g, t);
    expect(e.concerned).toBe(true);
    expect(e.concernText).toMatch(/half-starved/);
  });
});
