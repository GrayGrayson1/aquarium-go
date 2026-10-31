/**
 * lane:production (chunk 4) — production lines: 0.5 §11.3, DESIGN-S3D §8.6, §8.6.1 and §9.5, ADR-0025 and ADR-0030.
 * PROD-001 to PROD-021, AUTO-014's production part, AUTO-019 to AUTO-021, AUTO-024, AUTO-025.
 *
 * Most cases start the Raise stage from a free-swimming brood of the pair made with the breeding module's own
 * `createClutch` (as a spawn would), so they don't wait days for courtship; the brood then grows and is raised by the
 * breeding sim. The hold (PROD-010) is checked on real spawning, with medaka in a densely planted tank. Only src/sim,
 * src/data, src/types and src/persistence are imported.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Clutch, Creature, GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank, deleteTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { getSpecies } from '@/data/species';
import { createClutch } from '@/sim/life/breeding/clutch';
import { noteBreedingFood } from '@/sim/life/breeding';
import { forcePrismatic, isPrismatic } from '@/sim/life/rareVariants';
import { readinessTarget } from '@/sim/life/breeding/common';
import { devOpenMarket, acceptBid, forceBuyerVisit } from '@/sim/economy';
import { stateHash } from '@/persistence';
import { SCHEMA_VERSION } from '@/persistence/schema';
import {
  QUARANTINE_HOURS,
  addQuarantineTank,
  candidatePairs,
  createLine,
  endLine,
  findLine,
  lineShare,
  lineSlots,
  lineStatus,
  noteFoodSpend,
  pairTraits,
  setKeepRules,
  setLinePair,
  setLineRule,
  setLineRunning,
  setLineTank,
  tankFitFor,
  traitsOf,
  restartDay,
  quarantineReady,
  PAIRS_PER_SPECIES,
} from '@/sim/production';
import { lineView } from '@/sim/production/view';
import { createListing, withdrawListing } from '@/sim/economy/listings';
import { repairState } from '@/persistence/migrations';
import { getFoodDef } from '@/data/catalog/foods';
import { creatureValue } from '@/sim/economy/valuation';
import { readFileSync } from 'node:fs';
import { unlock } from '@/sim/facility';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

vi.setConfig({ testTimeout: 240_000 });

interface Farm {
  g: GameState;
  breed: Tank;
  raise: Tank;
  qt: Tank;
  keep: Tank;
  mother: Creature;
  father: Creature;
}

function tank(g: GameState, name: string, x: number, tier = 'g20L', waterClass: Tank['waterClass'] = 'freshwater_tropical'): Tank {
  const t = createTank(g, tier, waterClass, { cycled: true, placement: { x, z: 2, rotY: 0 }, name });
  t.water.tempC = 26;
  return t;
}

/** A shop with four empty tanks and an adult pair of `speciesId` (female in the keep tank for bettas). */
function farm(o: { seed?: number; speciesId?: string; level?: GameState['facility']['level'] } = {}): Farm {
  const g = newGame({ starterId: 'betta', starterName: 'Starter', seed: o.seed ?? 11 });
  g.isShowcase = false;
  devOpenMarket(g);
  for (const k of Object.keys(UNLOCK_KEYS)) unlock(g, k, { silent: true }); // every tank size and supply
  g.finance.money = 80000;
  g.facility.level = o.level ?? 'showroom';
  g.log = [];
  const speciesId = o.speciesId ?? 'betta';
  const breed = tank(g, 'Breed Tank', -6, 'g10');
  const raise = tank(g, 'Grow-out', -3, 'g40B');
  const qt = tank(g, 'Quarantine', 0, 'g40B');
  const keep = tank(g, 'Quiet Corner', 3, 'g20L');
  const rng = simRng(g);
  const father = addCreature(g, createCreature(g, rng, speciesId, { sex: 'male', ageDays: 40, name: 'Blaze' }), breed.id);
  const mother = addCreature(g, createCreature(g, rng, speciesId, { sex: 'female', ageDays: 40, name: 'Cinder' }), speciesId === 'betta' ? keep.id : breed.id);
  // dense plants and moss: cover for egg-scatterers and the betta's nest
  for (let i = 0; i < 6; i++) breed.decor.push({ id: `dc_plant${i}`, defId: i % 2 ? 'java_moss' : 'water_sprite', x: -0.15 + i * 0.06, y: 0, z: 0, rotY: 0, scale: 1.5, seed: i + 1, growth: 1 });
  return { g, breed, raise, qt, keep, mother, father };
}

function start(f: Farm, extra: Partial<Parameters<typeof createLine>[1]> = {}) {
  const r = createLine(f.g, { motherId: f.mother.id, fatherId: f.father.id, tanks: { breed: f.breed.id, raise: f.raise.id, quarantine: f.qt.id, keep: f.keep.id }, ...extra });
  expect(r.ok, r.message).toBe(true);
  return findLine(f.g, r.lineId!)!;
}

/** A brood of the pair in the breed tank, at `stage`, raised (minted) `hoursLeft` later — what a spawn makes. */
function brood(f: Farm, stage: Clutch['stage'], count = 20, hoursLeft = 30, motherId = f.mother.id, fatherId = f.father.id): Clutch {
  const g = f.g;
  const sp = getSpecies(g.creatures[motherId].speciesId);
  return createClutch(g, { sp, tank: f.breed, mother: g.creatures[motherId], father: g.creatures[fatherId], hour: g.clock.hour, stage, count, visual: stage === 'eggs' ? 'eggs_scattered' : 'fry_cloud', nextStageHour: g.clock.hour + hoursLeft });
}

/** Keep everyone fed, healthy and the broods fed, so runs test the line, not husbandry. */
function care(g: GameState): void {
  for (const c of Object.values(g.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 10);
    c.stats.health = Math.max(c.stats.health, 95);
    c.stats.stress = Math.min(c.stats.stress, 20);
    delete c.illness;
  }
  for (const cl of Object.values(g.clutches)) cl.fed = 1;
}

function run(g: GameState, hours: number, step = 1, each?: () => void): void {
  for (let t = 0; t < hours - 1e-9; t += step) {
    care(g);
    advanceWorld(g, step, { forceFull: true });
    each?.();
  }
}

const young = (f: Farm, where?: string) => Object.values(f.g.creatures).filter((c) => c.status !== 'dead' && c.lineage.motherId === f.mother.id && c.lineage.fatherId === f.father.id && (!where || c.tankId === where));
const lineListings = (g: GameState, ids: Set<string>) => g.market.listings.filter((l) => l.creatureIds.some((id) => ids.has(id)));

