/**
 * Progression polish: no unearned celebrations at game start, aquascaping achievements need real aquascaping,
 * quiet logs, and text grammar. OWNER: polish-gameplay.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { placeDecor, moveDecor, checkPlacement, placementLimits } from '@/sim/aquascape';
import { stepProgression, evalCond, scapeEditsKey, unlock, tutorialAdvance, tutorialStepId, tutorialWants, currentTutorialStep } from '@/sim/facility';
import { makeContext } from '@/sim/context';
import { stepMarket } from '@/sim/economy';
import { pluralName, pluralPhrase, theTank } from '@/sim/economy/util';
import { plural as compatPlural } from '@/sim/compat/text';
import { spPlural } from '@/sim/life/breeding/common';
import { fillTemplate, REACTION_LINES } from '@/sim/facility/reactions';
import { ACHIEVEMENTS } from '@/data/achievements';
import { QUESTS, habitatPicks, tutorialChain, TUTORIAL_UPGRADE_REP, TUTORIAL_UPGRADE_GAIN } from '@/data/quests';
import { feedTank } from '@/sim/care';
import { getDecorDef, isLiving } from '@/data/catalog/decor';
import { mulberry32 } from '@/sim/rng';
import { findSpecies, listSpecies, STARTER_IDS } from '@/data/species';

const achievementToasts = (g: GameState) => g.log.filter((e) => /^Achievement:/.test(e.text));

describe('game start: nothing is celebrated that the player did not do', () => {
  for (const id of STARTER_IDS) {
    it(`${id}: only the welcome toast in the first game hour; starting facts are recorded quietly`, () => {
      const g = newGame({ starterId: id, starterName: 'Pip', seed: 7 });
      const tank = g.tankOrder[0];
      advanceWorld(g, 1, { focusTankId: tank });
      const toasts = g.log.filter((e) => e.toast);
      expect(toasts.map((e) => e.text)).toHaveLength(1);
      expect(toasts[0].text).toMatch(/^Welcome home/);
      expect(achievementToasts(g)).toHaveLength(0);
      expect(g.log.some((e) => /^Unlocked:/.test(e.text))).toBe(false);
      expect(g.log.some((e) => /^New arrivals/.test(e.text))).toBe(false);
      const marine = findSpecies(id)?.environment === 'marine';
      // "Into the Blue" is simply true for a marine starter: recorded, not toasted, no reputation for it.
      expect(g.progress.achievements.includes('saltwater')).toBe(marine);
      expect(g.progress.achievements).not.toContain('aquascaper');
      expect(g.progress.achievements).not.toContain('living_art');
      expect(g.progress.reputation).toBeLessThan(1);
    });
  }

  it('audit: every achievement and board quest is either unmet at start or recorded silently', () => {
    for (const id of STARTER_IDS) {
      const g = newGame({ starterId: id, starterName: 'Pip', seed: 3 });
      for (const a of ACHIEVEMENTS) {
        const met = evalCond(g, a.cond).met;
        if (met) expect(g.progress.achievements, `${id}: ${a.id} is met at start`).toContain(a.id);
      }
      // Board quests whose objective is already met at start are never drawn (refillBoard skips them), so none
      // can "complete" in the first second. Beauty quests now need real aquascaping, so they stay drawable.
      for (const q of QUESTS.filter((x) => x.objective.type === 'cond' && x.objective.cond.type === 'beauty')) {
        expect(q.objective.type === 'cond' && evalCond(g, q.objective.cond).met, `${id}: ${q.id}`).toBe(false);
      }
    }
  });

  it('plants growing on their own never award Living Art', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    advanceWorld(g, 24 * 3, { focusTankId: g.tankOrder[0] });
    expect(g.progress.achievements).not.toContain('living_art');
    expect(g.progress.achievements).not.toContain('aquascaper');
  });
});

describe('aquascaping achievements need the player’s own aquascaping', () => {
  it('Aquascaper arrives (with its toast) once the player has placed / moved three pieces in a tank scoring 80+', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    g.finance.money = 1000;
    const tank = g.tankOrder[0];
    const ctx = () => makeContext(g, 0.1);
    const spot = (defId: string, excludeId?: string) => {
      // A move to the piece's current spot is not a layout edit (S05-01), so a move must go somewhere new.
      const cur = excludeId ? g.tanks[tank].decor.find((d) => d.id === excludeId) : undefined;
      for (const x of [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]) for (const z of [-0.08, 0, 0.08]) {
        if (cur && Math.hypot(cur.x - x, cur.z - z) < 0.03) continue;
        if (checkPlacement(g, g.tanks[tank], defId, { x, z }, { excludeId, purchase: excludeId ? 'none' : 'buy' }).ok) return { x, z };
      }
      throw new Error(`no spot for ${defId}`);
    };
    const a = placeDecor(g, tank, 'java_moss', spot('java_moss'));
    expect(a.ok, a.message).toBe(true);
    stepProgression(g, 0.1, ctx());
    expect(g.progress.achievements).not.toContain('aquascaper');
    expect(moveDecor(g, tank, a.decorId!, spot('java_moss', a.decorId)).ok).toBe(true);
    stepProgression(g, 0.1, ctx());
    expect(g.progress.achievements).not.toContain('aquascaper');
    expect(g.progress.counters[scapeEditsKey(tank)]).toBe(2);
    const b = placeDecor(g, tank, 'anubias_nana', spot('anubias_nana'));
    expect(b.ok, b.message).toBe(true);
    stepProgression(g, 0.1, ctx());
    expect(g.progress.achievements).toContain('aquascaper');
    expect(achievementToasts(g).some((e) => /Aquascaper/.test(e.text) && e.toast)).toBe(true);
  });

  it('edits in one tank do not make a different, untouched tank count', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const beauty = { type: 'beauty' as const, min: 80, scaped: 3 };
    expect(evalCond(g, beauty).met).toBe(false);
    g.progress.counters[scapeEditsKey('tank_elsewhere')] = 10;
    expect(evalCond(g, beauty).met).toBe(false);
    g.progress.counters[scapeEditsKey(g.tankOrder[0])] = 3;
    expect(evalCond(g, beauty).met).toBe(true);
  });
});

describe('quiet, readable logs', () => {
  it('"New arrivals" is only announced for species the new unlock actually made available', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const step = () => stepMarket(g, 0.2, makeContext(g, 0.2));
    step();
    const before = g.log.length;
    unlock(g, 'party_mode');
    unlock(g, 'tank_40');
    step();
    expect(g.log.slice(before).some((e) => /^New arrivals/.test(e.text))).toBe(false);
    unlock(g, 'marine_basics');
    step();
    const news = g.log.slice(before).find((e) => /^New arrivals/.test(e.text));
    expect(news).toBeDefined();
    // Every announced species is a marine one (the key that was just unlocked).
    const names = news!.text.replace(/^New arrivals at the shop:\s*/, '').replace(/\.$/, '').split(', ');
    const marine = listSpecies((s) => s.environment === 'marine').map((s) => pluralName(s.commonName));
    for (const n of names) expect(marine).toContain(n);
  });

  it('friend visits toast the first few times, then about once a game day (all still logged)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    // A well-kept tank: fed twice a day (friends don't tip — or come round to praise — a starving betta).
    g.inventory.foods.micro_pellets = 400;
    for (let i = 0; i < 12; i++) {
      feedTank(g, g.tankOrder[0], 'micro_pellets');
      advanceWorld(g, 12, { focusTankId: g.tankOrder[0] });
    }
    const visits = g.log.filter((e) => e.kind === 'visitor' && /dropped by/.test(e.text));
    expect(visits.length).toBeGreaterThan(8);
    const toasted = visits.filter((e) => e.toast).length;
    expect(toasted).toBeLessThanOrEqual(3 + 6 + 1);
    expect(toasted).toBeLessThan(visits.length);
  });
});

