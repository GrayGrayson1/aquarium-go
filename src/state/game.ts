/**
 * Game store. OWNER: core.
 * The ONLY way to change persistent game state is `mutate(draft => domainFn(draft, ...))`; player actions reach it as
 * commands through `dispatch` (chunk 11, SHARED-SHOPS.md §4.2).
 * Domain mutators live in src/sim/** and take `(state: GameState, ...args)` — they mutate the immer draft.
 * Never mutate `useGame.getState().game` directly from UI/AI/render code.
 */
import { create } from 'zustand';
import { produce, setAutoFreeze } from 'immer';
import type { GameState } from '@/types';
import type { Command, CommandResult } from '@/sim/commands';

setAutoFreeze(false);

/**
 * chunk 11 (SHARED-SHOPS.md §4.2) — apply a player action. `done` gets the result: at once in a solo game (before
 * `dispatch` returns, which also returns it), or when the step that applied it arrives in a shared shop (then
 * `dispatch` returns undefined). Null: no game. An action that throws throws out of a solo `dispatch`, as `mutate` does.
 */
export type Dispatch = (cmd: Command, done?: (r: CommandResult | null) => void) => CommandResult | null | undefined;

const notInstalled: Dispatch = () => {
  throw new Error('No dispatcher is installed (src/game/dispatch.ts installs the solo one when imported).');
};

export interface GameStore {
  game: GameState | null;
  /** Monotonic counter bumped on every mutation (cheap change detection). */
  version: number;
  /**
   * lane:automation (chunk 5) — bumped by `mutate` only (player actions, the render layer's input handlers, the AI's
   * tutorial hook), not by the game loop's publishes: views cached per game hour (Operations, PERF-004) also key on it,
   * so a change made while the clock is paused shows at once.
   */
  actions: number;
  mutate: (recipe: (draft: GameState) => void) => void;
  /**
   * Replace the world. chunk 13: `actions` also counts it as a player action (a shared shop's copy published with a
   * member's command in it), so views cached per game hour show it while the clock is paused, as `mutate`'s do.
   */
  setGame: (g: GameState | null, opts?: { actions?: boolean }) => void;
  /** chunk 11 — the installed dispatcher: player actions go through it as commands (§4.2). */
  dispatch: Dispatch;
  /** Install a dispatcher: src/game/dispatch.ts's solo one at boot; a shared shop's while one is open (chunk 13). */
  installDispatch: (d: Dispatch) => void;
}

export const useGame = create<GameStore>((set, get) => ({
  game: null,
  version: 0,
  actions: 0,
  mutate: (recipe) => {
    const g = get().game;
    if (!g) return;
    const next = produce(g, (d) => {
      recipe(d as GameState);
    });
    if (next !== g) set({ game: next, version: get().version + 1, actions: get().actions + 1 });
  },
  setGame: (g, opts) => set({ game: g, version: get().version + 1, ...(opts?.actions ? { actions: get().actions + 1 } : {}) }),
  dispatch: notInstalled,
  installDispatch: (d) => set({ dispatch: d }),
}));

/** Non-React access (AI/render loops, dev tools). */
export const getGame = () => useGame.getState().game;
export const mutateGame = (recipe: (draft: GameState) => void) => useGame.getState().mutate(recipe);

/** Select from game state with a safe null fallback. */
export function useGameSelector<T>(sel: (g: GameState) => T, fallback: T): T {
  return useGame((s) => (s.game ? sel(s.game) : fallback));
}
