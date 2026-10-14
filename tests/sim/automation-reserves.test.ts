/**
 * lane:automation (chunk 5; DESIGN-S3D §9.2, §9.9) — the Water room (AUTO-032) and the facility jobs' order and
 * settling (AUTO-037).
 *
 * Tolerance (ADR-0024 decision 7, AUTO-037): job counts, run hours and stock units are exact across step sizes and
 * focus; reserve gallons agree within 0.5 gal (the Auto Top-Offs draw as each tank catches up, so a background tank's
 * top-off lands at the end of its chunk; the fixtures here have none unless a test adds them).
 */
import { describe, it, expect } from 'vitest';
import { facility, run } from './support/automation';
import { stepTank } from '@/sim/world';
import { automationProblems, batchSaltKg, holdAll, prepRate, saltShare, saltWaterNeeded, setHold, tankChangeNeed, waterRoom } from '@/sim/automation';
import { WATER_ROOM } from '@/data/catalog/machines';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { installEquipment } from '@/sim/care';
import { unlock } from '@/sim/facility';
import { simRng } from '@/sim/rng';

const lastChange = (t: { water: { lab?: { lastAutoChangeHour?: number } } }) => t.water.lab?.lastAutoChangeHour;

describe('AUTO-032: the Water room', () => {
  it('a 30 gal batch takes exactly 4.1 kg, so 4.1 kg in stock is one batch', () => {
    expect(batchSaltKg(30)).toBe(4.1);
    expect(batchSaltKg(60)).toBe(8.2);
  });

  it('the prep station fills the fresh reserve at its rate, up to its cap', () => {
    const { g } = facility({ fresh: 0, marine: 0 });
    const room = waterRoom(g)!;
    room.fresh = 0;
    run(g, 10);
    expect(prepRate(room)).toBe(6);
    expect(room.fresh).toBeCloseTo(60, 6);
    run(g, 30);
    expect(room.fresh).toBe(WATER_ROOM.freshCap);
  });

  it('salt mixing starts at 10 AM below 60 %, takes 30 gal and 4.1 kg at the start, and tops the reserve up 12 h later', () => {
    const { g } = facility({ fresh: 0, marine: 1, salt: 4.1, hour: 24 * 3 + 9 });
    const room = waterRoom(g)!;
    room.salt = 20; // a third of the 60 gal reserve
    run(g, 0.5); // 9:00–9:30: nothing yet
    expect(room.mix ?? null).toBeNull();
    const freshBefore = room.fresh;
    run(g, 1); // across 10:00
    expect(room.mix).toEqual({ gal: 30, readyHour: 24 * 3 + 22 });
    expect(g.inventory.salt).toBe(0);
    expect(freshBefore).toBe(WATER_ROOM.freshCap); // full, so the prep station had nothing to add before 10:00
    expect(room.fresh).toBeCloseTo(WATER_ROOM.freshCap - 30 + 0.5 * 6, 6); // 30 gal drawn at 10:00, then half an hour of prep
    expect(g.log.some((e) => /^Salt mixing · 30 gal batch · used 4\.1 kg/.test(e.text))).toBe(true);
    // one batch at a time: by 10 PM it's ready and tops the reserve up; the 10 PM check finds the reserve above 60 %
    run(g, 12.5);
    expect(room.salt).toBeCloseTo(Math.min(60, 20 + 30), 0);
    expect(room.mix ?? null).toBeNull();
  });

  it('a ready batch that doesn\'t fit waits in the mixing tank and refills the reserve as it is used', () => {
    const { g } = facility({ fresh: 0, marine: 1, salt: 20, hour: 24 * 3 + 21 });
    const room = waterRoom(g)!;
    room.salt = 50;
    room.mix = { gal: 30, readyHour: 24 * 3 + 22 };
    run(g, 2); // 21:00–23:00: ready at 22:00
    expect(room.salt).toBe(60);
    expect(room.mix?.gal).toBeCloseTo(20, 6);
    run(g, 10); // 08:00: the marine tank's change draws salt water, and the mixing tank refills the reserve
    expect(room.salt).toBe(60);
    expect(room.mix?.gal ?? 0).toBeLessThan(20);
  });

  it('at lights-on every Auto Water Changer takes its change from the matching reserve, with no salt from the shelf', () => {
    const { g, fresh, marine } = facility({ fresh: 2, marine: 2, salt: 0, hour: 24 * 3 + 7 });
    const room = waterRoom(g)!;
    room.salt = 60;
    const before = { fresh: room.fresh, salt: room.salt, sg: marine.map((t) => t.water.salinitySG) };
    run(g, 2); // across 08:00 (prep refills fresh too)
    for (const t of [...fresh, ...marine]) expect(lastChange(t)).toBe(24 * 3 + 8);
    expect(g.inventory.salt).toBe(0);
    expect(room.salt).toBeLessThan(before.salt - 3); // two 20 gal marine tanks × ~10 %
    for (const [i, t] of marine.entries()) expect(Math.abs(t.water.salinitySG - before.sg[i])).toBeLessThan(0.002); // not weakened
    expect(g.log.some((e) => /^Morning water changes · 4 tanks · /.test(e.text))).toBe(true);
  });

  it('a change that can\'t get its water is skipped, not done weak; later tanks that fit still get theirs (tankOrder)', () => {
    const { g, marine, fresh } = facility({ fresh: 1, marine: 3, salt: 0, hour: 24 * 3 + 7.5 });
    const room = waterRoom(g)!;
    // enough salt water for one marine change only (each takes about 2 gal from a 20 gal tank at 10 %)
    room.salt = 2.5;
    const sg = marine.map((t) => t.water.salinitySG);
    run(g, 1);
    expect(lastChange(marine[0])).toBe(24 * 3 + 8);
    expect(lastChange(marine[1])).toBeUndefined();
    expect(lastChange(marine[2])).toBeUndefined();
    expect(lastChange(fresh[0])).toBe(24 * 3 + 8); // fresh water still covers the freshwater tank
    expect(marine[1].water.salinitySG).toBeGreaterThanOrEqual(sg[1] - 1e-9); // not diluted by a weak change (evaporation only)
    expect(room.salt).toBeGreaterThanOrEqual(0);
    expect(g.log.some((e) => /^Morning water changes · 2 tanks · .* · 2 skipped$/.test(e.text))).toBe(true);
  });

  it('a brackish tank blends salt and fresh water to its target salinity, with no salt from the shelf (INTAKE C-17)', () => {
    const { g } = facility({ fresh: 0, marine: 0, hour: 24 * 3 + 7 });
    unlock(g, 'brackish', { silent: true });
    const t = createTank(g, 'g20L', 'brackish', { cycled: true, placement: { x: 4, z: 2, rotY: 0 }, name: 'Estuary' });
    t.lighting.onHour = 8;
    installEquipment(g, t.id, 'auto_water_changer', { purchased: true });
    addCreature(g, createCreature(g, simRng(g), 'bumblebee_goby', { ageDays: 60 }), t.id);
    const room = waterRoom(g)!;
    room.salt = 60;
    const sg0 = t.water.salinitySG;
    const need = tankChangeNeed(g, t)!;
    expect(need.salt).toBeGreaterThan(0);
    expect(need.fresh).toBeGreaterThan(0);
    expect(need.salt / (need.salt + need.fresh)).toBeCloseTo(saltShare(g, t), 6);
    run(g, 1.5);
    expect(lastChange(t)).toBe(24 * 3 + 8);
    expect(room.salt).toBeCloseTo(60 - need.salt, 2); // reserves are kept to 0.001 gal
    expect(Math.abs(t.water.salinitySG - sg0)).toBeLessThan(0.002);
    expect(g.inventory.salt).toBe(0);
  });

  it('the Auto Top-Offs draw only from the fresh reserve and stop while it is empty', () => {
    const { g, fresh } = facility({ fresh: 1, marine: 0, ato: true });
    const room = waterRoom(g)!;
    const tank = fresh[0];
    tank.water.level = 0.97;
    room.fresh = 0;
    stepTank(g, tank, 6, 'full', g.clock.hour + 6); // the tank alone: no prep runs here
    expect(room.fresh).toBe(0);
    expect(tank.water.level).toBeLessThan(0.97); // evaporating, not topped off
    room.fresh = 5;
    stepTank(g, tank, 1, 'full', g.clock.hour + 7);
    expect(tank.water.level).toBeGreaterThanOrEqual(0.994);
    expect(room.fresh).toBeLessThan(5);
  });

  it('a freshwater-only Water room mixes no salt and raises no salt item (ADR-0026 decision 12)', () => {
    const { g } = facility({ fresh: 2, marine: 0, salt: 0, rosa: 150 });
    expect(saltWaterNeeded(g)).toBe(false);
    run(g, 48);
    expect(waterRoom(g)!.mix ?? null).toBeNull();
    expect(automationProblems(g).some((p) => p.kind === 'supply' && p.supply === 'salt')).toBe(false);
  });

  it('without a Water room the device runs as before: shelf salt, inside the tank step (AUTO-010)', () => {
    const { g, marine } = facility({ fresh: 0, marine: 1, salt: 20, water: false, hour: 24 * 3 + 7 });
    run(g, 2);
    expect(lastChange(marine[0])).toBe(24 * 3 + 8);
    expect(g.inventory.salt).toBeLessThan(20);
  });

  it('held water changes and salt mixing are skipped, not queued (AUTO-036)', () => {
    const { g, fresh, marine } = facility({ fresh: 1, marine: 1, salt: 8.2, hour: 24 * 3 + 7 });
    const room = waterRoom(g)!;
    room.salt = 10;
    holdAll(g);
    run(g, 26); // through 08:00, 10:00, 22:00 and the next 08:00
    expect(lastChange(fresh[0])).toBeUndefined();
    expect(lastChange(marine[0])).toBeUndefined();
    expect(room.mix ?? null).toBeNull();
    expect(g.inventory.salt).toBe(8.2);
    setHold(g, 'water', false);
    run(g, 2); // nothing catches up at resume: the next change is at the next lights-on
    expect(lastChange(fresh[0])).toBeUndefined();
    run(g, 22);
    expect(lastChange(fresh[0])).toBe(24 * 5 + 8);
  });
});

