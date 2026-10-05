/**
 * Rarity report (GEN-013, ADR-0005 decision 4). OWNER: lane "genetics".
 *
 * Counts how today's tier rule spreads each species over the rarity tiers, so the owner can tune the tiers on real
 * numbers (`npm run report:rarity`, scripts/report-rarity.ts). It only counts: every tier comes from the morph catalog
 * (tierForShare over MORPH_TIER_MIN_SHARE) and strainTier, so there is no second copy of the tier logic here.
 * Pure and deterministic: no RNG, no clock, no locale; species in registry order, tiers in RARITY_TIERS order.
 */
import type { Rarity, SpeciesDefinition } from '@/types';
import { listSpecies } from '@/data/species';
import { MORPH_TIER_MIN_SHARE, RARITY_TIERS } from '@/data/rarity';
import { morphCatalog, strainTier } from './morphCatalog';

/** One number per tier; keys in RARITY_TIERS order (common → legendary). */
export type TierCounts = Record<Rarity, number>;

export interface SpeciesRarityRow {
  speciesId: string;
  commonName: string;
  /** False when the catalog is a seeded sample (an unusually large genotype space), not an exact enumeration. */
  exactCatalog: boolean;
  /** Morph-catalog entries (distinct morph names). */
  entries: number;
  /** Catalog entries per morph tier. Sums to `entries`. */
  entriesByTier: TierCounts;
  /** Named strains in the species data (genetics.strains). */
  strains: number;
  /** Named strains per tier as the game shows it: the strain's explicit tier, else the one derived from the catalog. */
  strainsByTier: TierCounts;
  /** Strains whose tier is set explicitly in the data; changing MORPH_TIER_MIN_SHARE does not move these. */
  strainsWithExplicitTier: number;
  /** Share (0..1) of the animals sellers stock whose morph falls in each tier (catalog frequencies). Sums to 1. */
  stockShareByTier: TierCounts;
}

export interface RarityReport {
  /** RARITY_TIERS, most to least common. */
  tiers: readonly Rarity[];
  /** The rule in force: at least this share of stock → this tier (MORPH_TIER_MIN_SHARE). */
  thresholds: readonly (readonly [Rarity, number])[];
  species: SpeciesRarityRow[];
  totals: {
    species: number;
    entries: number;
    entriesByTier: TierCounts;
    strains: number;
    strainsByTier: TierCounts;
    strainsWithExplicitTier: number;
    /** Mean of the species' stock shares, every species weighing the same. Sums to 1 when any species is counted. */
    meanStockShareByTier: TierCounts;
  };
}

function zeroCounts(): TierCounts {
  const out = {} as TierCounts;
  for (const t of RARITY_TIERS) out[t] = 0;
  return out;
}

/** One species' tier counts. */
export function speciesRarityRow(species: SpeciesDefinition): SpeciesRarityRow {
  const cat = morphCatalog(species);
  const entriesByTier = zeroCounts();
  const stockShareByTier = zeroCounts();
  for (const e of cat.entries) {
    entriesByTier[e.tier] += 1;
    stockShareByTier[e.tier] += e.frequency;
  }
  const strains = species.genetics.strains ?? [];
  const strainsByTier = zeroCounts();
  let strainsWithExplicitTier = 0;
  for (const s of strains) {
    strainsByTier[strainTier(species, s)] += 1;
    if (s.tier) strainsWithExplicitTier += 1;
  }
  return {
    speciesId: species.id,
    commonName: species.commonName,
    exactCatalog: cat.exact,
    entries: cat.entries.length,
    entriesByTier,
    strains: strains.length,
    strainsByTier,
    strainsWithExplicitTier,
    stockShareByTier,
  };
}

/** The tier counts of every species (registry order by default) plus totals across them. */
export function rarityReport(species: readonly SpeciesDefinition[] = listSpecies()): RarityReport {
  const rows = species.map(speciesRarityRow);
  const entriesByTier = zeroCounts();
  const strainsByTier = zeroCounts();
  const meanStockShareByTier = zeroCounts();
  let entries = 0;
  let strains = 0;
  let strainsWithExplicitTier = 0;
  for (const r of rows) {
    entries += r.entries;
    strains += r.strains;
    strainsWithExplicitTier += r.strainsWithExplicitTier;
    for (const t of RARITY_TIERS) {
      entriesByTier[t] += r.entriesByTier[t];
      strainsByTier[t] += r.strainsByTier[t];
      meanStockShareByTier[t] += r.stockShareByTier[t];
    }
  }
  if (rows.length) for (const t of RARITY_TIERS) meanStockShareByTier[t] /= rows.length;
  return {
    tiers: RARITY_TIERS,
    thresholds: MORPH_TIER_MIN_SHARE,
    species: rows,
    totals: { species: rows.length, entries, entriesByTier, strains, strainsByTier, strainsWithExplicitTier, meanStockShareByTier },
  };
}
