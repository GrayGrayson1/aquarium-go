/**
 * Water chemistry & life-support simulation — public API. OWNER: lane "waterlab".
 *
 * Implementation lives in ./step (stepper), ./report (reports & comfort), ./food (food pool), ./kits (equipment kits,
 * costs, tuning), ./env (equipment/habitat aggregation), ./chem (pure chemistry) and ./constants (calibration).
 *
 * Integration notes for other lanes:
 * - LIFE lane: call `addWaste(tank, creatureWasteUnits(species, creature, dtHours))` for every animal each step, eat with
 *   `consumeFood(tank, species.foods, units, creature.id)`, and read `speciesWaterComfort(species, tank)` for
 *   comfort/stress/health (`harm` is a 0..1 damage-rate). `tank.water.shock` flags a recent mismatched water change.
 *   Grazers may call `grazeAlgae(tank, points)`; pod-eaters `consumePods(tank, fraction)`.
 * - FOOD UNITS: 1 unit relieves 1 hunger point of a bioload-1 animal; an animal needs `effectiveBioload()` units per
 *   hunger point.
 */
import type { GameState, Tank, WaterState, WaterClass, WaterReport, FoodTag, SpeciesDefinition, Creature } from '@/types';
import type { SimContext } from '../context';
import { CLASS_DEFAULTS, isMarineClass, ROOM_TEMP_C as ROOM } from './constants';
import { equilibriumPH } from './chem';
import { stepTankWaterImpl } from './step';
import { getWaterReportImpl, speciesWaterComfortImpl } from './report';
import { defaultEquipmentForImpl, tankDailyCostImpl } from './kits';
import { consumeFoodImpl, ensureLab } from './food';
import { effectiveBioload, computeTankEnv } from './env';

/** Initial water for a new tank of this class. `cycled` = pre-seeded biological filter. */
export function initialWater(waterClass: WaterClass, cycled: boolean): WaterState {
  const d = CLASS_DEFAULTS[waterClass] ?? CLASS_DEFAULTS.freshwater_tropical;
  const marine = isMarineClass(waterClass);
  const salty = marine || waterClass === 'brackish';
  // lane:brackish — brackish chemistry is blended by salinity, matching the water step.
  const saltFrac = waterClass === 'brackish' ? Math.max(0, Math.min(1, (d.source.sg - 1) / 0.025)) : undefined;
  const co2 = marine ? 0.5 : saltFrac !== undefined ? 0.6 - 0.15 * saltFrac : 0.8;
  const organic = marine ? 0.2 : saltFrac !== undefined ? 3 - 2.8 * saltFrac : waterClass === 'freshwater_planted' ? 4.5 : 3;
  const pH = Math.round((equilibriumPH(d.source.kh, co2 + organic, marine, saltFrac) - (waterClass === 'freshwater_planted' ? 0.15 : 0)) * 100) / 100;
  const liveRock = waterClass === 'marine_live_rock' || waterClass === 'reef';
  return {
    tempC: d.startTempC,
    pH,
    ammonia: 0,
    nitrite: 0,
    nitrate: cycled ? 5 : d.source.nitrate,
    oxygen: 0.92,
    salinitySG: salty ? d.source.sg : 1.0,
    gh: marine ? 0 : d.source.gh,
    kh: d.source.kh,
    detritus: cycled ? 3 : 0,
    algae: cycled ? 2 : 0,
    clarity: 1,
    bioMaturity: cycled ? 0.88 : 0.02,
    foodInWater: 0,
    foodByTag: {},
    level: 1,
    lab: {
      foodAgeH: 0,
      foodWaste: 0.1,
      colony: cycled ? 0.6 : 0.3,
      wasteRate: 0,
      pendingWaste: 0,
      swing: 0,
      fertilizer: waterClass === 'freshwater_planted' ? 0.3 : 0,
      reefElements: marine ? 0.8 : 0,
      pods: cycled ? (liveRock ? 0.35 : waterClass === 'freshwater_planted' ? 0.15 : 0.03) : 0.01,
      co2,
    },
  };
}

