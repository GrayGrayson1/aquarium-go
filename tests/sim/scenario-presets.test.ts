// @vitest-environment node
/**
 * chunk 15 (LAB-003, LAB-007; ADR-0051 decision 4) — every built-in preset is a legal game: it builds with no error,
 * no warning and nothing repaired by the save path, has nothing non-finite, builds the same world twice, loads again
 * through the real save path, opens paused and plays a game day. And each one sets up what its name says.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { buildScenario, PRESETS, presetById, type BuildResult } from '@/dev/scenario';
import { encodeRecord, decodeRecord } from '@/persistence';
import { stateHash } from '@/persistence/hash';
import { advanceWorld } from '@/sim/world';
import { dayOf } from '@/sim/time';

const built = new Map<string, BuildResult>();
function build(id: string): BuildResult {
  let b = built.get(id);
  if (!b) {
    b = buildScenario(presetById(id)!.recipe, { fixtures: FIXTURES, now: 1_700_000_000_000 });
    built.set(id, b);
  }
  return b;
}
const fresh = (id: string) => structuredClone(build(id).state);
const alive = (g: GameState, tankId?: string) => Object.values(g.creatures).filter((c) => (c.status === 'alive' || c.status === 'listed') && (!tankId || c.tankId === tankId));

describe('LAB-007: the built-in presets', () => {
  it('has the owner’s four groups and a sandbox, each id unique', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(new Set(PRESETS.map((p) => p.group))).toEqual(new Set(['Start', 'Problems', 'Breeding', 'Showpieces', 'Running a business']));
    for (const id of ['ammonia-crisis', 'broke-hungry', 'crowded-aggressive', 'heater-stuck', 'betta-pair', 'clownfish-eggs', 'fry-tank', 'prismatic-reef', 'grand-hall', 'staffed-store', 'show-day', 'market-bids', 'sandbox']) expect(presetById(id), id).toBeDefined();
    expect(presetById('Ammonia crisis')?.id).toBe('ammonia-crisis'); // by name too
    expect(presetById('constructor')).toBeUndefined();
  });

  it.each(PRESETS.map((p) => p.id))('%s: a legal world, the same twice, paused, and it plays a day', (id) => {
    const b = build(id);
    // chunk 16 (ADR-0052 decision 6): the friend's real reef is a 210 (built here in the 180 that shares its footprint)
    // and keeps an emperor angelfish, which the sources want in 220 gallons or more once adult. The lab says so, as the
    // game would to a player: the one warning a built-in preset carries.
    const expected = id === 'friends-reef' ? [{ level: 'warning', at: 'tanks[0].animals[6].species', message: 'Emperor Angelfish need at least 220 gallons; "The 210" holds 180.' }] : [];
    expect(b.issues.filter((i) => i.level !== 'note')).toEqual(expected);
    expect(b.repairs).toEqual([]);
    expect(findNonFinite(b.state)).toEqual([]);
    expect(b.state.clock.speed).toBe(0);
    expect(b.state.isShowcase).toBe(false);
    expect(b.state.tankOrder.length).toBeGreaterThan(0);
    // the same recipe and seed, the same world
    expect(stateHash(buildScenario(presetById(id)!.recipe, { fixtures: FIXTURES }).state)).toBe(stateHash(b.state));
    // through the save path again: nothing to repair and nothing changed
    const again = decodeRecord(encodeRecord(b.state, 'auto').text);
    expect(again.repairs).toEqual([]);
    expect(stateHash(again.state)).toBe(stateHash(b.state));
    // a game day of play, and its save still loads clean
    const g = fresh(id);
    expect(() => {
      for (let h = 0; h < 24; h++) advanceWorld(g, 1, {});
    }).not.toThrow();
    expect(findNonFinite(g)).toEqual([]);
    expect(decodeRecord(encodeRecord(g, 'auto').text).repairs).toEqual([]);
  });
});

describe('LAB-007: each preset sets up what it says', () => {
  const tank = (g: GameState, name: string) => Object.values(g.tanks).find((t) => t.name === name)!;

  it('ammonia crisis: ammonia and nitrite up, the filter bacteria barely started', () => {
    const t = tank(build('ammonia-crisis').state, 'Community');
    expect(t.water.ammonia).toBe(1.6);
    expect(t.water.nitrite).toBe(0.6);
    expect(t.water.bioMaturity).toBe(0.12);
    expect(alive(build('ammonia-crisis').state, t.id)).toHaveLength(18);
  });

  it('broke shop: in debt, no food, starving animals', () => {
    const g = build('broke-hungry').state;
    expect(g.finance.money).toBe(-150);
    expect(Object.values(g.inventory.foods).every((n) => n === 0)).toBe(true);
    expect(alive(g).every((c) => c.stats.hunger >= 85)).toBe(true);
  });

  it('crowded tank: two male bettas and far too many fish in 20 gallons', () => {
    const g = build('crowded-aggressive').state;
    const t = tank(g, 'Brawl Tank');
    expect(alive(g, t.id).filter((c) => c.speciesId === 'betta' && c.sex === 'male')).toHaveLength(2);
    expect(t.cache.stockingLoad).toBeGreaterThan(1);
  });

  it('heater stuck on and a chiller stopped', () => {
    const g = build('heater-stuck').state;
    const heater = tank(g, 'Planted Tetras').equipment.find((e) => e.defId.startsWith('heater'))!;
    expect(heater).toMatchObject({ failed: true, failMode: 'stuck_on', on: true });
    expect(tank(g, 'Planted Tetras').water.tempC).toBe(30.5);
    expect(tank(g, 'Axolotl Grotto').equipment.find((e) => e.defId.startsWith('chiller'))).toMatchObject({ failed: true, failMode: 'off' });
  });

  it('betta pair: courting, the male’s nest built, the halfmoon morph', () => {
    const g = build('betta-pair').state;
    const [m, f] = alive(g, tank(g, 'Spawning Tank').id).sort((a) => (a.sex === 'male' ? -1 : 1));
    expect(m.sex).toBe('male');
    expect(f.sex).toBe('female');
    expect(m.repro.partnerId).toBe(f.id);
    expect(m.repro.nestProgress).toBe(1);
    expect(m.morphName).toBe('Royal Blue Halfmoon');
    expect(g.facility.food).toBeDefined(); // the Live food room
  });

  it('clownfish eggs: the pair has spawned (the build ran the hours it took)', () => {
    const b = build('clownfish-eggs');
    const cl = Object.values(b.state.clutches);
    expect(cl).toHaveLength(1);
    expect(cl[0].speciesId).toBe('ocellaris_clownfish');
    expect(b.hoursRun).toBeGreaterThan(0);
  });

  it('a tank of fry: thirty guppy fry, and shrimplets with their colony', () => {
    const g = build('fry-tank').state;
    const fry = Object.values(g.clutches).find((c) => c.tankId === tank(g, 'Fry Nursery').id)!;
    expect(fry).toMatchObject({ speciesId: 'fancy_guppy', stage: 'fry', count: 30 });
    expect(Object.values(g.clutches).find((c) => c.tankId === tank(g, 'Shrimp Colony').id)).toMatchObject({ speciesId: 'cherry_shrimp', count: 40 });
  });

  it('reef with one Prismatic clownfish, recorded as a find', () => {
    const g = build('prismatic-reef').state;
    const prism = alive(g).filter((c) => c.rareVariant);
    expect(prism.map((c) => [c.speciesId, c.name])).toEqual([['ocellaris_clownfish', 'Opal']]);
    expect(g.progress.prismaticFinds?.map((f) => f.creatureId)).toEqual([prism[0].id]);
  });

  it('grand hall: the biggest room, day 120, staff and a high reputation', () => {
    const g = build('grand-hall').state;
    expect(g.facility.level).toBe('grand_hall');
    expect(dayOf(g.clock.hour)).toBe(120);
    expect(g.staff?.roster).toHaveLength(5);
    expect(g.progress.reputation).toBe(850);
    expect(g.facility.openToPublic).toBe(true);
  });

  it('staffed store: two aquarists, a stock manager and a docent; open to the public', () => {
    const g = build('staffed-store').state;
    expect(g.staff?.roster.map((m) => m.role).sort()).toEqual(['aquarist', 'aquarist', 'docent', 'stock_manager']);
    expect(g.staff?.stockBudget).toBe(200);
    expect(g.facility.openToPublic).toBe(true);
  });

  it('show day: both animals entered, judging within the hour', () => {
    const g = build('show-day').state;
    const entries = g.shows!.entries.filter((e) => e.status === 'entered');
    expect(entries.map((e) => e.name).sort()).toEqual(['Mochi', 'Sapphire']);
    const show = g.shows!.shows.find((s) => s.id === entries[0].showId)!;
    expect(show.judgingHour - g.clock.hour).toBeCloseTo(1, 5);
    expect(g.clock.hour).toBeGreaterThan(show.deadlineHour);
  });

  it('market with bids: three listings with buyers’ bids waiting, and a Prismatic in the shop', () => {
    const g = build('market-bids').state;
    const open = g.market.listings.map((l) => l.bids.filter((x) => x.status === 'open').length);
    expect(open).toEqual([3, 2, 1]);
    expect(g.market.listings[1].bids.filter((x) => x.status === 'open').map((x) => x.amount)).toEqual([200, 240]);
    expect(g.market.stock[0].creatures[0].rareVariant?.kind).toBe('prismatic'); // the recipe's first offer, at the front
    expect(g.market.stock[1]).toMatchObject({ speciesId: 'neon_tetra', kind: 'group' });
  });

  it('sandbox: a million dollars, every unlock and every project, three empty tanks', () => {
    const g = build('sandbox').state;
    expect(g.finance.money).toBe(1_000_000);
    expect(g.progress.research.completed.length).toBeGreaterThanOrEqual(23);
    expect(alive(g)).toHaveLength(0);
    expect(g.progress.tutorial.done).toBe(true);
  });
});
