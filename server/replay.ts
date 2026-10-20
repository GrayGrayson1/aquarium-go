/**
 * The cross-engine replay's step log (SHARED-SHOPS.md §9.2): a room runs a shop for some game hours with two members
 * looking at two tanks and a fixed script of commands, and the log is exactly what one member received: the welcome,
 * the snapshot and every step with the server's fingerprints. A browser replays it from the snapshot through the same
 * step block and compares each fingerprint.
 */
import type { GameState } from '@/types';
import type { Command } from '@/sim/commands';
import type { SharedStep } from '@/sim/sharedStep';
import type { ServerMessage } from '@/types/shared';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { Room, TICK_MS, type Outgoing } from './room';

export interface StepLog {
  /** The shop after step `n`, as JSON. */
  snapshot: string;
  n: number;
  full: string[];
  steps: SharedStep[];
  /** How many steps carry a fingerprint. */
  fingerprints: number;
}

/** A command now and then: a feed every 37 ticks, a water change every 101, on the tanks the members look at. */
function scripted(state: GameState, tick: number, tanks: string[]): Command | null {
  if (tick % 37 === 0) {
    const tank = tanks[(tick / 37) % tanks.length];
    const food = Object.keys(state.inventory.foods).find((f) => (state.inventory.foods[f] ?? 0) >= 1);
    return tank && food ? { k: 'feedTank', tank, food } : null;
  }
  if (tick % 101 === 0) return tanks[0] ? { k: 'waterChange', tank: tanks[0], fraction: 0.1 } : null;
  return null;
}

export function stepLog(state: GameState, opts: { speed: 1 | 3 | 10; hours: number; commands?: boolean }): StepLog {
  state.clock.speed = opts.speed;
  const got: Outgoing[] = [];
  const room = new Room(state, {
    send: (o) => {
      if (o.to.includes('a')) got.push(o);
    },
    gzip: () => new Uint8Array(0),
    later: () => {},
    now: () => 0,
  });
  room.join('a', 'A', true);
  room.join('b', 'B', true);
  const tanks = state.tankOrder.slice(0, 2);
  room.handle('a', { t: 'view', tank: tanks[0] ?? null });
  room.handle('b', { t: 'view', tank: tanks[1] ?? tanks[0] ?? null });
  const welcome = got.find((o) => o.kind === 'welcome')!;
  const snap = got.find((o) => o.kind === 'snapshot')!;
  const w = JSON.parse(welcome.text!) as Extract<ServerMessage, { t: 'welcome' }>;
  const ticks = Math.round(opts.hours / ((TICK_MS / 1000) * GAME_HOURS_PER_REAL_SECOND * opts.speed));
  for (let i = 1; i <= ticks; i++) {
    const c = opts.commands === false ? null : scripted(room.state, i, tanks);
    if (c) room.handle(i % 2 ? 'a' : 'b', { t: 'cmd', id: i, c });
    room.tick();
  }
  room.flush();
  const steps: SharedStep[] = [];
  for (const o of got) if (o.kind === 'steps') steps.push(...(JSON.parse(o.text!) as Extract<ServerMessage, { t: 'steps' }>).s);
  return {
    snapshot: new TextDecoder().decode(snap.bin!.subarray(1)),
    n: w.n,
    full: w.full,
    steps,
    fingerprints: steps.filter((s) => s.fp).length,
  };
}
