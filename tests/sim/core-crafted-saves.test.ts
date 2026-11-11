// @vitest-environment node
/**
 * lane:core (S0 review, PERSIST-004) — a crafted save can't use inherited Object keys ("__proto__", "constructor",
 * "toString", …) as ids. Before, repairState's plain lookups (`!!s.tanks[id]`) accepted them, the sim then wrote
 * through them on every tick (prototype pollution or a crash), and the next save was corrupted. A listing photo that
 * isn't an embedded image is dropped, so a save can't make the game fetch a remote URL. The legacy v0 migration builds
 * its tank record without a prototype, so a tank id can't set one (security-data-2 I2).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { migrateSave, repairState } from '@/persistence/migrations';
import { makeLegacyV0Save } from '@/persistence/legacy';
import { findSpecies, getSpecies } from '@/data/species';
import { facilityStore } from '@/dev/fixtures/facility';
import type { GameState } from '@/types';

type Json = Record<string, any>;

/** A save whose JSON text carries an own "__proto__" tank (object literals can't express that; JSON.parse can). */
function craftedSave(): Json {
  const g = newGame({ starterId: 'betta', starterName: 'Crafty', seed: 4242 });
  const tankId = g.tankOrder[0];
  const creatureId = Object.keys(g.creatures)[0];
  const text = JSON.stringify(g);
  const tankJson = JSON.stringify(g.tanks[tankId]);
  const s = JSON.parse(text.replace('"tanks":{', `"tanks":{"__proto__":${tankJson},`)) as Json;
  s.tankOrder = [...s.tankOrder, 'toString', '__proto__'];
  s.creatures[creatureId].tankId = 'constructor';
  s.clutches.cl_crafted = { id: 'cl_crafted', tankId: 'hasOwnProperty', speciesId: 'betta', count: 5, survival: 1, nextStageHour: 10 };
  s.market.listings.push(
    { id: 'ls_remote', status: 'active', kind: 'creature', creatureIds: ['__proto__', creatureId], bids: [], snapshot: { photo: 'https://tracker.example/pixel.png' } },
    { id: 'ls_ok', status: 'active', kind: 'creature', creatureIds: [creatureId], bids: [], snapshot: { photo: 'data:image/png;base64,iVBORw0KGgo=' } },
  );
  return s;
}

const POLLUTION_KEYS = ['simDebtHours', 'water', 'creatures', 'lighting'];

afterEach(() => {
  for (const k of POLLUTION_KEYS) delete (Object.prototype as Json)[k];
});

