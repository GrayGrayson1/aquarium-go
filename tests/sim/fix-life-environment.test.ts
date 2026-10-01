/**
 * Fix lane LIFE — breeding uses the shared salinity model (S02-05): sailfin mollies sold for a freshwater community
 * can breed there (readiness > 0, no hard "need brackish water" blocker), while a truly wrong environment still blocks.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState, Sex, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { feedTank } from '@/sim/care';
import { breedingCheck } from '@/sim/life/breeding';
import { getSpecies } from '@/data/species';
import { readinessTarget, makeTankInfo, spawningWaterIssue, youngWaterSeverity } from '@/sim/life/breeding/common';

vi.setConfig({ testTimeout: 240_000 });

function mollies(wc: WaterClass, days: number) {
  const g: GameState = newGame({ starterId: 'betta', starterName: 'Solo', seed: 2222 });
  const tank = createTank(g, 'g29', wc, { cycled: true, name: 'Community Tank' });
  const add = (sex: Sex, i: number) => addCreature(g, createCreature(g, simRng(g), 'sailfin_molly', { sex, ageDays: 16, name: `${sex}${i}`, captiveBred: true }), tank.id);
  const m = add('male', 0);
  const f = add('female', 0);
  g.inventory.foods['flake_tropical'] = 9999;
  for (let h = 0; h < 24 * days; h++) {
    if (h % 12 === 0) feedTank(g, tank.id, 'flake_tropical', {});
    for (const t of Object.values(g.tanks)) {
      t.water.ammonia = Math.min(t.water.ammonia, 0.05);
      t.water.nitrite = Math.min(t.water.nitrite, 0.05);
      t.water.nitrate = Math.min(t.water.nitrate, 20);
      for (const eq of t.equipment) eq.failed = false;
    }
    advanceWorld(g, 1, { forceFull: true });
  }
  return { g, tank, m, f };
}

describe('S02-05 — brackish livebearers in a tolerated freshwater tank', () => {
  it('build breeding readiness and are only softly nudged toward brackish water', () => {
    const { g, tank, m, f } = mollies('freshwater_tropical', 5);
    expect(f.stats.breedingReadiness).toBeGreaterThan(30);
    const sp = getSpecies('sailfin_molly');
    const info = makeTankInfo(g, tank, g.clock.hour, () => []);
    const target = readinessTarget(tank, f, sp, g.clock.hour, info);
    expect(target).toBeGreaterThan(0);
    const check = breedingCheck(g, m.id, f.id);
    expect(check.reasons.join(' ')).not.toMatch(/need brackish water/);
    expect(spawningWaterIssue(tank, sp)).toBeNull();
    expect(youngWaterSeverity(tank, sp)).toBeLessThan(2);
  });

  it('a marine tank still blocks a freshwater species outright', () => {
    const g: GameState = newGame({ starterId: 'betta', starterName: 'Solo', seed: 1 });
    const tank = createTank(g, 'g29', 'reef', { cycled: true, name: 'Reef' });
    const sp = getSpecies('fancy_guppy');
    expect(spawningWaterIssue(tank, sp)).toMatch(/need fresh water/);
    expect(youngWaterSeverity(tank, sp)).toBe(6);
  });
});
