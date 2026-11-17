// @vitest-environment node
/**
 * Audit 2026-11-17, area A — a new player's first hour, and the guide that is meant to carry them: the waiting steps
 * say what they wait for (A1), the guide names an animal that is still there (A1), the finale says where the quests
 * and the guide's reward are (A5, A10) and only true things (A1), a guide step's words follow the player's unit and
 * pointer everywhere (A13, P2), the axolotl's feed step points at the earthworm it names (A12), the nursery step opens
 * Tanks (A3), the water step points at the reading (A11), the animal's card on a phone folds the guide (P1), quests and
 * party mode say where they are (A5, A16), the phone tour has no star (A8) and a new game always shows its guide (A4).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { tutorialAdvance, tutorialStepId } from '@/sim/facility';
import { friendBlocker } from '@/sim/facility/visitors';
import { quickSell } from '@/sim/economy/listings';
import { addCreature, createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { tutorialChain } from '@/data/quests';
import { currentCoachStep, friendWait } from '@/ui/tutorial/guideText';
import { finaleLines } from '@/ui/tutorial/TutorialCoach';
import { guideAim, type GuideScreen } from '@/ui/tutorial/guideTargets';

/** Press Next (or let the step complete) until the guide is on `id`. */
function walkTo(g: GameState, id: string): void {
  for (let guard = 0; guard < 20 && tutorialStepId(g) !== id; guard++) tutorialAdvance(g);
  expect(tutorialStepId(g)).toBe(id);
}

const starterOf = (g: GameState) => Object.values(g.creatures).find((c) => c.isStarter)!;
const visits = (g: GameState) => g.progress.counters.friend_visits ?? 0;
const screen = (p: Partial<GuideScreen> = {}): GuideScreen => ({ panel: null, popover: null, tool: 'none', tankCardOpen: false, mobile: false, ...p });

describe('A1: a step waiting on friends says why none can come', () => {
  it('a healthy starter in the daytime: nothing in the way, and friends do come', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 4 });
    walkTo(g, 'first_money');
    advanceWorld(g, 3, { focusTankId: g.tankOrder[0] }); // 8 am → 11 am
    expect(friendBlocker(g)).toBeNull();
    expect(friendWait(g, 'first_money')).toBeNull();
    const before = visits(g);
    advanceWorld(g, 4, { focusTankId: g.tankOrder[0] });
    expect(visits(g)).toBeGreaterThan(before);
  });

  it('at night: friends visit between 9 am and 9 pm (and time is what helps)', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 4 });
    walkTo(g, 'first_money');
    advanceWorld(g, 3, { focusTankId: g.tankOrder[0] });
    expect(friendBlocker(g, 22)).toEqual({ kind: 'night' });
    expect(friendBlocker(g, 24 + 8.5)).toEqual({ kind: 'night' });
    g.clock.hour = 24 + 22; // 10 pm on day 2
    expect(friendWait(g, 'first_goal')).toEqual({ text: 'Friends visit between 9 am and 9 pm.', time: true });
    expect(friendWait(g, 'feed')).toBeNull(); // only the steps that wait on friends
  });

  it('the starter sold during "A visitor!": no animal on show, the guide says so and offers the Market; no friend ever comes', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    walkTo(g, 'first_money');
    advanceWorld(g, 0.5, { focusTankId: g.tankOrder[0] });
    expect(quickSell(g, [starterOf(g).id]).ok).toBe(true);
    advanceWorld(g, 0.2, { focusTankId: g.tankOrder[0] });
    expect(tutorialStepId(g)).toBe('market'); // the sale counted for "A visitor!"
    tutorialAdvance(g); // Next
    expect(tutorialStepId(g)).toBe('first_goal');
    expect(friendBlocker(g)).toEqual({ kind: 'no_animals' });
    const wait = friendWait(g, 'first_goal')!;
    expect(wait).toEqual({ text: 'Friends come to see your animals, and there are none to see. Bring one home from the Market.', action: 'market', time: false });
    const before = visits(g);
    advanceWorld(g, 48, { focusTankId: g.tankOrder[0] });
    expect(visits(g)).toBe(before); // (the blocker agrees with the sim: nobody came)
    expect(tutorialStepId(g)).toBe('first_goal');
  });

  it('an animal in danger: friends wait until it is doing better, and the tank says why', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 4 });
    walkTo(g, 'first_money');
    advanceWorld(g, 3, { focusTankId: g.tankOrder[0] });
    const tank = g.tanks[g.tankOrder[0]];
    tank.cache.animalStatus = 'danger';
    tank.cache.statusReason = 'Mochi is starving';
    expect(friendBlocker(g)).toEqual({ kind: 'danger', tankId: tank.id, reason: 'Mochi is starving' });
    expect(friendWait(g, 'upgrade')).toEqual({ text: 'Friends won’t visit until Mochi is doing better. Mochi is starving.', time: false });
    // no reason to quote (welfare low with no headline): where to look
    tank.cache.animalStatus = 'good';
    tank.cache.status = 'good';
    delete tank.cache.statusReason;
    tank.cache.welfare = 30;
    expect(friendBlocker(g)).toMatchObject({ kind: 'unwell', tankId: tank.id, reason: null });
    expect(friendWait(g, 'first_money')?.text).toBe('Friends won’t visit until Mochi is doing better. Open the tank card to see what’s wrong.');
  });
});

