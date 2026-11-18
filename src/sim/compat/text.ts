/**
 * Natural-language helpers for compatibility reasons. OWNER: lane "waterlab".
 */
import type { SpeciesDefinition } from '@/types';
import { youngKindOf } from '@/data/species';
import { pluralName } from '../economy/util';
import { WATER_CLASS_WORDS } from '@/data/tankLabels'; // Audit 2026-11-17 (J4)
import { lowerName } from '@/data/speciesWords'; // Audit 2026-11-17 (J15): proper nouns keep their capitals

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const lower = (s: string) => lowerName(s);

/** "Neon Tetra" → "neon tetras", "Cherry Shrimp" → "cherry shrimp", "Watchman Goby" → "watchman gobies". */
export function plural(sp: SpeciesDefinition | string): string {
  return pluralName(typeof sp === 'string' ? sp : sp.commonName);
}

/** "the betta" */
export const the = (sp: SpeciesDefinition) => `the ${lower(sp.commonName)}`;

/** Plural subject, capitalised: "Fancy goldfish", "Pea puffers". */
export const Subj = (sp: SpeciesDefinition) => cap(plural(sp));

/** Short noun for the young of a species. */
export function youngNoun(sp: SpeciesDefinition): string {
  const kind = youngKindOf(sp); // B-170: from the species data, not its display name
  if (kind === 'shrimp') return `young ${plural(sp)}`;
  if (sp.category === 'amphibian') return `${lower(sp.commonName)} larvae`;
  if (kind === 'snail') return `baby ${plural(sp)}`;
  if (sp.category === 'invertebrate') return `young ${plural(sp)}`;
  return `${lower(sp.commonName)} fry`;
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const numberWord = (n: number) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));

export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

export const SUBSTRATE_NAMES: Record<string, string> = {
  bare: 'a bare bottom',
  fine_sand: 'fine sand',
  sand: 'sand',
  fine_gravel: 'fine gravel',
  gravel: 'gravel',
  aragonite: 'aragonite sand',
  planted_soil: 'aqua soil',
  large_pebbles: 'large pebbles',
};

/** Audit 2026-11-17 (J4): the water types' one set of names ("planted tropical" and "fish-only marine" were a fourth). */
export const CLASS_NAMES: Record<string, string> = WATER_CLASS_WORDS;
