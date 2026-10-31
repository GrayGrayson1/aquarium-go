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
import { tankFoodOutlook } from '@/sim/tankStatus';
import { unlock } from '@/sim/facility';
import { migrateSave, SCHEMA_VERSION } from '@/persistence';
import { clearCompatCache, speciesPair } from '@/sim/compat';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { resolveMorph } from '@/sim/life/genetics';
import { SELLERS } from '@/data/buyers';
import { SHOW_CLASSES } from '@/data/shows';
import { morphCatalog, tierForShare, tierRank } from '@/sim/life/morphCatalog';

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
    expect(r.message).toBe(`The shop sells Frozen Shell-on Shellfish once you can buy ${soldWithWords(getFoodDef('shellfish_frozen')!)}.`);
    expect(soldWithWords(getFoodDef('shellfish_frozen')!)).toBe('fahaka puffers or clown triggerfish');
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

  it('nor does a hint tell the player to buy one (the review): the restock pick and the hunger advice skip it', () => {
    const g = game();
    g.inventory.foods = {};
    const t = createTank(g, 'g180', 'freshwater_tropical', { cycled: true, name: 'Big' });
    const c = addCreature(g, createCreature(g, simRng(g), 'oscar', { ageDays: 40 }), t.id);
    c.stats.hunger = 95;
    const out = tankFoodOutlook(g, t.id);
    if (out.restockId) expect(NEW_FOODS).not.toContain(out.restockId);
    for (const f of NEW_FOODS) expect(JSON.stringify(out)).not.toContain(getFoodDef(f)!.name.toLowerCase());
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
    expect(v('clown_loach', 'silver_arowana')).toBe('usually_compatible');
    expect(v('black_ghost_knifefish', 'fahaka_puffer')).toBe('incompatible');
    expect(v('black_ghost_knifefish', 'ornate_bichir')).toBe('usually_compatible');
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

describe('BIG-005: the big marine five', () => {
  const v = (a: string, b: string) => {
    clearCompatCache();
    return speciesPair(findSpecies(a)!, findSpecies(b)!).verdict;
  };

  it('wait for their research and the tank that holds an adult', () => {
    expect(requiredUnlocks(findSpecies('blue_tang')!)).toEqual(['marine_large', 'tank_180']);
    expect(requiredUnlocks(findSpecies('naso_tang')!)).toEqual(['marine_large', 'tank_240']);
    expect(requiredUnlocks(findSpecies('queen_angelfish')!)).toEqual(['marine_large', 'tank_300']);
    expect(requiredUnlocks(findSpecies('clown_triggerfish')!)).toEqual(['predators', 'tank_300']);
    // the panther grouper's 60 cm adult needs three feet front to back: the 500
    expect(requiredUnlocks(findSpecies('panther_grouper')!)).toEqual(['predators', 'tank_500']);
  });

  it('their foods: the trigger’s shell-on shellfish and the grouper’s seafood', () => {
    expect(getFoodDef('shellfish_frozen')!.soldWith).toContain('clown_triggerfish');
    expect(getFoodDef('seafood_frozen')!.soldWith).toContain('panther_grouper');
  });

  it('the matrix rows (design §11)', () => {
    expect(v('blue_tang', 'naso_tang')).toBe('conditional');
    expect(v('blue_tang', 'queen_angelfish')).toBe('usually_compatible');
    expect(v('naso_tang', 'queen_angelfish')).toBe('usually_compatible');
    expect(v('blue_tang', 'clown_triggerfish')).toBe('conditional');
    expect(v('naso_tang', 'clown_triggerfish')).toBe('conditional');
    expect(v('queen_angelfish', 'clown_triggerfish')).toBe('conditional');
    expect(v('clown_triggerfish', 'panther_grouper')).toBe('conditional');
    expect(v('queen_angelfish', 'emperor_angelfish')).toBe('high_risk');
    expect(v('blue_tang', 'yellow_tang')).toBe('conditional');
    expect(v('clown_triggerfish', 'cleaner_shrimp')).toBe('incompatible');
    expect(v('clown_triggerfish', 'hermit_crab')).toBe('incompatible');
    expect(v('panther_grouper', 'cleaner_shrimp')).toBe('high_risk');
    expect(v('panther_grouper', 'miniatus_grouper')).toBe('high_risk');
    // grown tangs and big angels are too big for it, small ones aren't (the review: design §11's row)
    for (const o of ['blue_tang', 'naso_tang', 'queen_angelfish', 'emperor_angelfish', 'yellow_tang']) expect(v('panther_grouper', o), o).toBe('conditional');
    expect(v('silver_mono', 'blue_tang')).toBe('conditional');
    expect(v('spotted_scat', 'queen_angelfish')).toBe('conditional');
    expect(v('clown_triggerfish', 'silver_mono')).toBe('high_risk');
    // the best of their tankmates
    expect(v('blue_tang', 'ocellaris_clownfish')).toBe('excellent');
    expect(v('naso_tang', 'cleaner_shrimp')).toBe('excellent');
  });
});

describe('BIG-003, BIG-006 and BIG-008: the motoro, the bottom sharks and Shark & Ray Husbandry', () => {
  const SHARKS = ['coral_catshark', 'epaulette_shark', 'brownbanded_bamboo_shark'];
  const v = (a: string, b: string) => {
    clearCompatCache();
    return speciesPair(findSpecies(a)!, findSpecies(b)!).verdict;
  };

  it('Shark & Ray Husbandry: a public showroom and the 300-gallon tank, $8,000 and 96 hours, grants elasmobranchs (the owner’s round 3)', () => {
    const r = RESEARCH_BY_ID.shark_ray_husbandry;
    expect(r).toMatchObject({ name: 'Shark & Ray Husbandry', cost: 8000, hours: 96, grants: ['elasmobranchs'], track: 'marine', branch: 'marine', xp: 220 });
    expect(r.requires).toEqual([{ type: 'facility', level: 'showroom' }, { type: 'unlocked', key: 'tank_300' }]);
    expect(r.blurb).toBe('Soft sand, no copper, a tight lid and iodine-rich seafood for animals built of cartilage. Opens the motoro stingray, coral catshark, epaulette shark and brown-banded bamboo shark.');
    expect(UNLOCK_RULE_BY_KEY.elasmobranchs.hint).toBe('Research Shark & Ray Husbandry.');
  });

  it('wait for their research and the tank that holds an adult (the bamboo shark for the 1,000)', () => {
    expect(requiredUnlocks(findSpecies('motoro_stingray')!)).toEqual(['elasmobranchs', 'tank_500']);
    expect(requiredUnlocks(findSpecies('coral_catshark')!)).toEqual(['marine_basics', 'elasmobranchs', 'tank_500']);
    expect(requiredUnlocks(findSpecies('epaulette_shark')!)).toEqual(['marine_basics', 'elasmobranchs', 'tank_500']);
    expect(requiredUnlocks(findSpecies('brownbanded_bamboo_shark')!)).toEqual(['marine_basics', 'elasmobranchs', 'tank_1000']);
    const g = game();
    const all = ['motoro_stingray', ...SHARKS];
    for (const k of ['marine_basics', 'elasmobranchs']) unlock(g, k, { silent: true });
    for (const id of all) expect(isSpeciesAvailable(g, id), id).toBe(false);
    unlock(g, 'tank_500', { silent: true });
    for (const id of ['motoro_stingray', 'coral_catshark', 'epaulette_shark']) expect(isSpeciesAvailable(g, id), id).toBe(true);
    expect(isSpeciesAvailable(g, 'brownbanded_bamboo_shark')).toBe(false);
    expect(speciesLockHint(g, findSpecies('brownbanded_bamboo_shark')!)).toBe('Comes into the shop with the 1,000 Gallon Grand Display: research Grand Display Engineering or open the Grand Hall.');
    unlock(g, 'tank_1000', { silent: true });
    expect(isSpeciesAvailable(g, 'brownbanded_bamboo_shark')).toBe(true);
  });

  it('the seafood comes with them; they live on frozen seafood, never the autofeeder’s floating sticks', () => {
    const sold = getFoodDef('seafood_frozen')!.soldWith ?? [];
    for (const id of ['motoro_stingray', ...SHARKS]) {
      expect(sold, id).toContain(id);
      expect(findSpecies(id)!.foods, id).toContain('seafood');
      expect(findSpecies(id)!.foods, id).not.toContain('pellet_floating');
    }
  });

  it('breed by their new systems; the sharks lay where the sources say', () => {
    for (const id of SHARKS) expect(findSpecies(id)!.breeding.system, id).toBe('egg_case');
    expect(findSpecies('motoro_stingray')!.breeding.system).toBe('ray_viviparous');
    // real days × 8 (ADR-0053 round 2): 120, 130 and 125 days
    expect(SHARKS.map((id) => findSpecies(id)!.breeding.incubationHours)).toEqual([960, 1040, 1000]);
  });

  it('the shark matrix (design §11 and the sharks research)', () => {
    for (const s of SHARKS) {
      for (const o of ['blue_tang', 'naso_tang', 'yellow_tang', 'lyretail_anthias', 'foxface_rabbitfish', 'maroon_clownfish']) expect(v(s, o), `${s} + ${o}`).toBe('usually_compatible');
      for (const o of ['silver_mono', 'spotted_scat', 'bubbletip_anemone', 'coral_beauty']) expect(['conditional', 'high_risk'], `${s} + ${o}`).toContain(v(s, o));
      for (const o of ['queen_angelfish', 'emperor_angelfish', 'dwarf_lionfish', 'miniatus_grouper', 'firefish']) expect(v(s, o), `${s} + ${o}`).toBe('high_risk');
      for (const o of ['clown_triggerfish', 'cleaner_shrimp', 'emerald_crab', 'hermit_crab', 'peacock_mantis_shrimp', 'mandarin_dragonet', 'lined_seahorse']) expect(v(s, o), `${s} + ${o}`).toBe('incompatible');
    }
    // groupers eat young sharks; a grown bamboo shark is too big for a panther grouper
    expect(v('coral_catshark', 'panther_grouper')).toBe('high_risk');
    expect(v('epaulette_shark', 'panther_grouper')).toBe('high_risk');
    expect(v('brownbanded_bamboo_shark', 'panther_grouper')).toBe('conditional');
    // two bottom sharks need twice the floor
    expect(v('coral_catshark', 'epaulette_shark')).toBe('conditional');
    expect(v('epaulette_shark', 'brownbanded_bamboo_shark')).toBe('conditional');
    // the dwarf angels: they pick at a resting shark (conditional; the bamboo shark's mouth makes it high risk)
    expect(v('coral_catshark', 'flame_angelfish')).toBe('conditional');
    expect(v('brownbanded_bamboo_shark', 'flame_angelfish')).toBe('high_risk');
  });

  it('the motoro’s matrix (the koi-ray-brackish research)', () => {
    expect(v('motoro_stingray', 'silver_arowana')).toBe('usually_compatible');
    // the research's "usually compatible", made stricter by the size rules (a young bichir is at risk)
    expect(v('motoro_stingray', 'ornate_bichir')).toBe('conditional');
    for (const o of ['oscar', 'clown_loach', 'black_ghost_knifefish', 'discus', 'freshwater_angelfish']) expect(v('motoro_stingray', o), o).toBe('conditional');
    expect(v('motoro_stingray', 'bristlenose_pleco')).toBe('high_risk');
    for (const o of ['fahaka_puffer', 'koi', 'neon_tetra', 'cherry_shrimp', 'mystery_snail', 'axolotl', 'panda_corydoras']) expect(v('motoro_stingray', o), o).toBe('incompatible');
    for (const s of SHARKS) expect(v('motoro_stingray', s), s).toBe('incompatible');
  });
});

describe('BIG-012: the sellers and the Koi show (the owner’s round 3)', () => {
  it('every chunk 17 species has a specialist seller; the two new ones carry the owner’s names and line words', () => {
    const by = (name: string) => SELLERS.find((s) => s.name === name)!;
    expect(by('Blackwater River Imports')).toMatchObject({ lineFlavour: 'river stock', specialties: ['oscar', 'clown_loach', 'black_ghost_knifefish', 'fahaka_puffer', 'ornate_bichir', 'silver_arowana', 'motoro_stingray'] });
    expect(by('Mermaid’s Purse Shark Hatchery')).toMatchObject({ lineFlavour: 'hatchery line', specialties: ['coral_catshark', 'epaulette_shark', 'brownbanded_bamboo_shark'] });
    expect(by('Coldwater Koi & Goldfish').specialties).toContain('koi');
    for (const id of ['blue_tang', 'naso_tang', 'queen_angelfish', 'clown_triggerfish', 'panther_grouper']) expect(by('Deep Reef Specialists').specialties, id).toContain(id);
    for (const id of ['silver_mono', 'spotted_scat']) expect(by('Mangrove Coast Aquatics').specialties, id).toContain(id);
    // the general store stays last and general
    expect(SELLERS[SELLERS.length - 1]).toMatchObject({ name: 'Harbor Street Aquatics', specialties: [] });
  });

  it('a Koi class from club shows up, judged as the owner approved', () => {
    const k = SHOW_CLASSES.find((c) => c.id === 'koi')!;
    expect(k).toMatchObject({ name: 'Koi', kind: 'livestock', species: ['koi'], standard: { form: 25, colour: 25, pattern: 20, size: 15, condition: 15 } });
    expect(k.blurb).toBe('Body shape, clean white skin, deep even colour and a crisp, balanced pattern. A big koi is a prize.');
    expect(Object.values(k.standard).reduce((a, b) => a + (b ?? 0), 0)).toBe(100);
    expect(k.minTier).toBeUndefined();
  });
});

describe('the four forms with unproven inheritance are rare forms (the owner, ADR-0053 round 2; the review)', () => {
  it('the Borneo loach, the butterfly koi, the yellow-belly blue tang, the white black ghost and the platinum arowana are each rare or rarer in the shop', () => {
    for (const [id, trait] of [['clown_loach', 'borneo'], ['koi', 'butterfly'], ['blue_tang', 'yellow_belly'], ['black_ghost_knifefish', 'white'], ['silver_arowana', 'platinum']] as const) {
      const cat = morphCatalog(findSpecies(id)!);
      const withTrait = cat.entries.filter((e) => e.traitIds.includes(trait));
      expect(withTrait.length, `${id}: ${trait}`).toBeGreaterThan(0);
      const share = withTrait.reduce((a, e) => a + e.frequency, 0);
      expect(tierRank(tierForShare(share)), `${id}: ${trait} ${(share * 100).toFixed(2)}%`).toBeGreaterThanOrEqual(tierRank('rare'));
    }
  });
});
