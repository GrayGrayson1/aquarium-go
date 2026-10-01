/**
 * Staff lane — keepers, stock manager, docents, wages, notice, bond, determinism and old saves.
 * The store world (src/dev/fixtures/staff.ts) has 7 mixed tanks: planted community, axolotls, seahorses (tong-fed),
 * clownfish, a betta, a shrimp colony and pea puffers.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { advanceWorld } from '@/sim/world';
import { repairEquipment } from '@/sim/care';
import { noteInteraction } from '@/sim/life/actions';
import { dailyOperatingCost } from '@/sim/economy';
import { makeContext } from '@/sim/context';
import { stateHash } from '@/persistence';
import { migrateSave } from '@/persistence/migrations';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { staffStoreWorld, hireTeam, staffShop } from '@/dev/fixtures/staff';
import {
  addStaffDirect,
  assignTank,
  autoAssignAll,
  canHire,
  docentEffect,
  ensureStaff,
  fireStaff,
  hireStaff,
  keeperOf,
  refreshCandidates,
  setStockBudget,
  staffCapacity,
  staffLoad,
  staffWagesPerDay,
  stepStaff,
  todayLine,
} from '@/sim/staff';
import { STAFF_NOTICE_DAYS, staffWage } from '@/data/staff';

const alive = (g: GameState) => Object.values(g.creatures).filter((c) => c.status === 'alive');
const deadIds = (g: GameState) => new Set(Object.values(g.creatures).filter((c) => c.status === 'dead').map((c) => c.id));

/** The player's part: repair equipment the keepers flagged (repairs cost money, so they're the player's call). */
function playerRepairs(g: GameState): void {
  for (const id of g.tankOrder) for (const e of g.tanks[id].equipment) if (e.failed) repairEquipment(g, id, e.id);
}

function days(g: GameState, n: number, each?: (d: number) => void): void {
  for (let d = 0; d < n; d++) {
    advanceWorld(g, 24);
    playerRepairs(g);
    each?.(d);
  }
}