describe('A1: the guide names an animal that is still there', () => {
  it('the starter sold: the next animal is named, and with none "your animals"', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    walkTo(g, 'first_goal');
    expect(currentCoachStep(g)!.body).toMatch(/^Keep Ember’s tank looking lovely/);
    expect(quickSell(g, [starterOf(g).id]).ok).toBe(true);
    expect(currentCoachStep(g)!.body).toMatch(/^Keep your animals’ tank looking lovely/);
    expect(currentCoachStep(g)!.name).toBeNull();
    const tetra = addCreature(g, createCreature(g, simRng(g), 'neon_tetra', { name: 'Zip' }), g.tankOrder[0]);
    expect(currentCoachStep(g)!.body).toMatch(/^Keep Zip’s tank looking lovely/);
    expect(currentCoachStep(g)!.name).toBe(tetra.name);
  });

  it('the finale says only what is true: no "settled, fed and healthy" (or "Your companion") once the starter is gone', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    advanceWorld(g, 1, { focusTankId: g.tankOrder[0] });
    g.tanks[g.tankOrder[0]].cache.status = 'good';
    expect(finaleLines(g)[0]).toBe('Ember is settled, fed and healthy.');
    g.tanks[g.tankOrder[0]].cache.status = 'watch';
    expect(finaleLines(g).some((l) => /settled, fed and healthy/.test(l))).toBe(false);
    expect(finaleLines(g).some((l) => /^Ember/.test(l))).toBe(true); // still here: its personality line stays
    starterOf(g).status = 'dead';
    const lines = finaleLines(g);
    expect(lines.some((l) => /^Ember is|companion|settled|personality|one of a kind/.test(l))).toBe(false); // (the tank keeps its name)
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('A3: the betta’s and seahorse’s nursery step opens Tanks (a tank’s purpose), not Build', () => {
  it('points at Tanks, and at nothing once Tanks is open; the 40-gallon steps still point into Build', () => {
    for (const id of ['betta', 'lined_seahorse']) {
      const up = tutorialChain(id).find((s) => s.id === 'upgrade')!;
      expect(up.hintTarget, id).toBe('dock-tanks');
      expect(guideAim('upgrade', up.hintTarget, id, screen(), up.reward?.unlocks ?? [])?.candidates).toEqual(['[data-tutorial-id="dock-tanks"]']);
      expect(guideAim('upgrade', up.hintTarget, id, screen({ panel: 'tanks' }), up.reward?.unlocks ?? [])).toBeNull();
    }
    const axo = tutorialChain('axolotl').find((s) => s.id === 'upgrade')!;
    expect(axo.hintTarget).toBe('dock-build');
    expect(guideAim('upgrade', axo.hintTarget, 'axolotl', screen({ panel: 'build' }), axo.reward?.unlocks ?? [])?.candidates[0]).toBe('[data-testid="panel-build"] [data-tier-id="g40B"]');
  });
});
