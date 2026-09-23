import { describe, it, expect } from 'vitest';
import { DECOR } from '@/data/catalog/decor';
import { buildDecor, MAT_CLASSES } from '@/render/decor/gen';

describe('procedural decor geometry', () => {
  for (const def of DECOR) {
    it(`${def.id}: builds at every LOD, stays inside its size box, no NaN`, () => {
      let prev = Infinity;
      for (const lod of [0, 1, 2]) {
        const t0 = performance.now();
        const b = buildDecor(def, 12345, lod);
        const ms = performance.now() - t0;
        let verts = 0;
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (const k of MAT_CLASSES) {
          const g = b[k];
          verts += g.count;
          for (let i = 0; i < g.pos.length; i++) {
            const v = g.pos[i];
            expect(Number.isFinite(v)).toBe(true);
            const a = i % 3;
            if (v < min[a]) min[a] = v;
            if (v > max[a]) max[a] = v;
          }
          for (const idx of g.idx) expect(idx).toBeLessThan(g.count);
        }
        expect(verts).toBeGreaterThan(0);
        const tol = 0.004;
        expect(max[0], `${def.id} lod${lod} +x`).toBeLessThanOrEqual(def.size.w / 2 + tol);
        expect(min[0], `${def.id} lod${lod} -x`).toBeGreaterThanOrEqual(-def.size.w / 2 - tol);
        expect(max[2], `${def.id} lod${lod} +z`).toBeLessThanOrEqual(def.size.d / 2 + tol);
        expect(min[2], `${def.id} lod${lod} -z`).toBeGreaterThanOrEqual(-def.size.d / 2 - tol);
        expect(max[1], `${def.id} lod${lod} top`).toBeLessThanOrEqual(def.size.h + tol);
        expect(min[1], `${def.id} lod${lod} bottom`).toBeGreaterThanOrEqual(-0.02);
        if (lod === 0) expect(verts, `${def.id} vertex budget`).toBeLessThan(90000);
        if (lod === 2) expect(verts, `${def.id} lod2 budget`).toBeLessThanOrEqual(prev);
        prev = Math.min(prev, verts);
        if (lod === 0) console.log(`${def.id.padEnd(22)} lod0 ${String(verts).padStart(6)} verts ${ms.toFixed(1)}ms`);
      }
    });
  }
});
