/**
 * Problems (DESIGN-S3D §9.6, §9.8; AUTO-035): what needs the player, as pure functions over the state. OWNER: lane
 * "automation" (chunk 5).
 *
 * - A supply is **low** while its stock covers less than two days of use (or only one salt batch) and no reorder is
 *   coming, **out** when it can't run its machine (no salt for a batch, no eggs, no vegetables, no live food for a
 *   doser) and no reorder is coming, and **arriving** when the stock manager's next shelf check buys it (the forecast:
 *   a dry run of that check, src/sim/staff/work.ts `nextStockCheck`). Without a stock manager nobody reorders
 *   (ADR-0026 decision 14). Salt counts only while something uses salt water (decision 12).
 * - A production line that waits for room is a problem until the player adds capacity or chooses to wait; then it's a
 *   plain status, "Resumes Day {d}".
 * The counts drive the Operations sub-line, the tab and dock dots, the More row and the bell (§5.4).
 */
import type { GameState } from '@/types';
import { BRINE, INFUSORIA, VEGETABLES } from '@/data/catalog/machines';
import { emitEvent } from '../context';
import { dayOf } from '../time';
import { nextStockCheck, stockManager, type StockForecast } from '../staff/work';
import { lineStatus, restartDay } from '../production';
import { batchGal, mixerPerDay, prepRate } from './reserve';
import { SALT_KG_PER_GAL, batchSaltKg, saltDaysLeft, saltWaterNeeded, saltWaterPerDay, tankChangeNeed } from './water';
import { doserNeeds, doserOf } from './food';

export type ProblemTone = 'watch' | 'danger';
/**
 * The supplies Problems watches: salt mix, brine shrimp eggs, vegetables for the jars, live food for the dosers, fresh
 * water; and the Water room's day (ADR-0033): salt water or fresh water used faster than the mixer or the prep station
 * makes it, so the jobs it can't cover are skipped (`salt_rate`, `fresh_rate`).
 */
export type SupplyKey = 'salt' | 'eggs' | 'veg' | 'live' | 'fresh' | 'salt_rate' | 'fresh_rate';
/** Why no reorder is coming. */
export type NoReorder = 'budget' | 'cash' | 'orders_off' | 'no_manager';

export interface SupplyProblem {
  kind: 'supply';
  supply: SupplyKey;
  state: 'low' | 'out' | 'arriving';
  tone: ProblemTone;
  /** Stock now (kg of salt mix, scoops, servings, gallons) and its use a day. */
  stock: number;
  perDay: number;
  /** The shelf check that buys it (arriving). */
  arrives: number | null;
  why: NoReorder | null;
  /** Salt: the day the salt tanks' changes would first be skipped unless salt arrives. */
  shortDay?: number;
  /** Live food: the tanks whose dosers have nothing to give. */
  tankIds?: string[];
  /** The Water room's day (salt_rate, fresh_rate): what the mixer or the prep station makes a day; `perDay` is the use. */
  capacity?: number;
}

export interface LineProblem {
  kind: 'line';
  tone: ProblemTone;
  lineId: string;
  name: string;
  restartDay: number;
}

export type Problem = SupplyProblem | LineProblem;

const stockOf = (state: GameState, id: string) => Math.max(0, Math.floor(state.inventory.foods[id] ?? 0));

