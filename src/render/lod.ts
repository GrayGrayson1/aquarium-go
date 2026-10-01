/** Render LOD contract. 0 = hero (focused tank), 1 = medium (visible nearby in facility), 2 = far/cheap. */
export type RenderLod = 0 | 1 | 2;

/**
 * Facility view: which tanks draw at lod 1, from their ids ranked nearest-first. lane:tankrender — with hysteresis, so
 * a camera drag no longer flips the tanks around the cut-off back and forth (every flip rebuilds a tank's creatures and
 * shell): a lod-1 tank keeps it until it drops out of the nearest `near + 2`, a lod-2 tank is promoted once it is among
 * the nearest `near - 1`, and the set is topped up nearest-first to `near` tanks. At most `near + 2` are ever at lod 1.
 */
export function facilityLods(ranked: readonly string[], prev: Readonly<Record<string, RenderLod>>, near: number): Record<string, RenderLod> {
  const out: Record<string, RenderLod> = {};
  let n = 0;
  ranked.forEach((id, i) => {
    const one = prev[id] === 1 ? i < near + 2 : i < near - 1;
    out[id] = one ? 1 : 2;
    if (one) n++;
  });
  for (let i = 0; i < ranked.length && n < near; i++) {
    if (out[ranked[i]] === 2) {
      out[ranked[i]] = 1;
      n++;
    }
  }
  return out;
}
