/**
 * lane:automation (chunk 5; DESIGN-S3D §9.3, ADR-0026 decisions 7 and 8) — the Live food room and the live-food dosers
 * (AUTO-033): cones and jars consume once at the start and add once at the harvest, a full store makes a ready culture
 * wait ("Full"), nothing expires, a culture with no inputs waits and shows a shortage, a doser feeds the young their
 * stage's live food by need, and manual mode holds it all without a catch-up burst.
 */
import { describe, it, expect } from 'vitest';
import { facility, run } from './support/automation';
import { automationProblems, cultureState, doseTank, doserNeeds, foodRoom, holdAll, resumeAll, storeCap, waterRoom } from '@/sim/automation';
import { BRINE, FOOD_ROOM, INFUSORIA, VEGETABLES } from '@/data/catalog/machines';
import { installEquipment } from '@/sim/care';
import { getSpecies } from '@/data/species';
import { createClutch } from '@/sim/life/breeding/clutch';
import { encodeRecord, decodeRecord } from '@/persistence';
import type { GameState } from '@/types';

const serv = (g: GameState, id: string) => g.inventory.foods[id] ?? 0;

/** A facility with the Live food room, on the hour (Day 4, 06:00). */
function room(o: { eggs?: number; veg?: number; salt?: number } = {}) {
  const f = facility({ fresh: 1, marine: 0, food: true, eggs: o.eggs ?? 30, veg: o.veg ?? 20, hour: 24 * 3 + 6, rosa: null });
  waterRoom(f.g)!.salt = o.salt ?? 60;
  f.g.inventory.foods[BRINE] = 0;
  f.g.inventory.foods[INFUSORIA] = 0;
  return f;
}

describe('AUTO-033: hatchery cones and infusoria jars', () => {
  it('research installs two cones and four jars (ADR-0026 decision 8)', () => {
    const { g } = room();
    expect(foodRoom(g)!.cones.length).toBe(FOOD_ROOM.baseCones);
    expect(foodRoom(g)!.jars.length).toBe(FOOD_ROOM.baseJars);
  });

  it('a cone takes 1 scoop and 0.5 gal of salt water at the start and gives 20 servings 24 h later, then restarts', () => {
    const { g } = room({ eggs: 30, veg: 0 });
    run(g, 0.5); // 06:00: both cones start
    expect(g.inventory.brineShrimpEggs).toBe(28);
    expect(waterRoom(g)!.salt).toBeCloseTo(59, 6);
    expect(foodRoom(g)!.cones.every((c) => c.startedHour === 24 * 3 + 6)).toBe(true);
    run(g, 23.5);
    expect(serv(g, BRINE)).toBe(0);
    run(g, 0.5); // 06:00 the next day: harvest, then restart
    expect(serv(g, BRINE)).toBe(40);
    expect(g.inventory.brineShrimpEggs).toBe(26);
    expect(g.automation!.today!.made[BRINE]).toBe(40);
    expect(g.log.filter((e) => /^Cone [12] harvested · 20 servings of Live Baby Brine Shrimp$/.test(e.text)).length).toBe(2);
  });

  it('a jar takes 1 serving of Blanched Vegetables and gives 15 servings of Infusoria Culture 72 h later', () => {
    const { g } = room({ eggs: 0, veg: 4 });
    run(g, 0.5);
    expect(serv(g, VEGETABLES)).toBe(0);
    run(g, 71.5);
    expect(serv(g, INFUSORIA)).toBe(0);
    run(g, 0.5);
    expect(serv(g, INFUSORIA)).toBe(60);
  });

  it('a culture with nothing to start on waits empty, and Problems shows the shortage (no stock manager: nobody reorders)', () => {
    const { g } = room({ eggs: 0, veg: 0 });
    run(g, 2);
    expect(foodRoom(g)!.cones.every((c) => c.startedHour === null)).toBe(true);
    const eggs = automationProblems(g).find((p) => p.kind === 'supply' && p.supply === 'eggs');
    expect(eggs).toMatchObject({ state: 'out', tone: 'danger', why: 'no_manager' });
    expect(automationProblems(g).some((p) => p.kind === 'supply' && p.supply === 'veg' && p.state === 'out')).toBe(true);
  });

  it('nothing expires; a harvest that would pass the store waits ("Full") until there is room, then lands once', () => {
    const { g } = room({ eggs: 30, veg: 0 });
    const cap = storeCap(foodRoom(g)!, BRINE);
    run(g, 0.5);
    g.inventory.foods[BRINE] = cap - 10; // no room for 20 more
    run(g, 24);
    expect(serv(g, BRINE)).toBe(cap - 10);
    expect(cultureState(g, foodRoom(g)!, 'cone', 0).status).toBe('full');
    run(g, 24 * 4);
    expect(serv(g, BRINE)).toBe(cap - 10); // kept, never spoils
    g.inventory.foods[BRINE] = cap - 40; // the tanks used some
    run(g, 1);
    expect(serv(g, BRINE)).toBe(cap); // both waiting harvests land, once each
    run(g, 3);
    expect(serv(g, BRINE)).toBe(cap);
  });

  it('held cultures keep growing; a ready one waits and is harvested once after resume, with no burst (C-24)', () => {
    const { g } = room({ eggs: 30, veg: 0 });
    run(g, 0.5);
    holdAll(g);
    run(g, 48);
    expect(serv(g, BRINE)).toBe(0);
    expect(g.inventory.brineShrimpEggs).toBe(28); // no restarts while held
    resumeAll(g);
    run(g, 1);
    expect(serv(g, BRINE)).toBe(40);
    expect(g.inventory.brineShrimpEggs).toBe(26);
  });

  it('a save and load mid-culture harvests it once, at the same hour (AUTO-026)', () => {
    const a = room({ eggs: 30, veg: 0 });
    run(a.g, 12.5);
    const b = decodeRecord(encodeRecord(a.g, 'auto').text).state;
    run(a.g, 12);
    run(b, 12);
    expect(serv(b, BRINE)).toBe(serv(a.g, BRINE));
    expect(b.inventory.brineShrimpEggs).toBe(a.g.inventory.brineShrimpEggs);
    expect(serv(b, BRINE)).toBe(40);
  });
});

