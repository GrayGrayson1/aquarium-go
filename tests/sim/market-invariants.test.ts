import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { mulberry32 } from '@/sim/rng';
import {
  createListing,
  withdrawListing,
  acceptBid,
  declineBid,
  counterBid,
  quickSell,
  buyOffer,
  buyTank,
  devOpenMarket,
  devStepEconomy,
  forceBuyerVisit,
} from '@/sim/economy';
import { findSpecies } from '@/data/species';

function checkInvariants(g: GameState, where: string): void {
  const active = g.market.listings.filter((l) => l.status === 'active');
  const listedIds = new Set(active.flatMap((l) => l.creatureIds));
  expect(Number.isFinite(g.finance.money), `${where}: money finite`).toBe(true);
  for (const c of Object.values(g.creatures)) {
    if (c.status === 'listed') expect(listedIds.has(c.id), `${where}: ${c.name} listed but in no active listing`).toBe(true);
    if (c.status === 'alive' || c.status === 'listed') {
      if (c.tankId !== null) expect(g.tanks[c.tankId], `${where}: ${c.name} points at a missing tank`).toBeDefined();
    }
    if (c.status === 'sold') expect(c.tankId).toBeNull();
  }
  for (const l of active) {
    // Each creature belongs to at most one active listing.
    for (const id of l.creatureIds) expect(active.filter((x) => x.creatureIds.includes(id)).length).toBe(1);
    if (l.kind === 'tank') {
      expect(g.tanks[l.tankId!], `${where}: active tank listing without tank`).toBeDefined();
      expect(g.tanks[l.tankId!].listingId).toBe(l.id);
    }
    for (const b of l.bids) {
      expect(Number.isFinite(b.amount) && b.amount > 0, `${where}: bid amount`).toBe(true);
      expect(Number.isFinite(b.expiresHour)).toBe(true);
    }
    expect(l.interest >= 0 && l.interest <= 1).toBe(true);
  }
  for (const t of Object.values(g.tanks)) {
    if (t.listingId) expect(active.some((l) => l.id === t.listingId), `${where}: tank.listingId dangling`).toBe(true);
  }
  for (const l of g.market.listings.filter((x) => x.status === 'sold')) {
    expect(l.bids.filter((b) => b.status === 'accepted').length, `${where}: exactly one accepted bid`).toBe(1);
  }
  for (const o of g.market.stock) for (const c of o.creatures) expect(g.creatures[c.id]).toBeUndefined();
  for (const d of Object.values(g.market.demand)) expect(d >= 0.6 && d <= 1.6).toBe(true);
}

function fuzz(seed: number, steps: number): GameState {
  const g = newGame({ starterId: seed % 2 ? 'axolotl' : 'betta', starterName: 'Fuzz', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 3000;
  const r = mulberry32(seed * 7919);
  const pick = <T,>(a: T[]): T | undefined => (a.length ? a[Math.floor(r.next() * a.length)] : undefined);
  let totalIn = 0;
  for (let i = 0; i < steps; i++) {
    const roll = r.next();
    const alive = Object.values(g.creatures).filter((c) => c.status === 'alive');
    const active = g.market.listings.filter((l) => l.status === 'active');
    const open = active.flatMap((l) => l.bids.filter((b) => b.status === 'open').map((b) => ({ l, b })));
    if (roll < 0.18) {
      const c = pick(alive);
      if (c) createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: Math.round(r.next() * 40), durationHours: 6 + r.next() * 60 });
    } else if (roll < 0.26) {
      const sameSpecies = alive.filter((c) => c.speciesId === alive[0]?.speciesId).slice(0, 3);
      if (sameSpecies.length >= 2) createListing(g, { kind: 'group', creatureIds: sameSpecies.map((c) => c.id), reserve: 0, durationHours: 24 });
    } else if (roll < 0.32) {
      const t = pick(g.tankOrder);
      if (t) createListing(g, { kind: 'tank', tankId: t, reserve: 0, buyNow: r.chance(0.3) ? 400 + Math.round(r.next() * 800) : undefined, durationHours: 12 + r.next() * 48 });
    } else if (roll < 0.44) {
      const x = pick(open);
      if (x) {
        const before = g.finance.money;
        const res = acceptBid(g, x.l.id, x.b.id);
        if (res.ok) {
          totalIn += x.b.amount;
          expect(g.finance.money).toBeCloseTo(before + x.b.amount, 2);
          // Accepting again must never pay twice.
          expect(acceptBid(g, x.l.id, x.b.id).ok).toBe(false);
          expect(g.finance.money).toBeCloseTo(before + x.b.amount, 2);
        } else expect(g.finance.money).toBe(before);
      }
    } else if (roll < 0.5) {
      const x = pick(open);
      if (x) counterBid(g, x.l.id, x.b.id, Math.round(x.b.amount * (1.01 + r.next() * 0.6)));
    } else if (roll < 0.53) {
      const x = pick(open);
      if (x) declineBid(g, x.l.id, x.b.id);
    } else if (roll < 0.58) {
      const l = pick(active);
      if (l) withdrawListing(g, l.id);
    } else if (roll < 0.66) {
      const o = pick(g.market.stock);
      const sp = o ? findSpecies(o.speciesId) : undefined;
      const t = sp ? g.tankOrder.find((id) => g.tanks[id].environment === sp.environment) : undefined;
      if (o && t) {
        const before = g.finance.money;
        const res = buyOffer(g, o.id, t);
        if (!res.ok) expect(g.finance.money).toBe(before);
        expect(g.finance.money).toBeGreaterThanOrEqual(Math.min(0, before));
      }
    } else if (roll < 0.7) {
      const c = pick(alive.filter((x) => !x.isStarter));
      if (c) quickSell(g, [c.id]);
    } else if (roll < 0.74) {
      const listed = Object.values(g.creatures).filter((c) => c.status === 'listed');
      const c = pick(listed);
      if (c) {
        if (r.chance(0.5)) c.status = 'dead';
        else {
          c.stats.health = 30;
          c.illness = { kind: 'fin_rot', severity: 0.5, sinceHour: g.clock.hour };
        }
      }
    } else if (roll < 0.77) {
      const before = g.finance.money;
      const res = buyTank(g, 'g10', r.chance(0.5) ? 'freshwater_tropical' : 'freshwater_cool');
      if (!res.ok) expect(g.finance.money).toBe(before);
    } else if (roll < 0.8) {
      const t = pick(g.tankOrder);
      if (t && g.tanks[t].decor.length) g.tanks[t].decor.pop();
    } else if (roll < 0.9) {
      const l = pick(active);
      if (l) forceBuyerVisit(g, l.id);
    }
    devStepEconomy(g, 0.5 + r.next() * 4, { finance: true });
    checkInvariants(g, `seed ${seed} step ${i}`);
  }
  expect(totalIn).toBeGreaterThanOrEqual(0);
  return g;
}

describe('market: invariants under random play', () => {
  it('no duplication, no dangling references, no NaN — across many seeds', () => {
    for (let s = 1; s <= 8; s++) fuzz(s, 140);
  });

  it('is deterministic under the same random play', () => {
    const a = fuzz(4242, 60);
    const b = fuzz(4242, 60);
    expect(JSON.stringify(a.market)).toEqual(JSON.stringify(b.market));
    expect(JSON.stringify(a.finance)).toEqual(JSON.stringify(b.finance));
  });
});
