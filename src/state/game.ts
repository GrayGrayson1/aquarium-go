/**
 * Game store. OWNER: core.
 * The ONLY way to change persistent game state is `mutate(draft => domainFn(draft, ...))`.
 * Domain mutators live in src/sim/** and take `(state: GameState, ...args)` — they mutate the immer draft.
 * Never mutate `useGame.getState().game` directly from UI/AI/render code.
 */
import { create } from 'zustand';
import { produce, setAutoFreeze } from 'immer';
import type { GameState } from '@/types';

setAutoFreeze(false);

export interface GameStore {
  game: GameState | null;
  /** Monotonic counter bumped on every mutation (cheap change detection). */
  version: number;
  mutate: (recipe: (draft: GameState) => void) => void;
  setGame: (g: GameState | null) => void;
}

export const useGame = create<GameStore>((set, get) => ({
  game: null,
  version: 0,
  mutate: (recipe) => {
    const g = get().game;
    if (!g) return;
    const next = produce(g, (d) => {
      recipe(d as GameState);
    });
    if (next !== g) set({ game: next, version: get().version + 1 });
  },
  setGame: (g) => set({ game: g, version: get().version + 1 }),
}));

/** Non-React access (AI/render loops, dev tools). */
export const getGame = () => useGame.getState().game;
export const mutateGame = (recipe: (draft: GameState) => void) => useGame.getState().mutate(recipe);

/** Select from game state with a safe null fallback. */
export function useGameSelector<T>(sel: (g: GameState) => T, fallback: T): T {
  return useGame((s) => (s.game ? sel(s.game) : fallback));
}
