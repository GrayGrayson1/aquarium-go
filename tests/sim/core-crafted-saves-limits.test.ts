// @vitest-environment node
/**
 * chunk 6 (PERSIST-004; B-004, B-010, B-012, B-122's leftovers, B-198) — a crafted or corrupted save can't crash the sim
 * loop or slow loading to a crawl:
 * - A1: lists far longer than play makes (100,000 discovered morphs, log events and closed listings; 20,000 animals in
 *   one tank) load through decodeRecord, migrateSave and repairState in under 2 s each, trimmed or de-duplicated with a
 *   note, and the world steps a game day. (The bounds are chunk 6's: the Grand Hall's maximum-scale save holds 500
 *   animals, PERSIST-005; the sim keeps 300 log events and 40 closed listings.)
 * - A2: unreadable numbers (1e999 parses to Infinity, null where a number goes), negative stock (food and salt), a
 *   negative clock and a birth after the clock are reset or clamped with a note; nothing non-finite is left anywhere;
 *   the world steps a day. Debt (negative money) is real play: kept.
 * - A3: a water class, buyer archetype, show tier, staff role or staff trait the tables don't know (an inherited name
 *   crashed every tick; an unknown role threw at payday) is repaired with a note, and the tables themselves have no
 *   prototype (B-010).
 * - A4: fastMutate's copy takes only own keys.
 * - A5: a second repair finds nothing.
 * - B-198: a NaN health never reads as a death.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { encodeRecord, decodeRecord } from '@/persistence';
import { migrateSave, repairState } from '@/persistence/migrations';
import { share } from '@/game/fastMutate';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { clonePlain } from '@/sim/economy/util';
import { CLASS_DEFAULTS } from '@/sim/water/constants';
import { BUYER_ARCHETYPES } from '@/data/buyers';
import { SHOW_TIERS } from '@/data/shows';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { TUTORIAL_CHAINS } from '@/data/quests';
import { NEUTRAL_HEALTH } from '@/sim/life/step';
import { addStaffDirect, refreshCandidates } from '@/sim/staff';
import { STAFF_ROLES, STAFF_TRAITS } from '@/data/staff';
import type { GameState } from '@/types';
import { budget } from './support/timeBudget';

type Json = Record<string, any>;
const game = (seed = 3) => newGame({ starterId: 'betta', starterName: 'Crafty', seed }) as unknown as Json;

/** Encode, then decode + migrate + repair (timed), then step a game day. */
function load(g: Json): { s: GameState; repairs: string[]; ms: number } {
  const { text } = encodeRecord(g as GameState, 'auto');
  const t0 = performance.now();
  const r = decodeRecord(text);
  const ms = performance.now() - t0;
  for (let i = 0; i < 24; i++) advanceWorld(r.state, 1, {});
  return { s: r.state, repairs: r.repairs, ms };
}

/**
 * A hand-made save file (values the serializer never writes), parsed and loaded through migrateSave and repairState
 * (decodeRecord's checksum would refuse an edited record, as it should), then stepped a game day.
 */
function loadText(g: Json, edit: (json: string) => string): { s: GameState; repairs: string[] } {
  const r = migrateSave(JSON.parse(edit(JSON.stringify(g))));
  for (let i = 0; i < 24; i++) advanceWorld(r.state, 1, {});
  return { s: r.state, repairs: r.repairs };
}

