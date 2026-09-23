/**
 * lane:perf2 — runtime static-mesh merging for room-view (LOD 1/2) tanks.
 *
 * A distant tank's shell and equipment are ~20–35 small meshes (rim bars, silicone beads, cabinet doors, filter bodies,
 * pipes, light-bar legs…), most of them sharing a handful of materials. Each is its own draw call in every room frame.
 * `useStaticMerge(ref, enabled)` merges, after every commit of the owner, the meshes under `ref` that share a material
 * into ONE mesh per material (geometry baked into the root's space), and hides the originals. Nothing changes on
 * screen: same geometry, same materials, same shadow flags — only fewer draws.
 *
 * What is never merged (left exactly as it was):
 *  - transparent materials (their per-object back-to-front sorting would change), shader materials, and materials with
 *    their own `onBeforeCompile` unless marked `userData.mergeSafe` (a patch may read object-space `position`, which
 *    baking would shift; the underwater patch reads world space and is safe);
 *  - anything under an object marked `userData.mergeSkip` (animated parts: fan blades, wavemaker cage);
 *  - multi-material meshes, instanced meshes, custom draw ranges, and a material used by a single mesh.
 * Originals stay in the scene (hidden), so pointer picking and React ownership are untouched. The merge is redone
 * whenever the set of meshes, their geometry, material, flags or transforms change, and undone when disabled/unmounted.
 */
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface MergeState {
  sig: string;
  merged: THREE.Mesh[];
  hidden: THREE.Mesh[];
}

const noRaycast = () => null;

