// @vitest-environment node
/**
 * chunk 15 (LAB-001, LAB-002, LAB-003; ADR-0051) — buildScenario: every species, water class and tank size builds into
 * a legal game; the same recipe and seed give the same world; a bad recipe still builds and names each problem by its
 * path; the patch can't reach a prototype; capture → build gives the same animals; the link encoding round-trips.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { buildScenario, captureRecipe, decodeRecipeParam, encodeRecipeParam, genesForMorph, morphNames, presetById, readLabAddress, validateRecipe, type ScenarioRecipe } from '@/dev/scenario';
import { savedPresets, savePreset, deletePreset, loadDraft, saveDraft, LAB_STORAGE_KEY } from '@/dev/scenario/store';
import { encodeRecord, decodeRecord } from '@/persistence';
import { stateHash } from '@/persistence/hash';
import { advanceWorld } from '@/sim/world';
import { forcePrismatic } from '@/sim/life';
import { forcedPrismaticPending } from '@/sim/life/rareVariants';
import { dayOf, hourOfDay } from '@/sim/time';
import { ALL_SPECIES, getSpecies } from '@/data/species';
import { TANK_TIERS } from '@/data/catalog/tanks';

/** A cherry shrimp allele that isn't the commonest (so pinning it shows). */
const SHRIMP_LINE = getSpecies('cherry_shrimp').genetics.loci.find((l) => l.id === 'line')!.alleles.at(-1)!.id;
const R = (r: Omit<ScenarioRecipe, 'version'> & { version?: number }): ScenarioRecipe => ({ version: 1, ...r });
const alive = (g: GameState, tankId?: string) => Object.values(g.creatures).filter((c) => (c.status === 'alive' || c.status === 'listed') && (!tankId || c.tankId === tankId));
const legal = (g: GameState) => {
  const d = decodeRecord(encodeRecord(g, 'auto').text);
  return { repairs: d.repairs, nonFinite: findNonFinite(g), same: stateHash(d.state) === stateHash(g) };
};
const errors = (b: { issues: { level: string; at: string; message: string }[] }) => b.issues.filter((i) => i.level === 'error');

afterEach(() => {
  for (const k of ['polluted', 'x']) delete (Object.prototype as Record<string, unknown>)[k];
});

describe('LAB-003: every species, water class and tank size makes a legal game', () => {
  it.each(ALL_SPECIES.map((s) => s.id))('%s', (id) => {
    const sp = getSpecies(id);
    const b = buildScenario(R({ name: id, tanks: [{ name: 'T', water: sp.waterClasses[0], animals: [{ species: id, count: 2, sex: 'pair' }] }] }));
    expect(errors(b)).toEqual([]);
    expect(b.issues.filter((i) => i.at === 'save')).toEqual([]); // nothing the save had to write as 0
    expect(b.repairs).toEqual([]);
    expect(alive(b.state).map((c) => c.speciesId)).toEqual([id, id]);
    expect(legal(b.state)).toEqual({ repairs: [], nonFinite: [], same: true });
    expect(() => advanceWorld(b.state, 6, {})).not.toThrow();
    expect(findNonFinite(b.state)).toEqual([]);
  });

  it('every water class at every tank size', () => {
    const classes = ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted', 'marine_fowlr', 'marine_live_rock', 'reef', 'brackish'] as const;
    const b = buildScenario(R({ name: 'Sizes', shop: { facility: 'grand_hall' }, tanks: TANK_TIERS.map((t, i) => ({ name: `${t.id}`, size: t.id, water: classes[i % classes.length] })) }));
    expect(errors(b)).toEqual([]);
    expect(b.state.tankOrder.map((id) => b.state.tanks[id].tierId)).toEqual(TANK_TIERS.map((t) => t.id));
    expect(legal(b.state)).toEqual({ repairs: [], nonFinite: [], same: true });
  });
});

