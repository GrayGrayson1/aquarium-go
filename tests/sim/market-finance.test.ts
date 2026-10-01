import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { devStepEconomy, dailyOperatingCost, earn, spend, buySalt, cashSuggestions, LOAN_AFTER_DEBT_HOURS } from '@/sim/economy';

function world(seed = 3): GameState {
  const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
  g.clock.hour = 8; // 8 AM day 1
  return g;
}

/** Hours from now until just after the next midnight. */
const toMidnight = (g: GameState) => 24 - (g.clock.hour % 24) + 0.25;

describe('market: finances', () => {
  it('spend/earn keep the ledger honest', () => {
    const g = world();
    g.finance.money = 100;
    earn(g, 25.5, 'tips', 'test');
    expect(g.finance.money).toBeCloseTo(125.5, 5);
    expect(spend(g, 200, 'other', 'too much')).toBe(false);
    expect(g.finance.money).toBeCloseTo(125.5, 5);
    expect(spend(g, 200, 'operating', 'bill', true)).toBe(true);
    expect(g.finance.money).toBeCloseTo(-74.5, 5);
    earn(g, Number.NaN, 'tips', 'bad');
    earn(g, -5, 'tips', 'bad');
    expect(g.finance.money).toBeCloseTo(-74.5, 5);
    const last = g.finance.ledger.at(-1)!;
    expect(last.amount).toBeCloseTo(-200, 5);
    expect(last.category).toBe('operating');
  });

  it('pays operating costs at midnight with a ledger breakdown and writes a daily summary', () => {
    const g = world();
    g.finance.money = 1000;
    const costs = dailyOperatingCost(g);
    expect(costs.total).toBeGreaterThanOrEqual(0);
    expect(costs.tanks.length).toBe(g.tankOrder.length);
    const before = g.finance.money;
    earn(g, 40, 'admission', 'visitors');
    devStepEconomy(g, toMidnight(g), { finance: true, market: false });
    expect(g.finance.daily.length).toBe(1);
    const d = g.finance.daily[0];
    expect(d.day).toBe(1);
    expect(d.income).toBeCloseTo(40, 5);
    expect(d.expenses).toBeCloseTo(costs.total, 2);
    expect(g.finance.money).toBeCloseTo(before + 40 - costs.total, 2);
    if (costs.total > 0) expect(g.finance.ledger.some((e) => e.category === 'operating' && /Running costs/.test(e.memo))).toBe(true);
    // Bills are paid exactly once per day.
    devStepEconomy(g, 12, { finance: true, market: false });
    expect(g.finance.daily.length).toBe(1);
    devStepEconomy(g, 24, { finance: true, market: false });
    expect(g.finance.daily.length).toBe(2);
  });

  it('going broke is graceful: debt, warnings with suggestions, purchases blocked, then a one-time club loan', () => {
    const g = world(9);
    const costs = dailyOperatingCost(g);
    g.finance.money = costs.total > 0 ? 0 : -5;
    devStepEconomy(g, toMidnight(g), { finance: true, market: false });
    expect(g.finance.money).toBeLessThan(0);
    expect(g.finance.debtSinceHour).toBeDefined();
    const warn = g.log.filter((e) => e.kind === 'warning' && /in the red/.test(e.text));
    expect(warn.length).toBeGreaterThan(0);
    expect(warn[0].text).toMatch(/nothing is ever taken from you/);
    expect(warn[0].text).not.toMatch(/animals are safe/);
    expect(cashSuggestions(g).length).toBeGreaterThan(0);
    // Animals are never repossessed.
    const alive = Object.values(g.creatures).filter((c) => c.status === 'alive').length;
    expect(alive).toBeGreaterThan(0);
    // Purchases are blocked while in debt.
    const m = g.finance.money;
    expect(buySalt(g, 1).ok).toBe(false);
    expect(g.finance.money).toBe(m);

    devStepEconomy(g, LOAN_AFTER_DEBT_HOURS + 1, { finance: true, market: false });
    expect(g.finance.loan).toBeDefined();
    expect(g.finance.money).toBeGreaterThan(0);
    expect(g.finance.debtSinceHour).toBeUndefined();
    expect(g.log.some((e) => /Aquarium Club/i.test(e.text) && /lent you/.test(e.text))).toBe(true);
    const loan = g.finance.loan!;
    expect(loan.outstanding).toBe(loan.amount);

    // Repaid automatically from a share of future income.
    earn(g, 400, 'livestock_sale', 'a sale');
    devStepEconomy(g, toMidnight(g), { finance: true, market: false });
    expect(g.finance.loan!.outstanding).toBeLessThan(loan.amount);

    // One-time only: another spell of debt never grants a second loan.
    g.finance.money = -50;
    devStepEconomy(g, LOAN_AFTER_DEBT_HOURS + 30, { finance: true, market: false });
    expect(g.finance.ledger.filter((e) => /Emergency loan/.test(e.memo)).length).toBe(1);
  });

  it('showcase worlds never pay bills', () => {
    const g = world(10);
    g.isShowcase = true;
    g.finance.money = 100;
    devStepEconomy(g, 48, { finance: true, market: false });
    expect(g.finance.money).toBe(100);
  });

  it('corrupt money values are repaired, never propagated', () => {
    const g = world(11);
    g.finance.money = Number.NaN;
    devStepEconomy(g, 1, { finance: true, market: false });
    expect(Number.isFinite(g.finance.money)).toBe(true);
  });
});
