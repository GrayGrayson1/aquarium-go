/**
 * lane:automation (chunk 5; DESIGN-S3D §9.6, §8.7; ADR-0026 decisions 10 and 14) — the stock manager with a Water room
 * (AUTO-034) and the numbers Visitors › Staff shows (AUTO-046): salt's urgency counts the days until a water change
 * would be skipped, so the day's food comes first; the order follows the mixer's use; the forecast is a dry run of the
 * next shelf check; the orders switch stops her and keeps the budget and the log quiet; without a stock manager nobody
 * reorders. Without a Water room nothing changes (staff-sim and staff2-feeding stay green).
 */
import { describe, it, expect } from 'vitest';
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

  it('the cultures\' supplies join her plan (INTAKE C-20): eggs by the tin, vegetables for the jars', () => {
    const f = facility({ fresh: 1, marine: 0, food: true, eggs: 0, veg: 0, rosa: 300 });
    const orders = plannedOrders(f.g, f.g.staff!.roster[0]);
    expect(orders.find((o) => o.kind === 'eggs')).toMatchObject({ unit: EGGS_SUPPLY.price });
    expect(orders.some((o) => o.kind === 'food' && o.foodId === VEGETABLES)).toBe(true);
    run(f.g, 24); // her 9 AM check
    expect(f.g.inventory.brineShrimpEggs ?? 0).toBeGreaterThanOrEqual(EGGS_SUPPLY.scoops - f.g.facility.food!.cones.length);
  });
});
