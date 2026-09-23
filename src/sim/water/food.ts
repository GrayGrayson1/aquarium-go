/**
 * Food in the water column. OWNER: lane "waterlab".
 *
 * Units: `water.foodInWater` and `water.foodByTag[tag]` are FOOD UNITS. One unit relieves one hunger point of a
 * bioload-1 animal; an animal with effective bioload b (see effectiveBioload) needs b units per hunger point.
 * A food with several tags is counted under each of its tags (tags overlap), so per-tag amounts are always clamped
 * to the total. Uneaten food starts rotting after ~45 game minutes (see stepTankWater).
 */
import type { FoodDef, FoodTag, GameState, Tank, WaterLabState } from '@/types';
import { findSpecies } from '@/data/species';
import { clamp } from './chem';
import { effectiveBioload, inhabitantsOf } from './env';

export function ensureLab(tank: Tank): WaterLabState {
  if (!tank.water.lab) tank.water.lab = {};
  return tank.water.lab;
}

function byTag(tank: Tank): Partial<Record<FoodTag, number>> {
  if (!tank.water.foodByTag) tank.water.foodByTag = {};
  return tank.water.foodByTag;
}

/** Clamp every tag to the total and drop dust. */
export function normaliseFood(tank: Tank): void {
  const w = tank.water;
  if (!Number.isFinite(w.foodInWater) || w.foodInWater < 1e-4) w.foodInWater = 0;
  const bt = byTag(tank);
  for (const k of Object.keys(bt) as FoodTag[]) {
    const v = bt[k] ?? 0;
    if (!Number.isFinite(v) || v < 1e-4 || w.foodInWater <= 0) delete bt[k];
    else if (v > w.foodInWater) bt[k] = w.foodInWater;
  }
  if (w.targetFeed) {
    w.targetFeed.units = Math.min(w.targetFeed.units, w.foodInWater);
    if (!(w.targetFeed.units > 1e-3)) delete w.targetFeed;
  }
}

/** Scale all food (after decay / siphoning). */
export function scaleFood(tank: Tank, factor: number): void {
  const f = clamp(factor, 0, 1);
  const w = tank.water;
  w.foodInWater *= f;
  const bt = byTag(tank);
  for (const k of Object.keys(bt) as FoodTag[]) bt[k] = (bt[k] ?? 0) * f;
  if (w.targetFeed) w.targetFeed.units *= f;
  normaliseFood(tank);
}

/** Add `servings` of a food to the water column. Returns food units added. */
export function addFood(tank: Tank, food: FoodDef, servings: number, hour: number, targetCreatureId?: string): number {
  const units = Math.max(0, servings) * food.nutrition;
  if (units <= 0) return 0;
  const w = tank.water;
  const lab = ensureLab(tank);
  const prev = Math.max(0, w.foodInWater);
  const wastePerUnit = food.nutrition > 0 ? food.waste / food.nutrition : 0.1;
  // mass-weighted age and rot potential
  lab.foodAgeH = prev + units > 0 ? ((lab.foodAgeH ?? 0) * prev) / (prev + units) : 0;
  lab.foodWaste = prev + units > 0 ? ((lab.foodWaste ?? 0.1) * prev + wastePerUnit * units) / (prev + units) : wastePerUnit;
  w.foodInWater = prev + units;
  const bt = byTag(tank);
  for (const t of food.tags) bt[t] = (bt[t] ?? 0) + units;
  if (targetCreatureId) {
    const tf = w.targetFeed && w.targetFeed.creatureId === targetCreatureId ? w.targetFeed : undefined;
    w.targetFeed = {
      creatureId: targetCreatureId,
      units: (tf?.units ?? 0) + units,
      tags: Array.from(new Set([...(tf?.tags ?? []), ...food.tags])),
      hour,
    };
  }
  normaliseFood(tank);
  return units;
}

function matchingAmount(tank: Tank, tags: readonly FoodTag[]): number {
  const w = tank.water;
  const bt = w.foodByTag;
  if (!bt || Object.keys(bt).length === 0) return w.foodInWater; // legacy/untagged food: anything goes
  let m = 0;
  for (const t of tags) m += Math.min(bt[t] ?? 0, w.foodInWater);
  return Math.min(m, w.foodInWater);
}

function removeMatching(tank: Tank, tags: readonly FoodTag[], take: number): void {
  const w = tank.water;
  const bt = byTag(tank);
  let matched = 0;
  for (const t of tags) matched += Math.min(bt[t] ?? 0, w.foodInWater);
  if (matched > 0) {
    for (const t of tags) {
      const v = Math.min(bt[t] ?? 0, w.foodInWater);
      if (v > 0) bt[t] = v - take * (v / matched);
    }
  }
  w.foodInWater = Math.max(0, w.foodInWater - take);
  normaliseFood(tank);
}

/** How much food matching `tags` this creature could reach right now (respects target-feed reservations). */
export function availableFood(tank: Tank, tags: readonly FoodTag[], creatureId?: string): number {
  const w = tank.water;
  if (!(w.foodInWater > 0) || tags.length === 0) return 0;
  const tf = w.targetFeed;
  const reserved = tf && tf.creatureId !== creatureId ? tf.units : 0;
  return Math.max(0, Math.min(matchingAmount(tank, tags), w.foodInWater - reserved));
}

