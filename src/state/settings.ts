/**
 * Player settings (persisted to localStorage, independent of save slots). OWNER: core.
 */
import { create } from 'zustand';
import type { QualityLevel } from '@/types';

export interface Settings {
  volume: { master: number; music: number; aquarium: number; ui: number };
  muted: boolean;
  quality: QualityLevel;
  reducedMotion: boolean;
  /** Show exact water parameters by default (advanced). */
  advancedWater: boolean;
  tempUnit: 'C' | 'F';
  textScale: number; // 0.9..1.3
  highContrast: boolean;
  autosave: boolean;
  showTutorialHints: boolean;
  /** Dev/debug panel toggle (also enabled by ?dev=1). */
  devMode: boolean;
  partyUseMicrophone: boolean;
  cameraSensitivity: number;
}

const KEY = 'aquarium-go.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  volume: { master: 0.8, music: 0.5, aquarium: 0.7, ui: 0.6 },
  muted: false,
  quality: 'high',
  reducedMotion: false,
  advancedWater: false,
  tempUnit: 'C',
  textScale: 1,
  highContrast: false,
  autosave: true,
  showTutorialHints: true,
  devMode: false,
  partyUseMicrophone: false,
  cameraSensitivity: 1,
};

function load(): Settings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return detectDefaults();
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed, volume: { ...DEFAULT_SETTINGS.volume, ...(parsed.volume ?? {}) } };
  } catch {
    return detectDefaults();
  }
}

function detectDefaults(): Settings {
  const s = { ...DEFAULT_SETTINGS };
  try {
    if (typeof window !== 'undefined') {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) s.reducedMotion = true;
      const coarse = window.matchMedia?.('(pointer: coarse)').matches;
      if (coarse || (navigator.hardwareConcurrency ?? 8) <= 4) s.quality = 'medium';
    }
  } catch {
    /* ignore */
  }
  return s;
}

export interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  setVolume: (k: keyof Settings['volume'], v: number) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>((set, get) => {
  const persist = () => {
    try {
      const { update, setVolume, reset, ...rest } = get();
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* storage may be unavailable */
    }
  };
  return {
    ...load(),
    update: (patch) => {
      set(patch);
      persist();
    },
    setVolume: (k, v) => {
      set({ volume: { ...get().volume, [k]: Math.max(0, Math.min(1, v)) } });
      persist();
    },
    reset: () => {
      set({ ...DEFAULT_SETTINGS });
      persist();
    },
  };
});

export const getSettings = () => useSettings.getState();
