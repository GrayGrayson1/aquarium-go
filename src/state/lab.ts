/**
 * The scenario lab's screen and the scenario on screen (chunk 15, ADR-0051). OWNER: core. A developer tool: only
 * where the tools are allowed (src/state/devTools.ts) does anything open it.
 */
import { create } from 'zustand';
import type { GameState } from '@/types';

/**
 * The scenario being played: its name, the built game's save id (never autosaved), the recipe it came from and, for a
 * recipe built on "the game on screen", that game as it was (Start again rebuilds on it, not on the scenario).
 */
export interface LabScenario {
  name: string;
  saveId: string;
  recipe: unknown;
  base?: GameState;
}

export const useLab = create<{ open: boolean; scenario: LabScenario | null }>(() => ({ open: false, scenario: null }));

export const openLab = (): void => useLab.setState({ open: true });
export const closeLab = (): void => useLab.setState({ open: false });
