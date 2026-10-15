/**
 * The Water room's reserves (DESIGN-S3D §9.2): sizes, the prep flow, and the fresh-water draw the Auto Top-Offs make.
 * OWNER: lane "automation" (chunk 5). A leaf module (types and data only), so the water step can call it.
 *
 * Fresh water costs nothing; once a Water room exists it is limited by the prep rate and the reserve size (ADR-0026
 * decision 6): the Auto Top-Offs draw only from the fresh reserve and stop while it's empty. The prep flow runs
 * continuously and is added up piecewise (`flowTo`) before every job, so a job at 10:00 sees the reserve as it is at
 * 10:00 whatever the step size (INTAKE §7.3).
 */
import type { AutomationDay, GameState, WaterRoomState } from '@/types';
import { BRINE, FOOD_ROOM, INFUSORIA, WATER_ROOM } from '@/data/catalog/machines';
import { dayOf } from '../time';

export const freshCap = (room: WaterRoomState): number => WATER_ROOM.freshCap + WATER_ROOM.reservoirFresh * room.reservoirs;
export const saltCap = (room: WaterRoomState): number => WATER_ROOM.saltCap + WATER_ROOM.reservoirSalt * room.reservoirs;
export const prepRate = (room: WaterRoomState): number => WATER_ROOM.prepRates[Math.max(0, Math.min(WATER_ROOM.prepRates.length - 1, room.prepLevel))];
/** Gallons of salt water one batch makes: 30, whatever the reserves' size (SPEC §9.2; the chunk 5 review). */
export const batchGal = (_room?: WaterRoomState): number => WATER_ROOM.batchGal;

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Add the prep station's output from the room's flow marker up to `hour` (capped at the fresh reserve's size). */
export function flowTo(room: WaterRoomState, hour: number): void {
  const from = room.flowHour;
  if (!(hour > from)) return;
  room.fresh = round3(Math.min(freshCap(room), room.fresh + prepRate(room) * (hour - from)));
  room.flowHour = hour;
}

/**
 * Draw up to `gal` gallons of fresh water for a top-off; returns what it got (all of it, or what's left in the
 * reserve). Without a Water room the top-off is tap water: all of it, untracked (0.5 §20.4).
 */
export function drawFresh(state: GameState, gal: number): number {
  const room = state.facility.water;
  if (!room || !(gal > 0)) return Math.max(0, gal);
  const got = Math.min(gal, Math.max(0, room.fresh));
  room.fresh = round3(room.fresh - got);
  noteFreshDraw(state, got);
  return got;
}

/** The day's top-off gallons (Operations › Water's flows). */
function noteFreshDraw(state: GameState, gal: number): void {
  if (!(gal > 0)) return;
  const w = dayWater(state);
  w.topOff = round3(w.topOff + gal);
}

/** Days of tallies kept: the last seven completed days, plus room for the one just closed. */
export const DAYS_KEPT = 8;

/**
 * Today's tallies (live food used and made, the Water room's flows), created when first needed. A new day closes the
 * previous record into `days` (the last seven completed days are kept).
 */
export function today(state: GameState, hour = state.clock.hour): AutomationDay {
  const a = (state.automation ??= {});
  const day = dayOf(hour);
  if (a.today && a.today.day === day) return a.today;
  if (a.today && a.today.day > day) {
    // an hour before the newest record (a midnight job ran first in this step, then a call on the clock's hour): its own
    // day's record, never a fresh one over the newer day's tallies (the chunk 5 review)
    const days = (a.days ??= []);
    let rec = days.find((d) => d.day === day);
    if (!rec) {
      rec = { day, used: {}, made: {}, makeCost: 0 };
      days.push(rec);
      days.sort((x, y) => x.day - y.day);
      if (days.length > DAYS_KEPT) days.splice(0, days.length - DAYS_KEPT);
    }
    return rec;
  }
  if (a.today && a.today.day < day) {
    const days = (a.days ??= []);
    days.push(a.today);
    if (days.length > DAYS_KEPT) days.splice(0, days.length - DAYS_KEPT);
  }
  a.today = { day, used: {}, made: {}, makeCost: 0 };
  return a.today;
}

export function dayWater(state: GameState, hour = state.clock.hour): NonNullable<AutomationDay['water']> {
  const t = today(state, hour);
  return (t.water ??= { fresh: 0, salt: 0, mixer: 0, topOff: 0, hatchery: 0, changes: 0, skipped: 0 });
}

/** Live food the tanks used (any feed: the player's, the keepers', the dosers'), counted once a Live food room exists. */
export function noteLiveFoodUsed(state: GameState, foodId: string, servings: number): void {
  if (!state.facility.food || (foodId !== BRINE && foodId !== INFUSORIA) || !(servings > 0)) return;
  const t = today(state);
  t.used[foodId] = (t.used[foodId] ?? 0) + servings;
}

/** The rooms' running costs a day (the nightly bill posts them as their own entry, AUTO-038; src/sim/economy/finance.ts). */
export function roomsUpkeep(state: GameState): number {
  let total = 0;
  if (state.facility.water) total += WATER_ROOM.prepUpkeep + WATER_ROOM.mixerUpkeep;
  const f = state.facility.food;
  if (f) total += f.cones.length * FOOD_ROOM.coneUpkeep + f.jars.length * FOOD_ROOM.jarUpkeep;
  return Math.round(total * 100) / 100;
}
