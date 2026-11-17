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
import { cantAffordTitle, hungryAndShort, moneyHeld, needsCashIdeas } from '@/ui/common/moneyShort';
import { FinancesPanel } from '@/ui/panels/finances/FinancesPanel';
import { eventLink } from '@/ui/hud/eventLinks';
import { devStepEconomy, holdOffer, offerHeld, buyOffer, MAX_NEGOTIATION_HOLD_HOURS, typicalOpening, devOpenMarket, createListing, forceBuyerVisit } from '@/sim/economy';
import { reserveHint } from '@/ui/panels/market/CreateListing';
import { addCreature, createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { offerLeavesText } from '@/ui/panels/market/Shop';
import { PARCEL_DAY_KEY, clubFoodParcel } from '@/sim/economy/finance';
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

  it('drops off the cheapest pack Ember eats, free, with the approved words and a link to the ways to raise cash', () => {
    const g = hungryBroke(1);
    step(g, 1);
    expect(eaten(g)).toBeGreaterThan(0);
    expect(g.finance.money).toBe(1);
    const e = g.log.find((x) => /^The aquarium club dropped off/.test(x.text))!;
    expect(e.text).toBe('The aquarium club dropped off a little food for Ember. Short on cash? Friends tip when your animals are healthy, or sell something in Livestock.');
    expect(e.toast).toBe(true);
    expect(eventLink(e)).toMatchObject({ panel: 'finances', label: 'Ways to raise cash' });
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

  it('released on close: it leaves at the next check', () => {
    const g = shopWorld();
    const o = leavingAtRestock(g);
    devStepEconomy(g, at8(g) - g.clock.hour - 0.1, { market: true });
    holdOffer(g, o.id);
    pastRestock(g);
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(true);
    expect(holdOffer(g, o.id, true).ok).toBe(true);
    expect(o.holdUntilHour).toBeUndefined();
    devStepEconomy(g, 0.2, { market: true });
    expect(g.market.stock.some((x) => x.id === o.id)).toBe(false);
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
  it('first offers mostly land in the quoted range, and about half fall below fair value', () => {
    const ratios: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const g = newGame({ starterId: 'betta', starterName: 'Ember', seed });
      g.clock.speed = 1;
      devOpenMarket(g);
      const c = addCreature(g, createCreature(g, simRng(g), 'betta', { ageDays: 120 }), g.tankOrder[0]);
      c.stats.health = 100;
      delete c.illness;
      const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 1, durationHours: 72 });
      expect(r.ok).toBe(true);
      const l = g.market.listings.find((x) => x.id === r.listingId)!;
      for (let i = 0; i < 40 && l.bids.length < 4 && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
      for (const b of l.bids) if (b.status === 'open' && !b.counterAmount) ratios.push(b.amount / l.snapshot.valuation);
    }
    expect(ratios.length).toBeGreaterThan(40);
    const { low, high } = typicalOpening(100);
    const inRange = ratios.filter((x) => x >= low / 100 - 0.02 && x <= high / 100 + 0.02).length / ratios.length;
    const atFair = ratios.filter((x) => x >= 1).length / ratios.length;
    expect(inRange).toBeGreaterThan(0.6);
    // a reserve at fair value turns about half of first offers down (the old hint called it "steady bidding")
    expect(atFair).toBeGreaterThan(0.25);
    expect(atFair).toBeLessThan(0.7);
    expect(reserveHint(100, typicalOpening(100))).toMatch(/^About half of first offers/);
  });

  it('the quoted range and the reserve hint', () => {
    const o = typicalOpening(100);
    expect(o).toEqual({ low: 81, high: 116 });
    expect(reserveHint(120, o)).toBe('Above most first offers: many will be turned down automatically.');
    expect(reserveHint(100, o)).toBe('About half of first offers will be below this and turned down automatically.');
    expect(reserveHint(85, o)).toBe('Some first offers will be below this and turned down automatically.');
    expect(reserveHint(80, o)).toBe('Most first offers will reach this. You still choose which one to accept.');
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
