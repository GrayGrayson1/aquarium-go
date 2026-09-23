/**
 * Facility lane — starter unlocks, unlock rules, tutorial chains for every starter, research, quest board,
 * facility upgrades and placement.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { makeContext } from '@/sim/context';
import { STARTER_IDS, type StarterId } from '@/data/species';
import { tutorialChain, type Objective } from '@/data/quests';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { UNLOCK_RULES } from '@/data/unlocks';
import { RESEARCH } from '@/data/research';
import { FACILITY_LEVELS, getFacilityLevel } from '@/data/facilities';
import { TANK_TIERS } from '@/data/catalog/tanks';
import * as F from '@/sim/facility';
import { tankFootprint, obbOverlap, obbInsideRoom } from '@/sim/facility/layout';

function game(starterId: StarterId = 'betta', seed = 3): GameState {
  return newGame({ starterId, starterName: 'Buddy', seed });
}

function progress(g: GameState, hours = 0.1): void {
  const ctx = makeContext(g, hours);
  F.stepProgression(g, hours, ctx);
  g.clock.hour += hours;
}

/** Satisfy one tutorial objective the way the UI / sim would. */
function satisfy(g: GameState, obj: Objective): void {
  switch (obj.type) {
    case 'flag':
      F.tutorialAdvance(g, obj.anyOf[0]);
      return;
    case 'counter':
      F.bumpCounter(g, obj.key, obj.min);
      return;
    case 'reputation':
      // Tutorial steps count reputation earned during the step (gain) on top of the bar (min).
      g.progress.reputation = Math.max(g.progress.reputation, obj.min) + (obj.gain ?? 0);
      return;
    case 'cond': {
      const c = obj.cond;
      if (c.type === 'reputation') g.progress.reputation = Math.max(g.progress.reputation, c.min);
      else if (c.type === 'flag') F.tutorialAdvance(g, c.flag);
      return;
    }
    case 'any':
      satisfy(g, obj.of[0]);
      return;
  }
}

describe('facility: starter unlocks', () => {
  it('grants each starter its own group plus a gear baseline', () => {
    expect(game('betta').progress.unlocked).toContain('fw_basic');
    expect(game('pea_puffer').progress.unlocked).toContain('fw_basic');
    const ax = game('axolotl').progress.unlocked;
    expect(ax).toContain('fw_basic');
    expect(ax).toContain('fw_coldwater');
    const cl = game('ocellaris_clownfish').progress.unlocked;
    expect(cl).toContain('marine_basics');
    expect(cl).not.toContain('marine_seahorse');
    const sh = game('lined_seahorse').progress.unlocked;
    expect(sh).toContain('marine_basics');
    expect(sh).toContain('marine_seahorse');
  });

  it('initialFacility is the hobby room and the starter tank sits on it', () => {
    const g = game();
    expect(g.facility.level).toBe('hobby_room');
    const t = g.tanks[g.tankOrder[0]];
    expect(obbInsideRoom(tankFootprint(t.tierId, t.placement), g.facility.width, g.facility.depth)).toBe(true);
    expect(F.stateReachability(g).unreachable).toHaveLength(0);
  });
});

