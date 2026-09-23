// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { manyTankWorld, findNonFinite } from '@/dev/fixtures/core-testkit';
import { communityFw, marineReef, bigFacility } from '@/dev/fixtures/core-fixtures';
import { encodeRecord } from '@/persistence';

describe('core performance & robustness', () => {
  // Wall-clock budget: retried so a busy machine (other jobs pinning the performance cores) doesn't fail it;
  // a real regression still fails every attempt.
  it('dozens of tanks advance 7 days in < 10 s', { retry: 2, timeout: 60_000 }, () => {
    const g = manyTankWorld(35, 5150, 8);
    expect(g.tankOrder.length).toBe(36);
    const t0 = performance.now();
    advanceWorld(g, 24 * 7, { focusTankId: g.tankOrder[0] });
    flushSimDebt(g);
    const ms = performance.now() - t0;
    console.info(`[core-perf] 36 tanks × 7 days: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(10_000);
    expect(findNonFinite(g)).toEqual([]);
  });

  it('the big facility advances a day quickly and saves under a few MB', () => {
    const g = bigFacility();
    const t0 = performance.now();
    advanceWorld(g, 24, { focusTankId: g.tankOrder[0] });
    const ms = performance.now() - t0;
    console.info(`[core-perf] big_facility × 1 day: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(5_000);
    const { text } = encodeRecord(g, 'auto');
    console.info(`[core-perf] big_facility save size: ${(text.length / 1024).toFixed(0)} KB`);
    expect(text.length).toBeLessThan(8 * 1024 * 1024);
  }, 60_000);

  it('no NaN / Infinity anywhere after 30 days (freshwater community + reef)', () => {
    for (const build of [communityFw, marineReef]) {
      const g = build();
      advanceWorld(g, 24 * 30, { focusTankId: g.tankOrder[0] });
      flushSimDebt(g);
      expect(findNonFinite(g)).toEqual([]);
      expect(g.clock.hour).toBeGreaterThan(24 * 30);
    }
  }, 120_000);
});
