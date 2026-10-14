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
