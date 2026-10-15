/**
 * Production lines: what each line pays for food and power (ADR-0025 decision 9). OWNER: lane "production".
 *
 * Every hour and every serving fed, a line pays its share of each of its tanks' running costs and food: its residents
 * (its pair, the pair's young and the pair's broods) over everyone living in that tank. Shares of one tank never add
 * up to more than 1, so two lines never pay for the same food or power. These are the line's numbers only: the money
 * itself moves where it always did (the nightly bills, food bought in the shop).
 *
 * Imports only types and data, so the feeding code (src/sim/care, src/sim/water) can call `noteFoodSpend`.
 */
import type { Clutch, Creature, GameState, ProductionLine } from '@/types';
import { getFoodDef } from '@/data/catalog/foods';

const roundCents = (n: number) => Math.round(n * 100) / 100;

/** The young of a line's pair (its own animals besides the parents). */
export function isLineYoung(line: ProductionLine, c: Pick<Creature, 'lineage'>): boolean {
  return !!c.lineage && c.lineage.motherId === line.pair.motherId && c.lineage.fatherId === line.pair.fatherId;
}

export function isLineParent(line: ProductionLine, id: string): boolean {
  return line.pair.motherId === id || line.pair.fatherId === id;
}

const isLineBrood = (line: ProductionLine, cl: Pick<Clutch, 'motherId' | 'fatherId'>) => cl.motherId === line.pair.motherId && cl.fatherId === line.pair.fatherId;

/** Every tank the line uses (its stages, every quarantine tank, the female's resting tank). */
export function lineTankIds(line: ProductionLine): string[] {
  const ids = [line.tanks.breed, line.tanks.raise, ...line.tanks.quarantine, line.tanks.keep];
  if (line.pair.restTankId) ids.push(line.pair.restTankId);
  return [...new Set(ids)];
}

/**
 * The line's share (0..1) of a tank's residents: living animals count one each and a brood counts its young. A tank
 * with nobody in it charges nobody. Each animal belongs to one line: a line's young that became another line's parent
 * is that line's (the parent role wins), so the shares of a tank never add up to more than 1.
 */
export function lineShare(state: GameState, line: ProductionLine, tankId: string): number {
  const others = (state.production?.lines ?? []).filter((l) => l !== line);
  let all = 0;
  let mine = 0;
  for (const c of Object.values(state.creatures)) {
    if (c.tankId !== tankId || (c.status !== 'alive' && c.status !== 'listed')) continue;
    all += 1;
    if (isLineParent(line, c.id) || (isLineYoung(line, c) && !others.some((l) => isLineParent(l, c.id)))) mine += 1;
  }
  for (const cl of Object.values(state.clutches)) {
    if (cl.tankId !== tankId || !(cl.count > 0)) continue;
    all += cl.count;
    if (isLineBrood(line, cl)) mine += cl.count;
  }
  return all > 0 ? mine / all : 0;
}

/** Add a cost to a line's week and lifetime numbers. */
export function chargeLine(line: ProductionLine, dollars: number): void {
  if (!(dollars > 0) || !Number.isFinite(dollars)) return;
  line.stats.costs = roundCents(line.stats.costs + dollars);
  line.stats.totalCosts = roundCents(line.stats.totalCosts + dollars);
}

/** Feeding hook (src/sim/care feedTank, src/sim/water's Autofeeder): servings of a food just fed into a tank. */
export function noteFoodSpend(state: GameState, tankId: string, foodId: string, servings: number): void {
  const lines = state.production?.lines;
  if (!lines?.length || !(servings > 0)) return;
  const food = getFoodDef(foodId);
  if (!food || !(food.servingsPerPack > 0)) return;
  const dollars = (servings * food.price) / food.servingsPerPack;
  for (const line of lines) {
    if (!lineTankIds(line).includes(tankId)) continue;
    const share = lineShare(state, line, tankId);
    if (share > 0) chargeLine(line, dollars * share);
  }
}
