/**
 * Audit 2026-11-17 (D5) — what an offered animal eats, and whether the cupboard has any, in words for the offer
 * detail: the one place the player decides. Built from the keeper's guide (`dietGuide`, the catalogue's own food
 * names) and the creature card's food choice (`speciesFoodChoice`, the sim's suitability rule). OWNER: lane "ui-panels".
 */
import type { Environment, GameState, SpeciesDefinition } from '@/types';
import { dietGuide, foodWord, listWords } from '@/data/species/guide';
import { getFoodDef } from '@/data/catalog/foods';
import { speciesFoodChoice } from '@/ui/common/foodStock';

export interface OfferDiet {
  /** "Eats dry and frozen food: tropical flakes or frozen bloodworms." */
  eats: string;
  /** "You have tropical flakes in stock." — null when nothing it eats is in the cupboard. */
  have: string | null;
  /** Nothing it eats in stock: the cheapest pack the shop sells now (null when none is on sale yet). */
  restock: { id: string; name: string; price: number } | null;
  /** Only frozen or live food: an autofeeder can't feed it (the guide's own verdict says how to feed it instead). */
  handFed: boolean;
}

export function offerDiet(g: GameState, sp: SpeciesDefinition, env: Environment | undefined): OfferDiet {
  const d = dietGuide(sp);
  // one food of each kind first, so "dry and frozen food" names a dry and a frozen one
  const firsts = d.groups.map((x) => x.foods[0]);
  const rest = d.groups.flatMap((x) => x.foods.slice(1));
  const named = [...firsts, ...rest].slice(0, 2).map(foodWord);
  const eats = named.length ? `Eats ${d.formsText}: ${listWords(named, 'or')}.` : `Eats ${d.formsText}.`;
  const choice = speciesFoodChoice(g, sp, env ?? sp.environment);
  const stocked = choice.inStock[0];
  const stockedDef = stocked ? getFoodDef(stocked.id) : undefined;
  const restockDef = !stocked && choice.restockId ? getFoodDef(choice.restockId) : undefined;
  return {
    eats,
    have: stocked ? `You have ${stockedDef ? foodWord(stockedDef) : stocked.id} in stock.` : null,
    restock: restockDef ? { id: restockDef.id, name: foodWord(restockDef), price: choice.restockPrice } : null,
    handFed: d.autofeeder.level === 'no',
  };
}
