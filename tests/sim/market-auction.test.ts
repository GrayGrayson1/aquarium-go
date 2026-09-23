import { describe, it, expect } from 'vitest';
import type { Bid, Creature, GameState, Listing, Sex } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import {
  createListing,
  withdrawListing,
  acceptBid,
  declineBid,
  counterBid,
  quickSell,
  previewListing,
  suggestPricing,
  forceBuyerVisit,
  devOpenMarket,
  devStepEconomy,
  buyTank,
  creatureValue,
} from '@/sim/economy';

function world(seed = 1): GameState {
  const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 500;
  return g;
}

function animal(g: GameState, tankId: string | null, opts: { sex?: Sex; ageDays?: number; speciesId?: string } = {}): Creature {
  const c = createCreature(g, simRng(g), opts.speciesId ?? 'axolotl', { sex: opts.sex, ageDays: opts.ageDays ?? 30 });
  c.stats.health = 100;
  delete c.illness;
  return addCreature(g, c, tankId);
}

const listing = (g: GameState, id: string): Listing => g.market.listings.find((l) => l.id === id)!;
const openBids = (l: Listing): Bid[] => l.bids.filter((b) => b.status === 'open');
const best = (l: Listing): Bid | undefined => openBids(l).sort((a, b) => b.amount - a.amount)[0];

/** Make buyers look until at least `n` open bids exist (deterministic). */
function ensureBids(g: GameState, id: string, n = 1): void {
  for (let i = 0; i < 80 && openBids(listing(g, id)).length < n && listing(g, id).status === 'active'; i++) forceBuyerVisit(g, id);
}

function listCreature(g: GameState, extra: Partial<Parameters<typeof createListing>[1]> = {}) {
  const c = animal(g, g.tankOrder[0]);
  const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 48, ...extra });
  expect(r.ok).toBe(true);
  return { c, id: r.listingId! };
}

