/**
 * Rarity balance: Prismatic odds and value, morph-tier thresholds, named-strain premiums. OWNER: lane "genetics".
 * This is the ONE home of these numbers — breeding, the shop, valuation and the UI all read them from here.
 *
 * Prismatic is a game-only phenomenon (no real animal shimmers like this): an individual property rolled once, when a
 * seller stocks an animal or it is born in the player's shop, and kept for life (src/sim/life/rareVariants.ts).
 */
import type { Rarity } from '@/types';

export interface PrismaticConfig {
  enabled: boolean;
  /** Chance for each animal a seller stocks (shop offers). */
  shopChance: number;
  /** Chance for each juvenile raised from two ordinary parents. */
  bredBaseChance: number;
  /** Multiplier on `bredBaseChance` when one parent is Prismatic… */
  oneParentMultiplier: number;
  /** …and when both are. Never a guarantee: the cap below always applies. */
  twoParentMultiplier: number;
  /** A bred youngster's chance never exceeds this, however the multipliers are tuned. */
  bredMaxChance: number;
  /** Market value multiplier, applied once as its own valuation factor. */
  valueMultiplier: number;
}

/** Shop ≈ 1 in 4,096; bred 1 in 8,192 (1 in 2,048 with one Prismatic parent, 1 in 1,024 with two; capped at 1 in 512). */
export const PRISMATIC: Readonly<PrismaticConfig> = Object.freeze({
  enabled: true,
  shopChance: 1 / 4096,
  bredBaseChance: 1 / 8192,
  oneParentMultiplier: 4,
  twoParentMultiplier: 8,
  bredMaxChance: 1 / 512,
  valueMultiplier: 12,
});

/** Tiers from most to least common (the species `Rarity` vocabulary, reused for morphs and strains). */
export const RARITY_TIERS: readonly Rarity[] = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];

/** Lower-case tier words for sim text ("a recognised very rare strain"). */
export const TIER_WORD: Readonly<Record<Rarity, string>> = Object.freeze({ common: 'common', uncommon: 'uncommon', rare: 'rare', very_rare: 'very rare', legendary: 'legendary' });

/**
 * Morph tier from how often market stock shows a phenotype (exact Hardy–Weinberg odds from allele frequencies — what
 * rollGenome draws): at least this share of stock → this tier.
 */
export const MORPH_TIER_MIN_SHARE: readonly (readonly [Rarity, number])[] = [
  ['common', 0.1],
  ['uncommon', 0.02],
  ['rare', 0.005],
  ['very_rare', 0.001],
  ['legendary', 0],
];

/**
 * Value of a recognised named strain, by tier — on top of the morph factor (which already prices each trait's rarity),
 * so these stay gentle.
 */
export const STRAIN_VALUE: Readonly<Record<Rarity, number>> = Object.freeze({ common: 1, uncommon: 1.1, rare: 1.25, very_rare: 1.5, legendary: 2 });

/** Ceiling on morph × named strain × show qualities, applied before Prismatic, so stacked genetics never run away. */
export const MAX_GENETIC_MULTIPLIER = 6;
