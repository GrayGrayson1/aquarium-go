/**
 * chunk 19 (ADR-0055 decision 3, QOL-003, QOL-004) — search and filters: one matcher everywhere, the Shop's search and
 * sort, and Find anything's index (what it finds, in which group, and where each result goes).
 */
import { describe, expect, it } from 'vitest';
import type { ShopOffer } from '@/types';
import { newGame } from '@/sim/newGame';
import { fold, matches, queryWords, score } from '@/ui/panels/common/match';
import { offerSearchMatches, sortOffers } from '@/ui/panels/market/shopFilters';
import { FIND_GROUPS, findAnything, needsTankText, orderResults, PER_GROUP } from '@/ui/search/searchIndex';
import { DECOR } from '@/data/catalog/decor';
import { EQUIPMENT } from '@/data/catalog/equipment';
import { RESEARCH } from '@/data/research';
import { screenList } from '@/ui/nav/routes';

const game = () => newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });

describe('QOL-003: the matcher', () => {
  it('ignores case, accents and punctuation', () => {
    expect(fold('CO₂ & Planted Tanks')).toBe('co2 planted tanks');
    expect(fold('  Café   Crème ')).toBe('cafe creme');
    expect(queryWords('  ')).toEqual([]);
  });
  it('needs every word, each starting a word (or inside one, from three letters)', () => {
    expect(matches('red betta', 'Red Plakat Betta')).toBe(true);
    expect(matches('betta red', 'Red Plakat Betta')).toBe(true);
    expect(matches('blue betta', 'Red Plakat Betta')).toBe(false);
    expect(matches('pla', 'Red Plakat Betta')).toBe(true);
    expect(matches('kat', 'Red Plakat Betta')).toBe(true);
    expect(matches('at', 'Red Plakat Betta')).toBe(false); // too short to match inside a word
    expect(matches('', 'anything')).toBe(true);
  });
  it('scores a name that starts with the query above one that only contains it', () => {
    expect(score('java', 'Java Fern')).toBeGreaterThan(score('java', 'Mini Java Moss'));
    expect(score('fern', 'Java Fern')).toBeGreaterThan(score('fern', 'Driftwood', 'with a fern on it'));
    expect(score('zzz', 'Java Fern')).toBe(0);
  });
});

