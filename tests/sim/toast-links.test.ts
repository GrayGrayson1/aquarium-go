// @vitest-environment node
/**
 * Audit 2026-11-17, B4 — toasts take you to what they are about, as the same lines do in the bell and the Log: a bid,
 * a closed auction or a sale opens its listing, a rare find or a special its offer, new arrivals the shop; the
 * starvation slow-down names its first animal ("See them"); a warning about a tank opens the tank's card (on its
 * Equipment tab when the line says so).
 */
import { describe, it, expect } from 'vitest';
import { viewOf, toastGo, toastTap } from '@/ui/hud/Toasts';
import { starvingAnimal } from '@/game/starvationGuard';
import { STARVING_HEALTH, STARVING_HUNGER } from '@/sim/starvation';
import { newGame } from '@/sim/newGame';

const one = (text: string, ids: { listingId?: string; offerId?: string } = {}) => viewOf({ texts: [text], group: null, ...ids });

describe('B4: market toasts open what they are about', () => {
  it('a new best bid and a closed auction open the listing', () => {
    expect(one('Sam Reyes (Collector) offered $45 for "Wasabi".', { listingId: 'L1' }).link).toMatchObject({ panel: 'market', target: 'listing:L1' });
    expect(one('Bidding closed on "Wasabi". Best open offer: $60 from Sam Reyes — accept it before it expires.', { listingId: 'L1' }).link).toMatchObject({ panel: 'market', target: 'listing:L1' });
  });

  it('a Prismatic find and a market special open their offer; new arrivals the shop, or their one offer', () => {
    expect(one('Something special at the shop: a Prismatic Koi betta from Reef Row — $120.', { offerId: 'O1' }).link).toMatchObject({ panel: 'market', target: 'offer:O1' });
    const special = one('Market special: Wild-type pair from Reef Row — $80, today only.', { offerId: 'O2' });
    expect(special).toMatchObject({ label: 'Market special', title: 'Wild-type pair from Reef Row — $80, today only.', link: { panel: 'market', target: 'offer:O2' } });
    expect(one('New arrivals at the shop: Neon tetra, Cherry shrimp.')).toMatchObject({ label: 'New at the shop', title: 'Neon tetra, Cherry shrimp', link: { panel: 'market', target: 'tab:shop' } });
    expect(one('New arrivals at the shop: Neon tetra.', { offerId: 'O3' }).link).toMatchObject({ target: 'offer:O3' });
  });

  it('a link makes the toast a button that goes there; a merged burst still opens the log', () => {
    const v = one('Sam Reyes (Collector) offered $45 for "Wasabi".', { listingId: 'L1' });
    expect(toastGo({ kind: 'market', texts: ['x'] }, v)).toEqual({ to: 'panel', panel: 'market', target: 'listing:L1' });
    const burst = viewOf({ texts: ['A offered $1 for "W".', 'B offered $2 for "W".'], group: 'bid', listingId: 'L1' });
    expect(toastGo({ kind: 'market', texts: [] }, burst)).toEqual({ to: 'log' });
  });
});

describe('B4: tank warnings open the tank card', () => {
  const v = { title: '' };
  it('a warning or danger about a tank opens its card; news about an animal opens the animal', () => {
    expect(toastGo({ kind: 'warning', texts: ['Water in Ember’s Tank is getting warm.'], tankId: 'T1' }, v)).toEqual({ to: 'tank', tankId: 'T1', card: true, gear: false, creatureId: null });
    expect(toastGo({ kind: 'danger', texts: ['Ammonia is rising in Ember’s Tank.'], tankId: 'T1' }, v)).toMatchObject({ card: true });
    expect(toastGo({ kind: 'breeding', texts: ['Ember laid eggs.'], tankId: 'T1' }, v)).toMatchObject({ card: false });
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    const ember = Object.values(g.creatures)[0];
    expect(toastGo({ kind: 'warning', texts: ['Ember is hungry.'], tankId: 'T1', creatureId: ember.id }, v, g)).toEqual({ to: 'tank', tankId: 'T1', card: false, gear: false, creatureId: ember.id });
  });

  it('audit B8: an animal that has died or been sold gets no card (its tank opens instead)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    const ember = Object.values(g.creatures)[0];
    for (const status of ['dead', 'sold'] as const) {
      ember.status = status;
      expect(toastGo({ kind: 'death', texts: ['Ember has passed away.'], tankId: 'T1', creatureId: ember.id }, v, g)).toEqual({ to: 'tank', tankId: 'T1', card: false, gear: false, creatureId: null });
    }
    ember.status = 'listed';
    expect(toastGo({ kind: 'market', texts: ['x'], tankId: 'T1', creatureId: ember.id }, v, g)).toMatchObject({ creatureId: ember.id });
  });

  it('a keeper’s “Repair it in the tank card › Equipment.” opens the card on Equipment', () => {
    const text = 'Robin: the Sponge Filter in Ember’s Tank has failed, so the rest of the filtration can’t keep up with 9 animals even with daily water changes. Repair it in the tank card › Equipment.';
    expect(toastGo({ kind: 'warning', texts: [text], tankId: 'T1' }, v)).toMatchObject({ card: true, gear: true });
  });
});

describe('B4: the starvation slow-down', () => {
  it('goes to the first animal it names that is starving in a tank', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    const ember = Object.values(g.creatures).find((c) => c.name === 'Ember')!;
    expect(starvingAnimal(g, ['Ember'])).toBeNull(); // fed
    ember.stats.hunger = STARVING_HUNGER + 1;
    ember.stats.health = STARVING_HEALTH - 1;
    expect(starvingAnimal(g, ['Nobody', 'Ember'])).toEqual({ tankId: ember.tankId, creatureId: ember.id });
    ember.status = 'dead';
    expect(starvingAnimal(g, ['Ember'])).toBeNull();
  });
});

describe('audit B19: over a phone sheet, a tapped toast gets out of the way', () => {
  const link = { panel: 'market' as const, target: 'listing:L1', where: '' };
  it('its text goes there when no phone sheet is under it; the tooltip says where', () => {
    expect(toastTap({ tankId: 'T1' }, {}, false)).toEqual({ textGoes: true, dismiss: false, button: null, title: 'Go to this tank' });
    expect(toastTap({ tankId: 'T1', creatureId: 'C1' }, {}, false).title).toBe('Go to this animal');
    expect(toastTap({}, { link }, false)).toMatchObject({ textGoes: true, title: 'Take me there' });
    expect(toastTap({}, { opensLog: true }, false).title).toBe('Open Alerts'); // (a burst opens the bell's drawer)
    expect(toastTap({}, {}, false)).toMatchObject({ textGoes: false, dismiss: false }); // plain news: a tap pins it open
  });
  it('over a phone sheet a tap dismisses it (review: pinning grew it over the list); only its own button goes', () => {
    expect(toastTap({ tankId: 'T1', actionLabel: 'See them' }, {}, true)).toMatchObject({ textGoes: false, dismiss: true, button: 'See them' });
    expect(toastTap({}, { link }, true)).toMatchObject({ textGoes: false, dismiss: true, button: null });
    expect(toastTap({}, {}, true)).toMatchObject({ dismiss: true, button: null });
  });
});
