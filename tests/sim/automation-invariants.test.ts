/**
 * lane:automation (chunk 3) — invariants every automation job keeps (AUTO-016, AUTO-017, AUTO-018, AUTO-022, AUTO-023,
 * AUTO-026), checked on the Auto Water Changer, chunk 3's scheduled job. Production lines (chunk 4) add their cases.
 *
 * - Game time, any partition (AUTO-016): random step sizes give the same runs, hours and salt use. The whole stateHash
 *   can't match across partitions (the water chemistry integrates in steps), so it's compared for identical runs.
 * - Tracked resources only (AUTO-017): money moves only through the ledger; salt only through the changes, each the
 *   amount a change of that share needs; a skipped change says so.
 * - Last-run markers (AUTO-018, AUTO-023, AUTO-026): a window stepped again does nothing more; a crossing on a step
 *   boundary runs once; a save without markers runs once at the next lights-on, never a burst; save and load right
 *   after a run changes nothing.
 * - One unit, one job (AUTO-022): two changes due in the same step with salt for one: one runs, one reports.
 *
 * Production lines (chunk 4) add their cases at the end: random partitions give the same moves, sorts and listings
 * (counts exact, hours within one game hour, since the breeding sim raises a brood inside a sub-step), offline equals
 * live, money only through the ledger, and an hour stepped again does nothing.
 *
 * Only src/sim, src/data, src/types and src/persistence are imported (no React or DOM).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { stepTank, advanceWorld } from '@/sim/world';
import { createCreature, addCreature } from '@/sim/life';
import { starterAquascape } from '@/sim/aquascape';
import { installEquipment } from '@/sim/care';
import { computeTankEnv } from '@/sim/water/env';
import { runWaterChanger } from '@/sim/water/step';
import { changeSaltNeed } from '@/sim/water/change';
import { makeContext } from '@/sim/context';
import { simRng, mulberry32 } from '@/sim/rng';
import { clonePlain } from '@/sim/economy/util';
import { simulateOffline } from '@/persistence/offline';
import { encodeRecord, decodeRecord, stateHash } from '@/persistence';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { stepProduction } from '@/sim/production';
import { lineFarm, lineRecord } from './support/production';
import { facility, run } from './support/automation'; // chunk 5
import { stepAutomation, waterRoom } from '@/sim/automation';
import { createClutch } from '@/sim/life/breeding/clutch';
import { getSpecies } from '@/data/species';

const OUT_OF_SALT = (tank: string) => `${tank}: the Auto Water Changer is out of salt. Buy marine salt to keep it running.`;

function world(o: { marine?: boolean; salt?: number; tanks?: number; seed?: number } = {}): { s: GameState; tanks: Tank[] } {
  const s: GameState = newGame({ starterId: 'betta', starterName: 'T', seed: o.seed ?? 9 });
  for (const id of Object.keys(s.creatures)) delete s.creatures[id];
  for (const id of [...s.tankOrder]) delete s.tanks[id];
  s.tankOrder = [];
  s.log = [];
  s.isShowcase = false; // a played game (a loaded save always carries the flag)
  s.clock.hour = 24 * 3 + 2;
  s.inventory.foods = { flake_tropical: 3000, marine_pellets: 3000 };
  s.inventory.salt = o.salt ?? 0;
  const rng = simRng(s);
  const tanks: Tank[] = [];
  for (let i = 0; i < (o.tanks ?? 1); i++) {
    const t = createTank(s, 'g20L', o.marine ? 'marine_fowlr' : 'freshwater_tropical', { cycled: true, placement: { x: i * 2, z: 0, rotY: 0 } });
    t.decor = starterAquascape(s, 'generic', t);
    t.lighting.onHour = 8;
    t.lighting.offHour = 20;
    installEquipment(s, t.id, 'auto_water_changer', { purchased: true });
    installEquipment(s, t.id, 'autofeeder', { purchased: true });
    for (let k = 0; k < 3; k++) addCreature(s, createCreature(s, rng, o.marine ? 'ocellaris_clownfish' : 'neon_tetra', { ageDays: 60 }), t.id);
    tanks.push(t);
  }
  return { s, tanks };
}

/** Step one tank in background pieces of the given sizes (cycled), recording each change and scrape as it lands. */
function stepWith(s: GameState, tank: Tank, hours: number, sizes: () => number) {
  const changes: number[] = [];
  const scrapes: number[] = [];
  let done = 0;
  while (done < hours - 1e-9) {
    const dt = Math.min(sizes(), hours - done);
    s.clock.hour += dt;
    stepTank(s, tank, dt, 'summary', s.clock.hour);
    done += dt;
    const lab = tank.water.lab ?? {};
    if (lab.lastAutoChangeHour !== undefined && changes[changes.length - 1] !== lab.lastAutoChangeHour) changes.push(lab.lastAutoChangeHour);
    if (lab.lastAutoScrapeHour !== undefined && scrapes[scrapes.length - 1] !== lab.lastAutoScrapeHour) scrapes.push(lab.lastAutoScrapeHour);
  }
  return { changes, scrapes };
}

