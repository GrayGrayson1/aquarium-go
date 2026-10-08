/**
 * The shop offers the player has already had a chance to see (0.5 spec §5.2): the Market's rare-stock dot lights only
 * for Prismatic or rare offers stocked since the Shop was last open. A UI store, never the save: it starts with the
 * stock of the game that loads (so loading never lights the dot) and takes the stock in whenever the Shop is open.
 * OWNER: lane "notify".
 */
import { create } from 'zustand';
import { useGame } from '@/state/game';

interface SeenStockState {
  seen: ReadonlySet<string>;
  /** Mark every offer now in stock as seen (no change, no render, when they all are). */
  markSeen: (offerIds: Iterable<string>) => void;
}

export const useSeenStock = create<SeenStockState>((set, get) => ({
  seen: new Set<string>(),
  markSeen: (ids) => {
    const cur = get().seen;
    const add = [...ids].filter((id) => !cur.has(id));
    if (add.length) set({ seen: new Set([...cur, ...add]) });
  },
}));

/** A game that loads (or starts) brings its current stock in as seen; a different aquarium starts over. */
useGame.subscribe((s, prev) => {
  if (s.game?.saveId === prev.game?.saveId) return;
  useSeenStock.setState({ seen: new Set((s.game?.market.stock ?? []).map((o) => o.id)) });
});
