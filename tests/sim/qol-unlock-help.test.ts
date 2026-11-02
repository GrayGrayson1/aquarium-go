/**
 * chunk 19 (ADR-0055 decision 5, QOL-006) — "Locked" says how to unlock: the missing unlocks' routes, requirements with
 * progress, the research that grants them and whether a bigger venue is needed.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newGame } from '@/sim/newGame';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { RESEARCH } from '@/data/research';
import { lockViews, UnlockHelpBody } from '@/ui/panels/common/UnlockHelp';

const game = () => newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });

describe('QOL-006: how to unlock', () => {
  it('names a locked tank size’s route with the player’s progress', () => {
    const g = game();
    g.progress.reputation = 23;
    const [v] = lockViews(g, ['tank_55']);
    expect(v.key).toBe('tank_55');
    expect(v.hint).toBe('Reach 60 reputation.');
    const rep = v.requirements.find((r) => /reputation/i.test(r.label));
    expect(rep, JSON.stringify(v.requirements)).toBeTruthy();
    expect(rep!.met).toBe(false);
    expect(Math.floor(rep!.current)).toBe(23);
    expect(rep!.target).toBe(60);
  });
  it('offers the research that grants it, and a venue when the rule asks for one', () => {
    const g = game();
    const [big] = lockViews(g, ['tank_500']);
    const acrylic = RESEARCH.find((r) => r.grants.includes('tank_500' as never))!;
    expect(big.research.map((r) => r.id)).toContain(acrylic.id);
    expect(big.venue).toBe(true); // "…or grow into a destination aquarium"
    const [mid] = lockViews(g, ['tank_75']);
    expect(mid.venue).toBe(true); // a specialty shop
    const [small] = lockViews(g, ['tank_55']);
    expect(small.venue).toBe(false);
  });
  it('leaves out what is already unlocked, and repeats nothing', () => {
    const g = game();
    g.progress.unlocked.push('tank_55');
    expect(lockViews(g, ['tank_55', null, undefined])).toEqual([]);
    expect(lockViews(g, ['tank_90', 'tank_90']).map((v) => v.key)).toEqual(['tank_90']);
  });
  it('explains every locked tank size in Build (no Locked without a route)', () => {
    const g = game();
    for (const tier of TANK_TIERS) {
      if (!tier.unlock || g.progress.unlocked.includes(tier.unlock)) continue;
      const [v] = lockViews(g, [tier.unlock]);
      expect(v, tier.id).toBeTruthy();
      expect(v.hint.length + v.research.length + v.requirements.length, tier.id).toBeGreaterThan(0);
    }
  });
  it('renders the box: route, checklist and the Research button', () => {
    const g = game();
    const html = renderToStaticMarkup(createElement(UnlockHelpBody, { g, keys: ['tank_500'], onGo: () => {} }));
    expect(html).toContain('data-testid="unlock-help"');
    expect(html).toContain('Open in Research');
    expect(html).toContain('Open Build › Facility');
  });
});