function mergeable(mat: THREE.Material): boolean {
  if (mat.transparent || (mat as THREE.ShaderMaterial).isShaderMaterial || mat.userData?.mergeSkip) return false;
  // a custom shader patch may depend on object-space position/normal — only merge patches known to be world-space
  if (Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile') && !mat.userData?.mergeSafe) return false;
  return true;
}

/** Transform of `o` relative to `root` (product of local matrices below root). */
function relativeMatrix(o: THREE.Object3D, root: THREE.Object3D, out: THREE.Matrix4): THREE.Matrix4 {
  out.identity();
  for (let n: THREE.Object3D | null = o; n && n !== root; n = n.parent) {
    if (n.matrixAutoUpdate) n.updateMatrix();
    out.premultiply(n.matrix);
  }
  return out;
}

function attrSig(g: THREE.BufferGeometry): string {
  let s = g.index ? 'i' : 'n';
  for (const name of Object.keys(g.attributes).sort()) {
    const a = g.attributes[name] as THREE.BufferAttribute;
    s += `|${name}${a.itemSize}${a.normalized ? 'n' : ''}${(a as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute ? 'x' : ''}`;
  }
  return s + (Object.keys(g.morphAttributes).length ? '|morph' : '');
}

interface Cand {
  mesh: THREE.Mesh;
  key: string;
  matrix: THREE.Matrix4;
}

function collect(root: THREE.Object3D, ignore: Set<THREE.Object3D>): Cand[] {
  const out: Cand[] = [];
  const walk = (o: THREE.Object3D, skip: boolean) => {
    if (ignore.has(o)) return;
    const sk = skip || !!o.userData?.mergeSkip;
    const mesh = o as THREE.Mesh;
    if (!sk && mesh.isMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && !(mesh as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) {
      const mat = mesh.material;
      const g = mesh.geometry;
      if (!Array.isArray(mat) && mergeable(mat) && g && g.attributes.position && g.drawRange.start === 0 && g.drawRange.count === Infinity) {
        const key = `${mat.uuid}|${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}|${mesh.renderOrder}|${mesh.frustumCulled ? 1 : 0}|${mesh.layers.mask}|${attrSig(g)}`;
        out.push({ mesh, key, matrix: relativeMatrix(mesh, root, new THREE.Matrix4()) });
      }
    }
    for (const c of o.children) walk(c, sk);
  };
  for (const c of root.children) walk(c, false);
  return out;
}

function signature(cands: Cand[]): string {
  let s = '';
  for (const c of cands) {
    s += `${c.mesh.id}:${c.mesh.visible ? 1 : 0}:${c.mesh.geometry.uuid}:${c.key}:`;
    const e = c.matrix.elements;
    for (let i = 0; i < 16; i++) s += `${Math.round(e[i] * 1e5)},`;
    s += ';';
  }
  return s;
}

/** Live merges (for the A/B view switch below). */
const live = new Set<MergeState>();

function undo(st: MergeState | null): void {
  if (!st) return;
  live.delete(st);
  for (const m of st.merged) {
    m.removeFromParent();
    m.geometry.dispose();
  }
  for (const h of st.hidden) h.visible = true;
  st.merged = [];
  st.hidden = [];
}

function apply(root: THREE.Object3D, cands: Cand[]): MergeState {
  const groups = new Map<string, Cand[]>();
  for (const c of cands) {
    if (!c.mesh.visible) continue; // hidden by its owner: leave alone
    let l = groups.get(c.key);
    if (!l) groups.set(c.key, (l = []));
    l.push(c);
  }
  const st: MergeState = { sig: '', merged: [], hidden: [] };
  live.add(st);
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parts = list.map((c) => c.mesh.geometry.clone().applyMatrix4(c.matrix));
    let mg: THREE.BufferGeometry | null = null;
    try {
      mg = mergeGeometries(parts, false);
    } catch {
      mg = null;
    }
    parts.forEach((p) => p.dispose());
    if (!mg) continue;
    const src = list[0].mesh;
    const m = new THREE.Mesh(mg, src.material);
    m.name = 'static-merge';
    m.castShadow = src.castShadow;
    m.receiveShadow = src.receiveShadow;
    m.renderOrder = src.renderOrder;
    m.frustumCulled = src.frustumCulled;
    m.layers.mask = src.layers.mask;
    m.raycast = noRaycast;
    m.userData.noPick = true;
    m.userData.staticMerge = true;
    root.add(m);
    st.merged.push(m);
    for (const c of list) {
      c.mesh.visible = false;
      st.hidden.push(c.mesh);
    }
  }
  return st;
}

/** One-shot merge of the static meshes under `root` (tests / non-React callers). Undo with `unmergeStaticMeshes`. */
export function mergeStaticMeshes(root: THREE.Object3D): MergeState {
  const cands = collect(root, new Set());
  const st = apply(root, cands);
  st.sig = signature(cands);
  return st;
}

export function unmergeStaticMeshes(st: MergeState): void {
  undo(st);
}

/**
 * Merge the static meshes under `ref` per material while `enabled` (see the file comment). Runs after every commit of
 * the calling component; cheap when nothing changed (one walk + a signature compare). Children that re-render on their
 * own (without the owner) must not own mergeable meshes — mark such a subtree `userData.mergeSkip`.
 */
export function useStaticMerge(ref: RefObject<THREE.Object3D | null>, enabled: boolean): void {
  const state = useRef<MergeState | null>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    const st = state.current;
    if (!root || !enabled || !staticMergeOpts.on) {
      undo(st);
      state.current = null;
      return;
    }
    // temporarily un-hide our originals so the collection sees the owner's intent, and skip our merged meshes
    const ignore = new Set<THREE.Object3D>(st?.merged ?? []);
    const wasHidden = st?.hidden ?? [];
    for (const h of wasHidden) h.visible = true;
    const cands = collect(root, ignore);
    const sig = signature(cands);
    if (st && st.sig === sig) {
      for (const h of wasHidden) h.visible = false;
      return;
    }
    undo(st);
    const next = apply(root, cands);
    next.sig = sig;
    state.current = next;
  });
  useEffect(
    () => () => {
      undo(state.current);
      state.current = null;
    },
    [],
  );
}

/**
 * A/B switch: `?nomerge` starts with merging off; dev or `?perf=1` expose `window.__AQ_STATIC_MERGE.opts.on` (takes
 * effect on the next commit of each owner) and `showMerged(bool)` (flips every live merge at once, same frame).
 */
export const staticMergeOpts = { on: !(typeof location !== 'undefined' && new URLSearchParams(location.search).has('nomerge')) };
if (typeof window !== 'undefined' && (import.meta.env.DEV || new URLSearchParams(location.search).has('perf'))) {
  (window as unknown as { __AQ_STATIC_MERGE?: unknown }).__AQ_STATIC_MERGE = {
    opts: staticMergeOpts,
    /** Same-moment A/B: draw the originals (false) or the merged meshes (true) without a React commit. */
    showMerged(on: boolean) {
      for (const st of live) {
        for (const m of st.merged) m.visible = on;
        for (const h of st.hidden) h.visible = !on;
      }
      return live.size;
    },
  };
}
