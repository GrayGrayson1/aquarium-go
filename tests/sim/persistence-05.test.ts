/**
 * lane:core (chunk 3; 0.5 spec §15, §20.1; PERSIST-006's automation part, AUTO-018 A2) — the Auto Water Changer's two
 * last-run hours in a save: kept when they are finite numbers, removed with a repair note when they aren't, and
 * nothing at all when absent (the stateHash of a save without them is unchanged). A 0.5 game round-trips with no
 * repairs and the same hash twice over.
 *
 * lane:production (chunk 4; PERSIST-006's production part, ADR-0025 decision 10, AUTO-026, AUTO-027) — a save with a
 * line mid-quarantine round-trips with no repairs and resumes exactly; a line whose parent or tank is missing is kept,
 * paused and marked with a note (never dropped); an unreadable line and a stray line hold are removed with a note;
 * repair creates no animal, listing or sale.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { installEquipment } from '@/sim/care';
import { advanceWorld } from '@/sim/world';
import { encodeRecord, decodeRecord, stateHash } from '@/persistence';
import { repairState } from '@/persistence/migrations';
import { clonePlain } from '@/sim/economy/util';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { getSpecies } from '@/data/species';
import { createClutch } from '@/sim/life/breeding/clutch';
import { devOpenMarket } from '@/sim/economy';
import { unlock } from '@/sim/facility';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { createLine, QUARANTINE_HOURS } from '@/sim/production';
import { facility } from './support/automation'; // chunk 5
import { holdAll, installFoodRoom, installWaterRoom } from '@/sim/automation';
import { addStaffDirect } from '@/sim/staff'; // chunk 6
import { emitEvent } from '@/sim/context';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { lineFarm } from './support/production';

const roundTrip = (g: GameState) => decodeRecord(encodeRecord(g, 'auto').text);

function game(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 21 });
  g.isShowcase = false;
  return g;
}

describe('PERSIST-006: the lab hours', () => {
  it('a 0.5 game with the device, after it ran, round-trips with no repairs and the same hash twice', () => {
    const g = game();
    const id = g.tankOrder[0];
    g.progress.unlocked.push('gear_autofeeder');
    expect(installEquipment(g, id, 'auto_water_changer', { purchased: true }).ok).toBe(true);
    advanceWorld(g, 30, { forceFull: true });
    expect(g.tanks[id].water.lab?.lastAutoChangeHour).toBeDefined();
    expect(g.tanks[id].water.lab?.lastAutoScrapeHour).toBeDefined();
    const once = roundTrip(g);
    expect(once.repairs).toEqual([]);
    const twice = roundTrip(once.state);
    expect(twice.repairs).toEqual([]);
    expect(stateHash(twice.state)).toBe(stateHash(once.state));
    expect(once.state.tanks[id].water.lab?.lastAutoChangeHour).toBe(g.tanks[id].water.lab?.lastAutoChangeHour);
  });

  it('a non-finite hour is removed with a note; the other stays', () => {
    const g = game();
    const id = g.tankOrder[0];
    const lab = (g.tanks[id].water.lab ??= {});
    lab.lastAutoChangeHour = 'soon' as unknown as number;
    lab.lastAutoScrapeHour = g.clock.hour - 2;
    const raw = clonePlain(g) as unknown as Record<string, unknown>;
    const repairs = repairState(raw);
    const fixed = (raw as unknown as GameState).tanks[id].water.lab!;
    expect(repairs).toContain(`tank ${id}.water.lab.lastAutoChangeHour: soon, removed`);
    expect(fixed.lastAutoChangeHour).toBeUndefined();
    expect(fixed.lastAutoScrapeHour).toBe(g.clock.hour - 2);
    // JSON has no Infinity or NaN (the serializer writes non-finite numbers as 0); a null in the file is repaired
    const nulled = clonePlain(g) as unknown as Record<string, unknown>;
    ((nulled as unknown as GameState).tanks[id].water.lab as Record<string, unknown>).lastAutoChangeHour = null;
    expect(repairState(nulled)).toContain(`tank ${id}.water.lab.lastAutoChangeHour: null, removed`);
  });

  it('an hour after the save’s clock is removed too (it would stop the device and keep keepers away for good)', () => {
    const g = game();
    const id = g.tankOrder[0];
    const lab = (g.tanks[id].water.lab ??= {});
    lab.lastAutoChangeHour = g.clock.hour + 500;
    lab.lastAutoScrapeHour = g.clock.hour;
    const raw = clonePlain(g) as unknown as Record<string, unknown>;
    expect(repairState(raw)).toContain(`tank ${id}.water.lab.lastAutoChangeHour: ${g.clock.hour + 500}, removed`);
    const fixed = (raw as unknown as GameState).tanks[id].water.lab!;
    expect(fixed.lastAutoChangeHour).toBeUndefined();
    expect(fixed.lastAutoScrapeHour).toBe(g.clock.hour);
  });

  it('absent hours need no repair and leave the stateHash as it was', () => {
    const g = game();
    const id = g.tankOrder[0];
    const before = stateHash(g);
    const withUndefined = clonePlain(g);
    const lab = (withUndefined.tanks[id].water.lab ??= {});
    lab.lastAutoChangeHour = undefined;
    lab.lastAutoScrapeHour = undefined;
    expect(stateHash(withUndefined)).toBe(before);
    expect(roundTrip(g).repairs).toEqual([]);
  });

  it('a fresh game needs no repairs', () => {
    expect(roundTrip(game()).repairs).toEqual([]);
  });
});

/** A betta line with a quarantined batch, `hours` after its brood was raised. */
function lineGame(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 23 });
  g.isShowcase = false;
  devOpenMarket(g);
  for (const k of Object.keys(UNLOCK_KEYS)) unlock(g, k, { silent: true });
  g.facility.level = 'showroom';
  g.finance.money = 50000;
  const mk = (name: string, x: number, tier: string) => {
    const t = createTank(g, tier, 'freshwater_tropical', { cycled: true, placement: { x, z: 2, rotY: 0 }, name });
    t.water.tempC = 26;
    return t;
  };
  const breed = mk('Breed Tank', -6, 'g10');
  const raise = mk('Grow-out', -3, 'g40B');
  const qt = mk('Quarantine', 0, 'g40B');
  const keep = mk('Quiet Corner', 3, 'g20L');
  const rng = simRng(g);
  const father = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Blaze' }), breed.id);
  const mother = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Cinder' }), keep.id);
  expect(createLine(g, { motherId: mother.id, fatherId: father.id, tanks: { breed: breed.id, raise: raise.id, quarantine: qt.id, keep: keep.id } }).ok).toBe(true);
  createClutch(g, { sp: getSpecies('betta'), tank: breed, mother, father, hour: g.clock.hour, stage: 'fry', count: 30, visual: 'fry_cloud', nextStageHour: g.clock.hour + 6 });
  return g;
}

