/**
 * Age, life stage, growth curve and sex determination helpers. OWNER: lane "lifecycle".
 *
 * Compressed lifecycle (see species `lifecycle`, all in game-days):
 *   juvenile  : age < juvenileDays
 *   adult     : juvenileDays ≤ age < ELDER_FRACTION × lifespanDays
 *   elder     : after that
 * Growth follows a saturating curve that reaches ~95% of the individual's adult size by `adultDays`.
 */
import type { Creature, Genome, LifeStage, ReproRole, Sex, SpeciesDefinition } from '@/types';
import { HOURS_PER_DAY } from '../time';

export const ELDER_FRACTION = 0.8;

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : lo);

export function ageDaysOf(c: Pick<Creature, 'bornHour'>, nowHour: number): number {
  return Math.max(0, (nowHour - c.bornHour) / HOURS_PER_DAY);
}

export function lifeStageFor(species: SpeciesDefinition, ageDays: number): LifeStage {
  const lc = species.lifecycle;
  if (ageDays < lc.juvenileDays) return 'juvenile';
  if (ageDays >= lc.lifespanDays * ELDER_FRACTION) return 'elder';
  return 'adult';
}

/** Size potential → adult size multiplier (0.82..1.18; 50 → 1.0). */
export function sizePotentialFactor(potentialSize: number): number {
  return 0.82 + 0.36 * clamp(potentialSize, 0, 100) / 100;
}

/** This individual's genetic adult size (cm). */
export function adultSizeFor(species: SpeciesDefinition, genome: Genome): number {
  return species.adultSizeCm * sizePotentialFactor(genome.potentials?.size ?? 50);
}

/** Growth curve fraction 0..1 at an age. */
export function growthFraction(species: SpeciesDefinition, ageDays: number): number {
  const lc = species.lifecycle;
  const full = Math.max(1, lc.adultDays || lc.juvenileDays || 10);
  const k = 3 / full; // ~95% by adultDays
  return clamp(1 - Math.exp(-k * Math.max(0, ageDays)), 0, 1);
}

/** Expected size (cm) at an age for this genome, with ideal feeding. */
export function sizeAtAge(species: SpeciesDefinition, genome: Genome, ageDays: number): number {
  const hatch = Math.max(0.05, species.lifecycle.hatchSizeCm || species.adultSizeCm * 0.05);
  const adult = adultSizeFor(species, genome);
  return hatch + (Math.max(hatch, adult) - hatch) * growthFraction(species, ageDays);
}

/** Is sex visually determinable at this age. */
export function sexVisible(species: SpeciesDefinition, ageDays: number): boolean {
  if (species.sexSystem === 'not_applicable' || species.sexSystem === 'simultaneous_hermaphrodite') return false;
  return ageDays >= species.lifecycle.sexVisibleAtDays;
}

/** True sex at creation. Protandrous species start male (undifferentiated while young); protogynous start female. */
export function initialReproRole(species: SpeciesDefinition, requested: Sex | undefined, ageDays: number, coin: number): ReproRole {
  switch (species.sexSystem) {
    case 'protandrous':
      if (requested === 'female' && ageDays >= species.breeding.maturityDays) return 'female';
      return ageDays >= species.lifecycle.sexVisibleAtDays ? 'male' : 'undifferentiated';
    case 'protogynous':
      if (requested === 'male' && ageDays >= species.breeding.maturityDays) return 'male';
      return ageDays >= species.lifecycle.sexVisibleAtDays ? 'female' : 'undifferentiated';
    case 'simultaneous_hermaphrodite':
    case 'not_applicable':
      return 'undifferentiated';
    default:
      if (requested === 'male' || requested === 'female') return requested;
      return coin < 0.5 ? 'male' : 'female';
  }
}

/** Observable sex given true role + age. */
export function observableSex(species: SpeciesDefinition, role: ReproRole, ageDays: number): Sex {
  if (!sexVisible(species, ageDays)) return 'unknown';
  if (role === 'male') return 'male';
  if (role === 'female' || role === 'transitioning_female') return role === 'female' ? 'female' : 'male';
  return 'unknown';
}

/** Gallons this individual needs right now (scales with current size; adults need the species minimum). */
export function gallonsNeededNow(species: SpeciesDefinition, sizeCm: number): number {
  const frac = clamp(sizeCm / Math.max(0.1, species.adultSizeCm), 0.05, 1.3);
  return species.recommendedMinTankGallons * clamp(Math.pow(frac, 1.5), 0.15, 1);
}
