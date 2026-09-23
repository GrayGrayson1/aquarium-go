/**
 * lane:staff2 — keeper feeding balance: animals in a keeper's care are never chronically hungry.
 *
 * Before this pass, keepers fed at 8 AM and 6 PM only, trimmed every portion by 30% at any trace of ammonia, sized a
 * slow feeder's food as if its faster tank-mates wouldn't touch it, and gave the hungriest fish a tong portion on top
 * of their full share of the shared meal. In a staffed big_facility ~23% of tank-hours showed a hungry animal (discus
 * 71%, guppies 61%); on the fast-feeder floor below ~34%, with the chromis reef in water DANGER a third of the time.
 * Now fast-metabolism tanks get 3–4 smaller meals a day (src/sim/staff/work.ts `mealsPerDay`), portions are trimmed
 * only at ammonia / nitrite WATCH, tong portions take turns and the shared meal is sized for everyone who eats it,
 * and background tanks take a fresh meal's first bites before it starts to rot (src/sim/world.ts).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, StaffMember, StaffRole, StaffTrait } from '@/types';
import { advanceWorld } from '@/sim/world';
import { repairEquipment } from '@/sim/care';
import { stateHash } from '@/persistence';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { staffStoreWorld, hireTeam, staffUpLateGame, FAST_FEEDER_TANKS } from '@/dev/fixtures/staff';
import { bigFacility } from '@/dev/fixtures/core-fixtures';
import { addStaffDirect, keeperFeed, keeperOf, keeperVisits, mealsPerDay, roundVisits } from '@/sim/staff';
import { ANIMAL_THRESHOLDS } from '@/sim/tankStatus';
import { getWaterReport } from '@/sim/water';

const HUNGRY = ANIMAL_THRESHOLDS.hungryHunger; // "very hungry"
/** Water parameters that too much (or rotting) food pushes into DANGER. */
const FEEDING_PARAMS = new Set(['ammonia', 'nitrite', 'nitrate', 'oxygen', 'clarity', 'ph']);
const STARVING = ANIMAL_THRESHOLDS.starvingHunger;

const FAST_TEAM: { name: string; role: StaffRole; skill: number; trait: StaffTrait }[] = [
  { name: 'Ines Park', role: 'aquarist', skill: 2, trait: 'gentle_hands' },
  { name: 'Kai Osei', role: 'aquarist', skill: 3, trait: 'algae_hunter' },
  { name: 'Priya Rahman', role: 'stock_manager', skill: 3, trait: 'planner' },
];

function fastFloor(seed: number): GameState {
  const g = staffStoreWorld(seed, FAST_FEEDER_TANKS);
  hireTeam(g, FAST_TEAM);
  return g;
}

const tankNamed = (g: GameState, name: string) => Object.values(g.tanks).find((t) => t.name === name)!;
const residents = (g: GameState, tankId: string, speciesId?: string) =>
  Object.values(g.creatures).filter((c) => c.tankId === tankId && c.status === 'alive' && (!speciesId || c.speciesId === speciesId));

interface Tally {
  tankHours: number;
  hungry: number;
  starving: number;
  waterDanger: number;
  perTank: Map<string, { hours: number; hungry: number }>;
}

/**
 * Play `days` game days hour by hour (after a warm-up day), counting the tank-hours in which any animal in a keeper's
 * tank reads "very hungry" or worse, and water DANGER in what feeding affects. Failed equipment is the player's call
 * (repaired once a day here); the half day after a failure isn't counted.
 */
function tally(g: GameState, days: number): Tally {
  const t: Tally = { tankHours: 0, hungry: 0, starving: 0, waterDanger: 0, perTank: new Map() };
  const lastFailure = new Map<string, number>();
  for (let h = 0; h < (days + 1) * 24; h++) {
    advanceWorld(g, 1);
    for (const id of g.tankOrder) if (g.tanks[id].equipment.some((e) => e.failed)) lastFailure.set(id, g.clock.hour);
    if (h % 24 === 23) for (const id of g.tankOrder) for (const e of g.tanks[id].equipment) if (e.failed) repairEquipment(g, id, e.id);
    if (h < 24) continue;
    for (const id of g.tankOrder) {
      if (!keeperOf(g, id)) continue;
      const tank = g.tanks[id];
      const p = t.perTank.get(tank.name) ?? { hours: 0, hungry: 0 };
      t.perTank.set(tank.name, p);
      p.hours++;
      t.tankHours++;
      const worst = Math.max(0, ...residents(g, id).map((c) => c.stats.hunger));
      if (worst >= HUNGRY) {
        t.hungry++;
        p.hungry++;
      }
      if (worst >= STARVING) t.starving++;
      // Water DANGER in anything feeding can cause (rotting food, overfeeding). A failed filter or heater is flagged
      // for the player, whose repair is the fix; the low oxygen or heat it leaves behind for a while isn't feeding's.
      const recentFailure = g.clock.hour - (lastFailure.get(id) ?? -1e9) < 12;
      if (!recentFailure && tank.cache.waterStatus === 'danger' && getWaterReport(g, id).params.some((q) => q.status === 'danger' && FEEDING_PARAMS.has(q.key))) t.waterDanger++;
    }
  }
  return t;
}

