/**
 * Fix lane LIFE — the betta rule has teeth (S02-08): a spent female left in the male's tank declines and dies of
 * harassment within a few days (after the escalating warnings), while a separated one recovers.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { advanceWorld } from '@/sim/world';
import { feedTank } from '@/sim/care';
import { devForceBreeding, separateCreature } from '@/sim/life/breeding/actions';
import { noteBreedingFood } from '@/sim/life/breeding';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { applyIncident } from '@/sim/life/step';
import { buildTankEnv } from '@/sim/life/welfare';
import { incidentRisks } from '@/sim/compat';
import { makeContext } from '@/sim/context';
import { getSpecies } from '@/data/species';

vi.setConfig({ testTimeout: 240_000 });

function spawnedPair(seed: number) {
  const preview = previewStarters(seed).betta;
  const g = newGame({ starterId: 'betta', starterName: preview.name, seed, starterCreature: preview });
  const male = Object.values(g.creatures).find((c) => c.isStarter)!;
  const tankId = male.tankId!;
  devForceBreeding(g, male.id);
  for (let h = 0; h < 16 && !Object.keys(g.clutches).length; h++) {
    water(g);
    noteBreedingFood(g, tankId, ['bloodworm']);
    advanceWorld(g, 1, { forceFull: true });
  }
  const female = g.creatures[male.repro.partnerId!];
  expect(female.repro.stage).toBe('spent');
  return { g, male, female, tankId };
}

function water(s: GameState): void {
  for (const t of Object.values(s.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    for (const eq of t.equipment) eq.failed = false;
  }
}

function keep(g: GameState, days: number, stop: () => boolean): void {
  for (let h = 0; h < 24 * days && !stop(); h++) {
    water(g);
    if (h % 12 === 0) {
      const foodId = Object.keys(g.inventory.foods).find((k) => (g.inventory.foods[k] ?? 0) > 0);
      if (foodId) for (const id of g.tankOrder) feedTank(g, id, foodId, {});
      else g.inventory.foods['micro_pellets'] = 20;
    }
    advanceWorld(g, 1, { forceFull: true });
  }
}

describe('S02-08 — betta female left with the male', () => {
  it('declines and dies of harassment within ~5 days, after the danger warnings', () => {
    const { g, female } = spawnedPair(5150);
    keep(g, 6, () => female.status !== 'alive');
    expect(female.status).toBe('dead');
    expect(female.deathCause).toBe('harassment by a tank mate');
    const warnings = g.log.filter((e) => e.creatureId === female.id && e.kind === 'danger');
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('hardy or not, she dies: her injuries do not heal while he keeps biting', () => {
    // A hardy female's injuries used to heal faster than his bites added them, so the drain that should finish her
    // faded and she lingered at the harassment floor "in critical condition" (this seed's female after chunk 16). Her
    // hardiness is set here, at both ends, so the outcome no longer rests on what her genome drew.
    for (const hardiness of [0, 100]) {
      const { g, female } = spawnedPair(5150);
      female.genome.potentials.hardiness = hardiness;
      keep(g, 6, () => female.status !== 'alive');
      expect(female.status, `hardiness ${hardiness}`).toBe('dead');
      expect(female.deathCause, `hardiness ${hardiness}`).toBe('harassment by a tank mate');
    }
  });

  it('when one of his chases lands the last blow, she still dies of harassment; an animal worn by attacks names its attacker', () => {
    // A death names the harm that did the most damage, whichever path deals the last point: the slow decline or an
    // incident (the male's "harassing the female" chase). Until the chunk 16 fix an incident's last blow always said
    // "injuries from <the male>". The incident is applied directly here, so no draw decides which path kills.
    const cases: [Record<string, number>, string][] = [
      [{ harassment: 40, injury: 1 }, 'harassment by a tank mate'],
      [{ injury: 30 }, 'injuries from Ember the betta'],
    ];
    for (const [damage, cause] of cases) {
      const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 });
      const male = Object.values(g.creatures).find((c) => c.isStarter)!;
      const female = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 60, name: 'Worn' }), male.tankId!);
      female.life = { ...(female.life ?? {}), damage: { ...damage } };
      female.stats.health = 0.4; // below the least a harassment incident takes (0.5)
      const tank = g.tanks[male.tankId!];
      const risk = incidentRisks(g, tank.id).find((r) => r.kind === 'harassment' && r.targetIds?.includes(female.id))!;
      expect(risk).toBeDefined();
      const list = [male, female].map((c) => ({ c, sp: getSpecies('betta') }));
      applyIncident(g, buildTankEnv(g, tank, [male, female], g.clock.hour), list, risk, g.clock.hour, makeContext(g, 1));
      expect(female.status, cause).toBe('dead');
      expect(female.deathCause).toBe(cause);
    }
  });

  it('recovers once separated', () => {
    const { g, female, tankId } = spawnedPair(5150);
    keep(g, 1, () => false);
    expect(female.status).toBe('alive');
    const rest = createTank(g, 'g10', 'freshwater_tropical', { cycled: true, name: 'Recovery' });
    rest.water.tempC = g.tanks[tankId].water.tempC;
    expect(separateCreature(g, female.id, rest.id).ok).toBe(true);
    keep(g, 5, () => false);
    expect(female.status).toBe('alive');
    expect(female.stats.health).toBeGreaterThan(80);
  });
});
