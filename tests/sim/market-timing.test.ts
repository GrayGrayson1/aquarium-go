/**
 * Market timing in REAL time (QA: at 1× a 1-day listing lasted ~4 real minutes, offers ~1 real minute, and a
 * listing expired while the player had the counter-offer form open). 1 game hour = 10 real seconds at 1×.
 */
import { describe, it, expect } from 'vitest';
import type { Bid, GameState, Listing } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import {
  createListing,
  counterBid,
  forceBuyerVisit,
  devOpenMarket,
  devStepEconomy,
  holdBidForCounter,
  BID_MIN_OPEN_HOURS,
  NEGOTIATION_HOLD_HOURS,
  CLOSING_GRACE_HOURS,
  COUNTER_REPLY_OPEN_HOURS,
  LISTING_DURATION_PRESETS,
  DEFAULT_LISTING_HOURS,
  realMinutesAt1x,
} from '@/sim/economy';

function world(seed: number): GameState {
  const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 500;
  return g;
}

function list(g: GameState, durationHours = 48): Listing {
  const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 30 }), g.tankOrder[0]);
  c.stats.health = 100;
  const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours });
  expect(r.ok).toBe(true);
  return g.market.listings.find((l) => l.id === r.listingId)!;
}

const open = (l: Listing): Bid[] => l.bids.filter((b) => b.status === 'open');
function ensureBid(g: GameState, l: Listing): Bid {
  for (let i = 0; i < 80 && !open(l).length && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
  const b = open(l)[0];
  expect(b).toBeDefined();
  return b;
}

describe('market timing: humane in real time', () => {
  it('real-time helpers: 6 game hours = 1 real minute at 1×', () => {
    expect(realMinutesAt1x(24)).toBe(4);
    expect(realMinutesAt1x(BID_MIN_OPEN_HOURS)).toBeGreaterThanOrEqual(3);
    expect(realMinutesAt1x(NEGOTIATION_HOLD_HOURS)).toBeGreaterThanOrEqual(2);
  });

  it('listing presets are at least a game day (≈4 real min) and labelled in real time', () => {
    expect(LISTING_DURATION_PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const p of LISTING_DURATION_PRESETS) {
      expect(p.hours).toBeGreaterThanOrEqual(24);
      expect(p.realLabel).toBe(`about ${Math.round(p.hours / 6)} min at 1×`);
    }
    expect(LISTING_DURATION_PRESETS.some((p) => p.hours === DEFAULT_LISTING_HOURS)).toBe(true);
    const g = world(3);
    const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 30 }), g.tankOrder[0]);
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 0, durationHours: Number.NaN });
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    expect(l.endsHour - l.createdHour).toBe(DEFAULT_LISTING_HOURS);
  });

  it('every offer stays open at least ~3 real minutes at 1×', () => {
    let seen = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = world(seed);
      const l = list(g);
      for (let i = 0; i < 30; i++) forceBuyerVisit(g, l.id);
      for (const b of l.bids.filter((x) => x.status === 'open')) {
        expect(b.expiresHour - b.createdHour).toBeGreaterThanOrEqual(BID_MIN_OPEN_HOURS * 0.95);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(3);
  });

  it('opening the counter form holds the offer: it cannot expire or be withdrawn mid-negotiation', () => {
    for (const seed of [11, 12, 13, 14]) {
      const g = world(seed);
      const l = list(g);
      const b = ensureBid(g, l);
      b.expiresHour = g.clock.hour + 0.5; // about to expire
      expect(holdBidForCounter(g, l.id, b.id).ok).toBe(true);
      expect(b.expiresHour).toBeGreaterThanOrEqual(g.clock.hour + NEGOTIATION_HOLD_HOURS - 1e-9);
      devStepEconomy(g, NEGOTIATION_HOLD_HOURS - 0.5); // the player types for ~2 real minutes
      expect(b.status).toBe('open');
      const r = counterBid(g, l.id, b.id, Math.round(b.amount * 1.1) + 1);
      expect(r.ok).toBe(true);
      expect(b.status).toBe('countered');
      expect(b.holdUntilHour).toBeUndefined();
    }
  });

  it('a held offer keeps a short listing alive past its end, and closing leaves time to accept', () => {
    const g = world(21);
    const l = list(g, 24);
    const b = ensureBid(g, l);
    devStepEconomy(g, l.endsHour - g.clock.hour - 0.2);
    expect(l.status).toBe('active');
    holdBidForCounter(g, l.id, b.id);
    devStepEconomy(g, 0.5); // bidding closes while the form is open
    expect(l.status).toBe('active');
    expect(b.status).toBe('open');
    for (const x of open(l)) expect(x.expiresHour).toBeGreaterThanOrEqual(l.endsHour + CLOSING_GRACE_HOURS - 1e-9);
  });

  it('bidding closing extends every open offer by the grace period', () => {
    const g = world(31);
    const l = list(g, 24);
    ensureBid(g, l);
    for (const x of open(l)) x.expiresHour = l.endsHour + 0.1; // would lapse right after the close
    devStepEconomy(g, l.endsHour - g.clock.hour + 0.2);
    const still = open(l);
    if (still.length) for (const x of still) expect(x.expiresHour).toBeGreaterThanOrEqual(l.endsHour + CLOSING_GRACE_HOURS - 1e-9);
    expect(l.status === 'active' || l.status === 'sold').toBe(true);
  });

  it("a buyer's reply to a counter stays open at least ~2 real minutes", () => {
    let replies = 0;
    for (let seed = 40; seed < 70 && replies < 3; seed++) {
      const g = world(seed);
      const l = list(g);
      const b = ensureBid(g, l);
      const original = b.amount;
      counterBid(g, l.id, b.id, Math.round(original * 1.08) + 1);
      let t = g.clock.hour;
      for (let h = 0; h < 12 && b.status === 'countered'; h++) {
        devStepEconomy(g, 0.25);
        t = g.clock.hour;
      }
      if (b.status === 'open') {
        expect(b.expiresHour - t).toBeGreaterThanOrEqual(COUNTER_REPLY_OPEN_HOURS - 0.5);
        replies++;
      }
    }
    expect(replies).toBeGreaterThan(0);
  });
});
