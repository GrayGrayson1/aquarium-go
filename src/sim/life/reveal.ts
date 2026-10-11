/**
 * lane:genetics — how much of an animal's genetics the player can see (0.5 spec §9.1). OWNER: lane "genetics".
 *
 * 1 (exact alleles and numbers) once the Genetics Lab is researched; otherwise the animal's own level, which is 0 for
 * every animal created since 0.3 (only saves from before the field existed lack it). One rule for the creature card,
 * the shop's Genes panel, card chips and Rare genes filter, and the temperament numbers, so a hidden allele is hidden
 * everywhere before the lab and shown everywhere after it.
 */
import type { Creature, GameState } from '@/types';
import { isUnlocked } from '@/sim/facility/progression';

export function geneticsRevealLevel(state: GameState, c: Pick<Creature, 'geneticsRevealed'>): number {
  return isUnlocked(state, 'genetics_lab') ? 1 : (c.geneticsRevealed ?? 0);
}