const share = (n: number, d: number) => n / Math.max(1, d);
const perTankLine = (t: Tally) => [...t.perTank].map(([n, p]) => `${n} ${((100 * p.hungry) / p.hours).toFixed(1)}%`).join(', ');

describe('staff2: keepers keep fast-metabolism animals fed', () => {
  it('a staffed floor of discus, chromis, guppies, tetras and seahorses: hungry under 3% of tank-hours over 10 days, nobody starving, no water DANGER', () => {
    for (const seed of [11, 22, 33]) {
      const g = fastFloor(seed);
      const counters = { ...g.progress.counters };
      const bond = new Map(Object.values(g.creatures).map((c) => [c.id, c.life?.bond ?? 0]));
      const t = tally(g, 10);
      expect(share(t.hungry, t.tankHours), `seed ${seed}: ${perTankLine(t)}`).toBeLessThan(0.03);
      expect(t.starving, `seed ${seed} starving tank-hours`).toBe(0);
      expect(t.waterDanger, `seed ${seed} water DANGER tank-hours`).toBe(0);
      const starved = Object.values(g.creatures).filter((c) => c.status === 'dead' && /enough food/.test(c.deathCause ?? ''));
      expect(starved.map((c) => c.name), `seed ${seed}`).toEqual([]);
      // Staff care is never the player's own: no quest / mastery counters, no bond.
      for (const k of ['feeds', 'targetFeeds', 'waterChanges', 'cleanings', 'topOffs']) expect(g.progress.counters[k], k).toBe(counters[k]);
      for (const c of Object.values(g.creatures)) if (bond.has(c.id)) expect(c.life?.bond ?? 0, c.name).toBeLessThanOrEqual(bond.get(c.id)! + 1e-9);
      expect(findNonFinite(g)).toEqual([]);
    }
  }, 120_000);

  it('the staffed big_facility grand hall (the QA world: ~23% hungry before) stays under 3%', () => {
    const g = staffUpLateGame(bigFacility());
    const t = tally(g, 10);
    expect(share(t.hungry, t.tankHours), perTankLine(t)).toBeLessThan(0.03);
    expect(share(t.starving, t.tankHours), 'starving').toBeLessThan(0.005);
    for (const name of ['Grand Reef', 'Discus Lounge', 'Guppy Line', 'Goldfish Pavilion', 'Seahorse Gallery']) {
      const p = t.perTank.get(name)!;
      expect(share(p.hungry, p.hours), name).toBeLessThan(0.03);
    }
    expect(t.waterDanger, 'water DANGER tank-hours').toBe(0);
  }, 120_000);

  it('the staff_store floor (~5% hungry before) stays under 3% on several seeds', () => {
    for (const seed of [515151, 2024]) {
      const g = staffStoreWorld(seed);
      hireTeam(g);
      const t = tally(g, 10);
      expect(share(t.hungry, t.tankHours), `seed ${seed}: ${perTankLine(t)}`).toBeLessThan(0.03);
      expect(t.starving, `seed ${seed}`).toBe(0);
    }
  }, 120_000);

  it('is deterministic', () => {
    const run = () => {
      const g = fastFloor(7);
      advanceWorld(g, 60);
      return stateHash(g);
    };
    expect(run()).toBe(run());
  });
});

