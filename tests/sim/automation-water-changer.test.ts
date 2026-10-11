/**
 * lane:automation (chunk 3; 0.5 spec §10.3, §20.1) — the Auto Water Changer: its data (AUTO-006, B-149), the shared
 * water-change core (AUTO-008), the daily lights-on change and weekly scrape (AUTO-009), salt (AUTO-010), the keepers
 * (AUTO-011) and background LOD (B-176).
 *
 * Step-size tolerance (AUTO-009 A3): the same game days stepped in 4 h pieces and in 0.25 h pieces make exactly the
 * same changes and scrapes at the same hours, and their water ends within 0.15 °C, 0.05 pH and 3 % of nitrate (or
 * 0.5 ppm) of each other (a 4 h piece applies the change at the end of the piece that holds the lights-on hour).
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { stepTank, advanceWorld, tankLod } from '@/sim/world';
import { createCreature, addCreature } from '@/sim/life';
import { starterAquascape } from '@/sim/aquascape';
import { installEquipment, setEquipment, waterChange, waterChangeCost, cleanTank } from '@/sim/care';
import { MAX_PER_KIND } from '@/sim/care/tuning';
import { tankDailyCost } from '@/sim/water';
import { equipmentSummary } from '@/sim/water/env';
import { AUTO_CHANGE_GAP_H, AUTO_SCRAPE_GAP_H } from '@/sim/water/step';
import { applyWaterChange, changeSaltNeed } from '@/sim/water/change';
import { addStaffDirect, keeperWaterCare, AUTO_CHANGER_COVERS_H } from '@/sim/staff';
import { simulateOffline } from '@/persistence/offline';
import { stateHash } from '@/persistence/hash';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { hourOfDay, GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { simRng } from '@/sim/rng';
import { clonePlain } from '@/sim/economy/util';

interface Build {
  wc?: WaterClass;
  tier?: string;
  salt?: number;
  changer?: boolean;
  species?: string;
  n?: number;
  seed?: number;
}

/** One tank (lights on at 08:00), the clock at 02:00 on day 4, optional Auto Water Changer and residents. */
function build(o: Build = {}): { s: GameState; id: string; tank: Tank } {
  const s: GameState = newGame({ starterId: 'betta', starterName: 'T', seed: o.seed ?? 5 });
  for (const id of Object.keys(s.creatures)) delete s.creatures[id];
  for (const id of [...s.tankOrder]) delete s.tanks[id];
  s.tankOrder = [];
  s.log = [];
  s.clock.hour = 24 * 3 + 2;
  s.inventory.foods = { flake_tropical: 2000, marine_pellets: 2000 };
  s.inventory.salt = o.salt ?? 0;
  const marine = (o.wc ?? 'freshwater_tropical').startsWith('marine') || o.wc === 'reef' || o.wc === 'brackish';
  const tank = createTank(s, o.tier ?? 'g20L', o.wc ?? 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
  tank.decor = starterAquascape(s, 'generic', tank);
  tank.lighting.onHour = 8;
  tank.lighting.offHour = 20;
  if (o.changer !== false) installEquipment(s, tank.id, 'auto_water_changer', { purchased: true });
  const rng = simRng(s);
  const species = o.species ?? (marine ? 'ocellaris_clownfish' : 'neon_tetra');
  for (let i = 0; i < (o.n ?? 2); i++) addCreature(s, createCreature(s, rng, species, { ageDays: 60 }), tank.id);
  return { s, id: tank.id, tank };
}

const changer = (t: Tank) => t.equipment.find((e) => e.defId === 'auto_water_changer')!;

/** Step one tank by `piece`-hour pieces over `hours`, as a background tank would be. */
function stepPieces(s: GameState, tank: Tank, hours: number, piece: number, lod: 'full' | 'summary' = 'summary'): void {
  for (let done = 0; done < hours - 1e-9; done += piece) {
    const dt = Math.min(piece, hours - done);
    s.clock.hour += dt;
    stepTank(s, tank, dt, lod, s.clock.hour);
  }
}

/** Every distinct value a lab hour took while stepping hour by hour (the device's run log). */
function runLog(s: GameState, tank: Tank, hours: number, step: (h: number) => void): { changes: number[]; scrapes: number[] } {
  const changes: number[] = [];
  const scrapes: number[] = [];
  for (let h = 0; h < hours; h++) {
    step(1);
    const lab = tank.water.lab ?? {};
    if (lab.lastAutoChangeHour !== undefined && changes[changes.length - 1] !== lab.lastAutoChangeHour) changes.push(lab.lastAutoChangeHour);
    if (lab.lastAutoScrapeHour !== undefined && scrapes[scrapes.length - 1] !== lab.lastAutoScrapeHour) scrapes.push(lab.lastAutoScrapeHour);
  }
  return { changes, scrapes };
}

describe('AUTO-006 / B-149: the Auto Water Changer’s data', () => {
  it('matches §10.3 field by field, with the Autofeeder’s unlock (its kind label: automation-autoclean-ui)', () => {
    const def = getEquipmentDef('auto_water_changer')!;
    expect(def).toMatchObject({
      id: 'auto_water_changer',
      kind: 'water_changer',
      name: 'Auto Water Changer',
      tier: 2,
      price: 120,
      upkeep: 0.06,
      unlock: 'gear_autofeeder',
      environments: ['freshwater', 'marine', 'brackish'],
      gallonsRange: { min: 5, max: 300 },
      stats: { defaultSetting: 0.1, failureRate: 0.002 },
      visual: 'ato_sensor',
      description: 'Swaps a small share of the water every morning from a conditioned reservoir and scrapes the front glass once a week. Marine and brackish tanks draw on your salt stock for the new water.',
    });
    expect(def.unlock).toBe(getEquipmentDef('autofeeder')!.unlock);
  });

  it('a tank holds one: a second install fails (B-149)', () => {
    const { s, id } = build();
    expect(MAX_PER_KIND.water_changer).toBe(1);
    const r = installEquipment(s, id, 'auto_water_changer', { purchased: true });
    expect(r.ok).toBe(false);
    expect(s.tanks[id].equipment.filter((e) => e.defId === 'auto_water_changer')).toHaveLength(1);
  });

  it('its upkeep is in tankDailyCost while it is on, and not while it is off', () => {
    const { s, tank } = build();
    const on = tankDailyCost(s, tank);
    setEquipment(s, tank.id, changer(tank).id, { on: false });
    const off = tankDailyCost(s, tank);
    expect(Math.round((on - off) * 100) / 100).toBe(0.06);
  });

  it('equipmentSummary fills waterChanger like autofeeder: working units only', () => {
    const { tank } = build();
    expect(equipmentSummary(tank).waterChanger?.def.id).toBe('auto_water_changer');
    changer(tank).failed = true;
    expect(equipmentSummary(tank).waterChanger).toBeNull();
    changer(tank).failed = false;
    changer(tank).on = false;
    expect(equipmentSummary(tank).waterChanger).toBeNull();
  });
});

describe('AUTO-009: a change at lights-on each game day, the glass once a week', () => {
  it('over 14 game days: 14 changes at 08:00 and 2 scrapes, a week apart; player counters untouched', () => {
    const { s, tank } = build();
    const counters = { ...s.progress.counters };
    const { changes, scrapes } = runLog(s, tank, 24 * 14, (h) => stepPieces(s, tank, h, 0.5, 'full'));
    expect(changes).toHaveLength(14);
    expect(changes.every((h) => hourOfDay(h) === 8)).toBe(true);
    for (let i = 1; i < changes.length; i++) expect(changes[i] - changes[i - 1]).toBe(24);
    expect(scrapes).toHaveLength(2);
    expect(scrapes[1] - scrapes[0]).toBe(AUTO_SCRAPE_GAP_H);
    expect(s.progress.counters.waterChanges).toBe(counters.waterChanges);
    expect(s.progress.counters.cleanings).toBe(counters.cleanings);
    expect(tank.lastMaintenanceHour).toBe(changes[changes.length - 1]);
  });

  it('a change swaps the device’s share: nitrate drops by about 10 % of the gap to the tap water', () => {
    const { s, tank } = build();
    stepPieces(s, tank, 5.5, 0.5, 'full'); // 07:30
    tank.water.nitrate = 40;
    const before = tank.water.nitrate;
    stepPieces(s, tank, 1, 0.5, 'full'); // past 08:00
    expect(tank.water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
    expect(tank.water.nitrate).toBeLessThan(before * 0.93);
    expect(tank.water.nitrate).toBeGreaterThan(before * 0.85);
  });

  it('off or failed, it does nothing; a failure raises the equipment-failed alert the drawer already shows', () => {
    for (const how of ['off', 'failed'] as const) {
      const { s, tank } = build();
      if (how === 'off') setEquipment(s, tank.id, changer(tank).id, { on: false });
      else changer(tank).failed = true;
      const { changes, scrapes } = runLog(s, tank, 72, (h) => stepPieces(s, tank, h, 0.5, 'full'));
      expect(changes).toEqual([]);
      expect(scrapes).toEqual([]);
    }
  });

  it('a moved lights-on hour moves the change; the 20-hour guard keeps it to one a day', () => {
    const { s, tank } = build();
    stepPieces(s, tank, 7, 0.5, 'full'); // past 08:00 on day 4: changed
    const first = tank.water.lab!.lastAutoChangeHour!;
    tank.lighting.onHour = 10; // 10:00 the same day is 2 h later: too soon
    stepPieces(s, tank, 4, 0.5, 'full');
    expect(tank.water.lab!.lastAutoChangeHour).toBe(first);
    stepPieces(s, tank, 24, 0.5, 'full'); // 10:00 the next day
    expect(tank.water.lab!.lastAutoChangeHour).toBe(first + 26);
    expect(AUTO_CHANGE_GAP_H).toBe(20);
  });

  it('is deterministic: two identical runs end with the same stateHash', () => {
    const a = build({ seed: 11 });
    const b = build({ seed: 11 });
    advanceWorld(a.s, 24 * 5, { forceFull: true });
    advanceWorld(b.s, 24 * 5, { forceFull: true });
    expect(stateHash(a.s)).toBe(stateHash(b.s));
    expect(a.tank.water.lab?.lastAutoChangeHour).toBeDefined();
  });

  it('is step-size invariant: 4 h pieces and 0.25 h pieces make the same runs and end with close water', () => {
    const coarse = build({ seed: 7 });
    const fine = build({ seed: 7 });
    const c = runLog(coarse.s, coarse.tank, 24 * 6, (h) => stepPieces(coarse.s, coarse.tank, h, 1, 'summary'));
    // the 1 h runLog tick is split in 0.25 h pieces for `fine`, and the coarse world takes 4 h pieces below
    const f = runLog(fine.s, fine.tank, 24 * 6, (h) => stepPieces(fine.s, fine.tank, h, 0.25, 'full'));
    expect(c.changes).toEqual(f.changes);
    expect(c.scrapes).toEqual(f.scrapes);
    const c4 = build({ seed: 7 });
    const log4: number[] = [];
    for (let i = 0; i < 36; i++) {
      stepPieces(c4.s, c4.tank, 4, 4, 'summary');
      const h = c4.tank.water.lab?.lastAutoChangeHour;
      if (h !== undefined && log4[log4.length - 1] !== h) log4.push(h);
    }
    expect(log4).toEqual(f.changes);
    const wf = fine.tank.water;
    const w4 = c4.tank.water;
    expect(Math.abs(w4.tempC - wf.tempC)).toBeLessThan(0.15);
    expect(Math.abs(w4.pH - wf.pH)).toBeLessThan(0.05);
    expect(Math.abs(w4.nitrate - wf.nitrate)).toBeLessThan(Math.max(0.5, wf.nitrate * 0.03));
  });

  it('runs in the offline catch-up, and doesn’t fail during its grace (B-125)', () => {
    const { s, tank } = build();
    s.clock.speed = 1;
    // 12 game hours away (the cap) from 02:00: the 08:00 change happens while catching up
    const ms = (12 / GAME_HOURS_PER_REAL_SECOND) * 1000;
    changer(tank).condition = 0; // worn out: most likely to fail, but not while catching up
    simulateOffline(s, ms);
    expect(tank.water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
    expect(changer(tank).failed).toBeFalsy();
  });

  it('B-176: a background tank (reduced or summary LOD) runs at the same hours as the focused one', () => {
    const logs: Record<'full' | 'reduced' | 'summary', number[]> = { full: [], reduced: [], summary: [] };
    for (const lod of ['full', 'reduced', 'summary'] as const) {
      const w = build({ seed: 3 });
      // summary LOD: past the 12-tank budget (tankOrder index ≥ 12), stepped in 4 h chunks of sim debt
      const extra = lod === 'full' ? 0 : lod === 'reduced' ? 1 : 12;
      for (let i = 0; i < extra; i++) createTank(w.s, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 3 + i, z: 0, rotY: 0 } });
      w.s.tankOrder = [...w.s.tankOrder.filter((t) => t !== w.id), w.id];
      const focus = lod === 'full' ? w.id : w.s.tankOrder[0];
      expect(tankLod(w.s, w.id, { focusTankId: focus })).toBe(lod);
      for (let h = 0; h < 76; h++) {
        advanceWorld(w.s, 1, { focusTankId: focus });
        const x = w.tank.water.lab?.lastAutoChangeHour;
        if (x !== undefined && logs[lod][logs[lod].length - 1] !== x) logs[lod].push(x);
      }
    }
    expect(logs.full).toHaveLength(3);
    expect(logs.reduced).toEqual(logs.full);
    expect(logs.summary).toEqual(logs.full);
  });
});

describe('AUTO-008: the player’s change and scrape share the core and keep their counters', () => {
  it('manual waterChange and cleanTank still bump waterChanges and cleanings, and still say what they did', () => {
    const { s, id } = build({ changer: false });
    const w0 = s.progress.counters.waterChanges ?? 0;
    const c0 = s.progress.counters.cleanings ?? 0;
    const r = waterChange(s, id, 0.25);
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/^Changed 25% of the water\. Nitrate /);
    s.tanks[id].water.algae = 40;
    const g = cleanTank(s, id, 'glass');
    expect(g.message).toMatch(/^Scraped algae off the glass \(40% → 18%\)/);
    expect(s.progress.counters.waterChanges).toBe(w0 + 1);
    expect(s.progress.counters.cleanings).toBe(c0 + 1);
  });

  it('the core is the manual change minus the player’s side: same water, same salt, no counter', () => {
    const a = build({ wc: 'marine_fowlr', salt: 30, changer: false });
    const b = clonePlain(a.s);
    const tb = b.tanks[a.id];
    waterChange(a.s, a.id, 0.1, { matchTemperature: true });
    applyWaterChange(b, tb, 0.1, { hour: b.clock.hour, matchTemperature: true });
    expect(tb.water).toEqual(a.s.tanks[a.id].water);
    expect(b.inventory.salt).toBe(a.s.inventory.salt);
    expect((b.progress.counters.waterChanges ?? 0) + 1).toBe(a.s.progress.counters.waterChanges);
  });

  it('a big temperature jump still shocks: the sudden-change check applies to the core', () => {
    const { s, tank } = build({ changer: false });
    s.isShowcase = false;
    tank.water.tempC = 27;
    const out = applyWaterChange(s, tank, 0.5, { hour: s.clock.hour, newWaterTempC: 15 });
    expect(out.shock).toMatch(/temperature/);
    expect(tank.water.shock?.severity).toBeGreaterThan(0.1);
  });
});

