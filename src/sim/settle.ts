/**
 * Settle tanks before animals or broods move between them (B-127). OWNER: core.
 *
 * Background tanks run on "sim debt" (src/sim/world.ts): hours they owe and catch up in chunks. A creature or clutch is
 * stepped by whichever tank holds it when that tank catches up, so a move without settling skipped up to ~4 game hours
 * of the source tank's time and re-ran the destination's owed hours for an animal that wasn't there yet. Every move
 * (the player's actions, a sold tank's relocations, production lines) settles both tanks first.
 *
 * world.ts registers the stepper here: life, economy and production can't import world.ts, which imports them.
 */
import type { GameState } from '@/types';

type Settler = (state: GameState, tankIds: readonly string[]) => void;

let settler: Settler | null = null;

/** world.ts: install the function that steps a tank through its owed hours. */
export function registerSettler(fn: Settler): void {
  settler = fn;
}

/** Step each named tank through its owed hours, so a move happens at the same world time for both tanks. */
export function settleTanks(state: GameState, tankIds: readonly (string | null | undefined)[]): void {
  if (!settler) return;
  const ids: string[] = [];
  for (const id of tankIds) if (id && !ids.includes(id) && (state.tanks[id]?.simDebtHours ?? 0) > 1e-9) ids.push(id);
  if (ids.length) settler(state, ids);
}
