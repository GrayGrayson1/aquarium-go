/**
 * Transient build-mode state for placing tanks (not saved). OWNER: lane "facility".
 * The Build panel may set `waterClass` before choosing a tier (`ui.placingTankTierId`); if it doesn't, the ghost
 * falls back to `ui.placingWaterClass` (if the UI lane adds it) and then to the starter's environment.
 */
import { create } from 'zustand';
import type { WaterClass } from '@/types';

export interface PlacementStore {
  waterClass: WaterClass | null;
  /** Manual rotation override (radians); null = auto-orient against the nearest wall. */
  rotY: number | null;
  /** Last validation message for the UI (e.g. "Too close to the 20 Gallon Long"). */
  message: string | null;
  valid: boolean;
  setWaterClass: (w: WaterClass | null) => void;
  rotate: (by?: number) => void;
  reset: () => void;
  set: (p: Partial<Pick<PlacementStore, 'message' | 'valid' | 'rotY'>>) => void;
}

export const usePlacementStore = create<PlacementStore>((set, get) => ({
  waterClass: null,
  rotY: null,
  message: null,
  valid: false,
  setWaterClass: (w) => set({ waterClass: w }),
  rotate: (by = Math.PI / 2) => {
    const cur = get().rotY ?? 0;
    let r = cur + by;
    while (r > Math.PI + 1e-6) r -= Math.PI * 2;
    while (r <= -Math.PI + 1e-6) r += Math.PI * 2;
    set({ rotY: Math.round(r * 1e4) / 1e4 });
  },
  reset: () => set({ rotY: null, message: null, valid: false }),
  set: (p) => set(p),
}));
