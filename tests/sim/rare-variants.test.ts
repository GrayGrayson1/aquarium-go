/**
 * lane:genetics — Prismatic individuals: odds, deterministic rolls, the shop (one roll per stocked animal, priced ×12
 * once, sold as a lot inside a group), breeding (parents raise the odds, never certain) and valuation. No luck-based
 * statistics: every roll is either pinned through an injected generator or forced through the dev hook.
 */
import { afterEach, describe, it, expect } from 'vitest';
import type { Creature, GameState, Genome } from '@/types';
import { PRISMATIC, type PrismaticConfig } from '@/data/rarity';
import { getSpecies } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { normalizeGenome } from '@/sim/life/genetics';
import { createClutch, mintJuveniles } from '@/sim/life/breeding/clutch';
import {
  assignPrismatic,
  forcePrismatic,
  forcedPrismaticPending,
  isLotOffer,
  isPrismatic,
  prismaticChance,
  prismaticChanceForPair,
  prismaticRngFor,
  rollRareVariant,
} from '@/sim/life/rareVariants';
import { buyOffer, creatureValue, generateOffer, offerPickPrice } from '@/sim/economy';

afterEach(() => {
  forcePrismatic('shop', 0);
  forcePrismatic('bred', 0);
});

/** A generator that returns these values in turn. */
const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

describe('Prismatic odds (one config, exact)', () => {
  it('stocked animals use the shop rate', () => {
    expect(prismaticChance({ source: 'shop' })).toBe(PRISMATIC.shopChance);
    expect(PRISMATIC.shopChance).toBe(1 / 4096);
  });

  it('bred young: base, ×4 with one Prismatic parent, ×8 with two', () => {
    expect(prismaticChance({ source: 'bred', rareParents: 0 })).toBe(1 / 8192);
    expect(prismaticChance({ source: 'bred', rareParents: 1 })).toBe(1 / 2048);
    expect(prismaticChance({ source: 'bred', rareParents: 2 })).toBe(1 / 1024);
  });

  it('the bred cap holds however the multipliers are tuned', () => {
    const extreme: PrismaticConfig = { ...PRISMATIC, bredBaseChance: 0.1, twoParentMultiplier: 50, oneParentMultiplier: 20 };
    expect(prismaticChance({ source: 'bred', rareParents: 2 }, extreme)).toBe(PRISMATIC.bredMaxChance);
    expect(prismaticChance({ source: 'bred', rareParents: 1 }, extreme)).toBe(PRISMATIC.bredMaxChance);
  });

  it('two Prismatic parents never make it certain', () => {
    expect(prismaticChance({ source: 'bred', rareParents: 2 })).toBeLessThan(0.01);
    expect(rollRareVariant({ source: 'bred', rareParents: 2 }, PRISMATIC, () => 0.5)).toBeUndefined();
  });

  it('a disabled config never rolls', () => {
    const off: PrismaticConfig = { ...PRISMATIC, enabled: false };
    expect(prismaticChance({ source: 'shop' }, off)).toBe(0);
    expect(prismaticChance({ source: 'bred', rareParents: 2 }, off)).toBe(0);
    expect(rollRareVariant({ source: 'shop' }, off, () => 0)).toBeUndefined();
  });

  it('roll boundary: just below the chance succeeds, exactly the chance fails', () => {
    const ch = prismaticChance({ source: 'shop' });
    const hit = rollRareVariant({ source: 'shop' }, PRISMATIC, seq([ch - 1e-12, 0.25]));
    expect(hit?.kind).toBe('prismatic');
    expect(hit?.origin).toBe('shop');
    expect(Number.isInteger(hit!.visualSeed) && hit!.visualSeed > 0).toBe(true);
    expect(rollRareVariant({ source: 'shop' }, PRISMATIC, () => ch)).toBeUndefined();
  });

  it('origin records how the shimmer came about', () => {
    expect(rollRareVariant({ source: 'bred', rareParents: 1 }, PRISMATIC, seq([0, 0.5]))?.origin).toBe('bred');
    expect(rollRareVariant({ source: 'bred', rareParents: 0 }, PRISMATIC, seq([0, 0.5]))?.origin).toBe('spontaneous');
  });

  it('pair forecast counts Prismatic parents', () => {
    const rare = { rareVariant: { kind: 'prismatic' as const, origin: 'shop' as const, visualSeed: 9 } };
    expect(prismaticChanceForPair({}, {})).toBe(1 / 8192);
    expect(prismaticChanceForPair(rare, {})).toBe(1 / 2048);
    expect(prismaticChanceForPair(rare, rare)).toBe(1 / 1024);
  });
});

