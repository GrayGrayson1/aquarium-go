/**
 * Research never charges for unlocks the player already owns, and compound quest goals say what's missing.
 * (QA: 7 of 19 projects in a 45-day clownfish game granted only keys already earned through play, yet cost money;
 * the Showpiece quest read "0/70" beside a tank scoring 95 because it needs 3 layout edits first.)
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { RESEARCH, RESEARCH_BY_ID } from '@/data/research';
import { SCAPED_EDITS } from '@/data/unlocks';
import { QUEST_BY_ID } from '@/data/quests';
import * as F from '@/sim/facility';
import { researchCost, researchNewGrants } from '@/sim/facility/progression';
import { runPlaythrough } from '@/dev/fixtures/playthrough';

function progress(g: GameState, hours = 0.1): void {
  F.stepProgression(g, hours, makeContext(g, hours));
  g.clock.hour += hours;
}

const view = (g: GameState, id: string) => F.researchList(g).find((r) => r.def.id === id)!;

describe('research: never charge for unlocks already owned', () => {
  it('a project whose grants are all owned is shown as learned, costs nothing and cannot be bought', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 3 });
    F.tutorialSkip(g);
    g.finance.money = 1000;
    for (const k of RESEARCH_BY_ID.public_education.grants) F.unlock(g, k, { silent: true });
    const v = view(g, 'public_education');
    expect(v.alreadyOwned).toBe(true);
    expect(v.status).toBe('done');
    expect(v.cost).toBe(0);
    expect(v.grantsNew).toEqual([]);
    const r = F.startResearch(g, 'public_education');
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/no charge/i);
    expect(g.finance.money).toBe(1000);
    expect(g.progress.research.activeId).toBeUndefined();
    expect(g.progress.research.completed).toContain('public_education');
    expect(view(g, 'public_education').alreadyOwned).toBe(true);
    // No "research done" credit for study that never happened.
    expect(g.progress.counters.research_done ?? 0).toBe(0);
  });

  it('the starter setup already covers some projects (axolotl: Cool-water Systems)', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 5 });
    const v = view(g, 'coldwater_systems');
    expect(v.alreadyOwned).toBe(true);
    expect(v.status).toBe('done');
    expect(v.cost).toBe(0);
  });

  it('partly owned projects list only what is new and are pro-rated', () => {
    const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed: 9 });
    F.tutorialSkip(g);
    g.finance.money = 1000;
    const def = RESEARCH_BY_ID.marine_systems;
    const v = view(g, 'marine_systems');
    // Marine starters begin with marine_basics + skimmers: only the auto top-off is new.
    expect(v.alreadyOwned).toBe(false);
    expect(v.grantsNew).toEqual(['gear_ato']);
    expect(v.cost).toBeLessThan(def.cost);
    // Headline grant weighs 3, extras 1: ATO is 1/5 of $600 = $120, floored at a quarter of the list price.
    expect(v.cost).toBe(150);
    expect(F.startResearch(g, 'marine_systems').ok).toBe(true);
    expect(g.finance.money).toBe(850);
    expect(view(g, 'marine_systems').cost).toBe(150);
    // Cancelling refunds half of what was actually paid.
    expect(F.cancelResearch(g).ok).toBe(true);
    expect(g.finance.money).toBe(925);
  });

  it('a project that becomes fully owned mid-study is closed and refunded', () => {
    const g = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed: 4 });
    F.tutorialSkip(g);
    g.finance.money = 1000;
    expect(F.startResearch(g, 'breeding_program').ok).toBe(true);
    expect(g.finance.money).toBe(700);
    progress(g, 4);
    F.unlock(g, 'nursery', { silent: true }); // e.g. the first clutch raised
    progress(g, 0.1);
    expect(g.progress.research.activeId).toBeUndefined();
    expect(g.progress.research.completed).toContain('breeding_program');
    expect(g.finance.money).toBe(1000);
    expect(g.log.some((e) => /Breeding Programme covers/.test(e.text) && /\$300 refunded/.test(e.text))).toBe(true);
    const v = view(g, 'breeding_program');
    expect(v.alreadyOwned).toBe(true);
    expect(v.status).toBe('done');
  });

  it('projects with something new still cost the list price when nothing is owned', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 3 });
    for (const def of RESEARCH) {
      const fresh = researchNewGrants(g, def);
      if (fresh.length === def.grants.length) expect(researchCost(g, def)).toBe(def.cost);
      else if (fresh.length === 0) expect(researchCost(g, def)).toBe(0);
      else expect(researchCost(g, def)).toBeLessThan(def.cost);
    }
  });

  it('in a 45-day clownfish game no project is paid for without teaching something new', () => {
    const r = runPlaythrough({ starterId: 'ocellaris_clownfish', seed: 1234, days: 45 });
    const list = F.researchList(r.state);
    const owned = list.filter((v) => v.alreadyOwned);
    expect(owned.length).toBeGreaterThan(0);
    for (const v of list) {
      if (v.status === 'available' || v.status === 'locked') expect(v.grantsNew.length, v.def.id).toBeGreaterThan(0);
      if (v.alreadyOwned) expect(v.cost, v.def.id).toBe(0);
    }
    // Any project the bot paid for either taught something (completed by study) or was refunded when play got there first.
    const started = r.actions.filter((a) => /^Research started: /.test(a.text)).map((a) => a.text.replace(/^Research started: /, '').replace(/ \(reduced.*$/, ''));
    for (const name of started) {
      const def = RESEARCH.find((d) => d.name === name)!;
      expect(def, name).toBeDefined();
      const refunded = r.events.some((e) => e.text.startsWith(`You picked up everything ${name} covers`));
      const studied = r.state.progress.research.completed.includes(def.id) && !r.state.progress.counters[`_research_owned:${def.id}`];
      const running = r.state.progress.research.activeId === def.id;
      expect(refunded || studied || running, name).toBe(true);
    }
  });
});

describe('quests: compound goals say what is missing', () => {
  it('Showpiece on a 95-beauty tank without edits reads edits 0/3, not 0/70', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    F.tutorialSkip(g);
    const tank = g.tanks[g.tankOrder[0]];
    tank.cache.beauty = 95;
    g.progress.quests.push({ id: 'q_beauty_70', status: 'active', progress: 0, startedHour: g.clock.hour });
    const q = F.activeQuests(g).find((x) => x.id === 'q_beauty_70')!;
    expect(q.target).toBe(SCAPED_EDITS);
    expect(q.current).toBe(0);
    expect(q.detail).toBe(`${tank.name}: edit the layout (0/${SCAPED_EDITS}) · beauty 95/70`);
    expect(q.steps).toEqual([
      { label: `Layout edits in ${tank.name}`, current: 0, target: SCAPED_EDITS, met: false },
      { label: 'Beauty', current: 95, target: 70, met: true },
    ]);
    expect(q.tankId).toBe(tank.id);

    g.progress.counters[F.scapeEditsKey(tank.id)] = 1;
    expect(F.activeQuests(g).find((x) => x.id === 'q_beauty_70')!.detail).toMatch(/\(1\/3\) · beauty 95\/70$/);

    // Edits done but the scape got worse: now beauty is the missing part.
    g.progress.counters[F.scapeEditsKey(tank.id)] = 3;
    tank.cache.beauty = 64;
    const q2 = F.activeQuests(g).find((x) => x.id === 'q_beauty_70')!;
    expect(q2.current).toBe(64);
    expect(q2.target).toBe(70);
    expect(q2.detail).toBe(`${tank.name}: layout edited (3/3) · beauty 64/70`);

    tank.cache.beauty = 90;
    const st = F.evalCond(g, QUEST_BY_ID.q_beauty_70.objective.type === 'cond' ? QUEST_BY_ID.q_beauty_70.objective.cond : ({ type: 'beauty', min: 70, scaped: 3 } as const));
    expect(st.met).toBe(true);
    expect(st.label).toMatch(/3 layout edits/);
  });
});
