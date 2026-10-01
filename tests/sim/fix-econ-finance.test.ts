/**
 * Fix lane ECON — finance regressions: the empty-room restart loan (P5-08), honest debt copy (S03-09) and the loan
 * landing before payday (S05-11 coordination).
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { devStepEconomy, restartNeed, RESTART_AFTER_HOURS, LOAN_AFTER_DEBT_HOURS, earn } from '@/sim/economy';
import { staffStoreWorld, hireTeam } from '@/dev/fixtures/staff';
import { STAFF_NOTICE_DAYS } from '@/data/staff';

function brokeWorld(seed = 5, money = 11) {
  const g = newGame({ starterId: 'betta', starterName: 'Broke', seed });
  for (const c of Object.values(g.creatures)) c.status = 'dead';
  g.finance.money = money;
  return g;
}
const toMidnight = (hour: number) => 24 - (hour % 24) + 0.01;

describe('P5-08 — an empty room the player cannot restock is not a dead end', () => {
  it('flags the stranded room at one midnight and lends a restart at the next', () => {
    const g = brokeWorld();
    expect(restartNeed(g)).not.toBeNull();
    devStepEconomy(g, toMidnight(g.clock.hour), { finance: true, market: true });
    expect(g.finance.strandedSinceHour).toBeDefined();
    expect(g.finance.loan).toBeUndefined();
    expect(g.log.some((e) => e.kind === 'tip' && /still true tomorrow/.test(e.text))).toBe(true);
    devStepEconomy(g, RESTART_AFTER_HOURS, { finance: true, market: true });
    expect(g.finance.loan).toBeDefined();
    expect(g.finance.strandedSinceHour).toBeUndefined();
    expect(g.finance.money).toBeGreaterThanOrEqual(120);
    expect(restartNeed(g)).toBeNull();
    expect(g.log.some((e) => /start again/.test(e.text))).toBe(true);
    // Well before the old 18-day wait for the debt loan.
    expect(g.clock.hour).toBeLessThan(72);
  });

  it('is not stranded while something is alive, hatching or listed, or when the player can afford an animal', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Fine', seed: 6 });
    g.finance.money = 11;
    expect(restartNeed(g)).toBeNull();
    const g2 = brokeWorld(6, 500);
    expect(restartNeed(g2)).toBeNull();
    const g3 = brokeWorld(7, 5);
    g3.clutches.x = { id: 'x', speciesId: 'betta', tankId: g3.tankOrder[0], count: 20, stage: 'eggs' } as never;
    expect(restartNeed(g3)).toBeNull();
  });

  it('tops up an existing loan when the room empties again, so the game never soft-locks', () => {
    const g = brokeWorld(8, 2);
    g.finance.loan = { amount: 200, outstanding: 150, takenHour: 0 };
    devStepEconomy(g, toMidnight(g.clock.hour) + RESTART_AFTER_HOURS, { finance: true, market: true });
    expect(g.finance.loan!.amount).toBeGreaterThan(200);
    expect(g.finance.loan!.outstanding).toBeGreaterThan(150);
    expect(g.finance.money).toBeGreaterThanOrEqual(120);
    expect(g.log.some((e) => /lent you another/.test(e.text))).toBe(true);
  });
});

describe('S03-09 — the debt warning is honest about what is paused', () => {
  it('says food is included, and does not claim "animals are safe" when the shelf is bare or nothing is alive', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Debt', seed: 9 });
    g.finance.money = -5;
    g.inventory.foods = {};
    for (const id of g.tankOrder) if (g.tanks[id].cache) g.tanks[id].cache!.foodLevel = 'out';
    devStepEconomy(g, toMidnight(g.clock.hour), { finance: true, market: false });
    const warn = g.log.filter((e) => e.kind === 'warning' && /in the red/.test(e.text));
    expect(warn.length).toBeGreaterThan(0);
    expect(warn[0].text).toMatch(/food included/);
    expect(warn[0].text).toMatch(/food shelf is bare/);
    expect(warn[0].text).not.toMatch(/animals are safe/);

    const g2 = brokeWorld(10, -5);
    devStepEconomy(g2, toMidnight(g2.clock.hour), { finance: true, market: false });
    const w2 = g2.log.filter((e) => e.kind === 'warning' && /in the red/.test(e.text));
    expect(w2.length).toBeGreaterThan(0);
    expect(w2[0].text).not.toMatch(/animals are safe/);
  });
});

describe('S05-11 coordination — the debt loan lands at midnight before the bills that follow it', () => {
  it('grants the loan at the LOAN_AFTER_DEBT_HOURS midnight and keeps it one-time for debt', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Loan', seed: 11 });
    g.finance.money = 0;
    devStepEconomy(g, toMidnight(g.clock.hour), { finance: true, market: false });
    expect(g.finance.money).toBeLessThan(0);
    const since = g.finance.debtSinceHour!;
    devStepEconomy(g, LOAN_AFTER_DEBT_HOURS - 1, { finance: true, market: false });
    expect(g.finance.loan).toBeUndefined();
    devStepEconomy(g, 2, { finance: true, market: false });
    expect(g.finance.loan).toBeDefined();
    expect(g.finance.loan!.takenHour - since).toBeLessThanOrEqual(LOAN_AFTER_DEBT_HOURS + 1);
    earn(g, 50, 'livestock_sale', 'x');
    g.finance.money = -50;
    devStepEconomy(g, LOAN_AFTER_DEBT_HOURS + 30, { finance: true, market: false });
    expect(g.finance.ledger.filter((e) => /Emergency loan/.test(e.memo)).length).toBe(1);
  });
});

describe('S05-11 ordering (round-3 R10-04) — the loan lands before payday on the same midnight', () => {
  it('an aquarist on their last unpaid day is paid from the loan and stays', () => {
    const g = staffStoreWorld();
    hireTeam(g);
    const aq = g.staff!.roster.find((m) => m.role === 'aquarist')!;
    aq.unpaidDays = STAFF_NOTICE_DAYS - 1;
    g.finance.money = -100;
    // the debt turns LOAN_AFTER_DEBT_HOURS old exactly on this midnight (not on a step before it)
    const mid = Math.ceil(g.clock.hour / 24) * 24;
    g.finance.debtSinceHour = mid - LOAN_AFTER_DEBT_HOURS + 0.005;
    devStepEconomy(g, toMidnight(g.clock.hour), { finance: true, market: false });
    expect(g.finance.loan).toBeDefined();
    expect(g.finance.loan!.takenHour).toBeGreaterThan(mid - 1); // the midnight step's start hour
    expect(g.staff!.roster.some((m) => m.id === aq.id)).toBe(true);
    expect(aq.unpaidDays).toBe(0);
    const memos = g.finance.ledger.filter((e) => e.hour > mid - 1).map((e) => e.memo);
    const loanAt = memos.findIndex((m) => /Emergency loan/.test(m));
    const wagesAt = memos.findIndex((m) => /^Wages/.test(m));
    expect(loanAt).toBeGreaterThanOrEqual(0);
    expect(wagesAt).toBeGreaterThan(loanAt);
  });
});