describe('market: listing validation', () => {
  it('requires the marketplace unlock', () => {
    const g = world(2);
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'market_listings' && k !== 'tank_auctions');
    const c = animal(g, g.tankOrder[0]);
    expect(createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 24 }).ok).toBe(false);
    expect(previewListing(g, { kind: 'creature', creatureIds: [c.id] }).ok).toBe(false);
  });

  it('rejects dead, sold, already-listed and duplicate contents', () => {
    const g = world(3);
    const dead = animal(g, g.tankOrder[0]);
    dead.status = 'dead';
    expect(createListing(g, { kind: 'creature', creatureIds: [dead.id], reserve: 0, durationHours: 24 }).ok).toBe(false);
    const c = animal(g, g.tankOrder[0]);
    expect(createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 24 }).ok).toBe(true);
    expect(c.status).toBe('listed');
    const again = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 24 });
    expect(again.ok).toBe(false);
    expect(again.message).toMatch(/already listed/i);
    expect(createListing(g, { kind: 'creature', creatureIds: ['nope'], reserve: 0, durationHours: 24 }).ok).toBe(false);
    // The tank now holds a listed animal, so it can't be listed whole.
    expect(createListing(g, { kind: 'tank', tankId: g.tankOrder[0], reserve: 0, durationHours: 24 }).ok).toBe(false);
  });

  it('pairs must be biologically meaningful', () => {
    const g = world(4);
    const t = g.tankOrder[0];
    const m1 = animal(g, t, { sex: 'male' });
    const m2 = animal(g, t, { sex: 'male' });
    const f1 = animal(g, t, { sex: 'female' });
    const young = animal(g, t, { ageDays: 3 });
    const same = createListing(g, { kind: 'pair', creatureIds: [m1.id, m2.id], reserve: 0, durationHours: 24 });
    expect(same.ok).toBe(false);
    if (m1.sex === 'male' && m2.sex === 'male') expect(same.message).toMatch(/male and one female/i);
    if (young.sex === 'unknown' || ['egg', 'larva', 'fry', 'juvenile'].includes(young.lifeStage)) {
      expect(createListing(g, { kind: 'pair', creatureIds: [m1.id, young.id], reserve: 0, durationHours: 24 }).ok).toBe(false);
    }
    if (m1.sex === 'male' && f1.sex === 'female') expect(createListing(g, { kind: 'pair', creatureIds: [m1.id, f1.id], reserve: 0, durationHours: 24 }).ok).toBe(true);
  });

  it('groups must be one species; juvenile batches only juveniles; buy-now ≥ reserve', () => {
    const g = world(5);
    const t = g.tankOrder[0];
    const a = animal(g, t);
    const b = animal(g, null, { speciesId: 'betta' });
    expect(createListing(g, { kind: 'group', creatureIds: [a.id, b.id], reserve: 0, durationHours: 24 }).ok).toBe(false);
    const adult = animal(g, t, { ageDays: 60 });
    expect(createListing(g, { kind: 'juveniles', creatureIds: [adult.id], reserve: 0, durationHours: 24 }).ok).toBe(false);
    expect(createListing(g, { kind: 'creature', creatureIds: [a.id], reserve: 100, buyNow: 50, durationHours: 24 }).ok).toBe(false);
    expect(createListing(g, { kind: 'creature', creatureIds: [a.id], reserve: -5, durationHours: 24 }).ok).toBe(false);
  });

  it('a tank listing snapshots exactly its contents', () => {
    const g = world(6);
    const tankId = g.tankOrder[0];
    const extra = animal(g, tankId);
    const inTank = Object.values(g.creatures).filter((c) => c.tankId === tankId && c.status === 'alive').map((c) => c.id);
    const pv = previewListing(g, { kind: 'tank', tankId });
    expect(pv.ok).toBe(true);
    expect(pv.warnings.some((w) => /last aquarium/i.test(w))).toBe(true);
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 24, photo: 'data:image/png;base64,AAA' });
    expect(r.ok).toBe(true);
    const l = listing(g, r.listingId!);
    expect(l.creatureIds.sort()).toEqual(inTank.sort());
    expect(l.snapshot.creatureIds.sort()).toEqual(inTank.sort());
    expect(l.snapshot.tankId).toBe(tankId);
    expect(l.snapshot.photo).toMatch(/^data:image/);
    expect(l.snapshot.valuation).toBeGreaterThan(0);
    expect(l.snapshot.summary.length).toBeGreaterThan(10);
    expect(g.tanks[tankId].listingId).toBe(l.id);
    expect(extra.status).toBe('listed');
    expect(createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 24 }).ok).toBe(false);
    const sp = suggestPricing(g, { kind: 'creature', creatureIds: [animal(g, null).id] });
    expect(sp.reserve).toBeLessThan(sp.expected);
    expect(sp.buyNow).toBeGreaterThan(sp.expected);
  });
});

