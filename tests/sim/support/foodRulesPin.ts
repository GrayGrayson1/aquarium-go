/**
 * Test support (not a test file): every output of the "made for another animal" and "eats this food" rules, and of the
 * species branches B-170 moves into data, for every species (and every environment it can live in), so a refactor can be
 * shown to change nothing (tests/sim/food-rules-pin.test.ts against tests/sim/fixtures/food-rules-pin.json, written from
 * the code before chunk 6's refactor). Reads src/sim, src/data and one UI helper (the creature card's food list).
 */
import type { Environment, GameState, SpeciesDefinition } from '@/types';
import { ALL_SPECIES } from '@/data/species';
import { FOODS } from '@/data/catalog/foods';
import { menuFor } from '@/data/species/guide';
import { suitedDryFoods, planAutofeed } from '@/sim/care/autofeed';
import { pickStaffFood } from '@/sim/staff/work';
import { livableEnvironments } from '@/sim/compat/salinity';
import { tankFoodOutlook } from '@/sim/tankStatus';
import { eligibleIllnesses } from '@/sim/life/illness';
import { youngNoun } from '@/sim/compat/text';
import { allowedTags } from '@/sim/life/personality';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { creatureFoodChoice } from '@/ui/common/foodStock';

export type FoodRulesPin = Record<string, Record<string, unknown>>;

const allStock = (): Record<string, number> => Object.fromEntries(FOODS.map((f) => [f.id, 10]));

export function foodRulesPin(): FoodRulesPin {
  const out: FoodRulesPin = {};
  const st = { inventory: { foods: allStock() } } as unknown as GameState;
  const st2 = { inventory: { foods: { marine_pellets: 10, micro_pellets: 10 } } } as unknown as GameState;
  // one game: each species alone in its own tank, cupboards empty (restock) and then full (the card's list)
  const g = newGame({ starterId: 'betta', starterName: 'Pin', seed: 5 });
  const rng = simRng(g);
  const tankOf = new Map<string, { tankId: string; creatureId: string }>();
  ALL_SPECIES.forEach((sp: SpeciesDefinition, i: number) => {
    const t = createTank(g, 'g40B', sp.waterClasses[0], { cycled: true, placement: { x: -20 + (i % 10) * 2, z: -10 + Math.floor(i / 10) * 2, rotY: 0 }, name: `Pin ${sp.id}` });
    const c = addCreature(g, createCreature(g, rng, sp.id, { ageDays: Math.max(30, sp.lifecycle.juvenileDays + 5) }), t.id);
    tankOf.set(sp.id, { tankId: t.id, creatureId: c.id });
  });
  g.inventory.foods = {};
  const restock = new Map(ALL_SPECIES.map((sp) => [sp.id, tankFoodOutlook(g, tankOf.get(sp.id)!.tankId).restockId]));
  const emptyChoice = new Map(ALL_SPECIES.map((sp) => [sp.id, creatureFoodChoice(g, tankOf.get(sp.id)!.creatureId)?.restockId ?? null]));
  g.inventory.foods = allStock();
  for (const sp of ALL_SPECIES) {
    const envs = livableEnvironments(sp) as Environment[];
    out[sp.id] = {
      suited: suitedDryFoods([sp]).map((f) => f.id),
      buy: planAutofeed({}, [sp]).buy.map((f) => f.id),
      staff: Object.fromEntries([...envs, undefined].map((e) => [e ?? 'none', pickStaffFood(st, sp, [sp], [], e)?.id ?? null])),
      staffPelletsOnly: Object.fromEntries(envs.map((e) => [e, pickStaffFood(st2, sp, [sp], [], e)?.id ?? null])),
      menu: menuFor(sp).map((f) => f.id),
      restock: restock.get(sp.id),
      cardList: creatureFoodChoice(g, tankOf.get(sp.id)!.creatureId)?.inStock.map((x) => x.id) ?? null,
      cardRestock: emptyChoice.get(sp.id),
      illnesses: eligibleIllnesses(sp),
      youngNoun: youngNoun(sp),
      personality: allowedTags(sp),
    };
  }
  return out;
}
