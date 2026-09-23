/**
 * Baked, tileable caustic web (original Aquarium Go code). OWNER: lane "waterfx".
 *
 * The underwater shader used to evaluate two layers of animated Voronoi per fragment (~70 transcendental ops on every
 * lit pixel inside a tank). Instead the web is baked once into a mipmapped RGB texture and the shader combines two
 * drifting, domain-warped samples of it — the same look for a fraction of the cost, and mipmapping keeps distant
 * tanks free of sparkly aliasing.
 *
 * Channels hold the same web at three focus widths (in cell units, see CAUSTIC_WIDTHS): R sharp, G medium, B soft. The
 * shader blends between them by water depth and per colour channel (a cheap dispersion fringe).
 */
import * as THREE from 'three';

/** Cells across one texture tile (the shader divides its cell-space coordinate by this). */
export const CAUSTIC_TILE_CELLS = 8;
/** Web widths (cell units) baked into R, G, B. Keep in sync with AG_CAUSTIC_W in underwater.ts. */
export const CAUSTIC_WIDTHS: [number, number, number] = [0.06, 0.13, 0.27];

let tex: THREE.DataTexture | null = null;

function hash2(ix: number, iy: number): [number, number] {
  // integer hash → two floats in [0,1)
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  const a = (h >>> 0) / 4294967296;
  let k = Math.imul(h ^ 0x9e3779b9, 2246822519);
  k ^= k >>> 15;
  const b = (k >>> 0) / 4294967296;
  return [a, b];
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Build the texture data (exported for tests). */
export function bakeCausticData(size = 512, cells = CAUSTIC_TILE_CELLS): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const C = cells;
  // jittered feature point per (wrapped) cell
  const fx = new Float32Array(C * C);
  const fz = new Float32Array(C * C);
  for (let j = 0; j < C; j++)
    for (let i = 0; i < C; i++) {
      const [a, b] = hash2(i + 17, j + 31);
      fx[j * C + i] = 0.12 + 0.76 * a;
      fz[j * C + i] = 0.12 + 0.76 * b;
    }
  const TAU = Math.PI * 2;
  const [w0, w1, w2] = CAUSTIC_WIDTHS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let px = ((x + 0.5) / size) * C;
      let py = ((y + 0.5) / size) * C;
      // tile-periodic domain warp: bends the straight Voronoi walls into organic, uneven curves
      const wx = 0.2 * Math.sin((TAU * 2 * py) / C + 1.3) + 0.11 * Math.sin((TAU * 5 * (px + py)) / C + 0.4);
      const wy = 0.2 * Math.sin((TAU * 3 * px) / C + 2.1) + 0.11 * Math.sin((TAU * 4 * (px - py)) / C + 5.2);
      px += wx;
      py += wy;
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      let d1 = 9;
      let d2 = 9;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const cx = ix + i;
          const cy = iy + j;
          const k = (((cy % C) + C) % C) * C + (((cx % C) + C) % C);
          const dx = cx + fx[k] - px;
          const dy = cy + fz[k] - py;
          const d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
      const e = Math.sqrt(d2) - Math.sqrt(d1);
      const o = (y * size + x) * 4;
      const r = 1 - smooth(0, w0, e);
      const g = 1 - smooth(0, w1, e);
      const b = 1 - smooth(0, w2, e);
      data[o] = Math.round(r * r * 255);
      data[o + 1] = Math.round(g * g * 255);
      data[o + 2] = Math.round(b * b * 255);
      data[o + 3] = 255;
    }
  }
  return data;
}

/** Shared caustic texture (built lazily, never disposed — one ~1.3 MB texture for the whole app). */
export function getCausticTexture(): THREE.DataTexture {
  if (tex) return tex;
  const size = 512;
  const t = new THREE.DataTexture(bakeCausticData(size), size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = THREE.NoColorSpace;
  t.name = 'ag-caustics';
  t.needsUpdate = true;
  tex = t;
  return t;
}