describe('market: auction lifecycle', () => {
  it('create → bids arrive over time (advanceWorld) → accept → ownership transferred', () => {
    const g = world(10);
    const { c, id } = listCreature(g);
    const l = listing(g, id);
    let hours = 0;
    while (openBids(l).length === 0 && hours < 48) {
      advanceWorld(g, 2, { forceFull: true });
      hours += 2;
    }
    expect(l.bids.length).toBeGreaterThan(0);
    const bid = best(l)!;
    expect(bid).toBeDefined();
    expect(bid.message.length).toBeGreaterThan(10);
    expect(bid.buyerName).toBeTruthy();
    const money = g.finance.money;
    const rep = g.progress.reputation;
    const biz = g.progress.mastery.business;
    const r = acceptBid(g, id, bid.id);
    expect(r.ok).toBe(true);
    expect(g.finance.money).toBeCloseTo(money + bid.amount, 2);
    expect(c.status).toBe('sold');
    expect(c.tankId).toBeNull();
    expect(l.status).toBe('sold');
    expect(l.soldFor).toBe(bid.amount);
    expect(bid.status).toBe('accepted');
    expect(g.market.history.at(-1)?.price).toBe(bid.amount);
    expect(g.progress.counters.sales).toBeGreaterThanOrEqual(1);
    expect(g.progress.reputation).toBeGreaterThanOrEqual(rep);
    expect(g.progress.mastery.business).toBeGreaterThan(biz);
    expect(g.finance.ledger.at(-1)?.category).toBe('livestock_sale');
  });

  it('selling a whole tank deletes it, transfers exactly its contents, and the game continues', () => {
    const g = world(11);
    const tankId = g.tankOrder[0];
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 72 });
    expect(r.ok).toBe(true);
    const l = listing(g, r.listingId!);
    const contents = [...l.creatureIds];
    let hours = 0;
    while (openBids(l).length === 0 && hours < 72) {
      advanceWorld(g, 2, { forceFull: true });
      hours += 2;
    }
    ensureBids(g, l.id);
    const bid = best(l)!;
    const money = g.finance.money;
    const res = acceptBid(g, l.id, bid.id);
    expect(res.ok).toBe(true);
    expect(g.tanks[tankId]).toBeUndefined();
    expect(g.tankOrder).not.toContain(tankId);
    for (const cid of contents) {
      expect(g.creatures[cid].status).toBe('sold');
      expect(g.creatures[cid].tankId).toBeNull();
    }
    expect(g.finance.money).toBeCloseTo(money + bid.amount, 2);
    expect(g.progress.counters.tankSales).toBe(1);
    expect(g.finance.ledger.at(-1)?.category).toBe('tank_sale');
    // Final tank sold: an event suggests next steps and the world keeps running.
    expect(g.log.some((e) => /empty room/i.test(e.text))).toBe(true);
    expect(() => advanceWorld(g, 30, { forceFull: true })).not.toThrow();
    expect(Number.isFinite(g.finance.money)).toBe(true);
    g.finance.money = Math.max(g.finance.money, 500);
    const bought = buyTank(g, 'g10', 'freshwater_tropical');
    expect(bought.ok).toBe(true);
    expect(g.tankOrder.length).toBe(1);
  });

  it('accepting twice, after withdraw, or on a sold/invalid listing fails safely (no duplication)', () => {
    const g = world(12);
    const { id } = listCreature(g);
    ensureBids(g, id, 2);
    const l = listing(g, id);
    const [b1, b2] = openBids(l);
    expect(acceptBid(g, id, b1.id).ok).toBe(true);
    const money = g.finance.money;
    expect(acceptBid(g, id, b1.id).ok).toBe(false);
    if (b2) expect(acceptBid(g, id, b2.id).ok).toBe(false);
    expect(withdrawListing(g, id).ok).toBe(false);
    expect(g.finance.money).toBe(money);
    expect(g.market.history.filter((h) => h.title === l.title).length).toBe(1);

    const second = listCreature(g);
    ensureBids(g, second.id);
    const bid = openBids(listing(g, second.id))[0];
    expect(withdrawListing(g, second.id).ok).toBe(true);
    expect(second.c.status).toBe('alive');
    const m2 = g.finance.money;
    expect(acceptBid(g, second.id, bid.id).ok).toBe(false);
    expect(g.finance.money).toBe(m2);
    expect(second.c.status).toBe('alive');
    expect(acceptBid(g, 'missing', 'x').ok).toBe(false);
  });

  it('withdraw restores creatures and closes bids', () => {
    const g = world(13);
    const tankId = g.tankOrder[0];
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 24 });
    const l = listing(g, r.listingId!);
    ensureBids(g, l.id);
    expect(withdrawListing(g, l.id).ok).toBe(true);
    expect(l.status).toBe('withdrawn');
    expect(g.tanks[tankId].listingId).toBeUndefined();
    for (const cid of l.creatureIds) expect(g.creatures[cid].status).toBe('alive');
    expect(openBids(l).length).toBe(0);
  });

  it('declining an offer closes it', () => {
    const g = world(14);
    const { id } = listCreature(g);
    ensureBids(g, id);
    const b = openBids(listing(g, id))[0];
    expect(declineBid(g, id, b.id).ok).toBe(true);
    expect(b.status).toBe('declined');
    expect(acceptBid(g, id, b.id).ok).toBe(false);
  });

  it('bids below the reserve are declined automatically; a no-sale listing expires with advice', () => {
    const g = world(15);
    const c = animal(g, g.tankOrder[0]);
    const v = creatureValue(g, c).total;
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: Math.round(v * 20), durationHours: 8 });
    const l = listing(g, r.listingId!);
    for (let i = 0; i < 25; i++) forceBuyerVisit(g, l.id);
    expect(l.bids.length).toBeGreaterThan(0);
    for (const b of l.bids) {
      expect(b.status).toBe('declined');
      expect(b.note).toMatch(/reserve/i);
    }
    devStepEconomy(g, 9);
    expect(l.status).toBe('expired');
    expect(l.advice).toMatch(/reserve/i);
    expect(c.status).toBe('alive');
  });

  it('a listing that receives no bids expires with advice', () => {
    const g = world(16);
    for (const b of g.market.buyers) b.budget = 1; // nobody can afford a serious offer
    const c = animal(g, g.tankOrder[0]);
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 6 });
    const l = listing(g, r.listingId!);
    devStepEconomy(g, 7);
    expect(l.bids.length).toBe(0);
    expect(l.status).toBe('expired');
    expect(l.advice).toMatch(/No bids arrived/);
    expect(c.status).toBe('alive');
    expect(g.log.some((e) => e.listingId === l.id && /ended without a sale/.test(e.text))).toBe(true);
  });

  it('a buy-now price sells instantly to a buyer who values it enough', () => {
    const g = world(17);
    const c = animal(g, g.tankOrder[0]);
    const v = creatureValue(g, c).total;
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, buyNow: Math.max(1, Math.round(v * 0.3)), durationHours: 24 });
    const l = listing(g, r.listingId!);
    for (let i = 0; i < 40 && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
    expect(l.status).toBe('sold');
    expect(l.soldFor).toBe(l.buyNow);
    expect(l.outcome).toMatch(/buy-now/);
    expect(c.status).toBe('sold');
  });
});