describe('staff: keepers', () => {
  it('keep a 7-tank store fed and its water in range for 14 game days, with no deaths', () => {
    for (const seed of [515151, 2024]) {
      const g = staffStoreWorld(seed);
      hireTeam(g);
      const before = deadIds(g);
      const counters = { ...g.progress.counters };
      let tankDays = 0;
      let waterDanger = 0;
      days(g, 14, () => {
        for (const id of g.tankOrder) {
          const t = g.tanks[id];
          tankDays++;
          // Equipment failures are flagged for the player; everything else is the keepers' job.
          if (t.cache.waterStatus === 'danger' && !/fail/i.test(t.cache.statusReason ?? '')) waterDanger++;
        }
      });
      const deaths = Object.values(g.creatures).filter((c) => c.status === 'dead' && !before.has(c.id));
      expect(deaths.map((c) => `${c.speciesId}: ${c.deathCause}`), `seed ${seed}`).toEqual([]);
      expect(waterDanger / tankDays, `seed ${seed} water danger share`).toBeLessThan(0.1);
      // Nobody is left in poor condition, and nobody is starving after the morning round.
      for (const c of alive(g)) expect(c.stats.health, `${c.name} (${c.speciesId})`).toBeGreaterThan(40);
      // Every tank in someone's care was fed on each of the last days.
      const keepers = g.staff!.roster.filter((m) => m.role === 'aquarist');
      const assigned = keepers.flatMap((m) => m.tankIds);
      expect(new Set(assigned).size).toBe(g.tankOrder.length);
      for (const m of keepers) expect(m.totals!.feeds).toBeGreaterThanOrEqual(m.tankIds.length * 2 * 12);
      // Staff care is not the player's: feed / water-change quests, mastery and achievements don't move.
      for (const k of ['feeds', 'waterChanges', 'cleanings', 'topOffs', 'targetFeeds']) expect(g.progress.counters[k], k).toBe(counters[k]);
      expect(findNonFinite(g)).toEqual([]);
    }
  }, 60_000);

  it('make a real difference: the same store with nobody hired goes hungry', () => {
    const g = staffStoreWorld(515151);
    advanceWorld(g, 24 * 4);
    const starving = alive(g).filter((c) => c.stats.hunger >= 85).length + Object.values(g.creatures).filter((c) => c.status === 'dead').length;
    expect(starving).toBeGreaterThan(5);
  });

  it('feed from the cupboard through feedTank and say so honestly when a food runs out', () => {
    const g = staffStoreWorld(77);
    hireTeam(g);
    // Take away everything the seahorses and pea puffers eat.
    for (const id of ['mysis_frozen', 'brine_frozen', 'bloodworm_frozen']) delete g.inventory.foods[id];
    setStockBudget(g, 0);
    const flakes = g.inventory.foods.flake_tropical;
    advanceWorld(g, 26);
    expect(g.inventory.foods.flake_tropical).toBeLessThan(flakes);
    const warn = g.log.find((e) => /couldn’t feed/.test(e.text));
    expect(warn?.text).toMatch(/nothing in stock they eat/);
    const issues = g.staff!.roster.flatMap((m) => m.today?.issues ?? []);
    expect(issues.some((t) => /No food for/.test(t))).toBe(true);
  });

  it('never raise the keeper bond — only the player’s own hand care does', () => {
    const g = staffStoreWorld(2024);
    hireTeam(g);
    const bond = new Map(alive(g).map((c) => [c.id, c.life?.bond ?? 0]));
    advanceWorld(g, 24 * 4);
    for (const c of alive(g)) if (bond.has(c.id)) expect(c.life?.bond ?? 0, c.name).toBeLessThanOrEqual(bond.get(c.id)! + 1e-9);
    const c = alive(g)[0];
    const b0 = c.life?.bond ?? 0;
    noteInteraction(g, c.id, 'target_fed');
    expect(c.life!.bond!).toBeGreaterThan(b0);
  });

  it('respect capacity and one keeper per tank', () => {
    const g = staffStoreWorld();
    const a = addStaffDirect(g, { name: 'Ana Test', role: 'aquarist', skill: 1, trait: 'meticulous' });
    const load = staffLoad(g, a);
    expect(load.used).toBeLessThanOrEqual(load.capacity);
    const b = addStaffDirect(g, { name: 'Ben Test', role: 'aquarist', skill: 5, trait: 'gentle_hands', tankIds: [] });
    const t = g.tankOrder.find((id) => a.tankIds.includes(id))!;
    expect(assignTank(g, b.id, t, true).ok).toBe(true);
    expect(keeperOf(g, t)?.id).toBe(b.id);
    expect(a.tankIds).not.toContain(t);
    // A skill-1 keeper can't take the whole floor.
    let refused = 0;
    for (const id of g.tankOrder) if (!assignTank(g, a.id, id, true).ok) refused++;
    expect(refused).toBeGreaterThan(0);
    expect(staffLoad(g, a).used).toBeLessThanOrEqual(staffLoad(g, a).capacity + 1e-6);
  });

  it('handle a huge time step (offline catch-up) deterministically', () => {
    const g = staffStoreWorld(9);
    hireTeam(g);
    const ctx = makeContext(g, 30);
    stepStaff(g, 30, ctx); // one call covering two mornings and an evening
    const m = g.staff!.roster.find((x) => x.role === 'aquarist')!;
    expect(m.totals!.feeds).toBeGreaterThanOrEqual(m.tankIds.length * 2);
    expect(findNonFinite(g)).toEqual([]);
  });
});

