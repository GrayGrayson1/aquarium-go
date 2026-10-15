// @vitest-environment node
/**
 * lane:ui-shell (chunk 1, NAV-009, NAV-014, NAV-015) — the hash routes of 0.5 spec §6.2 as pure data: every row
 * round-trips through parseRoute/formatRoute, the URL words that differ from internal ids, the shop query rules,
 * unknown paths and tabs, the explicit root targets the router sends (B-115), and shareUrl.
 */
import { describe, it, expect } from 'vitest';
import {
  parseRoute,
  formatRoute,
  formatFilters,
  normalizeRoute,
  panelTargetFor,
  routeForPanelTarget,
  routeLabel,
  sameRoute,
  shareUrl,
  type Route,
} from '@/ui/nav/routes';

/** One canonical address per §6.2 row (Social included: it parses now, its screens come later), and DESIGN-S3D §6's lines. */
const CANONICAL = [
  '#/',
  '#/tanks',
  '#/tanks/tank_k2x',
  '#/tanks/tank_k2x/equipment',
  '#/tanks/tank_k2x/life',
  '#/tanks/tank_k2x/value',
  '#/livestock',
  '#/livestock/eggs',
  '#/livestock/past',
  '#/livestock/production',
  '#/livestock/production/cambodian',
  '#/livestock/production/new',
  '#/livestock/animal/cr_9fq',
  '#/shop',
  '#/shop?prismatic=1',
  '#/shop?rare=1&env=fits',
  '#/shop?prismatic=1&rare=1&env=marine',
  '#/shop/fish/offer_k3x9',
  '#/market/supplies',
  '#/market/supplies/flakes',
  '#/market/listings',
  '#/market/listings/listing_7mm',
  '#/market/history',
  '#/build',
  '#/build/decor',
  '#/build/equipment',
  '#/build/substrate',
  '#/build/facility',
  '#/visitors',
  '#/visitors/staff',
  '#/shows',
  '#/shows/entries',
  '#/shows/results',
  '#/shows/trophies',
  '#/research',
  '#/research/unlocks',
  '#/research/quests',
  '#/research/achievements',
  '#/finances',
  '#/encyclopedia',
  '#/encyclopedia/science',
  '#/encyclopedia/science/nitrogen_cycle',
  '#/encyclopedia/betta',
  '#/social',
  '#/social/clubs',
  '#/social/trading',
  '#/social/friends',
  '#/social/leaderboards',
  '#/social/join/HIGHLAND-4821',
  '#/settings',
  '#/settings/play',
  '#/settings/saves',
  '#/settings/notifications',
  '#/settings/about',
  '#/more',
  '#/log',
];

const roundTrip = (h: string) => {
  const p = parseRoute(h);
  if (!p) return null;
  return formatRoute(p.route, p.filters);
};

describe('nav routes: §6.2 round trip', () => {
  it.each(CANONICAL)('%s parses and formats back to itself', (h) => {
    expect(roundTrip(h)).toBe(h);
  });

  it('parses each row to the store target §6.2 names', () => {
    const r = (h: string) => parseRoute(h)!.route;
    expect(r('#/')).toEqual({ kind: 'home' });
    expect(r('#/tanks')).toEqual({ kind: 'panel', panel: 'tanks' });
    expect(r('#/tanks/tank_k2x')).toEqual({ kind: 'tankCard', tankId: 'tank_k2x', tab: 'water' });
    expect(r('#/livestock/eggs')).toEqual({ kind: 'panel', panel: 'livestock', tab: 'young' });
    expect(r('#/livestock/past')).toEqual({ kind: 'panel', panel: 'livestock', tab: 'past' });
    expect(r('#/livestock/animal/cr_9fq')).toEqual({ kind: 'creature', creatureId: 'cr_9fq' });
    // lane:production (chunk 4; DESIGN-S3D §6): one line, and setting up another
    expect(r('#/livestock/production/royal')).toEqual({ kind: 'panel', panel: 'livestock', tab: 'production', target: 'line:royal' });
    expect(r('#/livestock/production/new')).toEqual({ kind: 'panel', panel: 'livestock', tab: 'production', target: 'line:new' });
    expect(r('#/shop/fish/offer_k3x9')).toEqual({ kind: 'panel', panel: 'market', tab: 'shop', target: 'offer:offer_k3x9' });
    expect(r('#/market/supplies/flakes')).toEqual({ kind: 'panel', panel: 'market', tab: 'supplies', target: 'food:flakes' });
    expect(r('#/market/listings/listing_7mm')).toEqual({ kind: 'panel', panel: 'market', tab: 'listings', target: 'listing:listing_7mm' });
    expect(r('#/encyclopedia/betta')).toEqual({ kind: 'panel', panel: 'encyclopedia', tab: 'species', target: 'species:betta' });
    expect(r('#/encyclopedia/science/nitrogen_cycle')).toEqual({ kind: 'panel', panel: 'encyclopedia', tab: 'science', target: 'science:nitrogen_cycle' });
    // chunk 6: an invite highlights Clubs, as the approved screen phone-join does (§6.2 names no tab for it)
    expect(r('#/social/join/HIGHLAND-4821')).toEqual({ kind: 'panel', panel: 'social', tab: 'clubs', target: 'join:HIGHLAND-4821' });
    expect(r('#/settings')).toEqual({ kind: 'settings', tab: 'general' });
    expect(r('#/more')).toEqual({ kind: 'more' });
    expect(r('#/log')).toEqual({ kind: 'panel', panel: 'log' });
  });

  it('accepts an empty hash, a bare # and a trailing slash as their canonical forms', () => {
    expect(parseRoute('')!.route).toEqual({ kind: 'home' });
    expect(parseRoute('#')!.route).toEqual({ kind: 'home' });
    expect(roundTrip('#/shop/')).toBe('#/shop');
    expect(roundTrip('#/build/decor/')).toBe('#/build/decor');
  });
});

