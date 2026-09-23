import { describe, it, expect } from 'vitest';
import type { GameState, Tank, Creature, FoodTag } from '@/types';
import { STARTER_IDS, getSpecies } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { makeContext } from '@/sim/context';
import { mulberry32 } from '@/sim/rng';
import { createCreature, addCreature, stepTankCreatures, adultSizeFor } from '@/sim/life';
import { registerGlassTap, moveCreature } from '@/sim/life/actions';
import { createTank } from '@/sim/tanks';

function setup(starter: (typeof STARTER_IDS)[number], seed = 1): { s: GameState; tank: Tank; c: Creature } {
  const s = newGame({ starterId: starter, starterName: 'Pip', seed });
  const tank = s.tanks[s.tankOrder[0]];
  const c = Object.values(s.creatures)[0];
  return { s, tank, c };
}

/** Step creatures only (no water sim), keeping chemistry clean unless told otherwise. */
function run(s: GameState, tank: Tank, hours: number, each?: () => void, step = 1): void {
  for (let t = 0; t < hours; t += step) {
    each?.();
    const ctx = makeContext(s, step);
    stepTankCreatures(s, tank, step, ctx);
    s.clock.hour += step;
  }
}

function cleanWater(tank: Tank): void {
  tank.water.ammonia = 0;
  tank.water.nitrite = 0;
  tank.water.nitrate = 5;
  tank.water.oxygen = 0.95;
}

function addFood(tank: Tank, tag: FoodTag, amount: number): void {
  tank.water.foodInWater = amount;
  tank.water.foodByTag = { [tag]: amount };
}

function allFinite(s: GameState): boolean {
  for (const c of Object.values(s.creatures)) {
    for (const v of Object.values(c.stats)) if (!Number.isFinite(v)) return false;
    if (!Number.isFinite(c.sizeCm)) return false;
    for (const v of Object.values(c.genome.potentials)) if (!Number.isFinite(v)) return false;
  }
  return true;
}

describe('lifecycle — metabolism & feeding', () => {
  it('hunger rises with time and feeding lowers it', () => {
    const { s, tank, c } = setup('betta');
    cleanWater(tank);
    c.stats.hunger = 10;
    run(s, tank, 10);
    const hungry = c.stats.hunger;
    expect(hungry).toBeGreaterThan(30);
    addFood(tank, 'bloodworm', 200);
    run(s, tank, 1);
    expect(c.stats.hunger).toBeLessThan(hungry - 20);
    expect(tank.water.foodInWater).toBeLessThan(200);
    expect(c.life?.lastAteHour).toBeDefined();
  });

  it('a slow seahorse gets less food than a fast feeder in the same tank', () => {
    const { s, tank, c: seahorse } = setup('lined_seahorse', 7);
    cleanWater(tank);
    const clown = addCreature(s, createCreature(s, mulberry32(3), 'ocellaris_clownfish', { ageDays: 30 }), tank.id);
    seahorse.stats.hunger = 80;
    clown.stats.hunger = 80;
    addFood(tank, 'mysis', 45);
    run(s, tank, 0.5, undefined, 0.5);
    const seaGain = 80 - seahorse.stats.hunger;
    const clownGain = 80 - clown.stats.hunger;
    expect(clownGain).toBeGreaterThan(seaGain * 2);
    expect(clown.life?.lastMealUnits ?? 0).toBeGreaterThan(seahorse.life?.lastMealUnits ?? 0);
  });

  it('target feeding gives the seahorse first pick', () => {
    const { s, tank, c: seahorse } = setup('lined_seahorse', 7);
    cleanWater(tank);
    const clown = addCreature(s, createCreature(s, mulberry32(3), 'ocellaris_clownfish', { ageDays: 30 }), tank.id);
    seahorse.stats.hunger = 80;
    clown.stats.hunger = 80;
    addFood(tank, 'mysis', 45);
    seahorse.life = { ...(seahorse.life ?? {}), targetFedUntil: s.clock.hour + 1 };
    run(s, tank, 0.5, undefined, 0.5);
    expect(80 - seahorse.stats.hunger).toBeGreaterThan(80 - clown.stats.hunger);
  });
});

