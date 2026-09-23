/**
 * Predation outcomes match the risk the compatibility preview states, and starters never start (or get) starving
 * before the tutorial teaches feeding. OWNER: lane "lifecycle".
 */
import { describe, it, expect } from 'vitest';
import type { Creature, GameState, Tank } from '@/types';
import { newGame, STARTER_START_HUNGER } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { mulberry32 } from '@/sim/rng';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature, stepTankCreatures } from '@/sim/life';
import { STARTER_GRACE_MAX_HUNGER, starterHungerCap } from '@/sim/life/step';
import { incidentRisks, evaluateTank, huntingDrive, preyFits, TYPICAL_PREDATOR_HUNGER, clearCompatCache } from '@/sim/compat';
import { advanceWorld } from '@/sim/world';
import { tutorialAdvance } from '@/sim/facility';
import { feedTank } from '@/sim/care';
import { getSpecies, STARTER_IDS } from '@/data/species';
import { tutorialChain } from '@/data/quests';

const weekly = (p: number) => 1 - Math.pow(1 - Math.min(0.99, Math.max(0, p)), 7);

function add(s: GameState, tank: Tank, speciesId: string, name: string, seed: number, ageDays = 30): Creature {
  return addCreature(s, createCreature(s, mulberry32(seed), speciesId, { ageDays, name }), tank.id);
}

/** Pea puffer starter tank + 8 adult cherry shrimp. */
function shrimpTank(seed: number) {
  const s = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed });
  const tank = s.tanks[s.tankOrder[0]];
  const puffer = Object.values(s.creatures).find((c) => c.isStarter)!;
  const shrimp = Array.from({ length: 8 }, (_, i) => add(s, tank, 'cherry_shrimp', `Cherry ${i}`, seed * 31 + i));
  return { s, tank, puffer, shrimp };
}

/** Step one tank hour by hour with clean water, holding the predator at a fixed hunger. */
function run(s: GameState, tank: Tank, hours: number, predator: Creature, hunger: number, prey: Creature[]): void {
  for (let t = 0; t < hours; t++) {
    tank.water.ammonia = 0;
    tank.water.nitrite = 0;
    tank.water.nitrate = Math.min(tank.water.nitrate, 10);
    tank.water.tempC = 25.5;
    predator.stats.hunger = hunger;
    for (const p of prey) if (p.status !== 'dead') p.stats.hunger = 15;
    stepTankCreatures(s, tank, 1, makeContext(s, 1));
    s.clock.hour += 1;
  }
}

const lost = (prey: Creature[]) => prey.filter((c) => c.status === 'dead').length;