describe('nav routes: URL words and aliases', () => {
  it('equipment ↔ gear on the tank card', () => {
    expect(parseRoute('#/tanks/t1/equipment')!.route).toEqual({ kind: 'tankCard', tankId: 't1', tab: 'gear' });
    expect(formatRoute({ kind: 'tankCard', tankId: 't1', tab: 'gear' })).toBe('#/tanks/t1/equipment');
  });

  it('play ↔ display in Settings', () => {
    expect(parseRoute('#/settings/play')!.route).toEqual({ kind: 'settings', tab: 'display' });
    expect(formatRoute({ kind: 'settings', tab: 'display' })).toBe('#/settings/play');
  });

  it('market/trends is History & demand, written as market/history', () => {
    expect(parseRoute('#/market/trends')!.route).toEqual({ kind: 'panel', panel: 'market', tab: 'trends' });
    expect(roundTrip('#/market/trends')).toBe('#/market/history');
  });

  it('eggs ↔ young in Livestock', () => {
    expect(formatRoute({ kind: 'panel', panel: 'livestock', tab: 'young' })).toBe('#/livestock/eggs');
  });

  it("a panel's first tab has no segment of its own", () => {
    expect(roundTrip('#/build/tanks')).toBe('#/build');
    expect(roundTrip('#/settings/general')).toBe('#/settings');
    expect(roundTrip('#/tanks/t1/water')).toBe('#/tanks/t1');
    expect(roundTrip('#/market/shop')).toBe('#/shop');
    expect(roundTrip('#/market')).toBe('#/shop');
  });

  it('ids are escaped and unescaped', () => {
    expect(formatRoute({ kind: 'creature', creatureId: 'a/b c' })).toBe('#/livestock/animal/a%2Fb%20c');
    expect(parseRoute('#/livestock/animal/a%2Fb%20c')!.route).toEqual({ kind: 'creature', creatureId: 'a/b c' });
  });
});

describe('nav routes: shop filters', () => {
  it('keys in the order prismatic, rare, env, defaults left out', () => {
    expect(formatRoute({ kind: 'panel', panel: 'market', tab: 'shop' }, { prismatic: true, rare: true, env: 'marine' })).toBe('#/shop?prismatic=1&rare=1&env=marine');
    expect(formatRoute({ kind: 'panel', panel: 'market', tab: 'shop' }, { prismatic: false, rare: false, env: 'all' })).toBe('#/shop');
    expect(formatRoute({ kind: 'panel', panel: 'market', tab: 'shop' }, { prismatic: false, rare: true, env: 'all' })).toBe('#/shop?rare=1');
    expect(formatFilters(undefined)).toBe('');
  });

  it('a query in any order parses to the same filters and formats canonically', () => {
    expect(roundTrip('#/shop?env=marine&prismatic=1')).toBe('#/shop?prismatic=1&env=marine');
    expect(parseRoute('#/shop?env=marine')!.filters).toEqual({ prismatic: false, rare: false, env: 'marine' });
  });

  it('#/shop without a filter query carries no filters (the router re-applies the session filters)', () => {
    expect(parseRoute('#/shop')!.filters).toBeUndefined();
    expect(parseRoute('#/shop?utm=x')!.filters).toBeUndefined();
  });

  it('an unknown env falls back to all stock', () => {
    expect(parseRoute('#/shop?env=lava')!.filters).toEqual({ prismatic: false, rare: false, env: 'all' });
  });

  it('filters never decorate other routes', () => {
    expect(formatRoute({ kind: 'panel', panel: 'market', tab: 'shop', target: 'offer:o1' }, { prismatic: true, rare: false, env: 'all' })).toBe('#/shop/fish/o1');
    expect(formatRoute({ kind: 'panel', panel: 'market', tab: 'supplies' }, { prismatic: true, rare: false, env: 'all' })).toBe('#/market/supplies');
  });
});