describe('AUTO-016: game time, any partition', () => {
  it('random step sizes (0.05–4 h) give the same changes, scrapes and salt as half-hour steps', () => {
    const base = world({ marine: true, salt: 60, seed: 4 });
    const ref = clonePlain(base.s);
    const refRun = stepWith(ref, ref.tanks[base.tanks[0].id], 24 * 9, () => 0.5);
    expect(refRun.changes).toHaveLength(9);
    for (const seed of [1, 2, 3]) {
      const s = clonePlain(base.s);
      const rnd = mulberry32(seed);
      const run = stepWith(s, s.tanks[base.tanks[0].id], 24 * 9, () => 0.05 + rnd.next() * 3.95);
      expect(run.changes).toEqual(refRun.changes);
      expect(run.scrapes).toEqual(refRun.scrapes);
      expect(Math.abs(s.inventory.salt - ref.inventory.salt)).toBeLessThan(0.05);
    }
  });

  it('identical runs end with the same stateHash', () => {
    const a = world({ marine: true, salt: 60, seed: 4 });
    const b = world({ marine: true, salt: 60, seed: 4 });
    advanceWorld(a.s, 24 * 4, { forceFull: true });
    advanceWorld(b.s, 24 * 4, { forceFull: true });
    expect(stateHash(a.s)).toBe(stateHash(b.s));
  });

  it('the offline catch-up makes the same runs as live play over the same span', () => {
    const live = world({ seed: 6 });
    const away = clonePlain(live.s);
    advanceWorld(live.s, 12, {});
    simulateOffline(away, (12 / GAME_HOURS_PER_REAL_SECOND) * 1000);
    const id = live.tanks[0].id;
    expect(away.tanks[id].water.lab?.lastAutoChangeHour).toBe(live.s.tanks[id].water.lab?.lastAutoChangeHour);
    expect(away.tanks[id].water.lab?.lastAutoScrapeHour).toBe(live.s.tanks[id].water.lab?.lastAutoScrapeHour);
    expect(live.s.tanks[id].water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
  });
});

describe('AUTO-017: only tracked resources', () => {
  it('money moves only through the ledger; salt only through the changes, each the amount it needs', () => {
    const { s, tanks } = world({ marine: true, salt: 80, seed: 2 });
    const tank = tanks[0];
    const money0 = s.finance.money;
    const ledger0 = s.finance.ledger.length;
    const creatures0 = Object.keys(s.creatures).sort();
    for (let day = 0; day < 5; day++) {
      // to 07:45, then through 08:00 in quarter hours
      const toQuarterTo = 24 * (3 + day) + 7.75 - s.clock.hour;
      if (toQuarterTo > 0) advanceWorld(s, toQuarterTo, { forceFull: true });
      const need = changeSaltNeed(s, tank, 0.1);
      const before = s.inventory.salt;
      advanceWorld(s, 0.5, { forceFull: true });
      expect(tank.water.lab?.lastAutoChangeHour).toBe(24 * (3 + day) + 8);
      expect(before - s.inventory.salt).toBeCloseTo(need, 2);
    }
    const added = s.finance.ledger.slice(ledger0).reduce((a, e) => a + e.amount, 0);
    expect(s.finance.money - money0).toBeCloseTo(added, 6);
    expect(Object.keys(s.creatures).sort()).toEqual(creatures0);
    expect(s.inventory.salt).toBeGreaterThanOrEqual(0);
  });

  it('a skipped change is never silent: it leaves the out-of-salt notice', () => {
    const { s, tanks } = world({ marine: true, salt: 0 });
    advanceWorld(s, 12, { forceFull: true });
    expect(tanks[0].water.lab?.lastAutoChangeHour).toBeUndefined();
    expect(s.log.some((e) => e.text === OUT_OF_SALT(tanks[0].name))).toBe(true);
  });
});

describe('AUTO-018, AUTO-023: one run per crossing', () => {
  it('stepping the same window again changes nothing', () => {
    const { s, tanks } = world({ marine: true, salt: 40 });
    const tank = tanks[0];
    const start = 24 * 3 + 7;
    const ctx = makeContext(s, 2);
    ctx.hour = start;
    runWaterChanger(s, tank, computeTankEnv(s, tank), 2, ctx);
    expect(tank.water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
    const water = clonePlain(tank.water);
    const salt = s.inventory.salt;
    const again = makeContext(s, 2);
    again.hour = start;
    runWaterChanger(s, tank, computeTankEnv(s, tank), 2, again);
    expect(tank.water).toEqual(water);
    expect(s.inventory.salt).toBe(salt);
  });

  it('a step ending exactly at lights-on, then one starting there: one change', () => {
    const { s, tanks } = world({ marine: true, salt: 40 });
    const tank = tanks[0];
    const need = changeSaltNeed(s, tank, 0.1);
    const salt0 = s.inventory.salt;
    const a = makeContext(s, 6);
    a.hour = 24 * 3 + 2; // [02:00, 08:00)
    runWaterChanger(s, tank, computeTankEnv(s, tank), 6, a);
    expect(tank.water.lab?.lastAutoChangeHour).toBeUndefined();
    const b = makeContext(s, 2);
    b.hour = 24 * 3 + 8; // [08:00, 10:00)
    runWaterChanger(s, tank, computeTankEnv(s, tank), 2, b);
    expect(tank.water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
    expect(salt0 - s.inventory.salt).toBeCloseTo(need, 3);
  });

  it('a save without markers (or with a very old one) runs once at the next lights-on, never a burst', () => {
    for (const old of [undefined, -24 * 100]) {
      const { s, tanks } = world({ marine: true, salt: 40 });
      const tank = tanks[0];
      if (old === undefined) delete tank.water.lab!.lastAutoChangeHour;
      else tank.water.lab!.lastAutoChangeHour = old;
      const need = changeSaltNeed(s, tank, 0.1);
      const salt0 = s.inventory.salt;
      const ctx = makeContext(s, 8);
      ctx.hour = 24 * 3 + 2; // one lights-on in [02:00, 10:00)
      runWaterChanger(s, tank, computeTankEnv(s, tank), 8, ctx);
      expect(salt0 - s.inventory.salt).toBeCloseTo(need, 3);
      expect(tank.water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
    }
  });
});

describe('AUTO-022: one unit of salt, one change', () => {
  it('two changes due in the same step with salt for one: the first runs, the second reports the shortage', () => {
    const { s, tanks } = world({ marine: true, salt: 0, tanks: 2 });
    const needA = changeSaltNeed(s, tanks[0], 0.1);
    const needB = changeSaltNeed(s, tanks[1], 0.1);
    s.inventory.salt = Math.max(needA, needB) + 0.01; // enough for one, not two
    s.clock.hour = 24 * 3 + 7.75;
    advanceWorld(s, 0.5, { forceFull: true });
    const ran = tanks.filter((t) => t.water.lab?.lastAutoChangeHour !== undefined);
    expect(ran).toHaveLength(1);
    const skipped = tanks.find((t) => !ran.includes(t))!;
    expect(s.log.some((e) => e.text === OUT_OF_SALT(skipped.name))).toBe(true);
    expect(s.inventory.salt).toBeGreaterThanOrEqual(0);
  });

  it('no stock goes negative over a long run', () => {
    const { s } = world({ marine: true, salt: 3, tanks: 2, seed: 12 });
    advanceWorld(s, 24 * 6, {});
    expect(s.inventory.salt).toBeGreaterThanOrEqual(0);
    for (const v of Object.values(s.inventory.foods)) expect(v ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe('AUTO-026: save and load never repeat or skip a job', () => {
  it('a save and load right after the change and scrape ends where an uninterrupted run does', () => {
    const a = world({ marine: true, salt: 40, seed: 5 });
    const b = clonePlain(a.s);
    advanceWorld(a.s, 6.5, { forceFull: true }); // 08:30: changed and scraped
    advanceWorld(b, 6.5, { forceFull: true });
    expect(a.tanks[0].water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
    const loaded = decodeRecord(encodeRecord(a.s, 'auto').text).state;
    advanceWorld(loaded, 48, { forceFull: true });
    advanceWorld(b, 48, { forceFull: true });
    expect(stateHash(loaded)).toBe(stateHash(b));
    expect(loaded.tanks[a.tanks[0].id].water.lab?.lastAutoChangeHour).toBe(24 * 5 + 8);
  });
});

// ───────────────────────────── production lines (chunk 4) ─────────────────────────────

describe('production lines: AUTO-016, AUTO-017, AUTO-018, AUTO-025 (chunk 4)', () => {
  const SPAN = 24 * 9; // the brood is moved, raised, sorted, quarantined 168 h and listed

  it('AUTO-016: random step sizes make the same moves, sorts and listings: counts exact, hours within one game hour', () => {
    const ref = lineFarm(17);
    advanceWorld(ref.g, SPAN, { forceFull: true });
    const want = lineRecord(ref.g);
    expect(want.listings.length).toBe(1);
    for (const seed of [1, 2, 3]) {
      const run = lineFarm(17);
      const rnd = mulberry32(seed);
      let done = 0;
      while (done < SPAN - 1e-9) {
        const dt = Math.min(0.05 + rnd.next() * 3.95, SPAN - done);
        advanceWorld(run.g, dt, { forceFull: true });
        done += dt;
      }
      const got = lineRecord(run.g);
      expect(got.routed).toBe(want.routed);
      expect(got.listings.length).toBe(want.listings.length);
      expect(got.batches.length).toBe(want.batches.length);
      got.listings.forEach((l, i) => {
        expect(l.kind).toBe(want.listings[i].kind);
        expect(Math.abs(l.createdHour - want.listings[i].createdHour)).toBeLessThanOrEqual(1 + 1e-9);
      });
      got.batches.forEach((b, i) => expect(Math.abs((b.quarantinedHour ?? 0) - (want.batches[i].quarantinedHour ?? 0))).toBeLessThanOrEqual(1 + 1e-9));
    }
  });

  it('AUTO-016: the offline catch-up does what live play does over the same span', () => {
    const live = lineFarm(19);
    const away = clonePlain(live.g);
    advanceWorld(live.g, 12, {});
    simulateOffline(away, (12 / GAME_HOURS_PER_REAL_SECOND) * 1000);
    const a = lineRecord(live.g);
    const b = lineRecord(away);
    expect(a.routed + a.batches.length).toBeGreaterThan(0);
    expect(b.routed).toBe(a.routed);
    expect(b.batches.length).toBe(a.batches.length);
    b.batches.forEach((bt, i) => expect(Math.abs((bt.quarantinedHour ?? 0) - (a.batches[i].quarantinedHour ?? 0))).toBeLessThanOrEqual(1 + 1e-9));
  });

  it('AUTO-017: money moves only through the ledger; animals appear only by being raised, and none vanish', () => {
    const { g } = lineFarm(21);
    const money0 = g.finance.money;
    const ledger0 = g.finance.ledger.length;
    const before = new Set(Object.keys(g.creatures));
    advanceWorld(g, SPAN, { forceFull: true });
    const added = g.finance.ledger.slice(ledger0).reduce((a, e) => a + e.amount, 0);
    expect(g.finance.money - money0).toBeCloseTo(added, 6);
    for (const id of before) expect(g.creatures[id]).toBeDefined();
    for (const c of Object.values(g.creatures)) if (!before.has(c.id)) expect(c.history[0]?.kind).toBe('born');
  });

  it('AUTO-018, AUTO-025: an hour stepped again does nothing more; a quarantine ends in exactly one listing', () => {
    const { g } = lineFarm(23);
    advanceWorld(g, SPAN, { forceFull: true });
    const listings = g.market.listings.length;
    const h = g.production!.lastHour!;
    const hash = stateHash(g);
    stepProduction(g, h - 3, h + 0.5); // the last hours again
    expect(stateHash(g)).toBe(hash);
    expect(g.market.listings.length).toBe(listings);
    const released = (g.production!.lines[0].batches ?? []).filter((b) => b.released).length;
    expect(lineRecord(g).listings.length).toBeLessThanOrEqual(Math.max(1, released));
    expect(lineRecord(g).listings.length).toBe(1);
  });
});

// ───────────────────────────── the S3-D chains (chunk 5) ─────────────────────────────

describe('the S3-D chains: AUTO-016, AUTO-017, AUTO-018, AUTO-022, AUTO-026 (chunk 5)', () => {
  /** Two freshwater and two marine tanks on changers and top-offs, both rooms, a doser on a tank of fry, and Rosa. */
  const ops = (seed = 11) => {
    const f = facility({ fresh: 2, marine: 2, ato: true, food: true, salt: 9, eggs: 6, veg: 3, rosa: 200, seed, hour: 24 * 3 + 2 });
    waterRoom(f.g)!.salt = 25;
    const t = f.fresh[1];
    for (const c of Object.values(f.g.creatures)) if (c.tankId === t.id) delete f.g.creatures[c.id];
    installEquipment(f.g, t.id, 'live_food_doser', { purchased: true });
    createClutch(f.g, { sp: getSpecies('betta'), tank: t, mother: null as never, father: null as never, hour: f.g.clock.hour - 40, stage: 'fry', count: 40, visual: 'fry_cloud', nextStageHour: f.g.clock.hour + 400 });
    return f;
  };
  const SPAN3 = 60;
  const record = (g: GameState) => ({
    changes: g.tankOrder.map((id) => g.tanks[id].water.lab?.lastAutoChangeHour),
    doses: g.tankOrder.map((id) => g.tanks[id].water.lab?.lastDoseHour),
    jobs: g.log.filter((e) => /^(Salt mixing|Cone|Jar|Morning water changes|Water changes)/.test(e.text)).map((e) => `${e.hour}:${e.text.split(' · ')[0]}`),
    stock: { salt: g.inventory.salt, eggs: g.inventory.brineShrimpEggs, foods: { ...g.inventory.foods } },
    cultures: { ...g.facility.food! },
    money: g.finance.money,
  });

  it('AUTO-016: random step sizes make the same jobs at the same hours and the same stock; gallons within 0.5 gal', () => {
    const a = ops();
    run(a.g, SPAN3, 0.5);
    const ra = record(a.g);
    for (const seed of [1, 2]) {
      const b = ops();
      const rnd = mulberry32(seed);
      let done = 0;
      while (done < SPAN3 - 1e-9) {
        const dt = Math.min(0.05 + rnd.next() * 0.45, SPAN3 - done);
        advanceWorld(b.g, dt, { forceFull: true });
        done += dt;
      }
      const rb = record(b.g);
      expect(rb.changes).toEqual(ra.changes);
      expect(rb.doses).toEqual(ra.doses);
      expect(rb.jobs).toEqual(ra.jobs);
      expect(rb.stock).toEqual(ra.stock);
      expect(rb.cultures).toEqual(ra.cultures);
      expect(Math.abs(waterRoom(b.g)!.fresh - waterRoom(a.g)!.fresh)).toBeLessThan(0.5);
      expect(Math.abs(waterRoom(b.g)!.salt - waterRoom(a.g)!.salt)).toBeLessThan(0.5);
    }
  });

  it('AUTO-016: identical runs end with the same stateHash; the offline catch-up runs the same jobs as live play', () => {
    const a = ops(5);
    const b = ops(5);
    run(a.g, 30);
    run(b.g, 30);
    expect(stateHash(a.g)).toBe(stateHash(b.g));
    const live = ops(6);
    const away = clonePlain(live.g);
    advanceWorld(live.g, 12, {});
    simulateOffline(away, (12 / GAME_HOURS_PER_REAL_SECOND) * 1000);
    expect(record(away).jobs).toEqual(record(live.g).jobs);
    expect(record(away).stock.eggs).toBe(record(live.g).stock.eggs);
    expect(record(away).changes).toEqual(record(live.g).changes);
  });

  it('AUTO-017: money moves only through the ledger; salt mix and eggs only through purchases and starts', () => {
    const { g } = ops(7);
    const money0 = g.finance.money;
    const ledger0 = g.finance.ledger.length;
    const salt0 = g.inventory.salt;
    const eggs0 = g.inventory.brineShrimpEggs ?? 0;
    run(g, SPAN3);
    const added = g.finance.ledger.slice(ledger0).reduce((a, e) => a + e.amount, 0);
    expect(g.finance.money - money0).toBeCloseTo(added, 6);
    const saltBought = g.finance.ledger.slice(ledger0).filter((e) => / kg marine salt mix/.test(e.memo)).reduce((a, e) => a + parseFloat(e.memo), 0);
    const batches = g.log.filter((e) => e.text.startsWith('Salt mixing')).length;
    expect(g.inventory.salt).toBeCloseTo(salt0 + saltBought - batches * 4.1, 6);
    const tins = g.finance.ledger.slice(ledger0).filter((e) => /× brine shrimp eggs/.test(e.memo)).reduce((a, e) => a + parseInt(e.memo, 10), 0);
    const harvests = g.log.filter((e) => /^Cone \d+ harvested/.test(e.text)).length;
    const running = g.facility.food!.cones.filter((c) => c.startedHour !== null).length;
    expect(g.inventory.brineShrimpEggs).toBe(eggs0 + tins * 30 - (harvests + running));
  });

  it('AUTO-018: stepping the same window again changes nothing', () => {
    const { g } = ops(8);
    run(g, 40);
    const hash = stateHash(g);
    stepAutomation(g, g.clock.hour - 12, g.clock.hour);
    expect(stateHash(g)).toBe(hash);
  });

  it('AUTO-022: eggs for one cone and two cones due: one starts, the other waits and shows the shortage', () => {
    const f = facility({ fresh: 1, marine: 0, food: true, eggs: 1, veg: 0, rosa: null, hour: 24 * 3 + 5.5 });
    waterRoom(f.g)!.salt = 60;
    run(f.g, 1);
    expect(f.g.facility.food!.cones.map((c) => c.startedHour)).toEqual([24 * 3 + 6, null]);
    expect(f.g.inventory.brineShrimpEggs).toBe(0);
  });

  it('AUTO-022: no stock goes negative over a long run', () => {
    const { g } = ops(9);
    run(g, 24 * 5);
    expect(g.inventory.salt).toBeGreaterThanOrEqual(0);
    expect(g.inventory.brineShrimpEggs ?? 0).toBeGreaterThanOrEqual(0);
    for (const v of Object.values(g.inventory.foods)) expect(v).toBeGreaterThanOrEqual(0);
    expect(waterRoom(g)!.fresh).toBeGreaterThanOrEqual(0);
    expect(waterRoom(g)!.salt).toBeGreaterThanOrEqual(0);
  });

  it('AUTO-026: a save and load right after the morning jobs ends where an uninterrupted run does', () => {
    const a = ops(10);
    run(a.g, 6.5); // past 08:00
    const b = decodeRecord(encodeRecord(a.g, 'auto').text).state;
    run(a.g, 30);
    run(b, 30);
    expect(record(b)).toEqual(record(a.g));
  });
});
