/**
 * lane:automation (chunk 5; DESIGN-S3D §8.4, §10; ADR-0026 decision 8) — the machines (AUTO-038, AUTO-045's sim part):
 * prices, upkeep and upgrades come from data; upgrades are paid from the money; the rooms' upkeep is posted nightly as
 * its own ledger entry and counts in the day's bill; dosers are tank equipment.
 */
import { describe, it, expect } from 'vitest';
import { facility, run } from './support/automation';
import { addCulture, addReservoir, freshCap, prepRate, roomsUpkeep, saltCap, upgradePrep, waterRoom } from '@/sim/automation';
import { dailyOperatingCost } from '@/sim/economy/finance';
import { FOOD_ROOM, WATER_ROOM } from '@/data/catalog/machines';
import { getEquipmentDef } from '@/data/catalog/equipment';

describe('AUTO-038: machines', () => {
  it('"Faster" raises the prep station a level at its price, up to the last level', () => {
    const { g } = facility({ money: 2000 });
    const room = waterRoom(g)!;
    expect(upgradePrep(g).ok).toBe(true);
    expect(g.finance.money).toBe(2000 - WATER_ROOM.prepPrices[0]);
    expect(prepRate(room)).toBe(WATER_ROOM.prepRates[1]);
    expect(upgradePrep(g).ok).toBe(true);
    expect(upgradePrep(g)).toMatchObject({ ok: false });
    expect(prepRate(room)).toBe(WATER_ROOM.prepRates[2]);
  });

  it('a reservoir adds 150 gal of fresh and 60 of salt water; no money, no change', () => {
    const { g } = facility({ money: 300 });
    const room = waterRoom(g)!;
    expect(addReservoir(g).ok).toBe(true);
    expect(freshCap(room)).toBe(300);
    expect(saltCap(room)).toBe(120);
    const before = { ...room };
    const r = addReservoir(g);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/^Not enough money for a reservoir: it costs \$240 and you have \$60\.$/);
    expect(room).toEqual(before);
  });

  it('cones and jars are added at their prices, up to the room\'s space', () => {
    const { g } = facility({ food: true, money: 5000 });
    expect(addCulture(g, 'cone').ok).toBe(true);
    expect(g.facility.food!.cones.length).toBe(FOOD_ROOM.baseCones + 1);
    expect(g.finance.money).toBe(5000 - FOOD_ROOM.conePrice);
    while (g.facility.food!.jars.length < FOOD_ROOM.maxJars) expect(addCulture(g, 'jar').ok).toBe(true);
    expect(addCulture(g, 'jar').ok).toBe(false);
  });

  it('the rooms\' upkeep counts in the day\'s bill and is posted nightly as its own entry', () => {
    const { g } = facility({ food: true });
    const up = roomsUpkeep(g);
    expect(up).toBeCloseTo(WATER_ROOM.prepUpkeep + WATER_ROOM.mixerUpkeep + FOOD_ROOM.baseCones * FOOD_ROOM.coneUpkeep + FOOD_ROOM.baseJars * FOOD_ROOM.jarUpkeep, 6);
    expect(dailyOperatingCost(g)).toMatchObject({ rooms: up, roomNames: 'Water room and Live food room' });
    run(g, 24);
    const entry = g.finance.ledger.find((e) => e.memo === 'Running costs — Water room and Live food room');
    expect(entry).toMatchObject({ category: 'operating', amount: -up });
    expect(g.finance.daily[g.finance.daily.length - 1].upkeep).toBe(up);
  });

  it('the live-food doser is tank equipment, opened by Live Food Cultures', () => {
    expect(getEquipmentDef('live_food_doser')).toMatchObject({ kind: 'doser', unlock: 'live_food_room', name: 'Live-food doser' });
  });
});