describe('PROD-004, PROD-019, PROD-021: starting a line', () => {
  it('refuses a young animal, a same-sex pair, two species, a tank used twice and an unsuitable tank; nothing exists before Start line', () => {
    const f = farm();
    const g = f.g;
    expect(g.production).toBeUndefined();
    const tanks = { breed: f.breed.id, raise: f.raise.id, quarantine: f.qt.id, keep: f.keep.id };
    // the would-be partners live in tanks of their own (the line's tanks must stay safe for its young)
    const spare = tank(g, 'Spare', 9);
    const pufferTank = tank(g, 'Puffer Tank', 12);
    const kid = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 4 }), spare.id);
    expect(createLine(g, { motherId: kid.id, fatherId: f.father.id, tanks }).ok).toBe(false);
    const male2 = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 40 }), spare.id);
    expect(createLine(g, { motherId: male2.id, fatherId: f.father.id, tanks }).ok).toBe(false);
    const puffer = addCreature(g, createCreature(g, simRng(g), 'pea_puffer', { sex: 'female', ageDays: 40 }), pufferTank.id);
    expect(createLine(g, { motherId: puffer.id, fatherId: f.father.id, tanks }).ok).toBe(false);
    const twice = createLine(g, { motherId: f.mother.id, fatherId: f.father.id, tanks: { ...tanks, quarantine: f.raise.id } });
    expect(twice.ok).toBe(false);
    expect(twice.message).toMatch(/^Already the (raise|quarantine) tank$/); // ADR-0030 decision 5
    const salt = tank(g, 'Reef', 6, 'g20L', 'marine_fowlr');
    expect(createLine(g, { motherId: f.mother.id, fatherId: f.father.id, tanks: { ...tanks, keep: salt.id } }).ok).toBe(false);
    // temperament (§8.6.1, PROD-003; the chunk 4 review): a breed tank with another male betta, young beside a pea puffer
    const fight = createLine(g, { motherId: f.mother.id, fatherId: f.father.id, tanks: { ...tanks, breed: spare.id } });
    expect(fight).toMatchObject({ ok: false, message: 'Two male bettas will fight — often to serious injury.' });
    const nip = createLine(g, { motherId: f.mother.id, fatherId: f.father.id, tanks: { ...tanks, keep: pufferTank.id } });
    expect(nip).toMatchObject({ ok: false, message: 'Pea puffers nip flowing fins.' });
    expect(tankFitFor(g, 'betta', 'raise', pufferTank.id, { breed: f.breed.id })).toMatchObject({ ok: false, status: 'no', reason: 'Pea puffers nip flowing fins.' });
    expect(f.father.tankId).toBe(f.breed.id); // a refused line moved nobody
    expect(g.production?.lines.length ?? 0).toBe(0);
    const line = start(f);
    expect(line.name).toBe('Betta line');
    expect(line.running).toBe(true);
    expect(line.rules).toEqual({ pauseWhenFull: true, keepPrismatic: true, autoList: true, keep: [] });
    expect(line.tanks.quarantine).toEqual([f.qt.id]);
    // A betta female rests in her own tank between spawns (ADR-0030 decision 7); the male lives in the breed tank.
    expect(line.pair.restTankId).toBe(f.keep.id);
    expect(f.father.tankId).toBe(f.breed.id);
  });

  it('line slots follow the facility level; the naming rule renames default lines when a second starts', () => {
    const f = farm({ level: 'hobby_room' });
    const g = f.g;
    expect(lineSlots(g)).toBe(1);
    start(f, { breedFor: 'Royal Blue Butterfly Halfmoon' });
    const rng = simRng(g);
    const m2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40 }), f.keep.id);
    const f2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40 }), f.keep.id);
    const b2 = tank(g, 'Breed B', 9, 'g10');
    const r2 = tank(g, 'Grow-out B', 12, 'g20L');
    const second = { motherId: f2.id, fatherId: m2.id, tanks: { breed: b2.id, raise: r2.id, quarantine: f.qt.id, keep: f.keep.id }, breedFor: 'Cambodian Veiltail' };
    expect(createLine(g, second).ok).toBe(false); // 1 of 1 line slot
    g.facility.level = 'specialty_shop';
    expect(lineSlots(g)).toBe(2);
    const r = createLine(g, second);
    expect(r.ok).toBe(true);
    const ids = g.production!.lines.map((l) => l.id);
    expect(ids).toEqual(['royal', 'cambodian']);
    expect(g.production!.lines.map((l) => l.name)).toEqual(['Royal Blue Butterfly Halfmoon line', 'Cambodian Veiltail line']);
    // the pairs are listed for set-up step 1 with the ones in lines marked
    const pairs = candidatePairs(g);
    expect(pairs.find((p) => p.motherId === f.mother.id && p.fatherId === f.father.id)?.inLine).toBe('Royal Blue Butterfly Halfmoon line');
    // a name the player typed stays
    const f3 = farm({ seed: 12, level: 'specialty_shop' });
    const typed = start(f3, { name: 'Ember’s pride' });
    expect(typed.name).toBe('Ember’s pride');
    expect(typed.customName).toBe(true);
  });
});

describe('PROD-006, PROD-004 A2, AUTO-024: Raise', () => {
  it('moves the pair’s brood to the raise tank once, when free-swimming and not before, through Move to nursery', () => {
    const f = farm();
    const g = f.g;
    const line = start(f);
    const eggs = brood(f, 'eggs', 30, 400);
    // another pair's brood in the same tank is never touched (PROD-004 A2)
    const rng = simRng(g);
    const otherM = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40 }), f.keep.id);
    const otherF = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40 }), f.keep.id);
    const stranger = brood(f, 'fry', 15, 400, otherF.id, otherM.id);
    run(g, 3);
    expect(g.clutches[eggs.id].tankId).toBe(f.breed.id);
    expect(g.clutches[stranger.id].tankId).toBe(f.breed.id);
    const moved0 = g.progress.counters.clutchesMoved ?? 0;
    g.clutches[eggs.id].stage = 'fry';
    run(g, 2);
    expect(g.clutches[eggs.id].tankId).toBe(f.raise.id);
    expect(g.clutches[eggs.id].flags).toContain('moved'); // the player's Move to nursery path
    expect(g.progress.counters.clutchesMoved).toBe(moved0 + 1);
    expect(line.routed).toEqual([eggs.id]);
    run(g, 3);
    expect(g.progress.counters.clutchesMoved).toBe(moved0 + 1); // once per brood
    expect(g.clutches[stranger.id].tankId).toBe(f.breed.id);
  });

  it('a full raise tank leaves the fry with the parents, with one notice (ADR-0025 decision 8)', () => {
    const f = farm();
    const g = f.g;
    start(f, { rules: { pauseWhenFull: false } });
    // fill the raise tank with adults of another species to its stocking limit
    const rng = simRng(g);
    for (let i = 0; i < 60; i++) addCreature(g, createCreature(g, rng, 'neon_tetra', { ageDays: 60 }), f.raise.id);
    const cl = brood(f, 'fry', 20, 400);
    run(g, 4);
    expect(g.clutches[cl.id].tankId).toBe(f.breed.id);
    const notes = g.log.filter((e) => e.text === 'Betta line: the raise tank is full, so the fry stay in Breed Tank.');
    expect(notes.length).toBe(1);
  });
});