function care(g: GameState): void {
  for (const c of Object.values(g.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 10);
    c.stats.health = Math.max(c.stats.health, 95);
  }
  for (const cl of Object.values(g.clutches)) cl.fed = 1;
}
const go = (g: GameState, hours: number) => {
  for (let i = 0; i < hours; i++) {
    care(g);
    advanceWorld(g, 1, { forceFull: true });
  }
};

describe('PERSIST-006, AUTO-026, AUTO-027: production lines in a save', () => {
  it('a line mid-quarantine round-trips with no repairs, the same hash and the same time left, and resumes exactly', () => {
    const g = lineGame();
    go(g, 30);
    const line = g.production!.lines[0];
    expect(line.batches?.[0].quarantinedHour).toBeDefined();
    const first = roundTrip(g);
    expect(first.repairs).toEqual([]);
    expect(stateHash(first.state)).toBe(stateHash(g));
    expect(roundTrip(first.state).repairs).toEqual([]);
    expect(first.state.production!.lines[0].batches![0].quarantinedHour).toBe(line.batches![0].quarantinedHour);
    // continuing from the save and from the running game list the same animals at the same hour (no repeat, no skip)
    const loaded = first.state;
    go(g, QUARANTINE_HOURS);
    go(loaded, QUARANTINE_HOURS);
    expect(stateHash(loaded)).toBe(stateHash(g));
    expect(g.market.listings.length).toBeGreaterThan(0);
  });

  it('a missing parent or tank: the line is kept, paused and marked with one note; a second repair finds nothing', () => {
    const g = lineGame();
    go(g, 4);
    const save = clonePlain(g);
    const line = save.production!.lines[0];
    delete save.creatures[line.pair.motherId];
    const counts = { creatures: Object.keys(save.creatures).length, listings: save.market.listings.length, sold: line.stats.totalSold };
    const repairs = repairState(save);
    expect(repairs).toContain(`production line ${line.id}: mother ${line.pair.motherId} missing, paused`);
    const kept = save.production!.lines[0];
    expect(kept.id).toBe(line.id);
    expect(kept.broken).toMatchObject({ ref: 'mother', id: line.pair.motherId });
    expect(repairState(save)).toEqual([]);
    // AUTO-027: nothing created, nothing counted
    expect(Object.keys(save.creatures).length).toBe(counts.creatures);
    expect(save.market.listings.length).toBe(counts.listings);
    expect(kept.stats.totalSold).toBe(counts.sold);
    // a tank gone: marked by its last name
    const save2 = clonePlain(g);
    const l2 = save2.production!.lines[0];
    delete save2.tanks[l2.tanks.raise];
    save2.tankOrder = save2.tankOrder.filter((id) => id !== l2.tanks.raise);
    const r2 = repairState(save2);
    expect(r2).toContain(`production line ${l2.id}: raise ${l2.tanks.raise} missing, paused`);
    expect(save2.production!.lines[0].broken).toMatchObject({ ref: 'raise', name: 'Grow-out' });
  });

  it('an unreadable line and a stray line hold are removed with a note; an unreadable production section is removed', () => {
    const g = lineGame();
    const save = clonePlain(g);
    (save.production!.lines as unknown[]).push({ id: 7, name: 'Broken' });
    const stray = Object.values(save.creatures).find((c) => c.name !== 'Blaze' && c.name !== 'Cinder')!;
    stray.repro.lineHold = true;
    const repairs = repairState(save);
    expect(repairs).toContain('production line 7: unreadable, removed');
    expect(repairs).toContain(`creature ${stray.id}.repro.lineHold: no line, removed`);
    expect(save.production!.lines.length).toBe(1);
    expect(stray.repro.lineHold).toBeUndefined();
    const bad = clonePlain(g) as unknown as Record<string, unknown>;
    bad.production = 'nope';
    expect(repairState(bad)).toContain('production: unreadable, removed');
    expect(bad.production).toBeUndefined();
  });
});

