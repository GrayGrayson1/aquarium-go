/**
 * The Water room's jobs (DESIGN-S3D §9.2; AUTO-032, AUTO-037). OWNER: lane "automation" (chunk 5).
 *
 * - Prep: the prep station adds fresh water to the fresh reserve (./reserve.ts `flowTo`), continuously.
 * - Salt mixing: at 10 AM and 10 PM, while salt water is below 60 % of its reserve, the mixing tank is empty and there
 *   are a batch's salt mix and fresh water, a batch starts: it takes both at the start and is ready 12 h later. A ready
 *   batch tops the salt reserve up; what doesn't fit waits in the mixing tank and refills the reserve as it's used
 *   (held: it waits). Salt is used once, here.
 * - Water changes: at each tank's lights-on, every Auto Water Changer takes its change from the reserves, tank by tank
 *   in `tankOrder`, after settling the tank's owed time (ADR-0026 decision 5). Salt tanks blend salt and fresh water to
 *   their target salinity (INTAKE C-17). A change that can't get all its water is skipped, not done weak; later tanks
 *   that fit still get theirs. Without a Water room the device runs inside the tank step as before (AUTO-009, AUTO-010).
 * - The salt machinery applies only while a salt tank's changer or a hatchery uses salt water (ADR-0026 decision 12).
 * The player's own changes and the keepers' top-offs and changes stay on tap water and shelf salt (INTAKE C-67).
 */
import type { GameState, Tank, WaterRoomState } from '@/types';
import { RESERVE_SG, WATER_ROOM } from '@/data/catalog/machines';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { applyWaterChange, changeGallons, clampChangeFraction, scrapeGlass } from '../water/change';
import { LITRES_PER_GALLON, SALT_KG_PER_LITRE, isSaltClass } from '../water/constants';
import { ensureLab } from '../water/food';
import { idealBand } from '../care/tuning';
import { AUTO_CHANGE_GAP_H, AUTO_SCRAPE_GAP_H } from '../water/step';
import { emitEvent } from '../context';
import { formatClock } from '../time';
import { isHeld } from './hold';
import { batchGal, dayWater, freshCap, saltCap } from './reserve';

const round3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Salt mix (kg) a batch of `gal` gallons takes at the reserve's salinity, rounded up to the next 0.1 kg: a 30 gal batch
 * takes exactly 4.1 kg (30 × 3.785 L × 0.036 kg/L = 4.09), so 4.1 kg in stock is one batch (DESIGN-S3D §9.2).
 */
export function batchSaltKg(gal: number): number {
  return Math.ceil(gal * LITRES_PER_GALLON * SALT_KG_PER_LITRE * ((RESERVE_SG - 1) / 0.025) * 10 - 1e-6) / 10;
}

/** Salt mix (kg) per gallon of salt water, for daily-use estimates. */
export const SALT_KG_PER_GAL = LITRES_PER_GALLON * SALT_KG_PER_LITRE * ((RESERVE_SG - 1) / 0.025);

/** The Water room, when there is one. */
export const waterRoom = (state: GameState): WaterRoomState | null => state.facility.water ?? null;

/** Install the base Water room (Central Water Supply, ADR-0026 decision 8): reserves start full of fresh water. */
export function installWaterRoom(state: GameState, hour = state.clock.hour): WaterRoomState {
  if (state.facility.water) return state.facility.water;
  const room: WaterRoomState = { fresh: WATER_ROOM.freshCap, salt: 0, prepLevel: 0, reservoirs: 0, mix: null, flowHour: hour };
  state.facility.water = room;
  return room;
}

/** The working Auto Water Changer on a tank (on and not failed), with its share. */
export function changerOf(tank: Tank): { fraction: number } | null {
  for (const e of tank.equipment ?? []) {
    const def = getEquipmentDef(e.defId);
    if (def?.kind !== 'water_changer' || !e.on || e.failed) continue;
    return { fraction: clampChangeFraction(Number.isFinite(e.setting) ? (e.setting as number) : def.stats.defaultSetting ?? 0.1, 0.1) };
  }
  return null;
}