describe('Prismatic rolls never touch the simulation', () => {
  it('rolling draws from the creature’s own generator — the sim stream never moves', () => {
    const g = newGame({ starterId: 'betta', starterName: 'R', seed: 9 });
    const c = createCreature(g, simRng(g), 'betta', {});
    const before = g.rngState;
    for (let i = 0; i < 64; i++) assignPrismatic(g, { ...c, id: `cr_probe_${i}`, rareVariant: undefined, history: [] } as Creature, 'shop');
    expect(g.rngState).toBe(before);
  });

  it('is deterministic for the same save, creature and moment; different creatures draw differently', () => {
    const a = prismaticRngFor({ seed: 5, rngState: 77 }, 'cr_1');
    const b = prismaticRngFor({ seed: 5, rngState: 77 }, 'cr_1');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(prismaticRngFor({ seed: 5, rngState: 77 }, 'cr_2')()).not.toBe(prismaticRngFor({ seed: 5, rngState: 77 }, 'cr_1')());
  });

  it('an animal is rolled once: a second call keeps the first result', () => {
    const g = newGame({ starterId: 'betta', starterName: 'R', seed: 3 });
    const c = createCreature(g, simRng(g), 'betta', {});
    forcePrismatic('shop', 1);
    const rv = assignPrismatic(g, c, 'shop');
    expect(rv?.kind).toBe('prismatic');
    expect(forcedPrismaticPending('shop')).toBe(0);
    const again = assignPrismatic(g, c, 'shop');
    expect(again).toBe(rv);
    expect(c.history.filter((h) => /Prismatic/.test(h.text))).toHaveLength(1);
  });
});

function shopWorld(seed = 7): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Shop', seed });
  g.finance.money = 1_000_000;
  return g;
}

describe('Prismatic in the shop', () => {
  it('a stocked Prismatic is labelled, noted and valued ×12 exactly once', () => {
    const g = shopWorld();
    forcePrismatic('shop', 1);
    const o = generateOffer(g, simRng(g), 'betta', { expiresHour: g.clock.hour + 24, sexes: ['male'] })!;
    const c = o.creatures[0];
    expect(isPrismatic(c)).toBe(true);
    expect(c.rareVariant?.origin).toBe('shop');
    expect(o.label).toMatch(/^Prismatic /);
    expect(o.note).toMatch(/Prismatic/);
    const v = creatureValue(g, c);
    const plain = creatureValue(g, { ...c, rareVariant: undefined });
    expect(v.factors.filter((f) => f.label === 'Prismatic')).toHaveLength(1);
    expect(v.factors.find((f) => f.label === 'Prismatic')?.mult).toBe(PRISMATIC.valueMultiplier);
    expect(v.total / plain.total).toBeCloseTo(PRISMATIC.valueMultiplier, 1);
    expect(v.base).toBe(getSpecies('betta').baseValue);
  });

  it('the offer stores the result: rereading or reloading the shop never rerolls it', () => {
    const g = shopWorld();
    forcePrismatic('shop', 1);
    const o = generateOffer(g, simRng(g), 'betta', { expiresHour: g.clock.hour + 24 })!;
    g.market.stock.unshift(o);
    const reread = JSON.parse(JSON.stringify(g.market.stock[0]));
    expect(reread.creatures[0].rareVariant).toEqual(o.creatures[0].rareVariant);
    expect(reread.price).toBe(o.price);
  });

  it('only the seller’s final pick is rolled (a rare-tier best-of-six rolls once)', () => {
    const g = shopWorld(21);
    forcePrismatic('shop', 1);
    const o = generateOffer(g, simRng(g), 'betta', { tier: 'rare', expiresHour: g.clock.hour + 24, sexes: ['male'] })!;
    expect(isPrismatic(o.creatures[0])).toBe(true);
    expect(forcedPrismaticPending('shop')).toBe(0);
  });

  it('a group carrying a Prismatic is sold as one lot — no cherry-picking at the group’s unit price', () => {
    const g = shopWorld(11);
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Lot test' });
    forcePrismatic('shop', 1);
    const o = generateOffer(g, simRng(g), 'neon_tetra', { expiresHour: g.clock.hour + 24, sexes: [undefined, undefined, undefined] })!;
    g.market.stock.push(o);
    expect(isLotOffer(o)).toBe(true);
    const money = g.finance.money;
    const partial = buyOffer(g, o.id, tank.id, [0]);
    expect(partial.ok).toBe(false);
    expect(g.finance.money).toBe(money);
    const whole = buyOffer(g, o.id, tank.id);
    expect(whole.ok).toBe(true);
    expect(g.finance.money).toBe(money - offerPickPrice(o, o.creatures.length).price);
    const owned = Object.values(g.creatures).filter((c) => isPrismatic(c) && c.speciesId === 'neon_tetra');
    expect(owned).toHaveLength(1);
    expect(owned[0].rareVariant).toEqual(o.creatures[0].rareVariant);
    expect(g.progress.prismaticFinds?.map((f) => f.creatureId)).toEqual([owned[0].id]);
  });

  it('ordinary groups still allow partial picks', () => {
    const g = shopWorld(11);
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Pick test' });
    const o = generateOffer(g, simRng(g), 'neon_tetra', { expiresHour: g.clock.hour + 24, sexes: [undefined, undefined, undefined] })!;
    g.market.stock.push(o);
    expect(isLotOffer(o)).toBe(false);
    expect(buyOffer(g, o.id, tank.id, [1]).ok).toBe(true);
  });
});

