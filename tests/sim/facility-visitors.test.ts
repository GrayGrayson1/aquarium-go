/**
 * Facility lane — visitor simulation, exhibit scoring, fatigue, welfare gating, capacity, blocked paths, determinism.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank, deleteTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { makeContext } from '@/sim/context';
import { dayOf } from '@/sim/time';
import * as F from '@/sim/facility';
import { facilityAttraction } from '@/sim/facility/visitors';
import { initialFacility } from '@/sim/facility';
import { reactionLineCount } from '@/sim/facility/reactions';

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
  if (!g.progress.unlocked.includes('signage')) g.progress.unlocked.push('signage');
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
  beauty?: number;
  welfare?: number;
  signage?: boolean;
  sick?: boolean;
  name?: string;
  placement?: { x: number; z: number; rotY: number };
}

function addExhibit(g: GameState, o: ExhibitOpts = {}): Tank {
  const tierId = o.tierId ?? 'g20L';
  const placement = o.placement ?? F.findFreeSpot(g, tierId);
  if (!placement) throw new Error('no spot for ' + tierId);
  const t = createTank(g, tierId, o.waterClass ?? 'freshwater_planted', { cycled: true, placement, name: o.name });
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
  t.cache.beauty = o.beauty ?? 70;
  t.cache.welfare = o.welfare ?? 92;
  t.cache.status = o.sick ? 'watch' : 'good';
  t.cache.compatVerdict = 'excellent';
  t.signage = !!o.signage;
  return t;
}

function runHours(g: GameState, hours: number, dt = 0.25): void {
  let left = hours;
  while (left > 1e-9) {
    const step = Math.min(dt, left);
    const ctx = makeContext(g, step);
    F.stepVisitors(g, step, ctx);
    g.clock.hour += step;
    left -= step;
  }
}

const avgSat = (g: GameState) => (g.visitors.today.count > 0 ? g.visitors.today.satisfactionSum / g.visitors.today.count : 0);

/** A decent shop: 4 healthy exhibits of different starter species. */
function goodShop(seed = 11, tweak?: (o: ExhibitOpts, i: number) => ExhibitOpts): GameState {
  const g = freshWorld('specialty_shop', seed);
  const base: ExhibitOpts[] = [
    { species: 'betta', waterClass: 'freshwater_planted', tierId: 'g20L', name: 'Betta Bower' },
    { species: 'pea_puffer', waterClass: 'freshwater_planted', tierId: 'g20L', count: 3, name: 'Puffer Patch' },
    { species: 'axolotl', waterClass: 'freshwater_cool', tierId: 'g29', count: 2, name: 'Axolotl Pond' },
    { species: 'ocellaris_clownfish', waterClass: 'marine_live_rock', tierId: 'g29', count: 2, name: 'Clown Reef' },
  ];
  base.forEach((o, i) => addExhibit(g, tweak ? tweak(o, i) : o));
  return g;
}

describe('facility: visitors arrive only when open and unlocked', () => {
  it('hobby room never gets paying visitors (friends only)', () => {
    const g = freshWorld('hobby_room');
    addExhibit(g, { tierId: 'g10' });
    runHours(g, 30);
    expect(g.visitors.totalVisitors).toBe(0);
    expect(F.setOpenToPublic(g, true).ok).toBe(false);
  });

  it('shop closed to the public gets no visitors', () => {
    const g = goodShop();
    g.facility.openToPublic = false;
    runHours(g, 12);
    expect(g.visitors.totalVisitors).toBe(0);
  });

  it('shop without the visitors unlock gets no visitors', () => {
    const g = goodShop();
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'visitors');
    runHours(g, 12);
    expect(g.visitors.totalVisitors).toBe(0);
  });

  it('no arrivals outside opening hours', () => {
    const g = goodShop();
    g.clock.hour = 24 * 3 + 19.5; // after close
    runHours(g, 12); // through the night to 7:30
    expect(g.visitors.totalVisitors).toBe(0);
  });

  it('open + unlocked shop gets visitors and revenue', () => {
    const g = goodShop();
    const money0 = g.finance.money;
    runHours(g, 11); // 8:00 → 19:00
    expect(g.visitors.totalVisitors).toBeGreaterThan(5);
    expect(g.visitors.today.revenue).toBeGreaterThan(0);
    expect(g.finance.money).toBeGreaterThan(money0);
    expect(g.finance.ledger.some((l) => l.category === 'admission' && l.amount > 0)).toBe(true);
    expect(g.visitors.reactions.length).toBeGreaterThan(0);
    for (const v of Object.values(g.visitors.exhibit)) expect(Number.isFinite(v.popularity)).toBe(true);
  });
});

