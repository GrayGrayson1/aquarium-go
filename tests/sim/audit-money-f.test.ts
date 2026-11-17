// @vitest-environment node
/**
 * Audit 2026-11-17, area F (money): buying, selling, prices, and never being left broke without a way out. One test per
 * finding fixed; server-rendered like ui-shop-05 where the fix is on a screen.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, ShopOffer } from '@/types';
import { useUI } from '@/state/ui';
import { ShopTab } from '@/ui/panels/market/Shop';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { refreshFoodStatus } from '@/sim/tankStatus';
import { SuppliesTab } from '@/ui/panels/market/Supplies';
import { cantAffordTitle, hungryAndShort, moneyHeld, needsCashIdeas, wholeMoney, cheapestFoodPrice, CASH_LINK } from '@/ui/common/moneyShort';
import { FinancesPanel } from '@/ui/panels/finances/FinancesPanel';
import { eventLink } from '@/ui/hud/eventLinks';
import { devStepEconomy, holdOffer, offerHeld, buyOffer, MAX_NEGOTIATION_HOLD_HOURS, typicalOpening, RESERVE_BANDS, devOpenMarket, createListing, forceBuyerVisit, acceptBid, restartNeed, tankKitPrice } from '@/sim/economy';
import { cheapestKit, HOLD_RELEASE_HOURS } from '@/sim/economy/purchases';
import { applyCommand, type Actor } from '@/sim/commands';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { marketAccess, cashSuggestions, dailyOperatingCost, quickSellQuote } from '@/sim/economy';
import { installWaterRoom } from '@/sim/automation/water';
import { installFoodRoom } from '@/sim/automation/food';
import { unlockProgress } from '@/sim/facility';
import { lockViews } from '@/ui/panels/common/UnlockHelp';
import { useShopFilters, useShopSearch, envMatches, tankFits } from '@/ui/panels/market/shopFilters';
import { ListingsTab, CounterNotes } from '@/ui/panels/market/Listings';
import { decorSellOffer } from '@/ui/panels/build/BuildPanel';
import { DECOR } from '@/data/catalog/decor';
import { decorSellValue } from '@/sim/aquascape';
import type { DecorInstance } from '@/types';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { reserveHint, QuickSellLine } from '@/ui/panels/market/CreateListing';
import { addCreature, createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { offerLeavesText } from '@/ui/panels/market/Shop';
import { PARCEL_DAY_KEY, PARCEL_MEALS, clubFoodParcel } from '@/sim/economy/finance';
import { portionForDemand, TYPICAL_MEAL_HUNGER } from '@/sim/water/food';
import { effectiveBioload } from '@/sim/water/env';
import { FOODS, eatsFood } from '@/data/catalog/foods';
import { findSpecies } from '@/data/species';
import { decodeRecord, encodeRecord, stateHash } from '@/persistence';
import { AQUARIUM_CLUB } from '@/data/buyers';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function game(money = 5000): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
  g.finance.money = money;
  useGame.getState().setGame(g);
  return g;
}

/** The starter's food cupboard is bare. */
function noFood(g: GameState): void {
  for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 0;
  refreshFoodStatus(g);
}

const supplies = (g: GameState) => renderToStaticMarkup(createElement(SuppliesTab, { g }));

afterEach(() => useGame.getState().setGame(null));

describe('F1: a greyed "Buy" says why, and how to raise the money', () => {
  it('a disabled button’s reason: in debt, or short of the price', () => {
    expect(cantAffordTitle(-12, 6)).toBe('You’re $12 in debt, so purchases are paused');
    expect(cantAffordTitle(4.5, 6)).toBe('Not enough money: you have $4.50');
    expect(cantAffordTitle(6, 6)).toBeUndefined();
    expect(moneyHeld(199.6)).toBe('$199'); // never more than the player has (F11)
  });

  it('with money to spare, no callout', () => {
    const out = supplies(game());
    expect(out).not.toContain('supplies-money-short');
  });

  it('short of the cheapest food: the callout, a way to raise cash, and a reason on each greyed button', () => {
    const g = game(1);
    const out = supplies(g);
    expect(out).toContain('data-testid="supplies-money-short"');
    expect(text(out)).toContain('Not enough money You have $1: not enough for anything here.');
    expect(out).toContain('data-testid="supplies-raise-cash"');
    expect(text(out)).toContain('Ways to raise cash');
    expect(out).toContain('title="Not enough money: you have $1"');
    expect(needsCashIdeas(g)).toBe(true);
  });

  it('in debt: purchases are paused, food included', () => {
    const g = game(-12);
    const t = text(supplies(g));
    expect(t).toContain('Purchases are paused');
    expect(t).toContain('You’re $12 in debt, so purchases are paused, food included.');
  });

  it('no food left and less money than the cheapest pack the animal eats (A7’s worst case)', () => {
    const g = game(1);
    noFood(g);
    const h = hungryAndShort(g);
    expect(h).not.toBeNull();
    expect(h!.tanks[0].names).toContain('Ember');
    const t = text(supplies(g));
    expect(t).toContain('Not enough money for food');
    expect(t).toMatch(/Ember has no food left, and \$1 won’t buy a pack of .+ \(\$\d+\)\./);
    // with enough for that pack, nothing to say
    g.finance.money = h!.price;
    expect(hungryAndShort(g)).toBeNull();
  });
});

