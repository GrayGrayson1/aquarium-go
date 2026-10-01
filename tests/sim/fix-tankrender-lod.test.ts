import { describe, expect, it } from 'vitest';
import { facilityLods, type RenderLod } from '@/render/lod';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);
const ones = (l: Record<string, RenderLod>) => Object.keys(l).filter((k) => l[k] === 1).sort();

describe('facility LOD hysteresis (X-1 / S09-02)', () => {
  it('starts with the nearest four at lod 1', () => {
    expect(ones(facilityLods(ids(10), {}, 4))).toEqual(['t0', 't1', 't2', 't3']);
  });

  it('tanks jittering around the cut-off do not flip', () => {
    let lods = facilityLods(ids(10), {}, 4);
    let flips = 0;
    for (let k = 0; k < 20; k++) {
      // the 4th and 5th nearest swap places every evaluation (a camera drag along the row)
      const r = ids(10);
      if (k % 2) [r[3], r[4]] = [r[4], r[3]];
      const next = facilityLods(r, lods, 4);
      for (const id of r) if (next[id] !== lods[id]) flips++;
      lods = next;
    }
    expect(flips).toBe(0);
  });

  it('a lod-1 tank drops only once it is out of the nearest six, and the set is refilled nearest-first', () => {
    const lods = facilityLods(ids(10), {}, 4);
    // t0 moves far away; t4 becomes 4th nearest
    const r = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't0'];
    const next = facilityLods(r, lods, 4);
    expect(ones(next)).toEqual(['t1', 't2', 't3', 't4']);
    // t3 slides to 6th nearest: still lod 1
    const r2 = ['t1', 't2', 't4', 't5', 't6', 't3', 't7', 't8', 't9', 't0'];
    expect(facilityLods(r2, next, 4).t3).toBe(1);
    // ...and to 7th: dropped
    const r3 = ['t1', 't2', 't4', 't5', 't6', 't7', 't3', 't8', 't9', 't0'];
    expect(facilityLods(r3, next, 4).t3).toBe(2);
  });

  it('never more than near + 2 at lod 1, never fewer than near', () => {
    let lods: Record<string, RenderLod> = {};
    let r0 = 0;
    for (let k = 0; k < 50; k++) {
      const r = ids(12).sort(() => (Math.sin(k * 97.3 + r0++) > 0 ? 1 : -1));
      lods = facilityLods(r, lods, 4);
      const n = ones(lods).length;
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  it('small facilities: every tank at lod 1', () => {
    expect(ones(facilityLods(ids(3), {}, 4))).toEqual(['t0', 't1', 't2']);
  });
});
