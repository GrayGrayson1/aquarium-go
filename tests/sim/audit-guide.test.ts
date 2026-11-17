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
import { currentCoachStep, fillGuide, friendWait, guideOnForNewGame } from '@/ui/tutorial/guideText';
import { finaleLines, finaleNext, guideFold } from '@/ui/tutorial/TutorialCoach';
import { guideAim, type GuideScreen } from '@/ui/tutorial/guideTargets';
import { tourStops } from '@/ui/tutorial/tourStops';
import { guideMentions } from '@/ui/hud/ToolRail';
import { eventLink, unlockWhere } from '@/ui/hud/eventLinks';
import { navDots } from '@/ui/common/notify';
import { DOCK_ITEMS } from '@/ui/hud/Dock';
import { useSettings } from '@/state/settings';

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

  it('at night: friends visit between 9:00 AM and 9:00 PM, in the clock’s own style (and time is what helps)', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 4 });
    walkTo(g, 'first_money');
    advanceWorld(g, 3, { focusTankId: g.tankOrder[0] });
    expect(friendBlocker(g, 22)).toEqual({ kind: 'night' });
    expect(friendBlocker(g, 24 + 8.5)).toEqual({ kind: 'night' });
    g.clock.hour = 24 + 22; // 10 pm on day 2
    expect(friendWait(g, 'first_goal')).toEqual({ text: 'Friends visit between 9:00 AM and 9:00 PM.', time: true });
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

  it('with no animal left, the steps’ words stay grammatical (review of A1)', () => {
    const step = (starter: string, id: string) => tutorialChain(starter).find((s) => s.id === id)!;
    const none = (t: string) => fillGuide(t, null, 'animal', false);
    expect(none(step('axolotl', 'habitat').body)).toBe('Axolotls dislike bright light. Add a cave or a plant from Build so your animals have a shady retreat.');
    expect(none(step('lined_seahorse', 'feed').body)).toBe('Tap Target and offer frozen mysis right to your animals. Seahorses are slow, deliberate eaters — target feeding makes sure your animals get a full share before anything else can snatch it.');
    expect(none(step('betta', 'feed').done!)).toBe('Your animals ate well.');
    expect(none(step('betta', 'meet').done!)).toBe('Nice to meet you!');
    expect(none(step('betta', 'observe').body)).toBe('Keep watching.'); // ("When {name} sees something new he…" is about that one fish)
    expect(none(step('betta', 'meet').body)).toBe('Say hello.');
    expect(none(step('pea_puffer', 'meet').body)).toBe('There’s no animal to show right now. Bring one home from the Market first.');
    expect(none(step('axolotl', 'first_goal').body)).toMatch(/^Keep your animals’ tank looking lovely/);
    // every step and line of every chain: no "{name}" left, no sentence starting in lower case, no "your animals is/has/gets"
    for (const starter of ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse']) {
      for (const s of tutorialChain(starter)) {
        for (const t of [s.title, s.body, s.done ?? '']) {
          const out = none(t);
          expect(out, `${starter} ${s.id}`).not.toMatch(/\{name\}|your animals (is|has|gets|sees)\b|(^|[.!?]\s+)your animals/);
        }
      }
    }
  });
});

describe('A5, A10: the finale says where the quests and the guide’s reward are, in the layout’s words', () => {
  it('Research › Quests and the $100 for "First steps"; Shows in the dock, or under More on a phone', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    walkTo(g, 'preview');
    tutorialAdvance(g, 'opened_research');
    expect(g.progress.tutorial.done).toBe(true);
    expect(finaleNext(g, false)).toBe('Next: breeding, bigger tanks and a shop of your own. Club shows are open too — find Shows in the dock. Your first goals, and $100 for finishing the guide, are waiting in Research › Quests.');
    expect(finaleNext(g, true)).toContain('find Shows under More.');
    g.progress.quests.find((q) => q.id === 'tutorial')!.status = 'claimed';
    expect(finaleNext(g, false)).toMatch(/Your first goals are waiting in Research › Quests\.$/);
  });

  it('a finished quest is a Research dot (More’s on a phone) and its toast leads to the claim', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    expect(navDots(g, DOCK_ITEMS).research).toBeUndefined();
    walkTo(g, 'preview');
    tutorialAdvance(g, 'opened_research');
    expect(navDots(g, DOCK_ITEMS).research).toEqual({ level: 'new', label: '1 quest reward to claim', target: 'tab:quests' });
    expect(eventLink({ kind: 'celebrate', text: 'Quest complete: Feeding routine — claim your reward!' })).toEqual({ panel: 'research', target: 'tab:quests', where: 'Claim it in Research › Quests.', label: 'Claim it' });
  });
});