describe('review fix: every "Ways to raise cash" link lands on the ideas', () => {
  /** The starter's food is running low (two servings of what it eats), and money is $1 under that pack. */
  function lowFood(): { g: GameState; price: number } {
    const g = game(0);
    for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 0;
    refreshFoodStatus(g);
    const h = hungryAndShort(g)!;
    g.inventory.foods[h.foodId] = 2;
    g.finance.money = h.price - 1;
    refreshFoodStatus(g);
    return { g, price: h.price };
  }

  it('Finances opened with the "cash" target shows its ways to raise cash, whatever the balance', () => {
    const g = game(400);
    useUI.setState({ panelTarget: 'cash' });
    const out = renderToStaticMarkup(createElement(FinancesPanel));
    useUI.setState({ panelTarget: null });
    expect(out).toContain('data-testid="finance-ideas"');
    expect(renderToStaticMarkup(createElement(FinancesPanel))).not.toContain('finance-ideas'); // without it, $400 needs none
    expect(g.finance.money).toBe(400);
    expect(CASH_LINK).toEqual({ panel: 'finances', panelTarget: 'cash' });
  });

  it('food running low with less money than its pack: Finances lists the ideas and Supplies explains the greyed Buy', () => {
    const { g, price } = lowFood();
    expect(g.tanks[g.tankOrder[0]].cache.foodLevel).toBe('low');
    expect(g.finance.money).toBeGreaterThanOrEqual(cheapestFoodPrice(g)); // the old rule (cheapest food on sale) missed it
    expect(needsCashIdeas(g)).toBe(true);
    expect(renderToStaticMarkup(createElement(FinancesPanel))).toContain('data-testid="finance-ideas"');
    const t = text(supplies(g));
    expect(t).toContain('Not enough money for food');
    expect(t).toContain(`Food for Ember is running low, and ${moneyHeld(price - 1)} won’t buy a pack of`);
    expect(t).toContain(`(${moneyHeld(price)}).`);
  });
});

describe('F2: money trouble leads to Finances', () => {
  const toMidnight = (g: GameState) => 24 - (g.clock.hour % 24) + 0.25;

  it('the midnight debt warning and "Cash is getting low" open Finances (and the low-cash tip is a toast)', () => {
    const g = game(-20);
    devStepEconomy(g, toMidnight(g), { finance: true });
    const red = g.log.find((e) => /in the red after today's bills/.test(e.text))!;
    expect(red.toast).toBe(true);
    expect(eventLink(red)).toMatchObject({ panel: 'finances', label: 'Open Finances' });

    const h = game(1.5);
    h.finance.lastWarnHour = -999;
    devStepEconomy(h, toMidnight(h), { finance: true });
    const low = h.log.find((e) => /^Cash is getting low/.test(e.text))!;
    expect(low).toBeDefined();
    expect(low.toast).toBe(true);
    expect(eventLink(low)).toMatchObject({ panel: 'finances' });
  });

  it('the club’s loans, a room money won’t restock and back in the black open Finances too', () => {
    for (const text of [
      `Good news: ${AQUARIUM_CLUB} heard you were struggling and lent you $140, interest-free. It is repaid automatically.`,
      `${AQUARIUM_CLUB} would rather see your room full than quiet: they've lent you another $1,230, interest-free, to start again.`,
      `Loan repaid in full — ${AQUARIUM_CLUB} sends their thanks and a round of applause.`,
      `Your tanks are empty and $4 won't restock them. If that's still true tomorrow, ${AQUARIUM_CLUB} will lend you enough to start again.`,
      `You're back in the black with $12. Purchases are available again.`,
    ])
      expect(eventLink({ kind: 'info', text }), text).toMatchObject({ panel: 'finances' });
    // the sim still writes the phrases the link looks for (update MONEY_NEWS if this copy changes)
    const src = readFileSync(fileURLToPath(new URL('../../src/sim/economy/finance.ts', import.meta.url)), 'utf8');
    for (const phrase of ["in the red after today's bills", 'Cash is getting low:', ', interest-free', 'Loan repaid in full', "won't restock ${", "You're back in the black"]) expect(src).toContain(phrase);
    expect(eventLink({ kind: 'info', text: 'Pip blew a bubble nest.' })).toBeNull();
  });

  it('Finances’ ways to raise cash are links to where each happens', () => {
    const g = game(-30);
    g.progress.unlocked.push('market_listings');
    addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: 120 }), g.tankOrder[0]); // a spare animal to list (F13)
    const out = renderToStaticMarkup(createElement(FinancesPanel));
    expect(out).toContain('data-testid="finance-idea-list_animal"');
    expect(out).toContain('data-testid="finance-idea-go-list_animal"');
    expect(text(out)).toContain('New listing');
  });
});