/**
 * Remove up to `amount` food units matching `tags`; returns units eaten. If `creatureId` is the target-fed animal it
 * eats its reserved portion first; everyone else cannot touch that portion until it is released.
 */
export function consumeFoodImpl(tank: Tank, tags: readonly FoodTag[], amount: number, creatureId?: string): number {
  const w = tank.water;
  if (!(amount > 0) || !(w.foodInWater > 0) || !tags || tags.length === 0) return 0;
  let eaten = 0;
  const tf = w.targetFeed;
  if (tf && creatureId && tf.creatureId === creatureId && tf.units > 0) {
    const tagOk = tf.tags.some((t) => tags.includes(t));
    if (tagOk) {
      const take = Math.min(amount, tf.units, w.foodInWater);
      tf.units -= take;
      removeMatching(tank, tf.tags.filter((t) => tags.includes(t)), take);
      eaten += take;
      if (w.targetFeed && w.targetFeed.units <= 1e-3) delete w.targetFeed;
    }
  }
  const rest = amount - eaten;
  if (rest > 1e-6) {
    const avail = availableFood(tank, tags, creatureId);
    const take = Math.min(rest, avail);
    if (take > 0) {
      removeMatching(tank, tags, take);
      eaten += take;
    }
  }
  return eaten;
}

/**
 * Food units a full meal takes for everything in the tank that eats this food (0 if nobody does).
 * `atHunger` evaluates a typical meal instead of right now (food-stock estimates).
 */
export function foodDemandUnits(state: GameState, tank: Tank, food?: FoodDef, onlyCreatureId?: string, atHunger?: number): number {
  let demand = 0;
  for (const { creature, species } of inhabitantsOf(state, tank.id)) {
    if (onlyCreatureId && creature.id !== onlyCreatureId) continue;
    if (food && !food.tags.some((t) => species.foods.includes(t))) continue;
    const hunger = clamp(atHunger ?? creature.stats?.hunger ?? 50, 0, 100);
    demand += effectiveBioload(species, creature.sizeCm) * Math.max(20, hunger);
  }
  return demand;
}

/** Hunger a typical meal is given at (twice-a-day feeding) — used for "meals left" estimates. */
export const TYPICAL_MEAL_HUNGER = 55;

/**
 * A sensible single portion (servings) of `food` for this tank right now (or, with `atHunger`, for a typical meal).
 */
export function recommendedServings(state: GameState, tank: Tank, food: FoodDef, targetCreatureId?: string, atHunger?: number): number {
  const demand = foodDemandUnits(state, tank, food, targetCreatureId, atHunger);
  const eaterSpecies = new Set<string>();
  if (!targetCreatureId) for (const { species } of inhabitantsOf(state, tank.id)) if (food.tags.some((t) => species.foods.includes(t))) eaterSpecies.add(species.id);
  return portionForDemand(food, demand, eaterSpecies.size);
}

/** Servings of `food` that cover `demand` food units for `eaterSpecies` species sharing it (see recommendedServings). */
export function portionForDemand(food: FoodDef, demand: number, eaterSpecies: number): number {
  if (!(demand > 0)) return 1;
  // Pricey live/fresh foods come in small packs: offer them as a supplement, not a whole meal. Staples (big packs)
  // cover what the tank actually needs, so a group of large animals isn't underfed by the default portion.
  const packCap = food.servingsPerPack <= 24 ? Math.max(1, Math.round(food.servingsPerPack * 0.2)) : Math.round(food.servingsPerPack * 0.5);
  // One species: a little under the summed appetite (nothing left to rot). Several species sharing this food: a
  // little over it — the fast feeders eat first, and a portion sized exactly to demand leaves the slower species
  // chronically short. The ~10% surplus is cleaned up in minutes.
  const mult = eaterSpecies > 1 ? 1.1 : 0.9;
  return clamp(Math.ceil((demand * mult) / Math.max(1, food.nutrition)), 1, Math.min(60, packCap));
}

/** Species in the tank that will eat this food (for UI hints / feeding messages). */
export function eatersOf(state: GameState, tank: Tank, food: FoodDef): string[] {
  const ids = new Set<string>();
  for (const { species } of inhabitantsOf(state, tank.id)) if (food.tags.some((t) => species.foods.includes(t))) ids.add(species.id);
  return [...ids].map((id) => findSpecies(id)?.commonName ?? id);
}

/** Copepod/micro-fauna population 0..1 (live rock, refugium, mature planted tanks). */
export function tankPods(tank: Tank): number {
  return clamp(tank.water.lab?.pods ?? 0, 0, 1);
}

/** Pod-eaters (dragonets, seahorses) graze the population; returns the fraction actually eaten. */
export function consumePods(tank: Tank, amount: number): number {
  const lab = ensureLab(tank);
  const have = clamp(lab.pods ?? 0, 0, 1);
  const take = clamp(amount, 0, have);
  lab.pods = have - take;
  return take;
}

/** Grazers (snails, otocinclus, plecos, tangs) remove algae; returns algae points removed. */
export function grazeAlgae(tank: Tank, amount: number): number {
  const have = clamp(tank.water.algae ?? 0, 0, 100);
  const take = clamp(amount, 0, have);
  tank.water.algae = have - take;
  return take;
}