describe('grammar', () => {
  it('species plurals never double an s (otocinclus, chromis, discus) and handle -y / -ch / invariant nouns', () => {
    const cases: [string, string][] = [
      ['Otocinclus', 'otocinclus'],
      ['Green Chromis', 'green chromis'],
      ['Discus', 'discus'],
      ['Panda Corydoras', 'panda corydoras'],
      ['Kuhli Loach', 'kuhli loaches'],
      ['Clown Goby', 'clown gobies'],
      ['Coral Beauty', 'coral beauties'],
      ['Cherry Shrimp', 'cherry shrimp'],
      ['Banggai Cardinalfish', 'banggai cardinalfish'],
      ['Neon Tetra', 'neon tetras'],
      ['Axolotl', 'axolotls'],
    ];
    for (const [name, want] of cases) {
      expect(pluralName(name)).toBe(want);
      expect(compatPlural(name)).toBe(want);
    }
    expect(pluralPhrase('Banggai cardinalfish')).toBe('Banggai cardinalfish');
    for (const sp of listSpecies()) {
      for (const p of [pluralName(sp.commonName), compatPlural(sp), spPlural(sp)]) expect(p, sp.id).not.toMatch(/(ss|us|is)s$|yes$|ys$/);
    }
  });

  it('possessive tank names never get "the" in front (the Ember’s Tank)', () => {
    expect(theTank('Ember’s Tank')).toBe('Ember’s Tank');
    expect(theTank("Mochi's tank", true)).toBe("Mochi's tank");
    expect(theTank('20 Gallon Long')).toBe('the 20 Gallon Long');
    expect(theTank('Reef', true)).toBe('The Reef');
    for (const lines of Object.values(REACTION_LINES)) {
      for (const line of lines) {
        const text = fillTemplate(line, { tank: 'Ember’s Tank', gallons: 10, name: 'Ember', species: 'Betta', who: 'Maya' });
        expect(text, line).not.toMatch(/\b[Tt]he Ember’s Tank|This Ember’s Tank|-gallon Ember’s Tank/);
      }
    }
  });
});