describe('nav routes: unknown paths and tabs (§6.5)', () => {
  it('an unknown path parses to null', () => {
    for (const h of ['#/aquarium/nowhere', '#/nowhere', '#nowhere', '#/Shop', '#/livestock%']) expect(parseRoute(h)).toBeNull();
  });

  it("an unknown tab on a known panel opens the panel's first tab", () => {
    expect(parseRoute('#/build/notatab')!.route).toEqual({ kind: 'panel', panel: 'build', tab: 'tanks' });
    expect(parseRoute('#/settings/bogus')!.route).toEqual({ kind: 'settings', tab: 'general' });
    expect(parseRoute('#/tanks/t1/bogus')!.route).toEqual({ kind: 'tankCard', tankId: 't1', tab: 'water' });
    expect(parseRoute('#/livestock/animal')!.route).toEqual({ kind: 'panel', panel: 'livestock', tab: 'animals' });
    expect(roundTrip('#/research/nope')).toBe('#/research');
  });
});

describe('nav routes: what the router sends to a panel (B-115)', () => {
  it('a route without a sub-view sends an explicit tab, so an open sub-view closes', () => {
    expect(panelTargetFor({ kind: 'panel', panel: 'market', tab: 'shop' })).toBe('tab:shop');
    expect(panelTargetFor({ kind: 'panel', panel: 'market' })).toBe('tab:shop');
    expect(panelTargetFor({ kind: 'panel', panel: 'build', tab: 'nope' })).toBe('tab:tanks');
    expect(panelTargetFor({ kind: 'panel', panel: 'market', tab: 'shop', target: 'offer:o1' })).toBe('offer:o1');
    expect(panelTargetFor({ kind: 'panel', panel: 'finances' })).toBeNull();
  });

  it('existing panel commands map to the address they open', () => {
    expect(routeForPanelTarget('market', 'listing:l1')).toEqual({ kind: 'panel', panel: 'market', tab: 'listings', target: 'listing:l1' });
    expect(routeForPanelTarget('market', 'list:creature:c1')).toEqual({ kind: 'panel', panel: 'market', tab: 'listings' });
    expect(routeForPanelTarget('livestock', 'clutches')).toEqual({ kind: 'panel', panel: 'livestock', tab: 'young' });
    expect(routeForPanelTarget('livestock', 'line:golden')).toEqual({ kind: 'panel', panel: 'livestock', tab: 'production', target: 'line:golden' });
    expect(routeForPanelTarget('build', 'decor-cat:plant')).toEqual({ kind: 'panel', panel: 'build', tab: 'decor' });
    expect(routeForPanelTarget('shows', 'result:e1')).toEqual({ kind: 'panel', panel: 'shows', tab: 'results' });
    expect(routeForPanelTarget('visitors', 'tab:staff')).toEqual({ kind: 'panel', panel: 'visitors', tab: 'staff' });
    expect(routeForPanelTarget('tanks', 'tank:t1')).toBeNull();
  });

  it('normalizeRoute and sameRoute treat a missing tab as the first tab', () => {
    expect(normalizeRoute({ kind: 'panel', panel: 'shows' })).toEqual({ kind: 'panel', panel: 'shows', tab: 'upcoming' });
    expect(sameRoute({ kind: 'panel', panel: 'shows' }, { kind: 'panel', panel: 'shows', tab: 'upcoming' })).toBe(true);
    expect(sameRoute({ kind: 'panel', panel: 'shows' }, { kind: 'panel', panel: 'shows', tab: 'results' })).toBe(false);
  });
});

describe('nav routes: shareUrl (§6.6, NAV-015)', () => {
  const loc = { origin: 'https://graygrayson1.github.io', pathname: '/aquarium-go/' };

  it('is origin + path + route, with no query flags', () => {
    const offer: Route = { kind: 'panel', panel: 'market', tab: 'shop', target: 'offer:offer_k3x9' };
    expect(shareUrl(offer, loc)).toBe('https://graygrayson1.github.io/aquarium-go/#/shop/fish/offer_k3x9');
  });

  it('drops ?dev=1 and ?fixture=… from the page address it is built from', () => {
    const page = new URL('http://127.0.0.1:4399/aquarium-go/?dev=1&fixture=big_facility#/shop');
    const url = shareUrl({ kind: 'panel', panel: 'market', tab: 'shop', target: 'offer:o1' }, page);
    expect(url).toBe('http://127.0.0.1:4399/aquarium-go/#/shop/fish/o1');
    expect(url).not.toMatch(/dev=|fixture=|\?/);
  });
});

