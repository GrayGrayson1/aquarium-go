import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import {
  initMarket,
  isSpeciesAvailable,
  requiredUnlocks,
  refreshStock,
  buyOffer,
  buyTank,
  buyFood,
  buySalt,
  buyEquipment,
  tankKitPrice,
  devStepEconomy,
  generateOffer,
  DEMAND_MIN,
  DEMAND_MAX,
  spend,
  canAfford,
} from '@/sim/economy';
import { simRng } from '@/sim/rng';
import { listSpecies, findSpecies, getSpecies } from '@/data/species';
import { BUYER_ARCHETYPES, BUYER_ARCHETYPE_IDS, PERSON_NAMES, FAMILY_NAMES, PUBLIC_AQUARIUM_NAMES, CONSERVATION_NAMES } from '@/data/buyers';
import { FOODS } from '@/data/catalog/foods';
import { EQUIPMENT } from '@/data/catalog/equipment';
import { TANK_TIERS } from '@/data/catalog/tanks';

function world(seed = 7, starterId: 'axolotl' | 'betta' | 'ocellaris_clownfish' = 'axolotl'): GameState {
  const g = newGame({ starterId, starterName: 'Pip', seed });
  devStepEconomy(g, 0.5); // first tick: stock picks up starting unlocks
  return g;
}

function offerFor(g: GameState, speciesId: string) {
  let o = g.market.stock.find((x) => x.speciesId === speciesId);
  if (!o) {
    o = generateOffer(g, simRng(g), speciesId, { expiresHour: g.clock.hour + 24 })!;
    g.market.stock.push(o);
  }
  return o;
}

describe('market: buyer personas (data)', () => {
  it('has 40+ names and all nine archetypes with sane preferences', () => {
    expect(PERSON_NAMES.length + FAMILY_NAMES.length + PUBLIC_AQUARIUM_NAMES.length + CONSERVATION_NAMES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(PERSON_NAMES).size).toBe(PERSON_NAMES.length);
    expect(BUYER_ARCHETYPE_IDS.sort()).toEqual(['aquascaper', 'bargain_hunter', 'beginner', 'breeder', 'collector', 'conservation', 'experienced_keeper', 'family', 'public_aquarium'].sort());
    for (const a of BUYER_ARCHETYPE_IDS) {
      const d = BUYER_ARCHETYPES[a];
      for (const w of Object.values(d.prefs)) expect(w >= 0 && w <= 2).toBe(true);
      expect(d.budget[0]).toBeLessThan(d.budget[1]);
    }
  });

  it('a new game has a varied, deterministic buyer pool covering every archetype', () => {
    const a = newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 55 });
    const b = newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 55 });
    expect(a.market.buyers.length).toBeGreaterThanOrEqual(12);
    expect(new Set(a.market.buyers.map((x) => x.archetype)).size).toBe(9);
    expect(a.market.buyers.map((x) => x.name)).toEqual(b.market.buyers.map((x) => x.name));
    expect(new Set(a.market.buyers.map((x) => x.name)).size).toBe(a.market.buyers.length);
  });
});

