/**
 * Fix lane LIFE — copy regressions: the creature-card headline keeps decimals (S01-07); deaths from breeding
 * harassment / rival fights get a real explanation (S02-04); starter name ideas match the naming rules (S02-10).
 */
import { describe, it, expect } from 'vitest';
import { newGame, STARTER_SETUPS } from '@/sim/newGame';
import { getSpecies } from '@/data/species';
import { nameReadsAs, nameSexFor } from '@/sim/life/names';
import { creatureWellbeing } from '@/sim/life';
import { advanceWorld } from '@/sim/world';

describe('S01-07 — wellbeing headline', () => {
  it('is cut at a sentence end, not at a decimal point', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const t = s.tanks[s.tankOrder[0]];
    t.water.ammonia = 1.35;
    const c = Object.values(s.creatures)[0];
    const wb = creatureWellbeing(s, c);
    expect(wb.status).toBe('danger');
    expect(wb.headline).toBe('Ember is suffering from ammonia in the water (1.35 ppm)');
  });

  it('still drops the explanatory second sentence', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const t = s.tanks[s.tankOrder[0]];
    t.water.tempC = 32.4;
    const c = Object.values(s.creatures)[0];
    const wb = creatureWellbeing(s, c);
    expect(wb.headline).toBe('Ember is struggling with the water');
  });
});

describe('S02-04 — deaths from harassment / fighting are explained', () => {
  function dieWith(damage: Record<string, number>) {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const c = Object.values(s.creatures)[0];
    c.life = { ...(c.life ?? {}), damage };
    c.stats.health = 0;
    c.stats.stress = 90; // no regeneration this hour
    c.stats.hunger = 10;
    advanceWorld(s, 1, { forceFull: true });
    return { s, c };
  }
  it('harassment names the cause and the fix', () => {
    const { s, c } = dieWith({ harassment: 19.9, injury: 5.5, starvation: 10.1 });
    expect(c.status).toBe('dead');
    expect(c.deathCause).toBe('harassment by a tank mate');
    expect(s.log.find((e) => e.kind === 'death')?.text).toMatch(/chased and bitten by a tank mate/);
  });
  it('fighting names the rival', () => {
    const { c } = dieWith({ fighting: 30, water: 2 });
    expect(c.deathCause).toBe('fighting with a rival');
  });
});

describe('S02-10 — starter name suggestions respect the naming rules', () => {
  it('no suggestion reads as the wrong sex for its starter', () => {
    for (const [id, setup] of Object.entries(STARTER_SETUPS)) {
      const sp = getSpecies(id);
      const want = nameSexFor(sp, setup.sex);
      for (const n of setup.nameIdeas) {
        const reads = nameReadsAs(n);
        expect(reads === null || reads === want, `${id}: ${n}`).toBe(true);
      }
    }
  });
});
