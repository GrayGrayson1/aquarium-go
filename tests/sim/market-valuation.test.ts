import { describe, it, expect } from 'vitest';
import type { Creature, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { createTank } from '@/sim/tanks';
import { creatureValue, tankValuation, bundleValue, quickSellQuote } from '@/sim/economy';
import { getSpecies } from '@/data/species';

function world(seed = 101): GameState {
  return newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function baseCreature(g: GameState, speciesId = 'axolotl', ageDays?: number): Creature {
  const c = createCreature(g, simRng(g), speciesId, { ageDays: ageDays ?? getSpecies(speciesId).lifecycle.juvenileDays + 4 });
  c.stats.health = 100;
  c.stats.stress = 10;
  delete c.illness;
  c.personality = [];
  c.genome.potentials = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
  c.lineage.generation = 0;
  c.repro.totalOffspringRaised = 0;
  c.captiveBred = true;
  c.morphName = 'Wild Type';
  c.lifeStage = 'adult';
  if (speciesId === 'axolotl') c.genome.alleles = { ...WILD_AXOLOTL };
  return c;
}

const WILD_AXOLOTL: Record<string, [string, string]> = { dark: ['D', 'D'], albino: ['A', 'A'], melanoid: ['M', 'M'], axanthic: ['Ax', 'Ax'], copper: ['C', 'C'] };

const val = (g: GameState, c: Creature) => creatureValue(g, c).total;

describe('market: creature valuation', () => {
  it('is finite, positive and explained by readable factors', () => {
    const g = world();
    for (const c of Object.values(g.creatures)) {
      const v = creatureValue(g, c);
      expect(Number.isFinite(v.total)).toBe(true);
      expect(v.total).toBeGreaterThan(0);
      expect(v.base).toBe(getSpecies(c.speciesId).baseValue);
      for (const f of v.factors) {
        expect(typeof f.label).toBe('string');
        expect(Number.isFinite(f.mult)).toBe(true);
      }
    }
  });

  it('a healthy animal is worth more than a sick one', () => {
    const g = world();
    const healthy = baseCreature(g);
    const sick = clone(healthy);
    sick.stats.health = 40;
    sick.illness = { kind: 'fungal_infection', severity: 0.6, sinceHour: g.clock.hour };
    expect(val(g, healthy)).toBeGreaterThan(val(g, sick) * 1.5);
    const f = creatureValue(g, sick).factors.find((x) => x.label === 'Health & condition');
    expect(f?.mult).toBeLessThan(0.7);
    expect(f?.note).toMatch(/ill/i);
  });

  it('a rarer morph is worth more than a common one', () => {
    const g = world();
    const common = baseCreature(g);
    const rare = clone(common);
    rare.morphName = 'Axanthic';
    rare.genome.alleles.axanthic = ['ax', 'ax'];
    expect(val(g, rare)).toBeGreaterThan(val(g, common) * 1.4);
    expect(creatureValue(g, rare).factors.some((f) => f.label.startsWith('Morph: Axanthic'))).toBe(true);
  });

  it('lineage and proven breeding add value', () => {
    const g = world();
    const plain = baseCreature(g);
    const lined = clone(plain);
    lined.lineage.generation = 3;
    lined.lineage.breederName = 'Your shop';
    const proven = clone(lined);
    proven.repro.totalOffspringRaised = 24;
    expect(val(g, lined)).toBeGreaterThan(val(g, plain));
    expect(val(g, proven)).toBeGreaterThan(val(g, lined));
    expect(creatureValue(g, proven).factors.find((f) => f.label === 'Lineage')?.note).toMatch(/F3.*proven breeder/);
  });

  it('juvenile < prime adult > elder', () => {
    const g = world();
    const adult = baseCreature(g);
    const juvenile = clone(adult);
    juvenile.lifeStage = 'juvenile';
    juvenile.bornHour = g.clock.hour - 5 * 24;
    const elder = clone(adult);
    elder.lifeStage = 'elder';
    elder.bornHour = g.clock.hour - 300 * 24;
    expect(val(g, juvenile)).toBeLessThan(val(g, adult));
    expect(val(g, elder)).toBeLessThan(val(g, adult));
  });

  it('show potentials, appealing personality, captive breeding and demand all move value', () => {
    const g = world();
    const c = baseCreature(g);
    const showy = clone(c);
    showy.genome.potentials.color = 95;
    showy.genome.potentials.structure = 92;
    expect(val(g, showy)).toBeGreaterThan(val(g, c));
    const bold = clone(c);
    bold.personality = ['showoff', 'glass_curious'];
    const shy = clone(c);
    shy.personality = ['shy', 'easily_startled'];
    expect(val(g, bold)).toBeGreaterThan(val(g, c));
    expect(val(g, shy)).toBeLessThan(val(g, c));
    const wild = clone(c);
    wild.captiveBred = false;
    expect(val(g, wild)).toBeLessThan(val(g, c));
    const before = val(g, c);
    g.market.demand.axolotl = 1.5;
    expect(val(g, c)).toBeGreaterThan(before);
  });

  it('a dead animal is worth nothing', () => {
    const g = world();
    const c = baseCreature(g);
    c.status = 'dead';
    expect(creatureValue(g, c).total).toBe(0);
  });

  it('a breeding pair is worth more than the two animals apart', () => {
    const g = world();
    const a = baseCreature(g);
    a.sex = 'male';
    const b = baseCreature(g);
    b.sex = 'female';
    const pair = bundleValue(g, 'pair', [a, b]);
    expect(pair.expected).toBeGreaterThan(val(g, a) + val(g, b));
  });

  it('quick-sale quotes pay roughly 40–55% of value', () => {
    const g = world();
    const c = addCreature(g, baseCreature(g), g.tankOrder[0]);
    const q = quickSellQuote(g, [c.id]);
    expect(q.ok).toBe(true);
    const v = val(g, c);
    expect(q.total).toBeGreaterThanOrEqual(Math.floor(v * 0.39));
    expect(q.total).toBeLessThanOrEqual(Math.ceil(v * 0.56));
  });
});

describe('market: tank valuation', () => {
  it('returns expected within low..high with parts and modifiers', () => {
    const g = world();
    const tv = tankValuation(g, g.tankOrder[0]);
    expect(tv.expected).toBeGreaterThan(0);
    expect(tv.low).toBeLessThanOrEqual(tv.expected);
    expect(tv.high).toBeGreaterThanOrEqual(tv.expected);
    expect(tv.parts.some((p) => p.label.startsWith('Tank:'))).toBe(true);
    expect(tv.parts.some((p) => p.label.startsWith('Livestock'))).toBe(true);
    for (const p of tv.parts) expect(Number.isFinite(p.amount)).toBe(true);
  });

  it('reacts to beauty, welfare and compatibility', () => {
    const g = world();
    const id = g.tankOrder[0];
    const t = g.tanks[id];
    // Add a second animal so compatibility matters.
    addCreature(g, baseCreature(g), id);
    t.cache.beauty = 60;
    t.cache.welfare = 85;
    t.cache.compatVerdict = 'excellent';
    t.cache.status = 'good';
    const base = tankValuation(g, id).expected;

    t.cache.beauty = 95;
    expect(tankValuation(g, id).expected).toBeGreaterThan(base);
    t.cache.beauty = 20;
    expect(tankValuation(g, id).expected).toBeLessThan(base);
    t.cache.beauty = 60;

    t.cache.welfare = 30;
    expect(tankValuation(g, id).expected).toBeLessThan(base);
    t.cache.welfare = 85;

    t.cache.compatVerdict = 'incompatible';
    const bad = tankValuation(g, id);
    expect(bad.expected).toBeLessThan(base);
    expect(bad.modifiers.some((m) => m.label.startsWith('Compatibility') && m.mult < 1)).toBe(true);
  });

  it('a gorgeous, coherent small tank can beat a messy large one', () => {
    const g = world();
    const small = g.tanks[g.tankOrder[0]];
    small.cache.beauty = 92;
    small.cache.welfare = 95;
    small.cache.compatVerdict = 'excellent';
    small.cache.status = 'good';
    small.cache.stability = 92;

    const big = createTank(g, 'g125', 'freshwater_tropical', { cycled: true, placement: { x: 1, z: 1, rotY: 0 } });
    for (let i = 0; i < 6; i++) addCreature(g, baseCreature(g, 'pea_puffer'), big.id);
    big.cache.beauty = 15;
    big.cache.welfare = 30;
    big.cache.compatVerdict = 'incompatible';
    big.cache.status = 'danger';
    big.cache.stability = 25;
    big.cache.stockingLoad = 1.6;

    const s = tankValuation(g, small.id);
    const b = tankValuation(g, big.id);
    expect(s.expected).toBeGreaterThan(b.expected);
    expect(s.modifiers.some((m) => m.label === 'Coherent, ethical display')).toBe(true);
  });

  it('an unknown tank values to zero without throwing', () => {
    const g = world();
    expect(tankValuation(g, 'nope').expected).toBe(0);
  });
});