describe('predation: the stated risk actually happens', () => {
  it('compat calls pea puffer → adult cherry shrimp lethal, with the same per-day rate the sim rolls', () => {
    clearCompatCache();
    const { s, tank } = shrimpTank(5);
    expect(preyFits(getSpecies('pea_puffer'), getSpecies('cherry_shrimp'), true)).toBe(true);
    const risk = incidentRisks(s, tank.id).find((r) => r.kind === 'predation' && r.actorSpeciesId === 'pea_puffer' && r.targetSpeciesId === 'cherry_shrimp' && !r.youngOnly);
    expect(risk).toBeDefined();
    expect(risk!.lethal).toBe(true);
    const shown = evaluateTank(s, tank.id).reasons.find((r) => r.category === 'predation' && r.speciesIds.includes('cherry_shrimp') && r.probability !== undefined);
    expect(shown).toBeDefined();
    // The preview's weekly number is exactly the sim's per-day risk compounded over 7 days at ordinary hunger.
    expect(shown!.probability!).toBeCloseTo(weekly(risk!.perDay), 2);
    expect(huntingDrive(TYPICAL_PREDATOR_HUNGER)).toBeCloseTo(1, 9);
  });

  it('over a week, shrimp go missing at about the stated weekly probability (many seeds)', () => {
    clearCompatCache();
    const seeds = Array.from({ length: 30 }, (_, i) => 900 + i * 7);
    let hit = 0;
    let kills = 0;
    let p = 0;
    for (const seed of seeds) {
      const { s, tank, puffer, shrimp } = shrimpTank(seed);
      p = incidentRisks(s, tank.id).find((r) => r.kind === 'predation' && r.targetSpeciesId === 'cherry_shrimp' && !r.youngOnly)!.perDay;
      run(s, tank, 24 * 7, puffer, TYPICAL_PREDATOR_HUNGER, shrimp);
      const n = lost(shrimp);
      kills += n;
      if (n > 0) hit++;
      expect(puffer.status).toBe('alive');
      for (const c of shrimp.filter((x) => x.status === 'dead')) {
        expect(c.deathCause).toMatch(/preyed upon by Pea the pea puffer/);
        const ev = s.log.find((e) => e.kind === 'death' && e.creatureId === c.id);
        expect(ev?.text).toMatch(new RegExp(`${c.name} the cherry shrimp is missing — it was likely eaten by Pea the pea puffer\\.`));
        expect(ev?.text).toMatch(/Pea puffers hunt dwarf shrimp/);
      }
      // The first loss toasts; further losses within a game day of a toasted one are only logged.
      const toasted = s.log.filter((e) => e.kind === 'death' && e.toast).map((e) => e.hour);
      if (n > 0) expect(toasted.length).toBeGreaterThan(0);
      for (let i = 1; i < toasted.length; i++) expect(toasted[i] - toasted[i - 1]).toBeGreaterThanOrEqual(24);
    }
    const stated = weekly(p);
    const observed = hit / seeds.length;
    expect(stated).toBeGreaterThan(0.5);
    expect(observed).toBeGreaterThanOrEqual(stated - 0.2);
    // Expected losses per week: Poisson rate −ln(1−p) per day (one loss per incident).
    const expected = 7 * -Math.log(1 - p);
    const mean = kills / seeds.length;
    expect(mean).toBeGreaterThan(expected * 0.6);
    expect(mean).toBeLessThan(expected * 1.4);
  });

  it('a well-fed puffer hunts less, but never not at all', () => {
    clearCompatCache();
    let fed = 0;
    let hungry = 0;
    for (const seed of [11, 12, 13, 14, 15, 16, 17, 18]) {
      const a = shrimpTank(seed);
      run(a.s, a.tank, 24 * 10, a.puffer, 5, a.shrimp);
      fed += lost(a.shrimp);
      const b = shrimpTank(seed);
      run(b.s, b.tank, 24 * 10, b.puffer, 90, b.shrimp);
      hungry += lost(b.shrimp);
    }
    expect(fed).toBeGreaterThan(0);
    expect(hungry).toBeGreaterThan(fed);
  });

  it('is deterministic: the same seed gives the same losses and log', () => {
    clearCompatCache();
    const a = shrimpTank(4242);
    const b = shrimpTank(4242);
    run(a.s, a.tank, 24 * 7, a.puffer, 40, a.shrimp);
    run(b.s, b.tank, 24 * 7, b.puffer, 40, b.shrimp);
    expect(a.shrimp.map((c) => c.status)).toEqual(b.shrimp.map((c) => c.status));
    expect(a.s.log.map((e) => `${e.hour}|${e.text}`)).toEqual(b.s.log.map((e) => `${e.hour}|${e.text}`));
  });

  it('prey too big to kill is attacked (explained in the log) but never lost', () => {
    clearCompatCache();
    const s = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed: 77 });
    const tank = s.tanks[s.tankOrder[0]];
    const puffer = Object.values(s.creatures).find((c) => c.isStarter)!;
    const snail = add(s, tank, 'mystery_snail', 'Shelly', 3);
    const risk = incidentRisks(s, tank.id).find((r) => r.kind === 'predation' && r.targetSpeciesId === 'mystery_snail' && !r.youngOnly);
    expect(risk?.lethal).toBe(false);
    run(s, tank, 24 * 7, puffer, 60, [snail]);
    expect(snail.status).toBe('alive');
    expect(s.log.some((e) => e.kind === 'warning' && /Pea the pea puffer keeps attacking Shelly the mystery snail/.test(e.text))).toBe(true);
  });

  it('a compatible community loses nobody to predation', () => {
    clearCompatCache();
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 99 });
    const tank = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true, name: 'Community' });
    const fish = [
      ...Array.from({ length: 6 }, (_, i) => add(s, tank, 'cardinal_tetra', `Neon ${i}`, 50 + i)),
      ...Array.from({ length: 4 }, (_, i) => add(s, tank, 'panda_corydoras', `Panda ${i}`, 70 + i)),
    ];
    expect(incidentRisks(s, tank.id).filter((r) => r.kind === 'predation' && r.lethal && !r.youngOnly)).toEqual([]);
    for (let d = 0; d < 14; d++) {
      for (let t = 0; t < 24; t++) {
        tank.water.ammonia = 0;
        tank.water.nitrite = 0;
        tank.water.tempC = 25;
        for (const c of fish) c.stats.hunger = Math.min(c.stats.hunger, 40);
        stepTankCreatures(s, tank, 1, makeContext(s, 1));
        s.clock.hour += 1;
      }
    }
    expect(fish.filter((c) => c.status === 'dead')).toEqual([]);
    expect(s.log.some((e) => /likely eaten/.test(e.text))).toBe(false);
  });
});

