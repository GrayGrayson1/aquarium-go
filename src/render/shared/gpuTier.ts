/**
 * Graphics-device detection for the automatic quality default. OWNER: lane "pc-perf".
 *
 * Why: every tuning pass happened on an Apple M4 Pro. Typical Windows PCs have integrated Intel/AMD graphics, 4K or
 * 150 %-scaled screens and ANGLE on Direct3D 11, where a shader recompile stalls for far longer than on Metal. The
 * automatic default ("Auto" in Settings) therefore starts from the GPU the browser reports:
 *  - software renderers (SwiftShader, llvmpipe, Microsoft Basic Render…)  → low, plus a one-time hint to turn on
 *    hardware acceleration;
 *  - integrated graphics (Intel HD/UHD/Iris, AMD "Radeon Graphics"/Vega APUs, phone GPUs) → medium;
 *  - discrete NVIDIA/AMD/Intel Arc and Apple silicon → high;
 *  - unknown → high, or medium on a touch device / ≤ 4 CPU threads (the previous rule).
 * The resolution governor (resolution.ts) then adapts the render scale to the real frame time, so this only has to be
 * roughly right. The probe context is released straight away.
 */
import type { QualityLevel } from '@/types';

export type GpuClass = 'software' | 'integrated' | 'discrete' | 'apple' | 'unknown';

export interface GpuInfo {
  renderer: string;
  vendor: string;
  cls: GpuClass;
  /** Suggested automatic tier for this device. */
  tier: QualityLevel;
  /** The context only exists with a major performance caveat (blocklisted driver / software fallback). */
  caveat: boolean;
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|microsoft basic|gdi generic|mesa offscreen|google angle \(null/i;
const DISCRETE = /nvidia|geforce|quadro|rtx|gtx|tesla|radeon\s*(\(tm\)\s*)?(rx|pro|r9|r7|hd\s*[5-9]\d{3})|radeon\s*vii|firepro|arc\(tm\)|intel\(r\)\s*arc|\barc a\d/i;
/** Entry-level discrete parts that behave like good integrated graphics. */
const WEAK_DISCRETE = /\b(mx\s?\d{3}|gt\s?(610|620|630|640|705|710|720|730|740|1010|1030)|geforce\s*(8|9)\d{2}m?\b|radeon\s*(\(tm\)\s*)?r[57]\s?m?\d{3}|radeon\s*(\(tm\)\s*)?(520|530|535|540|610|620|625|630)\b)/i;
const INTEGRATED = /intel|uhd|iris|hd graphics|radeon\s*(\(tm\)\s*)?graphics|radeon\s*(\(tm\)\s*)?vega|vega\s*\d+\s*graphics|radeon\s*\d{3}m\b|amd radeon\(tm\) \d{3}m|mali|adreno|powervr|apple a\d|videocore|immortalis|xclipse/i;
const APPLE_SILICON = /apple\s*(m\d|gpu)/i;

/** Classify a WebGL renderer string (UNMASKED_RENDERER_WEBGL, or RENDERER on browsers that no longer mask it). */
export function classifyRenderer(renderer: string, opts: { caveat?: boolean; cores?: number; coarse?: boolean } = {}): { cls: GpuClass; tier: QualityLevel } {
  const r = renderer || '';
  const weakHost = !!opts.coarse || (opts.cores ?? 8) <= 4;
  if (opts.caveat || SOFTWARE.test(r)) return { cls: 'software', tier: 'low' };
  if (APPLE_SILICON.test(r)) return { cls: 'apple', tier: weakHost ? 'medium' : 'high' };
  if (DISCRETE.test(r)) return { cls: 'discrete', tier: WEAK_DISCRETE.test(r) || weakHost ? 'medium' : 'high' };
  if (WEAK_DISCRETE.test(r)) return { cls: 'integrated', tier: 'medium' };
  if (INTEGRATED.test(r)) return { cls: 'integrated', tier: 'medium' };
  return { cls: 'unknown', tier: weakHost ? 'medium' : 'high' };
}

let cached: GpuInfo | null | undefined;

/** Probe the GPU once per page (a throwaway WebGL2 context that is released immediately). Null outside a browser. */
export function detectGpu(): GpuInfo | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    if (typeof document === 'undefined' || typeof navigator === 'undefined') return cached;
    const cores = navigator.hardwareConcurrency ?? 8;
    const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    // a context refused with failIfMajorPerformanceCaveat but granted without it = software / blocklisted GPU
    let gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) as WebGL2RenderingContext | null;
    let caveat = false;
    if (!gl) {
      const c2 = document.createElement('canvas');
      gl = c2.getContext('webgl2') as WebGL2RenderingContext | null;
      caveat = !!gl;
    }
    if (!gl) return cached;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
    const vendor = String((dbg && gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) || gl.getParameter(gl.VENDOR) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const { cls, tier } = classifyRenderer(renderer, { caveat, cores, coarse });
    cached = { renderer, vendor, cls, tier, caveat };
  } catch {
    cached = null;
  }
  return cached;
}