describe('PROD-007, PROD-012, PROD-013, PROD-014: Sort, Quarantine and Sell', () => {
  it('keeps the best matches, quarantines the rest for exactly 168 h, then lists them as juveniles at fair value × 0.9', () => {
    const f = farm({ seed: 21 });
    const g = f.g;
    const line = start(f);
    const trait = pairTraits(g, line)[0];
    expect(trait).toBeDefined();
    expect(setKeepRules(g, line.id, [{ traitIds: [trait.id], count: 2 }]).ok).toBe(true);
    brood(f, 'fry', 40, 8);
    run(g, 12);
    const all = young(f);
    expect(all.length).toBeGreaterThanOrEqual(4);
    const sp = getSpecies('betta');
    const kept = all.filter((c) => c.tankId === f.keep.id);
    const matching = all.filter((c) => traitsOf(sp, c).includes(trait.id) && !isPrismatic(c));
    const best2 = [...matching].sort((a, b) => creatureValue(g, b).total - creatureValue(g, a).total || (a.id < b.id ? -1 : 1)).slice(0, 2);
    expect(kept.map((c) => c.id).sort()).toEqual(best2.map((c) => c.id).sort());
    const batch = line.batches![0];
    expect(batch.tankId).toBe(f.qt.id);
    const inQt = young(f, f.qt.id);
    expect(inQt.length).toBe(all.length - kept.length);
    // not listed before the hold ends
    const ids = new Set(inQt.map((c) => c.id));
    const until = batch.quarantinedHour! + QUARANTINE_HOURS;
    run(g, until - g.clock.hour - 1);
    expect(lineListings(g, ids).length).toBe(0);
    run(g, 2);
    const listings = lineListings(g, ids);
    expect(listings.length).toBe(1);
    const l = listings[0];
    expect(l.kind).toBe('juveniles');
    expect(l.createdHour).toBeGreaterThanOrEqual(until - 1e-9);
    expect(l.createdHour).toBeLessThan(until + 1);
    expect(l.reserve).toBe(Math.round(l.snapshot.valuation * 0.9));
    expect([...l.creatureIds].sort()).toEqual([...ids].sort());
  });

  it('with List automatically off, nothing is listed and the juveniles stay in quarantine', () => {
    const f = farm({ seed: 22 });
    const g = f.g;
    const line = start(f, { rules: { autoList: false } });
    brood(f, 'fry', 30, 6);
    run(g, 10);
    const ids = new Set(young(f, f.qt.id).map((c) => c.id));
    expect(ids.size).toBeGreaterThan(0);
    run(g, QUARANTINE_HOURS + 4, 2);
    expect(lineListings(g, ids).length).toBe(0);
    expect(young(f, f.qt.id).length).toBe(ids.size);
    expect(line.batches).toBeUndefined();
  });
});

describe('PROD-011, PROD-008: never lists a Prismatic', () => {
  for (const keepPrismatic of [true, false]) {
    it(`with "Never sell Prismatic animals" ${keepPrismatic ? 'on, it moves to the keep tank' : 'off, it stays with its batch'} and is never listed`, () => {
      const f = farm({ seed: 31 });
      const g = f.g;
      start(f, { rules: { keepPrismatic } });
      forcePrismatic('bred', 1);
      brood(f, 'fry', 20, 6);
      run(g, 10);
      forcePrismatic('bred', 0);
      const prism = young(f).filter((c) => isPrismatic(c));
      expect(prism.length).toBe(1);
      expect(prism[0].tankId).toBe(keepPrismatic ? f.keep.id : f.qt.id);
      // what's in the keep tank now (besides the resting female, whom the line brings to the male: ADR-0030 decision 7)
      const kept = Object.values(g.creatures).filter((c) => c.tankId === f.keep.id && c.status === 'alive' && c.id !== f.mother.id).map((c) => c.id);
      run(g, QUARANTINE_HOURS + 6, 2);
      expect(g.market.listings.some((l) => l.creatureIds.includes(prism[0].id))).toBe(false);
      // and nothing in the keep tank is ever listed or moved out
      for (const c of Object.values(g.creatures)) if (c.tankId === f.keep.id) expect(g.market.listings.some((l) => l.creatureIds.includes(c.id))).toBe(false);
      for (const id of kept) if (g.creatures[id].status === 'alive') expect(g.creatures[id].tankId).toBe(f.keep.id);
      if (keepPrismatic) expect(kept).toContain(prism[0].id);
    });
  }
});

describe('PROD-005: the line adds no biology', () => {
  it('no production code creates a clutch or a creature', () => {
    for (const file of ['src/sim/production/index.ts', 'src/sim/production/costs.ts']) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/createClutch|createCreature|addCreature|mintJuveniles/);
    }
  });
});


/** Conditioning foods and warm water for the pair, each hour (what a keeper does before spawning). */
function condition(f: Farm, foods: Parameters<typeof noteBreedingFood>[2]): void {
  for (const t of [f.breed, f.keep]) noteBreedingFood(f.g, t.id, foods);
  for (const c of [f.mother, f.father]) {
    c.life = { ...(c.life ?? {}), conditioning: 100 };
  }
}

describe('PROD-009, PROD-010: paused by you, and waiting for room', () => {
  it('a paused line moves, sorts and lists nothing; resuming carries on from where it stopped', () => {
    const f = farm({ seed: 41 });
    const g = f.g;
    const line = start(f);
    expect(setLineRunning(g, line.id, false).ok).toBe(true);
    expect(lineStatus(line)).toBe('paused_by_you');
    const cl = brood(f, 'fry', 20, 400);
    run(g, 48, 2);
    expect(g.clutches[cl.id].tankId).toBe(f.breed.id);
    expect(f.father.repro.lineHold).toBe(true);
    expect(setLineRunning(g, line.id, true).ok).toBe(true);
    expect(f.father.repro.lineHold).toBeUndefined();
    run(g, 2);
    expect(g.clutches[cl.id].tankId).toBe(f.raise.id);
  });

  it('holds a real spawning pair: a paused medaka pair lays nothing while a running one does (the readiness hold)', () => {
    const lay = (paused: boolean) => {
      const f = farm({ seed: 43, speciesId: 'medaka' });
      const g = f.g;
      const line = start(f);
      if (paused) setLineRunning(g, line.id, false);
      for (let h = 0; h < 96; h++) {
        condition(f, ['baby_brine', 'daphnia']);
        run(g, 1);
      }
      return Object.values(g.creatures).filter((c) => c.status !== 'dead' && c.lineage.motherId === f.mother.id).length + Object.values(g.clutches).filter((c) => c.motherId === f.mother.id).length + (f.mother.repro.totalClutches ?? 0);
    };
    expect(lay(false)).toBeGreaterThan(0);
    expect(lay(true)).toBe(0);
  });

  it('with Pause when a tank is full, a raise tank that can’t take the next clutch holds the pair until it has room', () => {
    const f = farm({ seed: 45 });
    const g = f.g;
    const line = start(f, { rules: { autoList: false } });
    // the quarantine tank is busy with a long batch, so the raised young wait in the raise tank and fill it
    const filler = tank(g, 'Spare', 9, 'g20L');
    const qtBusy = setLineTank(g, line.id, 'quarantine', filler.id, f.qt.id);
    expect(qtBusy.ok).toBe(true);
    filler.water.bioMaturity = 0.1; // not cycled: no batch moves in
    // shrink the raise tank so one brood fills it
    f.raise.tierId = 'g10';
    brood(f, 'fry', 40, 6);
    run(g, 10);
    expect(young(f, f.raise.id).length).toBeGreaterThan(0);
    expect(line.waiting).toBe(true);
    expect(lineStatus(line)).toBe('waiting');
    expect(f.mother.repro.lineHold).toBe(true);
    expect(g.log.some((e) => e.text === `Grow-out is full, so Cinder and Blaze are kept apart until there's room.`)).toBe(true);
    // room again: the young move on (cycled quarantine), the line restarts by itself and says so
    filler.water.bioMaturity = 1;
    run(g, 3);
    expect(line.waiting).toBeUndefined();
    expect(f.mother.repro.lineHold).toBeUndefined();
    expect(g.log.some((e) => e.text === 'Betta line is running again: Grow-out has room.')).toBe(true);
  });
});

