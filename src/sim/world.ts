/**
 * World stepper with simulation LOD. OWNER: core.
 *
 * - The focused tank is simulated every sub-step ('full').
 * - Other tanks accumulate "sim debt" and are stepped in larger chunks ('reduced' ≥1h, 'summary' ≥4h).
 * - Deterministic: identical inputs (state + call sequence) give identical results.
 */
import type { GameState, Tank } from '@/types';
import { makeContext, type SimLod } from './context';
import { MAX_SUBSTEP_HOURS } from './time';
import { stepTankWater, getWaterReport } from './water';
import { evaluateTank, clearCompatCache } from './compat';
import { stepTankCreatures, stepTankBreeding, creaturesInTank } from './life';
import { stepMarket, stepFinance } from './economy';
import { stepVisitors, stepProgression, exhibitScore } from './facility';
import { beautyScore, stepTankDecor } from './aquascape';
import { animalStatus, composeTankStatus, noteFoodLevel, tankFoodOutlook, type FoodOutlook } from './tankStatus';
import { stepStaff } from './staff'; // lane:staff
import { stepShows } from './shows'; // lane:shows
import { withResidentIndex, inResidentScope } from './residents'; // lane:perf2 — per-step tank → residents index (./residents.ts)

export interface AdvanceOptions {
  focusTankId?: string | null;
  /** Force every tank to full fidelity (tests). */
  forceFull?: boolean;
}

const REDUCED_THRESHOLD_H = 1;
const SUMMARY_THRESHOLD_H = 4;
/** Tanks beyond this index (in tankOrder, excluding focus) use summary LOD. */
const REDUCED_TANK_BUDGET = 12;

export function tankLod(state: GameState, tankId: string, opts: AdvanceOptions): SimLod {
  if (opts.forceFull || tankId === opts.focusTankId) return 'full';
  const idx = state.tankOrder.indexOf(tankId);
  return idx < REDUCED_TANK_BUDGET ? 'reduced' : 'summary';
}

/**
 * lane:fix-core — the compatibility cache answers by a quantized signature, so a cache warmed by another world can
 * answer for a slightly different tank and be cleared at a different moment; two identical runs then drift apart in
 * the last decimals (tests/sim/staff-sim 'is deterministic'). Every distinct world object starts cold.
 */
let lastWorld: GameState | null = null;
function enterWorld(state: GameState): void {
  if (state === lastWorld) return;
  lastWorld = state;
  clearCompatCache();
}

/** Advance the whole world by `hours` of game time. */
export function advanceWorld(state: GameState, hours: number, opts: AdvanceOptions = {}): void {
  enterWorld(state);
  let remaining = Math.max(0, hours);
  while (remaining > 1e-9) {
    const dt = Math.min(MAX_SUBSTEP_HOURS, remaining);
    withResidentIndex(state, () => stepOnce(state, dt, opts)); // lane:perf2 — one residents index per step
    remaining -= dt;
  }
}

function stepOnce(state: GameState, dt: number, opts: AdvanceOptions): void {
  // lane:fix-core (G1-03) — this step covers world time [clock, clock + dt); a tank flushed here is anchored so its
  // pieces END at clock + dt, exactly like a flush from flushSimDebt / the loop's smoothing pass (which run after
  // the clock advanced and end at `clock`). Anchoring in-step flushes one step early left a dt-long gap in the
  // tank's time axis whenever the two kinds of flush alternated, and autofeeds inside the gap never fired.
  const endHour = state.clock.hour + dt;
  for (const tankId of [...state.tankOrder]) {
    const tank = state.tanks[tankId];
    if (!tank) continue;
    const lod = tankLod(state, tankId, opts);
    tank.simDebtHours = (tank.simDebtHours ?? 0) + dt;
    const threshold = lod === 'full' ? 0 : lod === 'reduced' ? REDUCED_THRESHOLD_H : SUMMARY_THRESHOLD_H;
    if (tank.simDebtHours + 1e-9 >= threshold) {
      const tdt = tank.simDebtHours;
      tank.simDebtHours = 0;
      stepTank(state, tank, tdt, lod, endHour);
    }
  }
  const ctx = makeContext(state, dt, 'full');
  stepMarket(state, dt, ctx);
  stepFinance(state, dt, ctx);
  stepStaff(state, dt, ctx); // lane:staff — keeper rounds, stock orders, docent talks (after the nightly bills)
  stepVisitors(state, dt, ctx);
  stepProgression(state, dt, ctx);
  stepShows(state, dt, ctx); // lane:shows — show calendar + judging (deterministic; own RNG stream)
  state.clock.hour += dt;
}

