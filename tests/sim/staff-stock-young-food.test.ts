/**
 * Audit 2026-11-17 (follow-up to H2) — keepers feed young their first foods from stock, so the stock manager keeps
 * those foods on the shelf: her plan counts the young in keepers' tanks (the food the keeper would pick), within the
 * same budget and rules as every other order, and draws nothing (the staff stream is untouched).
 * The review of that follow-up: she plans exactly what the keeper gives (1 or 2 servings a brood a round, on the
 * rounds far enough apart to feed young: 2 a day for a tank of young only, 3 for a meticulous keeper), not a doser's
 * serving per 20 young three times a day, and the young's own food never takes the budget from the grown animals'.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, StaffTrait, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { getSpecies } from '@/data/species';
import { createClutch } from '@/sim/life/breeding/clutch';
import { installEquipment } from '@/sim/care';
import { addStaffDirect, keeperVisit, plannedOrders, stockCheck } from '@/sim/staff';
import { ADULTS_FIRST_DAYS, YOUNG_FED_RECENTLY_H, planPurchases, plannedUsage, plannedYoungUsage, stepKeepers, tankRounds, youngFeedingRounds } from '@/sim/staff/work';
import { BRINE } from '@/data/catalog/machines';
import { STOCK_BUDGET } from '@/data/staff';

const FLAKES = 'flake_tropical';

function nursery(opts: { keeper?: boolean; count?: number; trait?: StaffTrait } = {}): { g: GameState; tank: Tank; rosa: ReturnType<typeof addStaffDirect>; maya: ReturnType<typeof addStaffDirect> | null } {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 51 });
  g.isShowcase = false;
  g.finance.money = 2000;
  g.inventory.foods = {};
  const tank = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 6, z: 2, rotY: 0 }, name: 'Nursery 1' });
  tank.water.tempC = 27;
  const sp = getSpecies('betta');
  const rng = simRng(g);
  const elsewhere = createTank(g, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 9, z: 2, rotY: 0 }, name: 'Pair Tank' });
  const mother = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Cinder' }), elsewhere.id);
  const father = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Blaze' }), elsewhere.id);
  const cl = createClutch(g, { sp, tank, mother, father, hour: g.clock.hour, stage: 'fry', count: opts.count ?? 40, visual: 'fry_cloud', nextStageHour: g.clock.hour + 200 });
  cl.stageSinceHour = g.clock.hour - sp.breeding.fryRearingHours * 0.5; // past the yolk, into the fry phase (baby brine first)
  const maya = opts.keeper === false ? null : addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 2, trait: opts.trait ?? 'gentle_hands', tankIds: [tank.id] });
  const rosa = addStaffDirect(g, { name: 'Rosa Diaz', role: 'stock_manager', skill: 2, trait: 'planner' });
  return { g, tank, rosa, maya };
}

const youngOrder = (g: GameState, m: ReturnType<typeof addStaffDirect>) => plannedOrders(g, m).find((o) => o.foodId === BRINE);

describe('Audit 2026-11-17: the stock manager orders the first foods keepers give young', () => {
  it('a keeper’s nursery with no baby brine in stock: Rosa plans packs of it (two fry servings a round, two rounds a day)', () => {
    const { g, rosa } = nursery();
    // 40 young → 2 servings a round; a tank of young only gets the 8 AM and 6 PM rounds
    expect([...plannedYoungUsage(g)]).toEqual([[BRINE, 4]]);
    const o = youngOrder(g, rosa);
    expect(o).toMatchObject({ kind: 'food', foodId: BRINE, urgency: 0 });
    expect(o!.packs).toBeGreaterThanOrEqual(1);
  });

  it('enough in stock for her target days: no order', () => {
    const { g, rosa } = nursery();
    g.inventory.foods[BRINE] = 200;
    expect(youngOrder(g, rosa)).toBeUndefined();
  });

  it('the player’s own nursery (no keeper) or a tank a working doser feeds: nothing new is planned', () => {
    const own = nursery({ keeper: false });
    expect(plannedYoungUsage(own.g).size).toBe(0);
    expect(youngOrder(own.g, own.rosa)).toBeUndefined();
    const dosed = nursery();
    installEquipment(dosed.g, dosed.tank.id, 'live_food_doser', { purchased: true });
    expect(plannedYoungUsage(dosed.g).size).toBe(0);
  });

  it('the same budget as every order: with nothing left today it waits, and says so', () => {
    const { g, rosa } = nursery();
    const plan = planPurchases(g, rosa, 0, g.finance.money);
    expect(plan.buys.some((b) => b.foodId === BRINE)).toBe(false);
    expect(plan.overBudget).toContain('live baby brine shrimp');
  });

  it('her shelf check buys it, the keeper’s next round feeds the fry, and the staff stream draws nothing', () => {
    const { g, tank, rosa, maya } = nursery();
    const before = g.staff!.rng;
    stockCheck(g, rosa, g.clock.hour);
    expect(g.staff!.rng).toBe(before);
    expect(g.inventory.foods[BRINE] ?? 0).toBeGreaterThan(0);
    keeperVisit(g, maya!, tank.id, 'morning', g.clock.hour);
    expect(g.log.some((e) => /couldn’t feed the fry/.test(e.text))).toBe(false);
    expect(tank.breedingEnv?.foodSeen?.baby_brine).toBe(g.clock.hour);
  });

  it('she plans what the keeper gives, whatever the brood’s size: 72 hours of rounds use exactly the planned servings', () => {
    for (const [count, trait, rounds] of [
      [40, 'gentle_hands', 2],
      [100, 'gentle_hands', 2],
      [200, 'gentle_hands', 2],
      [400, 'gentle_hands', 2],
      [10, 'gentle_hands', 2], // under 20 young: one serving a round
      [200, 'meticulous', 3], // the midday check comes 5 hours after 8 AM and before 6 PM
      [200, 'early_bird', 2],
    ] as const) {
      const { g, tank, maya } = nursery({ count, trait });
      expect(youngFeedingRounds(g, maya!, tank.id), `${count} young, ${trait}`).toBe(rounds);
      const planned = plannedYoungUsage(g).get(BRINE) ?? 0;
      expect(planned, `${count} young, ${trait}`).toBe((count <= 20 ? 1 : 2) * rounds);
      g.inventory.foods[BRINE] = 500;
      const h0 = g.clock.hour;
      stepKeepers(g, h0, h0 + 72);
      expect((500 - (g.inventory.foods[BRINE] ?? 0)) / 3, `${count} young, ${trait}`).toBe(planned);
    }
  });

  it('only rounds far enough apart feed young: a 3-meal tank’s 9 PM round, 3 hours after 6 PM, doesn’t count', () => {
    const { g, tank, maya } = nursery();
    expect(YOUNG_FED_RECENTLY_H).toBeGreaterThan(3);
    expect(tankRounds(g, maya!, tank.id, 3)).toEqual(['morning', 'evening', 'late']);
    expect(youngFeedingRounds(g, maya!, tank.id, 3)).toBe(2);
    expect(tankRounds(g, maya!, tank.id, 4)).toEqual(['morning', 'midday', 'evening', 'late']);
    expect(youngFeedingRounds(g, maya!, tank.id, 4)).toBe(3);
    expect(youngFeedingRounds(g, maya!, tank.id)).toBe(2); // young only: the usual 2 meals
  });

  it('while the water is at WATCH the keeper gives one serving a brood, and that is what she plans', () => {
    const { g, tank } = nursery({ count: 200 });
    tank.water.ammonia = 0.5;
    expect([...plannedYoungUsage(g)]).toEqual([[BRINE, 2]]);
  });

  it('a 200-young brood and the grown animals’ flakes down to one serving: the flakes first, both within the $40 budget', () => {
    const { g, rosa } = nursery({ count: 200 });
    const budget = STOCK_BUDGET.specialty_shop.default;
    expect(budget).toBe(40);
    g.inventory.foods[FLAKES] = 1;
    const adults = plannedUsage(g).get(FLAKES) ?? 0;
    expect(adults).toBeGreaterThan(1); // under a day of flakes left
    expect(plannedYoungUsage(g).get(BRINE)).toBe(4); // 2 servings × 2 rounds, not 30
    const orders = plannedOrders(g, rosa);
    const flakes = orders.findIndex((o) => o.foodId === FLAKES);
    const brine = orders.findIndex((o) => o.foodId === BRINE);
    expect(flakes).toBeGreaterThanOrEqual(0);
    expect(brine).toBeGreaterThan(flakes);
    expect(orders[brine].urgency).toBe(0); // the young are out, but the grown animals' near-empty flakes go first
    const plan = planPurchases(g, rosa, budget, g.finance.money);
    expect(plan.overBudget).toEqual([]);
    expect(plan.buys.map((b) => b.foodId)).toEqual([FLAKES, BRINE]);
    // planner, skill 2: 5.5 days' target + 1 at 4 servings a day = 26 servings, 2 packs of 20 ($16), not 5 ($40)
    expect(plan.buys.find((b) => b.foodId === BRINE)).toMatchObject({ packs: 2, price: 16 });
    expect(plan.buys.reduce((s, b) => s + b.price, 0)).toBeLessThanOrEqual(budget);
  });

  it('young food never crowds out the grown animals’: with money for only one, the flakes are bought and the brine waits', () => {
    const { g, rosa } = nursery({ count: 200 });
    g.inventory.foods[FLAKES] = 1;
    const plan = planPurchases(g, rosa, 10, g.finance.money); // flakes $6, a pack of brine $8
    expect(plan.buys.map((b) => b.foodId)).toEqual([FLAKES]);
    expect(plan.overBudget).toEqual(['live baby brine shrimp']);
    // and when nothing the grown animals eat runs out within a day, the young's food is ordered by its own days left
    g.inventory.foods[FLAKES] = 1000;
    expect(plannedOrders(g, rosa)[0]).toMatchObject({ foodId: BRINE, young: true });
    expect(ADULTS_FIRST_DAYS).toBe(1);
  });
});