describe('P2: the guide’s words follow the player’s pointer', () => {
  it('mouse players click and use the pointer; touch players tap and use a finger', () => {
    const camera = tutorialChain('betta').find((s) => s.id === 'camera')!.body;
    expect(fillGuide(camera, 'Ember', 'betta', true)).toBe('Drag to orbit and scroll to lean in. Bring the pointer near the glass and bettas will often follow it.');
    expect(fillGuide(camera, 'Ember', 'betta', false)).toBe(camera);
    const feed = tutorialChain('betta').find((s) => s.id === 'feed')!.body;
    expect(fillGuide(feed, 'Ember', 'betta', true)).toMatch(/^Click Feed, pick micro pellets and click the water once — one click is a small meal\./);
  });
});

describe('A13, A14: the guide’s words in its own terms, in the player’s unit', () => {
  it('the temperature is in the player’s unit, as on the guide card (Research › Quests reads the same words)', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 4 });
    walkTo(g, 'water');
    const unit = useSettings.getState().tempUnit;
    try {
      useSettings.getState().update({ tempUnit: 'F' });
      expect(currentCoachStep(g, true)!.body).toMatch(/59(\.0)?–64\.4 °F/);
      useSettings.getState().update({ tempUnit: 'C' });
      expect(currentCoachStep(g, true)!.body).toMatch(/15–18 °C/);
    } finally {
      useSettings.getState().update({ tempUnit: unit });
    }
  });

  it('the seahorse step names the rail’s button as it is labelled', () => {
    expect(tutorialChain('lined_seahorse').find((s) => s.id === 'feed')!.body).toMatch(/^Tap Target and offer frozen mysis/);
  });
});

