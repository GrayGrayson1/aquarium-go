// @vitest-environment node
/**
 * lane:ui-panels — Market › Shop in 0.5 (chunk 2; spec §7, §9.2, §16; ADR-0020), server-rendered as in ui-copy-05: the
 * filter row and its copy, the empty states, the redesigned cards, the offer detail's section order, Genes and
 * Temperament, the morph line, long verdict labels, the build-a-tank path, the gone offer, and the buy-button table.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, ShopOffer } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, assignPrismatic, forcePrismatic } from '@/sim/life';
import { useGame } from '@/state/game';
import { useNav } from '@/ui/nav/router';
import { ShopTab } from '@/ui/panels/market/Shop';
import { useShopFilters } from '@/ui/panels/market/shopFilters';
import { buyState, type BuyInputs } from '@/ui/panels/market/buyState';

const P = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 66, curiosity: 40 };
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
let seq = 0;

function game(lab = false): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
  g.market.stock = [];
  g.finance.money = 5000;
  g.progress.unlocked.push('marine_basics', 'fw_coldwater', 'brackish');
  if (lab) g.progress.unlocked.push('genetics_lab');
  useGame.getState().setGame(g);
  return g;
}

function offer(g: GameState, speciesId: string, o: { alleles?: Record<string, [string, string]>; prismatic?: boolean; count?: number; sex?: 'male' | 'female' } = {}): ShopOffer {
  const rng = simRng(g);
  const n = o.count ?? 1;
  const creatures = Array.from({ length: n }, () => createCreature(g, rng, speciesId, { sex: o.sex, genome: o.alleles ? { alleles: o.alleles, potentials: { ...P } } : undefined }));
  if (o.prismatic) {
    forcePrismatic('shop', 1);
    assignPrismatic(g, creatures[0], 'shop');
  }
  const off: ShopOffer = { id: `offer_u${++seq}`, kind: n > 1 ? 'group' : 'creature', speciesId, creatures, price: 30, seller: 'Test Breeder', expiresHour: g.clock.hour + 48 };
  g.market.stock.push(off);
  return off;
}

/** Server rendering reads a store's initial state: copy the live state into it first, so it renders what a browser would. */
function syncStores(): void {
  Object.assign(useShopFilters.getInitialState(), useShopFilters.getState());
  Object.assign(useNav.getInitialState(), useNav.getState());
}

const shop = (g: GameState, offerId: string | null = null) => {
  syncStores();
  return renderToStaticMarkup(createElement(ShopTab, { g, offerId, setOfferId: () => {} }));
};
const RB_BHM = { color: ['royal', 'royal'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'halfmoon'], cambodian: ['C', 'C'], metallic: ['std', 'std'] } as Record<string, [string, string]>;

afterEach(() => {
  useShopFilters.getState().clearFilters();
  useNav.setState({ fromNotification: false });
  syncStores();
  useGame.getState().setGame(null);
});

describe('§7.2 filters and copy', () => {
  it('the second chip row, the count and the footer', () => {
    const g = game();
    offer(g, 'betta', { alleles: RB_BHM, sex: 'male' });
    offer(g, 'neon_tetra');
    const out = shop(g);
    expect(out).toContain('data-testid="shop-filter-prismatic"');
    expect(out).toContain('data-testid="shop-filter-rare"');
    expect(text(out)).toContain('Prismatic only Rare genes 2 of 2');
    expect(out).toMatch(/data-testid="shop-filter-count"[^>]*>2 of 2</);
    expect(text(out)).toContain('Captive-bred animals are hardier and kinder to wild reefs and rivers.');
    expect(out).not.toContain('shop-filter-hint');
  });

  it('the Rare genes hint, without and with the Genetics Lab', () => {
    let g = game(false);
    offer(g, 'betta', { alleles: RB_BHM });
    useShopFilters.getState().setFilters({ rare: true });
    expect(text(shop(g))).toContain('Showing rare traits you can see. Hidden carriers appear once you research the Genetics Lab.');
    g = game(true); // a new game clears the session's filters
    offer(g, 'betta', { alleles: RB_BHM });
    useShopFilters.getState().setFilters({ rare: true });
    expect(text(shop(g))).toContain('Genetics Lab: animals carrying rare hidden genes are included.');
  });

  it('the empty states: Prismatic, other filters, no stock at all', () => {
    const g = game();
    offer(g, 'neon_tetra');
    useShopFilters.getState().setFilters({ prismatic: true });
    let out = shop(g);
    expect(out).toContain('data-testid="shop-empty"');
    expect(text(out)).toContain('No Prismatic animals right now About 1 in 4,096 stocked animals shimmers. New stock arrives through the day.');
    expect(out).toContain('data-testid="shop-clear-filters"');
    expect(text(out)).toContain('Clear filters');
    useShopFilters.getState().setFilters({ prismatic: false, env: 'marine' });
    out = shop(g);
    expect(text(out)).toContain('Nothing matches that filter Try another filter to see more animals.');
    expect(out).toContain('data-testid="shop-clear-filters"');
    g.market.stock = [];
    out = shop(g);
    expect(text(out)).toContain('The shelves are being restocked Breeders deliver new captive-bred animals throughout the day. Check back soon.');
    expect(out).not.toContain('shop-clear-filters');
  });
});