describe('nav routes: the loading card pill (§16)', () => {
  it('names the panel and tab with a › separator', () => {
    expect(routeLabel(parseRoute('#/livestock/eggs')!.route)).toBe('Livestock › Eggs & fry');
    expect(routeLabel(parseRoute('#/shop')!.route)).toBe('Market › Shop');
    expect(routeLabel(parseRoute('#/settings/about')!.route)).toBe('Settings › About');
    expect(routeLabel(parseRoute('#/finances')!.route)).toBe('Finances');
    expect(routeLabel(parseRoute('#/social/join/X')!.route)).toBe('Social › Club invite');
    expect(routeLabel({ kind: 'home' })).toBeNull();
  });

  it('uses names from the save when it has them', () => {
    const names = { tank: () => 'Ember’s Tank', offer: () => 'Prismatic betta', creature: () => 'Bubbles' };
    expect(routeLabel(parseRoute('#/tanks/t1/equipment')!.route, names)).toBe('Ember’s Tank › Equipment');
    expect(routeLabel(parseRoute('#/shop/fish/o1')!.route, names)).toBe('Market › Prismatic betta');
    expect(routeLabel(parseRoute('#/livestock/animal/c1')!.route, names)).toBe('Livestock › Bubbles');
    expect(routeLabel(parseRoute('#/tanks/t1')!.route)).toBe('Tank card › Water');
  });
});

describe('NAV-022: DESIGN-S3D §6’s routes (chunk 5)', () => {
  const rows: [string, Route][] = [
    ['#/operations', { kind: 'panel', panel: 'operations', tab: 'overview' }],
    ['#/operations/water', { kind: 'panel', panel: 'operations', tab: 'water' }],
    ['#/operations/feed', { kind: 'panel', panel: 'operations', tab: 'feed' }],
    ['#/operations/lines', { kind: 'panel', panel: 'operations', tab: 'lines' }],
    ['#/operations/map', { kind: 'panel', panel: 'operations', tab: 'map' }],
    ['#/operations/map?layer=water', { kind: 'panel', panel: 'operations', tab: 'map', target: 'layer:water' }],
    ['#/operations/map?layer=animals', { kind: 'panel', panel: 'operations', tab: 'map', target: 'layer:animals' }],
    ['#/operations/issues', { kind: 'panel', panel: 'operations', tab: 'overview', target: 'view:issues' }],
    ['#/operations/manual', { kind: 'panel', panel: 'operations', tab: 'overview', target: 'view:manual' }],
    ['#/build/facility/water', { kind: 'panel', panel: 'build', tab: 'facility', target: 'room:water' }],
    ['#/build/facility/food', { kind: 'panel', panel: 'build', tab: 'facility', target: 'room:food' }],
    ['#/market/supplies/salt', { kind: 'panel', panel: 'market', tab: 'supplies', target: 'food:salt' }],
    ['#/market/supplies/brine_shrimp_eggs', { kind: 'panel', panel: 'market', tab: 'supplies', target: 'food:brine_shrimp_eggs' }],
  ];
  it('each row parses to its target and formats back to itself', () => {
    for (const [h, route] of rows) {
      expect(parseRoute(h)?.route, h).toEqual(route);
      expect(formatRoute(route), h).toBe(h);
    }
  });
  it('Problems and Manual mode highlight Overview; an unknown tab or layer opens Overview or All', () => {
    expect(normalizeRoute(parseRoute('#/operations/issues')!.route)).toMatchObject({ tab: 'overview' });
    expect(parseRoute('#/operations/foo')?.route).toEqual({ kind: 'panel', panel: 'operations', tab: 'overview' });
    expect(parseRoute('#/operations/map?layer=nope')?.route).toEqual({ kind: 'panel', panel: 'operations', tab: 'map' });
    expect(parseRoute('#/build/facility/garage')?.route).toEqual({ kind: 'panel', panel: 'build', tab: 'facility' });
  });
  it('the router’s commands map back to the same addresses, and the loading card names them', () => {
    expect(routeForPanelTarget('operations', 'view:issues')).toEqual(rows[7][1]);
    expect(routeForPanelTarget('operations', 'layer:water')).toEqual(rows[5][1]);
    expect(routeForPanelTarget('build', 'room:food')).toEqual(rows[10][1]);
    expect(routeLabel(rows[1][1])).toBe('Operations › Water');
    expect(routeLabel(rows[7][1])).toBe('Operations › Problems');
    expect(routeLabel(rows[9][1])).toBe('Build › Water room');
  });
});
