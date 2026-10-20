/**
 * lane:market (chunk 4; BACKLOG B-130) — value-creating economy loops, each test landing with its fix:
 *
 * - B-138 (ADR-0029 decision 3): an empty, freshly dressed tank sells for about what its parts cost; the beauty and
 *   ethical-display bonuses need animals, and a beautiful stocked tank keeps its premium.
 * - D1 (chunk 9, ADR-0044 decision 1, REL-036): one cheap animal no longer revives B-138. The bonuses about the animals
 *   (welfare, compatibility, beauty, rarity, lineage, the ethical display) and a buyer's taste scale only the animals'
 *   and living plants' value, and hardscape is valued at its base price, so a dressed kit with one snail sells for about
 *   what its parts cost (before: about +30% every round, at every size).
 * - B-139 (ADR-0029 decision 4): one sale counts once however many animals it has, so a quick sale of 25 shrimp
 *   doesn't unlock tank auctions, earn "Trusted Trader" or pay sale XP 25 times; "animals sold" stays its own counter.
 *   An older save's quest baselines (taken when sales counted animals) are rebased so the quest can still complete.
 *
 * - B-124 (chunk 7, ADR-0039 decision 1, REL-020): however the counters go, no sale is above the buyer's private
 *   ceiling, and once bidding has closed an offer can be accepted but not countered.
 * - B-162 (chunk 7, ADR-0039 decision 2, REL-021): admission demand keeps falling above about twice the fair price, so
 *   a day's takings peak inside the slider's $0–40, and the rules allow no admission above $40.
 *
 * The production line's money paths (it only lists through the market and never creates money) are checked in
 * tests/sim/production-line.test.ts and automation-invariants.test.ts. Instant actions with no time passing are
 * hunted for loops in tests/sim/economy-loop-hunt.test.ts (B-130).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { createTank } from '@/sim/tanks';
import { placeDecor, maxScaleFor } from '@/sim/aquascape';
import { refreshTankCache, advanceWorld } from '@/sim/world';
import { getDecorDef } from '@/data/catalog/decor';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { findSpecies } from '@/data/species';
import { buyTank, buyOffer, bestOpenBid, devOpenMarket, devStepEconomy, quickSell, tankValuation, createListing, previewListing, forceBuyerVisit, counterBid, acceptBid, holdBidForCounter } from '@/sim/economy';
import { BIDDING_CLOSED_TEXT } from '@/sim/economy/listings';
import { counterValue, isUnlocked, stepProgression, tutorialSkip, stepVisitors, fairAdmission, admissionDraw, setAdmission, MAX_ADMISSION } from '@/sim/facility';
import { makeContext } from '@/sim/context';
import { FIXTURES } from '@/dev/fixtures';

function world(seed = 31): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Loop', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 20000;
  g.isShowcase = false;
  return g;
}

const progressStep = (g: GameState) => stepProgression(g, 0.1, makeContext(g, 0.1));

describe('B-138: an empty dressed tank is worth its parts, not a premium', () => {
  it('buying a kit and decor, then valuing the empty tank, gives back no more than was spent', () => {
    const g = world();
    const before = g.finance.money;
    const r = buyTank(g, 'g20L', 'freshwater_planted', undefined, { seeded: true });
    expect(r.ok).toBe(true);
    const tank = g.tanks[r.tankId!];
    const pieces: [string, number, number][] = [['seiryu_stone', -0.15, 0.05], ['dragon_stone', 0.12, -0.04], ['spider_wood', 0, 0], ['java_fern', -0.2, -0.08], ['anubias_nana', 0.2, 0.08], ['vallisneria', -0.05, -0.1], ['amazon_sword', 0.08, 0.1], ['java_moss', 0.18, -0.1]];
    let placed = 0;
    for (const [id, x, z] of pieces) if (placeDecor(g, tank.id, id, { x, z, rotY: 0, scale: 1 }).ok) placed++;
    expect(placed).toBeGreaterThanOrEqual(5);
    const spent = before - g.finance.money;
    expect(spent).toBeGreaterThan(0);
    tank.water.bioMaturity = 1; // fully cycled: the best case for the seller
    tank.createdHour -= 24 * 20;
    refreshTankCache(g, tank);
    tank.cache.beauty = 95; // a gorgeous layout: before the fix this alone priced it at about 1.5× its parts
    const v = tankValuation(g, tank.id);
    expect(v.modifiers.some((m) => m.label === 'Aquascape beauty')).toBe(false);
    expect(v.modifiers.some((m) => m.label === 'Coherent, ethical display')).toBe(false);
    expect(v.expected).toBeLessThanOrEqual(spent);
  });

  it('a beautiful, healthy stocked tank keeps its beauty and ethical-display premium', () => {
    const g = world(32);
    const t = createTank(g, 'g40B', 'freshwater_planted', { cycled: true, placement: { x: 2, z: 1, rotY: 0 } });
    for (let i = 0; i < 6; i++) addCreature(g, createCreature(g, simRng(g), 'neon_tetra', { ageDays: 40 }), t.id);
    refreshTankCache(g, t);
    Object.assign(t.cache, { beauty: 90, welfare: 95, compatVerdict: 'excellent', status: 'good', waterStatus: 'good', stability: 90 });
    const v = tankValuation(g, t.id);
    expect(v.modifiers.find((m) => m.label === 'Aquascape beauty')!.mult).toBeGreaterThan(1.3);
    expect(v.modifiers.some((m) => m.label === 'Coherent, ethical display')).toBe(true);
  });
});

// ───────────────────────────── D1: one cheap animal ─────────────────────────────

/** A kit dressed with hardscape at its largest scale and plants, plus one cheap animal, three days later. */
function dressedKitWithOneAnimal(tierId: string, seed: number) {
  const g = newGame({ starterId: 'betta', starterName: 'Flip', seed });
  devOpenMarket(g);
  const unlock = TANK_TIER_BY_ID[tierId].unlock;
  if (unlock && !g.progress.unlocked.includes(unlock)) g.progress.unlocked.push(unlock);
  g.progress.tutorial.done = true; // no tutorial payouts in the money
  g.progress.tutorial.skipped = true;
  g.finance.money = 100_000;
  advanceWorld(g, 1);
  const before = g.finance.money;
  const r = buyTank(g, tierId, 'freshwater_planted', undefined, { seeded: true });
  expect(r.ok).toBe(true);
  const t = g.tanks[r.tankId!];
  let placed = 0;
  for (const id of ['spider_wood', 'seiryu_stone', 'java_fern', 'anubias_nana', 'amazon_sword', 'dwarf_hairgrass', 'cryptocoryne', 'monte_carlo', 'java_moss']) {
    const def = getDecorDef(id)!;
    const scale = Math.min(maxScaleFor(t, def), def.category === 'hardscape' ? 2 : 1.3); // the largest scale is the best case for the seller
    for (let x = -5; x <= 5; x += 2) for (let z = -2; z <= 2; z += 2) if (placeDecor(g, t.id, id, { x: x * 0.13 + (placed % 3) * 0.02, z: z * 0.09, rotY: placed * 0.7, scale }).ok) placed++;
  }
  expect(placed).toBeGreaterThanOrEqual(6);
  // the one animal: whichever cheap one on sale values the tank highest (the seller's best case, as the audit's probe)
  let best: { h: GameState; v: number } | null = null;
  for (const o of g.market.stock) {
    if (findSpecies(o.speciesId)?.environment !== 'freshwater' || (o.unitPrice ?? o.price) > 40) continue;
    const h = structuredClone(g);
    if (!buyOffer(h, o.id, t.id, [0]).ok) continue;
    refreshTankCache(h, h.tanks[t.id]);
    const v = tankValuation(h, t.id).expected;
    if (!best || v > best.v) best = { h, v };
  }
  expect(best).not.toBeNull();
  const h = best!.h;
  advanceWorld(h, 72); // settled for three days, as the audit's probe: the bills are in what it cost
  refreshTankCache(h, h.tanks[t.id]);
  return { g: h, tankId: t.id, spent: before - h.finance.money };
}

