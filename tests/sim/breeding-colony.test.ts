/**
 * Breeding lane — colony species and robustness: livebearers never run away over 60 days, cherry shrimp colonies
 * grow but are bounded (and fish eat shrimplets), mouthbrooders and snails complete their loops, and every species in
 * the roster can be stepped/checked without errors or NaN.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Creature, FoodTag, GameState, Sex, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { breedingCheck, breedingStatus, clutchStatus, noteBreedingFood } from '@/sim/life/breeding';
import { devForceBreeding, moveClutch } from '@/sim/life/breeding/actions';

// Long compressed-time runs; the shared build machine can be heavily loaded.
vi.setConfig({ testTimeout: 240_000 });

const hab = vi.hoisted(() => ({ cover: 0.6, nestSites: 2, hides: 3 }));
vi.mock('@/sim/aquascape', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/sim/aquascape')>();
  return {
    ...mod,
    tankHabitat: (s: Parameters<typeof mod.tankHabitat>[0], t: Parameters<typeof mod.tankHabitat>[1]) => {
      const h = mod.tankHabitat(s, t);
      return { ...h, cover: Math.max(h.cover, hab.cover), nestSites: Math.max(h.nestSites, hab.nestSites), hides: Math.max(h.hides, hab.hides) };
    },
  };
});

const ALL_FOODS: FoodTag[] = ['flake', 'pellet_small', 'pellet_sinking', 'bloodworm', 'brine_shrimp', 'mysis', 'daphnia', 'earthworm', 'snail_live', 'algae_wafer', 'vegetable', 'nori', 'copepod_live', 'infusoria', 'baby_brine'];

function keeper(state: GameState, feed: FoodTag[], temps: Record<string, number> = {}): void {
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 15);
    c.stats.health = Math.max(c.stats.health, 85);
    c.stats.comfort = Math.max(c.stats.comfort, 70);
  }
  for (const t of Object.values(state.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    t.water.nitrate = Math.min(t.water.nitrate, 20);
    t.water.oxygen = Math.max(t.water.oxygen, 0.9);
    for (const eq of t.equipment) {
      eq.failed = false; // a diligent keeper repairs failed equipment
      eq.condition = Math.max(eq.condition, 0.9);
    }
    if (temps[t.id] !== undefined) t.water.tempC = temps[t.id];
    if (feed.length) noteBreedingFood(state, t.id, feed);
  }
}

function run(state: GameState, hours: number, feed: FoodTag[], temps: Record<string, number> = {}, until?: () => boolean, chunk = 3, forceFull = true): void {
  let t = 0;
  while (t < hours) {
    if (until?.()) return;
    keeper(state, feed, temps);
    const h = Math.min(chunk, hours - t);
    // forceFull=false: every tank runs at 'reduced' LOD (≥1 h chunks), exercising large-dt stepping.
    advanceWorld(state, h, { forceFull });
    t += h;
  }
}

function add(state: GameState, speciesId: string, tank: Tank, sex: Sex | undefined, ageDays: number, name: string): Creature {
  return addCreature(state, createCreature(state, simRng(state), speciesId, { sex, ageDays, name, captiveBred: true }), tank.id);
}

const alive = (state: GameState, speciesId: string, tankId?: string) =>
  Object.values(state.creatures).filter((c) => c.speciesId === speciesId && (c.status === 'alive' || c.status === 'listed') && (!tankId || c.tankId === tankId));

describe('breeding: livebearers', () => {
  it('guppies breed readily but the population never runs away over 60 days', () => {
    if (!findSpecies('fancy_guppy')) return;
    const state = newGame({ starterId: 'betta', starterName: 'Solo', seed: 1111 });
    const tank = createTank(state, 'g20L', 'freshwater_tropical', { cycled: true, name: 'Guppy Tank' });
    for (let i = 0; i < 2; i++) add(state, 'fancy_guppy', tank, 'male', 14, `Male ${i}`);
    for (let i = 0; i < 4; i++) add(state, 'fancy_guppy', tank, 'female', 14, `Female ${i}`);
    const temps = { [tank.id]: 25 };
    let peak = 0;
    for (let day = 0; day < 60; day++) {
      run(state, 24, ['flake', 'infusoria'], temps, undefined, 6, false);
      peak = Math.max(peak, alive(state, 'fancy_guppy', tank.id).length);
    }
    const guppies = alive(state, 'fancy_guppy', tank.id);
    const born = Object.values(state.creatures).filter((c) => c.speciesId === 'fancy_guppy' && c.lineage.breederName === 'Your shop');
    expect(born.length).toBeGreaterThan(0); // they did breed
    expect(state.log.some((e) => /dropped [\d,]+ fry/.test(e.text))).toBe(true);
    // Bounded: never more than ~2× what 20 gallons can hold of adult guppies.
    const sp = findSpecies('fancy_guppy')!;
    const bound = Math.ceil((20 * 0.5) / sp.bioload) * 2;
    expect(peak).toBeLessThanOrEqual(bound);
    expect(guppies.length).toBeLessThanOrEqual(bound);
    expect(state.progress.counters.rehomed ?? 0).toBeGreaterThan(0);
    for (const c of Object.values(state.clutches)) {
      expect(Number.isFinite(c.count)).toBe(true);
      expect(Number.isFinite(c.survival)).toBe(true);
    }
  });

  it('a lone gravid female can still drop a bounded number of broods from stored sperm', () => {
    if (!findSpecies('fancy_guppy')) return;
    const state = newGame({ starterId: 'betta', starterName: 'Solo', seed: 1112 });
    const tank = createTank(state, 'g20L', 'freshwater_tropical', { cycled: true });
    const male = add(state, 'fancy_guppy', tank, 'male', 14, 'Blue');
    const female = add(state, 'fancy_guppy', tank, 'female', 14, 'Luna');
    expect(devForceBreeding(state, female.id).ok).toBe(true);
    const lonely = createTank(state, 'g20L', 'freshwater_tropical', { cycled: true });
    run(state, 3, ['flake'], { [tank.id]: 25, [lonely.id]: 25 });
    female.tankId = lonely.id; // moved away from the male
    run(state, 24 * 40, ['flake', 'infusoria'], { [tank.id]: 25, [lonely.id]: 25 }, undefined, 6, false);
    expect(female.repro.totalClutches).toBeGreaterThanOrEqual(2);
    expect(female.repro.totalClutches).toBeLessThanOrEqual(4); // 1 + stored broods (bounded)
    void male;
  });
});

describe('breeding: shrimp colonies', () => {
  function colony(seed: number, withPuffer: boolean) {
    const state = newGame({ starterId: 'betta', starterName: 'Solo', seed });
    const tank = createTank(state, 'g10', 'freshwater_planted', { cycled: true, name: 'Shrimp Tank' });
    tank.water.bioMaturity = Math.max(tank.water.bioMaturity, 0.8);
    for (let i = 0; i < 3; i++) add(state, 'cherry_shrimp', tank, 'male', 12, `Red ${i}`);
    for (let i = 0; i < 5; i++) add(state, 'cherry_shrimp', tank, 'female', 12, `Cherry ${i}`);
    if (withPuffer) add(state, 'pea_puffer', tank, 'male', 20, 'Hunter');
    return { state, tank };
  }

  it('females become berried, shrimplets hatch, the colony grows but stays bounded; fish eat the young', () => {
    if (!findSpecies('cherry_shrimp')) return;
    const safe = colony(1201, false);
    const risky = colony(1201, true);
    let berried = false;
    for (let d = 0; d < 30; d++) {
      run(safe.state, 24, ['algae_wafer', 'flake'], { [safe.tank.id]: 23 }, undefined, 6, false);
      run(risky.state, 24, ['algae_wafer', 'flake'], { [risky.tank.id]: 23 }, undefined, 6, false);
      berried ||= alive(safe.state, 'cherry_shrimp').some((c) => c.repro.stage === 'berried');
    }
    expect(berried).toBe(true);
    expect(safe.state.log.some((e) => /is berried/.test(e.text))).toBe(true);
    const bornSafe = Object.values(safe.state.creatures).filter((c) => c.speciesId === 'cherry_shrimp' && c.lineage.breederName === 'Your shop').length;
    const bornRisky = Object.values(risky.state.creatures).filter((c) => c.speciesId === 'cherry_shrimp' && c.lineage.breederName === 'Your shop').length;
    expect(bornSafe).toBeGreaterThan(0);
    expect(bornRisky).toBeLessThan(bornSafe);
    const sp = findSpecies('cherry_shrimp')!;
    expect(alive(safe.state, 'cherry_shrimp').length).toBeLessThanOrEqual(Math.ceil((10 * 0.5) / sp.bioload) * 2);
  });
});

describe('breeding: other systems complete', () => {
  it('Banggai cardinal: the male mouthbroods (stage brooding) then releases young', () => {
    if (!findSpecies('banggai_cardinalfish')) return;
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Solo', seed: 1301 });
    const tank = createTank(state, 'g40B', 'marine_live_rock', { cycled: true });
    const m = add(state, 'banggai_cardinalfish', tank, 'male', 25, 'Kauderni');
    const f = add(state, 'banggai_cardinalfish', tank, 'female', 25, 'Pearl');
    expect(devForceBreeding(state, f.id).ok).toBe(true);
    run(state, 12, ['mysis'], { [tank.id]: 26 }, () => m.repro.stage === 'brooding', 1);
    expect(m.repro.stage).toBe('brooding');
    const [cl] = Object.values(state.clutches);
    expect(cl.stage).toBe('in_pouch');
    expect(breedingStatus(state, m.id)?.label).toMatch(/Mouthbrooding/);
    run(state, 200, ['mysis', 'baby_brine', 'copepod_live'], { [tank.id]: 26 }, () => state.clutches[cl.id]?.stage === 'fry', 2);
    expect(state.clutches[cl.id]?.stage).toBe('fry');
    expect(m.repro.stage).toBe('resting');
  });

  it('mystery snail: needs a lid, then lays a pink clutch above the waterline that hatches', () => {
    if (!findSpecies('mystery_snail')) return;
    const state = newGame({ starterId: 'betta', starterName: 'Solo', seed: 1401 });
    const tank = createTank(state, 'g10', 'freshwater_tropical', { cycled: true });
    tank.equipment = tank.equipment.filter((e) => !e.defId.includes('lid'));
    const m = add(state, 'mystery_snail', tank, 'male', 20, 'Gary');
    const f = add(state, 'mystery_snail', tank, 'female', 20, 'Shelly');
    const chk = breedingCheck(state, m.id, f.id);
    expect(`${chk.reasons.join(' ')} ${chk.nextStep ?? ''}`).toMatch(/lid/i);
    tank.equipment.push({ id: 'eq_test_lid', defId: 'lid_glass', installedHour: 0, condition: 1, on: true });
    run(state, 24 * 4, ['algae_wafer'], { [tank.id]: 25 }, () => Object.keys(state.clutches).length > 0, 1);
    const [cl] = Object.values(state.clutches);
    expect(cl).toBeDefined();
    expect(cl.visual).toBe('snail_clutch');
    expect(cl.anchor!.y).toBeGreaterThan(0);
    run(state, 400, ['algae_wafer', 'vegetable'], { [tank.id]: 25 }, () => !state.clutches[cl.id]);
    expect(Object.values(state.creatures).some((c) => c.speciesId === 'mystery_snail' && c.lineage.motherId === f.id)).toBe(true);
  });

  it('marine shrimp larvae are explained as not yet rearable', () => {
    const sp = ALL_SPECIES.find((s) => s.breeding.system === 'shrimp_larval_marine');
    if (!sp) return;
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Solo', seed: 1501 });
    const tank = createTank(state, 'g40B', sp.waterClasses[0], { cycled: true });
    const a = add(state, sp.id, tank, 'male', sp.breeding.maturityDays + 5, 'A');
    const b = add(state, sp.id, tank, 'female', sp.breeding.maturityDays + 5, 'B');
    const chk = breedingCheck(state, a.id, b.id);
    expect(chk.ok).toBe(false);
    expect(chk.reasons.join(' ')).toMatch(/larval rearing/);
    run(state, 24 * 10, ALL_FOODS, { [tank.id]: (sp.tempC.idealMin + sp.tempC.idealMax) / 2 });
    // any hatch was explained and no juveniles were minted
    expect(Object.values(state.creatures).filter((c) => c.speciesId === sp.id && c.lineage.breederName === 'Your shop')).toHaveLength(0);
  });
});

describe('breeding: every species is robust', () => {
  it('check/status/force/step never throw or produce NaN for any species', () => {
    for (const sp of ALL_SPECIES) {
      if (sp.category === 'coral' || sp.category === 'anemone') continue;
      const starterId = sp.environment === 'marine' ? 'ocellaris_clownfish' : 'axolotl';
      const state = newGame({ starterId, starterName: 'Solo', seed: 2000 + sp.id.length });
      const tank = createTank(state, 'g125', sp.waterClasses[0], { cycled: true, name: `${sp.commonName} test` });
      const herm = sp.sexSystem === 'simultaneous_hermaphrodite' || sp.sexSystem === 'not_applicable';
      const age = sp.breeding.maturityDays + 4;
      const a = add(state, sp.id, tank, herm ? undefined : 'male', age, 'A');
      const b = add(state, sp.id, tank, herm ? undefined : 'female', age, 'B');
      expect(() => breedingCheck(state, a.id, b.id), sp.id).not.toThrow();
      expect(() => breedingStatus(state, a.id), sp.id).not.toThrow();
      const r = devForceBreeding(state, b.id);
      expect(typeof r.ok, sp.id).toBe('boolean');
      const temps = { [tank.id]: (sp.tempC.idealMin + sp.tempC.idealMax) / 2 };
      expect(() => run(state, 24 * 6, ALL_FOODS, temps, undefined, 6), sp.id).not.toThrow();
      for (const c of Object.values(state.clutches)) {
        expect(Number.isFinite(c.count), sp.id).toBe(true);
        expect(Number.isFinite(c.survival), sp.id).toBe(true);
        expect(Number.isFinite(c.nextStageHour), sp.id).toBe(true);
        expect(() => clutchStatus(state, c.id)).not.toThrow();
        const other = createTank(state, 'g40B', sp.waterClasses[0], { cycled: true });
        expect(() => moveClutch(state, c.id, other.id)).not.toThrow();
      }
      for (const c of Object.values(state.creatures)) {
        expect(Number.isFinite(c.stats.breedingReadiness), `${sp.id} readiness`).toBe(true);
        expect(Number.isFinite(c.repro.progress ?? 0), `${sp.id} progress`).toBe(true);
      }
    }
  });
});
