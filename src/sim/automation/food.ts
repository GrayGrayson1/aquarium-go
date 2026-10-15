/**
 * The Live food room and the live-food dosers (DESIGN-S3D §9.3; AUTO-033). OWNER: lane "automation" (chunk 5).
 *
 * - Hatchery cones run 24 h: a start takes 1 scoop of brine shrimp eggs and 0.5 gal of salt water from the Water room;
 *   a harvest adds 20 servings of Live Baby Brine Shrimp (the same item a store pack adds).
 * - Infusoria jars run 72 h: a start takes 1 serving of Blanched Vegetables; a harvest adds 15 servings of Infusoria
 *   Culture.
 * - Nothing expires (ADR-0026 decision 7): the room stores a limited amount of each food, and a harvest that would pass
 *   it waits in its cone or jar ("Full") until there's room, then the culture restarts.
 * - A culture that can't start (no eggs, salt water or vegetables) waits empty; Problems shows the shortage.
 * - Held (manual mode): no starts, harvests or doses; cultures keep growing and a ready one waits (INTAKE C-24).
 * - A live-food doser (tank equipment, C-25) feeds the tank's free-swimming young at its dose hours, the food their
 *   stage eats (baby brine or infusoria), a serving per 20 young, from stock; with none in stock it skips (Problems).
 * Starts consume once and harvests add once: a culture's `startedHour` is its marker; a doser's is `lastDoseHour`.
 */
import type { Clutch, EquipmentInstance, FoodRoomState, GameState, Tank } from '@/types';
import { BRINE, DOSER, EGGS_SUPPLY, FOOD_ROOM, INFUSORIA, VEGETABLES } from '@/data/catalog/machines';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { findSpecies } from '@/data/species';
import { emitEvent } from '../context';
import { feedTank } from '../care';
import { ensureLab } from '../water/food';
import { currentPhase } from '../life/breeding/clutch';
import { moduleFor } from '../life/breeding/registry';
import { asStaff } from '../staff/common';
import { SALT_PRICE_PER_KG } from '../economy/purchases';
import { isHeld } from './hold';
import { dayWater, today } from './reserve';
import { SALT_KG_PER_GAL, drawSalt, waterRoom } from './water';

export type CultureKind = 'cone' | 'jar';

const SPEC = {
  cone: { hours: FOOD_ROOM.coneHours, yield: FOOD_ROOM.coneYield, food: BRINE },
  jar: { hours: FOOD_ROOM.jarHours, yield: FOOD_ROOM.jarYield, food: INFUSORIA },
} as const;

export const foodRoom = (state: GameState): FoodRoomState | null => state.facility.food ?? null;

/** Install the base Live food room (Live Food Cultures, ADR-0026 decision 8): two cones and four jars, empty. */
export function installFoodRoom(state: GameState): FoodRoomState {
  if (state.facility.food) return state.facility.food;
  const room: FoodRoomState = {
    cones: Array.from({ length: FOOD_ROOM.baseCones }, () => ({ startedHour: null })),
    jars: Array.from({ length: FOOD_ROOM.baseJars }, () => ({ startedHour: null })),
  };
  state.facility.food = room;
  return room;
}

/** How much of a live food the room stores (a harvest that would pass it waits). */
export function storeCap(room: FoodRoomState, foodId: string): number {
  if (foodId === BRINE) return room.cones.length * FOOD_ROOM.storePerCone;
  if (foodId === INFUSORIA) return room.jars.length * FOOD_ROOM.storePerJar;
  return Infinity;
}

const stock = (state: GameState, id: string) => Math.max(0, Math.floor(state.inventory.foods[id] ?? 0));

/** A culture's state for the screens: growing (0..1 done), ready but waiting for room ("Full"), held, or empty. */
export function cultureState(state: GameState, room: FoodRoomState, kind: CultureKind, i: number, hour = state.clock.hour): { status: 'growing' | 'full' | 'held' | 'empty'; progress: number; readyHour: number | null } {
  const c = (kind === 'cone' ? room.cones : room.jars)[i];
  const spec = SPEC[kind];
  if (!c || c.startedHour === null) return { status: isHeld(state, 'food') ? 'held' : 'empty', progress: 0, readyHour: null };
  const readyHour = c.startedHour + spec.hours;
  const progress = Math.max(0, Math.min(1, (hour - c.startedHour) / spec.hours));
  if (hour < readyHour) return { status: 'growing', progress, readyHour };
  if (isHeld(state, 'food')) return { status: 'held', progress: 1, readyHour };
  return { status: stock(state, spec.food) + spec.yield > storeCap(room, spec.food) ? 'full' : 'growing', progress: 1, readyHour };
}

/** What a culture's start costs (Saved this week counts it): eggs, the salt mix in its salt water, a vegetable serving. */
export function startCost(kind: CultureKind): number {
  if (kind === 'cone') return EGGS_SUPPLY.price / EGGS_SUPPLY.scoops + FOOD_ROOM.coneSaltGal * SALT_KG_PER_GAL * SALT_PRICE_PER_KG;
  const veg = getFoodDef(VEGETABLES);
  return veg ? veg.price / Math.max(1, veg.servingsPerPack) : 0;
}

