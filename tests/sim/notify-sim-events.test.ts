/**
 * lane:notify (chunk 3; 0.5 spec §12.2; ADR-0022 decision 5, ADR-0023) — the sim tags what a notification needs on
 * the events it already logs: bids and sales, the new "auction ending soon", breeding milestones and show results; and
 * the "ending soon" event itself is one per listing, in its last 3 game hours, only with an open bid, and routed to
 * the listing.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Bid, GameState, Listing } from '@/types';
import { newGame } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { createListing, acceptBid, forceBuyerVisit } from '@/sim/economy';
import { stepListings, AUCTION_ENDING_SOON_H } from '@/sim/economy/listings';
import { BREEDING_FIXTURES } from '@/dev/fixtures/breeding';
import { buildShowsDemo } from '@/dev/fixtures/shows';
import { planNotification } from '@/ui/notify/rules';

vi.setConfig({ testTimeout: 240_000 });

const ENDING = /^Bidding on ".+" ends in about \d+ hours?\. Best offer so far: \$[\d,.]+ from .+$/;

function listed(reserve = 1e6): { g: GameState; l: Listing } {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 13 });
  g.isShowcase = false;
  g.progress.unlocked.push('market_listings');
  const id = Object.values(g.creatures).find((c) => c.status === 'alive')!.id;
  const r = createListing(g, { kind: 'creature', creatureIds: [id], reserve, durationHours: 24 });
  expect(r.ok).toBe(true);
  return { g, l: g.market.listings.find((x) => x.id === r.listingId)! };
}

function openBid(g: GameState, l: Listing, amount = 150): Bid {
  const b: Bid = { id: `bid_t${l.bids.length}`, buyerId: 'buyer_t', amount, message: 'I like it.', createdHour: g.clock.hour, expiresHour: l.endsHour + 200, status: 'open', buyerName: 'Coral Reef Co.' };
  l.bids.push(b);
  return b;
}

/** Step the listings from now to `until` in `dt`-hour windows (the world's market cadence). */
function run(g: GameState, until: number, dt = 0.5): void {
  while (g.clock.hour < until - 1e-9) {
    const step = Math.min(dt, until - g.clock.hour);
    const ctx = makeContext(g, step);
    stepListings(g, step, ctx);
    g.clock.hour += step;
  }
}

const endingEvents = (g: GameState) => g.log.filter((e) => ENDING.test(e.text));

describe('ADR-0022 decision 5: "auction ending soon"', () => {
  it('fires once, in the last 3 game hours, for a listing with an open bid, and opens the listing', () => {
    const { g, l } = listed();
    openBid(g, l);
    run(g, l.endsHour - AUCTION_ENDING_SOON_H - 0.5);
    expect(endingEvents(g)).toEqual([]);
    run(g, l.endsHour - 0.01);
    const evs = endingEvents(g);
    expect(evs).toHaveLength(1);
    expect(evs[0].text).toBe(`Bidding on "${l.title}" ends in about 3 hours. Best offer so far: $150 from Coral Reef Co.`);
    expect(evs[0]).toMatchObject({ kind: 'market', listingId: l.id, toast: true, notice: { topic: 'auction_ending', vars: { title: l.title, buyer: 'Coral Reef Co.', amount: 150 } } });
    const p = planNotification(evs[0], { hour: g.clock.hour, tankName: () => null })!;
    expect(p).toMatchObject({ category: 'market', title: `Ending soon: ${l.title}`, body: 'Best offer so far: $150 from Coral Reef Co.', route: `#/market/listings/${l.id}` });
    run(g, l.endsHour + 2);
    expect(endingEvents(g)).toHaveLength(1);
  });

  it('without an open bid it stays quiet; a bid in the last hours brings it, with the hours left', () => {
    const { g, l } = listed();
    run(g, l.endsHour - 1.5);
    expect(endingEvents(g)).toEqual([]);
    openBid(g, l, 90);
    run(g, l.endsHour - 0.01);
    expect(endingEvents(g).map((e) => e.text)).toEqual([`Bidding on "${l.title}" ends in about 1 hour. Best offer so far: $90 from Coral Reef Co.`]);
  });

  it('a big step that lands in the window fires it once; one that jumps past the end leaves it to "Bidding closed"', () => {
    const a = listed();
    openBid(a.g, a.l);
    run(a.g, a.l.endsHour - 4, 4);
    run(a.g, a.l.endsHour - 0.5, 3.5); // one window ending 30 min before the close
    expect(endingEvents(a.g)).toHaveLength(1);
    const b = listed();
    openBid(b.g, b.l);
    run(b.g, b.l.endsHour - 4, 4);
    run(b.g, b.l.endsHour + 1, 5);
    expect(endingEvents(b.g)).toEqual([]);
    expect(b.g.log.some((e) => e.text.startsWith(`Bidding closed on "${b.l.title}"`))).toBe(true);
  });
});

