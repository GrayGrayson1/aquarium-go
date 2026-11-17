/**
 * Audit 2026-11-17, B21 — "View listing" on an older event (last week's sale in the Log) opened My listings with
 * nothing to see: only the ten latest ended listings are shown, of the 40 kept. The one asked for is shown too.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Listing } from '@/types';
import { newGame } from '@/sim/newGame';
import { endedShown } from '@/ui/panels/market/Listings';
import { NOT_FOUND } from '@/ui/nav/router';

function market(n: number): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 3 });
  g.market.listings = Array.from({ length: n }, (_, i) => ({ id: `l${i}`, status: 'sold', closedHour: 1000 - i, title: `Lot ${i}`, creatureIds: [] }) as unknown as Listing);
  return g;
}

describe('B21: an older listing asked for by a link', () => {
  it('the ten latest ended listings, newest first', () => {
    expect(endedShown(market(14), null).map((l) => l.id)).toEqual(['l0', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9']);
  });
  it('and the one a link asks for, though older', () => {
    const shown = endedShown(market(14), 'l12').map((l) => l.id);
    expect(shown).toHaveLength(11);
    expect(shown.at(-1)).toBe('l12');
    expect(endedShown(market(14), 'l3')).toHaveLength(10); // already shown
    expect(endedShown(market(14), 'gone')).toHaveLength(10);
  });
  it('one the market no longer keeps is met with the router’s words', () => {
    expect(NOT_FOUND.listing).toMatchObject({ title: 'That listing isn’t here any more', detail: 'Showing your listings instead.' });
  });
});
