/**
 * Round-3 lane SIM (R01-03) — a listed tank holding a clutch of animals that aren't part of the sale no longer runs
 * a compatibility preview per animal per tank on every market step: siblings share one verdict per tank.
 */
import { describe, it, expect } from 'vitest';
import { FIXTURES } from '@/dev/fixtures';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature, creaturesInTank } from '@/sim/life';
import { createListing, devOpenMarket, devStepEconomy } from '@/sim/economy';

describe('R01-03 — blocked-sale check cost with unlisted residents', () => {
  it('40 same-species juveniles in a listed 300-gal tank cost little per market step, and the sale still checks out', () => {
    const g = FIXTURES.big_facility();
    devOpenMarket(g);
    const tid = g.tankOrder.find((id) => creaturesInTank(g, id).length >= 5 && g.tanks[id].environment === 'freshwater')!;
    expect(createListing(g, { kind: 'tank', tankId: tid, reserve: 0, durationHours: 120 }).ok).toBe(true);
    const sp = creaturesInTank(g, tid)[0].speciesId;
    for (let i = 0; i < 40; i++) {
      const c = addCreature(g, createCreature(g, simRng(g), sp, { ageDays: 30 }), tid);
      c.sizeCm = 1.5;
    }
    devStepEconomy(g, 0.1, { market: true }); // warm caches
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) devStepEconomy(g, 0.1, { market: true });
    const ms = (performance.now() - t0) / 20;
    expect(ms).toBeLessThan(12);
    const l = Object.values(g.market.listings).find((x) => x.tankId === tid && x.status === 'active');
    expect(l).toBeDefined();
    expect(l!.blocked).toBeUndefined();
  });
});
