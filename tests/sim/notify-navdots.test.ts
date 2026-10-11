// @vitest-environment node
/**
 * lane:notify — the Market's rare-stock dot (0.5 spec §5.2, MKT-014): "bids waiting" keeps priority; only unseen
 * Prismatic or rare offers light it; a game that loads brings its stock in as seen; the seen set is a UI store, never
 * the save; without the new parameter navDots behaves exactly as before.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, ShopOffer } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, assignPrismatic, forcePrismatic } from '@/sim/life';
import { useGame } from '@/state/game';
import { navDots } from '@/ui/common/notify';
import { DOCK_ITEMS } from '@/ui/hud/Dock';
import { useSeenStock } from '@/ui/panels/market/seenStock';
import { stateHash } from '@/persistence';

const P = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
let seq = 0;

function game(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 61 });
  g.market.stock = [];
  return g;
}

function offer(g: GameState, speciesId: string, alleles?: Record<string, [string, string]>, prismatic = false): ShopOffer {
  const c = createCreature(g, simRng(g), speciesId, alleles ? { genome: { alleles, potentials: { ...P } } } : {});
  if (prismatic) {
    forcePrismatic('shop', 1);
    assignPrismatic(g, c, 'shop');
  }
  const o: ShopOffer = { id: `offer_n${++seq}`, kind: 'creature', speciesId, creatures: [c], price: 20, seller: 'Test', expiresHour: g.clock.hour + 48 };
  g.market.stock.push(o);
  return o;
}

const plain = { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'] } as Record<string, [string, string]>;
const rareMorph = { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'] } as Record<string, [string, string]>;

describe('Market rare-stock dot', () => {
  it('lights for an unseen Prismatic offer (first) or an unseen rare morph', () => {
    const g = game();
    offer(g, 'betta', plain);
    const rare = offer(g, 'betta', rareMorph);
    expect(navDots(g, DOCK_ITEMS, null, new Set()).market).toEqual({ level: 'new', label: 'Rare stock: Red Cambodian Veiltail Betta', target: `offer:${rare.id}` });
    const shimmer = offer(g, 'mystery_snail', undefined, true);
    expect(navDots(g, DOCK_ITEMS, null, new Set()).market).toEqual({ level: 'new', label: 'Prismatic mystery snail in the shop', target: `offer:${shimmer.id}` });
    expect(navDots(g, DOCK_ITEMS, null, new Set(g.market.stock.map((o) => o.id))).market).toBeUndefined();
  });

  it('ordinary stock never lights it', () => {
    const g = game();
    offer(g, 'betta', plain);
    offer(g, 'neon_tetra');
    expect(navDots(g, DOCK_ITEMS, null, new Set()).market).toBeUndefined();
  });

  it('bids waiting keep priority', () => {
    const g = game();
    offer(g, 'mystery_snail', undefined, true);
    g.market.listings.push({ id: 'l1', kind: 'creature', title: 'Pip', creatureIds: [], reserve: 10, createdHour: 0, endsHour: 500, status: 'active', bids: [{ id: 'b', buyerId: 'x', amount: 50, message: '', createdHour: 0, expiresHour: g.clock.hour + 10, status: 'open' }], interest: 0.5, snapshot: { valuation: 40, healthScore: 1, beautyScore: 1, careDifficulty: '', lineageSummary: '', summary: '', creatureIds: [] } });
    expect(navDots(g, DOCK_ITEMS, null, new Set()).market).toMatchObject({ target: 'tab:listings', label: '1 bid waiting for your answer' });
  });

  it('without the fourth parameter nothing changes', () => {
    const g = game();
    offer(g, 'mystery_snail', undefined, true);
    expect(navDots(g, DOCK_ITEMS).market).toBeUndefined();
    expect(navDots(g, DOCK_ITEMS, null)).toEqual(navDots(g, DOCK_ITEMS));
  });

  it('a game that loads brings its stock in as seen; opening the Shop marks new stock seen; the save never holds it', () => {
    const g = game();
    offer(g, 'mystery_snail', undefined, true);
    useGame.getState().setGame(g);
    expect(useSeenStock.getState().seen.has(g.market.stock[0].id)).toBe(true);
    expect(navDots(g, DOCK_ITEMS, null, useSeenStock.getState().seen).market).toBeUndefined();
    const later = offer(g, 'betta', rareMorph);
    expect(navDots(g, DOCK_ITEMS, null, useSeenStock.getState().seen).market?.target).toBe(`offer:${later.id}`);
    const hash = stateHash(g);
    useSeenStock.getState().markSeen(g.market.stock.map((o) => o.id));
    expect(navDots(g, DOCK_ITEMS, null, useSeenStock.getState().seen).market).toBeUndefined();
    expect(stateHash(g)).toBe(hash);
    useGame.getState().setGame(null);
  });
});
