import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { DECOR } from '@/data/catalog/decor';
import { buildDecor, toGeometry, MAT_CLASSES } from '@/render/decor/gen';

/** A zero/NaN normal turns into NaN in the shader, which bloom smears over the whole frame (black flashes). */
function check(id: string, seeds: number[]) {
  const def = DECOR.find((d) => d.id === id)!;
  for (const seed of seeds)
    for (const lod of [0, 1, 2]) {
      const build = buildDecor(def, seed, lod);
      // raw generator output: no vertex of a visible (non-degenerate) triangle may have a zero smooth normal
      for (const k of MAT_CLASSES) {
        const b = build[k];
        if (!b.count) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
        g.setIndex(b.idx);
        g.computeVertexNormals();
        const n = g.getAttribute('normal');
        const pa = new THREE.Vector3();
        const pb = new THREE.Vector3();
        const pc = new THREE.Vector3();
        let bad = 0;
        for (let t = 0; t < b.idx.length; t += 3) {
          pa.fromArray(b.pos, b.idx[t] * 3);
          pb.fromArray(b.pos, b.idx[t + 1] * 3);
          pc.fromArray(b.pos, b.idx[t + 2] * 3);
          if (pb.sub(pa).cross(pc.sub(pa)).lengthSq() < 1e-26) continue;
          for (let j = 0; j < 3; j++) {
            const v = b.idx[t + j];
            if (!(Math.hypot(n.getX(v), n.getY(v), n.getZ(v)) > 0.5)) bad++;
          }
        }
        expect(bad, `${id} seed ${seed} lod ${lod} ${k}: raw zero normals on visible triangles`).toBe(0);
        g.dispose();
      }
      // final geometry: every normal unit length, every attribute finite
      const geo = toGeometry(build);
      for (const g of Object.values(geo)) {
        if (!g) continue;
        const n = g.getAttribute('normal');
        for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)), `${id} normal ${i}`).toBeGreaterThan(0.5);
        for (const name of Object.keys(g.attributes)) {
          const arr = g.getAttribute(name).array as ArrayLike<number>;
          for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) expect.fail(`${id} ${name}[${i}] = ${arr[i]}`);
        }
        g.dispose();
      }
    }
}

describe('decor normals are always valid', () => {
  it('red ogo (gracilaria) over many seeds', () => check('red_ogo', [1, 7, 99, 4007, 12345, 777, 31337, 2024]));
  it('gorgonian over many seeds', () => check('gorgonian', [1, 7, 99, 4007, 12345, 777, 31337, 2024]));
  it('hitching post, acropora, anemone, wood', () => {
    for (const id of ['hitching_post', 'acropora', 'bubble_tip_anemone', 'spider_wood', 'manzanita_branch', 'mopani_wood']) check(id, [1, 4007, 12345]);
  });
  // lane:w2-visual — rebuilt generators: sculpted mopani body, oval-hole cholla lattice, chamfered acrylic frag rack
  it('cholla lattice and frag rack', () => {
    for (const id of ['cholla_wood', 'frag_rack']) check(id, [1, 4007, 12345]);
  });
});