describe('LAB-002: the same recipe and seed give the same world', () => {
  const recipe = R({ name: 'Det', seed: 77, tanks: [{ name: 'A', animals: [{ species: 'fancy_guppy', count: 6, sex: 'mixed' }, { species: 'neon_tetra', count: 8 }] }], market: { offers: [{ species: 'betta', prismatic: true }] } });
  it('twice the same stateHash; another seed another world', () => {
    const a = buildScenario(recipe);
    const b = buildScenario(structuredClone(recipe));
    expect(stateHash(a.state)).toBe(stateHash(b.state));
    expect(stateHash(buildScenario({ ...recipe, seed: 78 }).state)).not.toBe(stateHash(a.state));
  });

  it('a Prismatic forced from the dev panel neither lands in the build nor is used up by it', () => {
    // no Prismatic of its own (its own would reset the count): the base's shop stock is what a pending force would hit
    const ordinary = R({ name: 'Ordinary', base: 'starter:betta', tanks: [{ name: 'A', animals: [{ species: 'neon_tetra', count: 4 }] }] });
    const plain = stateHash(buildScenario(ordinary).state);
    forcePrismatic('shop', 2);
    try {
      const forced = buildScenario(ordinary).state;
      expect(forced.market.stock.flatMap((o) => o.creatures).some((c) => c.rareVariant)).toBe(false);
      expect(stateHash(forced)).toBe(plain);
      expect(forcedPrismaticPending('shop')).toBe(2);
    } finally {
      forcePrismatic('shop', 0);
    }
  });

  it('leaves no Prismatic forced for the game afterwards', () => {
    const b = buildScenario(recipe);
    for (let h = 0; h < 48; h++) advanceWorld(b.state, 1, {});
    // a forced Prismatic would have gone to the next animal the shop stocked
    expect(b.state.market.stock.flatMap((o) => o.creatures).filter((c) => c.rareVariant).length).toBeLessThanOrEqual(1);
  });
});

