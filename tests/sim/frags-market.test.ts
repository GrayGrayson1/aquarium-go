/**
 * Frags & cuttings on the market — valuation, listing flow, buyer interest and bids, the local store, and balance
 * (typical $/game-day for a mature reef and a mature planted tank). OWNER: lane "frags".
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank, DecorInstance, Listing } from '@/types';
import { getDecorDef } from '@/data/catalog/decor';
import { takeFrag, plantFrag } from '@/sim/aquascape';
import {
  fragValue,
  fragBundleValue,
  fragStoreOffer,
  fragSupplyFactor,
  createListing,
  previewListing,
  withdrawListing,
  acceptBid,
  forceBuyerVisit,
  quickSellFrags,
  buildFragProfile,
  makeBuyer,
  buyerFit,
  FRAG_HEALED_HOURS,
} from '@/sim/economy';
import { buyerInterestWeight } from '@/sim/economy/buyers';
import { composeBidMessage } from '@/sim/economy/messages';
import { stepMarket } from '@/sim/economy';
import { makeContext } from '@/sim/context';
import { stepProgression } from '@/sim/facility';
import { mulberry32 } from '@/sim/rng';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { reefGame, plantedGame, place, hours } from './frags-helpers';

function fragOf(g: GameState, t: Tank, defId: string, x = 0, z = 0): DecorInstance {
  const p = place(g, t, defId, x, z, 1.3, 1);
  const r = takeFrag(g, t.id, p.id);
  expect(r.ok, r.message).toBe(true);
  return g.inventory.frags!.find((f) => f.id === r.fragId)!;
}

describe('frags: valuation', () => {
  it('coral frags are worth more than plant cuttings, LPS/SPS more than soft corals', () => {
    const { g, t } = reefGame();
    const hammer = fragValue(g, fragOf(g, t, 'hammer_coral', -0.25, 0)).expected;
    const acro = fragValue(g, fragOf(g, t, 'acropora', 0, 0)).expected;
    const zoa = fragValue(g, fragOf(g, t, 'zoanthids', 0.25, 0)).expected;
    const gsp = fragValue(g, fragOf(g, t, 'green_star_polyps', 0.1, 0.1)).expected;
    const p = plantedGame();
    const rotala = fragValue(p.g, fragOf(p.g, p.t, 'rotala', -0.2, -0.1)).expected;
    const fern = fragValue(p.g, fragOf(p.g, p.t, 'java_fern', 0.2, 0)).expected;
    expect(hammer).toBeGreaterThan(zoa * 1.5);
    expect(acro).toBeGreaterThan(hammer * 0.9);
    expect(zoa).toBeGreaterThan(gsp);
    expect(Math.min(zoa, gsp)).toBeGreaterThan(Math.max(rotala, fern));
    expect(rotala).toBeGreaterThan(0.5);
    expect(rotala).toBeLessThan(6);
  });

  it('healed, grown-out, healthy frags are worth more; nothing ever goes NaN', () => {
    const { g, t } = reefGame();
    const f = fragOf(g, t, 'torch_coral');
    const fresh = fragValue(g, f).expected;
    f.frag!.plantedHour = g.clock.hour - FRAG_HEALED_HOURS - 1;
    const healed = fragValue(g, f).expected;
    expect(healed).toBeGreaterThan(fresh * 1.15);
    f.growth = 0.6;
    const grown = fragValue(g, f).expected;
    expect(grown).toBeGreaterThan(healed * 1.5);
    f.health = 40;
    expect(fragValue(g, f).expected).toBeLessThan(grown * 0.6);
    // garbage in → finite out
    const junk: DecorInstance = { ...f, growth: NaN, health: Infinity, frag: { takenHour: NaN, plantedHour: NaN, generation: NaN } };
    const v = fragValue(g, junk);
    expect(findNonFinite(v)).toEqual([]);
    expect(Number.isFinite(fragBundleValue(g, [junk, f]).expected)).toBe(true);
    expect(fragValue(g, { ...f, defId: 'nope' }).expected).toBe(0);
  });

  it('many recent frag sales soften prices (a side income, not a money tap)', () => {
    const { g, t } = reefGame();
    const f = fragOf(g, t, 'hammer_coral');
    const v0 = fragValue(g, f).expected;
    for (let i = 0; i < 12; i++) g.market.history.push({ hour: g.clock.hour - 1, kind: 'frag', title: 'x', price: 20, buyer: 'b' });
    expect(fragSupplyFactor(g).recent).toBe(12);
    expect(fragValue(g, f).expected).toBeLessThan(v0 * 0.65);
    // old sales stop counting after three days
    g.clock.hour += 80;
    expect(fragSupplyFactor(g).recent).toBe(0);
  });
});

describe('frags: listings', () => {
  it('lists frags from storage, holds them, returns them on withdraw', () => {
    const { g, t } = reefGame();
    const a = fragOf(g, t, 'hammer_coral', -0.2, 0);
    const b = fragOf(g, t, 'zoanthids', 0.2, 0);
    const prev = previewListing(g, { kind: 'frag', fragIds: [a.id, b.id] });
    expect(prev.ok, prev.message).toBe(true);
    expect(prev.expected).toBeGreaterThan(0);
    expect(prev.title).toMatch(/frag pack|Frags|×|frag/i);
    expect(prev.warnings.some((w) => /fresh cut/i.test(w))).toBe(true);
    const r = createListing(g, { kind: 'frag', fragIds: [a.id, b.id], reserve: prev.suggestedReserve, durationHours: 48 });
    expect(r.ok, r.message).toBe(true);
    expect(g.inventory.frags).toHaveLength(0);
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    expect(l.kind).toBe('frag');
    expect(l.fragItems).toHaveLength(2);
    expect(l.creatureIds).toEqual([]);
    // can't list the same frag twice
    expect(createListing(g, { kind: 'frag', fragIds: [a.id], reserve: 5, durationHours: 24 }).ok).toBe(false);
    expect(withdrawListing(g, l.id).ok).toBe(true);
    expect(g.inventory.frags!.map((f) => f.id).sort()).toEqual([a.id, b.id].sort());
    expect(createListing(g, { kind: 'frag', fragIds: [], reserve: 5, durationHours: 24 }).ok).toBe(false);
  });

  it('buyers bid with frag-appropriate messages; accepting sells, pays and counts', () => {
    const { g, t } = reefGame(31);
    const ids = [fragOf(g, t, 'hammer_coral', -0.25, 0).id, fragOf(g, t, 'torch_coral', 0, 0).id, fragOf(g, t, 'acropora', 0.25, 0).id];
    for (const f of g.inventory.frags!) f.frag!.plantedHour = g.clock.hour - 30;
    const r = createListing(g, { kind: 'frag', fragIds: ids, reserve: 1, durationHours: 72 });
    expect(r.ok, r.message).toBe(true);
    const l = g.market.listings.find((x) => x.id === r.listingId)! as Listing;
    for (let i = 0; i < 40 && !l.bids.some((b) => b.status === 'open'); i++) forceBuyerVisit(g, l.id);
    const open = l.bids.filter((b) => b.status === 'open');
    expect(open.length).toBeGreaterThan(0);
    for (const b of l.bids) {
      expect(b.message).not.toMatch(/[{}]/);
      expect(b.message.toLowerCase()).not.toMatch(/\b(animal|fry|lineage on|finnage|clutch)\b/);
      expect(Number.isFinite(b.amount)).toBe(true);
    }
    const best = open.sort((x, y) => y.amount - x.amount)[0];
    const money = g.finance.money;
    const s = acceptBid(g, l.id, best.id);
    expect(s.ok, s.message).toBe(true);
    expect(g.finance.money).toBeCloseTo(money + best.amount, 2);
    expect(l.status).toBe('sold');
    expect(g.progress.counters.fragsSold).toBe(3);
    expect(g.market.history.at(-1)?.kind).toBe('frag');
    // the achievements follow the counters
    stepProgression(g, 0.1, makeContext(g, 0.1, 'full'));
    expect(g.progress.achievements).toContain('first_frag');
  });

  it('unsold frags come back to storage when the listing ends', () => {
    const { g, t } = reefGame(8);
    const f = fragOf(g, t, 'green_star_polyps');
    const r = createListing(g, { kind: 'frag', fragIds: [f.id], reserve: 500, durationHours: 6 });
    expect(r.ok, r.message).toBe(true);
    for (let i = 0; i < 200; i++) {
      stepMarket(g, 0.1, makeContext(g, 0.1, 'full'));
      g.clock.hour += 0.1;
    }
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    expect(l.status).toBe('expired');
    expect(g.inventory.frags!.map((x) => x.id)).toEqual([f.id]);
  });

  it('reef collectors want coral frags; aquascapers want cuttings', () => {
    const { g, t } = reefGame(3);
    const corals = [fragOf(g, t, 'hammer_coral', -0.2, 0), fragOf(g, t, 'acropora', 0.2, 0)];
    const p = plantedGame(3);
    const plants = [fragOf(p.g, p.t, 'rotala', -0.2, -0.1), fragOf(p.g, p.t, 'java_fern', 0.2, 0)];
    const coralProfile = buildFragProfile(g, corals);
    const plantProfile = buildFragProfile(p.g, plants);
    expect(coralProfile.coralShare).toBe(1);
    expect(plantProfile.coralShare).toBe(0);
    const rng = mulberry32(5);
    const w = (arch: 'collector' | 'aquascaper', prof: typeof coralProfile, value: number) => {
      const b = makeBuyer(g, rng, arch);
      return buyerInterestWeight(b, prof, buyerFit(b, prof).fit, value);
    };
    expect(w('collector', coralProfile, 60)).toBeGreaterThan(w('collector', plantProfile, 60) * 2);
    expect(w('aquascaper', plantProfile, 8)).toBeGreaterThan(w('aquascaper', coralProfile, 8) * 2);
    for (const a of Object.values(coralProfile.attrs)) expect(a).toBeGreaterThanOrEqual(0);
    // frag messages read naturally for both kinds
    const msg = composeBidMessage(mulberry32(9), { archetype: 'aquascaper', isTank: false, isFrag: true, likes: ['beauty'], concerns: ['size'], vars: { species: 'rotala cuttings', name: 'these frags', morph: '', gallons: '', scope: 'frag', fragType: 'plant' } });
    expect(msg.length).toBeGreaterThan(10);
    expect(msg).not.toMatch(/[{}]|\[|actinic|polyps/);
  });

  it('the local store pays a fraction of fair value, instantly', () => {
    const { g, t } = reefGame(12);
    const f = fragOf(g, t, 'torch_coral');
    const offer = fragStoreOffer(g, f);
    expect(offer).toBeGreaterThan(0);
    expect(offer).toBeLessThan(fragValue(g, f).expected);
    const money = g.finance.money;
    const r = quickSellFrags(g, [f.id]);
    expect(r.ok, r.message).toBe(true);
    expect(g.finance.money - money).toBeCloseTo(offer, 2);
    expect(g.inventory.frags).toHaveLength(0);
    expect(quickSellFrags(g, [f.id]).ok).toBe(false);
    const rep = g.progress.reputation;
    const g2 = fragOf(g, t, 'zoanthids', 0.2, 0.1);
    const v0 = fragValue(g, g2).expected;
    quickSellFrags(g, [g2.id]);
    expect(g.progress.reputation).toBe(rep);
    expect(fragSupplyFactor(g).recent).toBe(2);
    void v0;
  });
});

/**
 * Balance: a mature tank cut whenever a colony is ready, every frag sold at fair value (market saturation included).
 * Prints $/game-day so the number in the report comes from this test.
 */