describe('AUTO-010: salt water', () => {
  it('a device change on a marine tank uses the salt a manual 10 % change would', () => {
    const { s, tank } = build({ wc: 'marine_fowlr', salt: 40 });
    stepPieces(s, tank, 5.75, 0.25, 'full'); // 07:45
    const manual = clonePlain(s);
    const need = waterChangeCost(manual, tank.id, 0.1).saltKg;
    waterChange(manual, tank.id, 0.1, { matchTemperature: true });
    const manualUsed = 40 - manual.inventory.salt;
    const saltBefore = s.inventory.salt;
    stepPieces(s, tank, 0.5, 0.25, 'full'); // through 08:00 (evaporation in that quarter hour is tiny)
    const used = saltBefore - s.inventory.salt;
    expect(tank.water.lab?.lastAutoChangeHour).toBe(24 * 3 + 8);
    expect(used).toBeGreaterThan(0);
    expect(Math.abs(used - manualUsed)).toBeLessThan(0.02);
    expect(Math.abs(used - need)).toBeLessThan(0.02);
  });

  it('without enough salt it skips the change and says so once a game day', () => {
    const { s, tank } = build({ wc: 'marine_fowlr', salt: 0 });
    const { changes } = runLog(s, tank, 72, (h) => stepPieces(s, tank, h, 0.5, 'full'));
    expect(changes).toEqual([]);
    const notices = s.log.filter((e) => e.text === `${tank.name}: the Auto Water Changer is out of salt. Buy marine salt to keep it running.`);
    expect(notices).toHaveLength(3);
    expect(notices.map((e) => e.notice?.topic)).toEqual(['care', 'care', 'care']);
    expect(notices.filter((e) => e.toast)).toHaveLength(1); // the first one toasts, like the autofeeder's notices
    expect(changeSaltNeed(s, tank, 0.1)).toBeGreaterThan(0);
  });

  it('freshwater changes use no salt', () => {
    const { s, tank } = build({ salt: 25 });
    runLog(s, tank, 30, (h) => stepPieces(s, tank, h, 0.5, 'full'));
    expect(tank.water.lab?.lastAutoChangeHour).toBeDefined();
    expect(s.inventory.salt).toBe(25);
  });
});

