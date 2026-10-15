/**
 * The Water room's next days, dry-run (ADR-0033; the chunk 5 review). OWNER: lane "automation" (chunk 5).
 *
 * The same rules as the jobs (`water.ts`, `food.ts`), on copies of the numbers, never the state: the prep station fills
 * the fresh reserve at its rate up to its size; each tank's change at its lights-on takes all its water or is skipped;
 * the hatchery cones take a scoop of eggs and 0.5 gal of salt water at each restart (not while live food is held); the 10 AM and 10 PM checks start a batch while salt water
 * is under 60 %, the mixing tank is empty and there's salt mix and fresh water for it; a batch is ready 12 h later and
 * tops the reserve up as there's room. Top-offs drain fresh water at yesterday's rate. Jobs of the same hour run in
 * SPEC §9.9's order. Today lists its batches; Problems warns when it skips changes for want of salt or fresh water.
 */
import type { GameState } from '@/types';
import { FOOD_ROOM, WATER_ROOM } from '@/data/catalog/machines';
import { crossings, dayOf } from '../time';
import { isHeld } from './hold';
import { batchGal, freshCap, prepRate, saltCap } from './reserve';
import { batchSaltKg, changerOf, saltWaterNeeded, tankChangeNeed } from './water';

export interface WaterRun {
  /** When batches start. */
  mixing: number[];
  /** Changes skipped for want of salt water or fresh water. */
  skipped: { at: number; tankId: string; cause: 'salt' | 'fresh' }[];
  /** Checks due to start a batch that waited for fresh water or salt mix (the salt skips that follow are theirs). */
  waits: { at: number; cause: 'fresh' | 'salt' }[];
  /** Salt water the mixer made, and fresh water the changes, the mixer and the top-offs took (gal, over the run). */
  saltMade: number;
  freshUsed: number;
  hours: number;
}

export interface WaterRunOptions {
  /** As if salt mix never ran out (Problems' rate warning: the salt item covers the stock). */
  unlimitedSalt?: boolean;
  /** As if salt mixing weren't held (Today lists held batches, marked held). */
  ignoreSaltHold?: boolean;
}

type Ev = { at: number; order: number; i: number; kind: 'change' | 'cone' | 'check'; tankId?: string; fresh?: number; salt?: number };

/** Dry-run the Water room from now for `hours`; null without one. Held water changes draw nothing. */
export function waterRoomRun(state: GameState, hours = 168, opts: WaterRunOptions = {}): WaterRun | null {
  const room = state.facility.water;
  if (!room) return null;
  const start = state.clock.hour;
  const end = start + hours;
  const heldWater = isHeld(state, 'water');
  const heldSalt = !opts.ignoreSaltHold && isHeld(state, 'salt');
  const needed = saltWaterNeeded(state);
  const fCap = freshCap(room);
  const sCap = saltCap(room);
  const rate = prepRate(room);
  const gal = batchGal(room);
  const kgBatch = batchSaltKg(gal);
  const last = (state.automation?.days ?? []).filter((d) => d.day < dayOf(start)).slice(-1)[0];
  const topOffPerH = (last?.water?.topOff ?? 0) / 24;
  let fresh = Math.min(fCap, room.fresh + rate * Math.max(0, start - room.flowHour));
  let salt = room.salt;
  let mix = room.mix && room.mix.gal > 1e-6 ? { gal: room.mix.gal, ready: room.mix.readyHour } : null;
  let kg = opts.unlimitedSalt ? Infinity : Math.max(0, state.inventory.salt);
  const heldFood = isHeld(state, 'food');
  let eggs = Math.max(0, Math.floor(state.inventory.brineShrimpEggs ?? 0));
  const out: WaterRun = { mixing: [], skipped: [], waits: [], saltMade: 0, freshUsed: 0, hours };

  const evs: Ev[] = [];
  state.tankOrder.forEach((id, i) => {
    const t = state.tanks[id];
    const need = t && changerOf(t) ? tankChangeNeed(state, t) : null;
    if (!need || heldWater) return;
    for (const at of crossings(start, end, t.lighting?.onHour ?? 8)) evs.push({ at, order: 0, i, kind: 'change', tankId: id, fresh: need.fresh, salt: need.salt });
  });
  const food = state.facility.food;
  if (needed && food && !heldFood)
    food.cones.forEach((c, i) => {
      if (c.startedHour === null) return;
      for (let at = c.startedHour + FOOD_ROOM.coneHours; at < end; at += FOOD_ROOM.coneHours) if (at >= start) evs.push({ at, order: 2, i, kind: 'cone' });
    });
  if (needed && !heldSalt) for (const h of WATER_ROOM.mixHours) for (const at of crossings(start, end, h)) evs.push({ at, order: 5, i: 0, kind: 'check' });
  evs.sort((a, b) => a.at - b.at || a.order - b.order || a.i - b.i);

  let now = start;
  const advance = (t: number) => {
    const dt = Math.max(0, t - now);
    const drained = Math.min(fresh + rate * dt, topOffPerH * dt);
    fresh = Math.max(0, Math.min(fCap, fresh + rate * dt) - drained);
    out.freshUsed += drained;
    now = t;
  };
  const topUp = (t: number) => {
    if (!mix || t < mix.ready - 1e-9 || heldSalt) return;
    const move = Math.min(mix.gal, Math.max(0, sCap - salt));
    salt += move;
    mix.gal -= move;
    if (mix.gal <= 1e-6) mix = null;
  };
  for (const e of evs) {
    advance(e.at);
    topUp(e.at);
    if (e.kind === 'change') {
      const s = e.salt ?? 0;
      const f = e.fresh ?? 0;
      if (salt + 1e-9 < s) out.skipped.push({ at: e.at, tankId: e.tankId!, cause: 'salt' });
      else if (fresh + 1e-9 < f) out.skipped.push({ at: e.at, tankId: e.tankId!, cause: 'fresh' });
      else {
        salt -= s;
        fresh -= f;
        out.freshUsed += f;
        topUp(e.at);
      }
    } else if (e.kind === 'cone') {
      // a restart takes a scoop of eggs and half a gallon of salt water (food.ts); without both the cone waits
      if (eggs >= 1 && salt + 1e-9 >= FOOD_ROOM.coneSaltGal) {
        eggs -= 1;
        salt -= FOOD_ROOM.coneSaltGal;
      }
      topUp(e.at);
    } else {
      if (mix || salt >= sCap * WATER_ROOM.mixBelow - 1e-9) continue;
      if (kg + 1e-6 < kgBatch || fresh + 1e-9 < gal) {
        out.waits.push({ at: e.at, cause: kg + 1e-6 < kgBatch ? 'salt' : 'fresh' }); // it waits
        continue;
      }
      fresh -= gal;
      kg -= kgBatch;
      out.freshUsed += gal;
      out.saltMade += gal;
      mix = { gal, ready: e.at + WATER_ROOM.mixHoursLong };
      out.mixing.push(e.at);
    }
  }
  return out;
}