/** The shortage items and held-up lines, most urgent first (danger, then watch; salt, eggs, vegetables, live food, water, lines). */
export function automationProblems(state: GameState, hour = state.clock.hour, known?: StockForecast | null): Problem[] {
  const out: Problem[] = [];
  let forecast: StockForecast | null | undefined = known; // the caller's dry run of the next check, if it has one (PERF-004)
  const check = () => (forecast === undefined ? (forecast = nextStockCheck(state, hour)) : forecast);
  const why = (label: string): NoReorder => {
    const f = check();
    if (!f) return 'no_manager';
    if (f.off) return 'orders_off';
    return f.plan.noCash.includes(label) ? 'cash' : 'budget';
  };
  const supply = (supply: SupplyKey, stock: number, perDay: number, isOut: boolean, label: string | null, extra: Partial<SupplyProblem> = {}): void => {
    const f = label ? check() : null;
    const buys = !!f && !f.off && f.plan.buys.some((b) => (b.kind === 'food' ? b.foodId === VEGETABLES && label === 'blanched vegetables' : b.kind === 'salt' ? label === 'salt mix' : label === 'brine shrimp eggs'));
    if (buys) out.push({ kind: 'supply', supply, state: 'arriving', tone: 'watch', stock, perDay, arrives: f!.at, why: null, ...extra });
    else out.push({ kind: 'supply', supply, state: isOut ? 'out' : 'low', tone: isOut ? 'danger' : 'watch', stock, perDay, arrives: null, why: label ? why(label) : null, ...extra });
  };

  const water = state.facility.water;
  if (water && saltWaterNeeded(state)) {
    const kgDay = saltWaterPerDay(state) * SALT_KG_PER_GAL;
    const batchKg = batchSaltKg(batchGal(water));
    const kg = Math.max(0, state.inventory.salt);
    const days = saltDaysLeft(state);
    const shortDay = Number.isFinite(days) ? dayOf(hour + days * 24) : undefined;
    if (kg < batchKg - 1e-6 || kg < 2 * kgDay - 1e-6 || kg < 2 * batchKg - 1e-6) supply('salt', kg, kgDay, kg < batchKg - 1e-6, 'salt mix', shortDay !== undefined ? { shortDay } : {});
    // more salt water a day than two batches make: the last changes are skipped every day (ADR-0033)
    const use = saltWaterPerDay(state);
    const make = mixerPerDay(water);
    if (use > make + 1e-6) out.push({ kind: 'supply', supply: 'salt_rate', state: 'low', tone: 'watch', stock: water.salt, perDay: use, capacity: make, arrives: null, why: null });
  }
  const food = state.facility.food;
  if (food && food.cones.length) {
    const eggs = Math.max(0, Math.floor(state.inventory.brineShrimpEggs ?? 0));
    const perDay = food.cones.length;
    if (eggs < 2 * perDay) supply('eggs', eggs, perDay, eggs < 1, 'brine shrimp eggs');
  }
  if (food && food.jars.length) {
    const veg = stockOf(state, VEGETABLES);
    const perDay = food.jars.length / 3;
    if (veg < 2 * perDay - 1e-6) supply('veg', veg, perDay, veg < 1, 'blanched vegetables');
  }
  // Dosers with young to feed and none of their food in stock (the Live food room makes more; nobody buys it).
  const dry: string[] = [];
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (!t || !doserOf(t)) continue;
    const needs = doserNeeds(state, t, hour);
    if (needs.some((n) => !n.foods.some((f) => stockOf(state, f) >= 1))) dry.push(id);
  }
  if (dry.length) {
    const servings = stockOf(state, BRINE) + stockOf(state, INFUSORIA);
    const growing = !!food && (food.cones.some((c) => c.startedHour !== null) || food.jars.some((c) => c.startedHour !== null));
    out.push({ kind: 'supply', supply: 'live', state: growing ? 'low' : 'out', tone: growing ? 'watch' : 'danger', stock: servings, perDay: 0, arrives: null, why: null, tankIds: dry });
  }
  if (water && water.fresh < 1) out.push({ kind: 'supply', supply: 'fresh', state: 'out', tone: 'watch', stock: water.fresh, perDay: 0, arrives: null, why: null });
  else if (water) {
    // more fresh water a day than the prep station makes (the changes' fresh share, the mixer's batches, yesterday's
    // top-offs): what it can't cover waits (ADR-0033)
    const use = freshWaterPerDay(state, hour);
    const make = prepRate(water) * 24;
    if (use > make + 1e-6) out.push({ kind: 'supply', supply: 'fresh_rate', state: 'low', tone: 'watch', stock: water.fresh, perDay: use, capacity: make, arrives: null, why: null });
  }

  for (const line of state.production?.lines ?? []) {
    if (lineStatus(line) !== 'waiting' || state.automation?.lineWait?.[line.id] !== undefined) continue;
    out.push({ kind: 'line', tone: 'watch', lineId: line.id, name: line.name, restartDay: restartDay(state, line) });
  }
  const rank = (p: Problem) => (p.tone === 'danger' ? 0 : 1);
  return out.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
}