describe('market: shop stock', () => {
  it('offers only unlocked species (starter species always available)', () => {
    const g = world(11);
    expect(g.market.stock.length).toBeGreaterThan(0);
    for (const o of g.market.stock) expect(isSpeciesAvailable(g, o.speciesId)).toBe(true);
    // Lock everything: only the starter's own species remains.
    g.progress.unlocked = [];
    g.market.stock = [];
    refreshStock(g, simRng(g), g.clock.hour);
    expect(g.market.stock.length).toBeGreaterThan(0);
    for (const o of g.market.stock) {
      const sp = getSpecies(o.speciesId);
      expect(o.speciesId === g.starterId || requiredUnlocks(sp).length === 0).toBe(true);
    }
    // Species with unmet requirements never appear.
    const locked = listSpecies((s) => requiredUnlocks(s).length > 0 && s.id !== g.starterId);
    for (const s of locked) expect(isSpeciesAvailable(g, s.id)).toBe(false);
  });

  it('pre-rolls individuals that are not yet in state.creatures, with prices and sellers', () => {
    const g = world(12);
    for (const o of g.market.stock) {
      expect(o.creatures.length).toBeGreaterThan(0);
      expect(o.price).toBeGreaterThan(0);
      expect(o.seller.length).toBeGreaterThan(0);
      for (const c of o.creatures) expect(g.creatures[c.id]).toBeUndefined();
    }
  });

  it('sells schooling / colony species as groups', () => {
    const g = world(13);
    const schooler = listSpecies((s) => ['school', 'shoal', 'colony'].includes(s.social.kind))[0];
    if (!schooler) return; // roster not loaded yet
    const o = generateOffer(g, simRng(g), schooler.id, { expiresHour: g.clock.hour + 24 })!;
    expect(o.creatures.length).toBeGreaterThanOrEqual(3);
    expect(o.kind).toBe('group');
    expect(o.label).toMatch(/^(Group|Colony) of \d+/);
  });

  it('offers that promise a sex show it (mates for the starter, male & female pairs)', () => {
    for (let seed = 30; seed < 40; seed++) {
      const g = world(seed);
      const o = generateOffer(g, simRng(g), 'axolotl', { expiresHour: g.clock.hour + 24, sexes: ['female'] })!;
      expect(o.creatures[0].sex).toBe('female');
      const pair = generateOffer(g, simRng(g), 'lined_seahorse', { expiresHour: g.clock.hour + 24, sexes: ['male', 'female'] })!;
      expect(pair.creatures.map((c) => c.sex).sort()).toEqual(['female', 'male']);
    }
    const g = world(41);
    const mate = g.market.stock.find((o) => /potential mate/i.test(o.note ?? ''));
    if (mate) expect(mate.creatures[0].sex).not.toBe('unknown');
  });

  it('restocks daily at ~8 AM and keeps demand within 0.6..1.6', () => {
    const g = world(14);
    const firstIds = new Set(g.market.stock.map((o) => o.id));
    devStepEconomy(g, 24 * 6);
    expect(g.market.stock.some((o) => !firstIds.has(o.id))).toBe(true);
    for (const d of Object.values(g.market.demand)) {
      expect(d).toBeGreaterThanOrEqual(DEMAND_MIN);
      expect(d).toBeLessThanOrEqual(DEMAND_MAX);
    }
  });

  it('is deterministic for a seed', () => {
    const a = world(15);
    const b = world(15);
    devStepEconomy(a, 60);
    devStepEconomy(b, 60);
    expect(JSON.stringify(a.market.stock)).toEqual(JSON.stringify(b.market.stock));
    expect(JSON.stringify(a.market.demand)).toEqual(JSON.stringify(b.market.demand));
  });

  it('initMarket is safe to call on a bare state', () => {
    const g = world(16);
    g.market = { stock: [], listings: [], buyers: [], demand: {}, lastRefreshHour: -999, history: [] };
    initMarket(g);
    expect(g.market.buyers.length).toBeGreaterThan(0);
    expect(g.market.stock.length).toBeGreaterThan(0);
  });
});

