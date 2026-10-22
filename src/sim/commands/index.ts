/**
 * Player actions as data (SHARED-SHOPS.md §4): a command is a plain object a browser can send to the shared-shop
 * server and every copy can apply the same way. Chunk 10 started the catalogue with the kinds its lockstep test sent;
 * chunk 11 made every player action one (`./kinds.ts`), with who sent it and first one wins (`./shared.ts`).
 *
 * - `applyCommand(state, cmd, actor?)` runs the same `src/sim` function the interface's closure called, then the
 *   command's guide flag. With an actor (a shared shop), it also checks what the sender saw and tags what it logged.
 * - `validateCommand(x)` checks a value from the network (`./validate.ts`).
 */
import type { GameState } from '@/types';
import { applyAction, applyFlag, type CommandResult } from './apply';
import { applyAsActor, type Actor } from './shared';
import { applyPoolCommand, isPoolCommand, spendAs, tierRefusal } from '../pool';
import type { Command } from './kinds';

export type { Command, CommandKind, CommandOf, FeedZone, Additive, CleanWhat, LineRule } from './kinds';
export type { CommandResult } from './apply';
export type { Actor } from './shared';
export { applyAction, applyFlag, WATER_CHANGER_ID } from './apply';
export { validateCommand, isSafeId, COMMAND_KINDS, MAX_COMMAND_CHARS, MAX_LISTING_CHARS } from './validate';
export { conflictText, settingKey, staleOf, TOUCH_MS } from './shared';

/**
 * Apply one command: its action, then (when it succeeded) its guide flag. In a solo game the dispatcher runs these
 * two in separate store writes, as `act` did (src/game/dispatch.ts); a shared shop's step runs them in one block.
 */
export function applyCommand(state: GameState, cmd: Command, actor?: Actor): CommandResult {
  const run = (): CommandResult => {
    const res = applyAction(state, cmd);
    if (res.ok && cmd.flag) applyFlag(state, cmd.flag);
    return res;
  };
  if (!actor) return run();
  // chunk 14: the pool's own commands, and everything else within the member's spending tier (src/sim/pool.ts)
  if (isPoolCommand(cmd)) return applyAsActor(state, cmd, actor, () => applyPoolCommand(state, cmd, actor));
  return tierRefusal(state, cmd, actor) ?? applyAsActor(state, cmd, actor, () => spendAs(state, cmd, actor, run));
}
