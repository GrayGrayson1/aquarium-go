/**
 * Uniform-grid spatial hash over a tank (linked lists in typed arrays → zero per-frame allocation).
 * OWNER: lane "behavior".
 */
import type * as THREE from 'three';

export class SpatialHash {
  cell = 0.1;
  nx = 1;
  ny = 1;
  nz = 1;
  minX = 0;
  minY = 0;
  minZ = 0;
  head: Int32Array = new Int32Array(1);
  next: Int32Array = new Int32Array(64);
  count = 0;

  configure(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, cell: number): void {
    this.cell = Math.max(0.02, cell);
    this.minX = minX;
    this.minY = minY;
    this.minZ = minZ;
    this.nx = Math.max(1, Math.ceil((maxX - minX) / this.cell));
    this.ny = Math.max(1, Math.ceil((maxY - minY) / this.cell));
    this.nz = Math.max(1, Math.ceil((maxZ - minZ) / this.cell));
    const n = this.nx * this.ny * this.nz;
    if (this.head.length < n) this.head = new Int32Array(n);
  }

  private idx(x: number, y: number, z: number): number {
    const ix = Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.minX) / this.cell)));
    const iy = Math.min(this.ny - 1, Math.max(0, Math.floor((y - this.minY) / this.cell)));
    const iz = Math.min(this.nz - 1, Math.max(0, Math.floor((z - this.minZ) / this.cell)));
    return ix + this.nx * (iy + this.ny * iz);
  }

  rebuild(positions: readonly THREE.Vector3[]): void {
    const n = this.nx * this.ny * this.nz;
    this.head.fill(-1, 0, n);
    if (this.next.length < positions.length) this.next = new Int32Array(Math.max(positions.length, this.next.length * 2));
    this.count = positions.length;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const c = this.idx(p.x, p.y, p.z);
      this.next[i] = this.head[c];
      this.head[c] = i;
    }
  }

  /** Indices of items in cells overlapping the sphere, written to `out` (caller filters by distance). Returns count. */
  gather(x: number, y: number, z: number, r: number, out: Int32Array): number {
    const c = this.cell;
    let n = 0;
    const x0 = Math.max(0, Math.floor((x - r - this.minX) / c));
    const x1 = Math.min(this.nx - 1, Math.floor((x + r - this.minX) / c));
    const y0 = Math.max(0, Math.floor((y - r - this.minY) / c));
    const y1 = Math.min(this.ny - 1, Math.floor((y + r - this.minY) / c));
    const z0 = Math.max(0, Math.floor((z - r - this.minZ) / c));
    const z1 = Math.min(this.nz - 1, Math.floor((z + r - this.minZ) / c));
    for (let iz = z0; iz <= z1; iz++)
      for (let iy = y0; iy <= y1; iy++)
        for (let ix = x0; ix <= x1; ix++) {
          let i = this.head[ix + this.nx * (iy + this.ny * iz)];
          while (i >= 0 && n < out.length) {
            out[n++] = i;
            i = this.next[i];
          }
        }
    return n;
  }

  /** Visit indices of items in cells overlapping the sphere (caller filters by exact distance). */
  query(x: number, y: number, z: number, r: number, visit: (i: number) => void): void {
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r - this.minX) / c));
    const x1 = Math.min(this.nx - 1, Math.floor((x + r - this.minX) / c));
    const y0 = Math.max(0, Math.floor((y - r - this.minY) / c));
    const y1 = Math.min(this.ny - 1, Math.floor((y + r - this.minY) / c));
    const z0 = Math.max(0, Math.floor((z - r - this.minZ) / c));
    const z1 = Math.min(this.nz - 1, Math.floor((z + r - this.minZ) / c));
    for (let iz = z0; iz <= z1; iz++)
      for (let iy = y0; iy <= y1; iy++)
        for (let ix = x0; ix <= x1; ix++) {
          let i = this.head[ix + this.nx * (iy + this.ny * iz)];
          while (i >= 0) {
            visit(i);
            i = this.next[i];
          }
        }
  }
}
