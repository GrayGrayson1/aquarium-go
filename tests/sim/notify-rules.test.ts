/**
 * lane:notify (chunk 3; 0.5 spec §12.2; ADR-0022, ADR-0023; B-173) — the pure notification rules: which events notify
 * and with what title, body and link (NOTIFY-003, NOTIFY-004), quiet hours on the device clock (NOTIFY-002) and the
 * rate limits (NOTIFY-005). Time is always passed in, so these hold by day and by night.
 */
import { describe, it, expect } from 'vitest';
import type { GameEvent } from '@/types';
import {
  CATEGORY_GAP_MS,
  DEFAULT_NOTIFY_PREFS,
  HOUR_MS,
  MAX_PER_HOUR,
  TEST_NOTIFICATION,
  decide,
  emptyRateState,
  inQuietHours,
  normalizePrefs,
  planNotification,
  type NotifyPrefs,
  type PlannedNotification,
} from '@/ui/notify/rules';

const look = { hour: 100, tankName: (id: string) => ({ t1: 'Ember’s Tank', t2: 'Reef' })[id] ?? null };
let seq = 0;
const ev = (e: Partial<GameEvent>): GameEvent => ({ id: `ev_${++seq}`, hour: 100, kind: 'info', text: 'x', ...e });
const plan = (e: Partial<GameEvent>) => planNotification(ev(e), look);
const at = (h: number, m = 0) => h * 60 + m;