describe('A12: the axolotl’s feed step suggests the earthworm it names, not the pellets', () => {
  it('only the instruction sentence counts', () => {
    const body = tutorialChain('axolotl').find((s) => s.id === 'feed')!.body;
    expect(guideMentions(body, 'Earthworms')).toBe(true);
    expect(guideMentions(body, 'Axolotl Pellets')).toBe(false);
    const clown = tutorialChain('ocellaris_clownfish').find((s) => s.id === 'feed')!.body;
    expect(guideMentions(clown, 'Marine Pellets')).toBe(true);
    expect(guideMentions(clown, 'Frozen Mysis Shrimp')).toBe(true);
  });

  it('the first sentence ends at a full stop followed by a space, as before (a "1.5" doesn’t end it), with no lookbehind', async () => {
    expect(guideMentions('Tap Feed and drop 1.5 earthworms near Mochi. Axolotls hunt by smell.', 'Earthworms')).toBe(true);
    expect(guideMentions('Tap Feed and drop 1.5 earthworms near Mochi. Axolotls hunt by smell.', 'Axolotl Pellets')).toBe(false);
    expect(guideMentions('Drop an earthworm', 'Earthworms')).toBe(true); // no full stop: all of it
    // a regex lookbehind doesn't parse on Safari below 16.4, and one in any module stops the whole game loading there
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f) && /\(\?<[=!]/.test(readFileSync(p, 'utf8'))) found.push(p);
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(found).toEqual([]);
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

describe('A3: the nursery step and the unlock it hands out say what they really do', () => {
  it('any tank can already be a nursery; the `nursery` key is breeding know-how for two research projects', async () => {
    const { UNLOCK_KEYS } = await import('@/data/unlockKeys');
    const { RESEARCH } = await import('@/data/research');
    const { unlockLink } = await import('@/ui/hud/eventLinks');
    const { setTankPurpose } = await import('@/sim/tankOps');
    // what the key gates: these two research projects, and nothing else
    expect(RESEARCH.filter((r) => r.requires.some((c) => c.type === 'unlocked' && c.key === 'nursery')).map((r) => r.id).sort()).toEqual(['genetics_lab', 'live_food_cultures']);
    // a new game's tank can be a nursery at once
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    expect(g.progress.unlocked).not.toContain('nursery');
    expect(setTankPurpose(g, g.tankOrder[0], 'nursery').ok).toBe(true);
    // so nothing names it as tanks
    expect(UNLOCK_KEYS.nursery).toBe('Breeding know-how');
    expect(unlockLink('nursery')).toMatchObject({ panel: 'research', where: 'Needed for the Genetics Lab and Live Food Cultures in Research.' });
    expect(RESEARCH.find((r) => r.id === 'breeding_program')!.blurb).toBe('Breeding know-how that opens the way to the Genetics Lab and Live Food Cultures. Any tank can already be a nursery: set its purpose in Tanks.');
    for (const id of ['betta', 'lined_seahorse']) {
      const up = tutorialChain(id).find((s) => s.id === 'upgrade')!;
      expect(up.reward?.unlocks, id).toEqual(['nursery']);
      expect(up.body, id).toMatch(/^Earn a little more reputation to unlock breeding know-how\. Any tank can already be a nursery: set its purpose in Tanks/);
      expect(up.body, id).not.toMatch(/nursery tanks/);
    }
  });
});

describe('A11: the water step waits for the reading, not the card opening', () => {
  it('opening the tank card alone no longer ends it; reading the water does', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    walkTo(g, 'water');
    tutorialAdvance(g, 'opened_tank_card');
    expect(tutorialStepId(g)).toBe('water');
    tutorialAdvance(g, 'read_water');
    expect(tutorialStepId(g)).toBe('habitat');
  });
});

describe('P1: on a phone the animal’s card folds the guide into its pill, as the tank card does', () => {
  it('the fold rule', () => {
    expect(guideFold('creature', true)).toBe('creature');
    expect(guideFold('creature', false)).toBeNull(); // desktop: the card is on the right, clear of the guide
    expect(guideFold('tank', true)).toBe('tank');
    expect(guideFold('tank', false)).toBe('tank');
    expect(guideFold(null, true)).toBeNull();
  });
});

describe('A16: Party says where it is', () => {
  it('a where-only line for an unlock with no panel', () => {
    expect(unlockWhere('party_mode')).toBe('Tap Party in the tank tools: the lights dance to music.');
    expect(unlockWhere('constructor')).toBeUndefined();
  });
});

describe('A8: the phone tour’s money stop has no star to point at', () => {
  it('phones say where reputation is; computers keep the star', () => {
    const phone = tourStops({ mobile: true, social: false, unlocked: () => true }).find((s) => s.id === 'money')!;
    expect(phone.body).not.toMatch(/star/);
    expect(phone.body).toMatch(/top of Research, under More/);
    const desk = tourStops({ mobile: false, social: false, unlocked: () => true }).find((s) => s.id === 'money')!;
    expect(desk.body).toMatch(/\(the star\)/);
  });
});

describe('A4: a new game always starts with its guide showing', () => {
  it('turns the device’s "Guide hints" back on (and leaves it on)', () => {
    const was = useSettings.getState().showTutorialHints;
    try {
      useSettings.getState().update({ showTutorialHints: false });
      guideOnForNewGame();
      expect(useSettings.getState().showTutorialHints).toBe(true);
      guideOnForNewGame();
      expect(useSettings.getState().showTutorialHints).toBe(true);
    } finally {
      useSettings.getState().update({ showTutorialHints: was });
    }
  });
});

describe('A9: a panel already open when its step begins counts', () => {
  it('"Open the Market" with the Market already open ends "The market" (it did nothing, and the step waited)', async () => {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { soloDispatch } = await import('@/game/dispatch');
    const { showMe } = await import('@/ui/tutorial/TutorialCoach');
    useGame.getState().installDispatch(soloDispatch);
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    walkTo(g, 'market');
    useGame.getState().setGame(g);
    useUI.getState().set({ panel: 'market', panelTarget: null });
    showMe('dock-market', useGame.getState().game!);
    expect(useUI.getState().panel).toBe('market'); // still open
    expect(tutorialStepId(useGame.getState().game!)).toBe('first_goal');
  });
});
