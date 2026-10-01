/**
 * Fix lane ECON — valuation regressions: the prime window (S16-01) and the elder value cliff (S02-13).
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { lifeStageFor, ELDER_FRACTION } from '@/sim/life/growth';
import { creatureValue } from '@/sim/economy';
import { primeWindow } from '@/sim/economy/valuation';
import { primeFactor } from '@/sim/shows/judging';
import { getSpecies } from '@/data/species';

function aged(speciesId: string, ageDays: number) {
  const g = newGame({ starterId: 'betta', starterName: 'B', seed: 3 });
  const c = addCreature(g, createCreature(g, simRng(g), speciesId, { ageDays }), g.tankOrder[0]);
  c.stats.health = 100;
  delete c.illness;
  c.lifeStage = lifeStageFor(getSpecies(speciesId), ageDays);
  return { g, c, sp: getSpecies(speciesId) };
}
const stageFactor = (g: ReturnType<typeof aged>['g'], c: ReturnType<typeof aged>['c']) => creatureValue(g, c).factors.find((f) => /adult|elder|Prime/.test(f.label));

describe('S16-01 — the prime window is half of adult life, not adultDays (the age at full size)', () => {
  it('covers at least 45% of the adult (non-elder) life for every species', () => {
    for (const id of ['betta', 'pea_puffer', 'bumblebee_goby', 'axolotl', 'ocellaris_clownfish', 'fancy_guppy']) {
      const lc = getSpecies(id).lifecycle;
      const { primeEnd, elderAt } = primeWindow(lc);
      expect(elderAt).toBeCloseTo(lc.lifespanDays * ELDER_FRACTION, 6);
      expect((primeEnd - lc.juvenileDays) / (elderAt - lc.juvenileDays)).toBeGreaterThanOrEqual(0.45);
    }
  });

  it('a betta at day 40 and 60 is a prime adult for both the market and the show judges', () => {
    for (const age of [40, 60]) {
      const { g, c, sp } = aged('betta', age);
      expect(stageFactor(g, c)).toBeUndefined(); // ×1: no factor line
      expect(primeFactor(sp, c, g.clock.hour).phase).toBe('prime');
    }
    const late = aged('betta', 120);
    expect(stageFactor(late.g, late.c)?.label).toBe('Mature adult');
    expect(primeFactor(late.sp, late.c, late.g.clock.hour).phase).toBe('past');
  });
});

describe('S02-13 — turning elder is a gentle slope, not a value cliff', () => {
  it('value changes by under 5% across the elder boundary and keeps declining afterwards', () => {
    for (const id of ['betta', 'axolotl', 'ocellaris_clownfish', 'fancy_guppy']) {
      const lc = getSpecies(id).lifecycle;
      const elderAt = lc.lifespanDays * ELDER_FRACTION;
      const before = aged(id, elderAt - 1);
      const after = aged(id, elderAt + 1);
      expect(after.c.lifeStage).toBe('elder');
      const vb = creatureValue(before.g, before.c).total;
      const va = creatureValue(after.g, after.c).total;
      expect(Math.abs(va - vb) / vb).toBeLessThan(0.05);
      const old = aged(id, lc.lifespanDays * 0.95);
      expect(creatureValue(old.g, old.c).total).toBeLessThan(va * 0.85);
      // The show judge's prime factor is continuous there too.
      const fb = primeFactor(before.sp, before.c, before.g.clock.hour).f;
      const fa = primeFactor(after.sp, after.c, after.g.clock.hour).f;
      expect(Math.abs(fa - fb)).toBeLessThan(0.03);
    }
  });
});