describe('D1 (REL-036): one cheap animal doesn\'t bring back the whole-tank resale loop', () => {
  it('a dressed kit with one cheap animal is valued at no more than it cost, at every size', () => {
    for (const [tier, seed] of [['g29', 41], ['g55', 42], ['g125', 43], ['g300', 44]] as const) {
      const { g, tankId, spent } = dressedKitWithOneAnimal(tier, seed);
      const v = tankValuation(g, tankId);
      // the animal bonuses still show, priced on the animal
      expect(v.modifiers.some((m) => m.label === 'Aquascape beauty'), tier).toBe(true);
      expect(v.expected, tier).toBeLessThanOrEqual(spent);
      expect(v.plainShare!, tier).toBeGreaterThan(0); // the plants and the animal carry the bonuses; the rest is plain
    }
  });

  it('listed through the real market, it rarely sells, and never at the buy-now loop\'s +30%', () => {
    let sales = 0;
    for (const [tier, seed] of [['g29', 51], ['g29', 52], ['g55', 53], ['g55', 54], ['g125', 55]] as const) {
      const { g, tankId, spent } = dressedKitWithOneAnimal(tier, seed);
      // the audit's probe: reserve at cost, buy-now at 1.3 × cost; take the best bid at or above cost
      const r = createListing(g, { kind: 'tank', tankId, reserve: Math.round(spent), buyNow: Math.round(spent * 1.3), durationHours: 120 });
      expect(r.ok, tier).toBe(true);
      const l = g.market.listings.find((x) => x.id === r.listingId)!;
      for (let h = 0; l.status === 'active' && h < 140; h++) {
        advanceWorld(g, 1);
        const b = bestOpenBid(l);
        if (b && (b.amount >= spent * 1.15 || g.clock.hour >= l.endsHour)) acceptBid(g, l.id, b.id);
      }
      if (l.status === 'sold') {
        sales++;
        // Before the fix every round took the buy-now, 1.3 × cost. Now a keen buyer and the bids' noise can pay a
        // little over cost now and then (4 of 48 probe rounds, at most 1.2 ×), less than the days of bills it waited.
        expect(l.soldFor!, `${tier} seed ${seed}`).toBeLessThan(spent * 1.25);
      }
    }
    expect(sales).toBeLessThanOrEqual(2);
  });
});