describe('staff: wages', () => {
  it('are part of the daily bills and paid at midnight as one Wages line', () => {
    const g = staffStoreWorld();
    hireTeam(g);
    const wages = staffWagesPerDay(g);
    expect(wages.total).toBe(g.staff!.roster.reduce((a, m) => a + m.wage, 0));
    const ops = dailyOperatingCost(g);
    expect(ops.wages).toBe(wages.total);
    expect(ops.total).toBeGreaterThanOrEqual(ops.rent + wages.total);
    advanceWorld(g, 24);
    const lines = g.finance.ledger.filter((e) => e.memo.startsWith('Wages'));
    expect(lines.length).toBe(1);
    expect(lines[0].amount).toBeCloseTo(-wages.total, 2);
    expect(lines[0].category).toBe('operating');
    // Balance guide: aquarist $60–160, stock manager $40–80, docent $70–140.
    expect([staffWage('aquarist', 1), staffWage('aquarist', 5)]).toEqual([60, 160]);
    expect([staffWage('stock_manager', 1), staffWage('stock_manager', 5)]).toEqual([40, 80]);
    expect([staffWage('docent', 1), staffWage('docent', 5)]).toEqual([70, 140]);
  });

  it('never create debt: unpaid staff give notice, then leave, and their tanks come back to the player', () => {
    const g = staffStoreWorld(31);
    g.facility.openToPublic = false; // no income
    addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 3, trait: 'meticulous' });
    g.finance.money = 0;
    // The club's one-time loan is already used, so nobody pays the team this time (the rescue path is S05-11's test).
    g.finance.loan = { amount: 500, outstanding: 0, takenHour: 0, repaidHour: 0 };
    for (let d = 1; d <= STAFF_NOTICE_DAYS; d++) {
      advanceWorld(g, 24);
      expect(g.finance.ledger.some((e) => e.memo.startsWith('Wages')), `day ${d}`).toBe(false);
      if (d < STAFF_NOTICE_DAYS) expect(g.staff!.roster.length).toBe(1);
    }
    expect(g.log.some((e) => /wasn’t enough cash to pay Maya/.test(e.text))).toBe(true);
    expect(g.staff!.roster.length).toBe(0);
    expect(g.staff!.departed?.at(-1)).toMatchObject({ name: 'Maya Okafor', reason: 'unpaid' });
    expect(g.log.some((e) => /Maya Okafor has left/.test(e.text) && /feed and clean them yourself/.test(e.text))).toBe(true);
    expect(g.log.some((e) => /animals are safe/.test(e.text))).toBe(false);
    for (const id of g.tankOrder) expect(keeperOf(g, id)).toBeNull();
  });

  it('grow skill slowly with experience (and the wage with it)', () => {
    const g = staffStoreWorld(5);
    const m = addStaffDirect(g, { name: 'Luis Nakamura', role: 'docent', skill: 1, trait: 'quick_learner' });
    days(g, 7);
    expect(m.skill).toBe(2);
    expect(m.wage).toBe(staffWage('docent', 2));
    expect(g.log.some((e) => /Luis Nakamura has grown into a ★★ docent/.test(e.text))).toBe(true);
  });
});

describe('staff: stock manager', () => {
  it('reorders what the animals eat and never spends past the daily budget', () => {
    const g = staffStoreWorld(4040);
    hireTeam(g);
    for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 3;
    g.inventory.salt = 0;
    setStockBudget(g, 30);
    const spentByDay = new Map<number, number>();
    days(g, 5);
    for (const e of g.finance.ledger) {
      if (!/ordered by/.test(e.memo)) continue;
      const day = Math.floor(e.hour / 24);
      spentByDay.set(day, (spentByDay.get(day) ?? 0) - e.amount);
    }
    expect(spentByDay.size).toBeGreaterThan(0);
    for (const [day, v] of spentByDay) expect(v, `day ${day}`).toBeLessThanOrEqual(30 + 1e-6);
    expect(g.log.some((e) => /stock budget is spent/.test(e.text))).toBe(true);
  });

  it('keeps the shelves stocked with a sensible budget (no "No food left" for anyone)', () => {
    const g = staffStoreWorld(4041);
    hireTeam(g);
    for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 2;
    setStockBudget(g, 150);
    days(g, 3);
    for (const id of g.tankOrder) expect(g.tanks[id].cache.foodLevel, g.tanks[id].name).not.toBe('out');
    // ...without hoarding: a few days' worth of each food in use, not months.
    const total = Object.values(g.inventory.foods).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(2500);
  });

  it('buys nothing with a zero budget', () => {
    const g = staffStoreWorld(4042);
    hireTeam(g);
    setStockBudget(g, 0);
    for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 1;
    days(g, 2);
    expect(g.finance.ledger.some((e) => /ordered by/.test(e.memo))).toBe(false);
  });
});

