/**
 * Tank labels the simulation's own messages use ("Converted to planted freshwater.", "… is now a nursery tank"), moved
 * out of the UI with the tank edits (chunk 6, B-169); src/ui/panels/common/format.ts re-exports them. OWNER: lane
 * "ui-panels".
 */
import type { TankPurpose, WaterClass } from '@/types';

/**
 * Audit 2026-11-17 (J4): the one name of each water type, everywhere (Tanks, Build, the tank card's chip, the starter
 * screen, the shop, listings, compatibility); `WATER_CLASS_WORDS` is the same name inside a sentence.
 */
export const WATER_CLASS_LABEL: Record<WaterClass, string> = {
  freshwater_cool: 'Cool freshwater',
  freshwater_tropical: 'Tropical freshwater',
  freshwater_planted: 'Planted freshwater',
  marine_fowlr: 'Marine fish-only',
  marine_live_rock: 'Marine live rock',
  reef: 'Reef',
  brackish: 'Brackish',
};

/** Audit 2026-11-17 (J4): the label in running text ("suited to a marine live-rock tank", "Converted to reef."). */
export const WATER_CLASS_WORDS: Record<WaterClass, string> = {
  freshwater_cool: 'cool freshwater',
  freshwater_tropical: 'tropical freshwater',
  freshwater_planted: 'planted freshwater',
  marine_fowlr: 'marine fish-only',
  marine_live_rock: 'marine live-rock',
  reef: 'reef',
  brackish: 'brackish',
};

export const PURPOSE_LABEL: Record<TankPurpose, string> = {
  display: 'Display',
  nursery: 'Nursery',
  quarantine: 'Quarantine',
  breeding: 'Breeding',
};
