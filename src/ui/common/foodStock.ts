/**
 * Food stock from the player's point of view — thin UI wrappers over the sim's food outlook (src/sim/tankStatus.ts:
 * `tankFoodOutlook`, `cache.foodLevel`), plus the restock shortcuts the HUD offers. OWNER: lane "ui-shell".
 */
import type { GameState } from '@/types';
import { tankFoodOutlook } from '@/sim/tankStatus';
import { findSpecies } from '@/data/species'; // lane:qa-play
import { FOODS, getFoodDef } from '@/data/catalog/foods'; // lane:qa-play
import { moduleFor } from '@/sim/life/breeding/registry'; // lane:qa-play
import { currentPhase } from '@/sim/life/breeding/clutch'; // lane:qa-play
import { buyFood } from '@/sim/economy';
import { useUI } from '@/state/ui';
import { safe } from './safe';
import { act } from './actions';

export interface TankFoodAlert {
  level: 'out' | 'low';
  /** Residents with nothing (or almost nothing) left that they eat. */
  names: string[];
  /** Foods in stock that those animals eat (running low). */
  foodIds: string[];
  /** Best food to restock for them. */
  restockId: string | null;
  /** "No food left that Ember eats" / "Food for Ember is running low (about 2 meals left)". */
  text: string;
}

/** Is anyone in this tank about to go hungry because the cupboard is (nearly) bare? (sim food outlook) */
export function tankFoodAlert(g: GameState, tankId: string): TankFoodAlert | null {
  const o = safe('tankFoodOutlook', () => tankFoodOutlook(g, tankId), null);
  if (!o || o.level === 'ok') return null;
  return { level: o.level, names: o.names, foodIds: o.foodIds, restockId: o.restockId, text: o.text ?? (o.level === 'out' ? 'Out of food' : 'Food is running low') };
}

/** Cheap per-tank level for the HUD: the sim caches it on the tank (`cache.foodLevel`). */
export function tankFoodLevel(g: GameState, tankId: string): 'ok' | 'low' | 'out' {
  return g.tanks[tankId]?.cache.foodLevel ?? 'ok';
}

/** Buy one pack right away (feed picker shortcut). Returns true on success. */
export function buyFoodPack(foodId: string): boolean {
  const r = act((d) => buyFood(d, foodId, 1), { sound: 'coin' });
  return !!r?.ok;
}

/** Open Market › Supplies scrolled to this food. */
export function openFoodInSupplies(foodId: string) {
  useUI.getState().set({ panel: 'market', panelTarget: `food:${foodId}` });
}

// ───────────── lane:qa-play: food for larvae / fry ─────────────

export interface YoungFoodNeed {
  /** 'fry', 'larvae', 'shrimplets'… (the rearing phase's own word). */
  label: string;
  /** Food tags the young accept right now (any one is enough). */
  tags: string[];
  /** Foods in the cupboard they eat. */
  inStock: string[];
  /** Cheapest available pack they eat. */
  restockId: string | null;
  /** "The fry here need infusoria or baby brine — none in stock" (only when nothing is in stock). */
  text: string | null;
}

/**
 * What the growing clutches in this tank eat, and whether the cupboard has any. The feed picker only knew about the
 * tank's animals, so a nursery full of fry offered bloodworms marked "No one here eats this" and no way to the
 * infusoria the "fry are hungry" toast asked for.
 */