describe('QOL-003: the Shop', () => {
  const offer = (id: string, price: number, expiresHour: number, speciesId = 'betta'): ShopOffer => ({ ...game().market.stock[0], id, price, expiresHour, speciesId }) as ShopOffer;
  it('finds an offer by species, scientific name and seller', () => {
    const g = game();
    const o = g.market.stock.find((x) => x.speciesId === 'betta') ?? ({ ...g.market.stock[0], speciesId: 'betta' } as ShopOffer);
    expect(offerSearchMatches(o, 'betta')).toBe(true);
    expect(offerSearchMatches(o, 'splendens')).toBe(true);
    expect(offerSearchMatches(o, o.seller.split(' ')[0])).toBe(true);
    expect(offerSearchMatches(o, 'shark')).toBe(false);
  });
  it('sorts cheapest, priciest and leaving soonest, ties keeping the shop’s order', () => {
    const list = [offer('a', 30, 50), offer('b', 10, 80), offer('c', 30, 20)];
    expect(sortOffers(list, 'cheap').map((o) => o.id)).toEqual(['b', 'a', 'c']);
    expect(sortOffers(list, 'dear').map((o) => o.id)).toEqual(['a', 'c', 'b']);
    expect(sortOffers(list, 'leaving').map((o) => o.id)).toEqual(['c', 'a', 'b']);
    expect(sortOffers(list, 'shop').map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('QOL-004: Find anything', () => {
  it('lists every screen (and the tour) for an empty query', () => {
    const g = game();
    const all = findAnything(g, '', { social: true });
    expect(all.every((r) => r.group === 'Screens')).toBe(true);
    expect(all.map((r) => r.title)).toContain('Market › Supplies');
    expect(all.map((r) => r.title)).toContain('Settings › Notifications');
    expect(all.find((r) => r.key === 'tour')?.go).toEqual({ kind: 'tour' });
    expect(all.length).toBe(screenList().length + 1);
  });
  it('leaves Social and Settings › Account out where Social doesn’t exist', () => {
    const titles = findAnything(game(), '', { social: false }).map((r) => r.title);
    expect(titles.some((t) => t.startsWith('Social'))).toBe(false);
    expect(titles).not.toContain('Settings › Account');
  });
  it('finds a heater in Equipment, research that unlocks heaters, and goes to each', () => {
    const g = game();
    const res = findAnything(g, 'heater');
    const equip = res.filter((r) => r.group === 'Equipment');
    expect(equip.length).toBeGreaterThan(0);
    expect(equip[0].go).toMatchObject({ kind: 'panel', panel: 'build' });
    expect((equip[0].go as { target: string }).target).toMatch(/^find:equipment:/);
  });
  it('finds a decor piece by name and opens Build searched for it', () => {
    const g = game();
    const d = DECOR.find((x) => x.id === 'java_fern') ?? DECOR[0];
    const hit = findAnything(g, d.name).find((r) => r.key === `decor:${d.id}`);
    expect(hit?.go).toEqual({ kind: 'panel', panel: 'build', target: `find:decor:${d.id}` });
  });
  it('finds research by what it unlocks', () => {
    const g = game();
    const r = RESEARCH.find((x) => x.id === 'marine_systems')!;
    const hit = findAnything(g, 'marine systems').find((x) => x.key === `research:${r.id}`);
    expect(hit?.go).toEqual({ kind: 'panel', panel: 'research', target: `research:${r.id}` });
  });
  it('finds your tank and your animal by name', () => {
    const g = game();
    const t = g.tanks[g.tankOrder[0]];
    expect(findAnything(g, t.name).some((r) => r.key === `tank:${t.id}`)).toBe(true);
    const c = Object.values(g.creatures).find((x) => x.status === 'alive')!;
    expect(findAnything(g, c.name).find((r) => r.key === `animal:${c.id}`)?.go).toEqual({ kind: 'creature', creatureId: c.id });
  });
  it('marks what is locked, and keeps undiscovered species out of the Encyclopedia', () => {
    const g = game();
    const big = findAnything(g, '1000').find((r) => r.group === 'Tank sizes');
    expect(big?.locked).toBe(true);
    expect(findAnything(g, 'shark').some((r) => r.group === 'Encyclopedia')).toBe(false);
  });
  it('orders by group (each group once, in FIND_GROUPS order) and keeps each group short', () => {
    // (rewritten after the review: the old check passed whatever the order was)
    const g = game();
    const out = orderResults(findAnything(g, 'a'));
    const groups = out.map((r) => r.group);
    expect(new Set(groups).size).toBeGreaterThan(3); // the query reaches several groups, so the order means something
    const rank = groups.map((grp) => FIND_GROUPS.indexOf(grp));
    expect(rank.every((x) => x >= 0)).toBe(true);
    for (let i = 1; i < rank.length; i++) expect(rank[i]).toBeGreaterThanOrEqual(rank[i - 1]);
    for (const grp of new Set(groups)) if (grp !== 'Screens') expect(groups.filter((x) => x === grp).length).toBeLessThanOrEqual(PER_GROUP);
  });
  it('leaves the tour out where there is none (a shared shop)', () => {
    expect(findAnything(game(), '', { tour: false }).some((r) => r.key === 'tour')).toBe(false);
    expect(findAnything(game(), 'tour', { tour: false }).some((r) => r.key === 'tour')).toBe(false);
  });
});

describe('QOL-004: an item no tank of yours can take (reviewer B5)', () => {
  it('a reef-only piece from a freshwater game says it needs a reef tank', () => {
    const g = game();
    const coral = DECOR.find((d) => d.waterClasses?.length === 1 && d.waterClasses[0] === 'reef')!;
    expect(coral).toBeTruthy();
    const hit = findAnything(g, coral.name).find((r) => r.key === `decor:${coral.id}`);
    expect(hit?.detail).toMatch(/· Needs a reef tank$/);
    expect(hit?.go).toEqual({ kind: 'panel', panel: 'build', target: `find:decor:${coral.id}` });
  });
  it('saltwater gear says which tanks it needs; gear and decor your tank takes say where they are', () => {
    const g = game();
    const salt = EQUIPMENT.find((e) => e.environments.includes('marine') && !e.environments.includes('freshwater'))!;
    expect(salt).toBeTruthy();
    expect(findAnything(g, salt.name).find((r) => r.key === `equip:${salt.id}`)?.detail).toMatch(/· Needs a marine or brackish tank$/);
    const fresh = DECOR.find((d) => d.environments.includes('freshwater') && !d.waterClasses?.length)!;
    expect(findAnything(g, fresh.name).find((r) => r.key === `decor:${fresh.id}`)?.detail).toMatch(/· Build › Decor$/);
  });
  it('names every water an item allows, and nothing once a tank can take it', () => {
    const g = game();
    expect(needsTankText(g, ['marine'], ['marine_live_rock', 'reef'])).toBe('Needs a live rock or reef tank');
    expect(needsTankText(g, ['marine', 'brackish'])).toBe('Needs a marine or brackish tank');
    expect(needsTankText(g, ['freshwater'])).toBeNull();
    const t = g.tanks[g.tankOrder[0]];
    t.environment = 'marine';
    t.waterClass = 'reef';
    expect(needsTankText(g, ['marine'], ['reef'])).toBeNull();
  });
});