describe('LAB-001: what a recipe sets', () => {
  it('the shop: money, the clock, the facility, unlocks, research, reputation, the guide, food and rooms', () => {
    const b = buildScenario(R({ name: 'Shop', shop: { money: 1234, day: 12, hour: 15.5, facility: 'aquarium_store', reputation: 300, unlocks: ['tank_75'], research: ['marine_systems'], researching: { id: 'reef_systems', hoursDone: 10 }, guide: 'done', inventory: { foods: { flake_tropical: 40 }, salt: 12 }, waterRoom: true, manualMode: true } }));
    const g = b.state;
    expect(errors(b)).toEqual([]);
    expect(g.finance.money).toBe(1234);
    expect(dayOf(g.clock.hour)).toBe(12);
    expect(hourOfDay(g.clock.hour)).toBe(15.5);
    expect(g.facility.level).toBe('aquarium_store');
    expect(g.facility.openToPublic).toBe(true);
    expect(g.progress.reputation).toBe(300);
    expect(g.progress.research.completed).toEqual(expect.arrayContaining(['marine_systems', 'central_water_supply']));
    expect(g.progress.unlocked).toEqual(expect.arrayContaining(['tank_75', 'marine_basics', 'water_room']));
    expect(g.progress.research).toMatchObject({ activeId: 'reef_systems', progressHours: 10 });
    expect(g.inventory.foods.flake_tropical).toBe(40);
    expect(g.inventory.salt).toBe(12);
    expect(g.facility.water).toBeDefined();
    expect(g.automation?.hold).toBeDefined();
  });

  it('a blank shop is an unlocked sandbox: everything unlocked and researched, the guide done, money and food', () => {
    const g = buildScenario(R({ name: 'Blank' })).state;
    expect(g.progress.tutorial.done).toBe(true);
    expect(g.progress.research.completed.length).toBeGreaterThanOrEqual(23);
    expect(g.finance.money).toBe(50_000);
    expect(g.inventory.foods.flake_tropical).toBeGreaterThanOrEqual(200);
    expect(g.tankOrder).toEqual([]);
    expect(alive(g)).toEqual([]);
    expect(g.log).toEqual([]);
  });

  it('a tank: size by gallons, its water, age, water values, equipment broken, removed and added, lights, decor', () => {
    const b = buildScenario(
      R({
        name: 'Tank',
        tanks: [
          {
            name: 'Lab Tank',
            size: 50,
            water: 'freshwater_tropical',
            ageDays: 12,
            values: { ammonia: 0.8, tempC: 29, pH: 6.6 },
            equipment: [{ id: 'heater', failed: 'stuck_on' }, { id: 'filter', failed: 'off' }, 'autofeeder', { id: 'lid', remove: true }],
            lights: { preset: 'sunset', intensity: 0.5, on: 9, off: 18 },
            decor: ['auto', 'java_fern', { id: 'stone_cave', x: 0.05, z: 0.02 }],
            substrate: 'fine_sand',
            backdrop: 'frosted',
            purpose: 'quarantine',
          },
        ],
      }),
    );
    expect(errors(b)).toEqual([]);
    const t = b.state.tanks[b.tanks['Lab Tank']];
    expect(t.tierId).toBe('g55');
    expect(t.createdHour).toBe(b.state.clock.hour - 12 * 24);
    expect(t.water).toMatchObject({ ammonia: 0.8, tempC: 29, pH: 6.6 });
    expect(t.equipment.find((e) => e.defId.startsWith('heater'))).toMatchObject({ failed: true, failMode: 'stuck_on' });
    expect(t.equipment.find((e) => e.defId.startsWith('filter'))).toMatchObject({ failed: true, failMode: 'off' });
    expect(t.equipment.some((e) => e.defId === 'autofeeder')).toBe(true);
    expect(t.equipment.some((e) => e.defId === 'lid_glass')).toBe(false);
    expect(t.lighting).toMatchObject({ preset: 'sunset', intensity: 0.5, onHour: 9, offHour: 18 });
    expect(t.decor.some((d) => d.defId === 'java_fern')).toBe(true);
    expect(t.decor.some((d) => d.defId === 'stone_cave')).toBe(true);
    expect(t.substrate.kind).toBe('fine_sand');
    expect(t).toMatchObject({ backdrop: 'frosted', purpose: 'quarantine' });
    expect(legal(b.state)).toEqual({ repairs: [], nonFinite: [], same: true });
  });

  it('animals: names, sex, age, a morph by name, pinned genes, potentials, Prismatic, condition, illness, injury', () => {
    const b = buildScenario(
      R({
        name: 'Animals',
        tanks: [
          {
            name: 'A',
            water: 'freshwater_planted',
            animals: [
              { species: 'betta', sex: 'male', name: 'Sapphire', morph: 'Royal Blue Halfmoon', potentials: { color: 95 }, prismatic: true, stats: { hunger: 90, health: 40 }, illness: { kind: 'fin_rot', severity: 55 }, injury: 30, ageDays: 40 },
              { species: 'cherry_shrimp', count: 5, genes: { line: [SHRIMP_LINE, SHRIMP_LINE] }, stage: 'juvenile' },
            ],
          },
        ],
      }),
    );
    expect(errors(b)).toEqual([]);
    const s = b.state.creatures[b.animals.Sapphire];
    expect(s).toMatchObject({ sex: 'male', morphName: 'Royal Blue Halfmoon', illness: { kind: 'fin_rot', severity: 55 } });
    expect(s.genome.potentials.color).toBe(95);
    expect(s.rareVariant?.kind).toBe('prismatic');
    expect(s.stats).toMatchObject({ hunger: 90, health: 40 });
    expect(s.life?.injury).toBe(30);
    expect(Math.round((b.state.clock.hour - s.bornHour) / 24)).toBe(40);
    const shrimp = alive(b.state).filter((c) => c.speciesId === 'cherry_shrimp');
    expect(shrimp).toHaveLength(5);
    expect(shrimp.every((c) => c.lifeStage === 'juvenile' && c.genome.alleles.line?.join() === `${SHRIMP_LINE},${SHRIMP_LINE}`)).toBe(true);
    expect(legal(b.state)).toEqual({ repairs: [], nonFinite: [], same: true });
  });

  it('a morph by name is one the genetics really make (most morphs of every species)', () => {
    let found = 0;
    let all = 0;
    for (const sp of ALL_SPECIES) {
      for (const n of morphNames(sp)) {
        all++;
        if (genesForMorph(sp, n)) found++;
      }
    }
    expect(found / all).toBeGreaterThan(0.95);
    expect(genesForMorph(getSpecies('betta'), 'royal blue  HALFMOON')).not.toBeNull(); // case and spacing ignored
    expect(genesForMorph(getSpecies('betta'), 'Purple Dragon')).toBeNull();
  });

  it('breeding: a pair ready to spawn, eggs and fry, a production line, staff, a listing with bids, a show entry', () => {
    const b = buildScenario(
      R({
        name: 'Business',
        shop: { facility: 'specialty_shop' },
        tanks: [
          { name: 'Breed', size: 'g10', water: 'freshwater_planted', animals: [{ species: 'betta', count: 2, sex: 'pair', names: ['Mom', 'Dad'] }] },
          { name: 'Raise', size: 'g20L', water: 'freshwater_planted', purpose: 'nursery', young: [{ species: 'fancy_guppy', stage: 'fry', count: 12 }, { species: 'panda_corydoras', stage: 'eggs', count: 30 }] },
          { name: 'Quarantine', size: 'g10', water: 'freshwater_planted', purpose: 'quarantine' },
          { name: 'Keep', size: 'g40B', water: 'freshwater_planted', animals: [{ species: 'betta', count: 2, sex: 'pair', names: ['Ruby', 'Onyx'], breed: 'ready' }, { species: 'fancy_guppy', count: 3, names: ['A1', 'A2', 'A3'] }] },
        ],
        lines: [{ mother: 'Mom', father: 'Dad', breed: 'Breed', raise: 'Raise', quarantine: 'Quarantine', keep: 'Keep', name: 'Blue line' }],
        staff: [{ role: 'aquarist', skill: 4, trait: 'meticulous', name: 'Pat' }],
        market: { listings: [{ animals: ['A1'], bids: 2 }] },
      }),
    );
    expect(errors(b)).toEqual([]);
    const g = b.state;
    expect(g.creatures[b.animals.Ruby].repro.partnerId).toBe(b.animals.Onyx);
    expect(Object.values(g.clutches).map((c) => [c.speciesId, c.stage, c.count]).sort()).toEqual([
      ['fancy_guppy', 'fry', 12],
      ['panda_corydoras', 'eggs', 30],
    ]);
    expect(g.production?.lines.map((l) => l.name)).toEqual(['Blue line']);
    expect(g.staff?.roster.map((m) => [m.name, m.role, m.skill, m.trait])).toEqual([['Pat', 'aquarist', 4, 'meticulous']]);
    expect(g.market.listings[0].bids.filter((x) => x.status === 'open')).toHaveLength(2);
    expect(legal(g)).toEqual({ repairs: [], nonFinite: [], same: true });
  });

  it('a starter, a fixture or the game on screen as the base', () => {
    const starter = buildScenario(R({ name: 'S', base: 'starter:axolotl' }));
    expect(alive(starter.state).some((c) => c.isStarter && c.speciesId === 'axolotl')).toBe(true);
    expect(starter.state.progress.tutorial.done).toBe(false);
    const fx = buildScenario(R({ name: 'F', base: 'fixture:marine_reef', shop: { money: 777 } }), { fixtures: FIXTURES });
    expect(errors(fx)).toEqual([]);
    expect(fx.state.finance.money).toBe(777);
    expect(fx.state.isShowcase).toBe(false);
    const cur = buildScenario(R({ name: 'C', base: 'current', tanks: [{ name: 'Added', animals: [{ species: 'neon_tetra', count: 3 }] }] }), { current: starter.state });
    expect(cur.state.tankOrder).toHaveLength(starter.state.tankOrder.length + 1);
    expect(cur.state.saveId).not.toBe(starter.state.saveId);
    expect(legal(cur.state).repairs).toEqual([]);
  });

  it('a warm-up runs the world forward before it opens; it opens on the named tank and view at the speed asked', () => {
    const b = buildScenario(R({ name: 'W', warmupHours: 30, tanks: [{ name: 'One' }, { name: 'Two' }], open: { tank: 'Two', view: 'facility', speed: 3 } }));
    expect(b.hoursRun).toBe(30);
    expect(b.state.clock.hour).toBe(9 + 30);
    expect(b.focusTankId).toBe(b.tanks.Two);
    expect(b.view).toBe('facility');
    expect(b.state.clock.speed).toBe(3);
  });
});