describe('PROD-017: a line with a missing parent or tank pauses with one notice and is kept', () => {
  it('a parent no longer in your care', () => {
    const f = farm({ seed: 51 });
    const g = f.g;
    const line = start(f);
    run(g, 2);
    f.mother.status = 'dead';
    run(g, 6);
    expect(lineStatus(line)).toBe('paused');
    expect(findLine(g, line.id)).toBeDefined();
    const n = g.log.filter((e) => e.text === 'Betta line paused: Cinder is no longer in your care. Choose another pair, or end the line.');
    expect(n.length).toBe(1);
    expect(f.father.repro.lineHold).toBe(true);
    // Choose another pair: the line runs again
    const nf = addCreature(g, createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 40, name: 'Iris' }), f.keep.id);
    expect(setLinePair(g, line.id, nf.id, f.father.id).ok).toBe(true);
    run(g, 2);
    expect(lineStatus(line)).toBe('running');
  });

  for (const stage of ['breed', 'raise', 'quarantine', 'keep'] as const) {
    it(`the ${stage} tank is gone`, () => {
      const f = farm({ seed: 52 });
      const g = f.g;
      const line = start(f);
      run(g, 2);
      const t = { breed: f.breed, raise: f.raise, quarantine: f.qt, keep: f.keep }[stage];
      const animals = Object.values(g.creatures).filter((c) => c.status === 'alive').length;
      if (stage === 'breed') f.father.tankId = f.keep.id; // the sale moved him out first
      expect(() => {
        deleteTank(g, t.id);
        run(g, 4);
      }).not.toThrow();
      expect(lineStatus(line)).toBe('paused');
      expect(g.log.filter((e) => e.text === `Betta line paused: ${t.name} is gone. Choose another tank, or end the line.`).length).toBe(1);
      expect(Object.values(g.creatures).filter((c) => c.status === 'alive').length).toBe(animals);
    });
  }

  it('a parent the player moved away: the reason, once; moving him back resumes the line', () => {
    const f = farm({ seed: 53 });
    const g = f.g;
    const line = start(f);
    run(g, 2);
    const extra = tank(g, 'Side Tank', 12, 'g10');
    f.father.tankId = extra.id;
    run(g, 5);
    expect(lineStatus(line)).toBe('paused');
    expect(g.log.filter((e) => e.text === 'Betta line paused: Blaze isn’t in Breed Tank. Move Blaze back, or choose another pair.').length).toBe(1);
    f.father.tankId = f.breed.id;
    run(g, 2);
    expect(lineStatus(line)).toBe('running');
  });
});

describe('PROD-015: the line’s week', () => {
  it('a sale of the line’s listing counts once; the week restarts after 168 game hours', () => {
    const f = farm({ seed: 61 });
    const g = f.g;
    const line = start(f);
    brood(f, 'fry', 30, 6);
    run(g, 10);
    run(g, QUARANTINE_HOURS + 2, 2);
    const l = g.market.listings.find((x) => x.status === 'active' && x.creatureIds.every((id) => g.creatures[id]?.lineage.motherId === f.mother.id));
    expect(l).toBeDefined();
    for (let i = 0; i < 60 && !l!.bids.some((b) => b.status === 'open'); i++) forceBuyerVisit(g, l!.id);
    const bid = l!.bids.find((b) => b.status === 'open')!;
    expect(acceptBid(g, l!.id, bid.id).ok).toBe(true);
    run(g, 3);
    expect(line.stats.soldCount).toBe(l!.creatureIds.length);
    expect(line.stats.revenue).toBe(Math.round(l!.soldFor! * 100) / 100);
    expect(line.stats.totalSold).toBe(l!.creatureIds.length);
    // chunk 5 (AUTO-039): completeSale tags the ledger entry with the line, for Operations' weekly money
    const sale = g.finance.ledger.filter((e) => e.category === 'livestock_sale' && e.memo.startsWith(`Sold "${l!.title}"`));
    expect(sale.map((e) => e.line)).toEqual([{ id: line.id, n: l!.creatureIds.length }]);
    run(g, 3);
    expect(line.stats.soldCount).toBe(l!.creatureIds.length); // once
    const week0 = line.stats.weekStartHour;
    run(g, week0 + 168 - g.clock.hour + 2, 2);
    expect(line.stats.weekStartHour).toBe(week0 + 168);
    expect(line.stats.soldCount).toBe(0);
    expect(line.stats.totalSold).toBe(l!.creatureIds.length);
  });

  it('costs: each line pays its share of a tank’s residents, and two lines never pay for the same food', () => {
    const f = farm({ seed: 62 });
    const g = f.g;
    const line = start(f);
    const rng = simRng(g);
    // two of the line's young and two strangers in the quarantine tank: the line pays half
    for (let i = 0; i < 2; i++) addCreature(g, createCreature(g, rng, 'betta', { ageDays: 6, motherId: f.mother.id, fatherId: f.father.id }), f.qt.id);
    for (let i = 0; i < 2; i++) addCreature(g, createCreature(g, rng, 'neon_tetra', { ageDays: 40 }), f.qt.id);
    expect(lineShare(g, line, f.qt.id)).toBeCloseTo(0.5, 9);
    const c0 = line.stats.costs;
    noteFoodSpend(g, f.qt.id, 'flake_tropical', 10);
    const charged = line.stats.costs - c0;
    expect(charged).toBeGreaterThan(0);
    // the same food in a tank the line doesn't use costs it nothing
    const other = tank(g, 'Display', 15, 'g20L');
    const c1 = line.stats.costs;
    noteFoodSpend(g, other.id, 'flake_tropical', 10);
    expect(line.stats.costs).toBe(c1);
    // power accrues hour by hour while the line's tanks hold its animals
    const c2 = line.stats.costs;
    run(g, 6);
    expect(line.stats.costs).toBeGreaterThan(c2);
  });
});