describe('the club’s food parcel (owner’s choice, F5 / A7): animals never starve just because the till is empty', () => {
  const step = (g: GameState, hours: number) => devStepEconomy(g, hours, { finance: true, market: false });
  function hungryBroke(money = 1): GameState {
    const g = game(money);
    noFood(g);
    g.clock.hour = 24 * 3 + 10.5; // mid-morning, day 4
    for (const c of Object.values(g.creatures)) if (c.status === 'alive') c.stats.hunger = 80;
    return g;
  }
  const eaten = (g: GameState) => {
    const ember = Object.values(g.creatures).find((c) => c.name === 'Ember')!;
    const sp = findSpecies(ember.speciesId)!;
    return FOODS.filter((f) => eatsFood(sp, f)).reduce((n, f) => n + (g.inventory.foods[f.id] ?? 0), 0);
  };

  it('drops off a little of the cheapest food Ember eats (about two days), free, with the approved words and a link', () => {
    const g = hungryBroke(1);
    step(g, 1);
    expect(eaten(g)).toBeGreaterThan(0);
    // review fix: "a small parcel", not a whole pack (Tropical Flakes are 120 servings): four of the default feed's meals
    const ember = Object.values(g.creatures).find((c) => c.name === 'Ember')!;
    const sp = findSpecies(ember.speciesId)!;
    const food = FOODS.find((f) => (g.inventory.foods[f.id] ?? 0) > 0)!;
    expect(eaten(g)).toBe(Math.max(1, Math.ceil(portionForDemand(food, effectiveBioload(sp, ember.sizeCm) * TYPICAL_MEAL_HUNGER, 1) * PARCEL_MEALS)));
    expect(eaten(g)).toBeLessThan(food.servingsPerPack / 4);
    expect(g.finance.money).toBe(1);
    const e = g.log.find((x) => /^The aquarium club dropped off/.test(x.text))!;
    expect(e.text).toBe('The aquarium club dropped off a little food for Ember. Short on cash? Friends tip when your animals are healthy, or sell something in Livestock.');
    expect(e.toast).toBe(true);
    expect(eventLink(e)).toMatchObject({ panel: 'finances', target: 'cash', label: 'Ways to raise cash' });
    expect(g.progress.counters[PARCEL_DAY_KEY]).toBe(3);
  });

  it('in debt too (purchases are paused)', () => {
    const g = hungryBroke(-40);
    step(g, 1);
    expect(eaten(g)).toBeGreaterThan(0);
  });

  it('at most once a game day', () => {
    const g = hungryBroke(1);
    step(g, 1);
    noFood(g);
    step(g, 6);
    expect(eaten(g)).toBe(0);
    expect(g.log.filter((x) => /^The aquarium club dropped off/.test(x.text))).toHaveLength(1);
    step(g, 24 - (g.clock.hour % 24) + 1.01); // the next day
    expect(eaten(g)).toBeGreaterThan(0);
    expect(g.log.filter((x) => /^The aquarium club dropped off/.test(x.text))).toHaveLength(2);
  });

  it('nothing when the money covers a pack, when fitting food is in stock, or when nobody is very hungry', () => {
    const rich = hungryBroke(50);
    step(rich, 1);
    expect(eaten(rich)).toBe(0);
    expect(rich.progress.counters[PARCEL_DAY_KEY]).toBeUndefined();

    const fed = game(1);
    fed.clock.hour = 24 * 3 + 10.5;
    for (const c of Object.values(fed.creatures)) if (c.status === 'alive') c.stats.hunger = 80;
    const before = eaten(fed);
    expect(before).toBeGreaterThan(0);
    step(fed, 1);
    expect(eaten(fed)).toBe(before);

    const calm = hungryBroke(1);
    for (const c of Object.values(calm.creatures)) c.stats.hunger = 40;
    step(calm, 1);
    expect(eaten(calm)).toBe(0);
    expect(calm.progress.counters[PARCEL_DAY_KEY]).toBeUndefined();
  });

  it('no new save field: a save that never got a parcel gains nothing, and one that did round-trips unchanged', () => {
    const g = game();
    const before = stateHash(g);
    clubFoodParcel(g, g.clock.hour + 1); // nobody hungry: nothing written
    expect(g.progress.counters[PARCEL_DAY_KEY]).toBeUndefined();
    expect(stateHash(g)).toBe(before);

    const fed = hungryBroke(1);
    step(fed, 1);
    expect(fed.progress.counters[PARCEL_DAY_KEY]).toBe(3);
    const first = decodeRecord(encodeRecord(fed, 'auto').text);
    const again = decodeRecord(encodeRecord(first.state, 'auto').text);
    expect(first.repairs).toEqual([]);
    expect(again.repairs).toEqual([]);
    expect(stateHash(again.state)).toBe(stateHash(first.state));
    expect((again.state as GameState).progress.counters[PARCEL_DAY_KEY]).toBe(3);
  });
});