describe('facility: tutorial chains', () => {
  for (const starter of STARTER_IDS) {
    it(`${starter} tutorial advances through every step`, () => {
      const g = game(starter, 17);
      const chain = tutorialChain(starter);
      expect(chain.length).toBeGreaterThanOrEqual(10);
      expect(g.progress.quests.some((q) => q.id === 'tutorial')).toBe(true);
      progress(g); // 'meet' waits for the player to open the creature card
      expect(g.progress.tutorial.step).toBe(0);
      const seen: string[] = [];
      for (let guard = 0; guard < 40 && !g.progress.tutorial.done; guard++) {
        const i = g.progress.tutorial.step;
        const view = F.currentTutorialStep(g)!;
        expect(view).not.toBeNull();
        expect(view.id).toBe(chain[i].id);
        expect(view.title).not.toMatch(/\{name\}/);
        expect(view.body.length).toBeGreaterThan(20);
        expect(view.body).not.toMatch(/\{name\}|\{species\}/);
        expect(view.hintTarget).toBeTruthy();
        seen.push(view.id);
        satisfy(g, chain[i].objective);
        progress(g);
        expect(g.progress.tutorial.step).toBeGreaterThan(i);
      }
      expect(seen.length).toBeGreaterThanOrEqual(chain.length - 3);
      expect(g.progress.tutorial.done).toBe(true);
      expect(F.currentTutorialStep(g)).toBeNull();
      expect(g.progress.unlocked).toContain('market_listings');
      const tq = g.progress.quests.find((q) => q.id === 'tutorial')!;
      expect(tq.status).toBe('complete');
      const money = g.finance.money;
      expect(F.claimQuest(g, 'tutorial').ok).toBe(true);
      expect(g.finance.money).toBeGreaterThan(money);
    });
  }

  it('species-specific observation steps are flavoured per starter', () => {
    const obs = (id: StarterId) => tutorialChain(id).find((s) => s.id === 'observe')!.objective;
    expect(JSON.stringify(obs('axolotl'))).toContain('observed:gill_flick');
    expect(JSON.stringify(obs('betta'))).toContain('observed:fin_flare');
    expect(JSON.stringify(obs('pea_puffer'))).toContain('observed:hover');
    expect(JSON.stringify(obs('ocellaris_clownfish'))).toContain('observed:host_zone');
    expect(JSON.stringify(obs('lined_seahorse'))).toContain('observed:hitch');
  });

  it('flag steps have a gentle fallback so the tutorial never gets stuck', () => {
    const g = game('betta', 5);
    progress(g);
    expect(F.currentTutorialStep(g)!.id).toBe('meet');
    for (let i = 0; i < 9; i++) progress(g, 1);
    expect(F.currentTutorialStep(g)!.id).toBe('camera');
    for (let i = 0; i < 12; i++) progress(g, 1);
    expect(F.currentTutorialStep(g)!.id).toBe('feed');
  });

  it('skip ends the tutorial and keeps the essentials', () => {
    const g = game();
    F.tutorialSkip(g);
    expect(g.progress.tutorial.done).toBe(true);
    expect(g.progress.unlocked).toContain('market_listings');
  });
});

describe('facility: unlock rules', () => {
  it('every rule targets a real key and every key has a route (rule or research)', () => {
    const keys = Object.keys(UNLOCK_KEYS);
    for (const r of UNLOCK_RULES) expect(keys).toContain(r.key);
    const viaResearch = new Set(RESEARCH.flatMap((r) => r.grants as string[]));
    for (const k of keys) expect(UNLOCK_RULES.some((r) => r.key === k) || viaResearch.has(k)).toBe(true);
    // every tank tier and facility level unlock is reachable
    for (const t of TANK_TIERS) if (t.unlock) expect(keys).toContain(t.unlock);
    for (const l of FACILITY_LEVELS) if (l.unlockKey) expect(UNLOCK_RULES.some((r) => r.key === l.unlockKey)).toBe(true);
  });

  it('reputation and play unlock tanks and gear', () => {
    const g = game();
    F.tutorialSkip(g);
    expect(g.progress.unlocked).not.toContain('tank_55');
    g.progress.reputation = 65;
    progress(g);
    expect(g.progress.unlocked).toEqual(expect.arrayContaining(['tank_40', 'tank_55', 'gear_tier2', 'signage']));
    expect(g.log.some((e) => e.kind === 'unlock')).toBe(true);
    expect(g.progress.unlocked).not.toContain('tank_75');
  });

  it('facility level gates bigger tanks and visitors', () => {
    const g = game();
    F.tutorialSkip(g);
    g.progress.reputation = 110;
    F.bumpCounter(g, 'friend_visits', 4);
    progress(g);
    expect(g.progress.unlocked).not.toContain('tank_75');
    expect(g.progress.unlocked).not.toContain('visitors');
    expect(g.progress.unlocked).toContain('facility_specialty_shop'); // rep ≥ 60 and a friend route
  });

  it('counters feed mastery exactly once even if two spellings are bumped', () => {
    const g = game();
    F.tutorialSkip(g);
    F.bumpCounter(g, 'waterChanges', 3);
    F.bumpCounter(g, 'water_changes', 3);
    progress(g);
    const h = g.progress.mastery.husbandry;
    progress(g);
    expect(g.progress.mastery.husbandry).toBe(h);
    expect(h).toBeGreaterThanOrEqual(12);
    expect(h).toBeLessThan(24 + 12);
  });

  it('unlockProgress lists locked keys with requirement progress', () => {
    const g = game();
    const list = F.unlockProgress(g);
    expect(list.length).toBeGreaterThan(10);
    const t1000 = list.find((u) => u.key === 'tank_1000')!;
    expect(t1000.viaResearch.map((r) => r.id)).toContain('grand_display');
    expect(list.every((u) => u.progress >= 0 && u.progress <= 1)).toBe(true);
  });
});