describe('market: high-value auctions', () => {
  it('a masterpiece worth more than any regular buyer can pay still draws serious offers', () => {
    const g = world(60);
    const big = createTank(g, 'g1000', 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 1.5, rotY: 0 } });
    big.cache.beauty = 96;
    big.cache.welfare = 95;
    big.cache.stability = 95;
    big.cache.compatVerdict = 'excellent';
    big.cache.status = 'good';
    big.createdHour = g.clock.hour - 24 * 60;
    const r = createListing(g, { kind: 'tank', tankId: big.id, reserve: 0, durationHours: 96 });
    expect(r.ok).toBe(true);
    const l = listing(g, r.listingId!);
    // lane:w2-sim — the premise, independent of which buyers this seed happened to roll (a rich public aquarium can
    // top $30k): no regular buyer can pay even half, so any serious offer must come from a delegation.
    for (const b of g.market.buyers) b.budget = Math.min(b.budget, Math.floor(l.snapshot.valuation * 0.45));
    expect(l.snapshot.valuation).toBeGreaterThan(Math.max(...g.market.buyers.map((b) => b.budget)));
    devStepEconomy(g, 96);
    const serious = l.bids.filter((b) => b.amount >= l.snapshot.valuation * 0.5);
    expect(serious.length).toBeGreaterThan(0);
    expect(g.market.buyers.length).toBeLessThan(40);
  });
});

describe('market: counters', () => {
  function counterOutcome(seed: number, mult: number): 'sold' | 'split' | 'hold' | 'walk' | 'pending' {
    const g = world(100 + seed);
    const { id } = listCreature(g);
    ensureBids(g, id);
    const l = listing(g, id);
    const b = best(l)!;
    const original = b.amount;
    const res = counterBid(g, id, b.id, Math.round(original * mult) + 1);
    expect(res.ok).toBe(true);
    expect(b.status).toBe('countered');
    expect(acceptBid(g, id, b.id).ok).toBe(false); // must wait for the reply
    for (let h = 0; h < 12 && b.status === 'countered'; h++) devStepEconomy(g, 1);
    if (l.status === 'sold' && l.soldTo === b.buyerId) return 'sold';
    if (b.status === 'withdrawn') return 'walk';
    if (b.status === 'open' && b.amount > original) return 'split';
    if (b.status === 'open') return 'hold';
    return b.status === 'countered' ? 'pending' : 'walk';
  }

  it('validates counter amounts', () => {
    const g = world(30);
    const { id } = listCreature(g);
    ensureBids(g, id);
    const b = openBids(listing(g, id))[0];
    expect(counterBid(g, id, b.id, b.amount - 1).ok).toBe(false);
    expect(counterBid(g, id, b.id, Number.NaN).ok).toBe(false);
    expect(counterBid(g, id, b.id, b.amount * 10).ok).toBe(false);
  });

  it('buyers reply after a delay: accept, split the difference, hold firm or walk away', () => {
    const modest: string[] = [];
    const greedy: string[] = [];
    for (let s = 0; s < 16; s++) modest.push(counterOutcome(s, 1.02));
    for (let s = 0; s < 16; s++) greedy.push(counterOutcome(s, 3));
    expect(modest.filter((o) => o === 'sold').length).toBeGreaterThanOrEqual(8);
    expect(greedy.filter((o) => o === 'sold').length).toBe(0);
    expect(greedy.filter((o) => o === 'walk' || o === 'hold').length).toBe(16);
    expect(greedy.includes('walk')).toBe(true);
    const all = new Set([...modest, ...greedy]);
    const mid: string[] = [];
    for (let s = 0; s < 16; s++) mid.push(counterOutcome(40 + s, 1.3));
    for (const o of mid) all.add(o);
    expect(all.size).toBeGreaterThanOrEqual(3);
    expect(all.has('pending')).toBe(false);
  });
});

