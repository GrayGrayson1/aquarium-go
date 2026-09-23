/**
 * UI-only preferences (persisted to localStorage, separate from the core settings store). OWNER: lane "ui-shell".
 */
import { create } from 'zustand';

export interface UIPrefs {
  /** Fade the HUD after a few seconds without input while watching a tank. */
  calmHud: boolean;
}

const KEY = 'aquarium-go.ui-prefs.v1';
const DEFAULTS: UIPrefs = { calmHud: true };

function load(): UIPrefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export const usePrefs = create<UIPrefs & { update: (p: Partial<UIPrefs>) => void }>((set, get) => ({
  ...load(),
  update: (p) => {
    set(p);
    try {
      const { update: _u, ...rest } = get();
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* storage unavailable */
    }
  },
}));