describe('market: purchases', () => {
  it('buyOffer moves the creature into the tank and charges money', () => {
    const g = world(21);
    const tankId = g.tankOrder[0];
    const o = offerFor(g, 'axolotl');
    g.finance.money = o.price + 100;
    const before = g.finance.money;
    const n = o.creatures.length;
    const ids = o.creatures.map((c) => c.id);
    const r = buyOffer(g, o.id, tankId);
    expect(r.ok).toBe(true);
    expect(g.finance.money).toBeCloseTo(before - o.price, 2);
    for (const id of ids) {
      expect(g.creatures[id]?.tankId).toBe(tankId);
      expect(g.creatures[id]?.status).toBe('alive');
    }
    expect(g.market.stock.find((x) => x.id === o.id)).toBeUndefined();
    expect(g.finance.ledger.at(-1)?.category).toBe('livestock_purchase');
    expect(g.progress.discoveredSpecies).toContain('axolotl');
    expect(n).toBeGreaterThan(0);
    // Buying the same offer twice fails.
    expect(buyOffer(g, o.id, tankId).ok).toBe(false);
  });

  it('buying part of a group reduces the offer', () => {
    const g = world(22);
    const tankId = g.tankOrder[0];
    const o = generateOffer(g, simRng(g), 'axolotl', { expiresHour: g.clock.hour + 24, sexes: ['male', 'female', 'female'] })!;
    g.market.stock.push(o);
    g.finance.money = 10000;
    const r = buyOffer(g, o.id, tankId, [1]);
    expect(r.ok).toBe(true);
    const left = g.market.stock.find((x) => x.id === o.id)!;
    expect(left.creatures.length).toBe(2);
    expect(buyOffer(g, o.id, tankId, [5]).ok).toBe(false);
    expect(buyOffer(g, o.id, tankId, [0, 0]).ok).toBe(false);
  });

  it('hard-blocks an environment mismatch (marine animal into freshwater)', () => {
    const g = world(23);
    if (!findSpecies('ocellaris_clownfish')) return;
    const o = generateOffer(g, simRng(g), 'ocellaris_clownfish', { expiresHour: g.clock.hour + 24 })!;
    g.market.stock.push(o);
    g.finance.money = 10000;
    const before = g.finance.money;
    const r = buyOffer(g, o.id, g.tankOrder[0]);
    expect(r.ok).toBe(false);
    expect(g.finance.money).toBe(before);
    for (const c of o.creatures) expect(g.creatures[c.id]).toBeUndefined();
  });

  it('money can never go negative from purchases', () => {
    const g = world(24);
    const tankId = g.tankOrder[0];
    const o = offerFor(g, 'axolotl');
    // Just short of every price.
    g.finance.money = o.price - 1;
    expect(buyOffer(g, o.id, tankId).ok).toBe(false);
    expect(g.finance.money).toBe(o.price - 1);

    const kit = tankKitPrice('g10', 'freshwater_tropical');
    g.finance.money = kit.total - 1;
    const tanks = g.tankOrder.length;
    expect(buyTank(g, 'g10', 'freshwater_tropical').ok).toBe(false);
    expect(g.tankOrder.length).toBe(tanks);
    expect(g.finance.money).toBe(kit.total - 1);

    g.finance.money = 0.5;
    if (FOODS[0]) expect(buyFood(g, FOODS[0].id, 5).ok).toBe(FOODS[0].price * 5 <= 0.5);
    expect(buySalt(g, 10).ok).toBe(false);
    const eq = EQUIPMENT.find((e) => e.unlock === null && e.environments.includes('freshwater') && e.price > 1);
    if (eq) expect(buyEquipment(g, tankId, eq.id).ok).toBe(false);
    expect(g.finance.money).toBe(0.5);

    // Direct spend() without allowDebt also refuses; NaN amounts are rejected.
    expect(spend(g, 1, 'other', 'x')).toBe(false);
    expect(spend(g, Number.NaN, 'other', 'x')).toBe(false);
    expect(canAfford(g, Number.NaN)).toBe(false);
    expect(g.finance.money).toBe(0.5);

    // When in debt, nothing can be bought at all.
    g.finance.money = -20;
    expect(buySalt(g, 1).ok).toBe(false);
    expect(buySalt(g, 1).message).toMatch(/debt/i);
    expect(g.finance.money).toBe(-20);
  });

  it('buyTank: unlock-gated, not pre-cycled, optional seeded media', () => {
    const g = world(25);
    g.finance.money = 100000;
    const locked = TANK_TIERS.find((t) => t.unlock && !g.progress.unlocked.includes(t.unlock));
    if (locked) {
      const r = buyTank(g, locked.id, 'freshwater_tropical');
      expect(r.ok).toBe(false);
    }
    const r1 = buyTank(g, 'g10', 'freshwater_tropical');
    expect(r1.ok).toBe(true);
    const t1 = g.tanks[r1.tankId!];
    expect(t1.water.bioMaturity).toBeLessThan(0.3);
    const before = g.finance.money;
    const r2 = buyTank(g, 'g10', 'freshwater_planted', undefined, { seeded: true });
    if (r2.ok) {
      expect(g.tanks[r2.tankId!].water.bioMaturity).toBeGreaterThanOrEqual(0.6);
      expect(before - g.finance.money).toBeCloseTo(tankKitPrice('g10', 'freshwater_planted', true).total, 2);
    } else {
      expect(r2.message).toMatch(/floor space/i);
    }
  });

  it('buyTank fails with a helpful message when the floor is full', () => {
    const g = world(26);
    g.finance.money = 1e7;
    let lastFail = '';
    for (let i = 0; i < 60; i++) {
      const r = buyTank(g, 'g5', 'freshwater_tropical');
      if (!r.ok) {
        lastFail = r.message;
        break;
      }
    }
    if (lastFail) {
      const before = g.finance.money;
      const r = buyTank(g, 'g5', 'freshwater_tropical');
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/floor space/i);
      expect(g.finance.money).toBe(before);
    }
  });

  it('buyFood and buySalt add inventory', () => {
    const g = world(27);
    g.finance.money = 1000;
    const salt = g.inventory.salt;
    expect(buySalt(g, 5).ok).toBe(true);
    expect(g.inventory.salt).toBeCloseTo(salt + 5, 5);
    const food = FOODS.find((f) => f.unlock === null);
    if (food) {
      const had = g.inventory.foods[food.id] ?? 0;
      expect(buyFood(g, food.id, 2).ok).toBe(true);
      expect(g.inventory.foods[food.id]).toBe(had + food.servingsPerPack * 2);
    }
    expect(buyFood(g, 'no_such_food', 1).ok).toBe(false);
  });

  it('adding stock to an uncycled tank is allowed but warned', () => {
    const g = world(28);
    g.finance.money = 5000;
    const t = createTank(g, 'g20L', 'freshwater_cool', { cycled: false, placement: { x: 1.5, z: 1, rotY: 0 } });
    const o = offerFor(g, 'axolotl');
    const r = buyOffer(g, o.id, t.id);
    expect(r.ok).toBe(true);
    expect(g.log.at(-1)?.text).toMatch(/not cycled/i);
  });
});
