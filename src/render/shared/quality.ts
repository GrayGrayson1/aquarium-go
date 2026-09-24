/**
 * Effective render quality = player setting degraded by the runtime performance monitor.
 * OWNER: lane "waterfx". Other render lanes may read `useRenderQuality()` / `QUALITY` for their own budgets.
 */
import { create } from 'zustand';
import type { QualityLevel } from '@/types';
import { useSettings, getSettings } from '@/state/settings';
import { deviceKey, readPerfMemory } from './resolution';
import { detectGpu } from './gpuTier';

const ORDER: QualityLevel[] = ['low', 'medium', 'high', 'ultra'];

interface PerfStore {
  /**
   * 0 = as configured; -1/-2 = feature steps dropped by the last-resort rule of the ResolutionGovernor (lane:pc-perf —
   * only while quality is on Auto; remembered per device, so a later visit starts there instead of recompiling).
   */
  degrade: number;
  setDegrade: (d: number) => void;
  /** lane:pc-perf — adaptive render scale (resolution.ts), 0.6…1 of the budgeted DPR. */
  scale: number;
  setScale: (s: number) => void;
  /** lane:pc-perf — the canvas DPR currently in use (pixel budget × scale), 0 until the governor has run. */
  dpr: number;
  setDpr: (d: number) => void;
}

function initialDegrade(): number {
  try {
    if (typeof window === 'undefined' || getSettings().qualityAuto === false) return 0;
    return readPerfMemory(deviceKey(detectGpu()?.renderer)).degrade;
  } catch {
    return 0;
  }
}

export const useRenderPerf = create<PerfStore>((set) => ({
  degrade: initialDegrade(),
  setDegrade: (d) => set({ degrade: Math.max(-2, Math.min(0, Math.round(d))) }),
  scale: 1,
  setScale: (s) => set({ scale: Math.max(0.5, Math.min(1, s)) }),
  dpr: 0,
  setDpr: (d) => set({ dpr: d }),
}));

// an explicit Settings choice is sacred: it clears any automatic feature drop for this session
useSettings.subscribe((s, p) => {
  if (s.qualityAuto === false && (p.qualityAuto !== false || s.quality !== p.quality)) useRenderPerf.getState().setDegrade(0);
});

function urlQuality(): QualityLevel | null {
  try {
    const q = new URLSearchParams(location.search).get('quality');
    return q && (ORDER as string[]).includes(q) ? (q as QualityLevel) : null;
  } catch {
    return null;
  }
}
const URL_Q = typeof location !== 'undefined' ? urlQuality() : null;

export function effectiveQuality(q: QualityLevel, degrade: number): QualityLevel {
  const i = ORDER.indexOf(URL_Q ?? q);
  return ORDER[Math.max(0, Math.min(3, (i < 0 ? 2 : i) + (URL_Q ? 0 : degrade)))];
}

export function useRenderQuality(): QualityLevel {
  const q = useSettings((s) => s.quality);
  const auto = useSettings((s) => s.qualityAuto !== false);
  const d = useRenderPerf((s) => s.degrade);
  return effectiveQuality(q, auto ? d : 0);
}

export function getRenderQuality(): QualityLevel {
  const s = getSettings();
  return effectiveQuality(s.quality, s.qualityAuto !== false ? useRenderPerf.getState().degrade : 0);
}

export interface QualityBudget {
  dpr: [number, number];
  shadows: boolean;
  shadowMap: number;
  /** Particulate multiplier. */
  particles: number;
  shafts: boolean;
  causticChroma: boolean;
  bloom: boolean;
  vignette: boolean;
  dof: boolean;
  grain: boolean;
  msaa: number;
  surfaceSegments: number;
  bubbles: number;
  /** Procedural furniture/backdrop detail shaders. */
  detail: boolean;
  /**
   * lane:pc-perf — drawing-buffer budget in megapixels: a bigger screen (4K, 150 % scaling) renders at a lower internal
   * resolution and is scaled up (resolution.ts). Ultra's budget covers a 4K screen at full resolution.
   */
  maxMP: number;
}

export const QUALITY: Record<QualityLevel, QualityBudget> = {
  low: { dpr: [1, 1], shadows: false, shadowMap: 512, particles: 0.3, shafts: false, causticChroma: false, bloom: false, vignette: false, dof: false, grain: false, msaa: 0, surfaceSegments: 24, bubbles: 0.4, detail: false, maxMP: 2.1 },
  medium: { dpr: [1, 1.25], shadows: false, shadowMap: 512, particles: 0.6, shafts: true, causticChroma: false, bloom: true, vignette: false, dof: false, grain: false, msaa: 2, surfaceSegments: 48, bubbles: 0.7, detail: true, maxMP: 3.2 },
  high: { dpr: [1, 1.6], shadows: true, shadowMap: 1024, particles: 1, shafts: true, causticChroma: true, bloom: true, vignette: true, dof: true, grain: false, msaa: 4, surfaceSegments: 96, bubbles: 1, detail: true, maxMP: 4.2 },
  ultra: { dpr: [1, 1.75], shadows: true, shadowMap: 2048, particles: 1.5, shafts: true, causticChroma: true, bloom: true, vignette: true, dof: true, grain: true, msaa: 4, surfaceSegments: 128, bubbles: 1.3, detail: true, maxMP: 8.4 },
};

export function useQualityBudget(): QualityBudget {
  return QUALITY[useRenderQuality()];
}