describe('LAB-002: a bad recipe still builds and says what it skipped', () => {
  it('names each problem by its path', () => {
    const b = buildScenario({
      version: 1,
      name: 'Bad',
      base: 'starter:shark',
      tanks: [{ name: 'X', size: 'g3', water: 'lava', animals: [{ species: 'shark' }, { species: 'betta', morph: 'Purple Dragon', sex: 'robot', illness: { kind: 'flu' }, genes: { nope: ['a', 'b'] } }], equipment: ['laser', { id: 'filter', failed: 'stuck_on' }], values: { ammonia: 99, fizz: 1 }, young: [{ species: 'fancy_guppy', stage: 'eggs', count: 5 }] }],
      staff: [{ role: 'janitor' }, { role: 'stock_manager' }, { role: 'stock_manager' }],
      market: { listings: [{ animals: ['Nobody'] }] },
      shows: { entries: [{ animal: 'Nobody' }] },
      open: { tank: 'Nope', speed: 7 },
    });
    const at = errors(b).map((i) => i.at);
    for (const p of ['base', 'tanks[0].water', 'tanks[0].size', 'tanks[0].animals[0].species', 'tanks[0].animals[1].morph', 'tanks[0].animals[1].sex', 'tanks[0].animals[1].illness', 'tanks[0].animals[1].genes.nope', 'tanks[0].equipment[0]', 'tanks[0].equipment[1].failed', 'tanks[0].values.fizz', 'tanks[0].young[0].stage', 'staff[0].role', 'staff[2].role', 'market.listings[0].animals', 'shows.entries[0].animal', 'open.tank', 'open.speed']) expect(at, p).toContain(p);
    expect(b.issues.find((i) => i.at === 'tanks[0].values.ammonia')).toMatchObject({ level: 'warning' });
    // what it could build, it built: the tank and the betta, legal
    expect(Object.keys(b.tanks)).toEqual(['X']);
    expect(alive(b.state).map((c) => c.speciesId)).toEqual(['betta']);
    expect(b.repairs).toEqual([]);
  });

  it('not a recipe at all: a blank shop and one error', () => {
    for (const bad of ['hello', null, [], { name: 'No version' }, { version: 2, name: 'Future' }, { version: 1 }]) {
      const b = buildScenario(bad);
      expect(errors(b).map((i) => i.at)).toEqual(['recipe']);
      expect(b.state.tankOrder).toEqual([]);
    }
  });

  it('a fixture base without the fixtures, and the game on screen without one, fall back to a blank shop', () => {
    expect(errors(buildScenario(R({ name: 'F', base: 'fixture:marine_reef' }))).map((i) => i.at)).toEqual(['base']);
    expect(errors(buildScenario(R({ name: 'C', base: 'current' }))).map((i) => i.at)).toEqual(['base']);
  });

  it('the patch reaches anything, but never a prototype; what it breaks the save path repairs and reports', () => {
    const recipe = JSON.parse('{"version":1,"name":"P","patch":{"progress":{"reputation":321},"__proto__":{"polluted":1},"market":{"constructor":{"x":1}}}}') as ScenarioRecipe;
    const b = buildScenario(recipe);
    expect(b.state.progress.reputation).toBe(321);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(errors(b).map((i) => i.message)).toEqual(expect.arrayContaining([expect.stringContaining('__proto__'), expect.stringContaining('constructor')]));
    const broken = buildScenario(R({ name: 'Broken', patch: { clock: { hour: -5 } } }));
    expect(broken.issues.some((i) => i.at === 'patch' && i.level === 'warning' && i.message.includes('repaired'))).toBe(true);
    expect(broken.repairs).toEqual([]); // the world returned is the repaired one
    expect(broken.state.clock.hour).toBeGreaterThanOrEqual(0);
  });

  it('validateRecipe warns about a bad pairing with the game’s own verdict, and builds it anyway', () => {
    const v = validateRecipe(presetById('crowded-aggressive')!.recipe);
    expect(v.tanks[0]).toMatchObject({ name: 'Brawl Tank', verdict: 'incompatible' });
    expect(v.issues.some((i) => i.level === 'warning' && i.at === 'Brawl Tank')).toBe(true);
    expect(v.counts).toMatchObject({ tanks: 1, animals: 24 });
    // a trial build never runs forward: no eggs were waited for
    expect(validateRecipe(presetById('clownfish-eggs')!.recipe).issues.some((i) => i.message.startsWith('Ran '))).toBe(false);
  });
});

