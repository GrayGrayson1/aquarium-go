/**
 * The solo game loop's starvation guard: the rule is in the sim (src/sim/starvation.ts, chunk 11, so a shared shop's
 * server can run it with a memory per shop); this keeps the solo game's one memory.
 */
import type { GameState } from '@/types';
import { checkStarvation as check, newStarvationMemory, starvationSlowdownText, STARVING_HEALTH, STARVING_HUNGER } from '@/sim/starvation';

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