describe('A1: oversized lists load in bounded time, trimmed with a note', () => {
  it('100,000 discovered morphs (half of them repeats): de-duplicated, then cut to 20,000', () => {
    const g = game();
    g.progress.discoveredMorphs = Array.from({ length: 100_000 }, (_, i) => `betta:Morph ${i % 50_000}`);
    const { s, repairs, ms } = load(g);
    expect(ms).toBeLessThan(budget(2000));
    expect(s.progress.discoveredMorphs.length).toBe(20_000);
    expect(new Set(s.progress.discoveredMorphs).size).toBe(20_000);
    expect(repairs.some((r) => r.startsWith('progress.discoveredMorphs:'))).toBe(true);
  });

  it('100,000 log events: the newest 300 are kept', () => {
    const g = game();
    const e = { kind: 'info', text: 'x', hour: 0 };
    g.log = Array.from({ length: 100_000 }, (_, i) => ({ ...e, id: `ev_${i}` }));
    const { s, repairs, ms } = load(g);
    expect(ms).toBeLessThan(budget(2000));
    expect(s.log.length).toBeLessThanOrEqual(300);
    expect(s.log.some((x) => x.id === 'ev_99999')).toBe(true);
    expect(repairs).toContain('log: 99700 oldest events removed');
  });

  it('100,000 closed listings: the newest 1,000 are kept, open ones are never touched', () => {
    const g = game();
    g.market.listings = [
      ...Array.from({ length: 100_000 }, (_, i) => ({ id: `l${i}`, status: 'expired', kind: 'creature', creatureIds: [], bids: [] })),
      { id: 'l_open', status: 'active', kind: 'creature', creatureIds: [], bids: [] },
    ];
    // what the repair keeps, before any market step (the fresh review: the name promised more than the test checked)
    const kept = clonePlain(g);
    repairState(kept);
    const closed = (kept.market.listings as Json[]).filter((l) => l.status !== 'active').map((l) => l.id);
    expect(closed).toHaveLength(1000);
    expect([closed[0], closed.at(-1)]).toEqual(['l99000', 'l99999']); // the newest (the list runs oldest first)
    expect((kept.market.listings as Json[]).filter((l) => l.status === 'active').map((l) => l.id)).toEqual(['l_open']);
    const { s, repairs, ms } = load(g);
    expect(ms).toBeLessThan(budget(2000));
    expect(s.market.listings.filter((l) => l.status !== 'active').length).toBeLessThanOrEqual(1000);
    expect(repairs).toContain('market.listings: 99000 oldest closed listings removed');
  });

  it('20,000 animals in one tank load in under 2 s, and the world steps a day', () => {
    const g = game();
    const tank = g.tankOrder[0];
    const c0 = Object.values(g.creatures)[0] as Json;
    for (let i = 0; i < 20_000; i++) g.creatures[`cx${i}`] = { ...clonePlain(c0), id: `cx${i}`, tankId: tank };
    const { s, ms } = load(g);
    expect(ms).toBeLessThan(budget(2000));
    expect(Object.keys(s.creatures).length).toBeGreaterThanOrEqual(20_000);
    expect(findNonFinite(s)).toEqual([]);
  });

  it('a list of several hundred thousand invalid ids is cleaned without a RangeError (B-012)', () => {
    const g = game();
    g.progress.unlocked = [...(g.progress.unlocked as string[]), ...new Array(300_000).fill('toString')];
    const { s, repairs } = load(g);
    expect(s.progress.unlocked.includes('toString')).toBe(false);
    expect(repairs.some((r) => r.includes('invalid ids removed'))).toBe(true);
  });
});

describe('A2: unreadable numbers and negative stock', () => {
  it('Infinity, null and negative counts are reset with a note; nothing non-finite is left; debt is kept', () => {
    const g = game();
    const food = Object.keys(g.inventory.foods)[0];
    const tank = g.tankOrder[0];
    g.inventory.foods[food] = -7;
    const { s, repairs } = loadText(g, (json) => {
      const o = JSON.parse(json);
      o.finance.money = '__INF__';
      o.clock.hour = null;
      o.tanks[tank].water.temp = '__INF__';
      o.progress.reputation = '__INF__';
      return JSON.stringify(o).replaceAll('"__INF__"', '1e999');
    });
    expect(repairs).toContain('finance.money: Infinity → 0');
    expect(repairs).toContain('clock.hour: null → 8');
    expect(repairs).toContain(`inventory.foods.${food}: -7 → 0`);
    expect(repairs.some((r) => /tank .*\.water\.temp|\.water\.temp: Infinity/.test(r))).toBe(true);
    expect(findNonFinite(s)).toEqual([]);

    const debt = clonePlain(game());
    debt.finance.money = -250;
    expect(repairState(debt).some((r) => r.startsWith('finance.money'))).toBe(false);
    expect(debt.finance.money).toBe(-250);
  });

  it('negative salt, a negative clock and a birth after the clock are clamped with a note', () => {
    const g = game();
    const id = Object.keys(g.creatures)[0];
    g.inventory.salt = -3;
    g.creatures[id].bornHour = g.clock.hour + 500;
    const ahead = clonePlain(g);
    const { s, repairs } = load(g);
    expect(repairs).toContain('inventory.salt: -3 → 0');
    expect(repairs).toContain(`creature ${id}.bornHour: ${ahead.clock.hour + 500} after the clock → ${ahead.clock.hour}`);
    expect(s.inventory.salt).toBeGreaterThanOrEqual(0);
    expect(s.creatures[id].bornHour).toBeLessThanOrEqual(s.clock.hour);

    const early = clonePlain(game());
    early.clock.hour = -40;
    const notes = repairState(early);
    expect(notes).toContain('clock.hour: -40 → 8');
    expect(early.clock.hour).toBe(8);
  });
});