describe('F6 (the owner’s choice): an open offer stays while you look', () => {
  const at8 = (g: GameState) => (Math.floor((g.clock.hour - 8) / 24) + 1) * 24 + 8; // the next 8 AM restock (as the shop counts it)
  function shopWorld(): GameState {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 33 });
    g.clock.speed = 1;
    devStepEconomy(g, 0.1, { market: true });
    return g;
  }
  /** Step the market to just after the next 8 AM restock. */
  const pastRestock = (g: GameState) => devStepEconomy(g, at8(g) - g.clock.hour + 0.2, { market: true });
  /** Regular stock that leaves at the next morning's restock. */
  const leavingAtRestock = (g: GameState) => g.market.stock.find((o) => Math.abs(o.expiresHour - at8(g)) < 1e-6)!;

  it('a held offer survives its own leave time and the morning restock; the restock around it is the same', () => {
    const plain = shopWorld();
    const held = structuredClone(plain);
    const o = leavingAtRestock(held);
    expect(o).toBeDefined();
    // hold just before the restock (a look of 2 real minutes, renewed as the screen does)
    devStepEconomy(held, at8(held) - held.clock.hour - 0.5, { market: true });
    devStepEconomy(plain, at8(plain) - plain.clock.hour - 0.5, { market: true });
    expect(holdOffer(held, o.id).ok).toBe(true);
    expect(offerHeld(held.market.stock.find((x) => x.id === o.id)!, held.clock.hour)).toBe(true);
    pastRestock(held);
    pastRestock(plain);
    expect(held.market.stock.some((x) => x.id === o.id)).toBe(true);
    expect(plain.market.stock.some((x) => x.id === o.id)).toBe(false);
    // the same new stock, drawn the same way, held or not
    const sig = (g: GameState) => g.market.stock.filter((x) => x.id !== o.id).map((x) => `${x.id}:${x.speciesId}:${x.price}:${x.creatures.map((c) => c.id).join('.')}`);
    expect(sig(held)).toEqual(sig(plain));
    expect(held.market.lastRefreshHour).toBe(plain.market.lastRefreshHour);
    // it can still be bought while held
    expect(buyOffer(held, o.id, held.tankOrder[0]).message).not.toMatch(/expired/);
  });

  it('released on close: it leaves within about 20 real seconds (review fix: not at once)', () => {
    const g = shopWorld();
    const o = leavingAtRestock(g);
    devStepEconomy(g, at8(g) - g.clock.hour - 0.1, { market: true });
    holdOffer(g, o.id);
    pastRestock(g);
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(true);
    const start = o.holdStartHour;
    expect(holdOffer(g, o.id, true).ok).toBe(true);
    expect(o.holdStartHour).toBe(start); // the start is kept, so a later renewal stays inside the same cap
    expect(o.holdUntilHour).toBeCloseTo(g.clock.hour + HOLD_RELEASE_HOURS, 6);
    devStepEconomy(g, HOLD_RELEASE_HOURS / 2, { market: true });
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(true);
    devStepEconomy(g, HOLD_RELEASE_HOURS / 2 + 0.2, { market: true });
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(false);
  });

  it('in a shared shop, one member closing the offer leaves it for another who is still looking', () => {
    const g = shopWorld();
    const o = leavingAtRestock(g);
    const ana = (at: number): Actor => ({ id: 'm_ana', name: 'Ana', at });
    const ben = (at: number): Actor => ({ id: 'm_ben', name: 'Ben', at });
    devStepEconomy(g, at8(g) - g.clock.hour - 0.5, { market: true });
    expect(applyCommand(g, { k: 'holdOffer', offer: o.id }, ana(1_000)).ok).toBe(true);
    expect(applyCommand(g, { k: 'holdOffer', offer: o.id }, ben(1_000)).ok).toBe(true);
    pastRestock(g); // its time is up: only the hold keeps it
    expect(applyCommand(g, { k: 'holdOffer', offer: o.id, release: true }, ben(20_000)).ok).toBe(true);
    devStepEconomy(g, 15 * GAME_HOURS_PER_REAL_SECOND, { market: true }); // Ana's screen renews every 15 real s
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(true);
    expect(applyCommand(g, { k: 'holdOffer', offer: o.id }, ana(35_000)).ok).toBe(true);
    devStepEconomy(g, 1.5, { market: true });
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(true);
    expect(o.holdUntilHour! - g.clock.hour).toBeGreaterThan(HOLD_RELEASE_HOURS);
  });

  it('a partial buy releases the rest of the group the same way (not at once)', () => {
    const g = game();
    g.market.stock = [];
    const rng = simRng(g);
    const o: ShopOffer = { id: 'offer_part', kind: 'group', speciesId: 'neon_tetra', creatures: Array.from({ length: 6 }, () => createCreature(g, rng, 'neon_tetra')), price: 30, unitPrice: 6, seller: 'Test Breeder', expiresHour: g.clock.hour + 48 };
    g.market.stock.push(o);
    holdOffer(g, o.id);
    const start = o.holdStartHour;
    expect(buyOffer(g, o.id, g.tankOrder[0], [0, 1]).ok).toBe(true);
    expect(o.holdStartHour).toBe(start);
    expect(o.holdUntilHour).toBeCloseTo(g.clock.hour + HOLD_RELEASE_HOURS, 6);
  });

  it('the safety limit: a screen left open (or a dropped connection) can’t keep an offer forever', () => {
    const g = shopWorld();
    const o = leavingAtRestock(g);
    devStepEconomy(g, at8(g) - g.clock.hour - 0.1, { market: true });
    // renewed every 15 real seconds (1.5 game hours at 1×), as the open screen does
    const from = g.clock.hour;
    let renewals = 0;
    while (g.market.stock.some((x) => x.id === o.id) && renewals < 400) {
      holdOffer(g, o.id);
      devStepEconomy(g, 1.5, { market: true });
      renewals++;
    }
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(false);
    // it stayed about the bid hold's cap (≈ 6 real minutes at any speed), not for ever
    expect(g.clock.hour - from).toBeGreaterThan(MAX_NEGOTIATION_HOLD_HOURS - 3);
    expect(g.clock.hour - from).toBeLessThan(MAX_NEGOTIATION_HOLD_HOURS + 3);
  });

  it('the offer screen says when it leaves, and that it waits', () => {
    expect(offerLeavesText(24 * 3 + 8, 24 * 3 + 7.6)).toBe('Leaves the shop this morning. It stays while you’re looking.');
    expect(offerLeavesText(24 * 4 + 8, 24 * 3 + 15)).toBe('Leaves the shop tomorrow morning. It stays while you’re looking.');
    expect(offerLeavesText(24 * 3 + 18, 24 * 3 + 15)).toBe('Leaves the shop this evening. It stays while you’re looking.');
    expect(offerLeavesText(24 * 6 + 8, 24 * 3 + 15)).toBe('Leaves the shop in 3 days. It stays while you’re looking.');
  });
});

