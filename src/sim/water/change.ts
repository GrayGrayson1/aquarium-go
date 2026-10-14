/**
 * The state-changing core of a partial water change and a glass scrape (0.5 §10.3, AUTO-008). OWNER: lane "waterlab".
 *
 * The player's `waterChange` and `cleanTank(…, 'glass')` (src/sim/care, which the keepers call too) and the Auto Water
 * Changer (./step.ts `runWaterChanger`) share these, so a device change is chemically the same as one by hand. What
 * belongs to the player's action stays in src/sim/care: refusing to change salt water with no salt, the message, and
 * the quest, mastery and achievement counters (`bumpCounter`). Both set `lastMaintenanceHour` (the tank was
 * maintained either way) and both keep the sudden-change check, which is real chemistry.
 */
import type { GameState, Tank } from '@/types';
import { emitEvent } from '../context';
import { CLASS_DEFAULTS, LITRES_PER_GALLON, ROOM_TEMP_C, isSaltClass, saltKgFor } from './constants';
import { safeGallons } from './env';
import { ensureLab, scaleFood } from './food';
import { idealBand } from '../care/tuning';

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** The share of the water a change may swap (a player's 5–90 %; the device's setting is held to the same range). */
export const clampChangeFraction = (fraction: number, fallback = 0.25): number => clamp(Number.isFinite(fraction) ? fraction : fallback, 0.05, 0.9);

/** Gallons of new water a change of `fraction` takes (it also refills what evaporated). */
export function changeGallons(tank: Tank, fraction: number): number {
  const f = clamp(fraction, 0.05, 0.9);
  return safeGallons(tank) * (1 - tank.water.level * (1 - f));
}

/** Salt mix (kg) to change `fraction` of a salt tank's water at its residents' ideal salinity; 0 in fresh water. */
export function changeSaltNeed(state: GameState, tank: Tank, fraction: number): number {
  if (!isSaltClass(tank.waterClass)) return 0;
  const f = clamp(fraction, 0.05, 0.9);
  const litresFull = safeGallons(tank) * LITRES_PER_GALLON;
  const added = litresFull - litresFull * tank.water.level * (1 - f);
  return saltKgFor(added, idealBand(state, tank, 'salinitySG').mid);
}

export interface WaterChangeOutcome {
  fraction: number;
  before: { temp: number; pH: number; sg: number; nitrate: number; ammonia: number };
  /** Salt mix used (kg), and whether there was less than the change needed (the new water was weaker). */
  saltUsed: number;
  saltShort: boolean;
  /** Why the change stressed the animals (shifted temperature, pH or salinity), or null when it didn't. */
  shock: string | null;
}

/**
 * Swap `fraction` (0.05–0.9) of the water for new water. Salt tanks take what salt there is (up to the need) from
 * stock, unless the new water comes premixed (`premixedSG`, the Water room's reserves: lane:automation, chunk 5), which
 * uses no salt from the shelf. The new water is roughly temperature-matched unless `matchTemperature === false` (tap
 * water at room temperature) or `newWaterTempC` is given. A sudden shift stresses the animals: `water.shock`, and a
 * warning event.
 */