describe('AUTO-033: live-food dosers', () => {
  function withFry(count = 45) {
    const f = room({ eggs: 0, veg: 0 });
    const t = f.fresh[0];
    for (const c of Object.values(f.g.creatures)) if (c.tankId === t.id) delete f.g.creatures[c.id]; // no tetras to eat the fry
    installEquipment(f.g, t.id, 'live_food_doser', { purchased: true });
    const cl = createClutch(f.g, { sp: getSpecies('betta'), tank: t, mother: null as never, father: null as never, hour: f.g.clock.hour - 40, stage: 'fry', count, visual: 'fry_cloud', nextStageHour: f.g.clock.hour + 200 });
    return { ...f, t, cl };
  }

  it('feeds free-swimming young their stage\'s live food, a serving per 20 young, at its dose times', () => {
    const { g, t, cl } = withFry(45);
    g.inventory.foods[BRINE] = 20;
    expect(doserNeeds(g, t).map((n) => ({ foods: n.foods, servings: n.servings }))).toEqual([{ foods: [BRINE, INFUSORIA], servings: 3 }]);
    run(g, 2.5); // across 08:00
    expect(serv(g, BRINE)).toBe(17);
    expect(t.water.lab?.lastDoseHour).toBe(24 * 3 + 8);
    expect(g.automation!.today!.used[BRINE]).toBe(3);
    run(g, 12.5); // 14:00 and 20:00
    expect(serv(g, BRINE)).toBe(11);
    expect(cl.fed ?? 0).toBeGreaterThan(0.5);
  });

  it('uses whichever of the stage\'s foods is in stock (bought and home-grown are one item)', () => {
    const { g } = withFry(10);
    g.inventory.foods[INFUSORIA] = 5;
    run(g, 2.5);
    expect(serv(g, INFUSORIA)).toBe(4);
  });

  it('with nothing to feed it is idle; with no stock it skips and Problems shows it', () => {
    const { g, t, cl } = withFry(10);
    expect(doseTank(g, t, 24 * 3 + 8)).toBe('short');
    expect(automationProblems(g).find((p) => p.kind === 'supply' && p.supply === 'live')).toMatchObject({ tankIds: [t.id] });
    delete g.clutches[cl.id];
    expect(doseTank(g, t, 24 * 3 + 14)).toBe('idle');
  });

  it('held: no doses', () => {
    const { g } = withFry(10);
    g.inventory.foods[BRINE] = 20;
    holdAll(g);
    run(g, 24);
    expect(serv(g, BRINE)).toBe(20);
  });
});
