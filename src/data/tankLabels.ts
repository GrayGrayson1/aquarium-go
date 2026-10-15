/**
 * Tank labels the simulation's own messages use ("Converted to planted freshwater.", "… is now a nursery tank"), moved
 * out of the UI with the tank edits (chunk 6, B-169); src/ui/panels/common/format.ts re-exports them. OWNER: lane
 * "ui-panels".
 */
import type { TankPurpose, WaterClass } from '@/types';

export const WATER_CLASS_LABEL: Record<WaterClass, string> = {
  freshwater_cool: 'Cool freshwater',
  freshwater_tropical: 'Tropical freshwater',
  freshwater_planted: 'Planted freshwater',
  marine_fowlr: 'Marine fish-only',
  marine_live_rock: 'Marine with live rock',
  reef: 'Reef',
  brackish: 'Brackish',
};

export const PURPOSE_LABEL: Record<TankPurpose, string> = {
  display: 'Display',
  nursery: 'Nursery',
  quarantine: 'Quarantine',
  breeding: 'Breeding',
};
