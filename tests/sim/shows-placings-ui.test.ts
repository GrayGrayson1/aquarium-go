// @vitest-environment node
/**
 * Audit 2026-11-17 (H24): the Shows tiles count placings (1st to Honourable Mention, whose Green ribbon is the owner's,
 * ADR-0024) as "Placings", not "Ribbons" — "Ribbon day" and "First Ribbon" ask for 1st to 3rd, and an Honourable
 * Mention moved neither while the tile said "Ribbons 1".
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newGame } from '@/sim/newGame';
import { TrophyCaseTab } from '@/ui/panels/shows/TrophyCase';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('Audit 2026-11-17 (H24): Placings, not Ribbons', () => {
  it('the trophy case tile says "Placings"', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 81 });
    g.shows = { ...(g.shows ?? {}), trophies: [], stats: { entered: 1, placings: 1, wins: 0, bestInShow: 0, prize: 0 } } as unknown as typeof g.shows;
    const t = text(renderToStaticMarkup(createElement(TrophyCaseTab, { g })));
    expect(t).toContain('Placings 1');
    expect(t).not.toContain('Ribbons 1');
  });
});
