/**
 * The scenario lab's screen and the scenario on screen (chunk 15, ADR-0051). OWNER: core. A developer tool: only
 * where the tools are allowed (src/state/devTools.ts) does anything open it.
 */
import { create } from 'zustand';

/** The scenario being played: its name, the built game's save id (never autosaved) and the recipe it came from. */
export interface LabScenario {
  name: string;
  saveId: string;
  recipe: unknown;
}

export const useLab = create<{ open: boolean; scenario: LabScenario | null }>(() => ({ open: false, scenario: null }));

export const openLab = (): void => useLab.setState({ open: true });
export const closeLab = (): void => useLab.setState({ open: false });
