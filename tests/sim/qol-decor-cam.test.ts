/**
 * chunk 19 (ADR-0055 decision 4, QOL-005) — the decorating camera's pose: its limits, presets, steps, the slide that
 * follows the player's right, the view kept for the next piece, and the camera never inside the glass or the water.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { clampDecorPose, decorCam, DECOR_HOME, DECOR_KEEP_MS, DECOR_LIMITS, DECOR_PRESETS, easeDecorCam, enterDecorCam, exitDistance, leaveDecorCam, nudgeDecorCam, setDecorPreset, slideDecorCam } from '@/render/camera/decorCam';

beforeEach(() => {
  decorCam.tankId = '';
  decorCam.leftAt = -Infinity;
  enterDecorCam('t1', 0);
});

describe('QOL-005: the decorating pose', () => {
  it('starts looking down into the tank, the whole floor in view', () => {
    expect(decorCam.want).toEqual(DECOR_HOME);
    expect(DECOR_HOME.pitch).toBeGreaterThan(0.4);
    expect(DECOR_HOME.pitch).toBeLessThan(0.7);
  });
  it('turns almost to the side, tilts to straight down and zooms within its limits', () => {
    for (let i = 0; i < 40; i++) nudgeDecorCam({ yaw: 0.2, pitch: 0.2, zoom: 0.8 });
    expect(decorCam.want.yaw).toBe(DECOR_LIMITS.yaw);
    expect(decorCam.want.pitch).toBe(DECOR_LIMITS.pitchMax);
    expect(decorCam.want.zoom).toBe(DECOR_LIMITS.zoomMin);
    for (let i = 0; i < 80; i++) nudgeDecorCam({ yaw: -0.2, pitch: -0.2, zoom: 1.25 });
    expect(decorCam.want.yaw).toBe(-DECOR_LIMITS.yaw);
    expect(decorCam.want.pitch).toBe(DECOR_LIMITS.pitchMin);
    expect(decorCam.want.zoom).toBe(DECOR_LIMITS.zoomMax);
    expect(clampDecorPose({ yaw: NaN, pitch: NaN, zoom: NaN, panX: NaN, panZ: NaN })).toEqual({ yaw: -DECOR_LIMITS.yaw, pitch: DECOR_LIMITS.pitchMin, zoom: DECOR_LIMITS.zoomMin, panX: -DECOR_LIMITS.pan, panZ: -DECOR_LIMITS.pan });
  });
  it('slides to the player’s right whichever side they look from, and stays within the tank', () => {
    slideDecorCam(0.3, 0); // from the front: right is +x
    expect(decorCam.want.panX).toBeCloseTo(0.3);
    expect(decorCam.want.panZ).toBeCloseTo(0);
    setDecorPreset('reset');
    decorCam.want.yaw = Math.PI / 2 - 0.0001; // looking from the right-hand end: right is toward the back (−z)
    slideDecorCam(0.3, 0);
    expect(decorCam.want.panZ).toBeLessThan(-0.29);
    for (let i = 0; i < 20; i++) slideDecorCam(0.5, 0.5);
    expect(Math.abs(decorCam.want.panX)).toBeLessThanOrEqual(DECOR_LIMITS.pan);
    expect(Math.abs(decorCam.want.panZ)).toBeLessThanOrEqual(DECOR_LIMITS.pan);
  });
  it('jumps to Front, Above, Left and Right keeping the slide; Reset goes home', () => {
    slideDecorCam(0.4, 0);
    setDecorPreset('above');
    expect(decorCam.want.pitch).toBe(DECOR_PRESETS.above.pitch);
    expect(decorCam.want.panX).toBeCloseTo(0.4);
    setDecorPreset('left');
    expect(decorCam.want.yaw).toBeLessThan(-1);
    setDecorPreset('reset');
    expect(decorCam.want).toEqual(DECOR_HOME);
  });
  it('eases what is shown toward what is wanted', () => {
    setDecorPreset('above');
    const before = decorCam.now.pitch;
    easeDecorCam(0.5);
    expect(decorCam.now.pitch).toBeGreaterThan(before);
    for (let i = 0; i < 60; i++) easeDecorCam(0.5);
    expect(decorCam.now.pitch).toBeCloseTo(DECOR_PRESETS.above.pitch, 5);
  });
  it('keeps the view for the next piece in the same tank, not in another tank or much later', () => {
    nudgeDecorCam({ yaw: 0.6 });
    leaveDecorCam(1000);
    enterDecorCam('t1', 1000 + DECOR_KEEP_MS - 1);
    expect(decorCam.want.yaw).toBeCloseTo(0.6);
    leaveDecorCam(5000);
    enterDecorCam('t2', 5001);
    expect(decorCam.want).toEqual(DECOR_HOME);
    nudgeDecorCam({ yaw: 0.6 });
    leaveDecorCam(10_000);
    enterDecorCam('t2', 10_000 + DECOR_KEEP_MS + 1);
    expect(decorCam.want).toEqual(DECOR_HOME);
  });
});

describe('QOL-005: never inside the glass or the water', () => {
  const box = { hx: 0.3, hz: 0.15, top: 0.3 };
  it('stands at least where the view ray leaves the tank', () => {
    const t = { x: 0, y: 0.05, z: 0 };
    expect(exitDistance(t, { x: 0, y: 0, z: 1 }, box.hx, box.hz, box.top)).toBeCloseTo(0.15); // out through the front glass
    expect(exitDistance(t, { x: 0, y: 1, z: 0 }, box.hx, box.hz, box.top)).toBeCloseTo(0.25); // out through the surface
    const u = { x: Math.SQRT1_2, y: 0, z: Math.SQRT1_2 };
    expect(exitDistance(t, u, box.hx, box.hz, box.top)).toBeCloseTo(0.15 / Math.SQRT1_2); // the nearer face wins
  });
  it('is zero when the look-at point is already outside', () => {
    expect(exitDistance({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, box.hx, box.hz, box.top)).toBe(0);
  });
});
