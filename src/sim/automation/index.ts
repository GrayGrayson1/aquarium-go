/**
 * Deep automation (DESIGN-S3D; chunk 5): the Water room, the Live food room, the live-food dosers, manual mode, and
 * the summaries Operations reads. OWNER: lane "automation".
 *
 * `stepAutomation` runs once per world step (src/sim/world.ts, after the production lines and before the world
 * systems, so the stock manager's shelf check sees the jobs' use). Inside a step's window the jobs run at their game
 * hours in time order, and jobs of the same hour in DESIGN-S3D §9.9's order: water changes, hatchery cones, jars,
 * doser feeds, a batch finishing, salt mixing (then the shelf check, in the staff step). The prep flow is added up to
 * each job's hour first, so a job sees the reserve as it is at that hour whatever the step size. Each job is idempotent
 * through its own marker (a device's last-run hour, a culture's start hour, the mixer's last check), so a re-stepped
 * window, a save and load or the offline catch-up never repeats one (AUTO-018, AUTO-026). No randomness.
 */
import type { GameState, HoldSystem } from '@/types';
import type { ActionResult } from '../care';
import { DOSER, FOOD_ROOM, WATER_ROOM } from '@/data/catalog/machines';
import { spend } from '../economy/finance';
import { fmtMoney } from '../economy/util';
import { crossings } from '../time';
import { settleTanks } from '../settle';
import { holdAll, resumeAll, setHold } from './hold';
import { flowTo } from './reserve';
import { changerOf, changesSummary, installWaterRoom, mixCheck, reserveChange, topUp } from './water';
import { cultureCheck, doseTank, doserOf, installFoodRoom } from './food';
import { supplyNotices } from './problems';

export * from './hold';
export * from './reserve';
export * from './water';
export * from './food';
export * from './problems';
export * from './summary';

/** Finishing Central Water Supply or Live Food Cultures installs the base room (ADR-0026 decision 8). */
export function installRooms(state: GameState, hour = state.clock.hour): void {
  const unlocked = state.progress.unlocked;
  if (!state.facility.water && unlocked.includes('water_room')) installWaterRoom(state, hour);
  if (!state.facility.food && unlocked.includes('live_food_room')) installFoodRoom(state);
}

interface Job {
  at: number;
  order: number;
  seq: number;
  run: () => void;
}

/** One world step's facility jobs over [start, end) (game hours). */
export function stepAutomation(state: GameState, start: number, end: number): void {
  if (state.isShowcase || !(end > start)) return;
  installRooms(state, start);
  const water = state.facility.water ?? null;
  const food = state.facility.food ?? null;
  const dosed = state.tankOrder.filter((id) => !!state.tanks[id] && !!doserOf(state.tanks[id]));
  if (!water && !food && !dosed.length) return;
  const jobs: Job[] = [];
  const push = (at: number, order: number, run: () => void) => jobs.push({ at, order, seq: jobs.length, run });

  if (water) {
    // Water changes at each tank's lights-on, tank by tank in tankOrder; one summary line per hour of changes.
    const runs = new Map<number, { n: number; gal: number; skipped: number }>();
    for (const id of state.tankOrder) {
      const tank = state.tanks[id];
      if (!tank || !changerOf(tank)) continue;
      for (const at of crossings(start, end, tank.lighting?.onHour ?? 8)) {
        if (!runs.has(at)) {
          runs.set(at, { n: 0, gal: 0, skipped: 0 });
          push(at, 0.9, () => {
            const r = runs.get(at)!;
            changesSummary(state, at, r.n, r.gal, r.skipped);
          });
        }
        push(at, 0, () => {
          settleTanks(state, [id]); // the tank catches up to this step before its water changes (ADR-0026 decision 5)
          const t = state.tanks[id];
          if (!t) return;
          const took = reserveChange(state, water, t, at);
          if (took === null) return;
          const r = runs.get(at)!;
          if (took > 0) {
            r.n += 1;
            r.gal += took;
          } else r.skipped += 1;
        });
      }
    }
    // A batch finishing tops the reserve up before the same hour's mixing check (INTAKE C-18).
    const ready = water.mix?.readyHour;
    if (ready !== undefined && ready >= start - 1e-9 && ready < end - 1e-9) push(ready, 5, () => topUp(state, water, ready));
    for (const h of WATER_ROOM.mixHours)
      for (const at of crossings(start, end, h))
        push(at, 6, () => {
          mixCheck(state, water, at);
          supplyNotices(state, at);
        });
  }
  if (food) {
    // Cultures start and harvest on the hour.
    for (let h = Math.ceil(start - 1e-9); h < end - 1e-9; h++) {
      if (food.lastHour !== undefined && h <= food.lastHour) continue;
      const at = h;
      push(at, 2, () => cultureCheck(state, food, 'cone', at));
      push(at, 3, () => {
        cultureCheck(state, food, 'jar', at);
        food.lastHour = at;
      });
    }
  }
  for (const id of dosed)
    for (const h of DOSER.hours)
      for (const at of crossings(start, end, h))
        push(at, 4, () => {
          settleTanks(state, [id]);
          const t = state.tanks[id];
          if (t) doseTank(state, t, at);
        });

  jobs.sort((a, b) => a.at - b.at || a.order - b.order || a.seq - b.seq);
  for (const j of jobs) {
    if (water) {
      flowTo(water, j.at);
      topUp(state, water, j.at);
    }
    j.run();
  }
  if (water) {
    flowTo(water, end);
    topUp(state, water, end);
  }
}

