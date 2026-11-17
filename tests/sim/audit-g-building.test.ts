/**
 * Audit 2026-11-17, area G (building and growing: tanks, equipment fit, decorating, the facility, research and
 * unlocks): each finding's fix, pinned.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { newGame } from '@/sim/newGame';
import { unlockProgress, guideHoldLine } from '@/sim/facility';
import { marketAccess } from '@/sim/economy';
import { lockViews, UnlockHelpBody } from '@/ui/panels/common/UnlockHelp';
import { GROUPS, UnlocksTab, researchLockKeys } from '@/ui/panels/research/ResearchPanel';
import { RESEARCH_BY_ID } from '@/data/research';

const game = (starterId = 'axolotl', seed = 71): GameState => newGame({ starterId, starterName: 'Ember', seed });

describe('G1: an unlock the guide holds back says so', () => {
  it('names the guide step that hands out the 40 gallon, and never shows it 100% done', () => {
    const g = game('axolotl');
    g.progress.reputation = 30; // the rule (25 reputation) is met, but the guide holds the 40 gallon for "Room to grow"
    expect(guideHoldLine(g, 'tank_40')).toBe('Your guide gives you this at its “Room to grow” step (see Research › Quests).');
    const [v] = lockViews(g, ['tank_40']);
    expect(v.guide).toContain('“Room to grow”');
    const row = unlockProgress(g).find((u) => u.key === 'tank_40')!;
    expect(row.guide).toContain('Room to grow');
    expect(row.progress).toBeLessThan(1);
  });
  it('says nothing once the guide is finished or skipped, or for keys the guide doesn’t give', () => {
    const g = game('axolotl');
    g.progress.reputation = 30;
    expect(guideHoldLine(g, 'tank_55')).toBeNull();
    g.progress.tutorial.skipped = true;
    g.progress.tutorial.done = true;
    expect(guideHoldLine(g, 'tank_40')).toBeNull();
    expect(lockViews(g, ['tank_40'])[0].guide).toBeUndefined();
  });
  it('the Market tells a player before the guide’s market step that the guide opens listings', () => {
    const g = game('betta');
    g.progress.reputation = 12;
    g.progress.tutorial.flags.opened_market = true;
    expect(marketAccess(g).hint).toMatch(/^Listings open at the guide’s “The market” step: open the Market while that step is on\./);
    g.progress.tutorial.skipped = true;
    g.progress.tutorial.done = true;
    expect(marketAccess(g).hint).toMatch(/^Listings open after your first visit to the Market/);
  });
});

describe('G2: the Unlock map shows every unlock, and an empty search says so', () => {
  it('puts every unlock key in exactly one group', () => {
    for (const k of Object.keys(UNLOCK_KEYS)) expect(GROUPS.filter((grp) => grp.test(k)).map((grp) => grp.id), k).toHaveLength(1);
  });
  it('finds sharks and rays and the rooms by name, and a search with no hits offers Clear filters', () => {
    const g = game('betta');
    const tab = (q: string) => renderToStaticMarkup(createElement(UnlocksTab, { g, q, setQ: () => {} }));
    expect(tab('Sharks and rays')).toContain('Sharks and rays');
    expect(tab('Water room')).toContain('Water room');
    const none = tab('zzzz nothing');
    expect(none).toContain('Nothing matches');
    expect(none).toContain('data-testid="unlocks-clear"');
    expect(tab('')).not.toContain('Nothing matches');
  });
});

describe('G4: a locked research project’s box says how to get the unlocks it needs', () => {
  it('Reef Systems’ box routes “Better filters, heaters, lights” to Better Life Support and its reputation', () => {
    const g = game('ocellaris_clownfish');
    const reef = RESEARCH_BY_ID.reef_systems;
    expect(researchLockKeys(reef)).toEqual(['marine_basics', 'gear_tier2']);
    const html = renderToStaticMarkup(createElement(UnlockHelpBody, { g, conds: reef.requires, keys: researchLockKeys(reef), onGo: () => {} }));
    expect(html).toContain('data-testid="unlock-help-gear_tier2"'); // its own section…
    expect(html).toContain('data-testid="unlock-help-research-life_support_2"'); // …with the research that grants it
    expect(html).toContain('50 reputation'); // …and its play route
    expect(html).not.toContain('data-testid="unlock-help-marine_basics"'); // a clownfish keeper already has marine
  });
});