describe('LAB-001: capture, links and the browser store', () => {
  it('capture → build gives the same tanks, animals, morphs, Prismatic and young, legally', () => {
    for (const id of ['prismatic-reef', 'fry-tank', 'heater-stuck', 'staffed-store', 'grand-hall', 'clownfish-eggs']) {
      const a = buildScenario(presetById(id)!.recipe).state;
      const cap = captureRecipe(a, 'Captured');
      const b = buildScenario(JSON.parse(JSON.stringify(cap)));
      expect(b.issues.filter((i) => i.level !== 'note'), id).toEqual([]);
      const view = (g: GameState) =>
        g.tankOrder.map((t) => [
          g.tanks[t].name,
          g.tanks[t].tierId,
          alive(g, t).map((c) => `${c.name}:${c.speciesId}:${c.morphName}:${c.sex}:${c.reproRole}:${!!c.rareVariant}`).sort(),
          Object.values(g.clutches).filter((cl) => cl.tankId === t).map((cl) => `${cl.speciesId}:${cl.stage}:${cl.count}`),
          g.tanks[t].equipment.map((e) => `${e.defId}:${e.failMode ?? 'ok'}`).sort(),
        ]);
      expect(view(b.state), id).toEqual(view(a));
      expect(b.state.tankOrder.map((t) => b.state.tanks[t].water.ammonia)).toEqual(a.tankOrder.map((t) => Math.round(a.tanks[t].water.ammonia * 1e4) / 1e4));
      expect(b.state.staff?.roster.length ?? 0).toBe(a.staff?.roster.length ?? 0);
      expect(b.repairs).toEqual([]);
    }
  });

  it('a recipe in the address round-trips, unicode included', () => {
    const text = JSON.stringify(R({ name: 'Café ⛵ 🐠', notes: 'ü' }));
    const p = encodeRecipeParam(text);
    expect(p).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeRecipeParam(p)).toBe(text);
    expect(decodeRecipeParam('%%%')).toBeNull();
    expect(readLabAddress(`?lab=1&recipe=${p}`)).toEqual({ lab: true, preset: null, recipe: text });
    expect(readLabAddress('?scenario=show-day')).toEqual({ lab: false, preset: 'show-day', recipe: null });
  });

  it('kept presets live in this browser’s storage, apart from the saves', () => {
    const mem = new Map<string, string>();
    const g = globalThis as { localStorage?: unknown };
    const before = g.localStorage;
    g.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    try {
      expect(savedPresets()).toEqual([]);
      expect(savePreset(R({ name: 'Zed' }))).toBe(true);
      expect(savePreset(R({ name: 'Alpha', notes: 'one' }))).toBe(true);
      expect(savePreset(R({ name: 'Alpha', notes: 'two' }))).toBe(true);
      expect(savedPresets().map((r) => [r.name, r.notes])).toEqual([['Alpha', 'two'], ['Zed', undefined]]);
      expect(deletePreset('Zed')).toBe(true);
      expect(deletePreset('constructor')).toBe(false);
      saveDraft(R({ name: 'Draft' }));
      expect(loadDraft()?.name).toBe('Draft');
      expect([...mem.keys()]).toEqual([LAB_STORAGE_KEY]);
      mem.set(LAB_STORAGE_KEY, '{broken');
      expect(savedPresets()).toEqual([]);
    } finally {
      g.localStorage = before;
    }
  });
});