const betta = getSpecies('betta');
const bettaGenome = (color: string, pattern: string, fins: string): Genome =>
  normalizeGenome(betta, { alleles: { color: [color, color], pattern: [pattern, pattern], fins: [fins, fins] }, potentials: {} as Genome['potentials'] });

describe('Prismatic young', () => {
  function brood(opts: { force?: number; momRare?: boolean; dadRare?: boolean; count?: number } = {}) {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Nursery' });
    tank.purpose = 'nursery';
    const mom = createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome: bettaGenome('royal', 'butterfly', 'halfmoon') });
    const dad = createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome: bettaGenome('royal', 'butterfly', 'halfmoon') });
    if (opts.momRare) mom.rareVariant = { kind: 'prismatic', origin: 'shop', visualSeed: 7 };
    if (opts.dadRare) dad.rareVariant = { kind: 'prismatic', origin: 'shop', visualSeed: 8 };
    addCreature(g, mom, null);
    addCreature(g, dad, null);
    const cl = createClutch(g, { sp: betta, tank, mother: mom, father: dad, hour: g.clock.hour - 100, stage: 'fry', count: opts.count ?? 4, visual: 'fry_cloud', nextStageHour: g.clock.hour });
    if (opts.force) forcePrismatic('bred', opts.force);
    const kids = mintJuveniles(g, cl, tank, betta, g.clock.hour, null);
    return { g, kids };
  }

  it('a Prismatic youngster is recorded once, keeps its history line and is celebrated', () => {
    const { g, kids } = brood({ force: 1 });
    const shimmer = kids.filter((c) => isPrismatic(c));
    expect(shimmer).toHaveLength(1);
    expect(shimmer[0].rareVariant!.origin).toBe('spontaneous');
    expect(shimmer[0].history.some((h) => /Born Prismatic/.test(h.text))).toBe(true);
    expect(g.progress.prismaticFinds?.map((f) => f.creatureId)).toEqual([shimmer[0].id]);
    expect(g.log.some((e) => e.kind === 'celebrate' && /^Prismatic!/.test(e.text) && e.creatureId === shimmer[0].id)).toBe(true);
  });

  it('with a Prismatic parent the origin is "bred"', () => {
    const { kids } = brood({ force: 1, momRare: true });
    expect(kids.find((c) => isPrismatic(c))?.rareVariant?.origin).toBe('bred');
  });

  it('inheritance, temperament and the sim stream are identical whether or not a youngster shimmers', () => {
    const a = brood();
    const b = brood({ force: 3 });
    const shape = (k: Creature) => [k.id, k.genome, k.personality, k.morphName, k.sex, k.appearance];
    expect(b.kids.map(shape)).toEqual(a.kids.map(shape));
    expect(b.g.rngState).toBe(a.g.rngState);
    expect(b.kids.filter((c) => isPrismatic(c))).toHaveLength(3);
    expect(a.kids.filter((c) => isPrismatic(c))).toHaveLength(0);
  });

  it('a recognised strain born for the first time is named in the same celebration (one toast, not two)', () => {
    const { g, kids } = brood();
    expect(kids[0].morphName).toBe('Royal Blue Butterfly Halfmoon');
    const firsts = g.log.filter((e) => e.kind === 'celebrate' && /^First Royal Blue Butterfly Halfmoon/.test(e.text));
    expect(firsts).toHaveLength(1);
    expect(firsts[0].text).toMatch(/Royal Butterfly Halfmoon/);
    expect(g.progress.discoveredStrains).toEqual(expect.arrayContaining(['betta:royal_butterfly_hm', 'betta:blue_butterfly']));
  });
});