describe('AUTO-037: facility jobs settle tanks and share stock in tankOrder, whatever the step size or focus', () => {
  const outcome = (piece: number, opts: { forceFull?: boolean; focus?: string | null }) => {
    const f = facility({ fresh: 3, marine: 3, salt: 12.3, hour: 24 * 3 + 2, rosa: null });
    waterRoom(f.g)!.salt = 25;
    run(f.g, 72, piece, opts.focus === 'first' ? { focus: f.fresh[0].id } : opts);
    const room = waterRoom(f.g)!;
    return {
      changes: [...f.fresh, ...f.marine].map((t) => lastChange(t)),
      salt: f.g.inventory.salt,
      fresh: room.fresh,
      reserve: room.salt + (room.mix?.gal ?? 0),
      batches: f.g.log.filter((e) => e.text.startsWith('Salt mixing')).map((e) => e.hour),
    };
  };
  it('0.25 h and 0.5 h steps, full and background fidelity: the same jobs at the same hours and the same stock', () => {
    const a = outcome(0.5, { forceFull: true });
    for (const b of [outcome(0.25, { forceFull: true }), outcome(0.5, { focus: 'first' })]) {
      expect(b.changes).toEqual(a.changes);
      expect(b.batches).toEqual(a.batches);
      expect(b.salt).toBe(a.salt);
      expect(Math.abs(b.fresh - a.fresh)).toBeLessThan(0.5);
      expect(Math.abs(b.reserve - a.reserve)).toBeLessThan(0.5);
    }
  });
});