describe('Market events carry their notification', () => {
  it('a new best bid: title, buyer, amount and the listing’s fair value', () => {
    const { g, l } = listed(1);
    let ev;
    for (let i = 0; i < 12 && !ev; i++) {
      forceBuyerVisit(g, l.id);
      ev = g.log.find((e) => e.notice?.topic === 'bid');
    }
    expect(ev).toBeTruthy();
    expect(ev!.listingId).toBe(l.id);
    expect(ev!.notice!.vars).toMatchObject({ title: l.title });
    expect(typeof ev!.notice!.vars!.amount).toBe('number');
    expect(ev!.notice!.vars!.fair).toBeGreaterThan(0);
  });

  it('a sale: title, buyer and the price', () => {
    const { g, l } = listed(1);
    const b = openBid(g, l, 140);
    expect(acceptBid(g, l.id, b.id).ok).toBe(true);
    const ev = g.log.find((e) => e.notice?.topic === 'sale')!;
    expect(ev.text).toMatch(/^Sold! /);
    expect(ev.notice!.vars).toMatchObject({ title: l.title, buyer: 'Coral Reef Co.', amount: 140 });
  });
});

describe('Breeding milestones and show results carry theirs', () => {
  it('a betta spawn (eggs), its free-swimming fry (hatch) and a clownfish clutch (eggs)', () => {
    const nest = BREEDING_FIXTURES.breeding_betta();
    const eggs = nest.log.find((e) => e.notice?.topic === 'eggs')!;
    expect(eggs.text).toMatch(/spawned!/);
    const cl = Object.values(nest.clutches).find((c) => c.speciesId === 'betta')!;
    expect(eggs.notice!.vars).toMatchObject({ name: nest.creatures[cl.motherId!].name, tank: nest.tanks[cl.tankId].name });
    expect(eggs.notice!.vars!.n).toBeGreaterThan(0);
    const fry = BREEDING_FIXTURES.breeding_betta_fry();
    const hatch = fry.log.find((e) => e.notice?.topic === 'hatch')!;
    expect(hatch.text).toMatch(/free-swimming!/);
    expect(hatch.notice!.vars!.n).toBeGreaterThan(0);
    const clown = BREEDING_FIXTURES.breeding_clownfish();
    expect(clown.log.find((e) => e.notice?.topic === 'eggs')?.text).toMatch(/laid .+ bright orange eggs?/);
  });

  it('a judged show: the show, the best placing, and its prize and ribbon when won', () => {
    const g = buildShowsDemo();
    const results = g.log.filter((e) => e.notice?.topic === 'show_result');
    expect(results.length).toBeGreaterThan(0);
    for (const e of results) {
      expect(e.notice!.vars).toHaveProperty('show');
      expect(e.notice!.vars).toHaveProperty('name');
      expect(e.notice!.vars).toHaveProperty('place');
      const p = planNotification(e, { hour: g.clock.hour, tankName: () => null })!;
      expect(p.category).toBe('shows');
      expect(p.title).toBe(`${e.notice!.vars!.show}: ${e.notice!.vars!.name} placed ${e.notice!.vars!.place}`);
      expect(p.route).toBe('#/shows/results');
    }
  });
});
