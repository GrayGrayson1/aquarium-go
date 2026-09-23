/**
 * lane:w2-visual — line of sight for the close / follow cameras. The flank swing of a close-up (or a low shot of a
 * bottom dweller) could put the sand bank, a rock or the tank's corner between the lens and the animal, and the frame
 * filled with a dark block (a rock face or the substrate seen from inside, green glass edges around it). This tests
 * the ray from the lens to the animal against the aquascape the sim already models — the substrate heightfield and
 * the hardscape domes (`surfaceHeightAt`) — and picks the first clear camera variant. Cheap: a dozen height samples
 * per candidate, a few candidates, ~3×/s; no scene raycasts. OWNER: render.
 */
import type { Tank } from '@/types';
import { surfaceHeightAt } from '@/sim/aquascape/terrain';
import { tankDims } from '@/sim/tankSpace';

type P3 = { x: number; y: number; z: number };

/**
 * Fraction (0..1) of the in-water part of the segment lens → animal that runs under the substrate / through
 * hardscape, or in through a side pane. Tank-local metres. The last stretch next to the animal is skipped (a crab
 * sits ON the surface).
 */
export function sightBlocked(tank: Tank, from: P3, to: P3, samples = 14): number {
  const d = tankDims(tank);
  const hx = d.L / 2;
  const hz = d.W / 2;
  let n = 0;
  let bad = 0;
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (t > 0.88) break;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const z = from.z + (to.z - from.z) * t;
    if (z > hz) continue; // still in front of the front glass
    n++;
    // looking in through a side pane / the corner silicone
    if (Math.abs(x) > hx - 0.004) {
      bad++;
      continue;
    }
    if (y < surfaceHeightAt(tank, x, z) - 0.004) bad++;
  }
  return n ? bad / n : 0;
}

/** Camera variants, in preference order: [flank-swing multiplier, extra pitch (rad)]. */
const VARIANTS: [number, number][] = [
  [1, 0],
  [0.5, 0],
  [0, 0],
  [-0.6, 0],
  [1, 0.18],
  [0, 0.18],
  [0, 0.34],
  [0, 0.5],
];

/**
 * Choose the camera variant with a clear view of `target`: keep the current one while it stays clear (no flip-flopping),
 * else the first clear variant in preference order, else the least blocked. `camAt(side, lift, out)` places the lens
 * for a variant (tank-local).
 */
export function pickSightline(tank: Tank, target: P3, current: [number, number], camAt: (side: number, lift: number, out: P3) => P3): [number, number] {
  const c: P3 = { x: 0, y: 0, z: 0 };
  if (sightBlocked(tank, camAt(current[0], current[1], c), target) === 0) return current;
  let best: [number, number] = current;
  let bestBad = Infinity;
  for (const v of VARIANTS) {
    const bad = sightBlocked(tank, camAt(v[0], v[1], c), target);
    if (bad === 0) return v;
    if (bad < bestBad - 1e-6) {
      bestBad = bad;
      best = v;
    }
  }
  return best;
}
