/**
 * Shared shops' step block (SHARED-SHOPS.md §3.2 rule 2). The server's room and every browser's replica run each step
 * through this one function, so every copy does the same things in the same order with the same arithmetic
 * (./dmath.ts): pin the world's identity, clear the caches that answer by a rounded signature, apply the step's
 * commands, advance its game hours with the full-detail list, then apply the server's after-step changes.
 */
import type { GameState } from '@/types';
import { advanceWorld, pinWorld } from './world';
import { clearCompatCache } from './compat';
import { clearReachCache } from './facility/layout';
import { deepClone } from './clone';
import { applyCommand, type Command, type CommandResult } from './commands';

/** A member's command inside a step: who sent it, the sender's own id for it, and the command. */
export interface StepCommand {
  by: string;
  id?: number;
  c: Command;
}

/** One step of a shared shop (§3.3's `steps` message). */
export interface SharedStep {
  /** The step number: 1, 2, 3… with no gaps. */
  n: number;
  /** Game hours this step advances: 0 for a command's own step. */
  h: number;
  /** The full-detail list from this step on, when it changed (rule 4). */
  full?: string[];
  /** Commands applied before the advance, in the order the server received them. */
  cmds?: StepCommand[];
  /** The server's own changes after the advance (rule 6). */
  post?: Command[];
  /** The server's fingerprint (`stateHash`) of the copy after this step. */
  fp?: string;
}

export interface StepOutcome {
  /** The copy after the step: a new object with `copy`, else the same one. */
  state: GameState;
  /** Each command's result, in order. */
  results: CommandResult[];
}

/**
 * Run one step. `full` is the full-detail list in force for it (the step's own `full` when it carries one). With
 * `copy` (the server), the block runs on a deep copy and `state` is never touched, so a block that throws is dropped
 * whole (§5.2 item 3). Without it (a browser's replica, which re-syncs from a snapshot if a step ever throws), it runs
 * in place.
 */
export function runSharedStep(state: GameState, step: SharedStep, full: readonly string[], opts: { copy?: boolean } = {}): StepOutcome {
  const s = opts.copy ? deepClone(state) : state;
  pinWorld(s);
  clearCompatCache();
  clearReachCache();
  const results: CommandResult[] = [];
  for (const sc of step.cmds ?? []) results.push(applyCommand(s, sc.c));
  if (step.h > 0) advanceWorld(s, step.h, { focusTankIds: full });
  for (const c of step.post ?? []) applyCommand(s, c);
  return { state: s, results };
}
