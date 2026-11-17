/**
 * The solo game loop's starvation guard: the rule is in the sim (src/sim/starvation.ts, chunk 11, so a shared shop's
 * server can run it with a memory per shop); this keeps the solo game's one memory.
 */
import type { GameState } from '@/types';
import { checkStarvation as check, newStarvationMemory, starvationSlowdownText, STARVING_HEALTH, STARVING_HUNGER } from '@/sim/starvation';
import { isStarving } from '@/sim/life/step';

export { starvationSlowdownText, STARVING_HEALTH, STARVING_HUNGER };

const memory = newStarvationMemory();

export function resetStarvationGuard(): void {
  memory.gameId = null;
  memory.starving.clear();
}

/**
 * Track starvation episodes on `state` (the loop's working copy). When one starts while the clock runs at 3× or
 * faster, sets clock.speed to 1 and returns the names of the animals that just started starving; otherwise null.
 */
export function checkStarvation(state: GameState): string[] | null {
  return check(state, memory);
}

/**
 * Audit B4 — where the slow-down's toast goes ("See them"): the first animal it names that is still starving in a
 * tank, or null.
 */
export function starvingAnimal(state: GameState, names: readonly string[]): { tankId: string; creatureId: string } | null {
  for (const name of names)
    for (const id in state.creatures) {
      const c = state.creatures[id];
      if (c.name === name && c.tankId && state.tanks[c.tankId] && (c.status === 'alive' || c.status === 'listed') && isStarving(c.stats)) return { tankId: c.tankId, creatureId: c.id };
    }
  return null;
}