describe('tutorial: steps need an action taken during the step', () => {
  const tick = (g: GameState, h = 0.1) => {
    stepProgression(g, h, makeContext(g, h));
    g.clock.hour += h;
  };
  /** Walk the tutorial to a given step id by satisfying each earlier step the normal way. */
  function walkTo(g: GameState, id: string) {
    for (let guard = 0; guard < 30 && tutorialStepId(g) !== id; guard++) {
      const step = tutorialChain(g.starterId).find((x) => x.id === tutorialStepId(g))!;
      if (step.id === 'habitat') expect(placeDecor(g, g.tankOrder[0], habitatPicks(g.starterId)[0], freePoints(g, habitatPicks(g.starterId)[0], 1, 5)[0]).ok).toBe(true);
      else if (step.id === 'feed') tutorialAdvance(g, 'fed');
      else if (step.id === 'first_money' || step.id === 'first_goal') g.progress.counters.friend_visits = (g.progress.counters.friend_visits ?? 0) + 3;
      else if (step.id === 'upgrade') g.progress.reputation = Math.max(g.progress.reputation, TUTORIAL_UPGRADE_REP) + TUTORIAL_UPGRADE_GAIN;
      else if (step.objective.type === 'flag') tutorialAdvance(g, step.objective.anyOf[0]);
      tick(g);
    }
    expect(tutorialStepId(g)).toBe(id);
  }

  it('meet waits for the creature card, then says hello', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    tick(g);
    expect(tutorialStepId(g)).toBe('meet');
    expect(tutorialWants(g, 'opened_creature_card')).toBe(true);
    tutorialAdvance(g, 'opened_creature_card');
    expect(tutorialStepId(g)).toBe('camera');
    expect(g.log.some((e) => e.toast && e.text === 'Nice to meet you, Ember!')).toBe(true);
  });

  it('a signature behaviour seen BEFORE the observe step does not complete it; seeing it again does', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    g.finance.money = 500;
    tutorialAdvance(g, 'observed:fin_flare'); // the AI saw a flare during "meet"
    walkTo(g, 'observe');
    tick(g, 1);
    expect(tutorialStepId(g)).toBe('observe');
    expect(tutorialWants(g, 'observed:fin_flare')).toBe(true);
    tutorialAdvance(g, 'observed:fin_flare');
    expect(tutorialStepId(g)).not.toBe('observe');
  });

  it('opening Build during the habitat step does not skip "The road ahead"', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 4 });
    g.finance.money = 500;
    walkTo(g, 'habitat');
    tutorialAdvance(g, 'opened_build');
    walkTo(g, 'preview');
    tick(g, 1);
    expect(tutorialStepId(g)).toBe('preview');
    tutorialAdvance(g, 'opened_research');
    expect(g.progress.tutorial.done).toBe(true);
  });

  it('the upgrade goal is about one friend visit after "Word gets around", which now leads with friend visits', () => {
    for (const id of STARTER_IDS) {
      const chain = tutorialChain(id);
      const goal = chain.find((x) => x.id === 'first_goal')!;
      expect(goal.body).toMatch(/^Keep .* two more friends/);
      expect(goal.objective.type === 'any' && goal.objective.of[0].type === 'counter' && goal.objective.of[0].key).toBe('friend_visits');
      expect(goal.objective.type === 'any' && goal.objective.of.every((o) => o.type === 'counter' && o.relative)).toBe(true);
      const up = chain.find((x) => x.id === 'upgrade')!;
      expect(up.objective).toEqual({ type: 'reputation', min: TUTORIAL_UPGRADE_REP, gain: TUTORIAL_UPGRADE_GAIN, label: 'reputation' });
      // lane:qa-play — the body no longer quotes the bar (most players are past 12 by then); the coach's progress line
      // shows the live target instead, so the copy can't drift from TUTORIAL_UPGRADE_REP.
      expect(up.body).toMatch(/^Earn a little more reputation to unlock /);
      expect(up.body).not.toMatch(/\d+ or more/);
      expect(chain.find((x) => x.id === 'meet')!.done).toBeTruthy();
    }
    expect(TUTORIAL_UPGRADE_REP).toBeLessThanOrEqual(12);
  });

  it('a slower player still reads First money, Word gets around and the upgrade step (progress must happen during each)', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 4 });
    g.finance.money = 500;
    walkTo(g, 'observe');
    // Lingering on "observe": friends visit and reputation piles up — none of it may complete later steps.
    g.progress.counters.friend_visits = (g.progress.counters.friend_visits ?? 0) + 6;
    g.progress.reputation = 30;
    tick(g, 1);
    expect(g.progress.unlocked).not.toContain('tank_40'); // held back for its own step (rule: 25 reputation)
    tutorialAdvance(g, 'observed:gill_flick');
    tick(g);
    expect(tutorialStepId(g)).toBe('first_money');
    expect(currentTutorialStep(g)!.progress).toMatchObject({ current: 0, target: 1 });
    g.progress.counters.friend_visits += 1; // a friend drops by during the step
    tick(g);
    expect(tutorialStepId(g)).toBe('market');
    tutorialAdvance(g, 'opened_market');
    tick(g);
    expect(tutorialStepId(g)).toBe('first_goal');
    tick(g, 2);
    expect(tutorialStepId(g)).toBe('first_goal');
    g.progress.counters.friend_visits += 2;
    tick(g);
    expect(tutorialStepId(g)).toBe('upgrade');
    // Already past 12 reputation: the step needs a little earned during it, and says so.
    tick(g, 2);
    expect(tutorialStepId(g)).toBe('upgrade');
    expect(currentTutorialStep(g)!.progress).toMatchObject({ current: 0, target: TUTORIAL_UPGRADE_GAIN, label: 'reputation earned on this step' });
    expect(g.progress.unlocked).not.toContain('tank_40');
    g.progress.reputation += TUTORIAL_UPGRADE_GAIN;
    tick(g);
    expect(tutorialStepId(g)).toBe('preview');
    expect(g.progress.unlocked).toContain('tank_40');
    // Every completed step said its line, in order.
    const said = g.log.filter((e) => e.toast && e.kind === 'tip').map((e) => e.text);
    for (const line of ['Your first money from the hobby!', 'You can now list animals for sale.', 'Word is getting around.', 'New upgrade unlocked!']) expect(said).toContain(line);
    expect(said.indexOf('Word is getting around.')).toBeLessThan(said.indexOf('New upgrade unlocked!'));
  });

  it('water steps quote the same ideal band the tank card shows (betta 24.5–28.0 °C)', () => {
    for (const id of STARTER_IDS) {
      const g = newGame({ starterId: id, starterName: 'Pip', seed: 4 });
      const sp = findSpecies(id)!;
      const water = tutorialChain(id).find((x) => x.id === 'water')!;
      g.progress.tutorial.step = tutorialChain(id).indexOf(water);
      const body = currentTutorialStep(g)!.body;
      expect(body).not.toMatch(/\{temp\}|\{salinity\}/);
      if (/temperature/.test(water.body)) expect(body).toContain(`${sp.tempC.idealMin.toFixed(1)}–${sp.tempC.idealMax.toFixed(1)} °C`);
      if (/salinity/.test(water.body) && /\{salinity\}/.test(water.body)) expect(body).toContain(`${sp.salinitySG!.idealMin.toFixed(3)}–${sp.salinitySG!.idealMax.toFixed(3)}`);
    }
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    g.progress.tutorial.step = 3;
    expect(currentTutorialStep(g)!.body).toContain('24.5–28.0 °C');
  });

  it('a tutorial reward already earned by research is acknowledged, not re-announced', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    g.finance.money = 500;
    walkTo(g, 'upgrade');
    unlock(g, 'nursery'); // e.g. from the Breeding Programme research
    g.progress.reputation = Math.max(g.progress.reputation, TUTORIAL_UPGRADE_REP) + TUTORIAL_UPGRADE_GAIN;
    tick(g);
    expect(tutorialStepId(g)).toBe('preview');
    expect(g.log.some((e) => e.toast && /already have nursery/i.test(e.text))).toBe(true);
    expect(g.log.some((e) => e.toast && e.text === 'New upgrade unlocked!')).toBe(false);
  });

  it('the seahorse feed step points at Target feed', () => {
    const g = newGame({ starterId: 'lined_seahorse', starterName: 'Atlas', seed: 4 });
    walkTo(g, 'feed');
    const view = currentTutorialStep(g)!;
    expect(view.hintTarget).toBe('tool-target-feed');
    expect(view.body).toMatch(/Target feed/);
    expect(tutorialChain('betta').find((x) => x.id === 'feed')!.hintTarget).toBe('tool-feed');
  });
});