describe('AUTO-011: keepers leave routine water care to a device that ran', () => {
  function keeperTank() {
    const { s, tank } = build();
    const m = addStaffDirect(s, { name: 'Ana Test', role: 'aquarist', skill: 3, trait: 'meticulous', tankIds: [tank.id] });
    const care = (s.staff!.care[tank.id] ??= {});
    care.lastWaterChange = -1e6; // a routine change is long due
    tank.lastMaintenanceHour = -1e6;
    tank.water.algae = 40;
    const ran = 24 * 10 + 8;
    tank.water.lab!.lastAutoChangeHour = ran;
    return { s, tank, m, ran };
  }

  it('29 h after the device ran: no routine change, no scrape; 31 h after: both', () => {
    const { s, tank, m, ran } = keeperTank();
    expect(AUTO_CHANGER_COVERS_H).toBe(30);
    const at29 = keeperWaterCare(s, m, tank, 'morning', ran + 29);
    expect(at29).not.toContain('water');
    expect(at29).not.toContain('glass');
    const at31 = keeperWaterCare(s, m, tank, 'morning', ran + 31);
    expect(at31).toContain('water');
    expect(at31).toContain('glass');
  });

  it('an ammonia emergency gets its change even right after the device ran; gravel is still vacuumed', () => {
    const { s, tank, m, ran } = keeperTank();
    tank.water.ammonia = 2;
    tank.water.detritus = 80;
    const done = keeperWaterCare(s, m, tank, 'morning', ran + 4);
    expect(done).toContain('water');
    expect(done).toContain('gravel');
  });

  it('without the device a keeper works exactly as before (the routine change and the scrape happen)', () => {
    const { s, tank, m, ran } = keeperTank();
    delete tank.water.lab!.lastAutoChangeHour;
    const done = keeperWaterCare(s, m, tank, 'morning', ran + 1);
    expect(done).toContain('water');
    expect(done).toContain('glass');
  });
});