describe('NOTIFY-003, NOTIFY-004: events → notifications', () => {
  it('Rare stock: a Prismatic offer opens its offer, or the shop without one', () => {
    const p = plan({ kind: 'market', offerId: 'offer_k3', notice: { topic: 'prismatic', vars: { species: 'betta', morph: 'Royal Blue Halfmoon', seller: 'Coral Cove', until: 114 } } });
    expect(p).toEqual({ category: 'rare', title: 'Prismatic betta in the shop', body: 'Coral Cove just stocked a Prismatic Royal Blue Halfmoon. It leaves in 14 h.', route: '#/shop/fish/offer_k3', priority: 'normal', tag: 'rare' });
    expect(plan({ kind: 'market', notice: { topic: 'prismatic', vars: { species: 'betta', morph: 'Red Veiltail', seller: 'A', until: 110 } } })?.route).toBe('#/shop');
  });

  it('Rare stock: a special reads "Today only: {morph}" / "{Seller} · {price}. Leaves in {time}."', () => {
    const p = plan({ kind: 'market', offerId: 'offer_s1', notice: { topic: 'special', vars: { morph: 'Pair of Koi Bettas', seller: 'Finn’s Fish', price: 48, until: 106 } } });
    expect(p).toMatchObject({ category: 'rare', title: 'Today only: Pair of Koi Bettas', body: 'Finn’s Fish · $48. Leaves in 6 h.', route: '#/shop/fish/offer_s1' });
  });

  it('Animal care: "{Tank}" / "{reason}", to the equipment, the animal or the tank; danger comes first', () => {
    const paused = plan({ kind: 'warning', tankId: 't1', creatureId: 'c1', text: 'Ember’s Tank: Auto-feed is paused — feed Ember by hand.', notice: { topic: 'care', vars: { open: 'equipment' } } });
    expect(paused).toMatchObject({ category: 'care', title: 'Ember’s Tank', body: 'Auto-feed is paused — feed Ember by hand.', route: '#/tanks/t1/equipment', priority: 'normal' });
    const ill = plan({ kind: 'warning', tankId: 't1', creatureId: 'c9', text: 'Ember has fin rot — likely from poor water.', notice: { topic: 'care', vars: { open: 'animal' } } });
    expect(ill).toMatchObject({ title: 'Ember’s Tank', body: 'Ember has fin rot — likely from poor water.', route: '#/livestock/animal/c9' });
    // a danger-level event about a tank is Animal care without a tag, and quiet hours let it through
    const danger = plan({ kind: 'danger', tankId: 't2', text: 'Your clownfish are starving and losing condition — feed right away.' });
    expect(danger).toMatchObject({ category: 'care', title: 'Reef', route: '#/tanks/t2', priority: 'danger' });
  });

  it('Market: a bid, a sale and an auction ending soon open the listing', () => {
    const bid = plan({ kind: 'market', listingId: 'l7', notice: { topic: 'bid', vars: { title: 'Ember’s Tank', buyer: 'Maya Chen', amount: 112, fair: 100 } } });
    expect(bid).toEqual({ category: 'market', title: 'New bid on Ember’s Tank', body: 'Maya Chen offers $112 (+12% vs fair value).', route: '#/market/listings/l7', priority: 'normal', tag: 'market' });
    expect(plan({ kind: 'market', listingId: 'l7', notice: { topic: 'bid', vars: { title: 'T', buyer: 'B', amount: 92, fair: 100 } } })?.body).toBe('B offers $92 (−8% vs fair value).');
    expect(plan({ kind: 'celebrate', listingId: 'l7', notice: { topic: 'sale', vars: { title: 'Ember’s Tank', buyer: 'Maya Chen', amount: 120 } } })).toMatchObject({ title: 'Sold: Ember’s Tank', body: 'Maya Chen paid $120.' });
    const ending = plan({ kind: 'market', listingId: 'l7', notice: { topic: 'auction_ending', vars: { title: 'Ember’s Tank', buyer: 'Coral Reef Co.', amount: 120 } } });
    expect(ending).toMatchObject({ category: 'market', title: 'Ending soon: Ember’s Tank', body: 'Best offer so far: $120 from Coral Reef Co.', route: '#/market/listings/l7' });
  });

  it('Breeding: eggs, a hatch and a birth open Eggs & fry', () => {
    expect(plan({ kind: 'breeding', notice: { topic: 'eggs', vars: { name: 'Carmine', n: 240, tank: 'Ember’s Tank' } } })).toMatchObject({ category: 'breeding', title: 'Carmine laid eggs', body: '240 eggs in Ember’s Tank.', route: '#/livestock/eggs' });
    expect(plan({ kind: 'breeding', notice: { topic: 'hatch', vars: { name: 'Carmine', n: 180, tank: 'Nursery' } } })).toMatchObject({ title: 'Carmine’s eggs hatched', body: '180 fry are free-swimming in Nursery.' });
    expect(plan({ kind: 'breeding', notice: { topic: 'hatch', vars: { n: 1, tank: 'Nursery' } } })).toMatchObject({ title: 'Eggs hatched', body: '1 fry is free-swimming in Nursery.' });
    expect(plan({ kind: 'breeding', notice: { topic: 'birth', vars: { name: 'Pearl', n: 22, tank: 'Guppy Tank' } } })).toMatchObject({ title: 'Pearl gave birth', body: '22 young in Guppy Tank.', route: '#/livestock/eggs' });
  });

  it('Shows: "{Show}: {Name} placed {place}" / "{prize} prize · {ribbon} ribbon." (the results line without either)', () => {
    expect(plan({ kind: 'celebrate', notice: { topic: 'show_result', vars: { show: 'Spring Fancy', name: 'Ember', place: '1st', prize: 120, ribbon: 'Blue' } } })).toMatchObject({ category: 'shows', title: 'Spring Fancy: Ember placed 1st', body: '$120 prize · Blue ribbon.', route: '#/shows/results' });
    expect(plan({ kind: 'celebrate', notice: { topic: 'show_result', vars: { show: 'S', name: 'E', place: 'Honourable Mention', ribbon: 'Green' } } })?.body).toBe('Green ribbon.');
    const none = plan({ kind: 'info', text: 'Ember was 7th of 12 in Bettas at Spring Fancy — no ribbons this time. The judge’s cards explain why.', notice: { topic: 'show_result', vars: { show: 'Spring Fancy', name: 'Ember', place: '7th' } } });
    expect(none?.body).toBe('Ember was 7th of 12 in Bettas at Spring Fancy — no ribbons this time. The judge’s cards explain why.');
  });

  it('unmapped or malformed events never notify', () => {
    expect(plan({ kind: 'info', text: 'A visitor dropped by.' })).toBeNull();
    expect(plan({ kind: 'warning', tankId: 't1', text: 'Lonely.' })).toBeNull(); // a warning without a notice
    expect(plan({ kind: 'danger', text: 'No tank named.' })).toBeNull();
    expect(plan({ kind: 'danger', tankId: 'gone', text: 'A tank that no longer exists.' })).toBeNull();
    expect(plan({ kind: 'market', notice: { topic: 'bid', vars: { title: 'T' } } })).toBeNull();
    expect(plan({ kind: 'market', notice: { topic: 'nope' as never } })).toBeNull();
    expect(plan({ kind: 'market', notice: 'garbage' as never })).toBeNull();
  });
});