/**
 * Random points on open sand for a decor item: plants/corals — the point itself isn't covered by another piece;
 * hardscape — its footprint clears every other piece of hardscape (touching is fine).
 */
function freePoints(g: GameState, defId: string, n: number, seed: number): { x: number; z: number }[] {
  const t = g.tanks[g.tankOrder[0]];
  const def = getDecorDef(defId)!;
  const lim = placementLimits(t, def, 1, 0);
  const rng = mulberry32(seed);
  const out: { x: number; z: number }[] = [];
  const r = (def.size.w + def.size.d) / 4;
  for (let i = 0; i < 4000 && out.length < n; i++) {
    const x = (rng.next() * 2 - 1) * lim.maxX;
    const z = (rng.next() * 2 - 1) * lim.maxZ;
    const blocked = t.decor.some((o) => {
      const od = getDecorDef(o.defId)!;
      if (od.visual === 'plant_floating' && def.visual !== 'plant_floating') return false;
      const orx = (od.size.w * o.scale) / 2;
      const orz = (od.size.d * o.scale) / 2;
      if (isLiving(def)) return ((x - o.x) / orx) ** 2 + ((z - o.z) / orz) ** 2 < 1;
      if (isLiving(od)) return false;
      // hardscape: footprints may touch but not merge (rotated extents, like the game's own footprint)
      const c = Math.abs(Math.cos(o.rotY));
      const sn = Math.abs(Math.sin(o.rotY));
      const oReach = ((od.size.w * c + od.size.d * sn + od.size.w * sn + od.size.d * c) * o.scale) / 4;
      return Math.hypot(x - o.x, z - o.z) < (r + oReach) * 0.6;
    });
    if (!blocked) out.push({ x, z });
  }
  return out;
}

