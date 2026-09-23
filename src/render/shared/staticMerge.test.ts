// lane:perf2 — static-mesh merging for room-view tanks: same pixels, fewer draws.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeStaticMeshes, unmergeStaticMeshes } from './staticMerge';

function worldPositions(root: THREE.Object3D, pick: (m: THREE.Mesh) => boolean): number[][] {
  root.updateMatrixWorld(true);
  const out: number[][] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !pick(m)) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = g.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      out.push([+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5)]);
    }
  });
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}

function scene() {
  const root = new THREE.Group();
  root.position.set(3, 0, -2);
  const shared = new THREE.MeshStandardMaterial({ color: '#141618' });
  const glass = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.2 });
  const patched = new THREE.MeshStandardMaterial();
  patched.onBeforeCompile = () => undefined; // unknown patch: may read object space
  const safe = new THREE.MeshStandardMaterial();
  safe.onBeforeCompile = () => undefined;
  safe.userData.mergeSafe = true;
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.3), shared);
  a.position.set(0.5, 0.1, 0);
  a.rotation.set(0.3, 0.2, 0.1);
  const sub = new THREE.Group();
  sub.position.set(-0.2, 0.4, 0.1);
  sub.scale.set(1, 2, 1);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), shared);
  b.position.set(0, 0.05, 0);
  sub.add(b);
  const spin = new THREE.Group();
  spin.userData.mergeSkip = true;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.02), shared);
  spin.add(blade);
  const g1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), glass);
  const g2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), glass);
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), patched);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), patched);
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), safe);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), safe);
  s2.position.x = 0.3;
  root.add(a, sub, spin, g1, g2, p1, p2, s1, s2);
  return { root, shared, a, b, blade, g1, g2, p1, p2, s1, s2, safe };
}

describe('useStaticMerge core', () => {
  it('merges meshes sharing a mergeable material into one, baked exactly where they were', () => {
    const t = scene();
    const before = worldPositions(t.root, (m) => m.material === t.shared && m !== t.blade);
    const st = mergeStaticMeshes(t.root);
    // shared (a + b) and the world-space-safe patch (s1 + s2) merge; glass, the unknown patch and the spinner stay
    expect(st.merged.length).toBe(2);
    expect(t.a.visible && t.b.visible).toBe(false);
    expect(t.s1.visible || t.s2.visible).toBe(false);
    for (const m of [t.blade, t.g1, t.g2, t.p1, t.p2]) expect(m.visible).toBe(true);
    const merged = st.merged.find((m) => m.material === t.shared)!;
    expect(merged.raycast(new THREE.Raycaster(), [])).toBeFalsy();
    const after = worldPositions(t.root, (m) => m === merged);
    expect(after).toEqual(before);
  });

  it('undo removes the merged meshes, frees their geometry and shows the originals again', () => {
    const t = scene();
    const st = mergeStaticMeshes(t.root);
    let disposed = 0;
    for (const m of st.merged) m.geometry.addEventListener('dispose', () => disposed++);
    const n = t.root.children.length;
    unmergeStaticMeshes(st);
    expect(t.root.children.length).toBe(n - 2);
    expect(disposed).toBe(2);
    expect(t.a.visible && t.b.visible && t.s1.visible && t.s2.visible).toBe(true);
  });

  it('never merges a material used by a single mesh or hidden meshes', () => {
    const root = new THREE.Group();
    const m1 = new THREE.MeshStandardMaterial();
    const lone = new THREE.Mesh(new THREE.BoxGeometry(), m1);
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(), m1);
    hidden.visible = false;
    root.add(lone, hidden);
    const st = mergeStaticMeshes(root);
    expect(st.merged.length).toBe(0);
    expect(lone.visible).toBe(true);
  });
});