const market = (): PlannedNotification => ({ category: 'market', title: 'New bid on T', body: 'B offers $10.', route: '#/market/listings/l1', priority: 'normal', tag: 'market' });
const careDanger = (): PlannedNotification => ({ category: 'care', title: 'Reef', body: 'Starving.', route: '#/tanks/t2', priority: 'danger', tag: 'care' });
const prefs = (over: Partial<NotifyPrefs> = {}): NotifyPrefs => ({ ...normalizePrefs(DEFAULT_NOTIFY_PREFS), ...over });

describe('NOTIFY-002: quiet hours, 10 PM to 8 AM on the device clock (B-173)', () => {
  it('22:00 up to 07:59 is quiet; 21:59 and 08:00 are not; across midnight too', () => {
    const q = DEFAULT_NOTIFY_PREFS.quiet;
    expect(inQuietHours(at(21, 59), q)).toBe(false);
    expect(inQuietHours(at(22, 0), q)).toBe(true);
    expect(inQuietHours(at(23, 59), q)).toBe(true);
    expect(inQuietHours(at(0, 0), q)).toBe(true);
    expect(inQuietHours(at(7, 59), q)).toBe(true);
    expect(inQuietHours(at(8, 0), q)).toBe(false);
    expect(inQuietHours(at(23, 0), { ...q, on: false })).toBe(false);
  });

  it('holds a Market notification at 22:00 and 07:59, shows it at 08:00; danger care comes through at 23:00', () => {
    const p = prefs();
    expect(decide(market(), p, emptyRateState(), 0, at(22, 0))).toEqual({ show: false, why: 'quiet' });
    expect(decide(market(), p, emptyRateState(), 0, at(7, 59))).toEqual({ show: false, why: 'quiet' });
    expect(decide(market(), p, emptyRateState(), 0, at(8, 0))).toMatchObject({ show: true });
    expect(decide(careDanger(), p, emptyRateState(), 0, at(23, 0))).toMatchObject({ show: true });
    expect(decide({ ...careDanger(), priority: 'normal' }, p, emptyRateState(), 0, at(23, 0))).toEqual({ show: false, why: 'quiet' });
  });

  it('with quiet hours off, the 23:00 Market notification shows', () => {
    expect(decide(market(), prefs({ quiet: { on: false, start: 22, end: 8 } }), emptyRateState(), 0, at(23, 0))).toMatchObject({ show: true });
  });

  it('a category switched off never shows, quiet or not', () => {
    const p = prefs({ categories: { ...DEFAULT_NOTIFY_PREFS.categories, market: false } });
    expect(decide(market(), p, emptyRateState(), 0, at(12, 0))).toEqual({ show: false, why: 'category-off' });
  });

  it('stored preferences: defaults (Shows off, quiet on), malformed values fall back, the hours stay fixed', () => {
    expect(normalizePrefs(undefined)).toEqual({ categories: { rare: true, care: true, market: true, breeding: true, shows: false }, quiet: { on: true, start: 22, end: 8 } });
    expect(normalizePrefs('nonsense')).toEqual(normalizePrefs(undefined));
    expect(normalizePrefs({ categories: { rare: 'yes', shows: true }, quiet: { on: false, start: 1, end: 2 } })).toEqual({ categories: { rare: true, care: true, market: true, breeding: true, shows: true }, quiet: { on: false, start: 22, end: 8 } });
  });
});