describe('decor placement in the planted starter tanks (tutorial habitat step)', () => {
  for (const id of STARTER_IDS) {
    it(`${id}: every suggested piece fits at random open spots, and there is open sand to find`, () => {
      for (const seed of [1, 2, 3, 99]) {
        const g = newGame({ starterId: id, starterName: 'Pip', seed });
        g.finance.money = 1000;
        const t = g.tanks[g.tankOrder[0]];
        const picks = habitatPicks(id);
        expect(picks.length).toBeGreaterThanOrEqual(2);
        for (const defId of picks) {
          const def = getDecorDef(defId)!;
          expect(def, defId).toBeDefined();
          expect(def.environments).toContain(t.environment);
          const pts = freePoints(g, defId, 6, seed * 31 + defId.length);
          expect(pts.length, `${id}/${seed}: open sand for ${defId}`).toBeGreaterThanOrEqual(6);
          for (const p of pts) {
            const c = checkPlacement(g, t, defId, { ...p, rotY: 0, scale: 1 }, { purchase: 'buy' });
            expect(c.ok, `${id}/${seed} ${defId} at (${p.x.toFixed(3)}, ${p.z.toFixed(3)}): ${c.message}`).toBe(true);
          }
        }
      }
    });
  }

  it('plants may overlap plants (moss beside a stem plant); hardscape still cannot sink into hardscape', () => {
    const g = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed: 1 });
    g.finance.money = 1000;
    const t = g.tanks[g.tankOrder[0]];
    const rotala = t.decor.find((d) => d.defId === 'rotala')!;
    const lim = placementLimits(t, getDecorDef('java_moss')!, 1, 0);
    const clampX = (v: number) => Math.max(-lim.maxX, Math.min(lim.maxX, v));
    const clampZ = (v: number) => Math.max(-lim.maxZ, Math.min(lim.maxZ, v));
    const near = checkPlacement(g, t, 'java_moss', { x: clampX(rotala.x + 0.02), z: clampZ(rotala.z + 0.02), rotY: 0 }, { purchase: 'buy' });
    expect(near.ok, near.message).toBe(true);
    const wood = t.decor.find((d) => d.defId === 'spider_wood')!;
    const onWood = checkPlacement(g, t, 'cholla_wood', { x: wood.x + 0.01, z: wood.z, rotY: 0 }, { purchase: 'buy' });
    expect(onWood.ok).toBe(false);
    expect(onWood.code).toBe('overlap');
    // an epiphyte on the root is trimmed to fit under the surface rather than refused
    const fern = checkPlacement(g, t, 'java_fern', { x: wood.x, z: wood.z, rotY: 0, scale: 1.4 }, { purchase: 'buy' });
    expect(fern.ok, fern.message).toBe(true);
    expect(fern.scale).toBeLessThanOrEqual(1.4);
  });
});
