/**
 * Fix lane INTEGRATE-UI — panel helpers that pick up the round-1 sim rules.
 *
 *   X-7  the Staff tab's "New faces …" line counts calendar days ('today at 8:00 AM', 'in 2 days', never 'in 1 days').
 *   X-8  isListed(): residents of a tank listed as a whole aquarium are spoken for, like the sim says.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { poolWhen } from '@/ui/panels/common/format';
import { isListed } from '@/ui/panels/common/derive';
import type { Listing } from '@/types';

describe('X-7 — hiring pool clock', () => {
  it('names today / tomorrow by calendar day and pluralises the rest', () => {
    // pools refresh at 8 AM; hour 0 = day 1 midnight
    expect(poolWhen(8, 2)).toBe('today at 8:00 AM');
    expect(poolWhen(24 + 8, 2)).toBe('tomorrow at 8:00 AM');
    // late evening: 11 hours away is still tomorrow (the old code said "tomorrow" for anything under 20 h)
    expect(poolWhen(24 + 8, 21)).toBe('tomorrow at 8:00 AM');
    // 19 hours away, but the day after tomorrow on the calendar
    expect(poolWhen(48 + 8, 37)).toBe('tomorrow at 8:00 AM');
    expect(poolWhen(72 + 8, 10)).toBe('in 3 days');
    expect(poolWhen(48 + 8, 10)).toBe('in 2 days');
  });
  it('never says "in 1 days" and copes with an unset or passed pool hour', () => {
    for (let now = 0; now < 96; now += 0.5) for (const next of [8, 32, 56, 80, 104]) expect(poolWhen(next, now)).not.toMatch(/\b1 days\b/);
    expect(poolWhen(-1, 50)).toBe('any moment now');
    expect(poolWhen(40, 50)).toBe('any moment now');
  });
});

describe('X-8 — isListed covers whole-aquarium listings', () => {
  it('a resident of a listed tank is listed; residents of other tanks are not', () => {
    const g = newGame({ starterId: 'betta', starterName: 'X', seed: 11, shopName: 'T' });
    const tankId = g.tankOrder[0];
    const resident = Object.values(g.creatures).find((c) => c.tankId === tankId && c.status === 'alive')!;
    expect(resident).toBeTruthy();
    expect(isListed(g, resident.id)).toBe(false);
    const l = { id: 'L1', kind: 'tank', status: 'active', tankId, creatureIds: [], bids: [] } as unknown as Listing;
    g.market.listings.push(l);
    expect(isListed(g, resident.id)).toBe(true);
    l.status = 'withdrawn';
    expect(isListed(g, resident.id)).toBe(false);
    // a creature listing elsewhere does not make the tank's residents listed
    g.market.listings.push({ id: 'L2', kind: 'creature', status: 'active', tankId: undefined, creatureIds: ['someone-else'], bids: [] } as unknown as Listing);
    expect(isListed(g, resident.id)).toBe(false);
    expect(isListed(g, 'someone-else')).toBe(true);
  });
});
