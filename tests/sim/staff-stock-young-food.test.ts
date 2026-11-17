/**
 * Audit 2026-11-17 (follow-up to H2) — keepers feed young their first foods from stock, so the stock manager keeps
 * those foods on the shelf: her plan counts the young in keepers' tanks (the food the keeper would pick), within the
 * same budget and rules as every other order, and draws nothing (the staff stream is untouched).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { getSpecies } from '@/data/species';
import { createClutch } from '@/sim/life/breeding/clutch';
import { installEquipment } from '@/sim/care';
import { addStaffDirect, keeperVisit, plannedOrders, stockCheck } from '@/sim/staff';
import { planPurchases, plannedYoungUsage } from '@/sim/staff/work';
import { BRINE } from '@/data/catalog/machines';

function nursery(opts: { keeper?: boolean } = {}): { g: GameState; tank: Tank; rosa: ReturnType<typeof addStaffDirect>; maya: ReturnType<typeof addStaffDirect> | null } {
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
  const cl = createClutch(g, { sp, tank, mother, father, hour: g.clock.hour, stage: 'fry', count: 40, visual: 'fry_cloud', nextStageHour: g.clock.hour + 200 });
  cl.stageSinceHour = g.clock.hour - sp.breeding.fryRearingHours * 0.5; // past the yolk, into the fry phase (baby brine first)
  const maya = opts.keeper === false ? null : addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 2, trait: 'gentle_hands', tankIds: [tank.id] });
  const rosa = addStaffDirect(g, { name: 'Rosa Diaz', role: 'stock_manager', skill: 2, trait: 'planner' });
  return { g, tank, rosa, maya };
}

const youngOrder = (g: GameState, m: ReturnType<typeof addStaffDirect>) => plannedOrders(g, m).find((o) => o.foodId === BRINE);

describe('Audit 2026-11-17: the stock manager orders the first foods keepers give young', () => {
  it('a keeper’s nursery with no baby brine in stock: Rosa plans packs of it (two fry servings a round, three rounds a day)', () => {
    const { g, rosa } = nursery();
    expect([...plannedYoungUsage(g)]).toEqual([[BRINE, 6]]); // 40 young → 2 servings a round
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
});