// ───────────────────────────── the S3-D state (chunk 5) ─────────────────────────────

describe('PERSIST-016: the S3-D state in a save', () => {
  /** Both rooms running, manual mode on, a doser's marker, records and a tagged sale. */
  function ops(): GameState {
    const f = facility({ fresh: 1, marine: 1, ato: true, food: true, salt: 20, eggs: 10, veg: 5, rosa: 150 });
    installEquipment(f.g, f.fresh[0].id, 'live_food_doser', { purchased: true });
    advanceWorld(f.g, 50, { forceFull: true });
    holdAll(f.g);
    f.g.staff!.ordersOff = true;
    return f.g;
  }

  // chunk 16 raised the save version to 3 for its new species (ADR-0052 decision 5); the S3-D state itself needs nothing
  it('round-trips with no repairs and the same hash twice; the save version is the current one (3)', () => {
    const g = ops();
    expect(g.automation?.days?.length).toBeGreaterThan(0);
    const once = roundTrip(g);
    expect(once.repairs).toEqual([]);
    expect(once.state.schemaVersion).toBe(3);
    expect(once.state.facility.water).toEqual(g.facility.water);
    expect(once.state.facility.food).toEqual(g.facility.food);
    expect(once.state.automation).toEqual(g.automation);
    const twice = roundTrip(once.state);
    expect(twice.repairs).toEqual([]);
    expect(stateHash(twice.state)).toBe(stateHash(once.state));
  });

  it('absent fields need nothing and leave the hash as it was (a game without them)', () => {
    const g = game();
    const d = roundTrip(g);
    expect(d.repairs).toEqual([]);
    expect(d.state.facility.water).toBeUndefined();
    expect(d.state.automation).toBeUndefined();
    expect(stateHash({ ...g, automation: undefined, facility: { ...g.facility, water: undefined, food: undefined } })).toBe(stateHash(g));
  });

  it('crafted values are repaired with a note each, and nothing is invented', () => {
    const g = ops();
    const raw = clonePlain(g) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    raw.facility.water.fresh = 'lots';
    raw.facility.water.prepLevel = 9;
    raw.facility.water.mix = { gal: 'x' };
    raw.facility.food.cones.push({ startedHour: 'soon' });
    raw.inventory.brineShrimpEggs = -3;
    raw.automation.hold.water = 'yes';
    raw.automation.lineWait = { gone: g.clock.hour };
    raw.staff.ordersOff = 1;
    raw.finance.ledger.push({ hour: 1, amount: 5, category: 'livestock_sale', memo: 'x', line: { id: 7 } });
    raw.finance.daily[0].supplies = 'some';
    const repairs = repairState(raw);
    expect(repairs).toEqual(
      expect.arrayContaining([
        'facility.water.fresh: lots → 0',
        'facility.water.prepLevel → 0',
        'facility.water.mix: unreadable, emptied',
        'facility.food.cones: unreadable entries removed',
        'inventory.brineShrimpEggs → 0',
        'automation.hold.water: removed',
        'automation.lineWait.gone: no such line, removed',
        'staff.ordersOff: removed',
        'finance.ledger line: removed',
      ]),
    );
    expect(repairs.some((r) => /^finance\.daily .*\.supplies: removed$/.test(r))).toBe(true);
    expect(raw.facility.food.cones.length).toBe(2);
    expect(raw.automation.hold.salt).toBe(true); // the rest of manual mode stays
    expect(repairState(raw)).toEqual([]); // a second repair finds nothing
  });

  it('an unreadable room or automation section is removed with a note; no room is created by a repair', () => {
    const g = game();
    const raw = clonePlain(g) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    raw.facility.water = 'pipes';
    raw.automation = 7;
    const repairs = repairState(raw);
    expect(repairs).toEqual(expect.arrayContaining(['facility.water: unreadable, removed', 'automation: unreadable, removed']));
    expect(raw.facility.water).toBeUndefined();
    expect(raw.facility.food).toBeUndefined();
  });

  it('a v1 save migrates (through v2, C-44, and v3, chunk 16) unchanged apart from its version', () => {
    const g = game();
    const v1 = { ...clonePlain(g), schemaVersion: 1 } as GameState;
    const d = roundTrip(v1);
    expect(d.repairs).toEqual([]);
    expect(d.state.schemaVersion).toBe(3);
    expect(stateHash(d.state)).toBe(stateHash(roundTrip(g).state));
  });
});

