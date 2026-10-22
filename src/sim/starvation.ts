/**
 * lane:fix-core2 (S02-12b) — fast-forward drops back to 1× the moment an animal starts starving (the sim's "starving
 * and losing condition" threshold, see the welfare warnings in ./life/step.ts): at 10× the window between that
 * warning and a death is only a few real minutes. The clock's owner applies the rule (the sim never changes
 * clock.speed by itself): the solo game loop (src/game/starvationGuard.ts keeps its memory) and, in a shared shop,
 * the server, which puts the slow-down in a step's `post` (SHARED-SHOPS.md §3.2 rule 6). Moved here in chunk 11 with
 * its memory passed in, so each shop has its own.
 *
 * Once per animal per starvation episode, so a player who speeds up again on purpose is not fought. An episode starts
 * when a living animal crosses the threshold (at any speed; only a crossing at 3× or faster slows the clock) and ends
 * once it has eaten (hunger below EPISODE_END_HUNGER), died or left the aquarium.
 */
import type { GameState } from '@/types';
import { STARVING_HUNGER, STARVING_HEALTH, isStarving } from './life/step';

export { STARVING_HUNGER, STARVING_HEALTH };
const EPISODE_END_HUNGER = 90;
/** Slowest speed that counts as fast-forward. */
const FAST_SPEED = 3;

/** Which game the memory is about, and its animals in a starvation episode. */
export interface StarvationMemory {
  gameId: string | null;
  starving: Set<string>;
}

export const newStarvationMemory = (): StarvationMemory => ({ gameId: null, starving: new Set() });

/**
 * Track starvation episodes on `state`. When one starts while the clock runs at 3× or faster, sets clock.speed to 1
 * and returns the names of the animals that just started starving; otherwise null.
 */
export function checkStarvation(state: GameState, mem: StarvationMemory): string[] | null {
  if (state.isShowcase) return null;
  const starving = mem.starving;
  if (state.saveId !== mem.gameId) {
    mem.gameId = state.saveId;
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
