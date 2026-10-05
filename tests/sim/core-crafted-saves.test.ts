// @vitest-environment node
/**
 * lane:core (S0 review, PERSIST-004) — a crafted save can't use inherited Object keys ("__proto__", "constructor",
 * "toString", …) as ids. Before, repairState's plain lookups (`!!s.tanks[id]`) accepted them, the sim then wrote
 * through them on every tick (prototype pollution or a crash), and the next save was corrupted. A listing photo that
 * isn't an embedded image is dropped, so a save can't make the game fetch a remote URL.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { repairState } from '@/persistence/migrations';
import { findSpecies, getSpecies } from '@/data/species';
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

describe('crafted saves', () => {
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

  it('a second repair finds nothing left to fix', () => {
    const s = craftedSave();
    repairState(s);
    expect(repairState(s)).toEqual([]);
  });
});
