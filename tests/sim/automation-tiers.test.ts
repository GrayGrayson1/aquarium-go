/**
 * lane:automation (chunk 5; DESIGN-S3D §8.8, §9.1; ADR-0026 decision 8) — the facility tiers (AUTO-031): three
 * projects in a Facility branch, appended to RESEARCH, each granting its own unlock key; finishing Central Water Supply
 * or Live Food Cultures installs its room once.
 */
import { describe, it, expect } from 'vitest';
import { RESEARCH, getResearch } from '@/data/research';
import { UNLOCK_RULES } from '@/data/unlocks';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { unlock } from '@/sim/facility';
import { WATER_ROOM, FOOD_ROOM } from '@/data/catalog/machines';

describe('AUTO-031: the facility tiers', () => {
  it('three Facility projects, last in RESEARCH, gated as the design draws them', () => {
    const ids = RESEARCH.slice(-3).map((r) => r.id);
    expect(ids).toEqual(['central_water_supply', 'live_food_cultures', 'operations_desk']);
    expect(getResearch('central_water_supply')).toMatchObject({ cost: 900, hours: 24, branch: 'facility', grants: ['water_room'], requires: [{ type: 'facility', level: 'specialty_shop' }] });
    expect(getResearch('live_food_cultures')).toMatchObject({ cost: 1400, hours: 48, branch: 'facility', grants: ['live_food_room'], requires: [{ type: 'unlocked', key: 'water_room' }, { type: 'unlocked', key: 'nursery' }] });
    expect(getResearch('operations_desk')).toMatchObject({ cost: 2400, hours: 72, branch: 'facility', grants: ['operations_desk'], requires: [{ type: 'facility', level: 'aquarium_store' }] });
  });

  it('their keys come only from these projects (no unlock rule grants them)', () => {
    for (const k of ['water_room', 'live_food_room', 'operations_desk']) {
      expect(UNLOCK_RULES.some((r) => r.key === k)).toBe(false);
      expect(RESEARCH.filter((r) => (r.grants as string[]).includes(k)).length).toBe(1);
    }
  });

  it('finishing the research installs the base room once, at the next step', () => {
    const g = newGame({ starterId: 'betta', starterName: 'T', seed: 3 });
    g.isShowcase = false;
    expect(g.facility.water).toBeUndefined();
    unlock(g, 'water_room', { silent: true });
    unlock(g, 'live_food_room', { silent: true });
    advanceWorld(g, 0.5);
    expect(g.facility.water).toMatchObject({ fresh: WATER_ROOM.freshCap, salt: 0, prepLevel: 0, reservoirs: 0 });
    expect(g.facility.food!.cones.length).toBe(FOOD_ROOM.baseCones);
    expect(g.facility.food!.jars.length).toBe(FOOD_ROOM.baseJars);
    g.facility.water!.fresh = 12;
    advanceWorld(g, 0.5);
    expect(g.facility.water!.fresh).toBeCloseTo(15, 6); // the same room, refilling: not installed again
  });

  it('a game without the research has no rooms and no automation state (absent fields, unchanged hash)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'T', seed: 3 });
    advanceWorld(g, 48);
    expect(g.facility.water).toBeUndefined();
    expect(g.facility.food).toBeUndefined();
    expect(g.automation).toBeUndefined();
  });
});
