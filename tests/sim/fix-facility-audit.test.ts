/**
 * Fix lane FACILITY (audit findings S04-01/02/03/04/05/06/07/08/09, G1-01/02/04, G2-02, P1-06).
 * Step-size independence of visitors and reputation, back-of-house tanks, quest board fairness, tutorial "Next",
 * reaction copy, placement with a pre-existing unreachable tank, fixture refunds on a move.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { makeContext, emitEvent } from '@/sim/context';
import { dayOf } from '@/sim/time';
import * as F from '@/sim/facility';
import { initialFacility, stepProgression, tutorialAdvance, tutorialStepId, tutorialWants } from '@/sim/facility';
import { exhibitInfo, exhibitReport, momentPhrase } from '@/sim/facility/exhibit';
import { TUTORIAL_CHAINS, QUEST_BY_ID, tutorialChain } from '@/data/quests';
import { FIXTURE_DEFS, getFacilityLevel } from '@/data/facilities';

type Lvl = Parameters<typeof initialFacility>[0];

function freshWorld(level: Lvl = 'specialty_shop', seed = 11): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed });
  g.tanks = {};
  g.tankOrder = [];
  g.creatures = {};
  g.clutches = {};
  g.log = [];
  g.facility = initialFacility(level);
  if (level !== 'hobby_room') {
    if (!g.progress.unlocked.includes('visitors')) g.progress.unlocked.push('visitors');
    g.facility.openToPublic = true;
  }
  g.progress.reputation = 150;
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  g.clock.hour = 24 * 3 + 8; // day 4 (Thursday), 8 AM
  g.visitors.today = { day: dayOf(g.clock.hour), count: 0, revenue: 0, tips: 0, satisfactionSum: 0 };
  return g;
}

interface ExhibitOpts {
  tierId?: string;
  waterClass?: WaterClass;
  species?: string;
  count?: number;
  sick?: boolean;
  name?: string;
  purpose?: Tank['purpose'];
  placement?: { x: number; z: number; rotY: number };
}

function addExhibit(g: GameState, o: ExhibitOpts = {}): Tank {
  const tierId = o.tierId ?? 'g20L';
  const placement = o.placement ?? F.findFreeSpot(g, tierId);
  if (!placement) throw new Error('no spot for ' + tierId);
  const t = createTank(g, tierId, o.waterClass ?? 'freshwater_planted', { cycled: true, placement, name: o.name, purpose: o.purpose });
  const rng = simRng(g);
  const species = o.species ?? 'betta';
  for (let i = 0; i < (o.count ?? 1); i++) {
    const c = createCreature(g, rng, species, { sex: species === 'betta' ? (i === 0 ? 'male' : 'female') : undefined, ageDays: 40 });
    addCreature(g, c, t.id);
    c.stats.health = o.sick ? 30 : 95;
    c.stats.stress = o.sick ? 85 : 10;
    if (o.sick) c.illness = { kind: 'fin_rot', severity: 0.6, sinceHour: g.clock.hour };
    else delete c.illness;
  }
  t.cache.beauty = 70;
  t.cache.welfare = o.sick ? 55 : 92;
  t.cache.status = o.sick ? 'watch' : 'good';
  t.cache.compatVerdict = 'excellent';
  return t;
}

function runHours(g: GameState, hours: number, dt = 0.25): void {
  let left = hours;
  while (left > 1e-9) {
    const step = Math.min(dt, left);
    F.stepVisitors(g, step, makeContext(g, step));
    g.clock.hour += step;
    left -= step;
  }
}

function tick(g: GameState, h = 0.25): void {
  stepProgression(g, h, makeContext(g, h));
  g.clock.hour += h;
}

const SHOP: ExhibitOpts[] = [
  { species: 'betta', waterClass: 'freshwater_planted', tierId: 'g20L', name: 'Betta Bower' },
  { species: 'pea_puffer', waterClass: 'freshwater_planted', tierId: 'g20L', count: 3, name: 'Puffer Patch' },
  { species: 'axolotl', waterClass: 'freshwater_cool', tierId: 'g29', count: 2, name: 'Axolotl Pond' },
  { species: 'ocellaris_clownfish', waterClass: 'marine_live_rock', tierId: 'g29', count: 2, name: 'Clown Reef' },
];

function shop(seed: number, n = 4, level: Lvl = 'specialty_shop'): GameState {
  const g = freshWorld(level, seed);
  for (const o of SHOP.slice(0, n)) addExhibit(g, o);
  return g;
}

// ───────────────────────────── step size ─────────────────────────────

describe('S04-01 / G1-04: visitor arrivals do not depend on the sim step size', () => {
  it('a one-exhibit shop admits the same visitors at 1× (0.025 h) and offline (0.5 h) steps', () => {
    const totals = { fine: 0, coarse: 0 };
    for (let seed = 1; seed <= 5; seed++) {
      const a = shop(seed * 7, 1);
      runHours(a, 24 * 4, 0.025);
      const b = shop(seed * 7, 1);
      runHours(b, 24 * 4, 0.5);
      totals.fine += a.visitors.totalVisitors;
      totals.coarse += b.visitors.totalVisitors;
    }
    expect(totals.coarse).toBeGreaterThan(40);
    expect(totals.fine / totals.coarse).toBeGreaterThan(0.88);
    expect(totals.fine / totals.coarse).toBeLessThan(1.12);
  });

  it('an early arrival stays a debt: the carry is never forgiven', () => {
    const g = shop(3, 1);
    let sawDebt = false;
    for (let i = 0; i < 400; i++) {
      const before = g.visitors.live?.carry ?? 0;
      const n0 = g.visitors.totalVisitors;
      F.stepVisitors(g, 0.025, makeContext(g, 0.025));
      g.clock.hour += 0.025;
      const live = g.visitors.live!;
      if (before < 0) {
        sawDebt = true;
        // a negative carry can only rise by this step's expected arrivals, never jump to a fresh positive fraction
        expect(live.carry).toBeLessThanOrEqual(before + live.arrivalRate * 0.025 + 1e-9);
        expect(g.visitors.totalVisitors).toBe(n0);
      }
    }
    expect(sawDebt).toBe(true);
  });
});

describe('G1-01: reputation from births, sales and deaths is capped per day, not per step', () => {
  function world(): GameState {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
    F.tutorialSkip(g);
    g.progress.reputation = 0;
    g.clock.hour = 24 * 3 + 9;
    tick(g, 0.025);
    return g;
  }

  it('five broods hatching within one hour earn the same reputation stepped at 0.025 h and at 0.5 h', () => {
    const a = world();
    for (let i = 0; i < 5; i++) {
      F.bumpCounter(a, 'births', 10);
      tick(a, 0.025);
    }
    const b = world();
    F.bumpCounter(b, 'births', 50);
    tick(b, 0.5);
    expect(a.progress.reputation).toBeGreaterThan(50);
    expect(Math.abs(a.progress.reputation - b.progress.reputation)).toBeLessThan(2);
  });

  it('the budget comes back the next day', () => {
    const g = world();
    F.bumpCounter(g, 'births', 30);
    tick(g, 0.5);
    const capped = g.progress.reputation;
    F.bumpCounter(g, 'births', 10);
    tick(g, 0.5);
    expect(g.progress.reputation).toBe(capped); // today's 20 units are spent
    g.clock.hour += 24;
    F.bumpCounter(g, 'births', 10);
    tick(g, 0.5);
    expect(g.progress.reputation).toBeGreaterThan(capped);
  });

  it('a die-off costs at most 10 reputation a day whether it is seen step by step or in one chunk', () => {
    const death = (g: GameState) => emitEvent(g, { kind: 'death', text: 'A fish died.', toast: false });
    const a = world();
    a.progress.reputation = 100;
    for (let i = 0; i < 12; i++) {
      death(a);
      tick(a, 0.025);
    }
    const b = world();
    b.progress.reputation = 100;
    for (let i = 0; i < 12; i++) death(b);
    tick(b, 0.5);
    expect(a.progress.reputation).toBeCloseTo(90, 5);
    expect(b.progress.reputation).toBeCloseTo(90, 5);
  });
});

describe('G1-02: critics and wows count per represented visitor', () => {
  it('reputation earned per visitor in a busy hall is the same at 0.025 h and 0.5 h steps', () => {
    const per = (dt: number) => {
      let rep = 0;
      let visitors = 0;
      for (let seed = 1; seed <= 4; seed++) {
        const g = shop(seed * 13, 4, 'showroom');
        g.progress.reputation = 400;
        const r0 = g.progress.reputation;
        runHours(g, 24 * 3, dt);
        rep += g.progress.reputation - r0;
        visitors += g.visitors.totalVisitors;
      }
      return { rep, visitors };
    };
    const fine = per(0.025);
    const coarse = per(0.5);
    expect(coarse.visitors).toBeGreaterThan(1000);
    expect(fine.visitors / coarse.visitors).toBeGreaterThan(0.9);
    expect(fine.visitors / coarse.visitors).toBeLessThan(1.1);
    const ratio = fine.rep / coarse.visitors / (coarse.rep / coarse.visitors);
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.4);
  });

  it('a star’s visitor-wow tally stays a whole number and follows the crowd, not the sample count', () => {
    const g = freshWorld('grand_hall', 21);
    for (const o of [...SHOP, ...SHOP]) addExhibit(g, o);
    g.progress.reputation = 900;
    const t = g.tanks[g.tankOrder[0]];
    const star = exhibitInfo(g, t).star!;
    emitEvent(g, { kind: 'breeding', text: `${star.name} has built a shimmering bubble nest beneath the leaves.`, tankId: t.id, creatureId: star.id });
    runHours(g, 12, 0.5);
    expect(g.visitors.totalVisitors).toBeGreaterThan(16 * 24); // more than one sample per visitor could cover
    const cr = g.creatures[star.id];
    expect(Number.isInteger(cr.visitorWows)).toBe(true);
    const seen = g.visitors.exhibit[t.id]?.wows ?? 0; // already per represented visitor
    expect(seen).toBeGreaterThan(30);
    expect(Math.abs(cr.visitorWows - seen)).toBeLessThan(24 * 0.5 + 1); // one rounding per step at most
  });

  it('the reaction feed turns over at the same pace per game hour at every speed', () => {
    const count = (dt: number) => {
      const g = shop(8, 4, 'showroom');
      g.progress.reputation = 400;
      let pushed = 0;
      let before = 0;
      const seen = new Set<string>();
      let left = 24;
      while (left > 1e-9) {
        const step = Math.min(dt, left);
        F.stepVisitors(g, step, makeContext(g, step));
        g.clock.hour += step;
        left -= step;
        for (const r of g.visitors.reactions) {
          const key = `${r.hour}|${r.text}`;
          if (!seen.has(key)) {
            seen.add(key);
            pushed++;
          }
        }
        before = pushed;
      }
      return before;
    };
    const fine = count(0.025);
    const coarse = count(0.25);
    expect(coarse).toBeGreaterThan(10);
    expect(fine).toBeLessThan(coarse * 1.5);
    expect(fine).toBeGreaterThan(coarse * 0.5);
  });
});

// ───────────────────────────── back of house ─────────────────────────────

describe('S04-02: quarantine / nursery / breeding tanks are not exhibits', () => {
  it('a sick fish in a quarantine tank gets no views, no concerned lines and changes no ticket price', () => {
    const g = shop(4, 3);
    const fairBefore = F.fairAdmission(g);
    const q = addExhibit(g, { species: 'betta', name: 'Hospital Tank', sick: true, purpose: 'quarantine' });
    expect(F.fairAdmission(g)).toBe(fairBefore);
    runHours(g, 11, 0.25);
    expect(g.visitors.totalVisitors).toBeGreaterThan(20);
    expect(g.visitors.exhibit[q.id]).toBeUndefined();
    expect(g.visitors.reactions.some((r) => r.tankId === q.id)).toBe(false);
    expect(F.visitorSummary(g).topExhibits.some((e) => e.tankId === q.id)).toBe(false);
  });

  it('the same sick fish on display does worry visitors', () => {
    const g = shop(4, 3);
    const t = addExhibit(g, { species: 'betta', name: 'Hospital Tank', sick: true });
    runHours(g, 11, 0.25);
    expect((g.visitors.exhibit[t.id]?.views ?? 0) > 0).toBe(true);
  });
});

describe('S04-08: concerned lines name the unwell animal, not the star', () => {
  it('exhibitInfo exposes the concern creature and reactions carry its id', () => {
    const g = shop(9, 2);
    const t = addExhibit(g, { species: 'neon_tetra', count: 5, name: 'Nature Scape' });
    const sick = Object.values(g.creatures).find((c) => c.tankId === t.id)!;
    sick.name = 'Sorrel';
    sick.stats.health = 30;
    sick.stats.stress = 85;
    sick.illness = { kind: 'fin_rot', severity: 0.6, sinceHour: g.clock.hour };
    const info = exhibitInfo(g, t);
    expect(info.concerned).toBe(true);
    expect(info.concernCreature?.id).toBe(sick.id);
    runHours(g, 11, 0.25);
    const star = info.star!;
    expect(star.id).not.toBe(sick.id);
    const concerned = g.visitors.reactions.filter((r) => r.tankId === t.id && r.mood === 'concerned');
    expect(concerned.length).toBeGreaterThan(0);
    for (const r of concerned) {
      expect(r.creatureId).toBe(sick.id);
      expect(r.text).not.toContain(star.name);
    }
  });
});

// ───────────────────────────── moments ─────────────────────────────

describe('S04-04: visitor moments are noun phrases', () => {
  it('maps breeding log lines to what visitors can see, and ignores invisible cues', () => {
    expect(momentPhrase('Reginald has built a shimmering bubble nest beneath the leaves — he’s ready for a conditioned female.')).toBe('a bubble nest');
    expect(momentPhrase('The eggs hatched — 40 tiny larvae hang tail-down in the bubble nest.')).toBe('newly hatched fry');
    expect(momentPhrase('Pip dropped 12 fry!')).toBe('newly hatched fry');
    expect(momentPhrase('Mochi is courting Luna — a slow, tail-waving “waltz” across the sand in the cool night water.')).toBe('a courtship dance');
    expect(momentPhrase('Luna is laying eggs one by one on the plants and decor!')).toBe('a fresh clutch of eggs');
    expect(momentPhrase('The water in Axolotl Pond has cooled by 3 °C — like the first cool rains of the season. Mochi is restless tonight.')).toBeNull();
    expect(momentPhrase('Tango has become the male of the group — the ocellaris clownfish pair can breed now.')).toBeNull();
  });

  it('reaction lines and the exhibit report read cleanly', () => {
    const g = shop(5, 1);
    const t = g.tanks[g.tankOrder[0]];
    const male = Object.values(g.creatures).find((c) => c.tankId === t.id)!;
    emitEvent(g, { kind: 'breeding', text: `${male.name} has built a shimmering bubble nest beneath the leaves — he’s ready for a conditioned female.`, tankId: t.id, creatureId: male.id });
    const info = exhibitInfo(g, t);
    expect(info.moment?.text).toBe('a bubble nest');
    const note = exhibitReport(g, t.id).factors.find((f) => f.label === 'Behaviour moments')?.note;
    expect(note).toBe('Visitors can see a bubble nest.');
    runHours(g, 11, 0.25);
    const wow = g.visitors.reactions.filter((r) => r.tankId === t.id && r.mood === 'wow');
    expect(wow.length).toBeGreaterThan(0);
    for (const r of wow) expect(r.text).not.toMatch(/has built|conditioned female|[a-z]+ has /);
  });

  it('a seasonal cooling cue is not a visible moment', () => {
    const g = shop(5, 1);
    const t = g.tanks[g.tankOrder[0]];
    emitEvent(g, { kind: 'breeding', text: `The water in ${t.name} has cooled by 3 °C — like the first cool rains of the season. Ember is restless tonight.`, tankId: t.id });
    expect(exhibitInfo(g, t).moment).toBeNull();
  });
});

// ───────────────────────────── placement ─────────────────────────────

describe('S04-09: a tank that already faces a wall does not block every other placement', () => {
  it('new-tank spots and moves of other tanks still validate; the blocked tank itself can be turned back', () => {
    const g = shop(2, 2);
    const [aId, bId] = g.tankOrder;
    const a = g.tanks[aId];
    const b = g.tanks[bId];
    // turn A so its glass faces the wall behind it (its own front zone is now outside the room)
    a.placement = { ...a.placement, rotY: a.placement.rotY + Math.PI };
    expect(F.stateReachability(g).unreachable).toContain(aId);
    expect(F.findFreeSpot(g, 'g29')).not.toBeNull();
    expect(F.placeTank(g, bId, b.placement.x + 0.05, b.placement.z, b.placement.rotY).ok).toBe(true);
    expect(F.validatePlacement(g, b.tierId, b.placement, bId).ok).toBe(true);
    // a move that would cut off a reachable tank is still refused
    expect(F.validatePlacement(g, a.tierId, { ...a.placement, rotY: a.placement.rotY - Math.PI }, aId).ok).toBe(true);
  });
});

// ───────────────────────────── fixtures on a move ─────────────────────────────

describe('S04-05: bought fixtures are never lost on a facility move', () => {
  it('a bench that does not fit the new room is refunded in full, with a log line', () => {
    const g = freshWorld('specialty_shop', 6);
    g.finance.money = 20000;
    addExhibit(g, SHOP[0]);
    const spot = { x: 2.2, z: 1.2, rotY: 0 };
    const ok = F.addFixture(g, 'bench', spot.x, spot.z, spot.rotY);
    expect(ok.ok).toBe(true);
    const price = FIXTURE_DEFS.bench.price;
    if (!g.progress.unlocked.includes('facility_aquarium_store')) g.progress.unlocked.push('facility_aquarium_store');
    const before = g.finance.money;
    const cost = getFacilityLevel('aquarium_store').upgradeCost;
    expect(F.upgradeFacility(g).ok).toBe(true);
    const kept = g.facility.fixtures.some((f) => f.id === ok.fixtureId);
    if (kept) expect(g.finance.money).toBe(before - cost);
    else {
      expect(g.finance.money).toBe(before - cost + price);
      expect(g.log.some((e) => /movers returned .*refunded/.test(e.text))).toBe(true);
    }
  });

  it('the room’s own furniture sells for nothing; a bought fixture fetches half price', () => {
    const g = freshWorld('aquarium_store', 6);
    g.finance.money = 1000;
    const free = g.facility.fixtures.find((f) => f.id.startsWith('fx_'))!;
    const m0 = g.finance.money;
    expect(F.removeFixture(g, free.id).ok).toBe(true);
    expect(g.finance.money).toBe(m0);
    const spot = F.findFreeSpot(g, 'g20L')!;
    const bought = F.addFixture(g, 'planter', spot.x, spot.z + 1.5, 0);
    if (bought.ok) {
      const m1 = g.finance.money;
      expect(F.removeFixture(g, bought.fixtureId!).ok).toBe(true);
      expect(g.finance.money).toBe(m1 + Math.round(FIXTURE_DEFS.planter.price / 2));
    }
  });
});

// ───────────────────────────── quest board ─────────────────────────────

describe('G2-02: one-shot quests met before they were drawn are still paid', () => {
  it('a facility milestone reached while the board is full joins the board complete', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 23 });
    F.tutorialSkip(g);
    g.finance.money = 100000;
    for (let i = 0; i < 8; i++) tick(g, 1.1);
    const active = g.progress.quests.filter((q) => q.status === 'active' && q.id !== 'tutorial');
    expect(active.length).toBe(3);
    for (const k of ['facility_specialty_shop', 'facility_aquarium_store', 'facility_showroom']) if (!g.progress.unlocked.includes(k)) g.progress.unlocked.push(k);
    expect(F.upgradeFacility(g).ok).toBe(true);
    expect(F.upgradeFacility(g).ok).toBe(true);
    expect(F.upgradeFacility(g).ok).toBe(true);
    expect(g.facility.level).toBe('showroom');
    for (let i = 0; i < 6; i++) tick(g, 1.1);
    for (const id of ['q_open_shop', 'q_store', 'q_showroom']) {
      const q = g.progress.quests.find((x) => x.id === id);
      expect(q?.status, id).toBe('complete');
      expect(g.log.some((e) => e.text.startsWith(`Quest complete: ${QUEST_BY_ID[id].title}`))).toBe(true);
    }
    const m = g.finance.money;
    expect(F.claimQuest(g, 'q_showroom').ok).toBe(true);
    expect(g.finance.money).toBe(m + 2000);
  });

  it('repeatable quests that would complete instantly are still skipped', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 23 });
    F.tutorialSkip(g);
    g.progress.counters.water_good_streak = 30; // q_water_good_3d is met right now
    for (let i = 0; i < 12; i++) tick(g, 1.1);
    expect(g.progress.quests.some((q) => q.id === 'q_water_good_3d')).toBe(false);
  });
});

describe('S04-03: "Show and tell" belongs to the hobby room', () => {
  it('is never drawn in an open shop', () => {
    const g = freshWorld('specialty_shop', 31);
    addExhibit(g, SHOP[0]);
    for (let i = 0; i < 300; i++) tick(g, 1);
    expect(g.progress.quests.some((q) => q.id === 'q_friends')).toBe(false);
  });

  it('leaves the board (unfinished) when the player moves into a shop', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 31 });
    F.tutorialSkip(g);
    g.progress.quests.push({ id: 'q_friends', status: 'active', progress: 0, startedHour: g.clock.hour, baseline: 0, target: 3 });
    tick(g);
    expect(g.progress.quests.some((q) => q.id === 'q_friends')).toBe(true);
    g.finance.money = 100000;
    if (!g.progress.unlocked.includes('facility_specialty_shop')) g.progress.unlocked.push('facility_specialty_shop');
    expect(F.upgradeFacility(g).ok).toBe(true);
    tick(g);
    expect(g.progress.quests.some((q) => q.id === 'q_friends')).toBe(false);
    expect(g.progress.counters['quest_claimed:q_friends']).toBeUndefined();
  });
});

describe('S04-07: repeat quest bodies', () => {
  it('scale their number cleanly instead of substituting digits', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 2 });
    F.tutorialSkip(g);
    if (!g.progress.unlocked.includes('market_listings')) g.progress.unlocked.push('market_listings');
    g.progress.quests.push({ id: 'q_sell_creature', status: 'active', progress: 0, startedHour: g.clock.hour, baseline: 0, target: 2 });
    g.progress.quests.push({ id: 'q_show_ribbon', status: 'active', progress: 0, startedHour: g.clock.hour, baseline: 0, target: 3 });
    g.progress.quests.push({ id: 'q_feed_routine', status: 'active', progress: 0, startedHour: g.clock.hour, baseline: 0, target: 15 });
    const views = F.activeQuests(g);
    expect(views.find((v) => v.id === 'q_sell_creature')?.body).toBe('Sell 2 animals to buyers who will care for them.');
    expect(views.find((v) => v.id === 'q_show_ribbon')?.body).toBe('Place 1st, 2nd or 3rd in 3 show classes.');
    expect(views.find((v) => v.id === 'q_feed_routine')?.body).toMatch(/^Feed your animals 15 times/);
    for (const v of views) expect(v.body).not.toMatch(/\{n\}|\d+st\b(?<!1st)/);
  });
});

// ───────────────────────────── tutorial ─────────────────────────────

describe('S04-06: "Next" on a look-here step keeps its promise', () => {
  function walkTo(g: GameState, id: string) {
    for (let guard = 0; guard < 30 && tutorialStepId(g) !== id; guard++) {
      const step = tutorialChain(g.starterId).find((x) => x.id === tutorialStepId(g))!;
      if (step.objective.type === 'flag') tutorialAdvance(g, step.objective.anyOf[0]);
      else if (step.id === 'feed') tutorialAdvance(g, 'fed');
      else if (step.id === 'habitat') tutorialAdvance(g, 'decor_placed');
      else if (step.id === 'first_money' || step.id === 'first_goal') g.progress.counters.friend_visits = (g.progress.counters.friend_visits ?? 0) + 3;
      else if (step.id === 'upgrade') g.progress.reputation += 20;
      tick(g, 0.1);
    }
    expect(tutorialStepId(g)).toBe(id);
  }

  it('Next on "The market" unlocks listings, as its done line says', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    walkTo(g, 'market');
    expect(g.progress.unlocked).not.toContain('market_listings');
    tutorialAdvance(g); // Next
    expect(tutorialStepId(g)).toBe('first_goal');
    expect(g.progress.unlocked).toContain('market_listings');
  });

  it('Next on "The road ahead" pays the step reward', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    walkTo(g, 'preview');
    const money = g.finance.money;
    const rep = g.progress.reputation;
    tutorialAdvance(g); // Next
    expect(g.progress.tutorial.done).toBe(true);
    expect(g.finance.money).toBe(money + 60);
    expect(g.progress.reputation).toBeGreaterThan(rep);
  });

  it('Next on a counter step (feed) still withholds the reward', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
    walkTo(g, 'feed');
    const xp = g.progress.mastery.husbandry ?? 0;
    tutorialAdvance(g);
    expect(tutorialStepId(g)).toBe('water');
    expect(g.progress.mastery.husbandry ?? 0).toBe(xp);
  });
});

describe('P1-06: a flag objective can ask for a minimum dwell (minHours)', () => {
  it('an early flag does not complete the step before the dwell; it counts once the dwell ends', () => {
    const chain = TUTORIAL_CHAINS.betta;
    const observe = chain.find((s) => s.id === 'observe')!;
    const obj = observe.objective as Extract<typeof observe.objective, { type: 'flag' }>;
    const saved = obj.minHours;
    obj.minHours = 1;
    try {
      const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4 });
      const t = g.progress.tutorial;
      t.step = chain.indexOf(observe);
      t.stepStartedHour = g.clock.hour;
      t.flagHours = {};
      tick(g, 0.1);
      expect(tutorialStepId(g)).toBe('observe');
      tutorialAdvance(g, 'observed:fin_flare'); // 0.1 h in: too soon
      expect(tutorialStepId(g)).toBe('observe');
      expect(tutorialWants(g, 'observed:fin_flare')).toBe(false); // seen: no need to raise it again
      tick(g, 0.5);
      expect(tutorialStepId(g)).toBe('observe'); // still inside the dwell
      g.clock.hour += 0.5;
      tick(g, 0.1);
      expect(tutorialStepId(g)).not.toBe('observe'); // the sighting counts once the step has been watched an hour
    } finally {
      obj.minHours = saved;
    }
  });
});
