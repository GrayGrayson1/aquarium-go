/**
 * Audit 2026-11-17, area G (building and growing: tanks, equipment fit, decorating, the facility, research and
 * unlocks): each finding's fix, pinned.
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { unlockProgress, guideHoldLine } from '@/sim/facility';
import { marketAccess } from '@/sim/economy';
import { lockViews } from '@/ui/panels/common/UnlockHelp';

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
