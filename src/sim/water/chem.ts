/**
 * Pure chemistry helpers (no state). OWNER: lane "waterlab".
 */

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const finite = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
export const smoothstep = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/**
 * Fraction of total ammonia present as toxic un-ionised NH₃ (Emerson et al. 1975):
 * pKa = 0.09018 + 2729.92 / T(K). At pH 7.0 / 25 °C ≈ 0.6 %; at pH 8.2 ≈ 8 % — about 14× more toxic.
 */
export function freeAmmoniaFraction(pH: number, tempC: number): number {
  const pKa = 0.09018 + 2729.92 / (tempC + 273.15);
  return 1 / (1 + Math.pow(10, pKa - pH));
}

/** Reference free-NH₃ fraction (pH 7.5, 25 °C) used to weight ammonia toxicity for status thresholds. */
export const FREE_NH3_REF = freeAmmoniaFraction(7.5, 25);

/**
 * Toxicity weight for total ammonia at this pH/temperature: 1 at pH 7.5 / 25 °C, ~4 at reef pH, ~0.5 in soft acidic water.
 * Floor 0.35 so acidic water never makes ammonia look harmless.
 */
export function ammoniaToxicityWeight(pH: number, tempC: number): number {
  return clamp(freeAmmoniaFraction(pH, tempC) / FREE_NH3_REF, 0.35, 5);
}

/** Dissolved-oxygen saturation (mg/L) at temperature and salinity (fresh ~8.3 mg/L at 25 °C; seawater ~20 % lower). */
export function oxygenSaturation(tempC: number, sg: number): number {
  const t = clamp(tempC, 0, 40);
  const fresh = 14.62 - 0.3898 * t + 0.006969 * t * t - 0.00005897 * t * t * t;
  const saltFactor = 1 - clamp((sg - 1) * 8, 0, 0.3);
  return Math.max(3, fresh * saltFactor);
}

/** Oxygen is stored as a fraction of saturation at 20 °C (same salinity), so warm water tops out below 1. */
export const oxygenRef = (sg: number) => oxygenSaturation(20, sg);

/** Metabolic Q10-ish multiplier (≈ doubles every 10 °C). */
export const q10 = (tempC: number, base = 25, factor = 2) => Math.pow(factor, (tempC - base) / 10);

/**
 * lane:w2-sim — nitrifying-bacteria activity vs a 25 °C colony (game abstraction of real biofilter behaviour).
 * A colony that has lived at a temperature for days adapts to it: acclimated cool-water filters run at roughly
 * 80% of a tropical filter's rate at 16 °C (cold-water biofilter design rates), not the ~60% a sudden chill gives.
 * A sudden change away from the acclimated temperature still slows (or speeds) the bacteria straight away.
 */
export function nitrifierTempFactor(tempC: number, acclimatedC?: number): number {
  const acc = Number.isFinite(acclimatedC) ? (acclimatedC as number) : tempC;
  return clamp(q10(acc, 25, 1.3) * q10(tempC, acc, 1.8), 0.35, 1.25);
}

/** lane:w2-sim — hours for the filter colony to acclimate to a new water temperature (time constant). */
export const BIO_ACCLIMATION_H = 48;

/**
 * Equilibrium pH from carbonate hardness and dissolved CO₂: pH ≈ 7.48 + log10(KH / CO₂) (the classic hobby
 * KH/pH/CO₂ table). Seawater's carbonate system sits ~0.35 lower for the same numbers.
 */
export function equilibriumPH(kh: number, co2MgL: number, marine: boolean, saltFrac?: number): number {
  const k = Math.max(0.12, kh);
  const c = Math.max(0.15, co2MgL);
  // lane:brackish — optional salinity blend (0 = fresh, 1 = full sea water) for brackish tanks.
  const base = saltFrac !== undefined && Number.isFinite(saltFrac) ? 7.477 - 0.347 * Math.max(0, Math.min(1, saltFrac)) : marine ? 7.13 : 7.477;
  return base + Math.log10(k / c);
}

/** Nitrate status thresholds [good below, watch below] by context. */
export function nitrateThresholds(opts: { marine: boolean; reef: boolean; strict: boolean }): [number, number] {
  if (opts.reef) return opts.strict ? [10, 20] : [10, 25];
  if (opts.marine) return opts.strict ? [15, 30] : [25, 50];
  // lane:w2-sim — sensitive freshwater animals (axolotls, discus): under 20 ppm is the usual care-sheet target and
  // chronic harm starts in the 35–40s. The old 10 ppm line flagged a well-kept axolotl pair between routine changes.
  return opts.strict ? [20, 35] : [20, 40];
}

export function fmt(v: number, digits: number): string {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}