export function youngFoodNeed(g: GameState, tankId: string): YoungFoodNeed | null {
  const tags = new Set<string>();
  let label = '';
  for (const cl of Object.values(g.clutches ?? {})) {
    if (cl.tankId !== tankId || cl.count <= 0 || cl.stage === 'eggs' || cl.stage === 'in_pouch') continue;
    const sp = findSpecies(cl.speciesId);
    if (!sp) continue;
    const ph = safe('currentPhase', () => currentPhase(cl, moduleFor(sp)), null);
    if (!ph?.foods.length) continue;
    for (const t of ph.foods) tags.add(t);
    label ||= ph.label;
  }
  if (!tags.size) return null;
  const eatsIt = (tagList: readonly string[] | undefined) => !!tagList?.some((t) => tags.has(t));
  const inStock = Object.entries(g.inventory.foods ?? {})
    .filter(([id, n]) => (n ?? 0) >= 1 && eatsIt(getFoodDef(id)?.tags))
    .map(([id]) => id);
  const unlocked = new Set(g.progress?.unlocked ?? []);
  const restock = FOODS.filter((f) => eatsIt(f.tags) && (!f.unlock || unlocked.has(f.unlock))).sort((a, b) => a.price - b.price)[0];
  const words = [...tags].slice(0, 2).map((t) => t.replace(/_/g, ' '));
  return {
    label: label || 'young',
    tags: [...tags],
    inStock,
    restockId: restock?.id ?? null,
    text: inStock.length ? null : `The ${label || 'young'} here need ${words.join(' or ')} — none in stock`,
  };
}

// ───────────── lane:w2-ui: feed one animal from its card ─────────────

export interface CreatureFoodChoice {
  /** Foods in the cupboard this animal eats (the sim's rule: any food tag in the species' diet), best first. */
  inStock: { id: string; count: number }[];
  /** Cheapest available pack it eats, for the one-tap buy when nothing suitable is in stock. */
  restockId: string | null;
  restockPrice: number;
}

/**
 * What the animal on the open creature card can be offered — the same suitability test as the feed picker
 * (`foodOptions` in ToolRail) and the sim's target-feed check (`feedTank`): a food fits when one of its tags is in the
 * species' diet. Order: the diet's own order (a species lists its staple foods first), then the bigger stock.
 */
export function creatureFoodChoice(g: GameState, creatureId: string): CreatureFoodChoice | null {
  const c = g.creatures[creatureId];
  const sp = c ? findSpecies(c.speciesId) : null;
  if (!c || !sp) return null;
  const rank = (tags: readonly string[] | undefined) => {
    let best = Infinity;
    for (const t of tags ?? []) {
      const i = sp.foods.indexOf(t as (typeof sp.foods)[number]);
      if (i >= 0 && i < best) best = i;
    }
    return best;
  };
  // lane:qa-final — made for this animal, as the keepers choose (src/sim/staff/work.ts pickStaffFood): goldfish or axolotl
  // pellets for a reef chromis, or marine pellets in fresh water, go to the back of the list (still offered if nothing else).
  const env = c.tankId ? g.tanks[c.tankId]?.environment : undefined;
  const wrongKind = (id: string) => (/^marine_/.test(id) && env && env !== 'marine' ? 1 : 0) + (/^axolotl_/.test(id) && sp.id !== 'axolotl' ? 1 : 0) + (/^goldfish_/.test(id) && !/goldfish/.test(sp.id) ? 1 : 0);
  const inStock = Object.entries(g.inventory.foods ?? {})
    .map(([id, n]) => ({ id, count: Math.floor(n ?? 0), rank: rank(getFoodDef(id)?.tags), wrong: wrongKind(id) }))
    .filter((f) => f.count >= 1 && Number.isFinite(f.rank))
    .sort((a, b) => a.wrong - b.wrong || a.rank - b.rank || b.count - a.count || a.id.localeCompare(b.id))
    .map(({ id, count }) => ({ id, count }));
  const unlocked = new Set(g.progress?.unlocked ?? []);
  const restock = FOODS.filter((f) => Number.isFinite(rank(f.tags)) && (!f.unlock || unlocked.has(f.unlock))).sort((a, b) => wrongKind(a.id) - wrongKind(b.id) || a.price - b.price || rank(a.tags) - rank(b.tags))[0];
  return { inStock, restockId: restock?.id ?? null, restockPrice: restock?.price ?? 0 };
}
