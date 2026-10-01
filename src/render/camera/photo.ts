/**
 * Photo capture from the main canvas. OWNER: lane "waterfx".
 * Renders a clean frame synchronously (optionally at a higher resolution) and reads it back as a PNG data URL in the
 * same task, so it works without `preserveDrawingBuffer`.
 */
import type * as THREE from 'three';
import type { EffectComposer } from 'postprocessing';

/** Photo-mode lens store (focus, aperture, zoom, exposure, vignette — numeric 0..1 controls for the UI). */
export { usePhotoSettings, type PhotoSettings } from './cameraFX';

interface Handles {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

// Shared across duplicate module instances (HMR / dynamic imports) via a global slot.
const G = globalThis as unknown as { __agPhoto?: { handles: Handles | null; composer: EffectComposer | null } };
const slot = (G.__agPhoto ??= { handles: null, composer: null });

/** Called by SceneRoot's bridge (inside the Canvas). */
export function registerRenderHandles(h: Handles | null): void {
  slot.handles = h;
}
/** Called by PostFX when its composer mounts/unmounts. */
export function registerComposer(c: EffectComposer | null): void {
  slot.composer = c;
}

/** Hooks other lanes can use to hide transient overlays (selection rings, cursors) during a capture. */
const captureListeners = new Set<(capturing: boolean) => void>();
export function onPhotoCapture(fn: (capturing: boolean) => void): () => void {
  captureListeners.add(fn);
  return () => captureListeners.delete(fn);
}

/**
 * Capture the current view. `width` = output pixel width (default: current drawing-buffer width, capped at 4096).
 * `hideUI` is accepted for API compatibility; DOM UI is never part of the canvas.
 * lane:fix-panels — `format`/`quality` pick the encoding (default PNG); listing photos use a small JPEG so they fit
 * in a save.
 */
export async function capturePhoto(opts: { width?: number; hideUI?: boolean; format?: 'image/png' | 'image/jpeg' | 'image/webp'; quality?: number } = {}): Promise<string | null> {
  const h = slot.handles;
  const composer = slot.composer;
  const format = opts.format ?? 'image/png';
  if (!h) {
    const c = document.querySelector('canvas');
    if (!c) return null;
    // read right after the render loop's next frame, while the drawing buffer is still valid
    return new Promise((resolve) =>
      requestAnimationFrame(() => {
        try {
          resolve(c.toDataURL(format, opts.quality));
        } catch {
          resolve(null);
        }
      }),
    );
  }
  const { gl, scene, camera } = h;
  const canvas = gl.domElement;
  const prevPR = gl.getPixelRatio();
  const cssW = canvas.clientWidth || canvas.width / prevPR;
  const cssH = canvas.clientHeight || canvas.height / prevPR;
  // lane:pc-perf — photos default to the screen's native sharpness even while the live view renders at a reduced scale
  const nativePR = Math.max(prevPR, Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
  const want = Math.min(4096, Math.max(64, Math.round(opts.width ?? cssW * nativePR)));
  const pr = want / Math.max(1, cssW);
  captureListeners.forEach((f) => f(true));
  let url: string | null = null;
  try {
    if (Math.abs(pr - prevPR) > 1e-3) {
      gl.setPixelRatio(pr);
      gl.setSize(cssW, cssH, false);
      composer?.setSize(cssW, cssH, false);
    }
    if (composer) composer.render(0);
    else gl.render(scene, camera);
    url = canvas.toDataURL(format, opts.quality);
  } catch {
    url = null;
  } finally {
    if (Math.abs(pr - prevPR) > 1e-3) {
      gl.setPixelRatio(prevPR);
      gl.setSize(cssW, cssH, false);
      composer?.setSize(cssW, cssH, false);
    }
    captureListeners.forEach((f) => f(false));
  }
  return url;
}