/**
 * chunk 6 (PERSIST-008) — one save holding every 0.5 field at once: a production line mid-pipeline, Auto Water Changer
 * lab hours, both S3-D rooms with a stock manager and a day of records, a rare-stock event with its offer id and notice,
 * a bristlenose under its chunk 6 name, show results. It round-trips twice with no repairs and the same hash, and its
 * corrupted variants (a dangling line id, non-finite lab hours) load with a note and no crash.
 */
describe('PERSIST-008: the full 0.5 save', () => {
  function full(): GameState {
    const { g, tanks } = lineFarm(23);
    installWaterRoom(g, g.clock.hour);
    installFoodRoom(g);
    addStaffDirect(g, { name: 'Rosa Duarte', role: 'stock_manager', skill: 3, trait: 'quick_learner' });
    installEquipment(g, tanks.keep.id, 'auto_water_changer', { purchased: true });
    const rng = simRng(g);
    addCreature(g, createCreature(g, rng, 'bristlenose_pleco', { ageDays: 90, name: 'Bristle' }), tanks.keep.id);
    advanceWorld(g, 40, { forceFull: true });
    emitEvent(g, { kind: 'market', text: 'Something special at the shop.', toast: true, offerId: 'offer_full', notice: { topic: 'prismatic', vars: { species: 'betta', morph: 'Red Veiltail Betta', seller: 'A', until: g.clock.hour + 24 } } });
    return g;
  }

  it('round-trips twice with no repairs and the same hash; every 0.5 field survives', () => {
    const g = full();
    expect(g.production?.lines.length).toBe(1);
    expect(g.facility.water && g.facility.food).toBeTruthy();
    expect(Object.values(g.tanks).some((t) => t.water.lab?.lastAutoChangeHour !== undefined)).toBe(true);
    expect(g.log.some((e) => e.offerId === 'offer_full')).toBe(true);
    const once = roundTrip(g);
    expect(once.repairs).toEqual([]);
    expect(once.state.production).toEqual(g.production);
    expect(once.state.facility).toEqual(g.facility);
    expect(once.state.automation).toEqual(g.automation);
    expect(once.state.log.find((e) => e.offerId === 'offer_full')?.notice?.topic).toBe('prismatic');
    const twice = roundTrip(once.state);
    expect(twice.repairs).toEqual([]);
    expect(stateHash(twice.state)).toBe(stateHash(once.state));
    expect(stateHash(once.state)).toBe(stateHash(g));
  });

  it('a dangling line id and non-finite lab hours, each in turn, load with a note and no crash', () => {
    const g = full();
    const lineTank = g.production!.lines[0].tanks.breed;
    const dangling = clonePlain(g);
    dangling.production!.lines[0].tanks.breed = 'tank_gone';
    const a = repairState(dangling);
    expect(a.length).toBeGreaterThan(0);
    advanceWorld(dangling, 6, { forceFull: true });
    expect(findNonFinite(dangling)).toEqual([]);

    const lab = clonePlain(g) as unknown as Record<string, any>;
    const t = Object.values(lab.tanks as Record<string, any>).find((x) => x.water.lab?.lastAutoChangeHour !== undefined);
    t.water.lab.lastAutoChangeHour = Number.POSITIVE_INFINITY;
    const b = repairState(lab);
    expect(b.some((r) => r.includes('lastAutoChangeHour'))).toBe(true);
    advanceWorld(lab as unknown as GameState, 6, { forceFull: true });
    expect(findNonFinite(lab)).toEqual([]);
    expect(lineTank).toBeTruthy();
  });
});
