/**
 * Player settings (persisted to localStorage, independent of save slots). OWNER: core.
 */
import { create } from 'zustand';
import type { QualityLevel } from '@/types';
import { detectGpu } from '@/render/shared/gpuTier'; // lane:pc-perf

export interface Settings {
  volume: { master: number; music: number; aquarium: number; ui: number };
  muted: boolean;
  quality: QualityLevel;
  /**
   * lane:pc-perf — Auto graphics (default): `quality` is picked for this device on every load (GPU class, see
   * render/shared/gpuTier.ts) and the ResolutionGovernor may drop a step as a last resort. False once the player picks a
   * level in Settings; that choice is then kept exactly. Optional: absent in settings saved before it existed.
   */
  qualityAuto?: boolean;
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
    const s: Settings = { ...DEFAULT_SETTINGS, ...parsed, volume: { ...DEFAULT_SETTINGS.volume, ...(parsed.volume ?? {}) } };
    // lane:pc-perf — settings saved before Auto existed stored whatever quality was current whenever any setting
    // changed. The old defaults (high, or medium on small devices) are treated as Auto; low/ultra were deliberate.
    if (parsed.qualityAuto === undefined) s.qualityAuto = !(parsed.quality === 'low' || parsed.quality === 'ultra');
    if (s.qualityAuto !== false) s.quality = autoQuality();
    return s;
  } catch {
    return detectDefaults();
  }
}

/** lane:pc-perf — the automatic tier for this device: from the GPU when the browser tells us, else the old rule. */
export function autoQuality(): QualityLevel {
  try {
    const gpu = detectGpu();
    if (gpu) return gpu.tier;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    return coarse || (navigator.hardwareConcurrency ?? 8) <= 4 ? 'medium' : 'high';
  } catch {
    return 'high';
  }
}

function detectDefaults(): Settings {
  const s = { ...DEFAULT_SETTINGS };
  try {
    if (typeof window !== 'undefined') {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) s.reducedMotion = true;
      s.quality = autoQuality();
      s.qualityAuto = true;
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
      // lane:pc-perf — choosing a quality level (without saying Auto) is an explicit choice
      if (patch.quality !== undefined && patch.qualityAuto === undefined) patch = { ...patch, qualityAuto: false };
      if (patch.qualityAuto === true && patch.quality === undefined) patch = { ...patch, quality: autoQuality() };
      set(patch);
      persist();
    },
    setVolume: (k, v) => {
      set({ volume: { ...get().volume, [k]: Math.max(0, Math.min(1, v)) } });
      persist();
    },
    reset: () => {
      set({ ...DEFAULT_SETTINGS, quality: autoQuality(), qualityAuto: true }); // lane:pc-perf
      persist();
    },
  };
});

export const getSettings = () => useSettings.getState();