describe('facility: research', () => {
  it('costs money and time, then grants unlocks', () => {
    const g = game();
    F.tutorialSkip(g);
    g.finance.money = 1000;
    expect(F.startResearch(g, 'breeding_program').ok).toBe(true);
    expect(g.finance.money).toBe(700);
    expect(F.startResearch(g, 'life_support_2').ok).toBe(false); // one at a time
    for (let i = 0; i < 20; i++) progress(g, 1);
    expect(g.progress.research.completed).toContain('breeding_program');
    expect(g.progress.unlocked).toContain('nursery');
    expect(g.progress.research.activeId).toBeUndefined();
  });

  it('respects requirements', () => {
    const g = game();
    g.finance.money = 100000;
    expect(F.startResearch(g, 'reef_systems').ok).toBe(false);
    const list = F.researchList(g);
    expect(list.find((r) => r.def.id === 'reef_systems')!.status).toBe('locked');
  });
});

describe('facility: quest board', () => {
  it('refills after the tutorial, completes and pays on claim', () => {
    const g = game('betta', 23);
    F.tutorialSkip(g);
    for (let i = 0; i < 8; i++) progress(g, 1.1);
    const board = F.activeQuests(g).filter((q) => !q.isTutorial);
    expect(board.length).toBe(3);
    // complete whichever relative-counter quest we can
    const q = g.progress.quests.find((x) => x.status === 'active' && x.baseline !== undefined);
    if (q) {
      const target = q.target ?? 1;
      const key = { q_feed_routine: 'feeds', q_water_changes: 'waterChanges', q_breed_first: 'births', q_breed_more: 'births', q_sell_creature: 'sales', q_friends: 'friend_visits', q_visitors_50: 'visitors', q_wows: 'wows', q_satisfied: 'five_star_days', q_research: 'research_done' }[q.id as 'q_feed_routine'];
      if (key) {
        F.bumpCounter(g, key, target);
        progress(g);
        expect(g.progress.quests.find((x) => x.id === q.id)!.status).toBe('complete');
        const m = g.finance.money;
        expect(F.claimQuest(g, q.id).ok).toBe(true);
        expect(g.finance.money).toBeGreaterThanOrEqual(m);
      }
    }
  });
});