describe('PROD-001, PROD-002, AUTO-020, AUTO-021: two lines of one species', () => {
  it('run side by side without sharing a creature, a brood or a listing', () => {
    const f = farm({ seed: 71 });
    const g = f.g;
    const a = start(f, { breedFor: 'Cambodian Veiltail' });
    const rng = simRng(g);
    const m2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Sapphire' }), f.keep.id);
    const f2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Iris' }), f.keep.id);
    const b2 = tank(g, 'Breed B', 9, 'g10');
    const r2 = tank(g, 'Grow-out B', 12, 'g40B');
    const q2 = tank(g, 'Quarantine B', 15, 'g40B');
    const k2 = tank(g, 'Keep B', 18, 'g20L');
    const rb = createLine(g, { motherId: f2.id, fatherId: m2.id, tanks: { breed: b2.id, raise: r2.id, quarantine: q2.id, keep: k2.id }, breedFor: 'Royal Blue Halfmoon' });
    expect(rb.ok).toBe(true);
    const b = findLine(g, rb.lineId!)!;
    // a pair already in a line can't start another (AUTO-020 A2)
    expect(createLine(g, { motherId: f2.id, fatherId: m2.id, tanks: { breed: b2.id, raise: r2.id, quarantine: q2.id, keep: k2.id } }).ok).toBe(false);
    brood(f, 'fry', 30, 6);
    const sp = getSpecies('betta');
    createClutch(g, { sp, tank: b2, mother: f2, father: m2, hour: g.clock.hour + 0, stage: 'fry', count: 30, visual: 'fry_cloud', nextStageHour: g.clock.hour + 20 });
    run(g, QUARANTINE_HOURS + 40, 2, () => {
      // one creature, one stage (AUTO-020); one creature, one active listing (AUTO-021)
      const owner = new Map<string, string>();
      for (const line of [a, b]) {
        for (const bt of line.batches ?? []) for (const id of bt.creatureIds) {
          expect(owner.get(id)).toBeUndefined();
          owner.set(id, `${line.id}:${bt.id}`);
        }
        for (const id of [line.pair.motherId, line.pair.fatherId]) {
          expect(owner.get(id)).toBeUndefined();
          owner.set(id, `${line.id}:pair`);
        }
      }
      const listed = new Map<string, string>();
      for (const l of g.market.listings) if (l.status === 'active') for (const id of l.creatureIds) {
        expect(listed.get(id)).toBeUndefined();
        listed.set(id, l.id);
      }
    });
    const youngA = Object.values(g.creatures).filter((c) => c.lineage.motherId === f.mother.id);
    const youngB = Object.values(g.creatures).filter((c) => c.lineage.motherId === f2.id);
    expect(youngA.length).toBeGreaterThan(0);
    expect(youngB.length).toBeGreaterThan(0);
    const listedA = g.market.listings.filter((l) => l.creatureIds.some((id) => youngA.some((c) => c.id === id)));
    const listedB = g.market.listings.filter((l) => l.creatureIds.some((id) => youngB.some((c) => c.id === id)));
    expect(listedA.length).toBeGreaterThan(0);
    expect(listedB.length).toBeGreaterThan(0);
    for (const l of listedA) expect(l.creatureIds.every((id) => youngA.some((c) => c.id === id))).toBe(true);
    expect(youngA.every((c) => c.tankId !== r2.id && c.tankId !== q2.id)).toBe(true);
  });

  it('a fresh game has no production field, and its hash and SCHEMA_VERSION are unchanged by it (PROD-002 A2)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Fresh', seed: 5 });
    expect(g.production).toBeUndefined();
    expect(stateHash(g)).toBe(stateHash({ ...g, production: undefined }));
    // PROD-002 A2 reads "unchanged by the production field" since chunk 5 raised the version once for the S3-D state
    // (INTAKE C-44, PERSIST-016), and chunk 16 once more for its new species (ADR-0052 decision 5): nothing for
    // production lines.
    expect(SCHEMA_VERSION).toBe(4); // chunk 17: the big-tank species
  });
});

describe('PROD-016: deterministic, and the same at any step size', () => {
  function scenario(step: number) {
    const f = farm({ seed: 81 });
    const g = f.g;
    start(f);
    brood(f, 'fry', 30, 6);
    // care() every 6 game hours in both runs. Run every step (run()'s way) it tended the 1-hour run six times as often,
    // so the two runs differed (a hungrier fish is likelier to start a squabble) and drew the shared stream differently
    // from the first day on; the market's demand walk, and with it a listing's reserve, then differed on some seeds (3
    // of 30 in a chunk 16 probe). Tended alike, the two runs are the same world.
    for (let t = 0; t < QUARANTINE_HOURS + 24 - 1e-9; t += step) {
      if (t % 6 === 0) care(g);
      advanceWorld(g, step, { forceFull: true });
    }
    return g;
  }
  it('two identical runs end with an equal stateHash', () => {
    expect(stateHash(scenario(1))).toBe(stateHash(scenario(1)));
  });
  it('1-hour and 6-hour steps make the same moves, sorts and listings at the same hours', () => {
    const a = scenario(1);
    const b = scenario(6);
    // What the line decides: the hours, counts, reserves and money (and, tended alike, the whole world is the same).
    const lines = (g: GameState) =>
      JSON.stringify(
        g.production!.lines.map((l) => ({
          routed: l.routed?.length ?? 0,
          sorted: l.sortedThroughHour,
          batches: (l.batches ?? []).map((bt) => [bt.sortedHour, bt.tankId, bt.quarantinedHour, bt.released, bt.creatureIds.length, bt.listingIds?.length ?? 0]),
          stats: l.stats,
        })),
      );
    expect(lines(b)).toBe(lines(a));
    const listings = (g: GameState) => JSON.stringify(g.market.listings.map((l) => [l.kind, l.createdHour, l.reserve, l.creatureIds.length]));
    expect(listings(b)).toBe(listings(a));
    expect(a.market.listings.length).toBeGreaterThan(0);
    expect(stateHash(b)).toBe(stateHash(a));
  });
});

describe('ADR-0030 decision 7: a betta line brings the female in and moves her back', () => {
  it('when both are ready the line starts breeding in the male’s tank, and after spawning she rests again', () => {
    const f = farm({ seed: 91 });
    const g = f.g;
    start(f);
    f.breed.water.tempC = 27;
    const prep = () => {
      condition(f, ['bloodworm', 'brine_shrimp']);
      const m = f.father;
      if (m.repro.stage !== 'guarding' && m.repro.stage !== 'courting' && m.repro.stage !== 'spawning' && m.repro.stage !== 'resting') {
        m.repro.stage = 'nest_ready';
        m.repro.nestProgress = 1;
      }
      for (const c of [f.mother, f.father]) if (c.repro.stage !== 'resting' && c.repro.stage !== 'spent') c.stats.breedingReadiness = Math.max(c.stats.breedingReadiness, 90);
      if (f.mother.repro.stage === 'conditioning' || f.mother.repro.stage === 'idle') f.mother.repro.stage = 'gravid';
    };
    let wasIn = false;
    for (let h = 0; h < 30 && !(wasIn && f.mother.tankId === f.keep.id); h++) {
      prep();
      run(g, 1);
      if (f.mother.tankId === f.breed.id) wasIn = true;
    }
    expect(wasIn).toBe(true);
    expect(f.mother.tankId).toBe(f.keep.id);
    expect(Object.values(g.clutches).some((cl) => cl.motherId === f.mother.id && cl.fatherId === f.father.id)).toBe(true);
    expect(g.log.some((e) => /has been floated into Breed Tank/.test(e.text))).toBe(true);
  });
});