describe('A3: values the tables don’t know (B-004, B-010)', () => {
  it.each(['toString', 'lava'])('a water class %j is reset by environment, with a note, and the world steps', (wc) => {
    const g = game();
    const tank = g.tankOrder[0];
    g.tanks[tank].waterClass = wc;
    const { s, repairs } = load(g);
    expect(s.tanks[tank].waterClass).toBe('freshwater_tropical');
    expect(repairs).toContain(`tank ${tank}.waterClass: ${wc} unknown → freshwater_tropical`);
  });

  it('a buyer of an unknown archetype is removed, and a show of an unknown tier, with a note each', () => {
    const g = game();
    g.market.buyers = [...(g.market.buyers as Json[]), { id: 'b_bad', archetype: 'constructor', name: 'X', budget: 100 }];
    g.shows = { shows: [{ id: 'sh_bad', tier: 'toString', status: 'open', judgingHour: g.clock.hour + 2, deadlineHour: g.clock.hour + 1, classes: [] }], entries: [{ id: 'e1', tier: 'galactic', status: 'judged' }], trophies: [], tankAwards: {}, stats: {}, rng: 1, seq: 0 };
    const { s, repairs } = load(g);
    expect(s.market.buyers.some((b) => b.id === 'b_bad')).toBe(false);
    expect(repairs).toContain('market.buyers: 1 with an unknown archetype removed');
    expect(repairs).toContain('shows.shows: 1 of an unknown tier removed');
    expect(repairs.some((r) => r.startsWith('shows entry e1: tier galactic removed'))).toBe(true);
  });

  it.each(['toString', 'janitor'])('a team member and a candidate of role %j are removed with a note; payday runs', (role) => {
    const g = game() as unknown as GameState;
    g.facility.level = 'aquarium_store';
    const keep = addStaffDirect(g, { name: 'Rosa Duarte', role: 'aquarist', skill: 2, trait: 'meticulous' });
    const odd = addStaffDirect(g, { name: 'Ivo Lind', role: 'aquarist', skill: 2, trait: 'meticulous' });
    refreshCandidates(g, g.clock.hour);
    (odd as Json).role = role;
    (g.staff!.candidates[0] as Json).role = role;
    const { s, repairs } = load(g as unknown as Json); // the load steps a day: midnight pays the wages
    expect(repairs).toContain('staff.roster: 1 with an unknown role removed');
    expect(repairs).toContain('staff.candidates: 1 with an unknown role removed');
    expect(s.staff!.roster.map((m) => m.id)).toEqual([keep.id]);
  });

  it('an unknown trait becomes the trait every role can have, with a note', () => {
    const g = game() as unknown as GameState;
    g.facility.level = 'aquarium_store';
    const m = addStaffDirect(g, { name: 'Rosa Duarte', role: 'stock_manager', skill: 2, trait: 'quick_learner' });
    (m as Json).trait = 'hasOwnProperty';
    const { s, repairs } = load(g as unknown as Json);
    expect(repairs).toContain(`staff ${m.id}: trait hasOwnProperty unknown → quick_learner`);
    expect(s.staff!.roster[0].trait).toBe('quick_learner');
    expect(STAFF_TRAITS.quick_learner.roles).toEqual(Object.keys(STAFF_ROLES));
  });

  it('the save-keyed tables have no prototype: an inherited name finds nothing', () => {
    for (const t of [CLASS_DEFAULTS, BUYER_ARCHETYPES, SHOW_TIERS, UNLOCK_RULE_BY_KEY, TUTORIAL_CHAINS, STAFF_ROLES, STAFF_TRAITS] as Json[]) {
      expect(Object.getPrototypeOf(t)).toBeNull();
      expect(t.toString).toBeUndefined();
      expect(t.constructor).toBeUndefined();
    }
  });
});

describe('A4: fastMutate’s copy takes only own keys (B-122)', () => {
  afterEach(() => {
    delete (Object.prototype as Json).polluted;
  });
  it('an enumerable inherited name never becomes part of the copy', () => {
    (Object.prototype as Json).polluted = 'yes';
    const out = share(undefined, { a: 1, nested: { b: 2 } }) as Json;
    expect(Object.hasOwn(out, 'polluted')).toBe(false);
    expect(Object.hasOwn(out.nested, 'polluted')).toBe(false);
    expect(out).toEqual({ a: 1, nested: { b: 2 } });
  });
});

describe('A5: a second repair finds nothing', () => {
  it('after every crafted case above, repairing again changes nothing', () => {
    const g = game();
    g.tanks[g.tankOrder[0]].waterClass = 'toString';
    g.inventory.foods[Object.keys(g.inventory.foods)[0]] = -1;
    g.log = Array.from({ length: 5000 }, (_, i) => ({ id: `ev_${i}`, kind: 'info', text: 'x', hour: 0 }));
    g.inventory.salt = -2;
    g.creatures[Object.keys(g.creatures)[0]].bornHour = g.clock.hour + 9;
    g.staff = { roster: [{ id: 'st_x', name: 'X', role: 'toString', skill: 1, trait: 'quick_learner', wage: 60, avatarSeed: 1, hiredHour: 0, xp: 0, tankIds: [] }], candidates: [] };
    const first = repairState(g);
    expect(first.length).toBeGreaterThan(0);
    expect(repairState(g)).toEqual([]);
  });
});

describe('B-198: a NaN health is never a death', () => {
  it('an animal whose health turns NaN keeps a neutral health and lives', () => {
    const g = game() as unknown as GameState;
    const c = Object.values(g.creatures)[0];
    c.stats.health = Number.NaN;
    advanceWorld(g, 1, {});
    expect(c.status).toBe('alive');
    expect(Number.isFinite(c.stats.health)).toBe(true);
    expect(c.stats.health).toBeGreaterThan(0);
    expect(NEUTRAL_HEALTH).toBe(90);
    expect(g.log.some((e) => /passed away/.test(e.text ?? ''))).toBe(false);
  });
});
