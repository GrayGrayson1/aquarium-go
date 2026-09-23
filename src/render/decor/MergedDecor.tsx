/**
 * Cheap decor for non-hero tanks (LOD 1/2): every item is generated at low detail, baked into tank space and
 * merged into one mesh per material class (≈4 draw calls per tank). OWNER: lane "aquascape".
 */
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { DecorDef, Tank } from '@/types';
import type { RenderLod } from '../lod';
import type { TankFXUniforms } from '../shared/underwater';
import { getDecorDef } from '@/data/catalog/decor';
import { acquireDecorGeometry, releaseDecorGeometry, MAT_CLASSES, type MatClass } from './gen';
import { makeDecorMaterial, type DecorTankUniforms } from './materials';
// lane:perf2 — merged scapes are cached by (lod, signature) so a room return never regenerates them, and a changed
// scape (plant growth step, lod swap) is prepared over frames while the previous one stays on screen
import {
  decorSignature,
  getMergedDecor,
  mergedDecorKey,
  mergedDecorPerf,
  peekMergedDecor,
  prepBudgetLeft,
  releaseMergedDecor,
  retainMergedDecor,
  spendPrepBudget,
  type MergedDecorEntry,
} from './mergedDecorCache';

export { decorSignature };

/** lane:perf2 — item geometries being generated (a few per frame) for the scape that replaces the drawn one. */
interface Prep {
  key: string;
  lod: RenderLod;
  items: { defId: string; seed: number }[];
  next: number;
  held: { def: DecorDef; seed: number; lod: RenderLod }[];
}

/** Progressive swaps need the cache (the prepared scape is handed over through it). */
const progressive = () => mergedDecorPerf.progressive && mergedDecorPerf.cache;

function releasePrep(p: Prep | null): void {
  if (!p) return;
  for (const h of p.held) releaseDecorGeometry(h.def, h.seed, h.lod);
  p.held = [];
}

export function MergedDecor({ tank, lod, fx, tankU }: { tank: Tank; lod: RenderLod; fx: TankFXUniforms; tankU: DecorTankUniforms }) {
  const sig = decorSignature(tank);
  const key = mergedDecorKey(lod, sig);
  // lane:perf2 — what to draw: the cached scape for (lod, signature); on a first mount (or with progressive rebuilds
  // off) it is built at once, as before; otherwise the previous scape stays until the new one is ready (useFrame below)
  const shown = useRef<MergedDecorEntry | null>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const prev = shown.current && !shown.current.disposed ? shown.current : null;
  const hit = peekMergedDecor(key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fresh = useMemo(() => (hit || (prev && progressive()) ? null : getMergedDecor(tank, lod, sig)), [key, !!hit]);
  const entry = hit ?? fresh ?? prev!;
  useEffect(() => {
    retainMergedDecor(entry);
    shown.current = entry;
    return () => releaseMergedDecor(entry);
  }, [entry]);
  const merged = entry.geo;

  const latest = useRef({ tank, lod, sig, key });
  latest.current = { tank, lod, sig, key };
  const prep = useRef<Prep | null>(null);
  useEffect(() => () => releasePrep(prep.current), []);
  useFrame((state) => {
    const L = latest.current;
    const drawn = shown.current;
    if (!drawn || drawn.key === L.key || !progressive()) {
      if (prep.current) {
        releasePrep(prep.current);
        prep.current = null;
      }
      return;
    }
    if (peekMergedDecor(L.key)) {
      releasePrep(prep.current);
      prep.current = null;
      redraw();
      return;
    }
    let p = prep.current;
    if (!p || p.key !== L.key) {
      releasePrep(p);
      p = prep.current = { key: L.key, lod: L.lod, items: L.tank.decor.map((d) => ({ defId: d.defId, seed: d.seed })), next: 0, held: [] };
    }
    const frameId = state.clock.elapsedTime;
    while (p.next < p.items.length) {
      if (!prepBudgetLeft(frameId)) return;
      const it = p.items[p.next++];
      const def = getDecorDef(it.defId);
      if (!def) continue;
      const t0 = performance.now();
      acquireDecorGeometry(def, it.seed, p.lod);
      p.held.push({ def, seed: it.seed, lod: p.lod });
      spendPrepBudget(performance.now() - t0);
    }
    if (!prepBudgetLeft(frameId)) return; // the merge itself next frame
    const t0 = performance.now();
    getMergedDecor(L.tank, L.lod, L.sig); // every item is warm: only the merge is left
    spendPrepBudget(performance.now() - t0);
    releasePrep(p);
    prep.current = null;
    redraw();
  });

  // materials follow the lod of the scape being drawn (a swap keeps the old one for a few frames)
  const drawLod = entry.lod;
  const mats = useMemo(() => {
    const low = drawLod === 2;
    return {
      solid: makeDecorMaterial('solid', fx, tankU, null, { lowDetail: low }),
      solidDouble: makeDecorMaterial('solidDouble', fx, tankU, null, { lowDetail: low }),
      foliage: makeDecorMaterial('foliage', fx, tankU, null, { lowDetail: low }),
      coral: makeDecorMaterial('coral', fx, tankU, null, { lowDetail: low }),
    } as Record<MatClass, THREE.MeshStandardMaterial>;
  }, [fx, tankU, drawLod]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  return (
    <group name="decor-merged">
      {MAT_CLASSES.map((k) => (merged[k] ? <mesh key={k} geometry={merged[k]} material={mats[k]} receiveShadow={drawLod === 1} /> : null))}
    </group>
  );
}