describe('B-139: a sale counts once, however many animals it has', () => {
  it('a quick sale of 25 shrimp is one sale: no tank auctions, no Trusted Trader, sale XP once', () => {
    const g = world(33);
    tutorialSkip(g);
    // devOpenMarket opens tank auctions too: close them again, so only play (three sales, 150 business XP or a shop) can
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'tank_auctions');
    g.progress.mastery.business = 0;
    const t = createTank(g, 'g20L', 'freshwater_planted', { cycled: true, placement: { x: 2, z: 1, rotY: 0 } });
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) ids.push(addCreature(g, createCreature(g, simRng(g), 'cherry_shrimp', { ageDays: 30 }), t.id).id);
    progressStep(g);
    const xp0 = g.progress.mastery.business ?? 0;
    expect(isUnlocked(g, 'tank_auctions')).toBe(false);
    expect(quickSell(g, ids).ok).toBe(true);
    for (let i = 0; i < 5; i++) progressStep(g);
    expect(g.progress.counters.animalsSold).toBe(25);
    expect(counterValue(g, 'sales')).toBe(1);
    expect(isUnlocked(g, 'tank_auctions')).toBe(false);
    expect(g.progress.achievements).not.toContain('trader');
    // one sale's XP: 2 from the quick sale, 10 from the sales counter, the market scan's share (≤ 80)
    expect((g.progress.mastery.business ?? 0) - xp0).toBeLessThan(10 * 2 + 2 + 80);
  });

  it('an older save whose baselines counted animals is rebased, so its quest and tutorial step can still finish', () => {
    const g = world(34);
    g.progress.counters.sales = 3;
    g.progress.counters.animalsSold = 40;
    g.progress.counters.births = 5;
    // Taken by an older build: "sales" was the animal count, and a births baseline above today's count.
    g.progress.tutorial.stepBaselines = { sales: 40, friend_visits: 0 };
    g.progress.quests.push({ id: 'q_breed_more', status: 'active', progress: 0, startedHour: g.clock.hour, baseline: 50, target: 3 });
    progressStep(g);
    expect(g.progress.tutorial.stepBaselines?.sales ?? 3).toBeLessThanOrEqual(3);
    const q = g.progress.quests.find((x) => x.id === 'q_breed_more')!;
    expect(q.baseline).toBe(5);
    g.progress.counters.births = 8;
    progressStep(g);
    expect(g.progress.quests.find((x) => x.id === 'q_breed_more')!.status).toBe('complete');
    // A second pass changes nothing (idempotent).
    const snapshot = JSON.stringify(g.progress.quests);
    progressStep(g);
    expect(JSON.stringify(g.progress.quests)).toBe(snapshot);
  });
});

