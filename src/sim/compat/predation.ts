/**
 * Shared predation maths. OWNER: lane "waterlab" (compat) — read by lane "lifecycle" (src/sim/life/step.ts).
 *
 * The compatibility preview states a weekly risk ("Pea puffers hunt dwarf shrimp (~90%/week)") and the life
 * simulation rolls against the very same per-day probability. Both sides use these helpers so the number the player
 * reads and what actually happens in the tank can't drift apart:
 *  - `preyReachCm`: the largest prey a predator can kill. Swallowers are limited by their mouth; animals that tear or
 *    crush prey (puffers' beaks, crayfish and mantis-shrimp claws/clubs, hermit crabs) can kill prey about their own
 *    length when their species data explicitly names it as prey.
 *  - `huntingDrive`: hunger scales the per-day risk. The compat probability is the rate at an ordinary between-meals
 *    hunger (TYPICAL_PREDATOR_HUNGER); a well-fed predator hunts less, a hungry one more, never zero.
 */
import type { SpeciesDefinition } from '@/types';

/** Hunger (0..100) at which the stated compat probability applies exactly (huntingDrive = 1). */
export const TYPICAL_PREDATOR_HUNGER = 50;

/** Multiplier on the per-day predation risk from the hungriest predator's hunger: 0.45 when full, 1 at 50, 1.55 starving. */
export function huntingDrive(hunger: number): number {
  const h = Number.isFinite(hunger) ? Math.max(0, Math.min(100, hunger)) : TYPICAL_PREDATOR_HUNGER;
  return 0.45 + 1.1 * (h / 100);
}

/** Predators that bite, tear or crush prey rather than swallowing it whole. */
export function tearsPrey(sp: SpeciesDefinition): boolean {
  return sp.group === 'puffer' || sp.category === 'invertebrate';
}

/**
 * Largest prey (cm, adult predator) this species can kill. `named` = the predator's species data explicitly lists the
 * prey (predatorTags / an exception rule), which lets tearing predators take prey about their own length.
 */
export function preyReachCm(actor: SpeciesDefinition, named: boolean): number {
  const mouth = Math.max(0, actor.maxLikelyPreySizeCm ?? 0);
  if (named && tearsPrey(actor)) return Math.max(mouth, actor.adultSizeCm * 1.2);
  return mouth;
}

/** Does an adult of `target` fall within `actor`'s reach (compat's "lethal" test)? */
export function preyFits(actor: SpeciesDefinition, target: SpeciesDefinition, named: boolean): boolean {
  return target.adultSizeCm <= preyReachCm(actor, named) * 1.05;
}

/**
 * Size (cm) up to which an individual prey animal can be taken by a predator of the given current size. The sim uses
 * a slightly generous bound (×1.25) so that anything compat calls lethal is always within reach of a grown predator.
 */
export function edibleSizeCm(reachCm: number, predatorSizeCm: number, predatorAdultCm: number): number {
  const growth = Math.max(0.2, Math.min(1.3, predatorSizeCm / Math.max(0.1, predatorAdultCm)));
  return Math.max(0.3, reachCm) * 1.25 * growth;
}