describe('ADR-0025 decisions 5 and 6, PROD-020: quarantine tanks and ending a line', () => {
  it('Add a quarantine tank buys the real kit, joins the line, and gives a restart day only when seeded', () => {
    const f = farm({ seed: 101 });
    const g = f.g;
    const line = start(f);
    const m0 = g.finance.money;
    const seeded = addQuarantineTank(g, line.id, true);
    expect(seeded.ok).toBe(true);
    expect(seeded.tankName).toBe('Quarantine 2');
    expect(g.tanks[seeded.tankId!].purpose).toBe('quarantine');
    expect(line.tanks.quarantine).toEqual([f.qt.id, seeded.tankId]);
    expect(m0 - g.finance.money).toBe(seeded.price);
    expect(seeded.restartDay).toBeGreaterThanOrEqual(1);
    const plain = addQuarantineTank(g, line.id, false);
    expect(plain.ok).toBe(true);
    expect(plain.tankName).toBe('Quarantine 3');
    expect(plain.restartDay).toBeUndefined();
    g.finance.money = 0;
    const broke = addQuarantineTank(g, line.id, true);
    expect(broke.ok).toBe(false);
  });

  it('a shared quarantine tank takes one batch at a time; the other line’s batch waits its turn', () => {
    const f = farm({ seed: 102 });
    const g = f.g;
    const a = start(f, { breedFor: 'Cambodian Veiltail' });
    const rng = simRng(g);
    const m2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40 }), f.keep.id);
    const f2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40 }), f.keep.id);
    const b2 = tank(g, 'Breed B', 9, 'g10');
    const r2 = tank(g, 'Grow-out B', 12, 'g40B');
    const k2 = tank(g, 'Keep B', 18, 'g20L');
    const rb = createLine(g, { motherId: f2.id, fatherId: m2.id, tanks: { breed: b2.id, raise: r2.id, quarantine: f.qt.id, keep: k2.id }, breedFor: 'Royal Blue Halfmoon' });
    expect(rb.ok).toBe(true);
    const b = findLine(g, rb.lineId!)!;
    // chunk 17 — the keeper mends failed kit as it goes: on another random stream (the tank gate's) the Quarantine
    // tank's filter stopped, and a stopped quarantine tank takes no batch, which says nothing about sharing it
    const mended = (hours: number, step?: number) => {
      for (let h = 0; h < hours; h += 24) {
        run(g, Math.min(24, hours - h), step);
        for (const t of Object.values(g.tanks)) for (const e of t.equipment ?? []) if (e.failed) { e.failed = false; delete e.failMode; }
      }
    };
    brood(f, 'fry', 20, 6);
    mended(12);
    expect(a.batches?.[0].tankId).toBe(f.qt.id);
    const sp = getSpecies('betta');
    createClutch(g, { sp, tank: b2, mother: f2, father: m2, hour: g.clock.hour, stage: 'fry', count: 20, visual: 'fry_cloud', nextStageHour: g.clock.hour + 6 });
    mended(12);
    expect(b.batches?.[0].tankId).toBeUndefined(); // waiting: Quarantine is busy with the other line's batch
    mended(QUARANTINE_HOURS, 2);
    expect(b.batches?.some((bt) => bt.tankId === f.qt.id)).toBe(true);
  });

  it('End line: the animals stay, the slot frees, the numbers go to its history', () => {
    const f = farm({ seed: 103, level: 'hobby_room' });
    const g = f.g;
    const line = start(f);
    setLineRunning(g, line.id, false);
    expect(f.father.repro.lineHold).toBe(true);
    const where = Object.fromEntries(Object.values(g.creatures).map((c) => [c.id, c.tankId]));
    expect(endLine(g, line.id).ok).toBe(true);
    expect(g.production!.lines.length).toBe(0);
    expect(g.production!.ended![0]).toMatchObject({ id: line.id, name: 'Betta line', totalSold: 0 });
    expect(f.father.repro.lineHold).toBeUndefined();
    expect(Object.fromEntries(Object.values(g.creatures).map((c) => [c.id, c.tankId]))).toEqual(where);
    expect(lineSlots(g) - g.production!.lines.length).toBe(1);
    expect(setLineRule(g, 'nope', 'autoList', false)).toMatchObject({ ok: false, message: 'That line isn’t here any more.' });
  });
});