/** Fresh water used a day: the changers' fresh share, the mixer's batches (as much as it can make) and yesterday's top-offs. */
export function freshWaterPerDay(state: GameState, hour = state.clock.hour): number {
  const water = state.facility.water;
  if (!water) return 0;
  let gal = 0;
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (t) gal += tankChangeNeed(state, t)?.fresh ?? 0;
  }
  if (saltWaterNeeded(state)) gal += Math.min(saltWaterPerDay(state), mixerPerDay(water));
  const last = (state.automation?.days ?? []).filter((d) => d.day < dayOf(hour)).slice(-1)[0];
  return gal + (last?.water?.topOff ?? 0);
}

/** The counts the dots and sub-lines show. */
export function problemCounts(list: readonly Problem[]): { total: number; danger: number; watch: number } {
  const danger = list.filter((p) => p.tone === 'danger').length;
  return { total: list.length, danger, watch: list.length - danger };
}

/** Lines whose pause the player chose to wait out (or added a quarantine tank for), still waiting: "Resumes Day {d}". */
export function decidedLines(state: GameState): { lineId: string; name: string; restartDay: number }[] {
  const out: { lineId: string; name: string; restartDay: number }[] = [];
  for (const line of state.production?.lines ?? [])
    if (lineStatus(line) === 'waiting' && state.automation?.lineWait?.[line.id] !== undefined) out.push({ lineId: line.id, name: line.name, restartDay: restartDay(state, line) });
  return out;
}

/** The "Out of salt mix" body (notification and log), in the reason's words (DESIGN-S3D §8.9, ADR-0026 decision 9). */
export function saltOutText(state: GameState, p: SupplyProblem): string {
  const m = stockManager(state); // the name only: no dry run (PERF-004)
  const name = m ? m.name.split(' ')[0] : 'Your stock manager';
  const lasts = p.shortDay !== undefined ? ` Salt water lasts until Day ${p.shortDay}.` : '';
  switch (p.why) {
    case 'no_manager':
      return `No one reorders salt mix. Buy it, or hire a stock manager.${lasts}`;
    case 'orders_off':
      return `${name}'s orders are switched off, so nobody reorders salt mix.${lasts}`;
    case 'cash':
      return `${name} couldn't reorder salt mix: there isn't enough cash right now.${lasts}`;
    default:
      return `${name} couldn't reorder salt mix — today's stock budget is spent.${lasts}`;
  }
}

/**
 * After each mixing check: when salt mix is out and no reorder is coming, the Automation notification (once a game
 * day). Quiet hours and the rate limit apply on delivery (src/ui/notify).
 */
export function supplyNotices(state: GameState, at: number): void {
  if (state.isShowcase) return;
  const salt = automationProblems(state, at).find((p): p is SupplyProblem => p.kind === 'supply' && p.supply === 'salt');
  if (!salt || salt.state !== 'out') return;
  const a = (state.automation ??= {});
  const warned = (a.warned ??= {});
  if (warned.salt_out !== undefined && at - warned.salt_out < 24) return;
  warned.salt_out = at;
  const body = saltOutText(state, salt);
  emitEvent(state, { kind: 'warning', text: `Out of salt mix. ${body}`, notice: { topic: 'supply_out', vars: { supply: 'salt', body, ...(salt.shortDay !== undefined ? { day: salt.shortDay } : {}) } } }, at);
}
