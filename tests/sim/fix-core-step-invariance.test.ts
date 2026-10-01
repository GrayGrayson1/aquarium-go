// @vitest-environment node
/**
 * lane:fix-core (G1-06) — step-size invariance. The loop steps the world in slices whose size depends on the speed
 * setting (1× ≈ 0.025 h per tick, 10× 0.25 h; offline catch-up 0.5 h). Nothing the player owns should depend on
 * that: visitors, revenue, reputation and bids must agree (within Poisson/EMA noise, averaged over seeds) whether a
 * day is simulated in 960 small steps or 48 big ones. Every per-step probability, cap or sample count that is not
 * scaled by dt shows up here.
 *
 * The visitor and market steppers are run alone (tanks frozen, like the audit's probes) so tank chaos cannot mask
 * a coupling; a whole-world run checks the composite.
 */
import { describe, it, expect } from 'vitest';
import { FIXTURES } from '@/dev/fixtures';
import { makeContext } from '@/sim/context';
import { stepVisitors } from '@/sim/facility';
import { stepMarket, createListing } from '@/sim/economy';
import { advanceWorld, refreshTankCache } from '@/sim/world';
import type { GameState } from '@/types';

const DTS = [0.025, 0.25, 0.5];
const SEEDS = 4;

function frozen(fixture: keyof typeof FIXTURES): string {
  const base = FIXTURES[fixture]();
  base.isShowcase = false;
  for (const id of base.tankOrder) refreshTankCache(base, base.tanks[id]);
  return JSON.stringify(base);
}

function withSeed(snap: string, s: number): GameState {
  const g: GameState = JSON.parse(snap);
  g.rngState = (g.rngState + s * 7919) >>> 0;
  return g;
}

/** Relative spread of a set of numbers around their mean (0 = identical). */
function spread(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const scale = Math.max(Math.abs(mean), 1e-9);
  return Math.max(...values.map((v) => Math.abs(v - mean))) / scale;
}

function visitorsAt(snap: string, dt: number, days: number) {
  let visitors = 0;
  let revenue = 0;
  let rep = 0;
  for (let s = 0; s < SEEDS; s++) {
    const g = withSeed(snap, s);
    const rep0 = g.progress.reputation;
    const money0 = g.finance.money;
    const end = g.clock.hour + days * 24;
    while (g.clock.hour < end - 1e-9) {
      const ctx = makeContext(g, dt, 'full');
      stepVisitors(g, dt, ctx);
      g.clock.hour += dt;
    }
    visitors += g.visitors.totalVisitors;
    revenue += g.finance.money - money0;
    rep += g.progress.reputation - rep0;
  }
  return { visitors: visitors / SEEDS, revenue: revenue / SEEDS, rep: rep / SEEDS };
}

function bidsAt(snap: string, dt: number, hours: number) {
  let bids = 0;
  let sold = 0;
  for (let s = 0; s < SEEDS; s++) {
    const g = withSeed(snap, s);
    const end = g.clock.hour + hours;
    while (g.clock.hour < end - 1e-9) {
      const ctx = makeContext(g, dt, 'full');
      stepMarket(g, dt, ctx);
      g.clock.hour += dt;
    }
    for (const l of g.market.listings) {
      bids += l.bids.length;
      if (l.status === 'sold') sold++;
    }
  }
  return { bids: bids / SEEDS, sold: sold / SEEDS };
}

describe('step-size invariance', () => {
  it('visitors alone (facility_shop, 10 days): arrivals, revenue and reputation agree across 0.025 / 0.25 / 0.5 h steps', () => {
    const snap = frozen('facility_shop');
    const rows = DTS.map((dt) => ({ dt, ...visitorsAt(snap, dt, 10) }));
    const detail = rows.map((r) => `dt=${r.dt}: visitors ${r.visitors.toFixed(0)} revenue $${r.revenue.toFixed(0)} rep +${r.rep.toFixed(1)}`).join(' | ');
    expect(spread(rows.map((r) => r.visitors)), `visitors — ${detail}`).toBeLessThan(0.1);
    expect(spread(rows.map((r) => r.revenue)), `revenue — ${detail}`).toBeLessThan(0.15);
    expect(spread(rows.map((r) => r.rep)), `reputation — ${detail}`).toBeLessThan(0.25);
  });

  it('market alone (6 identical listings, 80 h): bids and sales agree across step sizes', () => {
    const base = FIXTURES.big_facility();
    base.isShowcase = false;
    for (const id of base.tankOrder) refreshTankCache(base, base.tanks[id]);
    base.market.listings = [];
    const adults = Object.values(base.creatures).filter((c) => c.status === 'alive' && c.lifeStage === 'adult' && c.tankId).slice(0, 6);
    for (const c of adults) expect(createListing(base, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 72 }).ok).toBe(true);
    const snap = JSON.stringify(base);
    const rows = DTS.map((dt) => ({ dt, ...bidsAt(snap, dt, 80) }));
    const detail = rows.map((r) => `dt=${r.dt}: bids ${r.bids.toFixed(1)} sold ${r.sold.toFixed(1)}`).join(' | ');
    expect(spread(rows.map((r) => r.bids)), `bids — ${detail}`).toBeLessThan(0.25);
    expect(spread(rows.map((r) => r.sold)), `sold — ${detail}`).toBeLessThan(0.25);
  });

  it('a hatch of N young earns the same reputation whether it lands in one big step or many small ones', () => {
    // community_fw hatches ~50 cherry shrimp around day 11 (the audit saw 159.8 vs 78.8 from hatch batching).
    const snap = frozen('community_fw');
    const rows = [0.025, 0.25, 0.5].map((dt) => {
      const g: GameState = JSON.parse(snap);
      const focus = g.tankOrder[0];
      for (let h = 0; h < 12 * 24 - 1e-9; h += dt) advanceWorld(g, dt, { focusTankId: focus });
      return { dt, rep: g.progress.reputation, births: g.progress.counters.births ?? 0 };
    });
    const detail = rows.map((r) => `dt=${r.dt}: rep ${r.rep.toFixed(1)} births ${r.births}`).join(' | ');
    expect(rows.every((r) => r.births > 0), detail).toBe(true);
    expect(spread(rows.map((r) => r.births)), `births — ${detail}`).toBeLessThan(0.2);
    expect(spread(rows.map((r) => r.rep)), `reputation — ${detail}`).toBeLessThan(0.15);
  });

  it('whole world (community_fw, 4 days): money and reputation agree across step sizes', () => {
    const snap = frozen('community_fw');
    const seeds = 3;
    const rows = DTS.map((dt) => {
      let money = 0;
      let rep = 0;
      for (let s = 0; s < seeds; s++) {
        const g = withSeed(snap, s);
        const money0 = g.finance.money;
        const rep0 = g.progress.reputation;
        const focus = g.tankOrder[0];
        for (let h = 0; h < 4 * 24 - 1e-9; h += dt) advanceWorld(g, dt, { focusTankId: focus });
        money += g.finance.money - money0;
        rep += g.progress.reputation - rep0;
      }
      return { dt, money: money / seeds, rep: rep / seeds };
    });
    const detail = rows.map((r) => `dt=${r.dt}: money ${r.money.toFixed(0)} rep ${r.rep.toFixed(1)}`).join(' | ');
    expect(spread(rows.map((r) => r.money)), `money — ${detail}`).toBeLessThan(0.25);
    expect(spread(rows.map((r) => r.rep)), `reputation — ${detail}`).toBeLessThan(0.35);
  });
});
