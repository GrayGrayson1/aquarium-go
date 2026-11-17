/**
 * Audit 2026-11-17 (H11, H12, H13, H18) — what the Staff screens and the keepers' notices say matches what the team
 * does: a candidate's capacity in tanks and exhibits (not "tank units"), the next duty at the hour it really happens,
 * the no-food notice's advice for the reason no food is coming, and the Thrifty trait's promise.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { addStaffDirect, keeperVisit, nextDuty } from '@/sim/staff';
import { restockHint, talkHours } from '@/sim/staff/work';
import { STAFF_TRAITS } from '@/data/staff';
import { getSpecies } from '@/data/species';
import { capacityLine } from '@/ui/panels/visitors/StaffTab';

function shop(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
  g.isShowcase = false;
  g.facility.openToPublic = true;
  for (let i = 0; i < 3; i++) createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 6 + i * 3, z: 2, rotY: 0 }, name: `Tank ${i + 2}` });
  return g;
}

describe('Audit 2026-11-17 (H11): capacity in tanks and exhibits', () => {
  it('candidates say how many tanks or exhibits they can take; a keeper’s card says tanks and room left', () => {
    const g = shop();
    const maya = addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 2, trait: 'gentle_hands' });
    expect(capacityLine(g, maya, false)).toMatch(/^Can look after about \d+ tanks like yours$/);
    maya.tankIds = g.tankOrder.slice(0, 2);
    expect(capacityLine(g, maya, true)).toMatch(/^Rounds: 2 tanks · room for about \d+ more$/);
    const theo = addStaffDirect(g, { name: 'Theo Marsh', role: 'docent', skill: 2, trait: 'storyteller' });
    expect(capacityLine(g, theo, false)).toBe('Presents up to 5 exhibits');
    const rosa = addStaffDirect(g, { name: 'Rosa Diaz', role: 'stock_manager', skill: 1, trait: 'early_bird' });
    expect(capacityLine(g, rosa, false)).toBe('Checks the shelves at 8:00 AM (and 3:00 PM from ★★★)');
  });
});

describe('Audit 2026-11-17 (H12): the next duty is when it happens', () => {
  it('an early-bird stock manager checks at 8 AM; a second docent talks at a quarter past', () => {
    const g = shop();
    g.clock.hour = 24 * 2 + 6; // 6 AM
    const rosa = addStaffDirect(g, { name: 'Rosa Diaz', role: 'stock_manager', skill: 3, trait: 'early_bird' });
    expect(nextDuty(g, rosa)).toBe('Next shelf check at 8:00 AM');
    addStaffDirect(g, { name: 'Theo Marsh', role: 'docent', skill: 2, trait: 'storyteller' });
    const ana = addStaffDirect(g, { name: 'Ana Silva', role: 'docent', skill: 2, trait: 'early_bird' });
    expect(talkHours(g, ana)).toEqual([10.25, 11.25, 14.25, 16.25]);
    expect(nextDuty(g, ana)).toBe('Next talk at 10:15 AM');
  });
});

describe('Audit 2026-11-17 (H13): the no-food advice fits why no food is coming', () => {
  it('no manager, orders off, an empty till, else the budget', () => {
    const g = shop();
    const sp = [getSpecies('betta')];
    g.finance.money = 500;
    expect(restockHint(g, sp)).toBe('Buy food in Market › Supplies, or hire a stock manager.');
    addStaffDirect(g, { name: 'Rosa Diaz', role: 'stock_manager', skill: 2, trait: 'planner' });
    expect(restockHint(g, sp)).toBe('Buy food in Market › Supplies, or raise Rosa’s stock budget.');
    g.staff!.ordersOff = true;
    expect(restockHint(g, sp)).toBe('Buy food in Market › Supplies, or switch Rosa’s orders back on in Visitors › Staff.');
    g.finance.money = 0;
    expect(restockHint(g, sp)).toBe('Buy food in Market › Supplies once there’s cash.');
  });
});

describe('Audit 2026-11-17 (H18): the Thrifty trait promises what it does', () => {
  it('one pack at a time, no "best value"', () => {
    expect(STAFF_TRAITS.thrifty.line).toBe('orders one pack at a time, so nothing sits on the shelf');
  });
});

describe('Audit 2026-11-17 (H26): the team’s flags', () => {
  it('a "No food" flag goes once that tank is fed again', () => {
    const g = shop();
    const tank = g.tanks[g.tankOrder[0]];
    const maya = addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 2, trait: 'gentle_hands', tankIds: [tank.id] });
    for (const c of Object.values(g.creatures)) if (c.tankId === tank.id) c.stats.hunger = 60;
    const stock = { ...g.inventory.foods };
    g.inventory.foods = {};
    keeperVisit(g, maya, tank.id, 'morning', g.clock.hour);
    expect(maya.today?.issues.some((t) => t.startsWith('No food for the ') && t.endsWith(` in ${tank.name}`))).toBe(true);
    g.inventory.foods = stock;
    keeperVisit(g, maya, tank.id, 'evening', g.clock.hour + 10);
    expect(maya.today?.issues.some((t) => t.startsWith('No food for the '))).toBe(false);
  });
});
