/**
 * lane:automation (chunk 5; DESIGN-S3D §9.6, §8.7; ADR-0026 decisions 10 and 14) — the stock manager with a Water room
 * (AUTO-034) and the numbers Visitors › Staff shows (AUTO-046): salt's urgency counts the days until a water change
 * would be skipped, so the day's food comes first; the order follows the mixer's use; the forecast is a dry run of the
 * next shelf check; the orders switch stops her and keeps the budget and the log quiet; without a stock manager nobody
 * reorders. Without a Water room nothing changes (staff-sim and staff2-feeding stay green).
 */
import { describe, it, expect, vi } from 'vitest';

// a shop purchase that fails at the till (the chunk 5 review): pass-through unless a test names the food. The file
// that defines buyFood, not the economy index: the index's imports reach the stock manager while the mock is made.
const failing = vi.hoisted(() => new Set<string>());
vi.mock('@/sim/economy/purchases', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/sim/economy/purchases')>();
  return { ...m, buyFood: (...a: Parameters<typeof m.buyFood>) => (failing.has(a[1]) ? { ok: false, message: 'No.' } : m.buyFood(...a)) };
});

import { facility, run } from './support/automation';
import { automationProblems, saltDaysLeft, saltWaterPerDay, SALT_KG_PER_GAL, setStockOrders, waterRoom } from '@/sim/automation';
import { nextStockCheck, planPurchases, plannedOrders, stockCheck, SALT_ORDER_DAYS } from '@/sim/staff/work';
import { VEGETABLES, EGGS_SUPPLY } from '@/data/catalog/machines';
import type { GameState } from '@/types';

/** Four marine tanks on changers, a nearly bare food shelf, and 4.1 kg of salt mix (one batch). */
function shop(budget: number) {
  const f = facility({ fresh: 1, marine: 4, salt: 4.1, rosa: budget, hour: 24 * 3 + 8.5 });
  const g = f.g;
  waterRoom(g)!.salt = 20;
  g.inventory.foods = { flake_tropical: 1, marine_pellets: 1 }; // under a day of each
  return { ...f, rosa: g.staff!.roster[0] };
}
const saltOrder = (g: GameState) => plannedOrders(g, g.staff!.roster[0]).find((o) => o.kind === 'salt');