// ───────────────────────────── B-124: counter-offers ─────────────────────────────

/** A listed young axolotl and its best opening offer (or null when no buyer bid on this seed). */
function listedWithOffer(seed: number, durationHours = 168) {
  const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 5000;
  const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 60 }), g.tankOrder[0]);
  c.stats.health = 100;
  delete c.illness;
  const pv = previewListing(g, { kind: 'creature', creatureIds: [c.id] });
  const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: pv.suggestedReserve, buyNow: 0, durationHours });
  const l = g.market.listings.find((x) => x.id === r.listingId)!;
  for (let i = 0; i < 60 && !l.bids.some((b) => b.status === 'open') && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
  const b = l.bids.filter((x) => x.status === 'open').sort((x, y) => y.amount - x.amount)[0];
  return b && l.status === 'active' ? { g, l, b } : null;
}

describe('B-124 (REL-020): counters never take a buyer past their ceiling', () => {
  it('no sale above the buyer\'s ceiling, however the counters go (two strategies, 150 seeds each)', () => {
    // small steps: 5% over the current offer every round, again after a hold, accepting after 25 rounds; and a seller
    // who knows the ceiling: 8% over it every round, accepting after 4 (most buyers walk from that, so fewer sell).
    // Before the fix the first sold 2 of 150 above the ceiling (seed 73: $108 against a $74 ceiling).
    const strategies: [string, (amount: number, ceiling: number) => number, number, number][] = [
      ['5% steps', (a) => Math.round(a * 1.05), 25, 100],
      ['8% over the ceiling', (a, c) => Math.max(a + 1, Math.round(c * 1.08)), 4, 30],
    ];
    for (const [name, next, acceptAfter, minSold] of strategies) {
      let sold = 0;
      let splits = 0;
      const above: string[] = [];
      for (let seed = 1; seed <= 150; seed++) {
        const s0 = listedWithOffer(seed);
        if (!s0) continue;
        const { g, l, b } = s0;
        const ceiling = b.ceiling ?? b.amount * 1.1;
        for (let round = 0; round < acceptAfter && l.status === 'active' && b.status === 'open'; round++) {
          const before = b.amount;
          if (!counterBid(g, l.id, b.id, next(b.amount, ceiling)).ok) break;
          for (let h = 0; h < 40 && (b.status as string) === 'countered'; h++) devStepEconomy(g, 0.5); // counterBid changed it
          if (b.amount > before) splits++;
        }
        if (l.status === 'active' && b.status === 'open') acceptBid(g, l.id, b.id);
        if ((l.status as string) !== 'sold' || l.soldTo !== b.buyerId) continue;
        sold++;
        if (b.amount > ceiling + 1e-9) above.push(`seed ${seed}: sold for ${b.amount}, ceiling ${ceiling}`);
      }
      expect(sold, name).toBeGreaterThan(minSold);
      expect(splits, `${name}: the runs went through splits`).toBeGreaterThan(50);
      expect(above, `${name}:\n${above.join('\n')}`).toEqual([]);
    }
  });

  it('once bidding has closed, an offer can be accepted but not countered', () => {
    let checked = 0;
    for (let seed = 1; seed <= 60 && checked < 3; seed++) {
      const s0 = listedWithOffer(seed, 12);
      if (!s0) continue;
      const { g, l, b } = s0;
      while (g.clock.hour < l.endsHour && l.status === 'active' && b.status === 'open') devStepEconomy(g, 0.25);
      if (l.status !== 'active' || b.status !== 'open' || b.expiresHour <= g.clock.hour) continue;
      const counter = counterBid(g, l.id, b.id, Math.round(b.amount * 1.05));
      expect(counter.ok).toBe(false);
      expect(counter.message).toBe(BIDDING_CLOSED_TEXT);
      const hold = holdBidForCounter(g, l.id, b.id);
      expect(hold.ok).toBe(false);
      expect(hold.message).toBe(BIDDING_CLOSED_TEXT);
      expect(b.status).toBe('open');
      const amount = b.amount;
      const accepted = acceptBid(g, l.id, b.id);
      expect(accepted.ok, accepted.message).toBe(true);
      expect(l.status).toBe('sold');
      expect(b.amount).toBe(amount);
      checked++;
    }
    expect(checked).toBe(3);
  });
});

