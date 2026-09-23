// lane:perf2 — merged room-view scapes are cached by (lod, signature): reused on a room return, never stale.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { communityFw } from '@/dev/fixtures/core-fixtures';
import type { Tank } from '@/types';
import { decorSignature, getMergedDecor, mergedDecorCacheStats, mergedDecorKey, mergedDecorPerf, peekMergedDecor, releaseMergedDecor, retainMergedDecor } from './mergedDecorCache';

function decoratedTank(): Tank {
  const g = communityFw();
  const t = g.tankOrder.map((id) => g.tanks[id]).find((x) => x.decor.length > 0);
  if (!t) throw new Error('fixture has no decorated tank');
  return t;
}

describe('merged decor cache', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('hands the same scape back for the same lod + signature while it is kept', () => {
    const tank = decoratedTank();
    const a = getMergedDecor(tank, 1);
    retainMergedDecor(a);
    releaseMergedDecor(a); // the tank went into the tank view
    const b = getMergedDecor(tank, 1); // … and came back
    expect(b).toBe(a);
    expect(b.disposed).toBe(false);
    expect(Object.keys(b.geo).length).toBeGreaterThan(0);
    expect(peekMergedDecor(mergedDecorKey(1, decorSignature(tank)))).toBe(a);
    expect(getMergedDecor(tank, 2)).not.toBe(a); // other lod, other scape
  });

  it('a decor change gives a new scape and the superseded one is freed once nothing draws it', () => {
    const tank = decoratedTank();
    const a = getMergedDecor(tank, 1);
    retainMergedDecor(a);
    const moved = { ...tank, decor: tank.decor.map((d, i) => (i === 0 ? { ...d, x: d.x + 0.05 } : d)) };
    const b = getMergedDecor(moved, 1);
    expect(b).not.toBe(a);
    expect(a.disposed).toBe(false); // still drawn
    retainMergedDecor(b);
    releaseMergedDecor(a);
    expect(a.disposed).toBe(true);
    expect(peekMergedDecor(a.key)).toBeUndefined();
    releaseMergedDecor(b);
  });

  it('idle scapes expire; retained ones never do', () => {
    const tank = decoratedTank();
    const kept = getMergedDecor(tank, 2);
    retainMergedDecor(kept);
    const idle = getMergedDecor({ ...tank, id: `${tank.id}-copy`, decor: tank.decor.slice(0, 1) }, 2);
    vi.advanceTimersByTime(10 * 60_000);
    expect(idle.disposed).toBe(true);
    expect(kept.disposed).toBe(false);
    releaseMergedDecor(kept);
    vi.advanceTimersByTime(10 * 60_000);
    expect(kept.disposed).toBe(true);
    expect(mergedDecorCacheStats().referenced).toBe(0);
  });

  it('with the cache off every call builds a fresh scape, freed on release (the old behaviour)', () => {
    const tank = decoratedTank();
    mergedDecorPerf.cache = false;
    try {
      const a = getMergedDecor(tank, 1);
      const b = getMergedDecor(tank, 1);
      expect(b).not.toBe(a);
      retainMergedDecor(a);
      releaseMergedDecor(a);
      expect(a.disposed).toBe(true);
    } finally {
      mergedDecorPerf.cache = true;
    }
  });
});