/** The share of a tank's new water that comes from the salt reserve (its target salinity over the reserve's). */
export function saltShare(state: GameState, tank: Tank): number {
  if (!isSaltClass(tank.waterClass)) return 0;
  return clamp01((idealBand(state, tank, 'salinitySG').mid - 1) / (RESERVE_SG - 1));
}

/** One tank's daily change: fresh and salt-reserve gallons (what its Auto Water Changer takes each lights-on). */
export function tankChangeNeed(state: GameState, tank: Tank): { fresh: number; salt: number } | null {
  const dev = changerOf(tank);
  if (!dev) return null;
  const gal = changeGallons(tank, dev.fraction);
  const s = gal * saltShare(state, tank);
  return { fresh: gal - s, salt: s };
}

/** Salt water used a day (gallons): the salt tanks' changes and the hatchery cones' restarts. */
export function saltWaterPerDay(state: GameState): number {
  let gal = 0;
  for (const id of state.tankOrder) {
    const t = state.tanks[id];
    if (t) gal += tankChangeNeed(state, t)?.salt ?? 0;
  }
  const cones = state.facility.food?.cones.length ?? 0;
  return gal + cones * 0.5;
}

/**
 * Days until a salt tank's change would be skipped (DESIGN-S3D §9.6): the salt water in the reserve and the mixing tank,
 * plus the whole batches the salt mix in stock still makes, over the day's salt-water use. Infinity when none is used.
 */
export function saltDaysLeft(state: GameState): number {
  const room = state.facility.water;
  const galDay = saltWaterPerDay(state);
  if (!room || galDay <= 1e-6) return Infinity;
  const gal = batchGal(room);
  const batches = Math.floor((Math.max(0, state.inventory.salt) + 1e-6) / batchSaltKg(gal));
  return (room.salt + (room.mix?.gal ?? 0) + batches * gal) / galDay;
}

/** Does anything use salt water? Only then do the mixer, the salt meters and the salt items apply (ADR-0026 d12). */
export function saltWaterNeeded(state: GameState): boolean {
  return saltWaterPerDay(state) > 1e-6;
}

/** A ready batch tops the salt reserve up (not while salt mixing is held: it waits in the mixing tank, INTAKE C-18). */
export function topUp(state: GameState, room: WaterRoomState, hour: number): void {
  const mix = room.mix;
  if (!mix || hour < mix.readyHour - 1e-9 || isHeld(state, 'salt')) return;
  const move = Math.min(mix.gal, Math.max(0, saltCap(room) - room.salt));
  room.salt = round3(room.salt + move);
  mix.gal = round3(mix.gal - move);
  if (mix.gal <= 1e-6) room.mix = null;
}

/** Salt water ready to use: the reserve plus a ready batch waiting in the mixing tank. */
export function saltWaterReady(state: GameState, room: WaterRoomState, hour = state.clock.hour): number {
  const mix = room.mix;
  return room.salt + (mix && hour >= mix.readyHour - 1e-9 && !isHeld(state, 'salt') ? mix.gal : 0);
}

/** Draw salt water (hatchery restarts): all of it or nothing. */
export function drawSalt(state: GameState, room: WaterRoomState, gal: number, hour: number): boolean {
  topUp(state, room, hour);
  if (room.salt + 1e-9 < gal) return false;
  room.salt = round3(room.salt - gal);
  topUp(state, room, hour);
  return true;
}