// ───────────────────────────── B-162: admission ─────────────────────────────

/** A day's expected admission takings at this price: the arrival rate the sim sets each step, times the price. */
function dayTakings(base: string, price: number): number {
  const g: GameState = JSON.parse(base);
  g.facility.admission = price;
  let arrivals = 0;
  const end = g.clock.hour + 24;
  while (g.clock.hour < end - 1e-9) {
    stepVisitors(g, 0.25, makeContext(g, 0.25, 'full'));
    arrivals += (g.visitors.live?.arrivalRate ?? 0) * 0.25;
    g.clock.hour += 0.25;
  }
  return arrivals * price;
}

describe('B-162 (REL-021): admission takings peak inside the slider\'s range', () => {
  it('the draw is today\'s line up to its old floor, then falls with the square of the price; takings only fall above the fair price', () => {
    const knee = 1.15 / 0.6;
    for (const x of [0, 0.25, 0.5, 1, 1.5, 1.9]) expect(admissionDraw(x)).toBeCloseTo(Math.min(1.2, 1.2 - 0.6 * x), 12);
    expect(admissionDraw(knee)).toBeCloseTo(0.05, 12);
    expect(admissionDraw(knee + 1e-9)).toBeCloseTo(0.05, 6);
    expect(admissionDraw(2 * knee)).toBeCloseTo(0.0125, 12);
    let prev = Infinity;
    for (let x = 1; x <= 40; x += 0.05) {
      const takings = x * admissionDraw(x);
      expect(takings, `price ${x.toFixed(2)} × fair`).toBeLessThan(prev);
      prev = takings;
    }
  });

  it('a day\'s takings peak inside $0–40 and fall above the peak, at three facility sizes', () => {
    for (const name of ['facility_shop', 'facility_store', 'facility_showroom']) {
      const g = FIXTURES[name]();
      g.isShowcase = false;
      for (const id of g.tankOrder) refreshTankCache(g, g.tanks[id]);
      const fair = fairAdmission(g);
      const base = JSON.stringify(g);
      const prices = Array.from({ length: 21 }, (_, i) => i * 2);
      const takings = prices.map((p) => dayTakings(base, p));
      const peak = takings.indexOf(Math.max(...takings));
      expect(prices[peak], name).toBeGreaterThan(0);
      expect(prices[peak], name).toBeLessThan(MAX_ADMISSION);
      for (let i = peak + 1; i < prices.length; i++) expect(takings[i], `${name} (fair $${fair}) at $${prices[i]}`).toBeLessThanOrEqual(takings[i - 1] + 1e-6);
      // above about twice the fair price, takings keep falling (they rose again before the fix)
      expect(dayTakings(base, MAX_ADMISSION), name).toBeLessThan(dayTakings(base, Math.round(fair * 2)));
    }
  });

  it('the rules allow no admission above the slider\'s $40', () => {
    const g = world();
    expect(MAX_ADMISSION).toBe(40);
    setAdmission(g, 250);
    expect(g.facility.admission).toBe(40);
    setAdmission(g, 41);
    expect(g.facility.admission).toBe(40);
    setAdmission(g, 40);
    expect(g.facility.admission).toBe(40);
    setAdmission(g, -5);
    expect(g.facility.admission).toBe(0);
  });
});
