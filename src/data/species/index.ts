/**
 * Species registry. OWNER: core. Species lanes add species via their barrels (freshwater/index.ts, marine/index.ts).
 * Nothing outside src/data may hardcode species facts — always go through getSpecies().
 */
import type { SpeciesDefinition } from '@/types';
import { axolotl } from './axolotl';
import { betta } from './betta';
import { peaPuffer } from './pea_puffer';
import { ocellarisClownfish } from './ocellaris_clownfish';
import { linedSeahorse } from './lined_seahorse';
import { FRESHWATER_SPECIES } from './freshwater';
import { MARINE_SPECIES } from './marine';
import { BRACKISH_SPECIES } from './brackish'; // lane:brackish

export const STARTER_IDS = ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'] as const;
export type StarterId = (typeof STARTER_IDS)[number];

export const ALL_SPECIES: SpeciesDefinition[] = [axolotl, betta, peaPuffer, ocellarisClownfish, linedSeahorse, ...FRESHWATER_SPECIES, ...MARINE_SPECIES, ...BRACKISH_SPECIES]; // lane:brackish: + BRACKISH_SPECIES

const BY_ID: Record<string, SpeciesDefinition> = Object.fromEntries(ALL_SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): SpeciesDefinition {
  const s = BY_ID[id];
  if (!s) throw new Error(`Unknown species: ${id}`);
  return s;
}

export function findSpecies(id: string): SpeciesDefinition | undefined {
  return BY_ID[id];
}

export function listSpecies(filter?: (s: SpeciesDefinition) => boolean): SpeciesDefinition[] {
  return filter ? ALL_SPECIES.filter(filter) : ALL_SPECIES;
}