describe('staff2: meals a day follow metabolism', () => {
  it('fast feeders get 4 meals, tetras 3, slow-metabolism animals the usual 2', () => {
    const g = fastFloor(11);
    const meals = (name: string) => mealsPerDay(g, tankNamed(g, name).id);
    expect(meals('Discus Lounge')).toBe(4);
    expect(meals('Chromis Reef')).toBe(4);
    expect(meals('Guppy Line')).toBe(4);
    expect(meals('Seahorse Gallery')).toBe(4);
    expect(meals('Tetra School')).toBe(3);
    expect(meals('Betta Nook')).toBe(2);
    const s = staffStoreWorld(515151);
    for (const name of ['Axolotl Lagoon', 'Clown Reef', 'Betta Row', 'Pea Puffer Pod']) expect(mealsPerDay(s, tankNamed(s, name).id), name).toBe(2);
    expect(mealsPerDay(s, tankNamed(s, 'Amazon Stream').id)).toBe(3);
    // Juveniles burn food a quarter faster: a clownfish tank of youngsters gets a late snack.
    for (const c of residents(s, tankNamed(s, 'Clown Reef').id, 'ocellaris_clownfish')) c.lifeStage = 'juvenile';
    expect(mealsPerDay(s, tankNamed(s, 'Clown Reef').id)).toBe(3);
  });

  it('schedules the extra rounds only for the tanks that need them, each tank in its own fixed slot', () => {
    const g = fastFloor(11);
    const discus = tankNamed(g, 'Discus Lounge').id;
    const tetras = tankNamed(g, 'Tetra School').id;
    const betta = tankNamed(g, 'Betta Nook').id;
    g.staff!.roster = g.staff!.roster.filter((m) => m.role !== 'aquarist');
    const m: StaffMember = addStaffDirect(g, { name: 'Dev Test', role: 'aquarist', skill: 3, trait: 'gentle_hands', tankIds: [betta, tetras, discus] });
    const at = (tankId: string) => keeperVisits(g, m).filter((v) => v.tankId === tankId).map((v) => `${v.round}@${(v.hour % 24).toFixed(1)}`);
    expect(at(discus)).toEqual(['morning@8.6', 'midday@13.6', 'evening@18.6', 'late@21.6']);
    expect(at(tetras)).toEqual(['morning@8.3', 'evening@18.3', 'late@21.3']);
    expect(at(betta)).toEqual(['morning@8.0', 'evening@18.0']);
    expect(roundVisits(g, m, 'late').map((v) => v.tankId)).toEqual([tetras, discus]);
    // A new arrival that needs a midday meal never moves another tank's visit (nobody skipped or fed twice).
    const before = at(tetras);
    for (const c of residents(g, betta)) c.lifeStage = 'juvenile'; // a young betta: still 2 meals (20 h / 1.25 = 16 h)
    expect(at(betta)).toEqual(['morning@8.0', 'evening@18.0']);
    const fry = residents(g, discus, 'discus')[0];
    fry.tankId = betta; // (test shortcut) a discus in the betta tank → it joins the midday and late rounds
    expect(at(betta)).toEqual(['morning@8.0', 'midday@13.0', 'evening@18.0', 'late@21.0']);
    expect(at(tetras)).toEqual(before);
    // A meticulous keeper still checks every tank at midday.
    m.trait = 'meticulous';
    expect(roundVisits(g, m, 'midday').map((v) => v.tankId)).toEqual([betta, tetras, discus]);
  });

  it('a full day of rounds feeds a discus tank four times', () => {
    const g = fastFloor(11);
    const discus = tankNamed(g, 'Discus Lounge').id;
    const keeper = keeperOf(g, discus)!;
    advanceWorld(g, 1); // → 8 AM
    const before = new Set((g.staff!.feeds ?? []).map((f) => f.seq));
    const hours: number[] = [];
    for (let h = 0; h < 96; h++) {
      advanceWorld(g, 0.25); // small steps: the feed ring keeps only the last 16 feeds
      for (const f of g.staff!.feeds) if (!before.has(f.seq) && f.tankId === discus && !f.targetCreatureId) {
        before.add(f.seq);
        hours.push(Math.floor(f.hour % 24));
      }
    }
    expect(keeper.role).toBe('aquarist');
    expect([...new Set(hours)]).toEqual([8, 13, 18, 21]);
  });
});

