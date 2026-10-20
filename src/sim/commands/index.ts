/**
 * Player actions as data (SHARED-SHOPS.md §4): a command is a plain object a browser can send to the shared-shop
 * server and every copy can apply the same way. Chunk 10 starts the catalogue with the kinds its lockstep test sends
 * (the speed, feeding, a water change); chunk 11 adds every other player action, who sent it, and first one wins.
 */
import type { GameSpeed, GameState } from '@/types';
import { feedTank, waterChange, type ActionResult } from '../care';

export type FeedZone = 'surface' | 'middle' | 'bottom';

export type Command =
  | { k: 'setSpeed'; speed: GameSpeed }
  | { k: 'feedTank'; tank: string; food: string; zone?: FeedZone }
  | { k: 'waterChange'; tank: string; fraction: number };

export type CommandResult = ActionResult;

/** Apply one command: the same `src/sim` function the interface's action calls. */
export function applyCommand(state: GameState, cmd: Command): CommandResult {
  switch (cmd.k) {
    case 'setSpeed':
      state.clock.speed = cmd.speed;
      return { ok: true, message: '' };
    case 'feedTank':
      return feedTank(state, cmd.tank, cmd.food, cmd.zone ? { zone: cmd.zone } : {});
    case 'waterChange':
      return waterChange(state, cmd.tank, cmd.fraction);
  }
}

const SPEEDS: readonly number[] = [0, 1, 3, 10];
const ZONES: readonly string[] = ['surface', 'middle', 'bottom'];
/** Ids in the game are short; anything longer is malformed. */
const MAX_ID = 80;
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_ID;

/**
 * A command from the network, checked: a known kind, each argument's type and range, nothing else. Returns a fresh
 * object holding only the known fields, or null.
 */
export function validateCommand(x: unknown): Command | null {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return null;
  const c = x as Record<string, unknown>;
  switch (c.k) {
    case 'setSpeed':
      return typeof c.speed === 'number' && SPEEDS.includes(c.speed) ? { k: 'setSpeed', speed: c.speed as GameSpeed } : null;
    case 'feedTank': {
      if (!isId(c.tank) || !isId(c.food)) return null;
      if (c.zone !== undefined && !(typeof c.zone === 'string' && ZONES.includes(c.zone))) return null;
      return c.zone === undefined ? { k: 'feedTank', tank: c.tank, food: c.food } : { k: 'feedTank', tank: c.tank, food: c.food, zone: c.zone as FeedZone };
    }
    case 'waterChange':
      if (!isId(c.tank) || typeof c.fraction !== 'number' || !Number.isFinite(c.fraction) || c.fraction <= 0 || c.fraction > 1) return null;
      return { k: 'waterChange', tank: c.tank, fraction: c.fraction };
    default:
      return null;
  }
}
