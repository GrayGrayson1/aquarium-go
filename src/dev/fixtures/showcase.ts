/**
 * Dependency-light fixture helpers that ship in the main bundle. OWNER: lane "perf2" (moved here from ./index.ts and
 * ./core-fixtures.ts; both still re-export them).
 *
 * The title screen needs `makeShowcase` and `__AQ.focusLargestTank` needs `largestTankId`. Keeping both here keeps the
 * fixture registry (./index.ts: every fixture builder plus the playthrough bot) out of the main chunk. The registry is
 * loaded on demand through ./lazy.ts.
 */
import type { GameState } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import type { StarterId } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';

/** A fresh, never-saved world with one starter tank (title screen backdrop, ?showcase=<starterId>). */
export function makeShowcase(starterId: StarterId, seed = 424242): GameState {
  const preview = previewStarters(seed)[starterId];
  const g = newGame({ starterId, starterName: preview.name, seed, starterCreature: preview });
  g.isShowcase = true;
  g.log = [];
  return g;
}

/** Tank id of the largest tank (QA: focus the 1,000 gal display). */
export function largestTankId(g: GameState): string | null {
  let best: string | null = null;
  let gal = -1;
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    const tier = t && getTankTier(t.tierId);
    if (tier && tier.gallons > gal) {
      gal = tier.gallons;
      best = id;
    }
  }
  return best;
}