describe('NOTIFY-005: rate limits on real time', () => {
  it('one per category per 30 minutes; the next one names the ones held back', () => {
    const rate = emptyRateState();
    const p = prefs();
    const t0 = 1_000_000;
    expect(decide(market(), p, rate, t0, at(12))).toMatchObject({ show: true, body: 'B offers $10.' });
    expect(decide(market(), p, rate, t0 + 60_000, at(12))).toEqual({ show: false, why: 'rate' });
    expect(decide(market(), p, rate, t0 + CATEGORY_GAP_MS - 1, at(12))).toEqual({ show: false, why: 'rate' });
    expect(decide(careDanger(), p, rate, t0 + 120_000, at(12))).toMatchObject({ show: true }); // another category
    expect(decide(market(), p, rate, t0 + CATEGORY_GAP_MS, at(12))).toEqual({ show: true, title: 'New bid on T', body: 'B offers $10. … and 2 more' });
    expect(decide(market(), p, rate, t0 + 2 * CATEGORY_GAP_MS, at(12))).toMatchObject({ show: true, body: 'B offers $10.' });
  });

  it('at most six an hour in all: the seventh waits', () => {
    const rate = emptyRateState();
    const p = prefs();
    const cats = ['rare', 'care', 'market', 'breeding', 'shows'] as const;
    const all = { ...p, categories: { rare: true, care: true, market: true, breeding: true, shows: true } };
    let shown = 0;
    for (let i = 0; i < 10; i++) {
      const c = cats[i % cats.length];
      const t = i < 5 ? i * 1000 : CATEGORY_GAP_MS + i * 1000; // two rounds: five, then five more after 30 min
      if (decide({ ...market(), category: c, tag: c }, all, rate, t, at(12)).show) shown++;
    }
    expect(MAX_PER_HOUR).toBe(6);
    expect(shown).toBe(6);
    // an hour after the first round, its slots are free again (Animal care last showed in that round)
    expect(decide({ ...market(), category: 'care', tag: 'care' }, all, rate, HOUR_MS + 1000, at(12))).toMatchObject({ show: true });
  });

  it('every notification of a category carries that category as its tag', () => {
    const plans = [
      plan({ kind: 'market', notice: { topic: 'prismatic', vars: { species: 'betta', morph: 'M', seller: 'S', until: 110 } } }),
      plan({ kind: 'danger', tankId: 't1', text: 'x' }),
      plan({ kind: 'market', notice: { topic: 'sale', vars: { title: 'T', buyer: 'B', amount: 1 } } }),
      plan({ kind: 'breeding', notice: { topic: 'eggs', vars: { name: 'A', n: 2, tank: 'T' } } }),
      plan({ kind: 'celebrate', notice: { topic: 'show_result', vars: { show: 'S', name: 'N', place: '1st', prize: 5, ribbon: 'Blue' } } }),
    ];
    expect(plans.map((p) => p?.category)).toEqual(['rare', 'care', 'market', 'breeding', 'shows']);
    for (const p of plans) expect(p?.tag).toBe(p?.category);
  });

  it('the test notification (§12.5)', () => {
    expect(TEST_NOTIFICATION).toEqual({ title: 'Test notification', body: 'Notifications work on this device. You’ll hear about rare stock, hungry animals and sales.' });
  });
});