describe('facility: satisfaction drivers', () => {
  it('welfare affects satisfaction (sick animals concern visitors)', () => {
    const good = goodShop(21);
    const sick = goodShop(21, (o) => ({ ...o, sick: true, welfare: 38 }));
    const rep0 = sick.progress.reputation;
    runHours(good, 11);
    runHours(sick, 11);
    expect(avgSat(good)).toBeGreaterThan(avgSat(sick) + 10);
    expect(sick.visitors.reactions.some((r) => r.mood === 'concerned')).toBe(true);
    expect(sick.progress.reputation).toBeLessThan(good.progress.reputation);
    expect(sick.progress.reputation).toBeLessThan(rep0 + 1);
  });

  it('beauty affects satisfaction', () => {
    const pretty = goodShop(31, (o) => ({ ...o, beauty: 90 }));
    const plain = goodShop(31, (o) => ({ ...o, beauty: 20 }));
    // a quiet shop, so crowding (popular = busier) doesn't mask the effect
    pretty.progress.reputation = 40;
    plain.progress.reputation = 40;
    runHours(pretty, 11);
    runHours(plain, 11);
    expect(avgSat(pretty)).toBeGreaterThan(avgSat(plain) + 5);
  });

  it('repeat-species fatigue: four betta tanks draw and please less than four different species', () => {
    const varied = goodShop(41);
    const same = goodShop(41, (o) => ({ ...o, species: 'betta', waterClass: 'freshwater_planted', count: 1 }));
    const infos = (g: GameState) => g.tankOrder.map((id) => F.exhibitInfo(g, g.tanks[id]));
    expect(facilityAttraction(infos(varied))).toBeGreaterThan(facilityAttraction(infos(same)) * 1.4);
    runHours(varied, 11);
    runHours(same, 11);
    expect(avgSat(varied)).toBeGreaterThan(avgSat(same) + 4);
    expect(same.visitors.reactions.length).toBeGreaterThan(0);
  });
});

describe('facility: exhibit scoring', () => {
  it('a gorgeous, ethical 20-gallon outscores a messy 1,000-gallon tank', () => {
    const g = freshWorld('grand_hall');
    const small = addExhibit(g, { tierId: 'g20L', species: 'betta', beauty: 88, welfare: 96, signage: true, name: 'Jewel Box' });
    const big = addExhibit(g, { tierId: 'g1000', waterClass: 'marine_live_rock', species: 'ocellaris_clownfish', count: 12, beauty: 22, welfare: 44, sick: true, name: 'Big Mess' });
    big.cache.compatVerdict = 'incompatible';
    big.water.algae = 65;
    big.water.clarity = 0.5;
    const a = F.exhibitInfo(g, small);
    const b = F.exhibitInfo(g, big);
    expect(a.score).toBeGreaterThan(b.score);
    expect(a.appeal).toBeGreaterThan(b.appeal);
    const rep = F.exhibitScore(g, small.id);
    expect(rep.factors.length).toBeGreaterThanOrEqual(10);
    expect(rep.score).toBeCloseTo(a.score, 5);
    // even when the big tank is healthy-but-plain, size alone (diminishing returns) doesn't win
    big.cache.welfare = 90;
    for (const c of Object.values(g.creatures)) if (c.tankId === big.id) {
      c.stats.health = 95;
      c.stats.stress = 10;
      delete c.illness;
    }
    big.cache.status = 'good';
    big.cache.compatVerdict = 'excellent';
    expect(F.exhibitInfo(g, big).score).toBeLessThan(a.score);
    expect(F.sizeFactor(1000)).toBeCloseTo(1, 5);
    expect(F.sizeFactor(20)).toBeLessThan(0.4);
  });

  it('rarity never beats welfare: a suffering tank is capped hard', () => {
    const g = freshWorld();
    const t = addExhibit(g, { tierId: 'g29', waterClass: 'marine_live_rock', species: 'lined_seahorse', count: 2, beauty: 95, welfare: 30, sick: true });
    const info = F.exhibitInfo(g, t);
    expect(info.welfareGate).toBeLessThan(0.5);
    expect(info.concerned).toBe(true);
    expect(info.score).toBeLessThan(40);
  });

  it('has 60+ varied reaction lines', () => {
    expect(reactionLineCount()).toBeGreaterThanOrEqual(60);
  });
});