describe('F3: the listing’s price advice matches what buyers in the code actually offer', () => {
  /**
   * Review fix — the advice is measured on the bid model itself, the way a player meets it: natural arrivals over a
   * 72-hour listing (no forced visits, so late bids' discount counts), for a single animal and a group. The constant
   * and the bands in listings.ts were set from 25 seeds of five listings; here a few seeds keep them from drifting.
   */
  function firstOffers(sp: string, n: number, kind: 'creature' | 'group', seeds: number): number[] {
    const out: number[] = [];
    for (let seed = 1; seed <= seeds; seed++) {
      const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 1000 + seed });
      g.clock.speed = 1;
      devOpenMarket(g);
      const ids = Array.from({ length: n }, () => {
        const c = addCreature(g, createCreature(g, simRng(g), sp, { ageDays: 150 }), g.tankOrder[0]);
        c.stats.health = 100;
        delete c.illness;
        return c.id;
      });
      const r = createListing(g, { kind, creatureIds: ids, reserve: 1, durationHours: 72 });
      expect(r.ok).toBe(true);
      const l = g.market.listings.find((x) => x.id === r.listingId)!;
      for (let h = 0; h < 73 && l.status === 'active'; h++) devStepEconomy(g, 1, { market: true });
      for (const b of l.bids) out.push(b.amount / l.snapshot.valuation);
    }
    return out;
  }

  it('measured: first offers land in the quoted range, and each reserve band turns down the share it says', () => {
    const ratios = [...firstOffers('betta', 1, 'creature', 4), ...firstOffers('neon_tetra', 6, 'group', 4)].sort((a, b) => a - b);
    expect(ratios.length).toBeGreaterThan(80);
    const below = (x: number) => ratios.filter((r) => r < x).length / ratios.length;
    const { low, high } = typicalOpening(100);
    const inRange = ratios.filter((r) => r >= low / 100 && r <= high / 100).length / ratios.length;
    const median = ratios[Math.floor(ratios.length / 2)];
    expect(inRange).toBeGreaterThan(0.5); // "usually open at …"
    expect(median).toBeGreaterThan(0.84);
    expect(median).toBeLessThan(0.98);
    expect(below(low / 100)).toBeLessThan(0.3); // "Most first offers will reach this"
    expect(below(RESERVE_BANDS.half)).toBeLessThan(0.5); // "Some … will be below this"
    expect(below(RESERVE_BANDS.overHalf)).toBeGreaterThan(0.3); // "About half"
    expect(below(RESERVE_BANDS.overHalf)).toBeLessThan(0.7);
    expect(below(1.0)).toBeGreaterThan(0.45); // a reserve at fair value: more than half turned down
    expect(below(high / 100 + 0.001)).toBeGreaterThan(0.6); // "Above most first offers: most will be turned down"
  });

  it('the quoted range and the reserve hint’s words', () => {
    expect(typicalOpening(100)).toEqual({ low: 73, high: 105 });
    expect(reserveHint(110, 100)).toBe('Above most first offers: most will be turned down automatically.');
    expect(reserveHint(100, 100)).toBe('More than half of first offers will be below this and turned down automatically.');
    expect(reserveHint(90, 100)).toBe('About half of first offers will be below this and turned down automatically.');
    expect(reserveHint(80, 100)).toBe('Some first offers will be below this and turned down automatically.');
    expect(reserveHint(70, 100)).toBe('Most first offers will reach this. You still choose which one to accept.');
  });
});