function harvest(g: GameState, t: Tank, days: number): { perDay: number; frags: number } {
  let total = 0;
  let n = 0;
  for (let h = 0; h < days * 24; h++) {
    g.clock.hour += 1;
    hours(g, t, 0);
    for (const inst of [...t.decor]) {
      const def = getDecorDef(inst.defId);
      if (!def || !(def.category === 'plant' || def.category === 'coral')) continue;
      const r = takeFrag(g, t.id, inst.id);
      if (!r.ok) continue;
      const f = g.inventory.frags!.find((x) => x.id === r.fragId)!;
      // sold after a day healing on a rack (fair value of a healed frag), which also saturates the frag market
      f.frag!.plantedHour = g.clock.hour - FRAG_HEALED_HOURS;
      const v = fragValue(g, f).expected;
      total += v;
      n++;
      g.inventory.frags = g.inventory.frags!.filter((x) => x.id !== f.id);
      g.market.history.push({ hour: g.clock.hour, kind: 'frag', title: 'sim', price: v, buyer: 'sim' });
    }
    // grow one hour (the clock already moved)
    g.clock.hour -= 1;
    hours(g, t, 1);
  }
  return { perDay: total / days, frags: n };
}

describe('frags: balance', () => {
  it('a mature reef and a mature planted tank earn a pleasant side income', () => {
    const { g, t } = reefGame(21);
    place(g, t, 'hammer_coral', -0.3, -0.05, 1.3);
    place(g, t, 'torch_coral', -0.1, 0.05, 1.3);
    place(g, t, 'frogspawn_coral', 0.1, -0.05, 1.3);
    place(g, t, 'zoanthids', 0.3, 0.05, 1.6);
    place(g, t, 'green_star_polyps', -0.3, 0.12, 1.5);
    place(g, t, 'mushroom_coral', 0.3, -0.12, 1.4);
    const reef = harvest(g, t, 30);
    const p = plantedGame(21);
    for (const [id, x, z] of [
      ['rotala', -0.35, -0.12],
      ['ludwigia', -0.15, -0.12],
      ['vallisneria', 0.05, -0.14],
      ['amazon_sword', 0.26, -0.03],
      ['java_fern', -0.3, 0.08],
      ['anubias_nana', -0.05, 0.08],
      ['cryptocoryne', 0.18, 0.06],
      ['monte_carlo', 0.35, 0.14],
    ] as [string, number, number][])
      place(p.g, p.t, id, x, z, 1.2);
    const planted = harvest(p.g, p.t, 30);
    console.log(`[frags balance] mature 40 gal reef (6 colonies): ${reef.frags} frags in 30 days ≈ $${reef.perDay.toFixed(1)}/game-day · mature 40 gal planted (8 plants): ${planted.frags} cuttings ≈ $${planted.perDay.toFixed(1)}/game-day`);
    expect(reef.perDay).toBeGreaterThan(5);
    expect(reef.perDay).toBeLessThan(60);
    expect(planted.perDay).toBeGreaterThan(1.5);
    expect(planted.perDay).toBeLessThan(reef.perDay);
    expect(findNonFinite(t.decor)).toEqual([]);
  });

  it('frags planted on a rack still grow with the ordinary growth sim', () => {
    const { g, t } = reefGame(22);
    const zoa = place(g, t, 'zoanthids', -0.2, 0, 1.5);
    place(g, t, 'frag_rack', 0.2, 0.08, 1.2, 0);
    const id = takeFrag(g, t.id, zoa.id).fragId!;
    const r = plantFrag(g, t.id, id, undefined, { rackOnly: true });
    expect(r.ok, r.message).toBe(true);
    const f = t.decor.find((d) => d.id === r.decorId)!;
    const g0 = f.growth!;
    hours(g, t, 24 * 10);
    expect(f.growth!).toBeGreaterThan(g0 + 0.2);
    // racks hold frags, not colonies: the scale grows only a little there
    expect(f.scale - (f.frag!.startScale ?? f.scale)).toBeLessThanOrEqual(0.121);
  });
});