describe('staff2: how a keeper portions a meal', () => {
  /** Servings of `foodId` one keeper meal uses in this tank. */
  const servingsUsed = (g: GameState, tankName: string) => {
    const tank = tankNamed(g, tankName);
    const m = keeperOf(g, tank.id)!;
    const before = { ...g.inventory.foods };
    keeperFeed(g, m, tank, 'meal', g.clock.hour);
    return Object.keys(before).reduce((a, k) => a + (before[k] - (g.inventory.foods[k] ?? 0)), 0);
  };

  it('does not trim portions at a trace of ammonia (report GOOD), only at WATCH or worse', () => {
    const base = fastFloor(11);
    const tank = tankNamed(base, 'Discus Lounge');
    for (const c of residents(base, tank.id)) c.stats.hunger = 60;
    const run = (ammonia: number) => {
      const g = structuredClone(base);
      tankNamed(g, 'Discus Lounge').water.ammonia = ammonia;
      const status = getWaterReport(g, tank.id).params.find((p) => p.key === 'ammonia')!.status;
      return { servings: servingsUsed(g, 'Discus Lounge'), status };
    };
    const clean = run(0);
    const trace = run(0.1);
    const high = run(1.5);
    expect(trace.status).toBe('good');
    expect(trace.servings).toBe(clean.servings);
    expect(high.status).not.toBe('good');
    expect(high.servings).toBeLessThan(clean.servings * 0.8);
  });

  it('gives an outlier its own tong portion, taking turns, and doesn’t feed it twice from the shared meal', () => {
    const g = fastFloor(11);
    const tank = tankNamed(g, 'Discus Lounge');
    const [a, b, c, d] = residents(g, tank.id, 'discus');
    a.stats.hunger = 95;
    b.stats.hunger = 95;
    c.stats.hunger = 35;
    d.stats.hunger = 35;
    a.life = { ...(a.life ?? {}), targetFedUntil: g.clock.hour - 2 }; // a had the tongs on the last round
    const m = keeperOf(g, tank.id)!;
    const seq0 = g.staff!.seq;
    keeperFeed(g, m, tank, 'meal', g.clock.hour);
    const tongs = g.staff!.feeds.filter((f) => f.seq > seq0 && f.targetCreatureId).map((f) => f.targetCreatureId);
    expect(tongs).toEqual([b.id]); // one of four may be tonged per round; b's turn
    // Everyone eats: step the tank as a background tank would be.
    advanceWorld(g, 2);
    for (const x of [a, b, c, d]) expect(x.stats.hunger, x.name).toBeLessThan(35);
  });

  it('sizes a slow feeder’s food for the faster tank-mates that eat it too (firefish beside a chromis school)', () => {
    const g = fastFloor(22);
    const tank = tankNamed(g, 'Chromis Reef');
    for (const c of residents(g, tank.id)) c.stats.hunger = 55;
    const m = keeperOf(g, tank.id)!;
    keeperFeed(g, m, tank, 'meal', g.clock.hour);
    advanceWorld(g, 2);
    const firefish = residents(g, tank.id, 'firefish');
    const chromis = residents(g, tank.id, 'green_chromis');
    expect(firefish.length).toBeGreaterThan(0);
    for (const f of firefish) expect(f.stats.hunger, f.name).toBeLessThan(30);
    for (const f of chromis) expect(f.stats.hunger, f.name).toBeLessThan(30);
    // ...without flooding the tank: the leftovers are small.
    expect(tank.water.foodInWater).toBeLessThan(150);
  });

  it('looks ahead: feeds a not-yet-hungry fish that would be very hungry before the next visit', () => {
    const g = fastFloor(11);
    const tank = tankNamed(g, 'Guppy Line');
    for (const c of residents(g, tank.id)) c.stats.hunger = 15; // below the usual "hungry enough" line of 20
    const m = keeperOf(g, tank.id)!;
    const now = structuredClone(g);
    const seq0 = g.staff!.seq;
    keeperFeed(g, m, tank, 'meal', g.clock.hour, 0);
    expect(g.staff!.seq).toBe(seq0); // no look-ahead: skipped
    const m2 = keeperOf(now, tank.id)!;
    keeperFeed(now, m2, tankNamed(now, 'Guppy Line'), 'meal', now.clock.hour, 11); // the 9 PM → 8 AM night
    expect(now.staff!.seq).toBeGreaterThan(seq0);
  });
});

describe('staff2: meals dropped into background tanks', () => {
  it('are eaten before they rot, as in the focused tank', () => {
    const run = (focus: boolean) => {
      const g = fastFloor(33);
      const tank = tankNamed(g, 'Discus Lounge');
      for (const c of residents(g, tank.id)) c.stats.hunger = 70;
      const m = keeperOf(g, tank.id)!;
      keeperFeed(g, m, tank, 'meal', g.clock.hour);
      const nh3 = tank.water.ammonia;
      advanceWorld(g, 3, focus ? { focusTankId: tank.id } : {});
      const hs = residents(g, tank.id).map((c) => c.stats.hunger);
      return { hunger: hs.reduce((x, y) => x + y, 0) / hs.length, dNH3: tank.water.ammonia - nh3 };
    };
    const focused = run(true);
    const background = run(false);
    expect(background.hunger).toBeLessThan(focused.hunger + 3);
    expect(background.dNH3).toBeLessThan(focused.dNH3 + 0.02);
  });
});
