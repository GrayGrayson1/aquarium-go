// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { createTank } from '@/sim/tanks';
import { feedTank, waterChange } from '@/sim/care';
import { stateHash, encodeRecord, decodeRecord } from '@/persistence';
import { stockTank } from '@/dev/fixtures/core-helpers';

/** A fixed action script touching every subsystem through public mutators. */
function part1(seed: number): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Det', seed });
  g.isShowcase = false;
  const tank = g.tankOrder[0];
  advanceWorld(g, 6, { focusTankId: tank });
  const food = Object.keys(g.inventory.foods)[0];
  if (food) feedTank(g, tank, food);
  const t2 = createTank(g, 'g20L', 'freshwater_planted', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 } });
  stockTank(g, t2.id, [{ species: ['neon_tetra', 'betta'], count: 6, sex: 'females' }]);
  advanceWorld(g, 30, { focusTankId: t2.id });
  waterChange(g, tank, 0.25);
  advanceWorld(g, 20, { focusTankId: null });
  return g;
}

function part2(g: GameState): GameState {
  const tank = g.tankOrder[0];
  const food = Object.keys(g.inventory.foods)[0];
  if (food) feedTank(g, tank, food);
  advanceWorld(g, 36, { focusTankId: tank });
  flushSimDebt(g);
  return g;
}

describe('core determinism', () => {
  it('same seed + same actions → identical snapshot hash', () => {
    const a = part2(part1(1234));
    const b = part2(part1(1234));
    expect(stateHash(a)).toBe(stateHash(b));
  });

  it('different seeds diverge', () => {
    expect(stateHash(part2(part1(1234)))).not.toBe(stateHash(part2(part1(9876))));
  });

  it('a save/load in the middle does not change the outcome', () => {
    const straight = part2(part1(4321));
    const saved = decodeRecord(encodeRecord(part1(4321), 'auto').text).state;
    const resumed = part2(saved);
    expect(stateHash(resumed)).toBe(stateHash(straight));
  });

  it('the hash ignores wall-clock fields', () => {
    const g = part1(77);
    const h = stateHash(g);
    g.lastTickRealMs += 1e6;
    g.lastSavedRealMs += 1e6;
    g.saveId = 'other';
    expect(stateHash(g)).toBe(h);
  });
});
