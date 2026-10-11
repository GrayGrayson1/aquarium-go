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

/** A publish this far ahead of the last (game hours) is a load or a catch-up, not the game loop's next step. */
const LOAD_JUMP_HOURS = 6;

/**
 * A game that loads (or starts) brings its current stock in as seen. "Loads" are told apart from the game loop's
 * publishes as the render layer does: another aquarium (saveId), an earlier state (the clock went back) — or a jump
 * ahead, such as a newer slot of the same aquarium or a catch-up.
 */
useGame.subscribe((s, prev) => {
  const a = prev.game;
  const b = s.game;
  if (a === b) return;
  const loaded = !a || !b || a.saveId !== b.saveId || b.clock.hour < a.clock.hour || b.clock.hour - a.clock.hour > LOAD_JUMP_HOURS;
  if (loaded) useSeenStock.setState({ seen: new Set((b?.market.stock ?? []).map((o) => o.id)) });
});
