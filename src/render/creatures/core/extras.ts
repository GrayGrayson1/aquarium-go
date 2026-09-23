/**
 * Appendages (barbels, bristles, spines, filaments): tapered tubes swept along a smooth path, merged into the body
 * mesh so they share its swim deformation and lighting. OWNER: lane "fishart".
 */
import * as THREE from 'three';
import type { BodySampler } from './body';
import type { ExtraSpec } from './plan';

const KIND_ID: Record<ExtraSpec['kind'], number> = { barbel: 1, bristle: 1, filament: 1, spine: 2, wen: 3 };

export function buildExtrasGeometry(b: BodySampler, extras: ExtraSpec[], lod: number): THREE.BufferGeometry | null {
  const radial = lod === 0 ? 8 : lod === 1 ? 5 : 3;
  const P: number[] = [];
  const N: number[] = [];
  const UV: number[] = [];
  const BD: number[] = [];
  const AX: number[] = [];
  const I: number[] = [];
  for (const ex of extras) {
    const sides = ex.mirror ? [1, -1] : [1];
    for (const side of sides) {
      const pts = ex.path.map((p) => new THREE.Vector3(p[0], p[1], p[2] * side));
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const segs = Math.max(3, Math.round((lod === 0 ? 10 : 5) * Math.min(3, pts.length / 2 + 1)));
      const frames = curve.computeFrenetFrames(segs, false);
      const base = P.length / 3;
      const axisY = b.axis(Math.max(0, Math.min(1, ex.t)));
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const c = curve.getPointAt(u);
        const rad = ex.radius * (1 - (1 - ex.taper) * u);
        const nrm = frames.normals[i];
        const bin = frames.binormals[i];
        for (let j = 0; j <= radial; j++) {
          const a = (j / radial) * Math.PI * 2;
          const dx = Math.cos(a) * nrm.x + Math.sin(a) * bin.x;
          const dy = Math.cos(a) * nrm.y + Math.sin(a) * bin.y;
          const dz = Math.cos(a) * nrm.z + Math.sin(a) * bin.z;
          P.push(c.x + dx * rad, c.y + dy * rad, c.z + dz * rad);
          N.push(dx, dy, dz);
          UV.push(u, j / radial);
          BD.push(ex.t, 0, j / radial, KIND_ID[ex.kind]);
          AX.push(axisY, 0);
        }
      }
      // tip cap vertex
      const tip = curve.getPointAt(1);
      const tan = curve.getTangentAt(1);
      const tipIdx = P.length / 3;
      P.push(tip.x + tan.x * ex.radius * ex.taper, tip.y + tan.y * ex.radius * ex.taper, tip.z + tan.z * ex.radius * ex.taper);
      N.push(tan.x, tan.y, tan.z);
      UV.push(1, 0);
      BD.push(ex.t, 0, 0, KIND_ID[ex.kind]);
      AX.push(axisY, 0);
      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < radial; j++) {
          const a = base + i * (radial + 1) + j;
          const b2 = a + radial + 1;
          I.push(a, a + 1, b2, b2, a + 1, b2 + 1);
        }
      }
      const last = base + segs * (radial + 1);
      for (let j = 0; j < radial; j++) I.push(last + j, last + j + 1, tipIdx);
    }
  }
  if (!P.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aBody', new THREE.Float32BufferAttribute(BD, 4));
  g.setAttribute('aAxis', new THREE.Float32BufferAttribute(AX, 2));
  g.setIndex(I);
  return g;
}
