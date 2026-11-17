/**
 * Audit 2026-11-17 (G16, B-223's building side; E11's rule) — which decor pieces the breeding rules take as somewhere
 * to lay eggs, so Build › Decor can say so on each card and find them by "nest", "spawn", "flat", "leaf" or "cave":
 *  - a nest site (`hasNestSite`): any rock, wood, ornament or coral, a host, or a nest site or cave on a piece that
 *    isn't a plant. A clump of java moss or floating plants is not one (E11);
 *  - a cave (`hasCave`) for a cave spawner to claim;
 *  - a broad leaf (`hasBroadLeaf`): a rooted plant with a leaf to rest on, where angelfish and rams also lay.
 * The rules themselves live in src/sim/life/breeding/common.ts; tests check that these agree with them, piece by piece.
 */
import type { DecorDef } from '@/types';
import { isFloating } from '@/data/catalog/decor';

/** The categories the breeding rules read a nest site, cave or host anchor from (common.ts HARD_CATEGORIES). */
const HARD: readonly DecorDef['category'][] = ['hardscape', 'ornament', 'coral', 'anemone', 'enrichment', 'substrate_feature'];

/** One of these alone lets a pair that spawns on a hard surface lay its eggs. */
export function isNestSite(d: DecorDef): boolean {
  if (d.category === 'hardscape' || d.category === 'ornament' || d.category === 'coral') return true;
  if (d.anchors.some((a) => a.kind === 'host')) return true;
  return HARD.includes(d.category) && d.anchors.some((a) => a.kind === 'nest_site' || a.kind === 'cave');
}

/** One of these alone is a cave for a cave spawner to claim (at its normal size). */
export function isCave(d: DecorDef): boolean {
  return d.anchors.some((a) => a.kind === 'cave') || (d.category !== 'plant' && d.habitat.hides >= 1 && d.anchors.some((a) => a.kind === 'nest_site'));
}

/** A rooted plant with a broad leaf: angelfish and rams lay on these too (not floating plants). */
export function isBroadLeaf(d: DecorDef): boolean {
  return d.category === 'plant' && !isFloating(d) && d.anchors.some((a) => a.kind === 'leaf_rest');
}
