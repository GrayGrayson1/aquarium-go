/**
 * Economy dev helpers (dev panel, tests, sandboxes). OWNER: lane "market".
 */
import type { GameState } from '@/types';
import { unlock } from '../facility';

/** Unlock the marketplace + whole-tank auctions (dev panel / tests). */
export function devOpenMarket(state: GameState): void {
  unlock(state, 'market_listings', { silent: true });
  unlock(state, 'tank_auctions', { silent: true });
}