describe('AUTO-034: the stock manager with a Water room', () => {
  it('salt\'s urgency is the days until a change would be skipped; food with less than a day goes first', () => {
    const { g, rosa } = shop(150);
    const orders = plannedOrders(g, rosa);
    const salt = saltOrder(g)!;
    expect(salt).toBeDefined();
    expect(salt.urgency).toBeCloseTo(saltDaysLeft(g), 6);
    const food = orders.filter((o) => o.kind === 'food');
    expect(food.length).toBeGreaterThan(0);
    expect(orders.indexOf(food[0])).toBeLessThan(orders.findIndex((o) => o.kind === 'salt'));
  });

  it('the order follows the mixer\'s use: about 11 days of salt mix, in 5 kg steps', () => {
    const { g } = shop(150);
    const kgDay = saltWaterPerDay(g) * SALT_KG_PER_GAL;
    expect(saltOrder(g)!.kg).toBe(Math.max(5, Math.ceil((kgDay * SALT_ORDER_DAYS) / 5) * 5));
  });

  it('what the budget leaves after food buys salt in 5 kg steps; a budget that covers both buys the whole order', () => {
    const { g, rosa } = shop(150);
    const plan = planPurchases(g, rosa, 150, g.finance.money);
    const food = plan.buys.filter((b) => b.kind === 'food').reduce((a, b) => a + b.price, 0);
    const order = saltOrder(g)!.kg!;
    const kgFits = Math.min(order, Math.floor((150 - food) / 3 / 5) * 5);
    const salt = plan.buys.find((b) => b.kind === 'salt');
    if (kgFits >= 5) expect(salt?.kg).toBe(kgFits);
    else expect(plan.overBudget).toContain('salt mix');
    const big = planPurchases(g, rosa, food + order * 3, g.finance.money);
    expect(big.buys.find((b) => b.kind === 'salt')?.kg).toBe(order);
  });

  it('the forecast dry-runs the next check: "arriving" when it will buy salt, "out" with the reason when it won\'t', () => {
    const { g } = shop(5); // too small for anything but a pack of food
    const before = JSON.stringify(g);
    const f = nextStockCheck(g)!;
    expect(f.at).toBe(24 * 3 + 9);
    expect(JSON.stringify(g)).toBe(before); // a dry run changes nothing
    g.inventory.salt = 0; // can't make a batch: out
    expect(automationProblems(g).find((p) => p.kind === 'supply' && p.supply === 'salt')).toMatchObject({ state: 'out', tone: 'danger', why: 'budget' });
    g.staff!.stockBudget = 1000; // raised: takes effect at her next check
    expect(automationProblems(g).find((p) => p.kind === 'supply' && p.supply === 'salt')).toMatchObject({ state: 'arriving', tone: 'watch', arrives: 24 * 3 + 9 });
    run(g, 1); // 09:00: she buys it
    expect(g.inventory.salt).toBeGreaterThanOrEqual(5);
    expect(automationProblems(g).some((p) => p.kind === 'supply' && p.supply === 'salt')).toBe(false);
  });

  it('with her orders switched off she buys nothing and logs nothing, and the budget is kept (ADR-0026 decision 10)', () => {
    const { g, rosa } = shop(150);
    setStockOrders(g, false);
    const log = g.log.length;
    const money = g.finance.money;
    stockCheck(g, rosa, g.clock.hour);
    expect(g.finance.money).toBe(money);
    expect(g.log.length).toBe(log);
    expect(g.staff!.stockBudget).toBe(150);
    g.inventory.salt = 0;
    expect(automationProblems(g).find((p) => p.kind === 'supply' && p.supply === 'salt')).toMatchObject({ why: 'orders_off' });
    setStockOrders(g, true);
    expect(g.staff!.ordersOff).toBeUndefined();
  });

  it('without a stock manager nobody reorders: no forecast, no "arriving" (ADR-0026 decision 14)', () => {
    const f = facility({ fresh: 0, marine: 2, salt: 0, rosa: null });
    expect(nextStockCheck(f.g)).toBeNull();
    expect(automationProblems(f.g).find((p) => p.kind === 'supply' && p.supply === 'salt')).toMatchObject({ state: 'out', why: 'no_manager' });
  });

  it('the keepers\' salt stays in the order with a Water room: salt tanks without a changer keep their changes\' worth (the chunk 5 review)', () => {
    // three marine tanks with no Auto Water Changer: the keepers change them with shelf salt (INTAKE C-67)
    const f = facility({ fresh: 0, marine: 3, salt: 0, rosa: 150 });
    for (const t of f.marine) t.equipment = t.equipment.filter((e) => e.defId !== 'auto_water_changer');
    expect(saltWaterPerDay(f.g)).toBeCloseTo(0, 9); // the mixer has nothing to do
    const withRoom = saltOrder(f.g);
    expect(withRoom).toBeDefined();
    const room = f.g.facility.water;
    delete f.g.facility.water;
    expect(saltOrder(f.g)).toEqual(withRoom); // the same order as before the research
    f.g.facility.water = room;
    // one of them back on a changer: the mixer's order and the other two tanks' changes add up, the more urgent first
    f.marine[0].equipment.push(...facility({ fresh: 0, marine: 1 }).marine[0].equipment.filter((e) => e.defId === 'auto_water_changer'));
    const both = saltOrder(f.g)!;
    const kgDay = saltWaterPerDay(f.g) * SALT_KG_PER_GAL;
    expect(kgDay).toBeGreaterThan(0);
    const mixerKg = Math.max(5, Math.ceil((kgDay * SALT_ORDER_DAYS) / 5) * 5);
    expect(both.kg!).toBeGreaterThan(mixerKg);
    expect(both.urgency).toBeLessThanOrEqual(saltDaysLeft(f.g));
  });

  it('food still comes first in a mixed facility with the shelf under two batches (the confirmation review)', () => {
    // hatchery cones use salt water; three marine tanks have no changer (keepers, shelf salt); 4.1 kg; the food is out
    const f = facility({ fresh: 1, marine: 3, salt: 4.1, rosa: 150, food: true, eggs: 30, veg: 20 });
    for (const t of f.marine) t.equipment = t.equipment.filter((e) => e.defId !== 'auto_water_changer');
    f.g.inventory.foods = { ...f.g.inventory.foods, flake_tropical: 0, marine_pellets: 0, micro_pellets: 0 };
    const orders = plannedOrders(f.g, f.g.staff!.roster[0]);
    const salt = orders.findIndex((o) => o.kind === 'salt');
    expect(salt).toBeGreaterThan(-1);
    expect(orders[salt].urgency).toBeGreaterThanOrEqual(-1); // the keepers' rule's floor, as before chunk 5
    for (const o of orders.filter((x) => x.kind === 'food' && (f.g.inventory.foods[x.foodId!] ?? 0) < 1)) expect(orders.indexOf(o)).toBeLessThan(salt);
  });

  it('a purchase that fails leaves its money for the orders after it (the chunk 5 review)', () => {
    const { g, rosa } = shop(60); // $18 of food first, then 10 kg of a 15 kg salt order
    const plan = planPurchases(g, rosa, 60, g.finance.money);
    const food = plan.buys[0];
    expect(food.kind).toBe('food'); // the most urgent buy: food with less than a day left
    // salt comes after it, and the budget limits it
    const saltBuy = plan.buys.find((b) => b.kind === 'salt')?.kg ?? 0;
    expect(saltBuy).toBeLessThan(saltOrder(g)!.kg!);
    const others = plan.buys.slice(1).reduce((a, b) => a + b.price, 0);
    failing.add(food.foodId!);
    try {
      const money = g.finance.money;
      const had = g.inventory.foods[food.foodId!] ?? 0;
      stockCheck(g, rosa, g.clock.hour);
      const spent = g.staff!.stockSpent.amount;
      expect(spent).toBeGreaterThan(others); // the failed food's money went to the salt after it
      expect(spent).toBeLessThanOrEqual(60);
      expect(money - g.finance.money).toBeCloseTo(spent, 2);
      expect(g.inventory.foods[food.foodId!] ?? 0).toBe(had); // and the failed food wasn't bought
    } finally {
      failing.clear();
    }
  });

  it('the cultures\' supplies join her plan (INTAKE C-20): eggs by the tin, vegetables for the jars', () => {
    const f = facility({ fresh: 1, marine: 0, food: true, eggs: 0, veg: 0, rosa: 300 });
    const orders = plannedOrders(f.g, f.g.staff!.roster[0]);
    expect(orders.find((o) => o.kind === 'eggs')).toMatchObject({ unit: EGGS_SUPPLY.price });
    expect(orders.some((o) => o.kind === 'food' && o.foodId === VEGETABLES)).toBe(true);
    run(f.g, 24); // her 9 AM check
    expect(f.g.inventory.brineShrimpEggs ?? 0).toBeGreaterThanOrEqual(EGGS_SUPPLY.scoops - f.g.facility.food!.cones.length);
  });
});
