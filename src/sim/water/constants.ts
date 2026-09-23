/**
 * Physical constants, calibration and per-water-class defaults for the water sim. OWNER: lane "waterlab".
 *
 * Calibration notes (game abstraction of real aquarium chemistry):
 * - 1 waste unit = the hourly waste of a bioload-1 animal (≈ a 5 cm community fish) ≈ 0.25 mg ammonia-N.
 * - Concentrations are mass / litres (ppm = mg/L), so the same waste moves a 10-gallon tank ten times further than a
 *   100-gallon one — the core "bigger water is more stable" lesson.
 * - Ammonia is reported as total ammonia (TAN), nitrite as NO₂ and nitrate as NO₃ (like hobby test kits), so 1 mg of
 *   nitrogen becomes 3.29 mg nitrite then 4.43 mg nitrate.
 * - A bare filter cycles in ~3–4 game days with an ammonia source (compressed; bottled bacteria is faster).
 */
import type { ParamRange, WaterClass } from '@/types';

/** Facility room temperature the tank drifts toward without heating/cooling (°C). */
export const ROOM_TEMP_C = 22;

export const WASTE_TAN_MG_PER_UNIT = 0.25;
export const N_TO_NO2 = 46 / 14; // 3.29
export const NO2_TO_NO3 = 62 / 46; // 1.35
export const N_TO_NO3 = 62 / 14; // 4.43
export const LITRES_PER_GALLON = 3.785;
/** Largest internal substep (game hours). */
export const MAX_WATER_SUBSTEP_H = 0.25;
/** dKH consumed per ppm of ammonia-N nitrified (7.14 mg CaCO₃ per mg N; 1 dKH = 17.86 mg/L CaCO₃). */
export const KH_PER_PPM_N = 0.4;
/** Marine salt mix needed per litre for SG 1.025 (kg). */
export const SALT_KG_PER_LITRE = 0.036;
/** Price per kg used for the daily-cost estimate of marine salt (bought by the economy lane). */
export const SALT_PRICE_PER_KG = 3;

export interface ClassDefaults {
  label: string;
  temp: ParamRange;
  pH: ParamRange;
  sg: ParamRange | null;
  kh: { min: number; max: number };
  gh: { min: number; max: number } | null;
  /** Chemistry of the new water the keeper prepares for water changes. */
  source: { pH: number; kh: number; gh: number; sg: number; nitrate: number };
  startTempC: number;
}

const FW_SOURCE = { pH: 7.4, kh: 5, gh: 8, sg: 1.0, nitrate: 2 };
const MARINE_SOURCE = { pH: 8.2, kh: 8.5, gh: 0, sg: 1.025, nitrate: 0 };

export const CLASS_DEFAULTS: Record<WaterClass, ClassDefaults> = {
  freshwater_cool: {
    label: 'cool freshwater tank',
    temp: { min: 12, max: 23, idealMin: 15, idealMax: 20 },
    pH: { min: 6.5, max: 8.2, idealMin: 7.0, idealMax: 7.8 },
    sg: null,
    kh: { min: 3, max: 10 },
    gh: { min: 5, max: 16 },
    source: { pH: 7.5, kh: 4.5, gh: 9, sg: 1.0, nitrate: 2 },
    startTempC: 17,
  },
  freshwater_tropical: {
    label: 'tropical freshwater tank',
    temp: { min: 21, max: 30, idealMin: 24, idealMax: 27.5 },
    pH: { min: 6.0, max: 8.2, idealMin: 6.5, idealMax: 7.8 },
    sg: null,
    kh: { min: 2, max: 12 },
    gh: { min: 3, max: 16 },
    source: FW_SOURCE,
    startTempC: 25.5,
  },
  freshwater_planted: {
    label: 'planted tropical tank',
    temp: { min: 21, max: 30, idealMin: 23.5, idealMax: 27.5 },
    pH: { min: 5.8, max: 8.0, idealMin: 6.3, idealMax: 7.5 },
    sg: null,
    kh: { min: 1, max: 10 },
    gh: { min: 3, max: 14 },
    source: { pH: 7.2, kh: 3.5, gh: 6, sg: 1.0, nitrate: 2 },
    startTempC: 25.5,
  },
  marine_fowlr: {
    label: 'fish-only marine tank',
    temp: { min: 22, max: 29, idealMin: 24, idealMax: 27 },
    pH: { min: 7.8, max: 8.6, idealMin: 8.0, idealMax: 8.4 },
    sg: { min: 1.019, max: 1.028, idealMin: 1.022, idealMax: 1.026 },
    kh: { min: 6.5, max: 12 },
    gh: null,
    source: MARINE_SOURCE,
    startTempC: 25.5,
  },
  marine_live_rock: {
    label: 'marine live-rock tank',
    temp: { min: 22, max: 29, idealMin: 24, idealMax: 27 },
    pH: { min: 7.8, max: 8.6, idealMin: 8.0, idealMax: 8.4 },
    sg: { min: 1.019, max: 1.028, idealMin: 1.022, idealMax: 1.026 },
    kh: { min: 6.5, max: 12 },
    gh: null,
    source: MARINE_SOURCE,
    startTempC: 25.5,
  },
  reef: {
    label: 'reef tank',
    temp: { min: 23, max: 28, idealMin: 24.5, idealMax: 26.5 },
    pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
    sg: { min: 1.022, max: 1.027, idealMin: 1.024, idealMax: 1.026 },
    kh: { min: 7, max: 11 },
    gh: null,
    source: MARINE_SOURCE,
    startTempC: 25.5,
  },
  // lane:brackish — low-to-mid estuary water: SG 1.004–1.012 ideal, made with marine salt at ~1/6–1/2 sea strength.
  brackish: {
    label: 'brackish tank',
    temp: { min: 21, max: 30, idealMin: 24, idealMax: 28 },
    pH: { min: 7.2, max: 8.6, idealMin: 7.5, idealMax: 8.3 },
    sg: { min: 1.003, max: 1.018, idealMin: 1.004, idealMax: 1.012 },
    kh: { min: 6, max: 14 },
    gh: { min: 8, max: 20 },
    source: { pH: 8.0, kh: 10, gh: 12, sg: 1.008, nitrate: 1 },
    startTempC: 25.5,
  },
};

export const isSaltClass = (c: WaterClass) => c === 'reef' || c === 'brackish' || c.startsWith('marine');
export const isMarineClass = (c: WaterClass) => c === 'reef' || c.startsWith('marine');
/**
 * lane:brackish — fraction of full-strength sea-water salt this class's new water carries (1 = SG 1.025, brackish ≈ 0.3).
 * Salt costs and dosing scale with it: brackish water uses marine salt mix at a fraction of reef strength.
 */
export function saltStrength(c: WaterClass): number {
  const sg = CLASS_DEFAULTS[c]?.source.sg ?? 1;
  return Math.max(0, Math.min(1.2, (sg - 1) / 0.025));
}

/** Equipment wear per game-day while running (condition 1 → 0). */
export const WEAR_PER_DAY: Partial<Record<string, number>> = {
  filter: 0.006,
  heater: 0.004,
  chiller: 0.004,
  fan: 0.004,
  light: 0.002,
  airstone: 0.005,
  powerhead: 0.004,
  wavemaker: 0.003,
  skimmer: 0.004,
  ato: 0.003,
  co2: 0.003,
  autofeeder: 0.004,
  uv: 0.005,
  refugium: 0.002,
  lid: 0,
};