function tryStart(state: GameState, room: FoodRoomState, kind: CultureKind, i: number, at: number): boolean {
  const c = (kind === 'cone' ? room.cones : room.jars)[i];
  if (kind === 'cone') {
    const water = waterRoom(state);
    if ((state.inventory.brineShrimpEggs ?? 0) < 1 || !water) return false;
    if (!drawSalt(state, water, FOOD_ROOM.coneSaltGal, at)) return false;
    state.inventory.brineShrimpEggs = (state.inventory.brineShrimpEggs ?? 0) - 1;
    const w = dayWater(state, at);
    w.hatchery = Math.round((w.hatchery + FOOD_ROOM.coneSaltGal) * 1000) / 1000;
  } else {
    if (stock(state, VEGETABLES) < 1) return false;
    state.inventory.foods[VEGETABLES] = (state.inventory.foods[VEGETABLES] ?? 0) - 1;
  }
  c.startedHour = at;
  const t = today(state, at);
  t.makeCost = Math.round((t.makeCost + startCost(kind)) * 10000) / 10000;
  return true;
}

/**
 * The hourly culture check at game hour `at` (an integer hour): harvest what's ready (room permitting), then start
 * what's empty. Cones before jars (DESIGN-S3D §9.9). Returns the servings harvested, by food.
 */
export function cultureCheck(state: GameState, room: FoodRoomState, kind: CultureKind, at: number): number {
  if (isHeld(state, 'food')) return 0;
  const spec = SPEC[kind];
  const list = kind === 'cone' ? room.cones : room.jars;
  let harvested = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c.startedHour !== null && at >= c.startedHour + spec.hours - 1e-9) {
      if (stock(state, spec.food) + spec.yield > storeCap(room, spec.food)) continue; // "Full": waits for room
      state.inventory.foods[spec.food] = (state.inventory.foods[spec.food] ?? 0) + spec.yield;
      const t = today(state, at);
      t.made[spec.food] = (t.made[spec.food] ?? 0) + spec.yield;
      c.startedHour = null;
      harvested += spec.yield;
      if (!state.isShowcase) emitEvent(state, { kind: 'info', text: `${kind === 'cone' ? 'Cone' : 'Jar'} ${i + 1} harvested · ${spec.yield} servings of ${getFoodDef(spec.food)?.name ?? spec.food}` }, at);
    }
    if (c.startedHour === null) tryStart(state, room, kind, i, at);
  }
  return harvested;
}

// ───────────────────────────── dosers ─────────────────────────────

/** The working live-food doser on a tank (on, not failed). */
export function doserOf(tank: Tank): EquipmentInstance | null {
  for (const e of tank.equipment ?? []) if (getEquipmentDef(e.defId)?.kind === 'doser' && e.on && !e.failed) return e;
  return null;
}

export const hasDoser = (tank: Tank): boolean => (tank.equipment ?? []).some((e) => getEquipmentDef(e.defId)?.kind === 'doser');

const LIVE_TAGS: Record<string, string> = { baby_brine: BRINE, infusoria: INFUSORIA };

/** The young a doser would feed now: free-swimming clutches whose stage eats baby brine or infusoria, with the foods. */
export function doserNeeds(state: GameState, tank: Tank, hour = state.clock.hour): { clutch: Clutch; foods: string[]; servings: number }[] {
  const out: { clutch: Clutch; foods: string[]; servings: number }[] = [];
  for (const cl of Object.values(state.clutches)) {
    if (cl.tankId !== tank.id || cl.count <= 0 || cl.stage === 'eggs' || cl.stage === 'in_pouch') continue;
    const sp = findSpecies(cl.speciesId);
    if (!sp) continue;
    const ph = currentPhase(cl, moduleFor(sp));
    if (!ph) continue;
    // still on its yolk: nothing to feed yet (the clutch's own yolk window, src/sim/life/breeding/clutch.ts)
    const yolkEnd = (cl.stageSinceHour ?? cl.laidHour) + moduleFor(sp).plan.yolkFrac * sp.breeding.fryRearingHours;
    if (ph === moduleFor(sp).plan.phases[0] && hour < yolkEnd) continue;
    const foods = ph.foods.map((t) => LIVE_TAGS[t]).filter((f): f is string => !!f);
    if (!foods.length) continue;
    out.push({ clutch: cl, foods, servings: Math.max(1, Math.ceil(cl.count / DOSER.youngPerServing)) });
  }
  return out;
}

/**
 * One dose time on a tank: each clutch gets the first of its stage's live foods in stock. Returns what happened, or
 * null when there was nothing to do (no doser, held, already dosed at this time).
 */
export function doseTank(state: GameState, tank: Tank, at: number): 'fed' | 'idle' | 'short' | null {
  if (!doserOf(tank) || isHeld(state, 'food')) return null;
  const lab = ensureLab(tank);
  if (lab.lastDoseHour !== undefined && at - lab.lastDoseHour < 1) return null;
  lab.lastDoseHour = at;
  const needs = doserNeeds(state, tank, at);
  if (!needs.length) return 'idle';
  const plan = new Map<string, number>();
  let short = false;
  for (const n of needs) {
    const pick = n.foods.find((f) => stock(state, f) - (plan.get(f) ?? 0) >= 1);
    if (!pick) {
      short = true;
      continue;
    }
    plan.set(pick, (plan.get(pick) ?? 0) + Math.min(n.servings, stock(state, pick) - (plan.get(pick) ?? 0)));
  }
  for (const [foodId, servings] of plan) asStaff(state, () => feedTank(state, tank.id, foodId, { servings, byStaff: true }));
  return short ? 'short' : 'fed';
}