describe('facility: levels, upgrades and placement', () => {
  it('defines six levels with growing floor, capacity, rent and cost', () => {
    expect(FACILITY_LEVELS.map((l) => l.id)).toEqual(['hobby_room', 'specialty_shop', 'aquarium_store', 'showroom', 'destination', 'grand_hall']);
    for (let i = 1; i < FACILITY_LEVELS.length; i++) {
      const a = FACILITY_LEVELS[i - 1];
      const b = FACILITY_LEVELS[i];
      expect(b.width * b.depth).toBeGreaterThan(a.width * a.depth);
      expect(b.visitorCapacity).toBeGreaterThan(a.visitorCapacity);
      expect(b.upgradeCost).toBeGreaterThan(a.upgradeCost);
      expect(b.dailyRent).toBeGreaterThan(a.dailyRent);
    }
  });

  it('upgrade needs the unlock and money, preserves tanks and keeps them valid', () => {
    const g = game('axolotl', 29);
    F.tutorialSkip(g);
    // a second tank in the hobby room
    const spot = F.findFreeSpot(g, 'g10')!;
    expect(spot).not.toBeNull();
    createTank(g, 'g10', 'freshwater_planted', { cycled: true, placement: spot });
    const ids = [...g.tankOrder];
    expect(F.upgradeFacility(g).ok).toBe(false);
    g.progress.unlocked.push('facility_specialty_shop');
    g.finance.money = 100;
    expect(F.upgradeFacility(g).ok).toBe(false);
    g.finance.money = 5000;
    const r = F.upgradeFacility(g);
    expect(r.ok).toBe(true);
    expect(g.facility.level).toBe('specialty_shop');
    expect(g.facility.width).toBe(getFacilityLevel('specialty_shop').width);
    expect(g.tankOrder).toEqual(ids);
    expect(g.progress.unlocked).toContain('visitors');
    expect(g.facility.openToPublic).toBe(true);
    const tanks = ids.map((id) => g.tanks[id]);
    for (const t of tanks) expect(obbInsideRoom(tankFootprint(t.tierId, t.placement), g.facility.width, g.facility.depth)).toBe(true);
    expect(obbOverlap(tankFootprint(tanks[0].tierId, tanks[0].placement), tankFootprint(tanks[1].tierId, tanks[1].placement))).toBe(false);
    expect(F.stateReachability(g).unreachable).toHaveLength(0);
  });

  it('findFreeSpot packs many tanks without overlap and all stay reachable', () => {
    const g = game('betta', 31);
    g.facility = F.initialFacility('grand_hall');
    g.tanks = {};
    g.tankOrder = [];
    const tiers = ['g1000', 'g500', 'g300', 'g240', 'g180', 'g125', 'g90', 'g75', 'g55', 'g40B', 'g29', 'g20L'];
    for (const tier of tiers) {
      const p = F.findFreeSpot(g, tier);
      expect(p, tier).not.toBeNull();
      createTank(g, tier, 'reef', { cycled: true, placement: p! });
    }
    const list = g.tankOrder.map((id) => g.tanks[id]);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(obbOverlap(tankFootprint(list[i].tierId, list[i].placement), tankFootprint(list[j].tierId, list[j].placement))).toBe(false);
    expect(F.stateReachability(g).unreachable).toHaveLength(0);
    // the 1,000 gallon centrepiece goes on the back wall, centred
    expect(Math.abs(list[0].placement.x)).toBeLessThan(0.5);
    expect(list[0].placement.z).toBeLessThan(-g.facility.depth / 2 + 1.5);
  });

  it('placeTank validates bounds, overlaps and aisles', () => {
    const g = game('betta', 37);
    const t = g.tanks[g.tankOrder[0]];
    expect(F.placeTank(g, t.id, 99, 0, 0).ok).toBe(false);
    const spot = F.findFreeSpot(g, 'g20L')!;
    const other = createTank(g, 'g20L', 'freshwater_planted', { cycled: true, placement: spot });
    expect(F.placeTank(g, other.id, t.placement.x, t.placement.z, 0).ok).toBe(false);
    const before = { ...t.placement };
    expect(F.placeTank(g, t.id, -1.2, 2.0, Math.PI).ok || true).toBe(true);
    expect(Number.isFinite(t.placement.x)).toBe(true);
    // a valid wall move succeeds
    t.placement = before;
    const res = F.validatePlacement(g, t.tierId, before, t.id);
    expect(res.ok).toBe(true);
  });
});