describe('the chunk 4 review: ownership, keep tanks, the pair list, and the line’s own housekeeping', () => {
  /** A second betta pair and four tanks of its own. */
  function secondPair(f: Farm) {
    const g = f.g;
    const rng = simRng(g);
    const b2 = tank(g, 'Breed B', 9, 'g10');
    const r2 = tank(g, 'Grow-out B', 12, 'g40B');
    const q2 = tank(g, 'Quarantine B', 15, 'g40B');
    const k2 = tank(g, 'Keep B', 18, 'g20L');
    const m2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Sapphire' }), b2.id);
    const f2 = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Iris' }), k2.id);
    return { b2, r2, q2, k2, m2, f2 };
  }

  it('a line’s keep tank is never another line’s breed, raise or quarantine tank, and the other way round', () => {
    const f = farm({ seed: 111 });
    const g = f.g;
    const a = start(f);
    const p = secondPair(f);
    const own = { breed: p.b2.id, raise: p.r2.id, quarantine: p.q2.id, keep: p.k2.id };
    // A's keep tank (Quiet Corner) can't be B's quarantine tank: its animals are protected, so a batch there never lists
    expect(tankFitFor(g, 'betta', 'quarantine', f.keep.id, { breed: p.b2.id }, [p.f2.id, p.m2.id])).toMatchObject({ ok: false, reason: `Already ${a.name}’s keepers tank` });
    expect(createLine(g, { motherId: p.f2.id, fatherId: p.m2.id, tanks: { ...own, quarantine: f.keep.id } }).ok).toBe(false);
    expect(createLine(g, { motherId: p.f2.id, fatherId: p.m2.id, tanks: { ...own, raise: f.keep.id } }).ok).toBe(false);
    // A's raise tank can't be B's keep tank (young would never leave it)
    expect(tankFitFor(g, 'betta', 'keep', f.raise.id, {}, [p.f2.id, p.m2.id])).toMatchObject({ ok: false, reason: `Already ${a.name}’s raise tank` });
    // two lines may share a keep tank, and a quarantine tank (one batch at a time)
    expect(tankFitFor(g, 'betta', 'keep', f.keep.id, {}, [p.f2.id, p.m2.id])).toMatchObject({ ok: true, status: 'shared' });
    expect(tankFitFor(g, 'betta', 'quarantine', f.qt.id, {}, [p.f2.id, p.m2.id])).toMatchObject({ ok: true, status: 'shared' });
    expect(g.production!.lines.length).toBe(1);
  });

  it('an animal belongs to one line: a batch member who becomes another line’s parent leaves the batch, and is charged once', () => {
    const f = farm({ seed: 112 });
    const g = f.g;
    const a = start(f);
    const rng = simRng(g);
    // one of A's young, grown, waiting in A's quarantine batch
    const ash = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Ash', motherId: f.mother.id, fatherId: f.father.id }), f.qt.id);
    const sib = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, motherId: f.mother.id, fatherId: f.father.id }), f.qt.id);
    a.batches = [{ id: 'b1', creatureIds: [ash.id, sib.id], sortedHour: g.clock.hour, tankId: f.qt.id, quarantinedHour: g.clock.hour }];
    const p = secondPair(f);
    const rb = createLine(g, { motherId: ash.id, fatherId: p.m2.id, tanks: { breed: p.b2.id, raise: p.r2.id, quarantine: p.q2.id, keep: p.k2.id } });
    expect(rb.ok, rb.message).toBe(true);
    const b = findLine(g, rb.lineId!)!;
    expect(a.batches?.[0].creatureIds).toEqual([sib.id]); // the parent role wins: A never lists B's mother
    expect(b.pair.restTankId).toBe(f.qt.id); // she rests where she lives (ADR-0030 decision 7)
    // shares of a tank never add up to more than 1, and a serving is charged at most once
    const shareA = lineShare(g, a, f.qt.id);
    const shareB = lineShare(g, b, f.qt.id);
    expect(shareA).toBeCloseTo(0.5, 9); // sib
    expect(shareB).toBeCloseTo(0.5, 9); // Ash
    expect(shareA + shareB).toBeLessThanOrEqual(1 + 1e-9);
    const before = a.stats.costs + b.stats.costs;
    noteFoodSpend(g, f.qt.id, 'flake_tropical', 10);
    const food = getFoodDef('flake_tropical')!;
    expect(a.stats.costs + b.stats.costs - before).toBeLessThanOrEqual((10 * food.price) / food.servingsPerPack + 0.011);
    // and nobody can take a creature that's already a line's parent
    expect(createLine(g, { motherId: ash.id, fatherId: p.m2.id, tanks: { breed: p.b2.id, raise: p.r2.id, quarantine: p.q2.id, keep: p.k2.id } }).ok).toBe(false);
  });

  it('the pair list keeps every species: a big colony fills at most its own share', () => {
    const f = farm({ seed: 113 });
    const g = f.g;
    const rng = simRng(g);
    const colony = tank(g, 'Shrimp Colony', 21, 'g20L');
    for (let i = 0; i < 20; i++) addCreature(g, createCreature(g, rng, 'cherry_shrimp', { sex: i % 2 ? 'male' : 'female', ageDays: 60 }), colony.id);
    const guppies = tank(g, 'Guppies', 24, 'g20L');
    const gm = addCreature(g, createCreature(g, rng, 'fancy_guppy', { sex: 'male', ageDays: 60 }), guppies.id);
    const gf = addCreature(g, createCreature(g, rng, 'fancy_guppy', { sex: 'female', ageDays: 60 }), guppies.id);
    const all = candidatePairs(g);
    expect(all.filter((p) => p.speciesId === 'cherry_shrimp').length).toBeLessThanOrEqual(PAIRS_PER_SPECIES);
    expect(all.some((p) => p.motherId === gf.id && p.fatherId === gm.id)).toBe(true);
    expect(all.some((p) => p.motherId === f.mother.id && p.fatherId === f.father.id)).toBe(true);
    const bettas = candidatePairs(g, 'betta');
    expect(bettas.length).toBeGreaterThan(0);
    expect(bettas.every((p) => p.speciesId === 'betta')).toBe(true);
  });

  it('starting a line leaves every tank’s purpose alone (a display tank stays on display)', () => {
    const f = farm({ seed: 114 });
    const purposes = Object.fromEntries(Object.values(f.g.tanks).map((t) => [t.id, t.purpose]));
    start(f);
    expect(Object.fromEntries(Object.values(f.g.tanks).map((t) => [t.id, t.purpose]))).toEqual(purposes);
  });

  it('choosing another breed tank moves the pair there, and the line runs on', () => {
    const f = farm({ seed: 115 });
    const g = f.g;
    const line = start(f);
    const b2 = tank(g, 'Breed Tank 2', 9, 'g10');
    expect(setLineTank(g, line.id, 'breed', b2.id).ok).toBe(true);
    expect(f.father.tankId).toBe(b2.id);
    expect(f.mother.tankId).toBe(f.keep.id); // the betta female rests where she was
    run(g, 2);
    expect(line.broken).toBeUndefined();
    expect(lineStatus(line)).toBe('running');
  });

  it('a favourite leaves its batch and stays put; one-off notices are forgotten with what they were about', () => {
    const f = farm({ seed: 116 });
    const g = f.g;
    const line = start(f);
    // a raise tank too small for the brood: the fry stay, with one "full" notice keyed on the brood
    const tiny = tank(g, 'Tiny', 9, 'g5');
    expect(setLineTank(g, line.id, 'raise', tiny.id).ok).toBe(true);
    for (let i = 0; i < 6; i++) addCreature(g, createCreature(g, simRng(g), 'neon_tetra', { ageDays: 40 }), tiny.id);
    const cl = brood(f, 'fry', 20, 30);
    run(g, 2);
    expect(Object.keys(line.noticed ?? {})).toContain(`full:${cl.id}`);
    // the brood is raised where it is: its notice goes with it
    cl.nextStageHour = g.clock.hour;
    run(g, 3);
    expect(g.clutches[cl.id]).toBeUndefined();
    expect(Object.keys(line.noticed ?? {}).some((k) => k === `full:${cl.id}`)).toBe(false);
    // the young sort into a batch in the breed tank; a favourite among them is never moved to quarantine
    const batch = line.batches?.find((b) => !b.tankId);
    if (batch) {
      const fav = g.creatures[batch.creatureIds[0]];
      fav.favorite = true;
      const at = fav.tankId;
      run(g, 4);
      expect(line.batches?.some((b) => b.creatureIds.includes(fav.id)) ?? false).toBe(false);
      expect(fav.tankId).toBe(at);
    }
  });

  it('a sold extra quarantine tank leaves the line, so a save needs no repair', () => {
    const f = farm({ seed: 117 });
    const g = f.g;
    const line = start(f);
    const extra = addQuarantineTank(g, line.id, true);
    expect(extra.ok).toBe(true);
    deleteTank(g, extra.tankId!);
    run(g, 2);
    expect(line.tanks.quarantine).toEqual([f.qt.id]);
    expect(line.broken).toBeUndefined();
    const notes = repairState(structuredClone(g) as unknown as Parameters<typeof repairState>[0]);
    expect(notes.filter((n) => /quarantine/.test(n))).toEqual([]);
  });

  it('a tank listed for sale takes no new young from a line', () => {
    const f = farm({ seed: 118 });
    const g = f.g;
    start(f);
    const listed = createListing(g, { kind: 'tank', tankId: f.raise.id, reserve: 100, durationHours: 72 });
    expect(listed.ok, listed.message).toBe(true);
    const cl = brood(f, 'fry', 20, 30);
    run(g, 4);
    expect(g.clutches[cl.id]?.tankId).toBe(f.breed.id); // not moved into the listed grow-out
    expect(withdrawListing(g, listed.listingId!).ok).toBe(true);
    run(g, 2);
    expect(g.clutches[cl.id]?.tankId).toBe(f.raise.id);
  });

  it('a batch that lists only in part says so once and lists the rest when it can (no silent loss)', () => {
    const f = farm({ seed: 119 });
    const g = f.g;
    const line = start(f);
    brood(f, 'fry', 20, 6);
    run(g, 12);
    const batch = line.batches?.find((b) => b.tankId === f.qt.id);
    expect(batch).toBeDefined();
    const due = batch!.quarantinedHour! + QUARANTINE_HOURS;
    // the market can take one more listing only
    const fillers = tank(g, 'Fillers', 24, 'g40B');
    const rng = simRng(g);
    const active = () => g.market.listings.filter((l) => l.status === 'active').length;
    const fillerIds: string[] = [];
    while (active() < 23) {
      const c = addCreature(g, createCreature(g, rng, 'neon_tetra', { ageDays: 40 }), fillers.id);
      const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: 5, durationHours: 168 * 3 });
      expect(r.ok, r.message).toBe(true);
      fillerIds.push(r.listingId!);
    }
    run(g, due - g.clock.hour - 2);
    // two of the batch have grown up by the time quarantine ends: juveniles list as a batch, adults as a group
    const sp = getSpecies('betta');
    for (const id of batch!.creatureIds.slice(0, 2)) Object.assign(g.creatures[id], { bornHour: g.clock.hour - (sp.lifecycle.juvenileDays + 5) * 24, lifeStage: 'adult' });
    run(g, 3);
    expect(batch!.released).toBeFalsy();
    const said = g.log.filter((e) => /couldn't be listed: You can run up to 24 listings at once\./.test(e.text));
    expect(said.length).toBe(1);
    expect(said[0].text).toMatch(/^Betta line: 2 bettas couldn't be listed/);
    expect(batch!.listingIds?.length).toBe(1); // the juveniles listed
    expect(withdrawListing(g, fillerIds[0]).ok).toBe(true);
    run(g, 2);
    expect(batch!.released).toBe(true);
    expect(batch!.listingIds?.length).toBe(2);
    expect(g.log.filter((e) => /couldn't be listed/.test(e.text)).length).toBe(1);
  });

  it('a quarantine tank that isn’t cycled (below 0.4) holds the batch, says so once, and takes it once it has cycled', () => {
    const f = farm({ seed: 122 });
    const g = f.g;
    const line = start(f);
    f.qt.water.bioMaturity = 0.1; // an empty tank's bacteria starve: it needs cycling again
    brood(f, 'fry', 20, 6);
    run(g, 12);
    const waiting = line.batches?.find((b) => !b.tankId);
    expect(waiting).toBeDefined();
    run(g, 6);
    const said = g.log.filter((e) => e.text === 'Betta line: Quarantine isn’t cycled yet, so the juveniles wait in Grow-out.');
    expect(said.length).toBe(1);
    expect(lineView(g, line)!.quarantined.uncycledTank?.id).toBe(f.qt.id);
    // still cycling by the water report's own line (below 0.4 with animals: "Tank is still cycling"): it waits
    f.qt.water.bioMaturity = 0.35;
    run(g, 1);
    expect(waiting!.tankId).toBeUndefined();
    f.qt.water.bioMaturity = 0.5;
    run(g, 2);
    expect(waiting!.tankId).toBe(f.qt.id);
    expect(Object.keys(line.noticed ?? {}).some((k) => k.startsWith('cycle:'))).toBe(false);
  });

  it('a seeded quarantine tank bought for a waiting batch takes it the same day (it used to fall below "ready" within hours)', () => {
    const f = farm({ seed: 123 });
    const g = f.g;
    const line = start(f);
    const added = addQuarantineTank(g, line.id, true);
    expect(added.restartDay).toBeDefined();
    run(g, 48); // two idle days: the empty tank's bacteria decline a little
    expect(quarantineReady(g.tanks[added.tankId!])).toBe(true);
  });

  it('an added quarantine tank brings the restart forward (PROD-020)', () => {
    const f = farm({ seed: 120 });
    const g = f.g;
    const a = start(f, { breedFor: 'Cambodian Veiltail' });
    const p = secondPair(f);
    const rb = createLine(g, { motherId: p.f2.id, fatherId: p.m2.id, tanks: { breed: p.b2.id, raise: p.r2.id, quarantine: f.qt.id, keep: p.k2.id }, breedFor: 'Royal Blue Halfmoon' });
    expect(rb.ok, rb.message).toBe(true);
    const b = findLine(g, rb.lineId!)!;
    brood(f, 'fry', 20, 6);
    run(g, 12);
    expect(a.batches?.[0].tankId).toBe(f.qt.id);
    createClutch(g, { sp: getSpecies('betta'), tank: p.b2, mother: p.f2, father: p.m2, hour: g.clock.hour, stage: 'fry', count: 20, visual: 'fry_cloud', nextStageHour: g.clock.hour + 6 });
    run(g, 12);
    expect(b.batches?.some((bt) => !bt.tankId)).toBe(true); // waiting: the shared tank is busy
    const waitingUntil = restartDay(g, b);
    const today = Math.floor(g.clock.hour / 24) + 1;
    expect(waitingUntil).toBeGreaterThan(today);
    const added = addQuarantineTank(g, b.id, true);
    expect(added.ok).toBe(true);
    expect(added.restartDay).toBe(today);
    expect(restartDay(g, b)).toBeLessThan(waitingUntil);
    run(g, 2);
    expect(b.batches?.some((bt) => bt.tankId === added.tankId)).toBe(true);
  });

  it('with the settler running (background tanks owe hours), two identical runs end with an equal stateHash', () => {
    const scenario = () => {
      const f = farm({ seed: 121 });
      const g = f.g;
      start(f);
      brood(f, 'fry', 30, 6);
      const elsewhere = tank(g, 'Elsewhere', 30);
      for (let h = 0; h < QUARANTINE_HOURS + 24; h += 1.5) {
        care(g);
        advanceWorld(g, 1.5, { focusTankId: elsewhere.id }); // the line's tanks run on sim debt and settle for every move
      }
      return g;
    };
    const a = scenario();
    expect(stateHash(a)).toBe(stateHash(scenario()));
    expect(a.market.listings.some((l) => l.creatureIds.some((id) => a.creatures[id]?.lineage.motherId === a.production!.lines[0].pair.motherId))).toBe(true);
  });
});
