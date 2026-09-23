/**
 * Builders shared by the core Vitest suites (tests/sim/core-*.test.ts). OWNER: lane "core".
 * Pure: no React / DOM. Deterministic for a given seed.
 */
import type { GameState, Listing, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { addPlacedTank, stockTank, decorateTank, finishTank, speciesForClass, ensureFacility } from './core-helpers';

/** A save exercising lineage, breeding state, a clutch and a listing with bids. */
export function richSaveState(seed = 4242): GameState {
  const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Tango', seed });
  g.isShowcase = false;
  const tankId = g.tankOrder[0];
  const [a, b] = stockTank(g, tankId, [{ species: 'ocellaris_clownfish', count: 2 }]);
  const kid = createCreature(g, simRng(g), 'ocellaris_clownfish', {
    motherId: a.id,
    fatherId: b.id,
    generation: 1,
    lineId: 'nemo-line',
    breederName: 'Your shop',
    ageDays: 3,
  });
  addCreature(g, kid, tankId);
  a.repro = { ...a.repro, stage: 'guarding', partnerId: b.id, lastSpawnHour: g.clock.hour - 5, clutchId: 'cl_test', totalClutches: 2, carryingUntilHour: g.clock.hour + 30 };
  b.repro = { ...b.repro, stage: 'guarding', partnerId: a.id, rank: 1 };
  g.clutches.cl_test = {
    id: 'cl_test',
    speciesId: 'ocellaris_clownfish',
    tankId,
    motherId: a.id,
    fatherId: b.id,
    laidHour: g.clock.hour - 5,
    stage: 'eggs',
    count: 240,
    nextStageHour: g.clock.hour + 100,
    survival: 0.8,
    guardedById: b.id,
    anchor: { x: 0.1, y: 0.05, z: -0.05 },
    visual: 'eggs_adhesive',
  };
  const listing: Listing = {
    id: 'lst_test',
    kind: 'creature',
    title: 'Tango Jr — captive bred',
    creatureIds: [kid.id],
    reserve: 30,
    buyNow: 80,
    createdHour: g.clock.hour,
    endsHour: g.clock.hour + 48,
    status: 'active',
    bids: [
      { id: 'bid_1', buyerId: 'buyer_1', amount: 45, message: 'Lovely fish!', createdHour: g.clock.hour + 1, expiresHour: g.clock.hour + 12, status: 'open' },
      { id: 'bid_2', buyerId: 'buyer_2', amount: 52, message: 'I can do better.', createdHour: g.clock.hour + 2, expiresHour: g.clock.hour + 14, status: 'countered', counterAmount: 60 },
    ],
    interest: 0.4,
    snapshot: {
      valuation: 55,
      healthScore: 90,
      beautyScore: 70,
      careDifficulty: 'beginner',
      lineageSummary: 'F1 of Tango line',
      summary: 'Healthy juvenile',
      creatureIds: [kid.id],
      photo: 'data:image/png;base64,iVBORw0KGgo=',
    },
  };
  g.market.listings.push(listing);
  kid.status = 'listed';
  return g;
}

/** A world with `n` extra stocked tanks (perf / LOD tests). */
export function manyTankWorld(n: number, seed = 9090, perTank = 6): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Perf', seed });
  g.isShowcase = false;
  ensureFacility(g, 'grand_hall');
  const classes: WaterClass[] = ['freshwater_planted', 'freshwater_tropical', 'marine_live_rock', 'reef', 'freshwater_cool'];
  const tiers = ['g20L', 'g29', 'g40B', 'g55', 'g75'];
  for (let i = 0; i < n; i++) {
    const wc = classes[i % classes.length];
    const t = addPlacedTank(g, tiers[i % tiers.length], wc, `Perf ${i + 1}`);
    const pool = speciesForClass(wc, t.environment);
    if (pool.length) {
      stockTank(g, t.id, [
        { species: pool[i % pool.length], count: Math.ceil(perTank / 2) },
        { species: pool[(i + 1) % pool.length], count: Math.floor(perTank / 2) },
      ]);
    }
    decorateTank(g, t);
    finishTank(g, t);
  }
  return g;
}

/** Every non-finite number in a state, as JSON-ish paths (empty = healthy). */
export function findNonFinite(value: unknown, path = '$', out: string[] = [], limit = 25): string[] {
  if (out.length >= limit) return out;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) out.push(`${path} = ${value}`);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => findNonFinite(v, `${path}[${i}]`, out, limit));
    return out;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) findNonFinite(v, `${path}.${k}`, out, limit);
  return out;
}
