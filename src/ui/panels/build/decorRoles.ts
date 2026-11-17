/**
 * Audit 2026-11-17 (G16, B-223's building side) — which decor pieces the breeding rules take as somewhere to lay eggs
 * (`hasNestSite`: any rock, wood or ornament, or a nest, host, cave or resting anchor, which java moss and floating
 * plants carry) and as a cave (`hasCave`), so Build › Decor can say so on each card and find them by "nest", "spawn",
 * "flat" or "cave". The rules themselves live in src/sim/life/breeding/common.ts; tests check these agree with them.
 */
import type { DecorDef } from '@/types';

/** One of these alone lets a pair that spawns on a surface lay its eggs. */
export function isNestSite(d: DecorDef): boolean {
  return d.category === 'hardscape' || d.category === 'ornament' || d.anchors.some((a) => a.kind === 'nest_site' || a.kind === 'host' || a.kind === 'cave' || a.kind === 'rest');
}

/** One of these alone is a cave for a cave spawner to claim (at its normal size). */
export function isCave(d: DecorDef): boolean {
  return d.anchors.some((a) => a.kind === 'cave') || (d.habitat.hides >= 1 && d.anchors.some((a) => a.kind === 'nest_site'));
}
