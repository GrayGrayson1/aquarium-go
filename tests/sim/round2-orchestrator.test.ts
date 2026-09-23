/**
 * Round-2 orchestrator fixes: "may eat the young" predation respects the predator's mouth (a juvenile that has grown
 * past it is safe), and the clownfish starter never suggests famous fictional fish names.
 */
import { describe, it, expect } from 'vitest';
import type { Creature, GameState, Tank } from '@/types';
import { newGame, STARTER_SETUPS } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { mulberry32 } from '@/sim/rng';
import { createCreature, addCreature, stepTankCreatures } from '@/sim/life';
import { incidentRisks, clearCompatCache } from '@/sim/compat';
import { getSpecies } from '@/data/species';

function add(s: GameState, tank: Tank, speciesId: string, name: string, seed: number, ageDays: number): Creature {
  return addCreature(s, createCreature(s, mulberry32(seed), speciesId, { ageDays, name }), tank.id);
}

function run(s: GameState, tank: Tank, hours: number, predator: Creature, prey: Creature[]): void {
  for (let t = 0; t < hours; t++) {
    tank.water.ammonia = 0;
    tank.water.nitrite = 0;
    tank.water.nitrate = Math.min(tank.water.nitrate, 10);
    predator.stats.hunger = 90;
    for (const p of prey) if (p.status !== 'dead') p.stats.hunger = 15;
    stepTankCreatures(s, tank, 1, makeContext(s, 1));
    s.clock.hour += 1;
  }
}

describe('young-only predation respects the predator’s mouth', () => {
  it('a seahorse never eats a juvenile cardinalfish that has outgrown its mouth, but fresh hatchlings stay at risk', () => {
    clearCompatCache();
    const s = newGame({ starterId: 'lined_seahorse', starterName: 'Ripple', seed: 11 });
    const tank = s.tanks[s.tankOrder[0]];
    const seahorse = Object.values(s.creatures).find((c) => c.isStarter)!;
    add(s, tank, 'banggai_cardinalfish', 'Dad', 101, 200);
    add(s, tank, 'banggai_cardinalfish', 'Mum', 102, 200);
    // Grown juveniles (7 days old, several cm, still juveniles for the next ~9 days).
    const big = Array.from({ length: 3 }, (_, i) => add(s, tank, 'banggai_cardinalfish', `Big ${i}`, 200 + i, 7));
    expect(big.every((b) => b.lifeStage === 'juvenile' && b.sizeCm > 3)).toBe(true);
    const risk = incidentRisks(s, tank.id).find((r) => r.kind === 'predation' && r.actorSpeciesId === 'lined_seahorse' && r.youngOnly);
    expect(risk).toBeDefined();
    // With only grown juveniles in reach of the young-only rule, nobody is eaten.
    run(s, tank, 24 * 5, seahorse, big);
    expect(big.some((c) => c.status === 'dead' && (c.deathCause ?? '').includes('preyed'))).toBe(false);
    const hatchlings: Creature[] = [];
    for (let day = 0; day < 4; day++) {
      // a fresh release of hatchlings every half day
      for (let k = 0; k < 2; k++) {
        for (let i = 0; i < 4; i++) hatchlings.push(add(s, tank, 'banggai_cardinalfish', `H${day}.${k}.${i}`, 1000 + day * 100 + k * 10 + i, 0));
        run(s, tank, 12, seahorse, [...big, ...hatchlings]);
      }
    }
    const preyed = (c: Creature) => c.status === 'dead' && (c.deathCause ?? '').includes('preyed');
    expect(big.some(preyed)).toBe(false);
    expect(hatchlings.some(preyed)).toBe(true);
  });
});

describe('starter name ideas', () => {
  it('suggests original names only', () => {
    const all = Object.values(STARTER_SETUPS).flatMap((st) => st.nameIdeas);
    for (const famous of ['Nemo', 'Marlin', 'Dory', 'Gill', 'Bruce']) expect(all).not.toContain(famous);
  });
});
