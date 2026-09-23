/**
 * Effective render quality = player setting degraded by the runtime performance monitor.
 * OWNER: lane "waterfx". Other render lanes may read `useRenderQuality()` / `QUALITY` for their own budgets.
 */
import { create } from 'zustand';
import type { QualityLevel } from '@/types';
import { useSettings, getSettings } from '@/state/settings';

const ORDER: QualityLevel[] = ['low', 'medium', 'high', 'ultra'];

interface PerfStore {
  /** 0 = as configured; -1/-2 = degraded steps applied by the PerformanceMonitor. */
  degrade: number;
  setDegrade: (d: number) => void;
}

export const useRenderPerf = create<PerfStore>((set) => ({
  degrade: 0,
  setDegrade: (d) => set({ degrade: Math.max(-2, Math.min(0, Math.round(d))) }),
}));

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
  const d = useRenderPerf((s) => s.degrade);
  return effectiveQuality(q, d);
}

export function getRenderQuality(): QualityLevel {
  return effectiveQuality(getSettings().quality, useRenderPerf.getState().degrade);
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
}

export const QUALITY: Record<QualityLevel, QualityBudget> = {
  low: { dpr: [1, 1], shadows: false, shadowMap: 512, particles: 0.3, shafts: false, causticChroma: false, bloom: false, vignette: false, dof: false, grain: false, msaa: 0, surfaceSegments: 24, bubbles: 0.4, detail: false },
  medium: { dpr: [1, 1.25], shadows: false, shadowMap: 512, particles: 0.6, shafts: true, causticChroma: false, bloom: true, vignette: false, dof: false, grain: false, msaa: 2, surfaceSegments: 48, bubbles: 0.7, detail: true },
  high: { dpr: [1, 1.6], shadows: true, shadowMap: 1024, particles: 1, shafts: true, causticChroma: true, bloom: true, vignette: true, dof: true, grain: false, msaa: 4, surfaceSegments: 96, bubbles: 1, detail: true },
  ultra: { dpr: [1, 1.75], shadows: true, shadowMap: 2048, particles: 1.5, shafts: true, causticChroma: true, bloom: true, vignette: true, dof: true, grain: true, msaa: 4, surfaceSegments: 128, bubbles: 1.3, detail: true },
};

export function useQualityBudget(): QualityBudget {
  return QUALITY[useRenderQuality()];
}