describe('market: waiting is not a guaranteed win', () => {
  it('the best open offer rises in some runs and falls in others', () => {
    let up = 0;
    let down = 0;
    let monotonicRuns = 0;
    let runsWithBids = 0;
    for (let s = 0; s < 24; s++) {
      const g = world(500 + s);
      const tankId = g.tankOrder[0];
      const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 120 });
      const l = listing(g, r.listingId!);
      const samples: number[] = [];
      for (let k = 0; k < 5; k++) {
        devStepEconomy(g, 20);
        const b = best(l);
        samples.push(b ? b.amount : 0);
      }
      for (let k = 1; k < samples.length; k++) {
        if (samples[k] > samples[k - 1]) up++;
        else if (samples[k] < samples[k - 1]) down++;
      }
      const amounts = l.bids.filter((b) => !b.note?.startsWith('Below')).map((b) => b.amount);
      if (amounts.length >= 4) {
        runsWithBids++;
        if (amounts.every((a, i) => i === 0 || a >= amounts[i - 1])) monotonicRuns++;
      }
    }
    expect(up).toBeGreaterThan(0);
    expect(down).toBeGreaterThan(0);
    expect(runsWithBids).toBeGreaterThan(5);
    expect(monotonicRuns).toBeLessThan(runsWithBids / 2);
  });
});