/** Flush all accumulated tank sim debt (before save / when leaving a tank). */
export function flushSimDebt(state: GameState): void {
  enterWorld(state);
  for (const tankId of state.tankOrder) {
    const tank = state.tanks[tankId];
    if (tank && (tank.simDebtHours ?? 0) > 0) {
      const tdt = tank.simDebtHours!;
      tank.simDebtHours = 0;
      stepTank(state, tank, tdt, 'reduced');
    }
  }
}

/**
 * lane:qa-final — longest piece a background tank is stepped in while food is in its water. A chunk runs the water
 * step (where uneaten food starts to rot after ~45 game minutes) before the animals eat, so a keeper's meal dropped
 * into a summary-LOD tank (4 h chunks) mostly rotted uneaten: the pea puffers of a fully staffed big_facility starved
 * between "fed" rounds, and the rot fouled the water. (1 h pieces still lose ~20% of a meal to rot before the first
 * bite; 0.25 h pieces fix that too but shift the playthrough balance, so that is left for a balance pass.)
 */
const FOOD_PIECE_H = 1;
/**
 * lane:staff2 — the balance pass: while a meal is fresh (younger than half an hour) the piece is at most half an hour,
 * the focused tank's own step, so the animals get their first bites before the 45-minute rot threshold. Only a feed's
 * first piece changes (older leftovers still go in 1 h pieces), so the ~20% of every background meal that used to rot
 * uneaten is now eaten, and the playthrough balance barely moves (see the staff2 report).
 */
const FRESH_FOOD_PIECE_H = 0.5;

/**
 * Step one tank by `dt` hours of accumulated debt. `endHour` is the world time the debt runs up to: the current
 * clock for a flush between steps (default), `clock + dt` for a flush inside stepOnce (see there).
 */
export function stepTank(state: GameState, tank: Tank, dt: number, lod: SimLod, endHour = state.clock.hour): void {
  if (!inResidentScope(state)) return withResidentIndex(state, () => stepTank(state, tank, dt, lod, endHour)); // lane:perf2 (flush/smoothing calls)
  let left = dt;
  while (left > 1e-9) {
    const fresh = (tank.water.lab?.foodAgeH ?? 0) < FRESH_FOOD_PIECE_H; // lane:staff2
    const piece = lod !== 'full' && tank.water.foodInWater > 0.5 ? Math.min(fresh ? FRESH_FOOD_PIECE_H : FOOD_PIECE_H, left) : left;
    stepTankPiece(state, tank, piece, lod, endHour - left);
    left -= piece;
  }
  const food = refreshTankCache(state, tank);
  if (food) noteFoodLevel(state, tank, food);
}

function stepTankPiece(state: GameState, tank: Tank, dt: number, lod: SimLod, startHour: number): void {
  const ctx = makeContext(state, dt, lod);
  // Tank sub-steps are anchored to world time (end of the debt minus what is left) so timestamps stay meaningful.
  ctx.hour = startHour;
  stepTankWater(state, tank, dt, ctx);
  stepTankDecor(state, tank, dt, ctx.hour); // lane:fix-core2 (S05-10) — same world-time window as the water step
  stepTankCreatures(state, tank, dt, ctx);
  stepTankBreeding(state, tank, dt, ctx);
  tank.tapPressure = Math.max(0, tank.tapPressure - dt * 6);
}

/**
 * Recompute a tank's cached derived stats. `status` is the worst of water, animal welfare and food in stock (see
 * src/sim/tankStatus.ts); returns the food outlook it used (null if the refresh failed).
 */
export function refreshTankCache(state: GameState, tank: Tank): FoodOutlook | null {
  if (!inResidentScope(state)) return withResidentIndex(state, () => refreshTankCache(state, tank)); // lane:perf2 — read-only
  try {
    const report = getWaterReport(state, tank.id);
    const compat = evaluateTank(state, tank.id);
    const creatures = creaturesInTank(state, tank.id);
    const food = tankFoodOutlook(state, tank.id);
    composeTankStatus(tank, report, animalStatus(creatures), food);
    tank.cache.stability = report.stability;
    tank.cache.stockingLoad = report.stockingLoad;
    tank.cache.compatVerdict = compat.verdict;
    tank.cache.beauty = beautyScore(state, tank).score;
    tank.cache.welfare = creatures.length
      ? creatures.reduce((a, c) => a + (c.stats.health + c.stats.comfort + (100 - c.stats.stress)) / 3, 0) / creatures.length
      : 100;
    tank.cache.exhibitScore = exhibitScore(state, tank.id).score;
    return food;
  } catch (e) {
    // Never let a derived-stat failure crash the simulation loop.
    if (typeof console !== 'undefined') console.warn('refreshTankCache failed', e);
    return null;
  }
}