describe('lifecycle — health, death and growth', () => {
  it('an axolotl in a warm tank loses health and the keeper is told why', () => {
    const { s, tank, c } = setup('axolotl', 5);
    const h0 = c.stats.health;
    run(s, tank, 12, () => {
      cleanWater(tank);
      tank.water.tempC = 26;
      c.stats.hunger = 20;
    });
    expect(c.stats.health).toBeLessThan(h0 - 15);
    expect(s.log.some((e) => e.kind === 'danger' && /too warm/.test(e.text))).toBe(true);
  });

  it('a cool, clean tank keeps an axolotl healthy', () => {
    const { s, tank, c } = setup('axolotl', 5);
    c.stats.health = 80;
    run(s, tank, 48, () => {
      cleanWater(tank);
      tank.water.tempC = 16.5;
      c.stats.hunger = 20;
    });
    expect(c.stats.health).toBeGreaterThan(90);
    expect(c.status).toBe('alive');
  });

  it('starvation eventually causes death with a gentle event', () => {
    const { s, tank, c } = setup('lined_seahorse', 11);
    tank.water.foodInWater = 0;
    run(s, tank, 24 * 20, () => {
      cleanWater(tank);
      tank.water.tempC = 23.5;
      tank.water.foodInWater = 0;
    });
    expect(c.status).toBe('dead');
    expect(c.deathCause).toMatch(/food/);
    const ev = s.log.find((e) => e.kind === 'death' && e.creatureId === c.id);
    expect(ev?.text).toContain('Pip');
    expect(ev?.text).not.toMatch(/blood|gore|rott/i);
    // dead animals leave the living roster but keep their record
    expect(s.creatures[c.id]).toBeDefined();
  });

  it('the offline grace period never lets an animal die', () => {
    const { s, tank, c } = setup('lined_seahorse', 11);
    s.offlineGrace = true;
    run(s, tank, 24 * 10, () => {
      cleanWater(tank);
      tank.water.tempC = 30;
    });
    expect(c.status).toBe('alive');
    expect(c.stats.health).toBeGreaterThanOrEqual(20);
    expect(c.stats.hunger).toBeLessThanOrEqual(60);
  });

  it('a well-fed juvenile grows to near adult size, matures and reveals its sex', () => {
    const { s, tank } = setup('axolotl', 13);
    const sp = getSpecies('axolotl');
    const kid = addCreature(s, createCreature(s, mulberry32(4), 'axolotl', { ageDays: 1 }), tank.id);
    expect(kid.sex).toBe('unknown');
    const start = kid.sizeCm;
    run(s, tank, 24 * 30, () => {
      cleanWater(tank);
      tank.water.tempC = 16.5;
      addFood(tank, 'earthworm', 400);
    });
    expect(kid.status).toBe('alive');
    expect(kid.sizeCm).toBeGreaterThan(start * 3);
    expect(kid.sizeCm).toBeGreaterThan(adultSizeFor(sp, kid.genome) * 0.9);
    expect(kid.lifeStage).toBe('adult');
    expect(kid.sex).not.toBe('unknown');
    expect(kid.history.some((h) => h.kind === 'milestone' && /is a (male|female)!/.test(h.text))).toBe(true);
    expect(s.log.some((e) => e.kind === 'celebrate' && e.creatureId === kid.id && /is a (male|female)!/.test(e.text))).toBe(true);
    // rich food conditions adults for breeding
    expect(kid.life?.conditioning ?? 0).toBeGreaterThan(20);
    expect(kid.stats.breedingReadiness).toBeGreaterThan(20);
  });

  it('a juvenile outgrowing a small tank triggers a warning', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 2 });
    const tiny = createTank(s, 'g5', 'freshwater_cool', { cycled: true, name: 'Nano' });
    const kid = addCreature(s, createCreature(s, mulberry32(9), 'axolotl', { ageDays: 1 }), tiny.id);
    run(s, tiny, 24 * 12, () => {
      cleanWater(tiny);
      tiny.water.tempC = 16.5;
      addFood(tiny, 'earthworm', 300);
    });
    expect(s.log.some((e) => e.kind === 'warning' && e.creatureId === kid.id && /outgrowing/.test(e.text))).toBe(true);
  });
});

