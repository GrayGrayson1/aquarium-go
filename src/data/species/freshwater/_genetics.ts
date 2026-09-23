/**
 * Small builders for species genetics data. Lane species-fw. Pure data helpers — no runtime logic.
 *
 * A "dominance ladder" expresses the highest-ranked allele present at a locus, which matches the
 * `dominance` numbers on the locus. Steps are listed highest-ranked first; each generated rule requires its
 * allele and the absence of every higher-ranked allele, so exactly one rule of the ladder matches a genome
 * (or none, if only recessive-only alleles are present in a single copy).
 */
import type { CreatureVisualParams, PhenotypeRule } from '@/types';

export interface LadderStep {
  /** Allele id at the locus. */
  allele: string;
  /** Phenotype rule id (unique within the species). */
  id: string;
  /** Player-facing morph name. */
  name: string;
  rarity: number;
  visual: Partial<CreatureVisualParams>;
  /** Recessive trait: only shows when homozygous (two copies). */
  recessive?: boolean;
  note?: string;
}

export function ladderRules(locus: string, layer: PhenotypeRule['layer'], steps: LadderStep[]): PhenotypeRule[] {
  return steps.map((step, i) => {
    const when: PhenotypeRule['when'] = step.recessive
      ? [{ locus, allele: step.allele, count: 'hom' }]
      : [
          { locus, allele: step.allele, count: 'any' },
          ...steps
            .slice(0, i)
            .filter((higher) => !higher.recessive)
            .map((higher) => ({ locus, allele: higher.allele, count: 'none' as const })),
        ];
    const rule: PhenotypeRule = { id: step.id, name: step.name, layer, rarity: step.rarity, when, visual: step.visual };
    if (step.note) rule.note = step.note;
    return rule;
  });
}
