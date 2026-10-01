import { describe, expect, it } from 'vitest';
import { resolveFloorTap, SAME_SPOT_M } from '@/render/facility/placementGesture';

const spot = (x: number, z: number, rotY = 0, ok = true) => ({ x, z, rotY, ok });

describe('tank placement tap rules (S10-01 / S10-04 / S10-05)', () => {
  it('mouse: a click places at the spot it landed on, not the previous preview', () => {
    const prev = spot(0.3, -1.5);
    const next = spot(-1.05, -1.94);
    const r = resolveFloorTap(prev, next, { touch: false, dragEnded: false });
    expect(r).toEqual({ kind: 'confirm', at: next });
  });

  it('touch: the first tap only previews', () => {
    expect(resolveFloorTap(null, spot(0.3, -1.5), { touch: true, dragEnded: false })).toEqual({ kind: 'preview', at: spot(0.3, -1.5) });
  });

  it('touch: tapping a different spot re-previews there instead of buying at the old one', () => {
    const prev = spot(0.3, -1.5);
    const next = spot(-1.2, 0.4, 0, false);
    expect(resolveFloorTap(prev, next, { touch: true, dragEnded: false })).toEqual({ kind: 'preview', at: next });
  });

  it('touch: a second tap near the previewed spot confirms AT the previewed spot', () => {
    const prev = spot(0.3, -1.5);
    const next = spot(0.3 + SAME_SPOT_M * 0.6, -1.5 - SAME_SPOT_M * 0.5);
    expect(resolveFloorTap(prev, next, { touch: true, dragEnded: false })).toEqual({ kind: 'confirm', at: prev });
  });

  it('touch: a second tap after a rotation confirms at the fresh evaluation (new rotY)', () => {
    const prev = spot(0.3, -1.5, 0);
    const next = spot(0.3, -1.5, Math.PI / 2);
    expect(resolveFloorTap(prev, next, { touch: true, dragEnded: false })).toEqual({ kind: 'confirm', at: next });
  });

  it('the click that ends a camera drag / pinch never places (mouse or touch)', () => {
    expect(resolveFloorTap(spot(0, 0), spot(1, 1), { touch: false, dragEnded: true })).toEqual({ kind: 'ignore' });
    expect(resolveFloorTap(spot(0, 0), spot(0, 0), { touch: true, dragEnded: true })).toEqual({ kind: 'ignore' });
  });
});
