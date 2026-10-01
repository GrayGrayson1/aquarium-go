/**
 * Staff & operations: hireable aquarists, a stock manager and docents for the mid/late game. OWNER: lane "staff".
 *
 * Module map:
 *   common.ts  lazy state, the staff RNG stream, daily records, read-only queries (keeperOf, staffLoad, wages)
 *   roster.ts  candidate pool, hire / fire, assignments, stock budget, nightly wages + experience + unpaid notice
 *   work.ts    keeper rounds (feed / water / glass), stock orders, docent talks + the bounded docent visitor effect
 *
 * Integration:
 *   - src/sim/world.ts calls `stepStaff` once per world sub-step (after finance, before visitors).
 *   - src/sim/economy/finance.ts calls `payStaff` in the nightly bills and adds wages to `dailyOperatingCost`.
 *   - src/sim/facility/visitors.ts reads `docentEffect` for satisfaction / learning / donations.
 * Determinism: all staff randomness comes from the staff's own mulberry32 stream (`state.staff.rng`), so hiring never
 * shifts the main simulation's random sequence. Robust to any dt (scheduled work is found by hour-of-day crossings).
 */
import type { GameState } from '@/types';
import type { SimContext } from '../context';
import { emitEvent } from '../context';
import { ensureStaff, staffUnlocked } from './common';
import { refreshCandidates, tidyAssignments } from './roster';
import { stepKeepers, stepStockManager, stepDocents } from './work';

export * from './common';
export { refreshCandidates, canHire, hireStaff, fireStaff, assignTank, autoAssignAll, setStockBudget, tidyAssignments, payStaff, staffLeavingTonight, addStaffDirect } from './roster';
export {
  ROUND_START,
  VISIT_HOURS,
  TALK_HOURS,
  TALK_LENGTH_H,
  STOCK_CHECKS,
  roundStart,
  crossings,
  ROUND_ORDER, // lane:staff2 — meals a day by metabolism (midday / late rounds for fast-metabolism tanks)
  mealsPerDay,
  tankRounds,
  roundVisits,
  keeperRounds,
  hungerRate,
  LOOKAHEAD_HUNGER,
  keeperVisits,
  keeperFeed,
  keeperWaterCare,
  keeperVisit,
  pickStaffFood,
  plannedOrders,
  stockCheck,
  stockTargetDays,
  giveTalk,
  docentEffect,
  traitLine,
  nextDuty,
  todayLine,
} from './work';
export type { KeeperRound, DocentEffect } from './work';

/** Advance staff work over [ctx.hour, ctx.hour + dt): hiring pool, keeper rounds, stock checks, docent talks. */
export function stepStaff(state: GameState, dt: number, ctx: SimContext): void {
  if (!(dt > 0) || state.isShowcase) return;
  if (!state.staff && !staffUnlocked(state)) return;
  const start = ctx.hour;
  const end = ctx.hour + dt;
  const first = !state.staff;
  const st = ensureStaff(state);
  try {
    if (staffUnlocked(state) && (st.nextPoolHour < 0 || end >= st.nextPoolHour)) {
      refreshCandidates(state, end);
      if (first && !state.isShowcase)
        emitEvent(state, { kind: 'tip', text: 'Your shop can take on staff now: an aquarist to share the feeding and water changes, a stock manager for supplies, or a docent for visitors. See Visitors › Staff.' });
    }
    // Throttle keys (per creature / equipment / tank) would pile up over a long game: forget stale ones.
    const warned = Object.keys(st.warned);
    if (warned.length > 80) for (const k of warned) if (end - st.warned[k] > 96) delete st.warned[k];
    if (!st.roster.length) return;
    tidyAssignments(state);
    stepKeepers(state, start, end);
    stepStockManager(state, start, end);
    stepDocents(state, start, end);
  } catch (e) {
    // Staff are helpers: never let a staff hiccup stop the world.
    if (typeof console !== 'undefined') console.warn('stepStaff failed', e);
  }
}
