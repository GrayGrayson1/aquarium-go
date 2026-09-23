/**
 * lane:qa-play — logic behind the round-2 play-test fixes: wellbeing note order, the betta "ripe" label vs the
 * pairing check, readable personality words in valuations, and the fry-food need the feed picker shows.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { creatureWellbeing, breedingStatus } from '@/sim/life';
import { creatureValue } from '@/sim/economy';
import { BREEDING_FIXTURES } from '@/dev/fixtures/breeding';
import { youngFoodNeed } from '@/ui/common/foodStock';

const starterOf = (g: ReturnType<typeof newGame>) => Object.values(g.creatures).find((c) => c.isStarter)!;

describe('creature wellbeing', () => {
  it('puts "Very hungry" ahead of habitat notes (it is the headline)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Blaze', seed: 31 });
    const tank = g.tanks[g.tankOrder[0]];
    tank.decor = []; // no cover → habitat notes
    const c = starterOf(g);
    c.stats.hunger = 78;
    const w = creatureWellbeing(g, c);
    expect(w.status).toBe('watch');
    expect(w.notes[0]).toMatch(/Very hungry/);
    expect(w.headline).toBe('Very hungry');
    expect(w.notes.some((n) => n.startsWith('Habitat:'))).toBe(true);
  });
});

describe('betta breeding status', () => {
  it('a gravid female below the pairing bar is not called "ready for a male"', () => {
    const g = BREEDING_FIXTURES.breeding_betta();
    const cl = Object.values(g.clutches).find((x) => x.speciesId === 'betta')!;
    const f = g.creatures[cl.motherId!];
    f.repro.stage = 'gravid';
    f.repro.harassment = 0;
    f.stats.breedingReadiness = 45;
    expect(breedingStatus(g, f.id)?.detail).toMatch(/feed her well/);
    f.stats.breedingReadiness = 80;
    expect(breedingStatus(g, f.id)?.detail).toMatch(/ready for a male/);
  });
});

describe('valuation personality note', () => {
  it('uses readable labels, never raw tags, and no dangling dash', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Blaze', seed: 5 });
    const c = starterOf(g);
    c.personality = ['showoff', 'food_obsessed'];
    const f = creatureValue(g, c).factors.find((x) => x.label === 'Personality appeal');
    expect(f?.note).toMatch(/show-off/);
    expect(f?.note).not.toMatch(/showoff|_/);
    c.personality = [];
    const none = creatureValue(g, c).factors.find((x) => x.label === 'Personality appeal');
    expect(none?.note ?? '').not.toMatch(/^ —/);
  });
});

describe('fry food need (feed picker)', () => {
  it('names what the fry eat and offers a pack when none is in stock', () => {
    const g = BREEDING_FIXTURES.breeding_betta_fry();
    const cl = Object.values(g.clutches).find((x) => x.speciesId === 'betta')!;
    for (const id of Object.keys(g.inventory.foods)) if (/infusoria|brine/.test(id)) delete g.inventory.foods[id];
    const need = youngFoodNeed(g, cl.tankId)!;
    expect(need.label).toBe('fry');
    expect(need.inStock).toEqual([]);
    expect(need.text).toMatch(/fry here need .*none in stock/);
    expect(['infusoria_culture', 'baby_brine_live']).toContain(need.restockId);
    g.inventory.foods.infusoria_culture = 15;
    const stocked = youngFoodNeed(g, cl.tankId)!;
    expect(stocked.inStock).toEqual(['infusoria_culture']);
    expect(stocked.text).toBeNull();
  });

  it('is null for a tank without growing young', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 9 });
    expect(youngFoodNeed(g, g.tankOrder[0])).toBeNull();
  });
});

describe('showcase fixtures load well run', () => {
  it('big_facility: every tank Good at load, nobody short of food', async () => {
    const { FIXTURES } = await import('@/dev/fixtures');
    const { tankFoodOutlook } = await import('@/sim/tankStatus');
    const g = FIXTURES.big_facility();
    const bad = g.tankOrder.map((id) => g.tanks[id]).filter((t) => t.cache.status !== 'good').map((t) => `${t.name}: ${(t.cache.statusReasons ?? []).join('; ')}`);
    expect(bad).toEqual([]);
    for (const id of g.tankOrder) expect(tankFoodOutlook(g, id).level, g.tanks[id].name).toBe('ok');
  });
});