describe('F4: buying animals into a tank that is still cycling says so first', () => {
  function cyclingShop(bio: number) {
    const g = game();
    g.market.stock = [];
    const t = g.tanks[g.tankOrder[0]];
    t.water.bioMaturity = bio;
    const rng = simRng(g);
    const o: ShopOffer = { id: 'offer_f4', kind: 'creature', speciesId: 'mystery_snail', creatures: [createCreature(g, rng, 'mystery_snail')], price: 30, seller: 'Test Breeder', expiresHour: g.clock.hour + 48 };
    g.market.stock.push(o);
    useUI.setState({ focusedTankId: t.id });
    const out = renderToStaticMarkup(createElement(ShopTab, { g, offerId: o.id, setOfferId: () => {} }));
    return { g, t, o, out, txt: text(out) };
  }

  it('under 40 % established: the warning, the tile’s cycle and the risk tick', () => {
    const { t, out, txt } = cyclingShop(0.2);
    expect(out).toContain('data-testid="offer-cycling"');
    expect(txt).toContain(`${t.name} is still cycling (20% established). New animals here face ammonia spikes: add bottled bacteria, or pick a cycled tank.`);
    expect(txt).toContain('Cycling 20%');
    expect(txt).toContain('I understand the risks and want to go ahead');
  });

  it('seeded media (60 %): the warning, no tick; a cycled tank: nothing', () => {
    const seeded = cyclingShop(0.6);
    expect(seeded.txt).toContain('is still cycling (60% established)');
    expect(seeded.txt).not.toContain('I understand the risks');
    const cycled = cyclingShop(0.9);
    expect(cycled.out).not.toContain('offer-cycling');
    expect(cycled.txt).not.toContain('Cycling 90%');
  });

  it('after paying, the not-cycled note is a toast, not only a log line', () => {
    const { g, t, o } = cyclingShop(0.2);
    expect(buyOffer(g, o.id, t.id).ok).toBe(true);
    const e = g.log.find((x) => /not cycled yet/.test(x.text))!;
    expect(e.toast).toBe(true);
  });
});

describe('F5: in debt after the club’s one-time loan, the words say so plainly', () => {
  it('the midnight warning, Finances and the hold-steady idea', () => {
    const g = game(-40);
    g.finance.loan = { amount: 140, outstanding: 0, takenHour: 10, repaidHour: 50 };
    devStepEconomy(g, 24 - (g.clock.hour % 24) + 0.25, { finance: true });
    const red = g.log.find((e) => /in the red after today's bills/.test(e.text))!;
    expect(red.text).toContain("The club's one-time loan has been used, so selling is the way back above zero. If the food runs out, the club drops off a little.");
    expect(red.text).not.toContain('may be able to help');
    const out = text(renderToStaticMarkup(createElement(FinancesPanel)));
    expect(out).toContain('The aquarium club’s one-time loan has been used: sell an animal or decor to get back above zero. If your animals run out of food, the club drops off a little.');
  });
});

describe('F8: the listings and auctions hints say what really opens them', () => {
  it('while the guide holds listings for its own step: the step, not "your first visit"', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'market_listings');
    g.progress.tutorial.done = false;
    g.progress.tutorial.skipped = false;
    g.progress.tutorial.step = 2;
    g.progress.tutorial.flags.opened_market = true; // the rule is met, but the guide holds the key
    expect(marketAccess(g).hint).toBe('Listings open at the guide’s “The market” step, or when you finish or skip the guide. Until then the local fish store buys animals for quick cash: tick them in Livestock and press Quick sell.');
    const u = unlockProgress(g).find((x) => x.key === 'market_listings')!;
    expect(u.heldBy).toBe('The market');
    expect(u.requirements).toEqual([{ label: 'The guide’s “The market” step', met: false, current: 0, target: 1 }]);
    const v = lockViews(g, ['market_listings'])[0];
    expect(v.either).toEqual([]);
    expect(v.hint).toMatch(/^Comes with the guide’s “The market” step/);
    expect(cashSuggestions(g).join(' ')).toContain('open at the guide’s “The market” step');
  });

  it('auctions: the rule, with progress', () => {
    const g = game();
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'tank_auctions');
    if (!g.progress.unlocked.includes('market_listings')) g.progress.unlocked.push('market_listings');
    expect(marketAccess(g).hint).toBe('Whole-aquarium auctions open after 3 sales (you’ve made 0), or when you move into the Specialty Shop. You can already list individual animals, pairs and groups.');
  });
});

describe('F9: searching the shop for an animal that isn’t on the shelf says why', () => {
  const search = (g: GameState, q: string) => {
    useShopSearch.setState({ q });
    Object.assign(useShopSearch.getInitialState(), useShopSearch.getState());
    Object.assign(useShopFilters.getInitialState(), useShopFilters.getState());
    try {
      return renderToStaticMarkup(createElement(ShopTab, { g, offerId: null, setOfferId: () => {} }));
    } finally {
      useShopSearch.setState({ q: '' });
      Object.assign(useShopSearch.getInitialState(), useShopSearch.getState());
    }
  };

  it('in range but not stocked today, or locked with how to unlock it; a search matching no species keeps the plain empty state', () => {
    const g = game();
    g.market.stock = g.market.stock.filter((o) => o.speciesId !== 'betta' && o.speciesId !== 'lined_seahorse');
    const betta = text(search(g, 'betta'));
    expect(betta).toContain('No bettas in the shop today. New stock arrives every morning at 8.');
    const out = search(g, 'seahorse');
    expect(out).toContain('data-testid="shop-not-stocked"');
    expect(out).toContain('shop-not-stocked-unlock-lined_seahorse');
    expect(text(out)).toContain('How to unlock');
    expect(text(search(g, 'zzzz'))).toContain('Nothing matches that filter');
  });
});

