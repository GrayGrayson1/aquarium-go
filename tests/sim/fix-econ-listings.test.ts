/**
 * Fix lane ECON — regression tests for the listing/auction fixes (S03-01 stash exploit, S03-02 negotiation hold,
 * S03-08 hold cap, S03-04 relocation, S03-07 blocked buy-now, S03-05 brood warnings, S03-03 counter suggestion).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Listing } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { moveCreature } from '@/sim/life/actions';
import { createListing, acceptBid, counterBid, previewListing, suggestCounter, forceBuyerVisit, holdBidForCounter, devOpenMarket, devStepEconomy, tankValuation, creatureValue, buyTank, buyEquipment } from '@/sim/economy';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { unlock } from '@/sim/facility';
import { createTank, deleteTank } from '@/sim/tanks';
import { advanceWorld } from '@/sim/world';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

function world(seed = 7, starterId: 'axolotl' | 'betta' = 'axolotl'): GameState {
  const g = newGame({ starterId, starterName: 'Mochi', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 5000;
  return g;
}
const openBids = (l: Listing) => l.bids.filter((b) => b.status === 'open');
const best = (l: Listing) => openBids(l).sort((a, b) => b.amount - a.amount)[0];

describe('S03-01 — a listed tank is priced on what transfers, not on what is stashed in it', () => {
  it('animals moved into a listed empty tank do not raise its valuation or new bids, and come back at sale', () => {
    const g = world(7);
    const home = g.tankOrder[0];
    const valuables = [0, 1, 2, 3].map(() => {
      const c = createCreature(g, simRng(g), 'axolotl', { ageDays: 90 });
      c.stats.health = 100;
      delete c.illness;
      return addCreature(g, c, home);
    });
    const animalsValue = valuables.reduce((a, c) => a + creatureValue(g, c).total, 0);
    expect(animalsValue).toBeGreaterThan(100);

    const bought = buyTank(g, 'g20L', 'freshwater_cool');
    expect(bought.ok).toBe(true);
    const cheap = g.tanks[bought.tankId!];
    cheap.water.tempC = g.tanks[home].water.tempC;
    const r = createListing(g, { kind: 'tank', tankId: cheap.id, reserve: 0, durationHours: 72 });
    expect(r.ok).toBe(true);
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    const snapVal = l.snapshot.valuation;

    for (const c of valuables) moveCreature(g, c.id, cheap.id);
    // The tank itself is worth more now (the UI shows that), but the listing prices only the listed contents.
    expect(tankValuation(g, cheap.id).expected).toBeGreaterThan(snapVal * 1.5);
    devStepEconomy(g, 0.2);
    expect(l.status).toBe('active');
    for (let i = 0; i < 60 && openBids(l).length < 4 && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
    const top = best(l);
    expect(top).toBeDefined();
    // Buyers price the listed (empty) tank: the listing's own valuation ignores the stash, and no bid comes near the
    // inflated figure (the exploit paid ~2× the snapshot; an eager buyer's noise tops out around 1.4×).
    expect(l.lastValuation).toBeLessThanOrEqual(snapVal * 1.1);
    for (const b of openBids(l)) expect(b.amount).toBeLessThanOrEqual(snapVal * 1.5);

    const money0 = g.finance.money;
    const res = acceptBid(g, l.id, top!.id);
    expect(res.ok).toBe(true);
    expect(g.finance.money - money0).toBeLessThanOrEqual(snapVal * 1.5);
    for (const c of valuables) {
      expect(c.status).toBe('alive');
      expect(c.tankId).toBe(home);
    }
  });

  it('gear installed after listing is not part of the sale: open bids are not revised up and buyers do not walk', () => {
    const g = world(21, 'betta');
    unlock(g, 'gear_tier2', { silent: true });
    unlock(g, 'gear_tier3', { silent: true });
    const home = g.tankOrder[0];
    const r = createListing(g, { kind: 'tank', tankId: home, reserve: 0, durationHours: 72 });
    expect(r.ok).toBe(true);
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    for (let i = 0; i < 40 && openBids(l).length < 3; i++) forceBuyerVisit(g, l.id);
    const before = openBids(l).map((b) => [b.id, b.amount] as const);
    expect(before.length).toBeGreaterThan(0);

    let installed = 0;
    for (const id of ['chiller_mini', 'light_planted', 'filter_canister', 'uv_sterilizer']) if (buyEquipment(g, home, id).ok) installed++;
    expect(installed).toBeGreaterThan(0);
    expect(tankValuation(g, home).expected).toBeGreaterThan(l.snapshot.valuation * 1.3);
    devStepEconomy(g, 0.2);
    expect(l.status).toBe('active');
    for (const [id, amount] of before) {
      const b = l.bids.find((x) => x.id === id)!;
      expect(b.status).toBe('open');
      expect(b.amount).toBe(amount);
      expect(b.note ?? '').not.toMatch(/Revised up/);
    }
    // New buyers price the listed contents, not the extra gear.
    for (const b of openBids(l)) b.status = 'declined';
    for (let i = 0; i < 40 && openBids(l).length < 3 && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
    expect(l.lastValuation).toBeLessThanOrEqual(l.snapshot.valuation * 1.1);
    for (const b of openBids(l)) expect(b.amount).toBeLessThanOrEqual(l.snapshot.valuation * 1.5);
  });

  it('tankValuation scope filters animals and items', () => {
    const g = world(3);
    const home = g.tankOrder[0];
    const full = tankValuation(g, home);
    const noAnimals = tankValuation(g, home, { creatureIds: new Set() });
    const noItems = tankValuation(g, home, { itemIds: new Set() });
    expect(noAnimals.expected).toBeLessThan(full.expected);
    expect(noAnimals.parts.some((p) => p.label.startsWith('Livestock'))).toBe(false);
    expect(noItems.parts.some((p) => p.label.startsWith('Equipment'))).toBe(false);
    expect(noItems.expected).toBeLessThan(full.expected);
  });
});

describe('S03-02 / P2-05 / P5-06 / S03-08 — market windows are real-time promises at every speed, and holds are capped', () => {
  function bidWorld(seed: number, speed: 1 | 3 | 10) {
    const g = world(seed);
    g.clock.speed = speed;
    const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 60 }), g.tankOrder[0]);
    c.stats.health = 100;
    delete c.illness;
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 120 });
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    for (let i = 0; i < 40 && !l.bids.some((b) => b.status === 'open'); i++) forceBuyerVisit(g, l.id);
    const b = l.bids.find((x) => x.status === 'open');
    return { g, l, b };
  }

  it('a fresh offer lives at least ~3 real minutes at 10× (bid lifetime scales with speed)', () => {
    for (const seed of [1, 2, 3]) {
      const { g, b } = bidWorld(seed, 10);
      expect(b).toBeDefined();
      const realSeconds = (b!.expiresHour - g.clock.hour) / (GAME_HOURS_PER_REAL_SECOND * 10);
      expect(realSeconds).toBeGreaterThanOrEqual(170);
    }
  });

  it('the counter form hold survives the UI renew interval (45 real s) at 3× and 10×', () => {
    for (const speed of [3, 10] as const) {
      let trials = 0;
      let lapsed = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const { g, l, b } = bidWorld(seed, speed);
        if (!b) continue;
        // The player opens the counter form when the offer has ~1 real minute left at 1× (6 game hours).
        devStepEconomy(g, Math.max(0, b.expiresHour - g.clock.hour - 6));
        if (b.status !== 'open') continue;
        trials++;
        expect(holdBidForCounter(g, l.id, b.id).ok).toBe(true);
        devStepEconomy(g, 45 * GAME_HOURS_PER_REAL_SECOND * speed);
        if (b.status !== 'open') lapsed++;
      }
      expect(trials).toBeGreaterThan(5);
      expect(lapsed, `speed ${speed}×`).toBe(0);
    }
  });

  it('re-holding forever cannot keep a bid and an ended listing alive', () => {
    const g = world(5);
    const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 60 }), g.tankOrder[0]);
    c.stats.health = 100;
    delete c.illness;
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: 24 });
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    for (let i = 0; i < 40 && !l.bids.some((b) => b.status === 'open'); i++) forceBuyerVisit(g, l.id);
    const b = l.bids.find((x) => x.status === 'open')!;
    expect(b).toBeDefined();
    for (let h = 0; h < 204; h += 6) {
      holdBidForCounter(g, l.id, b.id);
      devStepEconomy(g, 6);
    }
    expect(b.status).not.toBe('open');
    expect(l.status).not.toBe('active');
    expect(c.status).toBe('alive');
  });
});

describe('S03-03 — the suggested counter is one most buyers can accept', () => {
  it('sells outright in most cases and rarely makes the buyer walk (150 seeds)', () => {
    const out: Record<string, number> = { sold: 0, split: 0, hold: 0, walk: 0, pending: 0 };
    let n = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const g = world(seed);
      const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 60 }), g.tankOrder[0]);
      c.stats.health = 100;
      delete c.illness;
      const pv = previewListing(g, { kind: 'creature', creatureIds: [c.id] });
      const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: pv.suggestedReserve, buyNow: pv.suggestedBuyNow, durationHours: 48 });
      const l = g.market.listings.find((x) => x.id === r.listingId)!;
      for (let i = 0; i < 60 && !l.bids.some((b) => b.status === 'open') && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
      const b = best(l);
      if (!b || l.status !== 'active') continue;
      const s = suggestCounter(l, b);
      expect(s.amount).toBeGreaterThan(b.amount);
      if (l.buyNow) expect(s.amount).toBeLessThanOrEqual(l.buyNow);
      expect(s.hint.length).toBeGreaterThan(10);
      const orig = b.amount;
      const res = counterBid(g, l.id, b.id, s.amount);
      expect(res.ok).toBe(true);
      n++;
      for (let h = 0; h < 12 && b.status === 'countered'; h++) devStepEconomy(g, 0.5);
      if ((l.status as string) === 'sold' && l.soldTo === b.buyerId) out.sold++;
      else if (b.status === 'withdrawn') out.walk++;
      else if (b.status === 'open' && b.amount > orig) out.split++;
      else if (b.status === 'open') out.hold++;
      else out.pending++;
    }
    expect(n).toBeGreaterThan(100);
    expect(out.sold / n).toBeGreaterThanOrEqual(0.5);
    expect(out.walk / n).toBeLessThanOrEqual(0.1);
  });

  it('after a buyer has replied to a counter, the suggestion is a small step only', () => {
    const l = { buyNow: 0, reserve: 0 } as unknown as Listing;
    const b = { amount: 100, response: 'Meet me halfway?', archetype: 'collector' } as unknown as Parameters<typeof suggestCounter>[1];
    expect(suggestCounter(l, b).amount).toBeLessThanOrEqual(106);
    const fresh = { amount: 100, archetype: 'bargain_hunter' } as unknown as Parameters<typeof suggestCounter>[1];
    expect(suggestCounter(l, fresh).amount).toBeGreaterThan(115);
    expect(suggestCounter({ buyNow: 104, reserve: 0 } as unknown as Listing, fresh).amount).toBe(104);
  });
});

describe('S03-04 — animals that are not part of a tank sale go somewhere compatible, and the player is told', () => {
  function predatorWorld(withSafeTank: boolean) {
    const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed: 5 });
    devOpenMarket(g);
    for (const k of Object.keys(UNLOCK_KEYS)) {
      try {
        unlock(g, k, { silent: true });
      } catch {
        /* */
      }
    }
    devStepEconomy(g, 0.5);
    const listed = g.tankOrder[0];
    const fowlr = createTank(g, 'g125', 'marine_fowlr', { cycled: true, placement: { x: 2.5, z: 1.5, rotY: 0 } });
    addCreature(g, createCreature(g, simRng(g), 'dwarf_lionfish', { ageDays: 80 }), fowlr.id);
    addCreature(g, createCreature(g, simRng(g), 'miniatus_grouper', { ageDays: 120 }), fowlr.id);
    const safe = withSafeTank ? createTank(g, 'g55', 'marine_live_rock', { cycled: true, placement: { x: 4.5, z: 1.5, rotY: 0 } }) : null;
    advanceWorld(g, 1, { forceFull: true });
    const r = createListing(g, { kind: 'tank', tankId: listed, reserve: 0, durationHours: 72 });
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    const newcomer = addCreature(g, createCreature(g, simRng(g), 'firefish', { ageDays: 20 }), listed);
    for (let i = 0; i < 40 && !l.bids.some((b) => b.status === 'open'); i++) forceBuyerVisit(g, l.id);
    const b = l.bids.find((x) => x.status === 'open')!;
    return { g, l, b, newcomer, fowlr, safe };
  }

  it('prefers the compatible tank over the predator tank', () => {
    const { g, l, b, newcomer, safe } = predatorWorld(true);
    expect(acceptBid(g, l.id, b.id).ok).toBe(true);
    expect(newcomer.tankId).toBe(safe!.id);
    const note = g.log.find((e) => e.creatureId === newcomer.id && /now lives in/.test(e.text));
    expect(note).toBeDefined();
    expect(note!.text).toContain(safe!.name);
    expect(note!.text).not.toMatch(/risky/);
  });

  it('falls back to a high-risk tank only when nothing else will do, and says so', () => {
    const { g, l, b, newcomer, fowlr } = predatorWorld(false);
    expect(acceptBid(g, l.id, b.id).ok).toBe(true);
    expect(newcomer.tankId).toBe(fowlr.id);
    const note = g.log.find((e) => e.creatureId === newcomer.id && /now lives in/.test(e.text));
    expect(note).toBeDefined();
    expect(note!.kind).toBe('warning');
    expect(note!.text).toMatch(/risky mix/);
  });
});

