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
import { byId } from '@/data/byId';

export const STARTER_IDS = ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'] as const;
export type StarterId = (typeof STARTER_IDS)[number];

export const ALL_SPECIES: SpeciesDefinition[] = [axolotl, betta, peaPuffer, ocellarisClownfish, linedSeahorse, ...FRESHWATER_SPECIES, ...MARINE_SPECIES, ...BRACKISH_SPECIES]; // lane:brackish: + BRACKISH_SPECIES

const BY_ID: Record<string, SpeciesDefinition> = byId(ALL_SPECIES);

export function getSpecies(id: string): SpeciesDefinition {
  const s = findSpecies(id);
  if (!s) throw new Error(`Unknown species: ${id}`);
  return s;
}

/** Own keys only: an id from a save such as "constructor" or "__proto__" must not find an inherited Object property. */
export function findSpecies(id: string): SpeciesDefinition | undefined {
  return Object.hasOwn(BY_ID, id) ? BY_ID[id] : undefined;
}

export function listSpecies(filter?: (s: SpeciesDefinition) => boolean): SpeciesDefinition[] {
  return filter ? ALL_SPECIES.filter(filter) : ALL_SPECIES;
}