describe('starters arrive fed and never starve before the feed step', () => {
  it('every starter starts "Well fed" and stays below "Very hungry" for 36 unfed game hours', () => {
    for (const id of STARTER_IDS) {
      const s = newGame({ starterId: id, starterName: 'Buddy', seed: 321 });
      const starter = Object.values(s.creatures).find((c) => c.isStarter)!;
      expect(starter.stats.hunger, id).toBeLessThanOrEqual(STARTER_START_HUNGER);
      let max = starter.stats.hunger;
      for (let h = 0; h < 36; h++) {
        advanceWorld(s, 1, { focusTankId: s.tankOrder[0] });
        max = Math.max(max, starter.stats.hunger);
      }
      expect(max, id).toBeLessThanOrEqual(STARTER_GRACE_MAX_HUNGER + 1e-9);
      expect(max, id).toBeLessThan(70);
      expect(starter.status, id).toBe('alive');
    }
  });

  it('normal hunger resumes once the feed step is done', () => {
    const s = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed: 654 });
    const tank = s.tanks[s.tankOrder[0]];
    const starter = Object.values(s.creatures).find((c) => c.isStarter)!;
    const feedIdx = tutorialChain('pea_puffer').findIndex((st) => st.id === 'feed');
    expect(starterHungerCap(s, starter, s.clock.hour)).toBe(STARTER_GRACE_MAX_HUNGER);
    tutorialAdvance(s, 'opened_creature_card');
    tutorialAdvance(s, 'camera_moved');
    expect(s.progress.tutorial.step).toBe(feedIdx);
    expect(feedTank(s, tank.id, 'bloodworm_frozen').ok).toBe(true);
    tutorialAdvance(s, 'fed');
    expect(s.progress.tutorial.step).toBeGreaterThan(feedIdx);
    expect(starterHungerCap(s, starter, s.clock.hour)).toBeNull();
    // Take the uneaten food back out so only metabolism acts.
    tank.water.foodInWater = 0;
    tank.water.foodByTag = {};
    delete tank.water.targetFeed;
    starter.stats.hunger = 55;
    const ctx = makeContext(s, 8);
    stepTankCreatures(s, tank, 8, ctx);
    expect(starter.stats.hunger).toBeGreaterThan(STARTER_GRACE_MAX_HUNGER);
  });

  it('the grace is bounded: it expires 48 game hours after arrival even if the player never feeds', () => {
    const s = newGame({ starterId: 'pea_puffer', starterName: 'Pea', seed: 655 });
    const starter = Object.values(s.creatures).find((c) => c.isStarter)!;
    expect(starterHungerCap(s, starter, starter.acquiredHour + 47)).toBe(STARTER_GRACE_MAX_HUNGER);
    expect(starterHungerCap(s, starter, starter.acquiredHour + 49)).toBeNull();
  });
});
