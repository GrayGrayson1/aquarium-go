/**
 * chunk 7 (REL-023; BACKLOG B-160) — water-type research gates hold in the game's rules, not only Build's screens:
 * buyTank refuses brackish, marine and reef water, and convertWaterClass the same, without their research, with the
 * screens' own wording (waterClassLock); with the research, both work as before.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { buyTank } from '@/sim/economy';
import { convertWaterClass } from '@/sim/tankOps';
import { unlock, waterClassLock } from '@/sim/facility';

const BRACKISH = 'Brackish water unlocks with the Brackish Estuaries research.';
const MARINE = 'Marine tanks unlock with the Marine Systems research.';
const REEF = 'Reef tanks unlock with the Reef Systems research (after Marine Systems).';

function world(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Gate', seed: 21 });
  g.finance.money = 50_000;
  for (const k of ['tank_40']) unlock(g, k);
  return g;
}

/** An empty fresh tank to convert (a tank with animals in it can't change water). */
function emptyTank(g: GameState): string {
  const r = buyTank(g, 'g20L', 'freshwater_tropical');
  expect(r.ok, r.message).toBe(true);
  return r.tankId!;
}

describe('B-160 (REL-023): the water research gates are rules', () => {
  it('waterClassLock: fresh water is open; brackish, marine and reef name their research', () => {
    const g = world();
    for (const w of ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted'] as WaterClass[]) expect(waterClassLock(g, w)).toBeNull();
    expect(waterClassLock(g, 'brackish')).toBe(BRACKISH);
    expect(waterClassLock(g, 'marine_fowlr')).toBe(MARINE);
    expect(waterClassLock(g, 'marine_live_rock')).toBe(MARINE);
    expect(waterClassLock(g, 'reef')).toBe(REEF);
    unlock(g, 'marine_basics');
    expect(waterClassLock(g, 'marine_fowlr')).toBeNull();
    expect(waterClassLock(g, 'reef')).toBe(REEF);
    unlock(g, 'reef');
    unlock(g, 'brackish');
    for (const w of ['brackish', 'marine_fowlr', 'marine_live_rock', 'reef'] as WaterClass[]) expect(waterClassLock(g, w)).toBeNull();
  });

  it('buyTank refuses each locked water without spending, and buys it once researched', () => {
    for (const [w, text, keys] of [
      ['brackish', BRACKISH, ['brackish']],
      ['marine_fowlr', MARINE, ['marine_basics']],
      ['marine_live_rock', MARINE, ['marine_basics']],
      ['reef', REEF, ['marine_basics', 'reef']],
    ] as [WaterClass, string, string[]][]) {
      const g = world();
      const money = g.finance.money;
      const tanks = g.tankOrder.length;
      const r = buyTank(g, 'g20L', w);
      expect(r.ok, w).toBe(false);
      expect(r.message).toBe(text);
      expect(g.finance.money).toBe(money);
      expect(g.tankOrder.length).toBe(tanks);
      for (const k of keys) unlock(g, k);
      const ok = buyTank(g, 'g20L', w);
      expect(ok.ok, `${w}: ${ok.message}`).toBe(true);
      expect(g.tanks[ok.tankId!].waterClass).toBe(w);
    }
  });

  it('convertWaterClass refuses each locked water without spending, and converts once researched', () => {
    for (const [w, text, keys] of [
      ['brackish', BRACKISH, ['brackish']],
      ['marine_fowlr', MARINE, ['marine_basics']],
      ['marine_live_rock', MARINE, ['marine_basics']],
      ['reef', REEF, ['marine_basics', 'reef']],
    ] as [WaterClass, string, string[]][]) {
      const g = world();
      const id = emptyTank(g);
      const money = g.finance.money;
      const r = convertWaterClass(g, id, w);
      expect(r.ok, w).toBe(false);
      expect(r.message).toBe(text);
      expect(g.finance.money).toBe(money);
      expect(g.tanks[id].waterClass).toBe('freshwater_tropical');
      for (const k of keys) unlock(g, k);
      const ok = convertWaterClass(g, id, w);
      expect(ok.ok, `${w}: ${ok.message}`).toBe(true);
      expect(g.tanks[id].waterClass).toBe(w);
    }
  });
});