export function applyWaterChange(state: GameState, tank: Tank, fraction: number, opts: { hour: number; matchTemperature?: boolean; newWaterTempC?: number; premixedSG?: number }): WaterChangeOutcome {
  const w = tank.water;
  const f = clampChangeFraction(fraction);
  const d = CLASS_DEFAULTS[tank.waterClass];
  const salty = isSaltClass(tank.waterClass);
  const litresFull = safeGallons(tank) * LITRES_PER_GALLON;
  const current = litresFull * w.level;
  const remaining = current * (1 - f);
  const added = litresFull - remaining;
  const kr = remaining / litresFull;
  const ka = added / litresFull;
  const hour = opts.hour;

  // New water chemistry
  let newSG = 1;
  let saltUsed = 0;
  let saltShort = false;
  if (salty && opts.premixedSG !== undefined) {
    newSG = Math.max(1, opts.premixedSG);
  } else if (salty) {
    const target = idealBand(state, tank, 'salinitySG').mid;
    const need = saltKgFor(added, target);
    const have = Math.max(0, state.inventory.salt);
    saltUsed = Math.min(have, need);
    saltShort = saltUsed < need - 1e-6;
    newSG = 1 + (target - 1) * (need > 0 ? saltUsed / need : 1);
    state.inventory.salt = Math.round((have - saltUsed) * 1000) / 1000;
  }
  const src = d.source;
  const newTemp = opts.newWaterTempC ?? (opts.matchTemperature === false ? ROOM_TEMP_C : w.tempC + (ROOM_TEMP_C - w.tempC) * 0.15);
  const before = { temp: w.tempC, pH: w.pH, sg: w.salinitySG, nitrate: w.nitrate, ammonia: w.ammonia };

  w.ammonia = w.ammonia * kr;
  w.nitrite = w.nitrite * kr;
  w.nitrate = w.nitrate * kr + src.nitrate * ka;
  const lab = ensureLab(tank);
  if (lab.boundAmmonia !== undefined) lab.boundAmmonia *= kr; // lane:fix-water — conditioner-bound share goes out with the old water too
  if (lab.boundNitrite !== undefined) lab.boundNitrite *= kr;
  w.kh = w.kh * kr + src.kh * ka;
  if (!salty || tank.waterClass === 'brackish') w.gh = w.gh * kr + src.gh * ka;
  w.pH = w.pH * kr + src.pH * ka;
  w.tempC = w.tempC * kr + newTemp * ka;
  w.salinitySG = salty ? 1 + (w.salinitySG - 1) * kr + (newSG - 1) * ka : 1;
  w.oxygen = clamp(w.oxygen * kr + 0.95 * ka, 0, 1);
  w.level = 1;
  scaleFood(tank, 1 - f * 0.6);
  w.detritus = clamp(w.detritus * (1 - f * 0.35), 0, 100);
  w.clarity = clamp(w.clarity + f * 0.3, 0, 1);
  if (salty) lab.reefElements = clamp((lab.reefElements ?? 0.8) * kr + 0.85 * ka, 0, 1);
  lab.co2 = (lab.co2 ?? 1) * kr + (salty ? 0.45 : 0.6) * ka;
  tank.lastMaintenanceHour = hour;

  // Sudden-change stress
  const dT = Math.abs(w.tempC - before.temp);
  const dPH = Math.abs(w.pH - before.pH);
  const dSG = Math.abs(w.salinitySG - before.sg);
  // lane:fix-water — the reason names whichever shift actually caused the shock (a 1.5 °C or 0.3 pH shift used to
  // fall through to "salinity jumped by 0.000" in freshwater tanks); salinity only counts in salt water.
  const shifts = [
    { v: (dT - 1) / 4, why: `the new water shifted the temperature by ${dT.toFixed(1)} °C` },
    { v: (dPH - 0.2) / 0.8, why: `pH jumped by ${dPH.toFixed(1)}` },
    { v: salty ? (dSG - 0.0015) / 0.006 : 0, why: `salinity jumped by ${dSG.toFixed(3)}` },
  ];
  const worst = shifts.reduce((a, b) => (b.v > a.v ? b : a));
  const severity = clamp(worst.v, 0, 1);
  let shock: string | null = null;
  if (severity > 0.1) {
    shock = worst.why;
    w.shock = { hour, untilHour: hour + 4 + severity * 8, severity, reason: shock };
    lab.swing = clamp((lab.swing ?? 0) + severity * 0.5, 0, 1);
    if (!state.isShowcase) emitEvent(state, { kind: 'warning', text: `${tank.name}: ${shock} during the water change — the animals are stressed.`, tankId: tank.id, toast: true });
  }
  return { fraction: f, before, saltUsed, saltShort, shock };
}

/** Scrape algae off the front glass. Returns the algae cover before the scrape (%). */
export function scrapeGlass(tank: Tank): number {
  const w = tank.water;
  const before = w.algae;
  w.algae = clamp(w.algae * 0.45, 0, 100);
  w.clarity = clamp(w.clarity + 0.04, 0, 1);
  return before;
}
