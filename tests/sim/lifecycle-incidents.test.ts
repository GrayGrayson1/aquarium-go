import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncidentRisk } from '@/sim/compat';

// Drive the life lane's incident handling with explicit risks (the compat lane computes the real ones).
const risks: { list: IncidentRisk[] } = { list: [] };
vi.mock('@/sim/compat', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/sim/compat')>();
  return { ...orig, incidentRisks: () => risks.list };
});

import { newGame } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { mulberry32 } from '@/sim/rng';
import { createCreature, addCreature, stepTankCreatures } from '@/sim/life';
import type { GameState, Tank } from '@/types';

function run(s: GameState, tank: Tank, hours: number): void {
  for (let t = 0; t < hours; t++) {
    tank.water.ammonia = 0;
    tank.water.nitrite = 0;
    tank.water.tempC = 16.5;
    const ctx = makeContext(s, 1);
    stepTankCreatures(s, tank, 1, ctx);
    s.clock.hour += 1;
  }
}

describe('lifecycle — incidents', () => {
  beforeEach(() => {
    risks.list = [];
  });

  it('predation removes the prey with an explained, gentle log line', () => {
    const s = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 17 });
    const tank = s.tanks[s.tankOrder[0]];
    const axo = Object.values(s.creatures)[0];
    const prey = addCreature(s, createCreature(s, mulberry32(2), 'pea_puffer', { ageDays: 20, name: 'Bean' }), tank.id);
    risks.list = [
      { kind: 'predation', actorSpeciesId: 'axolotl', targetSpeciesId: 'pea_puffer', perDay: 0.95, lethal: true, text: 'Axolotls swallow small fish whole.' },
    ];
    // lane:w2-sim — a tropical puffer can't live in 16.5 °C axolotl water; keep it healthy so only the predation roll
    // (whose timing depends on the random stream) decides how it goes, and the test checks the log line, not luck.
    for (let i = 0; i < 72 && prey.status !== 'dead'; i++) {
      prey.stats.health = 100;
      run(s, tank, 1);
    }
    expect(prey.status).toBe('dead');
    expect(prey.deathCause).toMatch(/preyed upon by Mochi the axolotl/);
    const ev = s.log.find((e) => e.kind === 'death' && e.creatureId === prey.id);
    expect(ev?.text).toMatch(/Bean the pea puffer is missing — it was likely eaten by Mochi the axolotl\./);
    expect(axo.status).toBe('alive');
  });

  it('prey that has outgrown the predator is safe', () => {
    const s = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 17 });
    const tank = s.tanks[s.tankOrder[0]];
    const big = addCreature(s, createCreature(s, mulberry32(2), 'axolotl', { ageDays: 60, name: 'Big' }), tank.id);
    risks.list = [{ kind: 'predation', actorSpeciesId: 'axolotl', targetSpeciesId: 'axolotl', perDay: 0.95, lethal: true, text: '' }];
    run(s, tank, 48);
    expect(big.status).toBe('alive');
  });

  it('fin nipping injures, stresses and is logged (throttled), and youngOnly risks skip adults', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 23 });
    const tank = s.tanks[s.tankOrder[0]];
    const betta = Object.values(s.creatures)[0];
    const nipper = addCreature(s, createCreature(s, mulberry32(4), 'pea_puffer', { ageDays: 20, name: 'Wasabi' }), tank.id);
    const h0 = betta.stats.health;
    risks.list = [
      { kind: 'fin_nip', actorSpeciesId: 'pea_puffer', targetSpeciesId: 'betta', perDay: 0.99, lethal: false, text: 'Pea puffers nip long fins.' },
      { kind: 'predation', actorSpeciesId: 'betta', targetSpeciesId: 'pea_puffer', perDay: 0.99, lethal: true, youngOnly: true, text: 'Bettas eat fry.' },
    ];
    for (let i = 0; i < 48; i++) {
      tank.water.ammonia = 0;
      tank.water.tempC = 26;
      betta.stats.hunger = 20;
      nipper.stats.hunger = 20;
      stepTankCreatures(s, tank, 1, makeContext(s, 1));
      s.clock.hour += 1;
    }
    expect(betta.life?.injury ?? 0).toBeGreaterThan(0);
    expect(betta.life?.damage?.injury ?? 0).toBeGreaterThan(0);
    expect(betta.stats.health).toBeLessThanOrEqual(h0);
    const nips = s.log.filter((e) => e.kind === 'warning' && /nipping Ember's fins/.test(e.text));
    expect(nips.length).toBeGreaterThanOrEqual(1);
    // The throttle is one line per nipper per 8 game hours: at most 6 in 48 h, never two within 8 h. (How many of
    // those windows actually roll a nip is seed-dependent — a species-data tweak shifts the draws.)
    expect(nips.length).toBeLessThanOrEqual(6);
    const hours = nips.map((e) => e.hour).sort((a, b) => a - b);
    for (let i = 1; i < hours.length; i++) expect(hours[i] - hours[i - 1]).toBeGreaterThanOrEqual(8);
    expect(nipper.status).toBe('alive');
  });

  it('feeding exclusion makes the loser hungrier', () => {
    const total = (withRisk: boolean) => {
      const s = newGame({ starterId: 'lined_seahorse', starterName: 'Ripple', seed: 29 });
      const tank = s.tanks[s.tankOrder[0]];
      const sea = Object.values(s.creatures)[0];
      addCreature(s, createCreature(s, mulberry32(6), 'ocellaris_clownfish', { ageDays: 20 }), tank.id);
      risks.list = withRisk
        ? [{ kind: 'feeding_exclusion', actorSpeciesId: 'ocellaris_clownfish', targetSpeciesId: 'lined_seahorse', perDay: 0.99, lethal: false, text: 'Clownfish grab food first.' }]
        : [];
      let sum = 0;
      for (let w = 0; w < 12; w++) {
        sea.stats.hunger = 10;
        tank.water.tempC = 23.5;
        tank.water.ammonia = 0;
        stepTankCreatures(s, tank, 6, makeContext(s, 6));
        s.clock.hour += 6;
        sum += sea.stats.hunger;
      }
      return { sum, log: s.log };
    };
    const a = total(true);
    const b = total(false);
    expect(a.sum).toBeGreaterThan(b.sum + 30);
    expect(a.log.some((e) => /crowded out at feeding time/.test(e.text))).toBe(true);
  });
});