describe('S03-07 — a sale no buyer can complete is called out, not dropped silently', () => {
  it('toasts on the blocked buy-now, marks the listing blocked, clears it once the animal is moved, and explains an expiry', () => {
    const g = world(3);
    const home = g.tankOrder[0];
    const r = createListing(g, { kind: 'tank', tankId: home, reserve: 0, buyNow: 100, durationHours: 24 });
    expect(r.ok).toBe(true);
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    // Only one tank: an axolotl added after listing has nowhere to go.
    const extra = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 60 }), home);
    const logN = g.log.length;
    devStepEconomy(g, 0.2);
    expect(l.status).toBe('active');
    expect(l.blocked).toMatch(new RegExp(extra.name));
    expect(g.log.slice(logN).some((e) => e.kind === 'warning' && e.toast && /No buyer can complete/.test(e.text))).toBe(true);
    let tries = 0;
    for (; tries < 60 && !l.bids.some((b) => b.note?.startsWith('Tried to buy now')); tries++) forceBuyerVisit(g, l.id);
    expect(l.bids.some((b) => b.note?.startsWith('Tried to buy now'))).toBe(true);
    expect(l.status).toBe('active');
    // A second tank gives the extra animal a home: the block lifts.
    const other = createTank(g, 'g20L', 'freshwater_cool', { cycled: true, placement: { x: 2.5, z: 1.5, rotY: 0 } });
    other.water.tempC = g.tanks[home].water.tempC;
    devStepEconomy(g, 0.2);
    expect(l.blocked).toBeUndefined();
    expect(g.log.some((e) => /can sell again/.test(e.text))).toBe(true);
    // Blocked again and left to expire: the advice names the blocker.
    deleteTank(g, other.id);
    for (const b of l.bids) if (b.status === 'open') b.status = 'declined';
    devStepEconomy(g, 30);
    expect(l.status).toBe('expired');
    expect(l.advice).toMatch(/blocked/);
  });
});