describe('LAB-002: the fresh review\u2019s notes', () => {
  it('a number the game can\u2019t keep is reported, not quietly written as 0', () => {
    const b = buildScenario(R({ name: 'Inf', patch: { finance: { money: Infinity }, progress: { reputation: NaN } } }));
    const said = b.issues.filter((i) => i.at === 'patch').map((i) => i.message);
    expect(said).toEqual(expect.arrayContaining([expect.stringContaining('patch.finance.money'), expect.stringContaining('patch.progress.reputation')]));
    expect(b.state.finance.money).toBe(0);
  });

  it('unlocks "none" on a blank shop: research doesn\u2019t unlock everything again', () => {
    const g = buildScenario(R({ name: 'None', shop: { unlocks: 'none' } })).state;
    expect(g.progress.unlocked).not.toContain('reef');
    expect(g.progress.unlocked.length).toBeLessThan(10);
    expect(g.progress.research.completed).toEqual([]);
  });

  it('names like "constructor" are just names; an illness of that name is refused', () => {
    const b = buildScenario(
      R({
        name: 'Proto',
        shop: { facility: 'specialty_shop' },
        tanks: [{ name: 'constructor', animals: [{ species: 'betta', sex: 'male', name: 'toString' }, { species: 'neon_tetra', illness: { kind: 'constructor' } }] }],
        market: { listings: [{ animals: ['toString'], bids: 1 }] },
        open: { tank: 'valueOf' },
      }),
    );
    expect(errors(b).map((i) => i.at).sort()).toEqual(['open.tank', 'tanks[0].animals[1].illness']);
    expect(b.tanks.constructor).toBe(b.state.tankOrder[0]);
    expect(b.state.market.listings).toHaveLength(1);
    expect(b.issues.some((i) => i.message.includes('Two animals'))).toBe(false);
    expect(() => advanceWorld(b.state, 2, {})).not.toThrow();
  });

  it('a patch never makes the build throw: the save path repairs it (and says so), or it is refused', () => {
    for (const patch of [{ clock: null }, { tankOrder: null }, { creatures: null }, { progress: null }, { tanks: 'none' }, { facility: null }]) {
      const recipe = R({ name: 'P', tanks: [{ name: 'T', animals: [{ species: 'neon_tetra', count: 2 }] }], patch: patch as Record<string, unknown> });
      let b: ReturnType<typeof buildScenario> | undefined;
      expect(() => (b = buildScenario(recipe)), JSON.stringify(patch)).not.toThrow();
      expect(b!.repairs, JSON.stringify(patch)).toEqual([]); // the world it returns is already what the save path loads
      expect(() => advanceWorld(b!.state, 1, {}), JSON.stringify(patch)).not.toThrow();
    }
    // one the save path loads but the game can't play (its first step would throw) is built without the patches:
    // the game's own, a tank's or an animal's
    const crashers: ScenarioRecipe[] = [
      R({ name: 'Crash', shop: { facility: 'specialty_shop' }, tanks: [{ name: 'T' }], patch: { visitors: { live: 5 } } }),
      R({ name: 'Crash', shop: { facility: 'specialty_shop' }, tanks: [{ name: 'T' }], patch: { facility: { fixtures: 'none' } } }),
      R({ name: 'Crash', tanks: [{ name: 'T', patch: { water: { lab: 5 } }, animals: [{ species: 'neon_tetra' }] }] }),
      R({ name: 'Crash', tanks: [{ name: 'T', animals: [{ species: 'neon_tetra', patch: { life: 7 } }] }] }),
      R({ name: 'Crash', tanks: [{ name: 'T', patch: { tierId: 'nope' } }] }), // the build itself can't finish it
    ];
    for (const recipe of crashers) {
      const b = buildScenario(recipe);
      expect(errors(b).map((i) => i.at), JSON.stringify(recipe)).toEqual(['patch']);
      expect(() => advanceWorld(b.state, 1, { forceFull: true })).not.toThrow();
      expect(b.state.tankOrder).toHaveLength(1);
    }
    // a clock taken away comes back as the save path's
    expect(buildScenario(R({ name: 'C', patch: { clock: null } })).state.clock).toMatchObject({ hour: expect.any(Number), speed: 0 });
  });

  it('out-of-range values are kept in range and said so', () => {
    const b = buildScenario(
      R({
        name: 'Ranges',
        shop: { day: 1e15, money: 1e307 },
        tanks: [{ name: 'T', size: 'g20L', decor: [{ id: 'stone_cave', x: 1e9, z: -1e9, scale: -3, exact: true }] }],
        market: { offers: [{ species: 'betta', ageDays: -50 }, { species: 'betta', genes: { nope: ['a', 'b'] } }] },
      }),
    );
    expect(dayOf(b.state.clock.hour)).toBeLessThanOrEqual(36_500);
    expect(b.state.finance.money).toBe(1e12);
    expect(b.issues.map((i) => i.at)).toEqual(expect.arrayContaining(['shop.day', 'shop.money', 'market.offers[1].genes.nope']));
    const d = b.state.tanks[b.tanks.T].decor[0];
    expect(Math.abs(d.x)).toBeLessThan(0.5);
    expect(d.scale).toBeGreaterThan(0);
    expect(b.state.market.stock[0].creatures[0].bornHour).toBeLessThanOrEqual(b.state.clock.hour);
    const before = b.state.clock.hour;
    advanceWorld(b.state, 1, {});
    expect(b.state.clock.hour).toBeGreaterThan(before); // the clock still runs
  });

  it('two pieces of the same equipment stay two; a kit piece is changed before another is added', () => {
    const b = buildScenario(R({ name: 'Eq', tanks: [{ name: 'A', size: 'g125', bareEquipment: true, equipment: [{ id: 'heater_300w', condition: 0.5 }, { id: 'heater_300w', condition: 0.4 }] }, { name: 'B', size: 'g29', equipment: [{ id: 'heater', failed: 'off' }, { id: 'heater', condition: 0.3 }] }] }));
    expect(b.state.tanks[b.tanks.A].equipment.map((e) => [e.defId, e.condition])).toEqual([
      ['heater_300w', 0.5],
      ['heater_300w', 0.4],
    ]);
    const heaters = b.state.tanks[b.tanks.B].equipment.filter((e) => e.defId.startsWith('heater'));
    expect(heaters).toHaveLength(2);
    expect(heaters[0]).toMatchObject({ failed: true, failMode: 'off' });
  });

  it('a named sex holds for a sex-changing species: a bonded clownfish pair', () => {
    const b = buildScenario(R({ name: 'Clowns', tanks: [{ name: 'C', water: 'reef', animals: [{ species: 'ocellaris_clownfish', count: 2, sex: 'pair' }] }] }));
    expect(alive(b.state).map((c) => `${c.sex}/${c.reproRole}`)).toEqual(['male/male', 'female/female']);
  });

  it('stage, demand, an offer\u2019s price and the first step\u2019s water: what the recipe says', () => {
    const b = buildScenario(R({ name: 'Misc', tanks: [{ name: 'T', water: 'freshwater_cool', values: { tempC: 26 }, animals: [{ species: 'axolotl', stage: 'elder' }] }], market: { demand: { axolotl: 1.5 }, offers: [{ species: 'axolotl', price: 777 }] } }));
    expect(alive(b.state)[0].lifeStage).toBe('elder');
    expect(b.state.market.demand.axolotl).toBe(1.5);
    expect(b.state.market.stock[0].price).toBe(777);
    // set water is how the water is: no sudden swing the animals feel on the first step
    expect(b.state.tanks[b.tanks.T].water.lab).toMatchObject({ prevTemp: 26, bioTempC: 26 });
  });
});

