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

const QUALITY_LEVELS: readonly QualityLevel[] = ['low', 'medium', 'high', 'ultra'];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
/** A finite number, held inside what the game offers; anything else is the default. */
const within = (v: unknown, min: number, max: number, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback);

/**
 * B-165 — stored settings as this build can use them. The stored text is whatever the browser kept (an older build's,
 * a hand-edited one, a damaged one): each setting this build knows keeps its stored value only when it has the right
 * type, numbers finite and inside the range the game offers (volumes 0 to 1, the text sizes UIRoot applies, the
 * camera slider's 0.4 to 2); anything else gets its default, so a `null` or a string can no longer reach the Settings
 * panel, the camera or the audio gains. `qualityAuto` stays absent unless it was stored as a boolean (load's rule for
 * settings saved before Auto existed reads that). Keys this build doesn't know ride along unchanged, as before, so a
 * newer build's setting survives a visit from an older tab.
 */
export function sanitizeSettings(parsed: unknown): Settings {
  const p = isRecord(parsed) ? parsed : {};
  const vol = isRecord(p.volume) ? p.volume : {};
  const d = DEFAULT_SETTINGS;
  const s: Settings = {
    ...(p as Partial<Settings>),
    volume: {
      master: within(vol.master, 0, 1, d.volume.master),
      music: within(vol.music, 0, 1, d.volume.music),
      aquarium: within(vol.aquarium, 0, 1, d.volume.aquarium),
      ui: within(vol.ui, 0, 1, d.volume.ui),
    },
    muted: bool(p.muted, d.muted),
    quality: QUALITY_LEVELS.includes(p.quality as QualityLevel) ? (p.quality as QualityLevel) : d.quality,
    reducedMotion: bool(p.reducedMotion, d.reducedMotion),
    advancedWater: bool(p.advancedWater, d.advancedWater),
    tempUnit: p.tempUnit === 'C' || p.tempUnit === 'F' ? p.tempUnit : d.tempUnit,
    textScale: within(p.textScale, 0.85, 1.4, d.textScale),
    highContrast: bool(p.highContrast, d.highContrast),
    autosave: bool(p.autosave, d.autosave),
    showTutorialHints: bool(p.showTutorialHints, d.showTutorialHints),
    devMode: bool(p.devMode, d.devMode),
    partyUseMicrophone: bool(p.partyUseMicrophone, d.partyUseMicrophone),
    cameraSensitivity: within(p.cameraSensitivity, 0.4, 2, d.cameraSensitivity),
  };
  if (typeof p.qualityAuto === 'boolean') s.qualityAuto = p.qualityAuto;
  else delete s.qualityAuto;
  return s;
}

function load(): Settings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return detectDefaults();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return detectDefaults(); // not settings at all: as if none were stored
    const s = sanitizeSettings(parsed);
    // lane:pc-perf — settings saved before Auto existed stored whatever quality was current whenever any setting
    // changed. The old defaults (high, or medium on small devices) are treated as Auto; low/ultra were deliberate.
    if (s.qualityAuto === undefined) s.qualityAuto = !(parsed.quality === 'low' || parsed.quality === 'ultra');
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