describe('PERSIST-011: crafted saves', () => {
  it('the species registry only finds its own ids', () => {
    expect(findSpecies('constructor')).toBeUndefined();
    expect(findSpecies('__proto__')).toBeUndefined();
    expect(findSpecies('toString')).toBeUndefined();
    expect(() => getSpecies('hasOwnProperty')).toThrow(/Unknown species/);
    expect(findSpecies('betta')?.id).toBe('betta');
  });

  it('repairState drops inherited-key ids and the world then steps without polluting Object.prototype', () => {
    const s = craftedSave();
    const repairs = repairState(s);
    expect(Object.hasOwn(s.tanks, '__proto__')).toBe(false);
    expect(s.tankOrder).not.toContain('toString');
    expect(s.tankOrder).not.toContain('__proto__');
    const moved = Object.values(s.creatures as Json).find((c: Json) => c.tankId === 'constructor');
    expect(moved).toBeUndefined();
    expect(s.clutches.cl_crafted).toBeUndefined();
    expect(s.market.listings.find((l: Json) => l.id === 'ls_remote').creatureIds).not.toContain('__proto__');
    expect(repairs.some((r) => r.includes('not a valid id'))).toBe(true);

    expect(() => advanceWorld(s as GameState, 6, {})).not.toThrow();
    for (const k of POLLUTION_KEYS) expect(Object.hasOwn(Object.prototype, k), `Object.prototype.${k}`).toBe(false);
  });

  it('listing photos must be embedded images', () => {
    const s = craftedSave();
    const repairs = repairState(s);
    const remote = s.market.listings.find((l: Json) => l.id === 'ls_remote');
    const ok = s.market.listings.find((l: Json) => l.id === 'ls_ok');
    expect(remote.snapshot.photo).toBeUndefined();
    expect(ok.snapshot.photo).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(repairs.some((r) => r.includes('ls_remote') && r.includes('photo'))).toBe(true);
  });

  it('SD-1: a record keeps its key as its own id, and an id reference to an inherited name is cleared', () => {
    const s = craftedSave();
    const tankId = s.tankOrder[0];
    const creatureId = Object.keys(s.creatures)[0];
    // Path A: a clutch under a safe key whose own id is "__proto__" (the sim re-reads state.clutches[cl.id]).
    s.clutches.cl_own = { id: '__proto__', tankId, speciesId: 'betta', count: 3, survival: 1, nextStageHour: 10 };
    // Path B: a creature's clutch reference names an inherited property.
    s.creatures[creatureId].repro = { ...s.creatures[creatureId].repro, clutchId: '__proto__', partnerId: 'constructor' };
    s.progress.research = { progressHours: 1, completed: [], activeId: 'toString' };
    s.tanks[tankId].equipment.push({ id: 'eq_bad', defId: 'constructor', installedHour: 0, condition: 1, on: true });
    const repairs = repairState(s);
    expect(s.clutches.cl_own.id).toBe('cl_own');
    expect(s.creatures[creatureId].repro.clutchId).toBeNull();
    expect(s.creatures[creatureId].repro.partnerId).toBeNull();
    expect(s.progress.research.activeId).toBeUndefined();
    expect(s.tanks[tankId].equipment.some((e: Json) => e.id === 'eq_bad')).toBe(false);
    expect(repairs.some((r) => r.includes('clutchId'))).toBe(true);
    expect(() => advanceWorld(s as GameState, 24, {})).not.toThrow();
    for (const k of POLLUTION_KEYS) expect(Object.hasOwn(Object.prototype, k), `Object.prototype.${k}`).toBe(false);
  });

  it('a second repair finds nothing left to fix', () => {
    const s = craftedSave();
    repairState(s);
    expect(repairState(s)).toEqual([]);
  });

  it('legacy v0: a tank id of "__proto__" never sets a prototype on the tank record', () => {
    const v0 = makeLegacyV0Save();
    const oldId = v0.tanks[0].id;
    v0.tanks[0].id = '__proto__';
    for (const c of Object.values(v0.creatures) as Json[]) if (c.tankId === oldId) c.tankId = '__proto__';
    const { state, repairs } = migrateSave(v0);
    const tanks = state.tanks as Json;
    expect(Object.getPrototypeOf(tanks), 'the tank record kept a plain prototype').toBe(Object.prototype);
    for (const k in tanks) expect(Object.hasOwn(tanks, k), `inherited key ${k}`).toBe(true);
    expect(Object.hasOwn(tanks, '__proto__')).toBe(false);
    expect(Object.values(state.creatures).every((c) => c.tankId !== '__proto__')).toBe(true);
    expect(repairs.some((r) => r.includes('"__proto__"'))).toBe(true);
    expect(repairState(state)).toEqual([]);
    expect(() => advanceWorld(state, 6, {})).not.toThrow();
    for (const k of POLLUTION_KEYS) expect(Object.hasOwn(Object.prototype, k), `Object.prototype.${k}`).toBe(false);
  });
});

/**
 * BACKLOG B-210 — a save `repairState` passed that then threw on every step: a `visitors.live` the visitor sim can't
 * step with, and room fixtures the layout can't read. An open shop, so the visitor sim and the layout both run.
 */
