/**
 * chunk 22 (ADR-0058, S-5) — My listings were re-sorted by open bids on every render, so a bid arriving elsewhere (or
 * the player's own answer) swapped the cards under their thumb. The order is decided when the tab opens and when a
 * listing is added; one that ends just leaves; new bids move nothing.
 */
import { describe, it, expect } from 'vitest';
import type { Listing } from '@/types';
import { steadyOrder } from '@/ui/panels/market/Listings';

const L = (id: string, open: number, endsHour: number): Listing => ({ id, endsHour, bids: Array.from({ length: open }, (_, i) => ({ id: `${id}b${i}`, status: 'open' })) }) as unknown as Listing;

describe('S-5: the listings keep their order while the tab is open', () => {
  it('opening the tab: the most open bids first, then the soonest to end (as before)', () => {
    expect(steadyOrder(null, [L('a', 0, 50), L('b', 2, 90), L('c', 0, 40), L('d', 1, 10)])).toEqual(['b', 'd', 'c', 'a']);
  });
  it('bids coming and going move nothing', () => {
    const first = steadyOrder(null, [L('a', 3, 50), L('b', 1, 60), L('c', 0, 70)]);
    expect(first).toEqual(['a', 'b', 'c']);
    expect(steadyOrder(first, [L('a', 0, 50), L('b', 1, 60), L('c', 5, 70)])).toEqual(['a', 'b', 'c']);
  });
  it('a listing that ends leaves the others where they are', () => {
    expect(steadyOrder(['a', 'b', 'c'], [L('a', 0, 50), L('c', 4, 70)])).toEqual(['a', 'c']);
  });
  it('a new listing: the order is decided afresh', () => {
    expect(steadyOrder(['a', 'b'], [L('a', 0, 50), L('b', 2, 60), L('n', 0, 40)])).toEqual(['b', 'n', 'a']);
  });
});
