/**
 * chunk 17 (ADR-0053) — the big-tank species: the research that opens them (BIG-008), the tank gate on them (BIG-007),
 * the foods sold with them (BIG-009), save format v4 (BIG-012) and the compatibility matrix's rows (BIG-011).
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { findSpecies, ALL_SPECIES } from '@/data/species';
import { ROSTER } from '@/data/species/roster';
import { RESEARCH_BY_ID } from '@/data/research';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { FOODS, getFoodDef } from '@/data/catalog/foods';
import { isFoodAvailable, isSpeciesAvailable, requiredUnlocks, speciesLockHint, generateOffer, soldWithWords } from '@/sim/economy/shop';
import { buyFood } from '@/sim/economy';
import { plannedOrders } from '@/sim/staff/work';
import { unlock } from '@/sim/facility';
import { migrateSave, SCHEMA_VERSION } from '@/persistence';
import { clearCompatCache, speciesPair } from '@/sim/compat';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { resolveMorph } from '@/sim/life/genetics';

const game = (starterId: 'betta' | 'ocellaris_clownfish' = 'betta', seed = 1): GameState => newGame({ starterId, starterName: '', seed });
const WAVE_A = ['oscar', 'clown_loach', 'black_ghost_knifefish', 'fahaka_puffer', 'ornate_bichir', 'silver_arowana'];

describe('BIG-008: Big-water Freshwater', () => {
  it('needs intermediate freshwater and the 125-gallon tank, costs $3,000 and 60 hours, and grants fw_large (the owner’s round 3)', () => {
    const r = RESEARCH_BY_ID.large_freshwater;
    expect(r).toMatchObject({ name: 'Big-water Freshwater', cost: 3000, hours: 60, grants: ['fw_large'], branch: 'freshwater' });
    expect(r.requires).toEqual([{ type: 'unlocked', key: 'fw_intermediate' }, { type: 'unlocked', key: 'tank_125' }]);
    expect(r.blurb).toBe('River giants need long tanks, big filters and a heavy lid. Opens oscars, clown loaches, black ghost knifefish, fahaka puffers, ornate bichirs, silver arowanas and, with Cool-water Systems, koi.');
    expect(UNLOCK_RULE_BY_KEY.fw_large.hint).toBe('Research Big-water Freshwater.');
  });

  it('the big freshwater fish wait for the research and the tank that holds an adult', () => {
    const want: Record<string, string> = { oscar: 'tank_180', clown_loach: 'tank_180', black_ghost_knifefish: 'tank_240', fahaka_puffer: 'tank_180', ornate_bichir: 'tank_180', silver_arowana: 'tank_500' };
    for (const id of WAVE_A) {
      expect(requiredUnlocks(findSpecies(id)!), id).toEqual(['fw_large', want[id]]);
      expect(ROSTER.find((r) => r.id === id)?.unlock, id).toBe('fw_large');
    }
    const g = game();
    for (const id of WAVE_A) expect(isSpeciesAvailable(g, id), id).toBe(false);
    unlock(g, 'fw_large', { silent: true });
    for (const id of WAVE_A) expect(isSpeciesAvailable(g, id), id).toBe(false);
    unlock(g, 'tank_180', { silent: true });
    for (const id of ['oscar', 'clown_loach', 'fahaka_puffer', 'ornate_bichir']) expect(isSpeciesAvailable(g, id), id).toBe(true);
    expect(isSpeciesAvailable(g, 'black_ghost_knifefish')).toBe(false);
    expect(isSpeciesAvailable(g, 'silver_arowana')).toBe(false);
  });

  it('the silver arowana’s locked card says what the owner approved', () => {
    expect(speciesLockHint(game(), findSpecies('silver_arowana')!)).toBe('Research Big-water Freshwater. It also waits for the 500 Gallon Showpiece: research Acrylic Engineering, or grow into a destination aquarium.');
  });
});

describe('BIG-009: foods sold with the animals that eat them', () => {
  const NEW_FOODS = ['koi_sticks', 'carnivore_sticks', 'seafood_frozen', 'shellfish_frozen', 'live_crickets'];

  it('every soldWith names a species in the game that eats the food', () => {
    for (const f of FOODS) {
      for (const id of f.soldWith ?? []) {
        const sp = findSpecies(id);
        expect(sp, `${f.id} → ${id}`).toBeDefined();
        expect(sp!.foods.some((t) => f.tags.includes(t)), `${id} eats ${f.id}`).toBe(true);
      }
    }
    for (const id of NEW_FOODS) expect(getFoodDef(id)?.soldWith?.length, id).toBeGreaterThan(0);
  });

  it('the owner’s names and prices (round 3)', () => {
    const got = NEW_FOODS.map((id) => { const f = getFoodDef(id)!; return [f.name, f.price, f.servingsPerPack]; });
    expect(got).toEqual([
      ['Koi Sticks', 10, 100],
      ['Floating Carnivore Sticks', 14, 80],
      ['Frozen Squid, Prawn & Mussel', 16, 40],
      ['Frozen Shell-on Shellfish', 14, 30],
      ['Live Crickets', 8, 20],
    ]);
  });

  it('a new food is not sold, bought or ordered before an animal that eats it can be bought', () => {
    const g = game();
    g.finance.money = 1e5;
    for (const id of NEW_FOODS) expect(isFoodAvailable(g, getFoodDef(id)!), id).toBe(false);
    const r = buyFood(g, 'shellfish_frozen', 1);
    expect(r.ok).toBe(false);
    expect(r.message).toBe(`Frozen Shell-on Shellfish comes into the shop with ${soldWithWords(getFoodDef('shellfish_frozen')!)}.`);
    expect(soldWithWords(getFoodDef('shellfish_frozen')!)).toBe('fahaka puffers');
    expect(soldWithWords(getFoodDef('seafood_frozen')!)).toBe('oscars, ornate bichirs and more');
    unlock(g, 'fw_large', { silent: true });
    unlock(g, 'tank_180', { silent: true });
    for (const id of NEW_FOODS) expect(isFoodAvailable(g, getFoodDef(id)!), id).toBe(id !== 'koi_sticks'); // koi wait for the 800
    expect(buyFood(g, 'shellfish_frozen', 1).ok).toBe(true);
  });

  it('the old foods are sold as before (no soldWith)', () => {
    const g = game();
    for (const f of FOODS.filter((x) => !NEW_FOODS.includes(x.id))) expect(f.soldWith, f.id).toBeUndefined();
    expect(isFoodAvailable(g, getFoodDef('meaty_frozen')!)).toBe(true);
  });

  it('a stock manager never orders a food the shop doesn’t sell yet, even for an oscar it keeps', () => {
    // an oscar the player already owns (a save from before the gate, a gift): the shop doesn't sell oscars yet
    const g = game();
    g.inventory.foods = {};
    const t = createTank(g, 'g180', 'freshwater_tropical', { cycled: true, name: 'Big' });
    const c = addCreature(g, createCreature(g, simRng(g), 'oscar', { ageDays: 40 }), t.id);
    c.stats.hunger = 90;
    expect(isSpeciesAvailable(g, 'oscar')).toBe(false);
    const member = { id: 's1', name: 'Sam', role: 'stock_manager', trait: 'planner', skill: 3 } as unknown as Parameters<typeof plannedOrders>[1];
    const orders = plannedOrders(g, member).map((o) => o.foodId);
    expect(orders.length).toBeGreaterThan(0);
    for (const id of orders) expect(NEW_FOODS, id).not.toContain(id);
  });
});

describe('BIG-012: save format v4 drops the offers the tank gate refuses', () => {
  it('a v3 save loses only the stocked offers whose tank is still locked', () => {
    expect(SCHEMA_VERSION).toBe(4);
    const g = game('ocellaris_clownfish', 4);
    const rng = simRng(g);
    const gated = generateOffer(g, rng, 'royal_gramma', { expiresHour: g.clock.hour + 48 })!;
    const open = generateOffer(g, rng, 'firefish', { expiresHour: g.clock.hour + 48 })!;
    g.market.stock = [gated, open];
    const v3 = JSON.parse(JSON.stringify({ ...g, schemaVersion: 3 }));
    const { state, fromVersion } = migrateSave(v3);
    expect(fromVersion).toBe(3);
    expect(state.market.stock.map((o) => o.speciesId)).toEqual(['firefish']);
    // with the 40-gallon unlocked the gramma stays
    const v3b = JSON.parse(JSON.stringify({ ...g, schemaVersion: 3, progress: { ...g.progress, unlocked: [...g.progress.unlocked, 'tank_40'] } }));
    expect(migrateSave(v3b).state.market.stock.map((o) => o.speciesId)).toEqual(['royal_gramma', 'firefish']);
  });
});

describe('BIG-011: the compatibility matrix (design §11), big freshwater', () => {
  const v = (a: string, b: string) => {
    clearCompatCache();
    return speciesPair(findSpecies(a)!, findSpecies(b)!).verdict;
  };
  it('the new species against each other', () => {
    expect(v('oscar', 'clown_loach')).toBe('conditional');
    expect(v('oscar', 'black_ghost_knifefish')).toBe('conditional');
    expect(v('oscar', 'fahaka_puffer')).toBe('incompatible');
    // the design's "usually compatible" rows, made stricter by the sources (a young bichir or arowana is at risk)
    expect(v('oscar', 'ornate_bichir')).toBe('conditional');
    expect(v('oscar', 'silver_arowana')).toBe('conditional');
    expect(v('clown_loach', 'black_ghost_knifefish')).toBe('conditional');
    expect(v('clown_loach', 'fahaka_puffer')).toBe('incompatible');
    expect(v('clown_loach', 'ornate_bichir')).toBe('conditional');
    expect(['usually_compatible', 'excellent']).toContain(v('clown_loach', 'silver_arowana'));
    expect(v('black_ghost_knifefish', 'fahaka_puffer')).toBe('incompatible');
    expect(['usually_compatible', 'excellent']).toContain(v('black_ghost_knifefish', 'ornate_bichir'));
    expect(v('black_ghost_knifefish', 'silver_arowana')).toBe('usually_compatible');
    expect(v('fahaka_puffer', 'ornate_bichir')).toBe('incompatible');
    expect(v('fahaka_puffer', 'silver_arowana')).toBe('incompatible');
    expect(v('ornate_bichir', 'silver_arowana')).toBe('usually_compatible');
  });

  it('each against its riskiest and its best existing tankmate', () => {
    expect(v('oscar', 'neon_tetra')).toBe('incompatible');
    expect(v('oscar', 'comet_goldfish')).toBe('incompatible');
    expect(v('clown_loach', 'mystery_snail')).toBe('incompatible');
    expect(v('clown_loach', 'bristlenose_pleco')).toBe('excellent');
    expect(v('black_ghost_knifefish', 'cherry_shrimp')).toBe('incompatible');
    expect(v('black_ghost_knifefish', 'freshwater_angelfish')).toBe('excellent');
    expect(v('fahaka_puffer', 'discus')).toBe('incompatible');
    expect(v('ornate_bichir', 'neon_tetra')).toBe('incompatible');
    expect(v('silver_arowana', 'neon_tetra')).toBe('incompatible');
    // nothing shares a fahaka's tank safely
    for (const sp of ALL_SPECIES) if (sp.id !== 'fahaka_puffer' && sp.environment === 'freshwater') expect(['high_risk', 'incompatible'], sp.id).toContain(v('fahaka_puffer', sp.id));
  });
});

describe('BIG-002 and BIG-004: koi, the silver mono and the spotted scat', () => {
  const v = (a: string, b: string) => {
    clearCompatCache();
    return speciesPair(findSpecies(a)!, findSpecies(b)!).verdict;
  };

  it('wait for their water’s research and the tank that holds an adult', () => {
    expect(requiredUnlocks(findSpecies('koi')!)).toEqual(['fw_coldwater', 'fw_large', 'tank_800']);
    expect(requiredUnlocks(findSpecies('silver_mono')!)).toEqual(['brackish', 'tank_180']);
    expect(requiredUnlocks(findSpecies('spotted_scat')!)).toEqual(['brackish', 'tank_240']);
    const g = game();
    for (const k of ['fw_coldwater', 'fw_large', 'tank_180']) unlock(g, k, { silent: true });
    expect(isSpeciesAvailable(g, 'koi')).toBe(false);
    expect(isFoodAvailable(g, getFoodDef('koi_sticks')!)).toBe(false);
    unlock(g, 'tank_800', { silent: true });
    expect(isSpeciesAvailable(g, 'koi')).toBe(true);
    expect(isFoodAvailable(g, getFoodDef('koi_sticks')!)).toBe(true);
    expect(getFoodDef('koi_sticks')).toMatchObject({ name: 'Koi Sticks', price: 10, servingsPerPack: 100, form: 'dry', description: 'Big floating sticks for koi, which feed at the surface and come up to beg. Fits an autofeeder.' });
  });

  it('koi varieties come from the genes: the documented ones and the stand-ins', () => {
    const koi = findSpecies('koi')!;
    const POT = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
    const g = (pairs: Record<string, [string, string]>) => ({ alleles: { scale: ['S', 'S'], metal: ['d', 'd'], bekko: ['bk', 'bk'], hi: ['h', 'h'], ground: ['W', 'W'], tancho: ['T', 'T'], ginrin: ['R', 'R'], fin: ['lf', 'lf'], ...pairs }, potentials: POT }) as unknown as Parameters<typeof resolveMorph>[1];
    const name = (pairs: Record<string, [string, string]>) => resolveMorph(koi, g(pairs)).morphName;
    expect(name({ hi: ['H', 'h'] })).toBe('Kohaku');
    expect(name({ hi: ['H', 'h'], bekko: ['Bk', 'bk'] })).toBe('Taisho Sanke');
    expect(name({ bekko: ['Bk', 'bk'] })).toBe('Shiro Bekko');
    // the Bekko black needs a white ground
    expect(name({ ground: ['U', 'W'], hi: ['H', 'h'], bekko: ['Bk', 'Bk'] })).toBe('Showa');
    expect(name({ hi: ['H', 'h'], tancho: ['t', 't'] })).toContain('Tancho');
    expect(name({ ground: ['U', 'W'], hi: ['H', 'h'] })).toBe('Showa');
    expect(name({ ground: ['U', 'U'] })).toBe('Shiro Utsuri');
    expect(name({ ground: ['A', 'A'] })).toBe('Asagi');
    expect(name({ ground: ['A', 'A'], scale: ['s', 's'] })).toContain('Doitsu');
    expect(name({ ground: ['A', 'W'], hi: ['H', 'h'] })).toBe('Goshiki');
    expect(name({ ground: ['C', 'Y'] })).toBe('Karashi');
    expect(name({ metal: ['D', 'd'] })).toBe('Platinum Ogon');
    expect(name({ metal: ['D', 'd'], ground: ['Y', 'Y'] })).toBe('Yamabuki Ogon');
    // butterfly fins: one dominant gene (Gomelsky et al. 2011)
    expect(name({ hi: ['H', 'h'], fin: ['Lf', 'lf'] })).toContain('Butterfly');
    expect(koi.genetics.loci.find((l) => l.id === 'fin')?.alleles.find((x) => x.id === 'Lf')?.dominance).toBe(2);
  });

  it('the matrix rows: cool water, brackish water and the estuary pairing', () => {
    expect(v('koi', 'oscar')).toBe('incompatible');
    expect(v('koi', 'silver_arowana')).toBe('incompatible');
    expect(v('koi', 'comet_goldfish')).toBe('usually_compatible');
    expect(v('koi', 'fancy_goldfish')).toBe('high_risk');
    expect(v('koi', 'cherry_shrimp')).toBe('incompatible');
    expect(v('silver_mono', 'spotted_scat')).toBe('excellent');
    expect(v('silver_mono', 'bumblebee_goby')).toBe('high_risk');
    expect(v('silver_mono', 'oscar')).toBe('incompatible');
    expect(v('spotted_scat', 'banded_archerfish')).toBe('usually_compatible');
    expect(v('spotted_scat', 'figure_eight_puffer')).toBe('conditional');
  });
});
