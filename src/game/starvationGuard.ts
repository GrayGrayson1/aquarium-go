/**
 * lane:fix-core2 (S02-12b) — fast-forward drops back to 1× the moment an animal starts starving (the sim's "starving
 * and losing condition" threshold, see the welfare warnings in src/sim/life/step.ts): at 10× the window between that
 * warning and a death is only a few real minutes. The game loop owns this, not the sim (the sim never changes
 * clock.speed).
 *
 * Once per animal per starvation episode, so a player who speeds up again on purpose is not fought. An episode starts
 * when a living animal crosses the threshold (at any speed; only a crossing at 3× or faster slows the clock) and ends
 * once it has eaten (hunger below EPISODE_END_HUNGER), died or left the aquarium.
 */
import type { GameState } from '@/types';
import { STARVING_HUNGER, STARVING_HEALTH, isStarving } from '@/sim/life/step';

export { STARVING_HUNGER, STARVING_HEALTH };
const EPISODE_END_HUNGER = 90;
/** Slowest speed that counts as fast-forward. */
const FAST_SPEED = 3;

let gameId: string | null = null;
const starving = new Set<string>();

export function resetStarvationGuard(): void {
  gameId = null;
  starving.clear();
}

/**
 * Track starvation episodes on `state` (the loop's working copy). When one starts while the clock runs at 3× or
 * faster, sets clock.speed to 1 and returns the names of the animals that just started starving; otherwise null.
 */
export function checkStarvation(state: GameState): string[] | null {
  if (state.isShowcase) return null;
  if (state.saveId !== gameId) {
    gameId = state.saveId;
    starving.clear();
  }
  const fast = state.clock.speed >= FAST_SPEED;
  let fresh: string[] | null = null;
  for (const id in state.creatures) {
    const c = state.creatures[id];
    const alive = c.status === 'alive' || c.status === 'listed';
    if (starving.has(id)) {
      if (!alive || !(c.stats.hunger >= EPISODE_END_HUNGER)) starving.delete(id);
      continue;
    }
    if (!alive || !isStarving(c.stats)) continue;
    starving.add(id);
    if (fast) (fresh ??= []).push(c.name);
  }
  if (starving.size) for (const id of starving) if (!state.creatures[id]) starving.delete(id);
  if (fresh) state.clock.speed = 1;
  return fresh;
}

/** Toast line for a speed drop. */
export function starvationSlowdownText(names: string[]): string {
  const who = names.length === 1 ? `${names[0]} is` : `${names.length} animals are`;
  return `Slowed to 1× — ${who} starving.`;
}