// ───────────────────────────── player actions ─────────────────────────────

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

function pay(state: GameState, price: number, what: string): ActionResult | null {
  if (spend(state, price, 'equipment', what)) return null;
  return fail(`Not enough money for ${what}: it costs ${fmtMoney(price)} and you have ${fmtMoney(Math.max(0, state.finance.money))}.`);
}

/** Build › Facility › Water room: "Faster" (the prep station's next level). */
export function upgradePrep(state: GameState): ActionResult {
  const room = state.facility.water;
  if (!room) return fail('Research Central Water Supply first.');
  const price = WATER_ROOM.prepPrices[room.prepLevel];
  if (price === undefined) return fail('The Water Prep Station is already at its fastest.');
  const no = pay(state, price, 'a faster Water Prep Station');
  if (no) return no;
  flowTo(room, state.clock.hour); // the old rate up to now
  room.prepLevel += 1;
  return ok(`The Water Prep Station now makes ${WATER_ROOM.prepRates[room.prepLevel]} gal an hour (${fmtMoney(price)}).`);
}

/** Build › Facility › Water room: another Reservoir (+150 gal fresh, +60 gal salt). */
export function addReservoir(state: GameState): ActionResult {
  const room = state.facility.water;
  if (!room) return fail('Research Central Water Supply first.');
  if (room.reservoirs >= WATER_ROOM.maxReservoirs) return fail('The Water room has no space for another reservoir.');
  const no = pay(state, WATER_ROOM.reservoirPrice, 'a reservoir');
  if (no) return no;
  flowTo(room, state.clock.hour);
  room.reservoirs += 1;
  return ok(`Reservoirs now hold ${WATER_ROOM.freshCap + WATER_ROOM.reservoirFresh * room.reservoirs} gal of fresh water and ${WATER_ROOM.saltCap + WATER_ROOM.reservoirSalt * room.reservoirs} gal of salt water (${fmtMoney(WATER_ROOM.reservoirPrice)}).`);
}

/** Build › Facility › Live food room: "Add a cone" / "Add a jar". */
export function addCulture(state: GameState, kind: 'cone' | 'jar'): ActionResult {
  const room = state.facility.food;
  if (!room) return fail('Research Live Food Cultures first.');
  const list = kind === 'cone' ? room.cones : room.jars;
  const max = kind === 'cone' ? FOOD_ROOM.maxCones : FOOD_ROOM.maxJars;
  if (list.length >= max) return fail(`The Live food room has no space for another ${kind}.`);
  const price = kind === 'cone' ? FOOD_ROOM.conePrice : FOOD_ROOM.jarPrice;
  const no = pay(state, price, kind === 'cone' ? 'a hatchery cone' : 'an infusoria jar');
  if (no) return no;
  list.push({ startedHour: null });
  return ok(`Added ${kind === 'cone' ? 'a hatchery cone' : 'an infusoria jar'} (${fmtMoney(price)}).`);
}

/** Manual mode: Hold all, Resume all, or one system. */
export function setManualMode(state: GameState, sys: HoldSystem | 'all', on: boolean): ActionResult {
  if (sys === 'all') {
    if (on) holdAll(state);
    else resumeAll(state);
  } else setHold(state, sys, on);
  return ok(on ? 'Held.' : 'Resumed.');
}

/** The stock manager's orders switch (DESIGN-S3D §7.7, ADR-0026 decision 10): keeps the budget, and the log quiet. */
export function setStockOrders(state: GameState, on: boolean): ActionResult {
  if (!state.staff) return fail('There is no stock manager.');
  if (on) delete state.staff.ordersOff;
  else state.staff.ordersOff = true;
  return ok(on ? 'Orders are on.' : 'Orders are off.');
}

/** Problems › a paused line › Wait: the player chooses to wait it out (the item becomes "Resumes Day {d}"). */
export function waitForLine(state: GameState, lineId: string): ActionResult {
  const line = state.production?.lines.find((l) => l.id === lineId);
  if (!line) return fail('That line isn’t here any more.');
  const a = (state.automation ??= {});
  (a.lineWait ??= {})[lineId] = state.clock.hour;
  return ok('Waiting.');
}
