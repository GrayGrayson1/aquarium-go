// @vitest-environment node
/**
 * Chunk 10 (SHARED-SHOPS.md §3.2 rules 2 and 4, §4.1): shared shops' step block, the full-detail list and the first
 * commands. The step block runs a step on a copy and drops it whole when it throws; the commands do what the
 * interface's actions do, survive the network, and refuse anything malformed.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { encodeRecord, decodeRecord } from '@/persistence/serialize';
import { stateHash } from '@/persistence/hash';
import { tankLod } from '@/sim/world';
import { feedTank, waterChange } from '@/sim/care';
import { deepClone } from '@/sim/clone';
import { runSharedStep } from '@/sim/sharedStep';
import { applyCommand, validateCommand, type Command } from '@/sim/commands';

/** A shop as the server loads one: saved, then decoded (migrated and repaired). */
const shop = (name: string): GameState => decodeRecord(encodeRecord(FIXTURES[name](), 'shared', 0).text).state;

describe('chunk 10: the step block', () => {
  it('runs on a copy when asked, leaving the original untouched', () => {
    const g = shop('playthrough_betta');
    const before = stateHash(g);
    const { state } = runSharedStep(g, { n: 1, h: 0.25 }, [g.tankOrder[0]], { copy: true });
    expect(state).not.toBe(g);
    expect(stateHash(g)).toBe(before);
    expect(state.clock.hour).toBeCloseTo(g.clock.hour + 0.25, 9);
  });

  it('runs in place without a copy, and both ways give the same result', () => {
    const a = shop('playthrough_betta');
    const b = deepClone(a);
    const full = [a.tankOrder[0]];
    const food = Object.keys(a.inventory.foods).find((f) => (a.inventory.foods[f] ?? 0) >= 1)!;
    const step = { n: 1, h: 0.25, cmds: [{ by: 'm1', id: 1, c: { k: 'feedTank', tank: full[0], food } as Command }] };
    const viaCopy = runSharedStep(a, step, full, { copy: true }).state;
    const inPlace = runSharedStep(b, step, full);
    expect(inPlace.state).toBe(b);
    expect(stateHash(b)).toBe(stateHash(viaCopy));
    expect(inPlace.results[0].ok).toBe(true);
  });

  it('a block that throws leaves the copy as it was', () => {
    const g = shop('playthrough_betta');
    const ghost = deepClone(g.tanks[g.tankOrder[0]]);
    ghost.id = 'ghost';
    (ghost as unknown as { water: null }).water = null; // a water change on it throws
    g.tanks.ghost = ghost;
    const before = stateHash(g);
    expect(() => runSharedStep(g, { n: 1, h: 0, cmds: [{ by: 'm1', c: { k: 'waterChange', tank: 'ghost', fraction: 0.2 } }] }, [], { copy: true })).toThrow();
    expect(stateHash(g)).toBe(before);
  });

  it('steps every tank on the full-detail list at full fidelity (rule 4), and only those', () => {
    const g = shop('big_facility');
    const [a, b, c] = g.tankOrder;
    const opts = { focusTankIds: [a, c] };
    expect(tankLod(g, a, opts)).toBe('full');
    expect(tankLod(g, b, opts)).not.toBe('full');
    expect(tankLod(g, c, opts)).toBe('full');
    // the solo game's single focus is unchanged
    expect(tankLod(g, b, { focusTankId: b })).toBe('full');
    expect(tankLod(g, a, { focusTankId: b })).not.toBe('full');
    const { state } = runSharedStep(g, { n: 1, h: 0.25 }, [a, c], { copy: true });
    expect(state.tanks[a].simDebtHours ?? 0).toBe(0);
    expect(state.tanks[c].simDebtHours ?? 0).toBe(0);
    expect(state.tanks[b].simDebtHours ?? 0).toBeCloseTo(0.25, 9);
  });
});

describe('chunk 10: the first commands (SHARED-SHOPS.md §4.1)', () => {
  it('each does what the interface action does: the same fingerprint as calling the sim function', () => {
    const g = shop('playthrough_betta');
    const tank = g.tankOrder[0];
    const food = Object.keys(g.inventory.foods).find((f) => (g.inventory.foods[f] ?? 0) >= 1)!;
    const cases: [Command, (s: GameState) => void][] = [
      [{ k: 'feedTank', tank, food }, (s) => void feedTank(s, tank, food, {})],
      [{ k: 'feedTank', tank, food, zone: 'bottom' }, (s) => void feedTank(s, tank, food, { zone: 'bottom' })],
      [{ k: 'waterChange', tank, fraction: 0.25 }, (s) => void waterChange(s, tank, 0.25)],
      [{ k: 'setSpeed', speed: 3 }, (s) => void (s.clock.speed = 3)],
    ];
    for (const [cmd, direct] of cases) {
      const a = deepClone(g);
      const b = deepClone(g);
      applyCommand(a, cmd);
      direct(b);
      expect(stateHash(a), cmd.k).toBe(stateHash(b));
      expect(stateHash(a), cmd.k).not.toBe(stateHash(g));
    }
  });

  it('every command survives the network unchanged and passes validation as itself', () => {
    const cmds: Command[] = [
      { k: 'setSpeed', speed: 0 },
      { k: 'setSpeed', speed: 10 },
      { k: 'feedTank', tank: 'tank_1', food: 'micro_pellets' },
      { k: 'feedTank', tank: 'tank_1', food: 'micro_pellets', zone: 'surface' },
      { k: 'waterChange', tank: 'tank_1', fraction: 0.5 },
    ];
    for (const c of cmds) {
      const wire = JSON.parse(JSON.stringify(c)) as unknown;
      expect(wire).toEqual(c);
      expect(validateCommand(wire)).toEqual(c);
    }
  });

  it('validation refuses unknown kinds, wrong types, out-of-range values and extra fields', () => {
    const bad: unknown[] = [
      null,
      'setSpeed',
      [],
      {},
      { k: 'deleteEverything' },
      { k: 'setSpeed', speed: 2 },
      { k: 'setSpeed', speed: '10' },
      { k: 'feedTank', tank: 'tank_1' },
      { k: 'feedTank', tank: 7, food: 'micro_pellets' },
      { k: 'feedTank', tank: 'x'.repeat(81), food: 'micro_pellets' },
      { k: 'feedTank', tank: 'tank_1', food: 'micro_pellets', zone: 'sky' },
      { k: 'waterChange', tank: 'tank_1', fraction: 0 },
      { k: 'waterChange', tank: 'tank_1', fraction: 1.5 },
      { k: 'waterChange', tank: 'tank_1', fraction: Number.NaN },
    ];
    for (const x of bad) expect(validateCommand(x), JSON.stringify(x)).toBeNull();
    // fields it doesn't know are dropped, never passed on
    expect(validateCommand({ k: 'setSpeed', speed: 1, by: 'someone else', __proto__x: 1 })).toEqual({ k: 'setSpeed', speed: 1 });
  });
});
