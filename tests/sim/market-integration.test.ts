import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { createListing, acceptBid, devOpenMarket, buyOffer, buyTank } from '@/sim/economy';
import { findSpecies, STARTER_IDS } from '@/data/species';

/** Full-world integration: the market running inside advanceWorld next to every other subsystem. */
describe('market: integration with the whole simulation', () => {
  it('every starter path can buy, list and sell over a week of game time', () => {
    let totalSales = 0;
    for (const starterId of STARTER_IDS) {
      const g = newGame({ starterId, starterName: 'Soak', seed: 31337 });
      devOpenMarket(g);
      g.finance.money = 2000;
      for (let day = 0; day < 6; day++) {
        const home = g.tanks[g.tankOrder[0]];
        const o = home ? g.market.stock.find((x) => findSpecies(x.speciesId)?.environment === home.environment) : undefined;
        if (o && home) buyOffer(g, o.id, home.id);
        if (day === 1 && home) expect(buyTank(g, 'g20L', home.waterClass).ok).toBe(true);
        const c = Object.values(g.creatures).find((x) => x.status === 'alive' && !x.isStarter);
        if (c) createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 24 });
        if (day === 3 && g.tankOrder[1]) expect(createListing(g, { kind: 'tank', tankId: g.tankOrder[1], reserve: 0, durationHours: 48 }).ok).toBe(true);
        for (let h = 0; h < 24; h += 3) {
          advanceWorld(g, 3, { focusTankId: g.tankOrder[0] });
          for (const l of g.market.listings.filter((x) => x.status === 'active')) {
            const b = l.bids.filter((x) => x.status === 'open').sort((a, z) => z.amount - a.amount)[0];
            if (b && acceptBid(g, l.id, b.id).ok) totalSales++;
          }
        }
      }
      expect(Number.isFinite(g.finance.money)).toBe(true);
      expect(g.finance.daily.length).toBeGreaterThanOrEqual(5);
      for (const c of Object.values(g.creatures)) {
        if ((c.status === 'alive' || c.status === 'listed') && c.tankId) expect(g.tanks[c.tankId]).toBeDefined();
      }
      for (const t of Object.values(g.tanks)) if (t.listingId) expect(g.market.listings.some((l) => l.id === t.listingId && l.status === 'active')).toBe(true);
    }
    expect(totalSales).toBeGreaterThan(5);
  });
});