describe('§7.3 offer cards', () => {
  it('titled by morph, with the second line and the strain chips; no captive-bred, personality or potential chips', () => {
    const g = game();
    const o = offer(g, 'betta', { alleles: RB_BHM, sex: 'male' });
    const out = shop(g);
    const card = out.slice(out.indexOf('data-testid="shop-offer-0"'), out.indexOf('Captive-bred animals are hardier'));
    expect(text(card)).toContain('Royal Blue Butterfly Halfmoon Betta');
    const lead = o.creatures[0];
    expect(text(card)).toContain(`Male · ${lead.sizeCm.toFixed(1)} cm`);
    expect(text(card)).toContain('Royal Butterfly Halfmoon Rare strain');
    expect(card).not.toContain('Captive-bred');
    expect(card).not.toContain('pn-offer__bands');
    expect(card).toContain(`aria-label="${lead.name}"`); // the portrait is named (ACC-003; the glyph fallback in node)
  });

  it('a group card: "10 × …" and "Group of 10 · {size} cm"', () => {
    const g = game();
    const o = offer(g, 'cherry_shrimp', { count: 10 });
    const out = text(shop(g));
    expect(out).toContain('10 × ');
    expect(out).toContain(`Group of 10 · ${o.creatures[0].sizeCm.toFixed(1)} cm`);
  });

  it('"New gene · Cambodian" for an expressed new gene; "Carries Cambodian" only after the lab', () => {
    let g = game(false);
    offer(g, 'betta', { alleles: { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'], metallic: ['std', 'std'] } });
    offer(g, 'betta', { alleles: { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['C', 'c'], metallic: ['std', 'std'] } });
    let out = text(shop(g));
    expect(out).toContain('New gene · Cambodian');
    expect(out).toContain('Cambodian Veiltail Very rare strain');
    expect(out).not.toContain('Carries Cambodian');
    g = game(true);
    offer(g, 'betta', { alleles: { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['C', 'c'], metallic: ['std', 'std'] } });
    out = text(shop(g));
    expect(out).toContain('Carries Cambodian');
  });
});

describe('§7.4 offer detail', () => {
  it('sections in order: banner, hero, Genes, Temperament, morph line, Individual profile, Destination tank', () => {
    const g = game();
    const o = offer(g, 'betta', { alleles: RB_BHM, sex: 'female' });
    useNav.setState({ fromNotification: true });
    const out = shop(g, o.id);
    const at = (s: string) => out.indexOf(s);
    expect(text(out)).toContain('Opened from your notification');
    const order = ['offer-from-notification', 'pn-offerhero__name', 'data-testid="offer-genes"', 'data-testid="offer-temperament"', 'data-testid="offer-morph-line"', 'Individual profile', 'Destination tank', 'data-testid="buy-offer"'].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(text(out)).toContain('Royal Blue Butterfly Halfmoon Betta');
    expect(text(out)).toContain('Rare morph · about 1 in 104 market bettas'); // chunk 6 (B-194): the seller's pick counted (1 in 143 from the genes alone)
    expect(out).toContain('data-testid="offer-gene-cambodian"');
    expect(text(out)).toContain('Royal Butterfly Halfmoon · Rare strain');
    // the profile no longer lists Temperament or Curiosity (they have their own section)
    expect(out).not.toMatch(/pn-band__label">Temperament/);
  });

  it('Temperament: words before the lab, numbers after it, the footer; a group gets one line', () => {
    let g = game(false);
    let o = offer(g, 'betta', { alleles: RB_BHM });
    let out = text(shop(g, o.id));
    expect(out).toContain('Temperament Shy Bold Bold');
    expect(out).not.toContain('Bold · 66');
    expect(out).toContain('Inherited: young land near their parents’ average. Personality quirks are each animal’s own.');
    g = game(true);
    o = offer(g, 'betta', { alleles: RB_BHM });
    out = text(shop(g, o.id));
    expect(out).toContain('Bold · 66');
    expect(out).toContain('Mildly curious · 40');
    o = offer(g, 'cherry_shrimp', { count: 10 });
    out = text(shop(g, o.id));
    expect(out).toContain('A group of 10: each cherry shrimp has its own temperament. They inherit it from their parents.');
  });

  it('long verdict labels on the tile, the fit badge and the compatibility box (ADR-0020)', () => {
    const g = game();
    const o = offer(g, 'mystery_snail');
    const out = shop(g, o.id);
    expect((out.match(/Excellent match/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((out.match(/data-testid="compat-verdict"/g) ?? []).length).toBe(1);
  });

  it('no suitable tank: the gold Build a marine tank button, the badge and the callout', () => {
    const g = game();
    const o = offer(g, 'ocellaris_clownfish');
    const out = shop(g, o.id);
    expect(out).toContain('data-testid="offer-build-tank"');
    expect(out).not.toContain('data-testid="buy-offer"');
    expect(text(out)).toContain('Build a marine tank');
    expect(text(out)).toContain('No marine tank');
    expect(text(out)).toContain('Saltwater animals need a marine tank. Build one first; the offer stays until it expires.');
    expect(text(out)).toContain('Freshwater'); // the tile names the tank's water
  });

  it('a cool-water animal in a warm tank: the tile reason, the risk path and the cool-water link', () => {
    const g = game();
    // the starter betta moves out, so the warm water is the tank's one problem besides its size
    for (const c of Object.values(g.creatures)) c.tankId = null;
    const o = offer(g, 'axolotl');
    const raw = shop(g, o.id);
    const out = text(raw);
    expect(out).toMatch(/High risk — too warm for axolotls/);
    expect(raw).toMatch(/too warm for axolotls \(10–21\u00a0°C\)\./); // a no-break space keeps the range on one line
    expect(out).toContain('Set up a cool-water tank');
    expect(out).toContain('Confirm the risk first');
  });

  // chunk 6 (B-194, ADR-0034 decision 6): the seller's pick counted, Red Veiltail is about 1 in 6 (1 in 5 from the genes)
  it('the morph line follows §7.4 for Common morphs too ("Common morph · about 1 in 6 market bettas")', () => {
    const g = game();
    const o = offer(g, 'betta', { alleles: { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['C', 'C'], metallic: ['std', 'std'] } });
    expect(text(shop(g, o.id))).toContain('Common morph · about 1 in 6 market bettas');
  });

  it('short of money: "You need $X more"', () => {
    const g = game();
    g.finance.money = 10;
    const o = offer(g, 'mystery_snail');
    expect(text(shop(g, o.id))).toContain('You need $20 more');
  });

  it('a gone offer keeps its state and adds "See what’s in stock"', () => {
    const g = game();
    const out = text(shop(g, 'offer_zz00'));
    expect(out).toContain('This offer has gone Another shop snapped it up, or it expired. New stock arrives regularly.');
    expect(out).toContain('See what’s in stock');
  });
});

describe('§7.5 the buy button (first matching row wins)', () => {
  const base: BuyInputs = { locked: false, picked: 1, noSuitableTank: false, environment: 'marine', affordable: true, gateOk: true, risky: false, acknowledged: false, price: 30 };
  const label = (p: Partial<BuyInputs>) => {
    const s = buyState({ ...base, ...p });
    return [s.desktop, s.phone, s.action];
  };
  it('each row, desktop and phone', () => {
    expect(label({ locked: true, picked: 0, noSuitableTank: true, affordable: false })).toEqual(['Locked', 'Locked', 'none']);
    expect(label({ picked: 0, noSuitableTank: true, affordable: false })).toEqual(['Pick at least one animal', 'Pick one', 'none']);
    expect(label({ noSuitableTank: true, affordable: false, gateOk: false })).toEqual(['Build a marine tank', 'Build a tank', 'build']);
    expect(label({ noSuitableTank: true, environment: 'brackish' })).toEqual(['Build a brackish tank', 'Build a tank', 'build']);
    expect(label({ affordable: false, gateOk: false, risky: true })).toEqual(['Not enough money', 'Not enough', 'none']);
    expect(label({ gateOk: false, risky: true })).toEqual(['Choose a suitable tank', 'Choose a tank', 'none']);
    expect(label({ risky: true })).toEqual(['Confirm the risk first', 'Confirm the risk', 'none']);
    expect(label({ risky: true, acknowledged: true })).toEqual(['Buy for $30', 'Buy', 'buy']);
    expect(label({})).toEqual(['Buy for $30', 'Buy', 'buy']);
  });
});
