/**
 * Tank-placement tap rules (pure, testable): what a click/tap on the floor should do given the spot that was
 * previewed before it and the spot it landed on. OWNER: lane "facility".
 *  - mouse: hover already previews, so a click places straight away;
 *  - touch: no hover, so the first tap previews and a second tap on (about) the same spot confirms — at the
 *    previewed spot, since a finger rarely lands on the exact grid cell twice;
 *  - the click that ends a camera drag/pinch never places anything.
 */
export interface PlacementSpot {
  x: number;
  z: number;
  rotY: number;
}

/** Metres between two taps that still count as "the same spot". */
export const SAME_SPOT_M = 0.3;

export type FloorTap<T extends PlacementSpot> = { kind: 'ignore' } | { kind: 'preview'; at: T } | { kind: 'confirm'; at: T };

export function resolveFloorTap<T extends PlacementSpot>(prev: T | null, next: T, opts: { touch: boolean; dragEnded: boolean }): FloorTap<T> {
  if (opts.dragEnded) return { kind: 'ignore' };
  if (!opts.touch) return { kind: 'confirm', at: next };
  if (prev && Math.hypot(prev.x - next.x, prev.z - next.z) <= SAME_SPOT_M) {
    // same rotation: keep the previewed spot; the rotation changed in between: place at the fresh evaluation
    return { kind: 'confirm', at: prev.rotY === next.rotY ? prev : next };
  }
  return { kind: 'preview', at: next };
}
