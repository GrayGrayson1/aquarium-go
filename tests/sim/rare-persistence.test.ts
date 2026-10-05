// @vitest-environment node
/**
 * lane:genetics — saves: pre-0.4 saves load unchanged (no animal turns Prismatic, finds are backfilled from the
 * collection, silently), Prismatic animals and offers round-trip exactly, a broken rare state is repaired
 * deterministically, and repeated loads agree byte for byte.
 */
import { afterEach, describe, it, expect } from 'vitest';
import type { Creature, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { generateOffer } from '@/sim/economy';
import { assignPrismatic, forcePrismatic, isPrismatic, recordFinds } from '@/sim/life';
import { encodeRecord, decodeRecord, stateHash } from '@/persistence';
import { migrateSave, repairState } from '@/persistence/migrations';
import { makeLegacyV0Save } from '@/persistence/legacy';

afterEach(() => {
  forcePrismatic('shop', 0);
  forcePrismatic('bred', 0);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const roundTrip = (g: GameState) => decodeRecord(encodeRecord(g, 'auto').text);

/** A save as 0.3.x wrote it: no strain / Prismatic lists, no rare state anywhere. */
function pre04(g: GameState): Json {
  const s: Json = JSON.parse(JSON.stringify(g));
  delete s.progress.discoveredStrains;
  delete s.progress.prismaticFinds;
  for (const c of Object.values(s.creatures) as Json[]) delete c.rareVariant;
  for (const o of s.market.stock as Json[]) for (const c of o.creatures) delete c.rareVariant;
  return s;
}

describe('pre-0.4 saves', () => {
  it('load with every animal ordinary and the finds derived from the collection, silently', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Old', seed: 11 });
    const d = roundTrip(pre04(g));
    expect(Object.values(d.state.creatures).some((c) => isPrismatic(c))).toBe(false);
    expect(d.state.market.stock.some((o) => o.creatures.some((c) => isPrismatic(c)))).toBe(false);
    expect(d.state.progress.discoveredStrains).toEqual(g.progress.discoveredStrains);
    expect(d.state.progress.prismaticFinds).toEqual([]);
    expect(d.repairs).toEqual([]);
  });

  it('repeated loads agree, and a loaded save never changes on the next load', () => {
    const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Old', seed: 12 });
    const once = roundTrip(pre04(g));
    const twice = roundTrip(once.state);
    expect(stateHash(twice.state)).toBe(stateHash(once.state));
    expect(twice.repairs).toEqual([]);
  });

  it('the legacy v0 fixture migrates with backfilled finds and empty counters', () => {
    const s = makeLegacyV0Save();
    expect(s.progress.discoveredStrains).toBeUndefined();
    const out = migrateSave(s);
    expect(Array.isArray(out.state.progress.discoveredStrains)).toBe(true);
    expect(out.state.progress.prismaticFinds).toEqual([]);
    expect(out.state.progress.counters).toEqual({});
    expect(repairState(out.state)).toEqual([]);
  });

  it('backfill records strains and Prismatic animals already in the collection, oldest first', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Opal', seed: 13 });
    const starter = Object.values(g.creatures).find((c) => c.isStarter)!;
    // a save without the lists whose collection already holds a Prismatic (e.g. written by a dev build)
    const s = pre04(g);
    s.creatures[starter.id].rareVariant = { kind: 'prismatic', origin: 'shop', visualSeed: 4242 };
    const back = roundTrip(s);
    expect(back.state.creatures[starter.id].rareVariant).toEqual({ kind: 'prismatic', origin: 'shop', visualSeed: 4242 });
    expect(back.state.progress.prismaticFinds?.map((f) => f.creatureId)).toEqual([starter.id]);
    expect(back.repairs).toEqual([]);
  });
});

describe('Prismatic state in saves', () => {
  function prismaticWorld(): { g: GameState; starter: Creature } {
    const g = newGame({ starterId: 'betta', starterName: 'Opal', seed: 21 });
    const starter = Object.values(g.creatures).find((c) => c.isStarter)!;
    forcePrismatic('shop', 1);
    assignPrismatic(g, starter, 'shop');
    recordFinds(g, starter);
    forcePrismatic('shop', 1);
    const o = generateOffer(g, simRng(g), 'betta', { expiresHour: g.clock.hour + 48 })!;
    g.market.stock.unshift(o);
    return { g, starter };
  }

  it('an owned Prismatic and a Prismatic offer round-trip exactly (visual seed included)', () => {
    const { g, starter } = prismaticWorld();
    const d = roundTrip(g);
    expect(d.state.creatures[starter.id].rareVariant).toEqual(starter.rareVariant);
    expect(d.state.market.stock[0].creatures[0].rareVariant).toEqual(g.market.stock[0].creatures[0].rareVariant);
    expect(d.state.progress.prismaticFinds).toEqual(g.progress.prismaticFinds);
    expect(d.repairs).toEqual([]);
    // the first save stamps save metadata; from then on every load is byte-identical (as core-persistence checks)
    const twice = roundTrip(d.state);
    expect(stateHash(twice.state)).toBe(stateHash(d.state));
    expect(twice.state.creatures[starter.id].rareVariant).toEqual(starter.rareVariant);
  });

  it('a broken rare state is repaired deterministically (and repair is idempotent)', () => {
    const { g, starter } = prismaticWorld();
    const s: Json = JSON.parse(JSON.stringify(g));
    s.creatures[starter.id].rareVariant = { kind: 'prismatic', origin: 'mystery', visualSeed: 'shiny' };
    s.market.stock[0].creatures[0].rareVariant = { kind: 'glitter', origin: 'shop', visualSeed: 5 };
    const a = migrateSave(JSON.parse(JSON.stringify(s)));
    const b = migrateSave(JSON.parse(JSON.stringify(s)));
    const fixed = a.state.creatures[starter.id].rareVariant!;
    expect(fixed.kind).toBe('prismatic');
    expect(fixed.origin).toBe('shop');
    expect(Number.isInteger(fixed.visualSeed) && fixed.visualSeed > 0).toBe(true);
    expect(b.state.creatures[starter.id].rareVariant).toEqual(fixed);
    expect(a.state.market.stock[0].creatures[0].rareVariant).toBeUndefined();
    expect(a.repairs.some((r) => /rareVariant/.test(r))).toBe(true);
    expect(repairState(a.state)).toEqual([]);
  });
});
