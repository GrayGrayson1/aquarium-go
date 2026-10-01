/**
 * Fix lane STAFF — staff and growth regressions.
 *
 *   S05-03  the stock manager buys what the cash allows, most urgent first, and blames the right blocker.
 *   S05-04  the keeper only calms flow that is too STRONG, and never below what a current-loving resident needs.
 *   S05-05  a docent covers only the exhibits they present (none assigned = no effect); new display tanks join a round.
 *   S05-11  the club's loan lands before the unpaid team walks out.
 *   S05-10  stepTankDecor takes the step's own start hour, so pieces of a catch-up see the right day/night window.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { staffStoreWorld, hireTeam } from '@/dev/fixtures/staff';
import { FIXTURES } from '@/dev/fixtures';
import { addPlacedTank, stockTank, unlockEverything, ensureFacility, finishTank } from '@/dev/fixtures/core-helpers';
import { installEquipment } from '@/sim/care';
import { addStaffDirect, keeperWaterCare, stockCheck, plannedOrders, docentEffect, assignTank, tidyAssignments } from '@/sim/staff';
import { getWaterReport } from '@/sim/water';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { STAFF_NOTICE_DAYS } from '@/data/staff';
import { LOAN_AFTER_DEBT_HOURS } from '@/sim/economy/finance';
import { stepTankDecor } from '@/sim/aquascape';
import { litFraction } from '@/sim/aquascape/growth';

describe('S05-03 — stock orders under tight cash', () => {
  it('with $15 the most urgent staple gets the packs the cash allows, and the warning blames cash, not the budget', () => {
    const g = staffStoreWorld();
    hireTeam(g);
    const sm = g.staff!.roster.find((m) => m.role === 'stock_manager')!;
    for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 4;
    g.finance.money = 15;
    g.log = [];
    const orders = plannedOrders(g, sm);
    expect(orders.length).toBeGreaterThan(1);
    const first = orders[0];
    expect(first.kind).toBe('food');
    const price = getFoodDef(first.foodId!)!.price;
    expect(price * (first.packs ?? 1)).toBeGreaterThan(15); // the whole order is unaffordable…
    const before = g.inventory.foods[first.foodId!] ?? 0;
    stockCheck(g, sm, g.clock.hour);
    expect(g.inventory.foods[first.foodId!]).toBeGreaterThan(before); // …but some packs of it were bought
    expect(g.finance.money).toBeLessThan(15);
    expect(g.finance.money).toBeGreaterThanOrEqual(0);
    const warn = g.log.find((e) => /couldn’t reorder/.test(e.text));
    expect(warn?.text).toMatch(/enough cash/);
    expect(warn?.text).not.toMatch(/stock budget is spent/);
  });

  it('when only the budget is the limit, the warning says so', () => {
    const g = staffStoreWorld();
    hireTeam(g);
    const sm = g.staff!.roster.find((m) => m.role === 'stock_manager')!;
    for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 4;
    g.finance.money = 5000;
    g.staff!.stockBudget = 20;
    g.log = [];
    stockCheck(g, sm, g.clock.hour);
    const warn = g.log.find((e) => /couldn’t reorder/.test(e.text));
    expect(warn?.text).toMatch(/stock budget is spent/);
  });
});

describe('S05-04 — the keeper and water flow', () => {
  function tangRun() {
    const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'X', seed: 5, shopName: 'T' });
    g.progress.tutorial.done = true;
    ensureFacility(g, 'aquarium_store');
    unlockEverything(g);
    const t = addPlacedTank(g, 'g180', 'marine_fowlr', 'Tang Run');
    stockTank(g, t.id, [{ species: ['yellow_tang'], count: 1 }, { species: ['ocellaris_clownfish'], count: 2 }]);
    finishTank(g, t);
    const pumps = (e: { defId: string }) => ['powerhead', 'wavemaker'].includes(getEquipmentDef(e.defId)?.kind ?? '');
    t.equipment = t.equipment.filter((e) => !pumps(e) || e.defId === 'powerhead_small');
    if (!t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'powerhead')) installEquipment(g, t.id, 'powerhead_small');
    for (const e of t.equipment) if (pumps(e)) { e.setting = 1; e.on = true; }
    const m = addStaffDirect(g, { name: 'Kai Osei', role: 'aquarist', skill: 3, trait: 'algae_hunter', tankIds: [t.id] });
    const flow = () => getWaterReport(g, t.id).params.find((p) => p.key === 'flow')!;
    const setting = () => t.equipment.filter(pumps).map((e) => e.setting ?? 1);
    return { g, t, m, flow, setting };
  }

  it('does not turn the pumps down when the water is too still for a tang', () => {
    const { g, t, m, flow, setting } = tangRun();
    expect(flow().reason).toMatch(/too still/);
    keeperWaterCare(g, m, t, 'morning', g.clock.hour);
    expect(setting().every((s) => s >= 1)).toBe(true);
  });

  it('still calms a current that is too strong for a low-flow resident', () => {
    const g = newGame({ starterId: 'betta', starterName: 'X', seed: 5, shopName: 'T' });
    g.progress.tutorial.done = true;
    ensureFacility(g, 'aquarium_store');
    unlockEverything(g);
    const t = addPlacedTank(g, 'g29', 'freshwater_tropical', 'Betta Bay');
    stockTank(g, t.id, [{ species: ['betta'], count: 1 }]);
    finishTank(g, t);
    installEquipment(g, t.id, 'powerhead_large');
    for (const e of t.equipment) if (getEquipmentDef(e.defId)?.kind === 'powerhead') { e.setting = 1; e.on = true; }
    const flow = () => getWaterReport(g, t.id).params.find((p) => p.key === 'flow')!;
    expect(flow().reason).toMatch(/too strong/);
    const m = addStaffDirect(g, { name: 'Kai Osei', role: 'aquarist', skill: 3, trait: 'algae_hunter', tankIds: [t.id] });
    keeperWaterCare(g, m, t, 'morning', g.clock.hour);
    const ph = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'powerhead')!;
    expect(ph.setting).toBeLessThan(0.2);
  });
});

describe('S05-05 — docent reach', () => {
  it('no exhibits assigned means no coverage; one each is a little; all is a lot', () => {
    const g = (FIXTURES as Record<string, () => ReturnType<typeof newGame>>).big_facility();
    const docents = g.staff!.roster.filter((m) => m.role === 'docent');
    expect(docents.length).toBeGreaterThan(0);
    const all = docentEffect(g, g.clock.hour)!;
    for (const m of docents) for (const id of m.tankIds.slice(1)) assignTank(g, m.id, id, false);
    const one = docentEffect(g, g.clock.hour)!;
    for (const m of docents) for (const id of [...m.tankIds]) assignTank(g, m.id, id, false);
    const none = docentEffect(g, g.clock.hour)!;
    expect(all.coverage).toBeGreaterThan(one.coverage);
    expect(one.coverage).toBeGreaterThan(0);
    expect(none.coverage).toBe(0);
    expect(none.sat).toBe(0);
    expect(none.donation).toBe(1);
  });

  it('a new display tank joins the lightest docent’s round', () => {
    const g = staffStoreWorld();
    hireTeam(g);
    const d = addStaffDirect(g, { name: 'Jonah Mensah', role: 'docent', skill: 3, trait: 'storyteller' });
    d.tankIds = d.tankIds.slice(0, 2);
    const t = addPlacedTank(g, 'g29', 'freshwater_tropical', 'New Exhibit');
    tidyAssignments(g);
    expect(d.tankIds.length).toBe(3);
    expect(d.tankIds).toContain(t.id);
  });
});

describe('S05-11 — the club’s loan arrives before the team walks out', () => {
  it('a cash crunch ends with the loan paying wages, not an empty roster', () => {
    expect(STAFF_NOTICE_DAYS * 24).toBeGreaterThan(LOAN_AFTER_DEBT_HOURS);
    const g = staffStoreWorld();
    hireTeam(g);
    const team = g.staff!.roster.length;
    g.facility.openToPublic = false;
    g.finance.money = 40;
    g.log = [];
    const texts: string[] = [];
    for (let h = 0; h < 6 * 24; h++) {
      advanceWorld(g, 1);
      for (const e of g.log.splice(0)) texts.push(e.text);
    }
    expect(texts.some((t) => /lent you/.test(t))).toBe(true);
    expect(texts.some((t) => /has left: their wages went unpaid/.test(t))).toBe(false);
    expect(g.staff!.roster.length).toBe(team);
    const notice = texts.find((t) => /wasn’t enough cash to pay/.test(t));
    expect(notice).toMatch(/may step in/);
  });
});

describe('S05-10 — growth pieces anchored to their own start hour', () => {
  it('four one-hour pieces with their start hours grow the same as one four-hour step', () => {
    const make = () => {
      const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 42, shopName: 'T' });
      const t = g.tanks[g.tankOrder[0]];
      g.clock.hour = 24 * 5 + 10; // 06:00–10:00 window straddles lights-on
      for (const d of t.decor) if (d.growth !== undefined) d.growth = 0.3;
      return { g, t };
    };
    const total = (t: { decor: { growth?: number }[] }) => t.decor.reduce((a, d) => a + (d.growth ?? 0), 0);
    const a = make();
    expect(litFraction(a.t, a.g.clock.hour - 4, a.g.clock.hour)).toBeGreaterThan(0);
    expect(litFraction(a.t, a.g.clock.hour - 4, a.g.clock.hour)).toBeLessThan(1);
    stepTankDecor(a.g, a.t, 4);
    const b = make();
    for (let i = 0; i < 4; i++) stepTankDecor(b.g, b.t, 1, b.g.clock.hour - 4 + i);
    const c = make();
    for (let i = 0; i < 4; i++) stepTankDecor(c.g, c.t, 1); // the old anchoring: every piece thinks it is 09:00–10:00
    expect(Math.abs(total(b.t) - total(a.t))).toBeLessThan(1e-6);
    expect(Math.abs(total(c.t) - total(a.t))).toBeGreaterThan(1e-4);
  });
});
