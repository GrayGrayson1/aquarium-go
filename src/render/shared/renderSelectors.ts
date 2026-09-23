/**
 * Narrow store subscriptions for the renderer. OWNER: lane "perf".
 *
 * Why: the sim publishes a new GameState 4×/s, and every tank object changes on every tick even when nothing visible
 * did (background tanks only accumulate `simDebtHours` between their LOD flushes). Subscribing to whole slices
 * re-rendered the entire scene graph (every tank, every layer, the room, post-processing) on every tick.
 *
 * Pattern for render code (new layers please follow it):
 *   - never `useGame((s) => s.game)` in a render component; select the smallest value you draw from
 *     (a primitive, a string signature, or an object whose identity only changes when it matters);
 *   - per-frame values (clock, runtime) are read with `getGame()` inside `useFrame`, not subscribed to;
 *   - use `useRenderTank(id)` for the tank object: it keeps the previous identity while only render-irrelevant
 *     bookkeeping changed, so memoised layers skip those ticks.
 */
import { useRef } from 'react';
import type { Tank } from '@/types';
import { useGame } from '@/state/game';

/** Tank fields that never affect what is drawn (sim bookkeeping). */
const RENDER_IRRELEVANT: ReadonlySet<string> = new Set(['simDebtHours']);

/**
 * True when `a` and `b` draw identically: every top-level field except sim bookkeeping is the same object/value.
 * The sim publishes with structural sharing (src/game/fastMutate.ts), so unchanged subtrees keep their identity.
 */
export function tankRenderEqual(a: Tank | null | undefined, b: Tank | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ra = a as unknown as Record<string, unknown>;
  const rb = b as unknown as Record<string, unknown>;
  let na = 0;
  for (const k in ra) {
    if (RENDER_IRRELEVANT.has(k)) continue;
    na++;
    if (ra[k] !== rb[k]) return false;
  }
  let nb = 0;
  for (const k in rb) if (!RENDER_IRRELEVANT.has(k)) nb++;
  return na === nb;
}

/**
 * The tank with this id, keeping the previous object while only render-irrelevant fields changed
 * (same idea as zustand's `useShallow`: the cached value lives in a ref updated by the selector).
 */
export function useRenderTank(id: string): Tank | null {
  const prev = useRef<Tank | null>(null);
  return useGame((s) => {
    const t = s.game?.tanks[id] ?? null;
    const p = prev.current;
    if (p && t && tankRenderEqual(p, t)) return p;
    prev.current = t;
    return t;
  });
}