/** The 10 AM / 10 PM check: start a batch when it's due and there's what it takes. */
export function mixCheck(state: GameState, room: WaterRoomState, at: number): void {
  if (room.lastMixHour !== undefined && at <= room.lastMixHour + 1e-9) return;
  room.lastMixHour = at;
  if (isHeld(state, 'salt') || !saltWaterNeeded(state)) return;
  topUp(state, room, at);
  if (room.mix && room.mix.gal > 1e-6) return; // the mixing tank isn't empty
  if (room.salt >= saltCap(room) * WATER_ROOM.mixBelow - 1e-9) return;
  const gal = batchGal(room);
  const kg = batchSaltKg(gal);
  if (state.inventory.salt + 1e-6 < kg || room.fresh + 1e-9 < gal) return; // waits: the shortage shows in Problems
  room.fresh = round3(room.fresh - gal);
  state.inventory.salt = Math.round((state.inventory.salt - kg) * 1000) / 1000;
  room.mix = { gal, readyHour: at + WATER_ROOM.mixHoursLong };
  const w = dayWater(state, at);
  w.mixer = round3(w.mixer + gal);
  if (!state.isShowcase) emitEvent(state, { kind: 'info', text: `Salt mixing · ${Math.floor(gal)} gal batch · used ${kg.toFixed(1)} kg · ready ${formatClock(at + WATER_ROOM.mixHoursLong)}` }, at);
}

/**
 * One tank's Auto Water Changer run at lights-on, from the reserves. Returns the gallons it took, 0 when it was
 * skipped for want of water, null when it had nothing to do (no device, held, or it already ran today).
 */
export function reserveChange(state: GameState, room: WaterRoomState, tank: Tank, at: number): number | null {
  const dev = changerOf(tank);
  if (!dev || isHeld(state, 'water')) return null;
  const lab = ensureLab(tank);
  const maintained = tank.lastMaintenanceHour;
  let took: number | null = null;
  if (lab.lastAutoChangeHour === undefined || at - lab.lastAutoChangeHour >= AUTO_CHANGE_GAP_H) {
    const gal = changeGallons(tank, dev.fraction);
    const share = saltShare(state, tank);
    const needSalt = gal * share;
    const needFresh = gal - needSalt;
    topUp(state, room, at);
    const w = dayWater(state, at);
    if (room.salt + 1e-9 < needSalt || room.fresh + 1e-9 < needFresh) {
      w.skipped += 1; // skipped, not done weak; retried at the next lights-on
      took = 0;
    } else {
      room.salt = round3(room.salt - needSalt);
      room.fresh = round3(room.fresh - needFresh);
      applyWaterChange(state, tank, dev.fraction, { hour: at, matchTemperature: true, ...(share > 0 ? { premixedSG: 1 + (RESERVE_SG - 1) * share } : {}) });
      lab.lastAutoChangeHour = at;
      topUp(state, room, at);
      w.fresh = round3(w.fresh + needFresh);
      w.salt = round3(w.salt + needSalt);
      w.changes += 1;
      took = gal;
    }
  }
  if (lab.lastAutoScrapeHour === undefined || at - lab.lastAutoScrapeHour >= AUTO_SCRAPE_GAP_H) {
    scrapeGlass(tank);
    lab.lastAutoScrapeHour = at;
    tank.lastMaintenanceHour = at;
  }
  if (Number.isFinite(maintained) && maintained > tank.lastMaintenanceHour) tank.lastMaintenanceHour = maintained;
  return took;
}

/** One summary line per morning's changes (INTAKE C-66): quiet (not toasted, not news). */
export function changesSummary(state: GameState, at: number, n: number, gal: number, skipped: number): void {
  if (state.isShowcase || (n === 0 && skipped === 0)) return;
  const when = ((at % 24) + 24) % 24 < 12 ? 'Morning water changes' : 'Water changes';
  const parts = [`${when} · ${n} tank${n === 1 ? '' : 's'} · ${round1(gal)} gal`];
  if (skipped) parts.push(`${skipped} skipped`);
  emitEvent(state, { kind: 'info', text: parts.join(' · ') }, at);
}

/** "49.4", "12" (no locale formatting in the sim). */
const round1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');

/** Is the fresh reserve's level known to be at its cap (nothing left to prep)? */
export const freshFull = (room: WaterRoomState): boolean => room.fresh >= freshCap(room) - 1e-6;
