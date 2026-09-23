/**
 * Small data builders shared by marine species records. Lane species-marine. Pure data — no runtime logic.
 *
 * Many marine aquarium species have no established colour morphs. They still vary individually (diet, locality,
 * polygenic background). Instead of inventing morphs, those species get one honest "colour intensity" locus that
 * nudges saturation/contrast, plus a single named base phenotype.
 */
import type { CreatureVisualParams, LocusDefinition, PhenotypeRule } from '@/types';

/** Additive colour-intensity locus used by species without real morphs. */
export function intensityLocus(note: string): LocusDefinition {
  return {
    id: 'intensity',
    name: 'Colour intensity (natural variation)',
    mode: 'additive',
    alleles: [
      { id: 'std', name: 'Typical', dominance: 1, frequency: 0.8 },
      { id: 'rich', name: 'Rich', dominance: 1, frequency: 0.2 },
    ],
    note,
  };
}

/**
 * Overlay applied when an individual carries two "rich" alleles: slightly deeper colour and crisper pattern.
 * Named plainly because it is individual variation, not a commercial morph.
 */
export function intensityOverlay(visual: Partial<CreatureVisualParams>, name = 'Richly coloured'): PhenotypeRule {
  return {
    id: 'rich_colour',
    name,
    layer: 'overlay',
    rarity: 0.08,
    when: [{ locus: 'intensity', allele: 'rich', count: 'hom' }],
    visual,
    note: 'Individual variation, not a named trade morph.',
  };
}