/** Advance equipment effects + nitrogen cycle + temperature/salinity drift for one tank. */
export function stepTankWater(state: GameState, tank: Tank, dt: number, ctx: SimContext): void {
  stepTankWaterImpl(state, tank, dt, ctx);
}

/**
 * Add animal waste to the tank. 1 unit = one hour of waste from a bioload-1 animal (≈ 0.25 mg ammonia-N).
 * Called by the life lane each step — see `creatureWasteUnits`. The water step converts queued waste into ammonia
 * (spread over its substeps) and adapts the filter bacteria to the load.
 */
export function addWaste(tank: Tank, units: number): void {
  if (!(units > 0) || !Number.isFinite(units)) return;
  const lab = ensureLab(tank);
  lab.pendingWaste = (lab.pendingWaste ?? 0) + units;
}

/** Waste units an animal produces over `dtHours` (well-fed animals make more waste than starving ones). */
export function creatureWasteUnits(species: SpeciesDefinition, creature: Pick<Creature, 'sizeCm' | 'stats'>, dtHours: number): number {
  const hunger = creature.stats?.hunger ?? 40;
  const fed = 0.55 + 0.45 * (1 - Math.min(100, Math.max(0, hunger)) / 100);
  const heavy = species.special?.heavyWaste ? 1.2 : 1;
  return effectiveBioload(species, creature.sizeCm) * fed * heavy * Math.max(0, dtHours);
}

/**
 * Remove up to `amount` food of any of `tags` from the water column; returns how much was consumed.
 * The life lane uses this for species-appropriate feeding competition. Pass `creatureId` so a target-fed animal gets
 * its reserved portion (and others cannot steal it).
 */
export function consumeFood(tank: Tank, tags: FoodTag[], amount: number, creatureId?: string): number {
  return consumeFoodImpl(tank, tags, amount, creatureId);
}

/** Plain-language water report with GOOD / WATCH / DANGER statuses for the UI. */
export function getWaterReport(state: GameState, tankId: string): WaterReport {
  return getWaterReportImpl(state, tankId);
}

/** Default equipment definition ids for a brand-new tank of this tier + class. */
export function defaultEquipmentFor(tierId: string, waterClass: WaterClass): string[] {
  return defaultEquipmentForImpl(tierId, waterClass);
}

/** Daily running cost of a tank (equipment upkeep + base + salt etc.). */
export function tankDailyCost(state: GameState, tank: Tank): number {
  return tankDailyCostImpl(state, tank);
}

/**
 * How comfortable this species is in this tank's water right now (0..100) and why.
 * Used by the life lane for stress/health and by the UI for per-creature care hints.
 * `harm` is a 0..1 health-damage rate (1 = lethal quickly, e.g. a freshwater animal in salt water).
 */
export function speciesWaterComfort(species: SpeciesDefinition, tank: Tank): { comfort: number; harm: number; stressors: string[] } {
  return speciesWaterComfortImpl(species, tank);
}

/** Stocking load of a tank right now (0..>1; 1 = at capacity). */
export function stockingLoad(state: GameState, tank: Tank): number {
  return computeTankEnv(state, tank).stockingLoad;
}

/** Facility room temperature the tank drifts toward without heating/cooling (°C). */
export const ROOM_TEMP_C = ROOM;

export { comfortStatus, speciesSensitivity, waterClassDefaults } from './report';
export { availableFood, consumePods, grazeAlgae, tankPods, foodDemandUnits, recommendedServings, eatersOf } from './food';
export { effectiveBioload, equipmentSummary, flowInfo, expectedTempC, computeTankEnv, roomTempAt, FLOW_LEVELS, FLOW_LABEL } from './env';
export type { EquipmentSummary, TankEnv } from './env';
export { freeAmmoniaFraction, ammoniaToxicityWeight, oxygenSaturation } from './chem';
export { CLASS_DEFAULTS, WASTE_TAN_MG_PER_UNIT, SALT_KG_PER_LITRE } from './constants';
export { tuneTankForSpecies } from './kits';
export { sanitizeWater } from './step';
