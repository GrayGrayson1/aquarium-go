/**
 * Hero-tank mesh detail tiers by on-screen size. OWNER: lane "perf" (used by fishart + critterart objects).
 *
 * A 1,000-gallon display holds dozens of animals that are only 5–40 CSS px long on screen, yet each was drawn with its
 * full close-up mesh (≈10–37k triangles). Micro-triangles cost the GPU far more than the pixels they cover. While an
 * animal is small on screen its object swaps to the mesh resolution of a lower LOD — same plan, same rig, same
 * materials — so the picture does not change; the close-up and follow cameras always get the full mesh.
 *
 * tier 0 = full (lod-0 mesh) · tier 1 = lod-1 resolution · tier 2 = lod-2 resolution.
 */
import type { QualityLevel } from '@/types';

export interface DetailThresholds {
  /** At or above: full mesh. */
  full: number;
  /** At or above (and below `full`): tier 1. Below: tier 2. */
  mid: number;
}

/** Fish (lofted bodies: the lower tiers keep every part, only density drops). */
export const FISH_DETAIL: DetailThresholds = { full: 110, mid: 30 };
/** Critters (lower tiers also drop hair-thin appendages such as antennules, so tier 2 starts smaller). */
export const CRITTER_DETAIL: DetailThresholds = { full: 110, mid: 16 };

/**
 * Decor at hero LOD — the lod-0 detail budget by quality. Below this projected size (CSS px of the item's largest
 * dimension) an item draws its lod-1 mesh, the one the facility view uses. Decor lod-1 meshes are simplified in
 * structure (fewer blades, strands and polyps), not just tessellation, so high/ultra never switch (0 = off): the hero
 * look there is exactly the full mesh. Low/medium — and a machine the PerformanceMonitor has degraded to them — trade
 * that detail on small items for frame time. Use as `nextDetailTier(px, tier, { full: T, mid: 0 })`.
 */
export const DECOR_DETAIL_MID_PX: Record<QualityLevel, number> = { low: 150, medium: 90, high: 0, ultra: 0 };

/**
 * Global switch for every screen-size tier. `?fulldetail` starts with it off; QA can flip it live through
 * `window.__AQ_DETAIL.on` (dev or `?perf=1`) for same-moment A/B screenshots.
 */
export const detailTiers = { on: !(typeof location !== 'undefined' && new URLSearchParams(location.search).has('fulldetail')) };
if (typeof window !== 'undefined' && (import.meta.env.DEV || new URLSearchParams(location.search).has('perf'))) {
  (window as unknown as { __AQ_DETAIL?: typeof detailTiers }).__AQ_DETAIL = detailTiers;
}

/** Next tier for a projected body length `px` (CSS px), with ±12% hysteresis so a boundary never flickers. */
export function nextDetailTier(px: number, tier: number, th: DetailThresholds): number {
  const want = px >= th.full ? 0 : px >= th.mid ? 1 : 2;
  if (want === tier) return tier;
  const band = want < tier ? 1.12 : 0.88;
  return px >= th.full * band ? 0 : px >= th.mid * band ? 1 : 2;
}
