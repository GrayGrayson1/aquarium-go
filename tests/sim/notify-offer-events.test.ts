/**
 * lane:notify (chunk 3; 0.5 spec §12.2; NOTIFY-004, B-189) — stocking events carry the offer they announce, so the
 * notification (and the Alerts drawer's link) opens it: a Prismatic in the restock, a market special, and new arrivals
 * after an unlock (only their Prismatic one, or the only one stocked; new species alone aren't rare stock).
 */
import { afterEach, describe, it, expect } from 'vitest';
import type { GameEvent, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { mulberry32 } from '@/sim/rng';
import { refreshStock, requiredUnlocks, isSpeciesAvailable } from '@/sim/economy';
import { stockNewUnlocks, maybeSpecial } from '@/sim/economy/shop';
import { forcePrismatic, isPrismatic } from '@/sim/life';
import { listSpecies } from '@/data/species';
import { planNotification } from '@/ui/notify/rules';
import { eventLink } from '@/ui/hud/eventLinks';

afterEach(() => forcePrismatic('shop', 0));

const game = (seed = 3): GameState => {
  const s = newGame({ starterId: 'betta', starterName: 'T', seed });
  s.isShowcase = false;
  return s;
};
const look = (s: GameState) => ({ hour: s.clock.hour, tankName: (id: string) => s.tanks[id]?.name ?? null });
const newEvents = (s: GameState, from: number): GameEvent[] => s.log.slice(from);

describe('NOTIFY-004: a Prismatic in the restock', () => {
  it('names its offer: the notification and the drawer link open it', () => {
    const s = game();
    s.market.stock = [];
    const from = s.log.length;
    forcePrismatic('shop', 1);
    refreshStock(s, mulberry32(7), s.clock.hour + 1);
    const ev = newEvents(s, from).find((e) => e.text.startsWith('Something special at the shop: a Prismatic'))!;
    expect(ev).toBeTruthy();
    const offer = s.market.stock.find((o) => o.id === ev.offerId)!;
    expect(offer.creatures.some(isPrismatic)).toBe(true);
    expect(ev.notice?.topic).toBe('prismatic');
    expect(ev.notice?.vars).toMatchObject({ seller: offer.seller, until: offer.expiresHour });
    const p = planNotification(ev, look(s))!;
    expect(p.route).toBe(`#/shop/fish/${offer.id}`);
    expect(p.title).toMatch(/^Prismatic .+ in the shop$/);
    expect(eventLink(ev)).toEqual({ panel: 'market', target: `offer:${offer.id}`, where: '', label: 'Open the shop' });
  });
});

describe('NOTIFY-004: a market special', () => {
  it('names its offer (a Prismatic special notifies as Prismatic)', () => {
    for (const shimmer of [false, true]) {
      let found: { s: GameState; ev: GameEvent } | null = null;
      for (let seed = 1; seed < 40 && !found; seed++) {
        const s = game(seed);
        s.clock.hour = 24 * 2 + 11; // 11 AM
        const from = s.log.length;
        if (shimmer) forcePrismatic('shop', 1);
        maybeSpecial(s, mulberry32(seed), s.clock.hour, 6);
        forcePrismatic('shop', 0);
        const ev = newEvents(s, from).find((e) => e.text.startsWith('Market special:'));
        if (ev) found = { s, ev };
      }
      expect(found).not.toBeNull();
      const { s, ev } = found!;
      expect(ev.offerId).toBe(s.market.stock[0].id);
      if (shimmer) expect(ev.notice?.topic).toBe('prismatic');
      else if (ev.notice) expect(ev.notice.topic).toBe('special');
      // with or without a notification, the drawer's link opens the offer
      expect(eventLink(ev)?.target).toBe(`offer:${ev.offerId}`);
      if (ev.notice) expect(planNotification(ev, look(s))?.route).toBe(`#/shop/fish/${ev.offerId}`);
    }
  });
});

/** An unlock key that, unlocked now, makes exactly `want` species buyable ('many' = two or more). */
function keyFor(s: GameState, want: 1 | 'many'): string | null {
  const keys = new Set(listSpecies(() => true).flatMap((sp) => requiredUnlocks(sp)));
  for (const k of keys) {
    if (s.progress.unlocked.includes(k)) continue;
    const opened = listSpecies(() => true).filter((sp) => !isSpeciesAvailable(s, sp.id) && requiredUnlocks(sp).includes(k) && requiredUnlocks(sp).every((r) => r === k || s.progress.unlocked.includes(r)));
    if (want === 1 ? opened.length === 1 : opened.length >= 2) return k;
  }
  return null;
}

function unlockAndStock(s: GameState, key: string, seed = 5): GameEvent | undefined {
  s.market.stock = [];
  s.market.seenUnlocks = s.progress.unlocked.length;
  s.progress.unlocked.push(key);
  const from = s.log.length;
  stockNewUnlocks(s, mulberry32(seed), s.clock.hour, true);
  return newEvents(s, from).find((e) => e.text.startsWith('New arrivals at the shop:'));
}

describe('B-189: new arrivals after an unlock', () => {
  it('one species stocked: the event opens that offer, and it isn’t a rare-stock notification', () => {
    const s = game();
    const key = keyFor(s, 1);
    expect(key).not.toBeNull();
    const ev = unlockAndStock(s, key!)!;
    expect(s.market.stock).toHaveLength(1);
    expect(ev.offerId).toBe(s.market.stock[0].id);
    expect(ev.notice).toBeUndefined();
    expect(planNotification(ev, look(s))).toBeNull();
  });

  it('several species stocked: no single offer (the drawer opens the shop), no notification', () => {
    const s = game();
    const key = keyFor(s, 'many');
    expect(key).not.toBeNull();
    const ev = unlockAndStock(s, key!)!;
    expect(s.market.stock.length).toBeGreaterThan(1);
    expect(ev.offerId).toBeUndefined();
    expect(ev.notice).toBeUndefined();
    expect(eventLink(ev)).toMatchObject({ panel: 'market', target: 'tab:shop', label: 'Open the shop' });
  });

  it('a Prismatic among them: the event opens it and notifies as rare stock', () => {
    const s = game();
    const key = keyFor(s, 'many');
    forcePrismatic('shop', 1);
    const ev = unlockAndStock(s, key!)!;
    const shimmer = s.market.stock.find((o) => o.creatures.some(isPrismatic))!;
    expect(ev.offerId).toBe(shimmer.id);
    expect(ev.notice?.topic).toBe('prismatic');
    expect(planNotification(ev, look(s))?.route).toBe(`#/shop/fish/${shimmer.id}`);
  });

  it('a rare-stock event without an offer id opens the shop', () => {
    const s = game();
    const p = planNotification({ id: 'ev_x', hour: 1, kind: 'market', text: 'x', notice: { topic: 'prismatic', vars: { species: 'betta', morph: 'M', seller: 'S', until: 30 } } }, look(s));
    expect(p?.route).toBe('#/shop');
  });
});
