/**
 * Shared camera/lens state. OWNER: lane "waterfx".
 *  - `cameraFX`: mutable per-frame values written by CameraRig, read by PostFX and FX shaders (no React churn).
 *  - `usePhotoSettings`: photo-mode lens controls the UI can bind to (focus, aperture, zoom).
 *  - `cameraInput`: drag state so tap/click handlers can ignore the click that ends a camera drag.
 */
import { create } from 'zustand';

export const cameraFX = {
  /** Depth of field active this frame (photo / close / ultra hero). */
  dofEnabled: false,
  /** World-space focus distance (m) from the camera. */
  focusDistance: 1,
  /** Bokeh strength (0 = off). */
  bokehScale: 0,
  /** Minimum in-focus depth range (m) around the focus distance (0 = lens default); keeps a whole subject sharp. */
  focusRange: 0,
  /** 0..1 fade-to-black used for reduced-motion cuts. */
  fade: 0,
  /** Current resolved rig mode (for debugging / UI). */
  mode: 'front' as RigMode,
  /** A camera fly-to (mode change) is in progress. */
  transitioning: false,
  /** Increments every time a fly-to starts (lets listeners tell a new flight from an old one). */
  transitionSeq: 0,
};

export type RigMode = 'attract' | 'facility' | 'front' | 'orbit' | 'follow' | 'close' | 'photo' | 'idle';

export const cameraInput = {
  /** A drag (beyond the click threshold) is in progress. */
  dragging: false,
  /** performance.now() when the last camera drag ended. */
  lastDragEnd: 0,
  /** Pixels moved during the current/last gesture. */
  moved: 0,
  /** Pointers currently down on the canvas (2 = pinch / two-finger pan). */
  pointers: 0,
};

/** DOM event fired (at most ~1×/s) when the player orbits, pans or zooms the camera by hand (tutorial hook). */
export const CAMERA_USER_EVENT = 'aq:camera-user';
let lastUserEvent = 0;
export function noteCameraUserMove(): void {
  const now = performance.now();
  if (now - lastUserEvent < 1000 || typeof window === 'undefined') return;
  lastUserEvent = now;
  window.dispatchEvent(new CustomEvent(CAMERA_USER_EVENT));
}

/** True if a pointer-up/click at this moment is the end of a camera drag (not a tap). */
export function wasCameraDrag(withinMs = 120): boolean {
  return cameraInput.dragging || performance.now() - cameraInput.lastDragEnd < withinMs;
}

export interface PhotoSettings {
  /** 'auto' focuses on the selected/followed creature (or the look-at point); moving `focus` switches to manual. */
  focusMode: 'auto' | 'manual';
  /** 0..1 manual focus distance (0 ≈ 8 cm, 1 ≈ 3 m, exponential). */
  focus: number;
  /** 0..1 aperture: 0 = everything sharp, 1 = very shallow depth of field. */
  aperture: number;
  /** 0..1 lens zoom (0 = 45° wide, 1 = 14° telephoto). */
  zoom: number;
  /** −1..1 exposure compensation (stops). */
  exposure: number;
  /** 0..1 vignette strength in photo mode. */
  vignette: number;
  set: (patch: Partial<Omit<PhotoSettings, 'set'>>) => void;
}

export const usePhotoSettings = create<PhotoSettings>((set, get) => ({
  focusMode: 'auto',
  focus: 0.45,
  aperture: 0.45,
  zoom: 0.3,
  exposure: 0,
  vignette: 0.45,
  set: (patch) => {
    // touching the focus control means the player wants manual focus
    if (patch.focus !== undefined && patch.focusMode === undefined && patch.focus !== get().focus) patch = { ...patch, focusMode: 'manual' };
    set(patch);
  },
}));
// direct setState (used by generic UI sliders) also flips to manual focus
usePhotoSettings.subscribe((s, prev) => {
  if (s.focus !== prev.focus && s.focusMode === 'auto' && prev.focusMode === 'auto') usePhotoSettings.setState({ focusMode: 'manual' });
});

/** Manual focus 0..1 → metres. */
export const focusToMetres = (f: number) => 0.08 * Math.pow(3 / 0.08, Math.max(0, Math.min(1, f)));
/** Zoom 0..1 → vertical fov (degrees). */
export const zoomToFov = (z: number) => 45 + (14 - 45) * Math.max(0, Math.min(1, z));