describe('facility: crowds, paths and removal', () => {
  it('capacity caps the crowd', () => {
    const g = goodShop(51, (o) => ({ ...o, beauty: 95, welfare: 99, signage: true }));
    g.progress.reputation = 1000;
    g.facility.admission = 0;
    const cap = 14;
    let maxOcc = 0;
    for (let i = 0; i < 44; i++) {
      runHours(g, 0.25);
      maxOcc = Math.max(maxOcc, g.visitors.live!.occupancy);
      expect(g.visitors.live!.occupancy).toBeLessThanOrEqual(cap + 1e-6);
    }
    expect(maxOcc).toBeGreaterThan(cap * 0.5);
    // admitted arrivals per hour can never exceed capacity / minimum dwell
    expect(g.visitors.today.count).toBeLessThanOrEqual((cap / 0.5) * 11 + 2);
  });

  it('blocked path: an enclosed exhibit gets no visitors and a warning', () => {
    const g = freshWorld('specialty_shop', 61);
    addExhibit(g, { tierId: 'g20L', name: 'Open Tank', species: 'pea_puffer', count: 3 });
    // A small tank in the back-left corner, then a big tank placed right against its glass (bypassing validation).
    const hid = addExhibit(g, { tierId: 'g10', name: 'Hidden Tank', species: 'betta', placement: { x: -3.9, z: -3.3, rotY: 0 } });
    const wall = createTank(g, 'g55', 'freshwater_planted', { cycled: true, name: 'Blocking 55', placement: { x: -3.6, z: -2.9, rotY: Math.PI } });
    wall.cache.beauty = 60;
    const reach = F.stateReachability(g);
    expect(reach.unreachable).toContain(hid.id);
    runHours(g, 11);
    expect(g.visitors.totalVisitors).toBeGreaterThan(0);
    expect(g.visitors.exhibit[hid.id]?.views ?? 0).toBe(0);
    expect(g.log.some((e) => e.kind === 'warning' && e.tankId === hid.id && /can’t reach/.test(e.text))).toBe(true);
    // placement validation refuses to create such a layout
    const check = F.validatePlacement(g, 'g55', { x: -3.6, z: -2.9, rotY: Math.PI }, wall.id);
    expect(check.ok).toBe(false);
  });

  it('an aquarium removed while visitors are viewing it is handled safely', () => {
    const g = goodShop(71);
    runHours(g, 4);
    const victim = g.tankOrder[1];
    expect(g.visitors.exhibit[victim]).toBeDefined();
    for (const c of Object.values(g.creatures)) if (c.tankId === victim) c.tankId = null;
    deleteTank(g, victim);
    expect(() => runHours(g, 30)).not.toThrow();
    expect(g.visitors.exhibit[victim]).toBeUndefined();
    expect(Number.isFinite(g.finance.money)).toBe(true);
  });
});

describe('facility: hobby room friend visits', () => {
  it('a healthy hobby room gets friendly visits with small tips', () => {
    const g = freshWorld('hobby_room', 81);
    addExhibit(g, { tierId: 'g10', beauty: 70 });
    const money0 = g.finance.money;
    runHours(g, 36);
    expect(g.progress.counters.friend_visits ?? 0).toBeGreaterThanOrEqual(1);
    expect(g.finance.money).toBeGreaterThan(money0);
    expect(g.visitors.reactions.length).toBeGreaterThan(0);
    expect(g.visitors.totalVisitors).toBe(0);
  });

  it('an unhealthy hobby room gets no friend visits', () => {
    const g = freshWorld('hobby_room', 82);
    const t = addExhibit(g, { tierId: 'g10', sick: true, welfare: 30 });
    t.cache.status = 'danger';
    runHours(g, 36);
    expect(g.progress.counters.friend_visits ?? 0).toBe(0);
  });
});

describe('facility: determinism', () => {
  it('same seed and steps give identical results', () => {
    const run = () => {
      const g = goodShop(91);
      runHours(g, 30, 0.37);
      return JSON.stringify({ v: g.visitors, m: g.finance.money, r: g.rngState, rep: g.progress.reputation });
    };
    expect(run()).toEqual(run());
  });

  it('large dt is substepped and never produces NaN', () => {
    const g = goodShop(92);
    const ctx = makeContext(g, 6);
    F.stepVisitors(g, 6, ctx);
    expect(Number.isFinite(g.visitors.today.satisfactionSum)).toBe(true);
    expect(Number.isFinite(g.visitors.live!.occupancy)).toBe(true);
  });
});
