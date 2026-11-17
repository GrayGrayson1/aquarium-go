/**
 * Audit 2026-11-17, area D (the animals): choosing them, whether they fit, how they fare, why they die, and whether
 * the game says what each one needs. One describe per finding.
 */
import { describe, it, expect } from 'vitest';
import type { CompatReport, GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature, stepTankCreatures } from '@/sim/life';
import { makeContext } from '@/sim/context';
import { simRng, mulberry32 } from '@/sim/rng';
import { previewAddition } from '@/sim/compat';
import { getSpecies } from '@/data/species';
import { getFoodDef } from '@/data/catalog/foods';
import { offerDiet } from '@/ui/panels/market/offerDietText';
import { lifespanFacts } from '@/ui/common/lifespan';

const texts = (r: CompatReport) => r.reasons.map((x) => x.text).join('\n');
const base = (): GameState => newGame({ starterId: 'betta', starterName: 'Test', seed: 777 });

describe('D1: a shop offer is previewed with its own animals’ sexes', () => {
  it('a male & female pair reads as a pair that may court, not as two of unknown sex', () => {
    const s = base();
    const tank = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const rng = simRng(s);
    const pair = [createCreature(s, rng, 'german_blue_ram', { sex: 'male', ageDays: 200 }), createCreature(s, rng, 'german_blue_ram', { sex: 'female', ageDays: 200 })];
    expect(pair.map((c) => c.sex)).toEqual(['male', 'female']);
    const r = previewAddition(s, tank.id, { speciesId: 'german_blue_ram', creatures: pair });
    expect(texts(r)).toMatch(/A male and a female — they may court and breed/);
    expect(texts(r)).not.toMatch(/sexes aren't visible/);
    // the offer's animals aren't in the game yet: they never count as residents being moved
    expect(r.reasons.every((x) => !(x.creatureIds ?? []).some((id) => pair.some((c) => c.id === id)))).toBe(true);
  });

  it('a pea puffer trio (1 male, 2 females) shows the harassment rule the tank card shows after buying', () => {
    const s = base();
    const tank = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const rng = simRng(s);
    const trio = [createCreature(s, rng, 'pea_puffer', { sex: 'male', ageDays: 200 }), createCreature(s, rng, 'pea_puffer', { sex: 'female', ageDays: 200 }), createCreature(s, rng, 'pea_puffer', { sex: 'female', ageDays: 200 })];
    const r = previewAddition(s, tank.id, { speciesId: 'pea_puffer', creatures: trio });
    expect(texts(r)).toMatch(/Male pea puffers harass females/);
  });
});

describe('D5: the offer says what the animal eats and whether you have any', () => {
  it('a seahorse with only flakes in the cupboard: frozen or live food, none in stock, the cheapest pack, hand-fed', () => {
    const s = base();
    s.inventory.foods = { flake_tropical: 20 };
    const d = offerDiet(s, getSpecies('lined_seahorse'), 'marine');
    expect(d.eats).toMatch(/^Eats frozen and live food: /);
    expect(d.eats).not.toMatch(/flake/i);
    expect(d.have).toBeNull();
    expect(d.restock).not.toBeNull();
    expect(getSpecies('lined_seahorse').foods.some((t) => getFoodDef(d.restock!.id)!.tags.includes(t as never))).toBe(true);
    expect(d.handFed).toBe(true);
  });

  it('a betta when flakes are in stock: names the food you have, no pack to buy', () => {
    const s = base();
    s.inventory.foods = { flake_tropical: 20 };
    const d = offerDiet(s, getSpecies('betta'), 'freshwater');
    expect(d.eats).toMatch(/^Eats dry/);
    expect(d.have).toBe('You have tropical flakes in stock.');
    expect(d.restock).toBeNull();
    expect(d.handFed).toBe(false);
  });
});

describe('D20: old age never takes the first companion (the owner’s decision); everyone else ages as before', () => {
  /** Step one tank hour by hour with clean water and everyone fed. */
  function careFor(s: GameState, tank: Tank, hours: number): void {
    for (let t = 0; t < hours; t++) {
      tank.water.ammonia = 0;
      tank.water.nitrite = 0;
      tank.water.nitrate = Math.min(tank.water.nitrate, 10);
      tank.water.tempC = 26;
      for (const c of Object.values(s.creatures)) if (c.tankId === tank.id && c.status === 'alive') c.stats.hunger = 15;
      stepTankCreatures(s, tank, 1, makeContext(s, 1));
      s.clock.hour += 1;
    }
  }

  it('the companion outlives 1.1 × its lifespan under good care; another betta of the same age dies of old age', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4321 });
    const life = getSpecies('betta').lifecycle.lifespanDays;
    const home = s.tanks[s.tankOrder[0]];
    const ember = Object.values(s.creatures).find((c) => c.isStarter)!;
    ember.bornHour = s.clock.hour - life * 0.95 * 24;
    const other = createTank(s, 'g10', 'freshwater_tropical', { cycled: true });
    const ash = addCreature(s, createCreature(s, mulberry32(77), 'betta', { sex: 'female', ageDays: life * 0.95, name: 'Ash' }), other.id);
    const hours = Math.ceil(life * 0.2 * 24); // to 1.15 × the lifespan
    careFor(s, home, hours);
    careFor(s, other, hours);
    expect(ember.status).toBe('alive');
    expect(ember.lifeStage).toBe('elder');
    expect(ash.status).toBe('dead');
    expect(ash.deathCause).toBe('old age');
  });

  it('the card: a lifespan for everyone, a heads-up for an elder, and the companion’s own line', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4321 });
    const sp = getSpecies('betta');
    const ember = Object.values(s.creatures).find((c) => c.isStarter)!;
    ember.sex = 'male';
    expect(lifespanFacts(ember, sp, s.clock.hour)).toEqual({ value: null, note: 'Ember is your first companion and will stay with you as long as you look after him.' });
    const young = createCreature(s, mulberry32(5), 'betta', { sex: 'female', ageDays: 30, name: 'Ash' });
    expect(lifespanFacts(young, sp, s.clock.hour)).toEqual({ value: `About ${sp.lifecycle.lifespanDays} days`, note: null });
    const old = createCreature(s, mulberry32(6), 'betta', { sex: 'female', ageDays: sp.lifecycle.lifespanDays - 12, name: 'Ash' });
    expect(old.lifeStage).toBe('elder');
    expect(lifespanFacts(old, sp, s.clock.hour).note).toBe('Ash is in her last stretch: about 12 days left.');
    old.status = 'dead';
    expect(lifespanFacts(old, sp, s.clock.hour).note).toBeNull();
  });
});