describe('market: edge cases while listed', () => {
  it('a listed creature dying cancels its listing with an event', () => {
    const g = world(40);
    const { c, id } = listCreature(g);
    ensureBids(g, id);
    c.status = 'dead';
    devStepEconomy(g, 0.5);
    const l = listing(g, id);
    expect(l.status).toBe('invalidated');
    expect(openBids(l).length).toBe(0);
    expect(g.log.some((e) => e.listingId === id && /died while listed/.test(e.text))).toBe(true);
    const b = l.bids[0];
    if (b) expect(acceptBid(g, id, b.id).ok).toBe(false);
  });

  it('a death inside a listed tank reprices the listing instead of cancelling it', () => {
    const g = world(41);
    const tankId = g.tankOrder[0];
    const victim = animal(g, tankId);
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 48 });
    const l = listing(g, r.listingId!);
    ensureBids(g, l.id, 2);
    const before = new Map(openBids(l).map((b) => [b.id, b.amount]));
    victim.status = 'dead';
    devStepEconomy(g, 0.5);
    expect(l.status).toBe('active');
    expect(l.creatureIds).not.toContain(victim.id);
    expect(l.changedSinceListing).toMatch(/died/);
    for (const [bid, amt] of before) {
      const b = l.bids.find((x) => x.id === bid)!;
      expect(b.status === 'withdrawn' || b.status === 'expired' || b.amount <= amt).toBe(true);
    }
  });

  it('a listed animal falling ill makes buyers revise or withdraw', () => {
    const g = world(42);
    const { c, id } = listCreature(g);
    ensureBids(g, id, 3);
    const l = listing(g, id);
    const before = new Map(openBids(l).map((b) => [b.id, b.amount]));
    c.stats.health = 35;
    c.illness = { kind: 'fin_rot', severity: 0.7, sinceHour: g.clock.hour };
    devStepEconomy(g, 0.5);
    expect(l.changedSinceListing).toMatch(/ill/);
    let changed = 0;
    for (const [bid, amt] of before) {
      const b = l.bids.find((x) => x.id === bid)!;
      if (b.status === 'withdrawn' || b.amount < amt) changed++;
    }
    expect(changed).toBe(before.size);
  });

  it('editing a listed tank flags the change; buyers re-evaluate; stale bids cannot be exploited', () => {
    const g = world(43);
    const tankId = g.tankOrder[0];
    const t = g.tanks[tankId];
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 48 });
    const l = listing(g, r.listingId!);
    ensureBids(g, l.id, 2);
    const b = best(l)!;
    const amt = b.amount;
    // Strip the aquascape, then try to accept the old offer immediately.
    t.decor = [];
    const res = acceptBid(g, l.id, b.id);
    expect(l.changedSinceListing).toMatch(/aquascape|equipment/i);
    if (res.ok) {
      // Only possible if the stripped decor had no value; the price must not exceed the old bid.
      expect(l.soldFor!).toBeLessThanOrEqual(amt);
    } else {
      expect(res.message).toMatch(/withdrew|revised/i);
      expect(l.status).toBe('active');
    }
  });

  it('animals added after listing are not sold: they move to another tank, or the sale is blocked', () => {
    const g = world(44);
    const tankId = g.tankOrder[0];
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 48 });
    const l = listing(g, r.listingId!);
    ensureBids(g, l.id);
    const newcomer = animal(g, tankId);
    const b = best(l)!;
    const blocked = acceptBid(g, l.id, b.id);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain(newcomer.name);
    expect(newcomer.status).toBe('alive');
    expect(g.tanks[tankId]).toBeDefined();
    // Give the newcomer somewhere to go, then the sale completes.
    const other = createTank(g, 'g20L', 'freshwater_cool', { cycled: true, placement: { x: 1.5, z: 1, rotY: 0 } });
    ensureBids(g, l.id);
    const b2 = best(l)!;
    const ok = acceptBid(g, l.id, b2.id);
    expect(ok.ok).toBe(true);
    expect(newcomer.status).toBe('alive');
    expect(newcomer.tankId).toBe(other.id);
    expect(g.tanks[tankId]).toBeUndefined();
  });

  it('selling a setup that deteriorated after listing costs reputation and brings feedback', () => {
    const g = world(45);
    g.progress.reputation = 500;
    const tankId = g.tankOrder[0];
    animal(g, tankId);
    const t = g.tanks[tankId];
    t.cache.welfare = 90;
    t.cache.compatVerdict = 'excellent';
    t.cache.status = 'good';
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 48 });
    const l = listing(g, r.listingId!);
    ensureBids(g, l.id);
    t.cache.welfare = 20;
    t.cache.compatVerdict = 'incompatible';
    t.cache.status = 'danger';
    let sold = false;
    for (let i = 0; i < 10 && !sold; i++) {
      ensureBids(g, l.id);
      const b = best(l);
      if (!b) continue;
      sold = acceptBid(g, l.id, b.id).ok;
    }
    expect(sold).toBe(true);
    expect(g.progress.reputation).toBeLessThan(500);
    expect(g.log.some((e) => e.kind === 'warning' && /Reputation −/.test(e.text))).toBe(true);
  });
});

describe('market: quick sale', () => {
  it('sells instantly at a discount and cannot be repeated', () => {
    const g = world(50);
    const c = animal(g, g.tankOrder[0]);
    const v = creatureValue(g, c).total;
    const money = g.finance.money;
    const r = quickSell(g, [c.id]);
    expect(r.ok).toBe(true);
    const gained = g.finance.money - money;
    expect(gained).toBeGreaterThanOrEqual(Math.floor(v * 0.39));
    expect(gained).toBeLessThanOrEqual(Math.ceil(v * 0.56));
    expect(c.status).toBe('sold');
    expect(quickSell(g, [c.id]).ok).toBe(false);
    const listed = listCreature(g);
    expect(quickSell(g, [listed.c.id]).ok).toBe(false);
  });
});

describe('market: determinism', () => {
  it('same seed + same actions → identical market and finances', () => {
    const run = () => {
      const g = world(77);
      const { id } = listCreature(g);
      createListing(g, { kind: 'tank', tankId: g.tankOrder[0], reserve: 0, durationHours: 48 });
      devStepEconomy(g, 30, { finance: true });
      const b = best(listing(g, id));
      if (b) acceptBid(g, id, b.id);
      devStepEconomy(g, 30, { finance: true });
      return JSON.stringify({ m: g.market, f: g.finance, rep: g.progress.reputation });
    };
    expect(run()).toEqual(run());
  });
});
