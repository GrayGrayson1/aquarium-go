/**
 * Audit 2026-11-17 (F1): why a "Buy" button is greyed out, in words, and what to do about it. A disabled button never
 * sends its command, so the sim's own refusal ("You're $12 in debt, so purchases are paused…") never reached the
 * player: these lines say it before the tap. Pure (no React): tests import it.
 */
import type { GameState } from '@/types';
import { formatMoney } from '@/ui/kit';
import { FOODS, eatsFood, getFoodDef } from '@/data/catalog/foods';
import { findSpecies } from '@/data/species';
import { isFoodAvailable } from '@/sim/economy/shop';
import { cashIdeas } from '@/sim/economy/finance';
import { tankFoodOutlook } from '@/sim/tankStatus';
import { safe } from './safe';

/**
 * Money as the player holds it, never more than they have (F11): exact cents under $100 ("$4.50"), whole dollars
 * rounded down above that. A debt is shown as its size ("$12").
 */
export function moneyHeld(money: number): string {
  const v = Math.abs(Number.isFinite(money) ? money : 0);
  if (v < 100 && Math.abs(v - Math.round(v)) > 0.004) return formatMoney(v, { cents: true });
  return formatMoney(money < 0 ? Math.ceil(v) : Math.floor(v));
}

/**
 * A balance in whole dollars, rounded down (F11): never more than the player has, so the top bar's "$200" is always
 * enough for a $200 price (bills leave cents, and every check compares to the cent).
 */
export function wholeMoney(money: number): string {
  return formatMoney(Math.floor((Number.isFinite(money) ? money : 0) + 1e-6));
}

/** A disabled "Buy" button's reason (its `title`), or undefined when `price` is affordable. */
export function cantAffordTitle(money: number, price: number): string | undefined {
  if (money < 0) return `You’re ${moneyHeld(money)} in debt, so purchases are paused`;
  if (money < price) return `Not enough money: you have ${moneyHeld(money)}`;
  return undefined;
}

/** The cheapest food pack on sale to this player (Infinity when none is). */
export function cheapestFoodPrice(g: GameState): number {
  return Math.min(...FOODS.filter((f) => safe('isFoodAvailable', () => isFoodAvailable(g, f), false)).map((f) => f.price));
}

/** Finances shows its "Ways to raise cash" whenever money stands between the player and food or anything on sale. */
export function needsCashIdeas(g: GameState): boolean {
  return g.finance.money < 0 || g.finance.money < cheapestFoodPrice(g) || !!hungryAndShort(g);
}

export interface HungryAndShort {
  /** Tanks where someone has no food left and the money won't buy the cheapest pack they eat. */
  tanks: { tankId: string; names: string[] }[];
  /** The cheapest pack any of them eats (unlocked and on sale). */
  foodId: string;
  price: number;
}

/**
 * A7's worst case: animals with no food left, and less money than the cheapest pack they eat (or a debt, which pauses
 * every purchase). Null when every hungry animal's food can be bought.
 */
export function hungryAndShort(g: GameState): HungryAndShort | null {
  const money = g.finance.money;
  const tanks: HungryAndShort['tanks'] = [];
  let cheapest: { foodId: string; price: number } | null = null;
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t || t.cache?.foodLevel !== 'out') continue;
    const o = safe('tankFoodOutlook', () => tankFoodOutlook(g, id), null);
    if (!o || o.level !== 'out') continue;
    const species = o.speciesIds.map((s) => findSpecies(s)).filter((s): s is NonNullable<typeof s> => !!s);
    let best: { foodId: string; price: number } | null = null;
    for (const f of FOODS) {
      if (!species.some((sp) => eatsFood(sp, f))) continue;
      if (!safe('isFoodAvailable', () => isFoodAvailable(g, f), false)) continue;
      if (!best || f.price < best.price) best = { foodId: f.id, price: f.price };
    }
    if (!best && o.restockId) best = { foodId: o.restockId, price: getFoodDef(o.restockId)?.price ?? 0 };
    if (!best || (money >= 0 && money >= best.price)) continue;
    tanks.push({ tankId: id, names: o.names });
    if (!cheapest || best.price < cheapest.price) cheapest = best;
  }
  return tanks.length && cheapest ? { tanks, ...cheapest } : null;
}

const names = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more`);

/**
 * The Supplies tab's money callout (F1): in debt, short of the cheapest thing shown, or animals with no food and not
 * enough for a pack. `tip` is the first way to raise cash now (the sim's cashIdeas: sell, list, open to visitors).
 */
export function suppliesMoneyNote(g: GameState, cheapestShown: number): { title: string; text: string; tip: string } | null {
  const money = g.finance.money;
  const hungry = hungryAndShort(g);
  let title: string;
  let text: string;
  const all = hungry ? hungry.tanks.flatMap((t) => t.names) : [];
  const noFood = all.length ? `${names(all)} ${all.length === 1 ? 'has' : 'have'} no food left` : hungry ? 'Your animals have no food left' : '';
  if (money < 0) {
    title = 'Purchases are paused';
    text = `You’re ${moneyHeld(money)} in debt, so purchases are paused, food included.${noFood ? ` ${noFood}.` : ''}`;
  } else if (hungry) {
    title = 'Not enough money for food';
    text = `${noFood}, and ${moneyHeld(money)} won’t buy a pack of ${getFoodDef(hungry.foodId)?.name ?? 'food'} (${formatMoney(hungry.price)}).`;
  } else if (Number.isFinite(cheapestShown) && money < cheapestShown) {
    title = 'Not enough money';
    text = `You have ${moneyHeld(money)}: not enough for anything here.`;
  } else return null;
  // a way to raise cash now (selling, listing, visitors), not a way to trim tomorrow's bill
  const now = safe('cashIdeas', () => cashIdeas(g), []).find((i) => i.kind === 'quick_sell' || i.kind === 'list_animal' || i.kind === 'list_tank' || i.kind === 'visitors');
  const alive = Object.values(g.creatures).some((c) => c.status === 'alive');
  const tip = now?.text ?? (alive ? 'Sell an animal for quick cash: tick it in Livestock and press Quick sell.' : 'Wait for income: nothing is ever taken from you.');
  return { title, text, tip };
}