describe('lifecycle — handling', () => {
  it('glass taps stress shy animals more than bold ones and never calm them', () => {
    const { s, tank, c } = setup('betta', 3);
    const shy = addCreature(s, createCreature(s, mulberry32(1), 'betta', { ageDays: 20 }), tank.id);
    c.personality = ['bold', 'glass_curious'];
    shy.personality = ['shy', 'easily_startled'];
    c.stats.stress = 10;
    shy.stats.stress = 10;
    registerGlassTap(s, tank.id, 1);
    const boldD = c.stats.stress - 10;
    const shyD = shy.stats.stress - 10;
    expect(boldD).toBeGreaterThan(0);
    expect(shyD).toBeGreaterThan(boldD * 2);
    for (let i = 0; i < 6; i++) registerGlassTap(s, tank.id, 1);
    expect(tank.tapPressure).toBeGreaterThan(4);
    expect(s.log.some((e) => e.kind === 'tip' && /give them a moment/i.test(e.text))).toBe(true);
    // repeated tapping escalates
    const before = shy.stats.stress;
    registerGlassTap(s, tank.id, 1);
    expect(shy.stats.stress - before).toBeGreaterThanOrEqual(Math.min(100 - before, shyD));
  });

  it('moving a marine animal into freshwater is hard-blocked; valid moves log history', () => {
    const { s, c } = setup('ocellaris_clownfish', 4);
    const fw = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true, name: 'Community' });
    const r = moveCreature(s, c.id, fw.id);
    expect(r.ok).toBe(false);
    expect(c.tankId).not.toBe(fw.id);
    const reef = createTank(s, 'g40B', 'reef', { cycled: true, name: 'Reef' });
    const stress0 = c.stats.stress;
    const ok = moveCreature(s, c.id, reef.id);
    expect(ok.ok).toBe(true);
    expect(c.tankId).toBe(reef.id);
    expect(c.stats.stress).toBeGreaterThan(stress0);
    expect(c.history.some((h) => h.kind === 'moved')).toBe(true);
  });
});

describe('lifecycle — robustness', () => {
  it('no NaN after 30 simulated days for every starter (advanceWorld, forceFull)', () => {
    for (const id of STARTER_IDS) {
      const s = newGame({ starterId: id, starterName: 'Pip', seed: 77 });
      const tank = s.tanks[s.tankOrder[0]];
      addCreature(s, createCreature(s, mulberry32(5), id, { ageDays: 2 }), tank.id);
      advanceWorld(s, 720, { forceFull: true });
      expect(allFinite(s), id).toBe(true);
      for (const c of Object.values(s.creatures)) {
        for (const v of Object.values(c.stats)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
        expect(c.history.length).toBeLessThanOrEqual(40);
      }
    }
  });

  it('is deterministic across identical runs and robust to big dt', () => {
    const a = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed: 31 });
    const b = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed: 31 });
    advanceWorld(a, 72, { forceFull: true });
    advanceWorld(b, 72, { forceFull: true });
    expect(JSON.stringify(a.creatures)).toBe(JSON.stringify(b.creatures));
    const { s, tank, c } = setup('axolotl', 8);
    cleanWater(tank);
    const h0 = c.stats.hunger; // starters now arrive fed (hunger ~8, was a flat 25)
    const ctx = makeContext(s, 6);
    stepTankCreatures(s, tank, 6, ctx);
    expect(allFinite(s)).toBe(true);
    expect(c.stats.hunger).toBeGreaterThan(h0 + 5);
  });
});
