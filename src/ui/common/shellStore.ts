/**
 * Shell-local transient UI state (popovers, tank card, modals) that other lanes never need.
 * Cross-lane state (panel, selection, tool, photo/party/watch) stays in `useUI`. OWNER: lane "ui-shell".
 */
import { create } from 'zustand';
import type { GameSpeed } from '@/types';

export type Popover = null | 'food' | 'target_food' | 'lights' | 'alerts' | 'camera' | 'more';

interface ShellState {
  tankCardOpen: boolean;
  popover: Popover;
  /** Creature being moved (opens the move modal with a compatibility preview). */
  moveCreatureId: string | null;
  /** Speed to resume to after pause. */
  lastSpeed: Exclude<GameSpeed, 0>;
  /** Tank card: expanded water param key (tutorial "read a parameter"). */
  openParam: string | null;
  /** Party-mode disclaimer dismissed this session. */
  partyNoteSeen: boolean;
  /** Which edge the expanded guide card claims for camera framing (desktop tank view), or null. */
  coachSide: 'left' | 'bottom' | null;
  /** Last captured photo (data URL) shown in the preview modal. */
  /** `added`: the shot wrote a new line into the creature's story (one per few game hours). */
  photo: { url: string; creatureId: string | null; tankId: string | null; added?: boolean } | null;
  set: (p: Partial<Omit<ShellState, 'set' | 'togglePopover'>>) => void;
  togglePopover: (p: Exclude<Popover, null>) => void;
}

export const useShell = create<ShellState>((set, get) => ({
  tankCardOpen: false,
  popover: null,
  moveCreatureId: null,
  lastSpeed: 1,
  openParam: null,
  partyNoteSeen: false,
  coachSide: null,
  photo: null,
  set: (p) => set(p),
  togglePopover: (p) => set({ popover: get().popover === p ? null : p }),
}));

export const getShell = () => useShell.getState();