describe('F10: one listing, one fair value', () => {
  it('after buyers re-price, the bid rows and the sold card use the card’s fair value', () => {
    const g = game();
    devOpenMarket(g);
    const c = addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: 120 }), g.tankOrder[0]);
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 1, durationHours: 72 });
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    for (let i = 0; i < 40 && !l.bids.some((b) => b.status === 'open'); i++) forceBuyerVisit(g, l.id);
    const b = l.bids.find((x) => x.status === 'open')!;
    l.lastValuation = Math.round(b.amount / 1.4); // re-priced well down: the bid is now 40 % over fair value
    const want = Math.round(((b.amount - l.lastValuation) / l.lastValuation) * 100);
    const live = text(renderToStaticMarkup(createElement(ListingsTab, { g, focusId: l.id, onCreate: () => {} })));
    expect(live).toContain(`+${want}% fair value`);
    expect(live).toContain('Hide offers (they stay open)'); // F19: the button only folds the list
    expect(acceptBid(g, l.id, b.id).ok).toBe(true);
    const sold = text(renderToStaticMarkup(createElement(ListingsTab, { g, focusId: null, onCreate: () => {} })));
    expect(sold).toContain(`+${Math.round(((l.soldFor! - l.lastValuation) / l.lastValuation) * 100)}% vs fair value`);
  });
});

describe('F11: money is never shown as more than the player has', () => {
  it('$199.60 reads "$199"; a $200 offer says "You need $1 more", not "$0"', () => {
    expect(wholeMoney(199.6)).toBe('$199');
    expect(wholeMoney(200)).toBe('$200');
    const g = game(199.6);
    g.market.stock = [];
    const o: ShopOffer = { id: 'offer_f11', kind: 'creature', speciesId: 'mystery_snail', creatures: [createCreature(g, simRng(g), 'mystery_snail')], price: 200, seller: 'Test Breeder', expiresHour: g.clock.hour + 48 };
    g.market.stock.push(o);
    const out = text(renderToStaticMarkup(createElement(ShopTab, { g, offerId: o.id, setOfferId: () => {} })));
    expect(out).toContain('You need $1 more');
    expect(text(renderToStaticMarkup(createElement(FinancesPanel)))).toContain('$199 in the bank');
  });
});

describe('F12: Finances’ running costs add up', () => {
  it('the Water and Live food rooms get their own row', () => {
    const g = game();
    installWaterRoom(g);
    installFoodRoom(g);
    const ops = dailyOperatingCost(g);
    expect(ops.rooms ?? 0).toBeGreaterThan(0);
    const out = renderToStaticMarkup(createElement(FinancesPanel));
    expect(out).toContain('data-testid="finance-rooms"');
    expect(text(out)).toContain(ops.roomNames!);
    expect(text(out)).toContain('and the rooms’ machines');
  });
});

describe('F13: the ways to raise cash are ones the player can take', () => {
  it('in debt with no animals: no listing an animal, no restocking; decor is named when there is some', () => {
    const g = game(-30);
    g.progress.unlocked.push('market_listings');
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'tank_auctions');
    for (const c of Object.values(g.creatures)) c.status = 'dead';
    const tips = cashSuggestions(g).join(' ');
    expect(tips).not.toContain('List a spare animal');
    expect(tips).not.toContain('restock');
    expect(tips).toContain('switch off its gear');
    const t = g.tanks[g.tankOrder[0]];
    expect(t.decor.length).toBeGreaterThan(0);
    expect(tips).toContain('Sell decor you can spare in Build › Decor: the shop pays half its price.');
    g.finance.money = 50;
    expect(cashSuggestions(g).join(' ')).toContain('restock it, or switch off its gear');
  });
});

describe('F15: Build’s decor "Sell" says what it pays, and a grown-in piece asks first', () => {
  it('half its price, as the sim pays; a living piece that cost over $50 asks', () => {
    const g = game();
    const piece = (defId: string): DecorInstance => ({ id: `d_${defId}`, defId, x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 1, growth: 1, health: 100 });
    const coral = DECOR.find((d) => (d.category === 'coral' || d.category === 'plant') && d.price > 50)!;
    const rock = DECOR.find((d) => d.category === 'hardscape' && d.price > 50) ?? DECOR.find((d) => d.category === 'hardscape')!;
    expect(decorSellOffer(g, piece(coral.id), coral)).toEqual({ pays: decorSellValue(coral, piece(coral.id)), ask: true });
    expect(decorSellOffer(g, piece(rock.id), rock).ask).toBe(false);
    expect(decorSellOffer(g, piece(rock.id), rock).pays).toBe(Math.round(rock.price * 0.5));
  });
});

describe('F16: a counter-offer says it is binding, with the Accept dialog’s warnings', () => {
  it('the line, the starter and the last aquarium', () => {
    const out = text(renderToStaticMarkup(createElement(CounterNotes, { starter: 'Ember', lastTank: true, buyer: 'Maya', serious: ['Ember is guarding eggs.'] })));
    expect(out).toContain('If they agree, the sale goes through straight away.');
    expect(out).toContain('Ember is your starter Your very first companion goes with this sale.');
    expect(out).toContain('This is your last aquarium The tank, its gear and decor all go to Maya if they agree.');
    expect(out).toContain('Ember is guarding eggs.');
    const plain = text(renderToStaticMarkup(createElement(CounterNotes, { lastTank: false, buyer: 'Maya', serious: [] })));
    expect(plain).toBe('If they agree, the sale goes through straight away.');
  });
});

