/**
 * Fix lane INTEGRATE-UI — room render stragglers.
 *
 *   G2-07  the back-wall name sign stays inside the clear bay between the Grand Hall's back-wall columns.
 *   G2-05  (Livestock side) portraits are read back asynchronously; the GL bytes are flipped top-down and un-premultiplied.
 */
import { describe, it, expect } from 'vitest';
import { backWallSign } from '@/render/facility/bounds';
import { getFacilityLevel, FACILITY_LEVELS } from '@/data/facilities';
import { flipRows } from '@/render/portraits';

describe('G2-07 — back-wall sign vs columns', () => {
  it('a long Grand Hall exhibit row keeps the name between the inner columns', () => {
    const lvl = getFacilityLevel('grand_hall');
    const s = backWallSign('grand_hall', lvl.width, { minX: -6.8, maxX: 8.8, topY: 2.4 })!;
    const cols = lvl.props.filter((p) => p.kind === 'column' && p.z <= -lvl.depth / 2 + 1);
    expect(cols.length).toBeGreaterThan(0);
    for (const c of cols) {
      const gap = s.x + s.w / 2 < c.x ? c.x - c.w / 2 - (s.x + s.w / 2) : s.x - s.w / 2 - (c.x + c.w / 2);
      expect(gap).toBeGreaterThan(0.3);
    }
    expect(s.w).toBeGreaterThan(6); // still a big, readable headline
    expect(s.h).toBeCloseTo(s.w * 0.22, 5);
  });

  it('rooms without back-wall columns keep the exhibit-sized, exhibit-centred sign', () => {
    for (const lvl of FACILITY_LEVELS) {
      if (lvl.props.some((p) => p.kind === 'column' && p.z <= -lvl.depth / 2 + 1)) continue;
      const ext = { minX: -2.5, maxX: 3.5, topY: 1.6 };
      const s = backWallSign(lvl.id, lvl.width, ext);
      if (!s) continue;
      expect(s.x).toBeCloseTo(Math.min(Math.max(0.5, -lvl.width / 2 + s.w / 2 + 0.3), lvl.width / 2 - s.w / 2 - 0.3), 5);
      expect(s.w).toBeLessThanOrEqual(Math.max(2.2, 6 * 1.1) + 1e-9);
    }
  });
});

describe('portrait readback — GL rows to ImageData', () => {
  it('flips rows bottom-up to top-down and keeps opaque pixels untouched', () => {
    // 1 × 2 image: GL row 0 (bottom) red, row 1 (top) blue
    const gl = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    expect([...flipRows(gl, 1, 2)]).toEqual([0, 0, 255, 255, 255, 0, 0, 255]);
  });
  it('un-premultiplies translucent pixels and leaves clear ones clear', () => {
    const gl = new Uint8ClampedArray([64, 32, 0, 128, 0, 0, 0, 0]);
    const out = flipRows(gl, 2, 1);
    expect([...out.subarray(0, 4)]).toEqual([128, 64, 0, 128]);
    expect([...out.subarray(4)]).toEqual([0, 0, 0, 0]);
  });
});
