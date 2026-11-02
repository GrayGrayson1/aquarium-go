/**
 * chunk 19 (ADR-0055 decision 4, QOL-005) — the decorating camera. While a decor piece is in hand (`decor_place`) or
 * Rearrange is on (`decor_move`) in tank view, CameraRig frames the tank floor from above and the player can orbit
 * almost to the side, tilt to straight down, zoom in close and slide the view along the tank, by mouse, keys, touch and
 * the on-screen view pad (src/ui/hud/DecorCamPad.tsx). This module holds the pose the rig eases toward (`want`) and
 * the one it shows (`now`), the limits, the presets and the nudges; it is pure apart from its one mutable object
 * (tests/sim/qol-decor-cam.test.ts). Pan is in fractions of the tank's half length (x) and half depth (z), so it means
 * the same in a 5- and a 1,000-gallon tank. OWNER: lane "waterfx".
 */

export interface DecorPose {
  /** Around the tank, radians from the front (+ = from the right). */
  yaw: number;
  /** Above the floor, radians (0 = level, π/2 = straight down). */
  pitch: number;
  /** Distance as a multiple of the framing that fits the tank. */
  zoom: number;
  /** The look-at point along the tank (−1 left end … 1 right end) and its depth (−1 back … 1 front). */
  panX: number;
  panZ: number;
}

export const DECOR_LIMITS = { yaw: 1.45, pitchMin: 0.05, pitchMax: 1.45, zoomMin: 0.3, zoomMax: 1.6, pan: 0.85 } as const;

/** Where decorating starts: looking down into the tank at about 30°, the whole floor in view. */
export const DECOR_HOME: Readonly<DecorPose> = Object.freeze({ yaw: 0, pitch: 0.52, zoom: 1, panX: 0, panZ: 0 });

export type DecorPreset = 'front' | 'above' | 'left' | 'right' | 'reset';
export const DECOR_PRESETS: Readonly<Record<DecorPreset, Readonly<DecorPose>>> = Object.freeze({
  front: { yaw: 0, pitch: 0.12, zoom: 1, panX: 0, panZ: 0 },
  above: { yaw: 0, pitch: 1.42, zoom: 1, panX: 0, panZ: 0 },
  left: { yaw: -1.25, pitch: 0.42, zoom: 1, panX: 0, panZ: 0 },
  right: { yaw: 1.25, pitch: 0.42, zoom: 1, panX: 0, panZ: 0 },
  reset: DECOR_HOME,
});

/** One step of the pad's buttons and the arrow keys. */
export const DECOR_STEP = { yaw: 0.35, pitch: 0.22, zoom: 1.25, pan: 0.18 } as const;

/** Re-entering decorating in the same tank within this long keeps the last view (placing one piece after another). */
export const DECOR_KEEP_MS = 90_000;

const clamp = (x: number, a: number, b: number) => (Number.isFinite(x) ? Math.max(a, Math.min(b, x)) : a);

export function clampDecorPose(p: DecorPose): DecorPose {
  const L = DECOR_LIMITS;
  return { yaw: clamp(p.yaw, -L.yaw, L.yaw), pitch: clamp(p.pitch, L.pitchMin, L.pitchMax), zoom: clamp(p.zoom, L.zoomMin, L.zoomMax), panX: clamp(p.panX, -L.pan, L.pan), panZ: clamp(p.panZ, -L.pan, L.pan) };
}

/** The pose the rig eases toward and the one on screen; which tank, and when decorating last ended there. */
export const decorCam = { want: { ...DECOR_HOME } as DecorPose, now: { ...DECOR_HOME } as DecorPose, tankId: '', leftAt: -Infinity };

/** Entering decorating in `tankId`: the last view if it was this tank a moment ago, else the home view. */
export function enterDecorCam(tankId: string, now: number): void {
  if (decorCam.tankId === tankId && now - decorCam.leftAt < DECOR_KEEP_MS) return;
  decorCam.tankId = tankId;
  decorCam.want = { ...DECOR_HOME };
  decorCam.now = { ...DECOR_HOME };
}

export function leaveDecorCam(now: number): void {
  decorCam.leftAt = now;
}

/** Ease what's on screen toward what's wanted (`k` 0..1 per frame). */
export function easeDecorCam(k: number): DecorPose {
  const a = decorCam.now;
  const b = decorCam.want;
  a.yaw += (b.yaw - a.yaw) * k;
  a.pitch += (b.pitch - a.pitch) * k;
  a.zoom += (b.zoom - a.zoom) * k;
  a.panX += (b.panX - a.panX) * k;
  a.panZ += (b.panZ - a.panZ) * k;
  return a;
}

/** Turn, tilt and zoom by steps (zoom multiplies). */
export function nudgeDecorCam(d: { yaw?: number; pitch?: number; zoom?: number }): void {
  const w = decorCam.want;
  decorCam.want = clampDecorPose({ ...w, yaw: w.yaw + (d.yaw ?? 0), pitch: w.pitch + (d.pitch ?? 0), zoom: w.zoom * (d.zoom ?? 1) });
}

/**
 * Slide the view: `right` > 0 moves the look-at point to the screen's right, `away` > 0 into the screen, both in
 * fractions of the tank's half size, turned by the current yaw so "right" is always the player's right.
 */
export function slideDecorCam(right: number, away: number): void {
  const w = decorCam.want;
  const c = Math.cos(w.yaw);
  const s = Math.sin(w.yaw);
  // the camera's right on the floor is (cos yaw, −sin yaw); into the screen is (−sin yaw, −cos yaw)
  decorCam.want = clampDecorPose({ ...w, panX: w.panX + right * c - away * s, panZ: w.panZ - right * s - away * c });
}

export function setDecorPreset(p: DecorPreset): void {
  const keepPan = p !== 'reset';
  const w = decorCam.want;
  decorCam.want = clampDecorPose({ ...DECOR_PRESETS[p], ...(keepPan ? { panX: w.panX, panZ: w.panZ } : {}) });
}

/**
 * How far the camera must stand from the look-at point `t` along the unit direction `u` to be outside the box
 * |x| ≤ hx, |z| ≤ hz, y ≤ top (the glass and the water): the ray's exit distance, or 0 when `t` is already outside.
 * (Below the box never happens: pitch keeps the camera above its look-at point.)
 */
export function exitDistance(t: { x: number; y: number; z: number }, u: { x: number; y: number; z: number }, hx: number, hz: number, top: number): number {
  if (Math.abs(t.x) > hx || Math.abs(t.z) > hz || t.y > top) return 0;
  let out = Infinity;
  if (u.x > 1e-6) out = Math.min(out, (hx - t.x) / u.x);
  else if (u.x < -1e-6) out = Math.min(out, (-hx - t.x) / u.x);
  if (u.z > 1e-6) out = Math.min(out, (hz - t.z) / u.z);
  else if (u.z < -1e-6) out = Math.min(out, (-hz - t.z) / u.z);
  if (u.y > 1e-6) out = Math.min(out, (top - t.y) / u.y);
  return Number.isFinite(out) ? Math.max(0, out) : 0;
}
