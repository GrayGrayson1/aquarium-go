/**
 * Fix lane WATER — tank status: S01-05 (tank bar agrees with the creature card about water harm), S01-06 (omnivores
 * that merely list biofilm count for the food warnings) and S05-09 (restock suggestions suit the animals).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { refreshTankCache } from '@/sim/world';
import { createCreature, addCreature, creatureWellbeing } from '@/sim/life';
import { starterAquascape } from '@/sim/aquascape';
import { getWaterReport } from '@/sim/water';
import { needsFedFood, tankFoodOutlook } from '@/sim/tankStatus';
import { getSpecies } from '@/data/species';
import { simRng } from '@/sim/rng';

const base = () => newGame({ starterId: 'betta', starterName: 'Test', seed: 99 });
const firstTank = (s: GameState) => s.tanks[s.tankOrder[0]];

function emptyWorld(): GameState {
  const s = base();
  for (const id of Object.keys(s.creatures)) delete s.creatures[id];
  for (const id of [...s.tankOrder]) delete s.tanks[id];
  s.tankOrder = [];
  s.isShowcase = true;
  return s;
}
function stock(s: GameState, speciesId: string, n: number, tier = 'g20L'): string {
  const tank = createTank(s, tier, 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
  tank.decor = starterAquascape(s, 'generic', tank);
  const rng = simRng(s);
  for (let i = 0; i < n; i++) addCreature(s, createCreature(s, rng, speciesId, { ageDays: 40 }), tank.id);
  return tank.id;
}

describe('fix-water S01-05: the tank bar agrees with the creature card', () => {
  it('nitrite in the WATCH band that is costing the betta health reads danger on the bar too', () => {
    const s = base();
    const t = firstTank(s);
    const betta = Object.values(s.creatures).find((c) => c.speciesId === 'betta')!;
    t.water.nitrite = 0.4;
    const report = getWaterReport(s, t.id);
    expect(report.params.find((p) => p.key === 'nitrite')!.status).toBe('watch');
    expect(creatureWellbeing(s, betta).status).toBe('danger');
    refreshTankCache(s, t);
    expect(t.cache.status).toBe('danger');
    expect(t.cache.animalStatus).toBe('danger');
    expect(t.cache.statusReason).toMatch(/is being harmed by the water — nitrite detected/);
  });

  it('healthy water leaves the bar alone, and starvation still comes first', () => {
    const s = base();
    const t = firstTank(s);
    const betta = Object.values(s.creatures).find((c) => c.speciesId === 'betta')!;
    refreshTankCache(s, t);
    expect(t.cache.animalStatus).toBe('good');
    t.water.nitrite = 0.4;
    betta.stats.hunger = 95;
    refreshTankCache(s, t);
    expect(t.cache.statusReason).toMatch(/starving/);
  });
});

describe('fix-water S01-06: only true self-feeders skip the food cupboard', () => {
  it('endlers, mollies and bristlenose need fed food; otos and nerites do not', () => {
    for (const id of ['endlers_livebearer', 'sailfin_molly', 'bristlenose_pleco', 'fancy_guppy']) expect(needsFedFood(getSpecies(id)), id).toBe(true);
    for (const id of ['otocinclus', 'nerite_snail', 'cherry_shrimp']) expect(needsFedFood(getSpecies(id)), id).toBe(false);
  });

  it('an empty cupboard with endlers in the tank is reported as out of food', () => {
    const s = emptyWorld();
    s.inventory.foods = {};
    const id = stock(s, 'endlers_livebearer', 6);
    const outlook = tankFoodOutlook(s, id);
    expect(outlook.level).toBe('out');
    expect(outlook.text).toMatch(/No food left that your endler/);
    expect(outlook.restockId).toBe('flake_tropical');
  });
});

describe('fix-water S05-09: restock suggestions suit the animals', () => {
  it('never sends tetra + corydoras or axolotl tanks to the goldfish pellets', () => {
    const s = emptyWorld();
    s.inventory.foods = {};
    const mixed = stock(s, 'cardinal_tetra', 6);
    const rng = simRng(s);
    for (let i = 0; i < 4; i++) addCreature(s, createCreature(s, rng, 'panda_corydoras', { ageDays: 60 }), mixed);
    expect(tankFoodOutlook(s, mixed).restockId).toBe('flake_tropical');
    const axo = createTank(s, 'g20L', 'freshwater_cool', { cycled: true, placement: { x: 1, z: 0, rotY: 0 } });
    addCreature(s, createCreature(s, rng, 'axolotl', { ageDays: 200 }), axo.id);
    expect(tankFoodOutlook(s, axo.id).restockId).toBe('sinking_pellets');
  });
});