describe('LAB-002: the confirmation pass\u2019s findings', () => {
  it('the lab\u2019s checking never changes the game on screen (a trial build steps no world)', () => {
    const recipe = R({ name: 'Patched', tanks: [{ name: 'T', patch: { notes: 'x' }, animals: [{ species: 'neon_tetra', count: 4, patch: { favorite: true } }] }], patch: { progress: { reputation: 5 } } });
    // a tank in view (full detail, so the sim's shared caches are in use), two game days, the lab checking every 6 h
    const play = (withLab: boolean) => {
      const g = buildScenario(presetById('staffed-store')!.recipe).state;
      for (let h = 0; h < 48; h++) {
        advanceWorld(g, 1, { focusTankId: g.tankOrder[0] });
        if (withLab && h % 6 === 0) validateRecipe(recipe, { current: g });
      }
      return stateHash(g);
    };
    expect(play(true)).toBe(play(false));
  });

  it('a number in "the game on screen" the save would write as 0 is reported', () => {
    const current = buildScenario(R({ name: 'Base', tanks: [{ name: 'T' }] })).state;
    current.tanks[current.tankOrder[0]].water.nitrate = NaN;
    const b = buildScenario(R({ name: 'On it', base: 'current' }), { current });
    expect(b.issues).toContainEqual(expect.objectContaining({ level: 'warning', at: 'save', message: expect.stringContaining('water.nitrate') }));
  });

  it('an exact piece of equipment says when its failure can\u2019t be', () => {
    const b = buildScenario(R({ name: 'Eq', tanks: [{ name: 'T', bareEquipment: true, equipment: [{ id: 'filter_hob_small', failed: 'stuck_on', exact: true }, { id: 'heater_100w', failed: 'stuck_on', exact: true }] }] }));
    expect(errors(b).map((i) => i.at)).toEqual(['tanks[0].equipment[0].failed']);
    expect(b.state.tanks[b.tanks.T].equipment.find((e) => e.defId === 'heater_100w')).toMatchObject({ failed: true, failMode: 'stuck_on' });
  });
});