describe('B-210: a save whose visitors or fixtures are unreadable still steps', () => {
  /** An aquarium store open to the public, a few hours in (so `visitors.live` is there), as a save's JSON gives it. */
  const openShop = (): Json => {
    const g = facilityStore();
    advanceWorld(g, 3, {});
    return JSON.parse(JSON.stringify(g)) as Json;
  };
  const steps = (s: Json) => () => {
    for (let i = 0; i < 48; i++) advanceWorld(s as GameState, 0.5, {});
  };

  it('a healthy open shop needs no repair and keeps its live visitors and its fixtures', () => {
    const s = openShop();
    const before = JSON.stringify({ live: s.visitors.live, fixtures: s.facility.fixtures });
    expect(s.visitors.live, 'the fixture has live visitors').toBeTypeOf('object');
    expect(s.facility.fixtures.length, 'the fixture has furniture').toBeGreaterThan(0);
    expect(repairState(s)).toEqual([]);
    expect(JSON.stringify({ live: s.visitors.live, fixtures: s.facility.fixtures })).toBe(before);
    expect(steps(s)).not.toThrow();
  });

  it.each<[string, (s: Json) => void]>([
    ['a number', (s) => (s.visitors.live = 5)],
    ['a string', (s) => (s.visitors.live = 'crowded')],
    ['a list', (s) => (s.visitors.live = [])],
    ['null', (s) => (s.visitors.live = null)],
    ['an empty object', (s) => (s.visitors.live = {})],
    ['a mix that is not a record', (s) => (s.visitors.live.mix = 4)],
    ['a mix with a share that is not a number', (s) => (s.visitors.live.mix = { family: 'most' })],
    ['a warnedHour that is not a record', (s) => (s.visitors.live.warnedHour = 3)],
    ['an unreachable list that is not one', (s) => (s.visitors.live.unreachable = 'tank_1')],
    ['a count that is not a number', (s) => (s.visitors.live.occupancy = 'many')],
    ['takings JSON wrote as null', (s) => (s.visitors.live.pendingAdmission = null)],
    ['a friend that is not a visit', (s) => (s.visitors.live.friend = 3)],
    ['a reaction budget that is not a number', (s) => (s.visitors.live.reactionBudget = 'x')],
  ])('visitors.live as %s is dropped, made again by the sim, and the world steps', (_name, damage) => {
    const s = openShop();
    damage(s);
    expect(repairState(s)).toEqual(['visitors.live: unreadable, reset']);
    expect(s.visitors.live).toBeUndefined();
    expect(steps(s)).not.toThrow();
    expect(Number.isFinite(s.visitors.live.occupancy) && Number.isFinite(s.visitors.live.pendingAdmission)).toBe(true);
    expect(repairState(s), 'a second repair finds nothing').toEqual([]);
  });

  it.each<[string, unknown]>([
    ['a number', 7],
    ['null', null],
    ['an object', { 0: { id: 'a', kind: 'bench', x: 0, z: 0, rotY: 0 } }],
  ])('fixtures as %s start again as an empty list, and the world steps', (_name, value) => {
    const s = openShop();
    s.facility.fixtures = value;
    expect(repairState(s)).toEqual(['facility.fixtures: rebuilt']);
    expect(s.facility.fixtures).toEqual([]);
    expect(steps(s)).not.toThrow();
  });

  it('unreadable fixtures are dropped from the list, the readable ones kept in order, and the world steps', () => {
    const s = openShop();
    const good = s.facility.fixtures.map((f: Json) => ({ ...f }));
    s.facility.fixtures = [
      1,
      good[0],
      {},
      null,
      { id: 'no_place', kind: 'bench', x: 'left', z: null, rotY: 0 },
      { id: 'no_turn', kind: 'bench', x: 0, z: 0 },
      { id: 7, kind: 'bench', x: 0, z: 0, rotY: 0 },
      { id: '__proto__', kind: 'bench', x: 0, z: 0, rotY: 0 },
      { id: 'no_kind', x: 0, z: 0, rotY: 0 },
      ...good.slice(1),
    ];
    // the inherited-name id goes with PERSIST-011's own scrub, the other seven here
    expect(repairState(s)).toEqual(['facility.fixtures: invalid ids removed', 'facility.fixtures: 7 unreadable removed']);
    expect(s.facility.fixtures).toEqual(good);
    expect(steps(s)).not.toThrow();
    expect(repairState(s), 'a second repair finds nothing').toEqual([]);
  });

  it('a fixture of a kind this build does not know is kept (a newer build may have placed it) and the world steps', () => {
    const s = openShop();
    const later = { id: 'fixture_later', kind: 'koi_fountain', x: 0.5, z: 0.5, rotY: 0 };
    s.facility.fixtures.push(later);
    expect(repairState(s)).toEqual([]);
    expect(s.facility.fixtures.at(-1)).toEqual(later);
    expect(steps(s)).not.toThrow();
  });
});
