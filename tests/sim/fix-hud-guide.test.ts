/**
 * fix lane HUD — guide polish: the food picker leads with the food the guide's feed step names (P1-07).
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { foodOptions, guideMentions } from '@/ui/hud/ToolRail';
import { tutorialChain } from '@/data/quests';

describe('P1-07: the guide-suggested food leads the picker', () => {
  it('matches each starter flavour’s feed step to a real food name', () => {
    expect(guideMentions('Tap Feed and drop an earthworm near Wasabi.', 'Earthworms')).toBe(true);
    expect(guideMentions('Tap Feed, pick micro pellets and tap the water once', 'Micro Pellets')).toBe(true);
    expect(guideMentions('Tap Feed and drop marine pellets or mysis.', 'Frozen Mysis Shrimp')).toBe(true);
    expect(guideMentions('Tap Feed and drop marine pellets or mysis.', 'Marine Pellets')).toBe(true);
    expect(guideMentions('Tap Feed and drop an earthworm near Wasabi.', 'Axolotl Pellets')).toBe(false);
    expect(guideMentions('Tap Feed, pick micro pellets and tap the water once', 'Frozen Bloodworms')).toBe(false);
  });

  it.each(['axolotl', 'betta', 'ocellaris_clownfish', 'lined_seahorse', 'pea_puffer'] as const)('%s: the first in-stock option is the one the guide names', (starter) => {
    const g = newGame({ starterId: starter, starterName: 'Tester', seed: 7 });
    g.progress.tutorial.step = tutorialChain(starter).findIndex((s) => s.id === 'feed');
    const opts = foodOptions(g, g.tankOrder[0]);
    expect(opts.length).toBeGreaterThan(1);
    expect(opts[0].suggested).toBe(true);
    expect(opts[0].count).toBeGreaterThan(0);
    // outside the feed step nothing is tagged
    g.progress.tutorial.step = 0;
    expect(foodOptions(g, g.tankOrder[0]).some((o) => o.suggested)).toBe(false);
  });
});

import { selectedCreaturePatch } from '@/ui/hud/tankGuard';
import { quickSell } from '@/sim/economy/listings';
import { moveCreature } from '@/sim/life/actions';
import { createTank } from '@/sim/tanks';

describe('P5-07: the creature card / follow camera let go of an animal that is gone or moved', () => {
  const base = { screen: 'game' as const, view: 'tank' as const, cameraMode: 'follow' as const };
  it('sold: selection, follow and follow camera are cleared', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Tester', seed: 3 });
    const id = Object.keys(g.creatures)[0];
    const tank = g.tankOrder[0];
    expect(selectedCreaturePatch(g, { ...base, selectedCreatureId: id, followCreatureId: id, focusedTankId: tank })).toEqual({});
    g.creatures[id].isStarter = false;
    const r = quickSell(g, [id]);
    expect(r.ok).toBe(true);
    expect(g.creatures[id].status).toBe('sold');
    expect(selectedCreaturePatch(g, { ...base, selectedCreatureId: id, followCreatureId: id, focusedTankId: tank })).toEqual({ selectedCreatureId: null, followCreatureId: null, cameraMode: 'front' });
  });
  it('moved: the view follows the animal into its new tank', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Tester', seed: 3 });
    const id = Object.keys(g.creatures)[0];
    const from = g.tankOrder[0];
    const to = createTank(g, 'g40B', g.tanks[from].waterClass).id;
    expect(g.tanks[to]).toBeTruthy();
    expect(moveCreature(g, id, to).ok).toBe(true);
    expect(selectedCreaturePatch(g, { ...base, selectedCreatureId: id, followCreatureId: null, focusedTankId: from })).toEqual({ focusedTankId: to });
  });
});