describe('F17: "Fits my tanks" checks temperature and size, not only the water type', () => {
  it('an axolotl doesn’t fit a warm betta tank; a betta does', () => {
    const g = game();
    const t = g.tanks[g.tankOrder[0]];
    t.water.tempC = 26;
    expect(envMatches(g, findSpecies('axolotl')!, 'fits')).toBe(false);
    expect(envMatches(g, findSpecies('betta')!, 'fits')).toBe(true);
    expect(tankFits(findSpecies('axolotl')!, { ...t, water: { ...t.water, tempC: 17 }, tierId: 'g40B' } as typeof t)).toBe(true);
  });
});

describe('F18: "ended without a sale" advice fits the listing', () => {
  it('no "lower reserve" under fair value, no "longer listing" after the longest, demand in plain words', () => {
    const g = game();
    devOpenMarket(g);
    for (const b of g.market.buyers) b.budget = 1; // nobody can afford a serious offer
    const c = addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: 120 }), g.tankOrder[0]);
    g.market.demand.betta = 0.8;
    const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 1, durationHours: 120, photo: 'data:image/jpeg;base64,AAAA' });
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    // no buyer comes (budgets kept at $1 through the daily rotation; any delegation's bid is cleared)
    for (let h = 0; h < 122 && l.status === 'active'; h++) {
      for (const b of g.market.buyers) b.budget = 1;
      if (l.endsHour - g.clock.hour > 1) l.bids = [];
      devStepEconomy(g, 1);
    }
    expect(l.bids.length).toBe(0);
    expect(l.advice).toMatch(/^No bids arrived\./);
    expect(l.advice).not.toContain('a lower reserve');
    expect(l.advice).not.toContain('a longer listing');
    expect(l.advice).toMatch(/waiting until prices for bettas recover \(they are \d+% below normal\)/);
    expect(l.advice).not.toMatch(/\d\.\d\d×/);
  });
});

describe('F20: a group’s card says "pick fewer" when part of it is affordable', () => {
  it('10 neon tetras at $45 with $20 in the bank', () => {
    const g = game(20);
    g.market.stock = [];
    const rng = simRng(g);
    const o: ShopOffer = { id: 'offer_f20', kind: 'group', speciesId: 'neon_tetra', creatures: Array.from({ length: 10 }, () => createCreature(g, rng, 'neon_tetra')), price: 45, unitPrice: 5, seller: 'Test Breeder', expiresHour: g.clock.hour + 48 };
    g.market.stock.push(o);
    const out = text(renderToStaticMarkup(createElement(ShopTab, { g, offerId: null, setOfferId: () => {} })));
    expect(out).toContain('Can’t afford all 10: pick fewer');
    g.finance.money = 2;
    expect(text(renderToStaticMarkup(createElement(ShopTab, { g, offerId: null, setOfferId: () => {} })))).toContain('Can’t afford yet');
  });
});

describe('F21: the listing wizard names the store’s instant price', () => {
  it('"Or sell now to the local fish store for about $X." with a Quick sell for these animals', () => {
    const g = game();
    const a = addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: 120 }), g.tankOrder[0]);
    const b = addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: 120 }), g.tankOrder[0]);
    const q = quickSellQuote(g, [a.id, b.id]);
    expect(q.ok).toBe(true);
    const out = renderToStaticMarkup(createElement(QuickSellLine, { g, ids: [a.id, b.id] }));
    expect(text(out)).toContain(`Or sell now to the local fish store for about $${Math.round(q.total)}. Quick sell`);
    expect(renderToStaticMarkup(createElement(QuickSellLine, { g, ids: [] }))).toBe('');
  });
});

describe('F7: an empty room quotes (and the restart loan covers) a whole kit, not the glass alone', () => {
  it('the cheapest kit is glass + gear + substrate, and the restart need counts it', () => {
    const g = game(0);
    const kit = cheapestKit(g)!;
    expect(kit).not.toBeNull();
    const glass = Math.min(...TANK_TIERS.filter((t) => !t.unlock || g.progress.unlocked.includes(t.unlock)).map((t) => t.price));
    expect(kit.total).toBeGreaterThan(glass * 1.5); // the old guess fell short
    expect(kit.total).toBe(tankKitPrice(kit.tierId, kit.waterClass, false, g).total);
    // an empty room: nothing alive, no tank
    for (const c of Object.values(g.creatures)) c.status = 'dead';
    g.tanks = {};
    g.tankOrder = [];
    const need = restartNeed(g)!;
    expect(need).toBeGreaterThanOrEqual(kit.total + 40);
  });

  it('selling the last aquarium names the cheapest whole kit and its price', () => {
    const g = game(0);
    devOpenMarket(g);
    g.progress.unlocked.push('tank_auctions');
    const tankId = g.tankOrder[0];
    const r = createListing(g, { kind: 'tank', tankId, reserve: 1, durationHours: 72 });
    expect(r.ok).toBe(true);
    const l = g.market.listings.find((x) => x.id === r.listingId)!;
    for (let i = 0; i < 60 && !l.bids.some((b) => b.status === 'open') && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
    const b = l.bids.find((x) => x.status === 'open')!;
    expect(acceptBid(g, l.id, b.id).ok).toBe(true);
    const kit = cheapestKit(g)!;
    const e = g.log.find((x) => /has gone to its new home/.test(x.text))!;
    expect(e.text).toContain(`the cheapest kit, a ${kit.name}, costs about $${Math.round(kit.total)}.`);
  });
});
