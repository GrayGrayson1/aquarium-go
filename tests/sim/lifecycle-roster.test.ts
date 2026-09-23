import { describe, it, expect } from 'vitest';
import { ALL_SPECIES } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { mulberry32 } from '@/sim/rng';
import { createCreature, addCreature, stepTankCreatures } from '@/sim/life';
import { allowedTags, excludes } from '@/sim/life/personality';
import { createTank } from '@/sim/tanks';

const HEX = /^#[0-9a-f]{6}$/i;

describe('lifecycle — whole roster', () => {
  it('every registered species produces valid, species-bounded individuals', () => {
    const s = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 101 });
    const rng = mulberry32(55);
    for (const sp of ALL_SPECIES) {
      const allowed = new Set(allowedTags(sp));
      for (let i = 0; i < 25; i++) {
        const c = createCreature(s, rng, sp.id, { ageDays: rng.range(0, sp.lifecycle.lifespanDays * 0.5) });
        expect(c.morphName.length, sp.id).toBeGreaterThan(0);
        expect(c.name.length, sp.id).toBeGreaterThan(0);
        expect(Number.isFinite(c.sizeCm) && c.sizeCm > 0, sp.id).toBe(true);
        for (const k of ['bodyColor', 'bodyColor2', 'bellyColor', 'finColor', 'finColor2', 'accentColor', 'eyeColor'] as const) expect(c.appearance[k], `${sp.id}.${k}`).toMatch(HEX);
        for (const k of ['patternContrast', 'iridescence', 'metallic', 'translucency', 'finLength', 'bodyDepth', 'gillFullness', 'patternScale'] as const) expect(Number.isFinite(c.appearance[k]), `${sp.id}.${k}`).toBe(true);
        expect(c.personality.length).toBeGreaterThanOrEqual(1);
        for (const t of c.personality) expect(allowed.has(t), `${sp.id}:${t}`).toBe(true);
        for (const a of c.personality) for (const b of c.personality) if (a !== b) expect(excludes(a, b)).toBe(false);
        for (const locus of sp.genetics.loci) {
          const pair = c.genome.alleles[locus.id];
          expect(pair?.length).toBe(2);
          for (const a of pair) expect(locus.alleles.some((x) => x.id === a), `${sp.id}.${locus.id}`).toBe(true);
        }
      }
    }
  });

  it('a mixed tank of every freshwater and marine species steps for a week without NaN', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 202 });
    const rng = mulberry32(8);
    const fw = createTank(s, 'g125', 'freshwater_tropical', { cycled: true, name: 'FW' });
    const sw = createTank(s, 'g125', 'reef', { cycled: true, name: 'SW' });
    for (const sp of ALL_SPECIES) addCreature(s, createCreature(s, rng, sp.id, { ageDays: sp.lifecycle.juvenileDays + 3 }), sp.environment === 'marine' ? sw.id : fw.id);
    for (let t = 0; t < 24 * 7; t += 2) {
      for (const tank of [fw, sw]) {
        tank.water.foodInWater = 300;
        tank.water.foodByTag = { flake: 300, mysis: 300, pellet_sinking: 300 };
        stepTankCreatures(s, tank, 2, makeContext(s, 2));
      }
      s.clock.hour += 2;
    }
    for (const c of Object.values(s.creatures)) {
      for (const [k, v] of Object.entries(c.stats)) {
        expect(Number.isFinite(v), `${c.speciesId}.${k}`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(Number.isFinite(c.sizeCm)).toBe(true);
    }
  });

  it('grazers live off algae and biofilm in a mature tank', () => {
    const grazer = ALL_SPECIES.find((sp) => sp.foods.includes('biofilm') && sp.feedingStyle === 'grazer' && sp.environment === 'freshwater');
    if (!grazer) return; // roster lane not landed yet
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 303 });
    const tank = s.tanks[s.tankOrder[0]];
    const snail = addCreature(s, createCreature(s, mulberry32(3), grazer.id, { ageDays: grazer.lifecycle.juvenileDays + 5 }), tank.id);
    snail.stats.hunger = 60;
    tank.water.algae = 40;
    for (let t = 0; t < 24; t++) {
      tank.water.ammonia = 0;
      tank.water.foodInWater = 0;
      stepTankCreatures(s, tank, 1, makeContext(s, 1));
      s.clock.hour += 1;
    }
    expect(snail.stats.hunger).toBeLessThan(40);
    expect(tank.water.algae).toBeLessThan(40);
  });
});