describe('staff: docents', () => {
  it('lift satisfaction, donations and talk at exhibits, within bounds', () => {
    const run = (docent: boolean) => {
      const g = staffStoreWorld(88);
      addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 5, trait: 'meticulous' });
      addStaffDirect(g, { name: 'Theo Lindqvist', role: 'aquarist', skill: 3, trait: 'gentle_hands' });
      if (docent) addStaffDirect(g, { name: 'Jonah Mensah', role: 'docent', skill: 3, trait: 'great_with_kids' });
      autoAssignAll(g);
      days(g, 6);
      const hist = g.visitors.history.slice(-5);
      return { g, sat: hist.reduce((a, h) => a + h.avgSatisfaction, 0) / Math.max(1, hist.length) };
    };
    const without = run(false);
    const withDocent = run(true);
    expect(withDocent.sat).toBeGreaterThan(without.sat + 2);
    const d = withDocent.g.staff!.roster.find((m) => m.role === 'docent')!;
    expect(d.totals!.talks).toBeGreaterThanOrEqual(12);
    expect(withDocent.g.visitors.reactions.some((r) => /talk/.test(r.text))).toBe(true);
    const eff = docentEffect(withDocent.g, withDocent.g.clock.hour)!;
    expect(eff.sat).toBeLessThanOrEqual(8);
    expect(eff.donation).toBeLessThanOrEqual(1.9);
    expect(eff.draw).toBeLessThanOrEqual(1.08);
    advanceWorld(withDocent.g, 10); // into the afternoon: today's talks have happened
    expect(todayLine(withDocent.g, d) ?? '').toMatch(/talk/);
  });
});

describe('staff: hiring pool, capacity and saves', () => {
  it('offers a deterministic candidate pool once the shop unlocks staff, without touching the main RNG', () => {
    const a = staffShop();
    const b = staffShop();
    expect(a.staff!.candidates.map((c) => `${c.name}/${c.role}/${c.skill}/${c.trait}/${c.wage}`)).toEqual(b.staff!.candidates.map((c) => `${c.name}/${c.role}/${c.skill}/${c.trait}/${c.wage}`));
    expect(a.staff!.candidates.some((c) => c.role === 'aquarist')).toBe(true);
    const rng = a.rngState;
    refreshCandidates(a);
    expect(a.rngState).toBe(rng);
  });

  it('caps the team by facility level and allows one stock manager', () => {
    const g = staffShop();
    expect(staffCapacity(g)).toBe(2);
    const st = ensureStaff(g);
    const stock = st.candidates.find((c) => c.role === 'stock_manager')!;
    expect(hireStaff(g, stock.id).ok).toBe(true);
    const aq = st.candidates.find((c) => c.role === 'aquarist')!;
    expect(hireStaff(g, aq.id).ok).toBe(true);
    expect(keeperOf(g, g.tankOrder[0])).not.toBeNull();
    refreshCandidates(g);
    const next = st.candidates[0];
    expect(canHire(g, next).ok).toBe(false);
    expect(hireStaff(g, next.id).ok).toBe(false);
    // Letting someone go returns their tanks to the player.
    const keeper = st.roster.find((m) => m.role === 'aquarist')!;
    const tanks = [...keeper.tankIds];
    expect(fireStaff(g, keeper.id).ok).toBe(true);
    for (const id of tanks) expect(keeperOf(g, id)).toBeNull();
  });

  it('is deterministic: same world + same hires → same hash', () => {
    const run = () => {
      const g = staffStoreWorld(123);
      hireTeam(g);
      advanceWorld(g, 60);
      return stateHash(g);
    };
    expect(run()).toBe(run());
  });

  it('loads old saves without staff and repairs broken staff data', () => {
    const g = staffStoreWorld(321);
    delete g.staff;
    const old = migrateSave(JSON.parse(JSON.stringify(g))).state;
    expect(old.staff).toBeUndefined();
    advanceWorld(old, 30); // lazily creates the pool (staff is unlocked at store level)
    expect(old.staff?.candidates.length).toBeGreaterThan(0);
    expect(old.staff?.roster).toEqual([]);

    const broken = JSON.parse(JSON.stringify(g)) as GameState & { staff: unknown };
    (broken as { staff: unknown }).staff = { roster: [{ id: 'stf_x', role: 'aquarist', name: 'Ghost', skill: 99, wage: 'lots', tankIds: ['nope'] }, 7], candidates: 'x' };
    const fixed = migrateSave(broken).state;
    expect(fixed.staff!.roster).toHaveLength(1);
    expect(fixed.staff!.roster[0].skill).toBe(5);
    expect(fixed.staff!.roster[0].tankIds).toEqual([]);
    expect(fixed.staff!.candidates).toEqual([]);
    advanceWorld(fixed, 26);
    expect(findNonFinite(fixed)).toEqual([]);
  });
});
