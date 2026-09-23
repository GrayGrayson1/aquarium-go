/**
 * Eggs, bubble nests, egg strands, snail clutches, fry clouds and seahorse birth bursts. OWNER: lane "critterart".
 *
 * Reads `state.clutches` for this tank (visual + stage + anchor/extraAnchors, see src/sim/life/breeding/index.ts)
 * and creatures' `repro` (betta `nest_building`/`nest_ready` with `nestProgress` + `nestAnchor`). Carried broods
 * (`pouch`, `berried`) are drawn by the carrier's own creature visual (seahorse pouch morph, shrimp eggs).
 * Everything is instanced, deterministic per clutch id, allocation-free per frame, and scaled down by LOD.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Clutch, Creature, Tank } from '@/types';
import type { RenderLod } from '../../lod';
import { useGame, getGame } from '@/state/game';
import { findSpecies } from '@/data/species';
import { tankDims, decorCollider } from '@/sim/tankSpace';
import { getDecorDef } from '@/data/catalog/decor';
import { runtime } from '@/runtime/tankRuntime';
import { useTankFX, type TankFXUniforms } from '../../shared/underwater';
import { acquireSphere, bubbleMaterial, buildFryGeometry, eggMaterial, fryMaterial, jellyMaterial, releaseSphere } from './breedingAssets';
import { rng, hashStr, clamp, smoothstep, lerp, noise1 } from '../special/common/math';

type V = { x: number; y: number; z: number };

interface Desc {
  key: string;
  type: 'nest' | 'adhesive' | 'scattered' | 'strands' | 'snail' | 'fry';
  clutchId?: string;
  creatureId?: string;
  eggClutchId?: string;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

/** Outward surface normal at an anchor sitting on decor (ellipsoid-collider gradient), +Y when free-standing. */
function surfaceNormal(tank: Tank, a: V, out: THREE.Vector3): THREE.Vector3 {
  let best = Infinity;
  out.set(0, 1, 0);
  for (const inst of tank.decor) {
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    const c = decorCollider(inst, def);
    const dx = (a.x - c.center[0]) / Math.max(1e-3, c.radius[0]);
    const dy = (a.y - c.center[1]) / Math.max(1e-3, c.radius[1]);
    const dz = (a.z - c.center[2]) / Math.max(1e-3, c.radius[2]);
    const d = Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - 1);
    if (d < best && d < 0.6) {
      best = d;
      out.set(dx / c.radius[0], Math.max(dy / c.radius[1], -0.2), dz / c.radius[2]).normalize();
    }
  }
  return out;
}

function isBubbleNester(speciesId: string): boolean {
  return findSpecies(speciesId)?.breeding.system === 'bubble_nest';
}

function clutchProgress(cl: Clutch, hour: number): number {
  const since = cl.stageSinceHour ?? cl.laidHour;
  return clamp((hour - since) / Math.max(0.01, cl.nextStageHour - since));
}

function anchorsOf(cl: Clutch, fallback: V): V[] {
  const a: V[] = [];
  if (cl.anchor) a.push(cl.anchor);
  if (cl.extraAnchors) a.push(...cl.extraAnchors);
  if (!a.length) a.push(fallback);
  return a;
}

/**
 * Per-tank key of visible clutches + bubble nests, for every tank in one pass per published (clutches, creatures)
 * pair. lane:perf — replaces a full scan per mounted tank per store update; same strings as before.
 */
const breedKeyCache = new WeakMap<object, { clutches: object; m: Map<string, string> }>();
function breedingKeysByTank(clutches: Record<string, Clutch>, creatures: Record<string, Creature>): Map<string, string> {
  const hit = breedKeyCache.get(creatures);
  if (hit && hit.clutches === clutches) return hit.m;
  const m = new Map<string, string>();
  for (const id in clutches) {
    const cl = clutches[id];
    if (!cl.tankId || cl.count <= 0) continue;
    m.set(cl.tankId, (m.get(cl.tankId) ?? '') + `${id}:${cl.visual}:${cl.stage};`);
  }
  for (const id in creatures) {
    const c = creatures[id];
    if (!c.tankId || c.status !== 'alive') continue;
    const st = c.repro?.stage;
    if ((st === 'nest_building' || st === 'nest_ready' || st === 'guarding') && c.repro?.nestAnchor && isBubbleNester(c.speciesId)) m.set(c.tankId, (m.get(c.tankId) ?? '') + `n${id};`);
  }
  breedKeyCache.set(creatures, { clutches, m });
  return m;
}

export function BreedingVisuals({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const fx = useTankFX();
  const key = useGame((s) => (s.game ? breedingKeysByTank(s.game.clutches, s.game.creatures).get(tank.id) ?? '' : ''));

  const descs = useMemo<Desc[]>(() => {
    const g = getGame();
    if (!g || !key) return [];
    const out: Desc[] = [];
    const nestEggs: string[] = [];
    for (const id in g.clutches) {
      const cl = g.clutches[id];
      if (cl.tankId !== tank.id || cl.count <= 0) continue;
      if (cl.visual === 'pouch' || cl.visual === 'berried' || cl.stage === 'in_pouch') continue;
      if (cl.stage === 'larvae' || cl.stage === 'fry' || cl.visual === 'fry_cloud') {
        out.push({ key: `fry:${id}`, type: 'fry', clutchId: id });
        // betta larvae hang in the (thinning) bubble nest until free-swimming
        if (cl.stage === 'larvae' && isBubbleNester(cl.speciesId)) nestEggs.push(id);
        continue;
      }
      switch (cl.visual) {
        case 'bubble_nest':
          nestEggs.push(id);
          break;
        case 'eggs_adhesive':
          out.push({ key: `adh:${id}`, type: 'adhesive', clutchId: id });
          break;
        case 'eggs_scattered':
          out.push({ key: `sc:${id}`, type: 'scattered', clutchId: id });
          break;
        case 'egg_strands':
          out.push({ key: `str:${id}`, type: 'strands', clutchId: id });
          break;
        case 'snail_clutch':
          out.push({ key: `sn:${id}`, type: 'snail', clutchId: id });
          break;
      }
    }
    const nests: Desc[] = [];
    for (const id in g.creatures) {
      const c = g.creatures[id];
      if (c.tankId !== tank.id || !c.repro?.nestAnchor || !isBubbleNester(c.speciesId)) continue;
      const st = c.repro.stage;
      if (st === 'nest_building' || st === 'nest_ready' || st === 'guarding') nests.push({ key: `nest:${id}`, type: 'nest', creatureId: id });
    }
    // bubble-nest egg clutches go into the guarding male's nest, or get their own nest at the clutch anchor
    for (const cid of nestEggs) {
      const cl = g.clutches[cid];
      const owner = nests.find((n) => n.creatureId === cl.guardedById || n.creatureId === cl.fatherId) ?? nests.find((n) => !n.eggClutchId);
      if (owner && !owner.eggClutchId) owner.eggClutchId = cid;
      else nests.push({ key: `nestc:${cid}`, type: 'nest', clutchId: cid, eggClutchId: cid });
    }
    return [...nests, ...out];
  }, [key, tank.id]);

  const dims = useMemo(() => tankDims(tank), [tank]);
  return (
    <group name={`breeding:${tank.id}`}>
      {descs.map((d) => {
        switch (d.type) {
          case 'nest':
            return <BubbleNest key={d.key} d={d} fx={fx} lod={lod} waterY={dims.waterY} />;
          case 'adhesive':
            return <AdhesiveEggs key={d.key} d={d} fx={fx} lod={lod} tank={tank} />;
          case 'scattered':
            return <ScatteredEggs key={d.key} d={d} fx={fx} lod={lod} dims={dims} />;
          case 'strands':
            return <EggStrands key={d.key} d={d} fx={fx} lod={lod} dims={dims} />;
          case 'snail':
            return <SnailClutch key={d.key} d={d} fx={fx} lod={lod} dims={dims} />;
          case 'fry':
            return lod < 2 ? <FryCloud key={d.key} d={d} fx={fx} lod={lod} dims={dims} /> : null;
        }
        return null;
      })}
      {lod === 0 && <BirthBursts tank={tank} fx={fx} dims={dims} />}
    </group>
  );
}

// ───────────────────────────── helpers ─────────────────────────────

function useInstanced(build: () => THREE.InstancedMesh, deps: unknown[]): React.RefObject<THREE.InstancedMesh | null> {
  const ref = useRef<THREE.InstancedMesh | null>(null);
  const group = useRef<THREE.Group | null>(null);
  void group;
  const mesh = useMemo(build, deps); // eslint-disable-line react-hooks/exhaustive-deps
  ref.current = mesh;
  useEffect(
    () => () => {
      const mat = mesh.material as THREE.Material | THREE.Material[];
      (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
      mesh.dispose();
    },
    [mesh],
  );
  return ref;
}

function Prim({ obj }: { obj: THREE.Object3D | null }) {
  return obj ? <primitive object={obj} /> : null;
}

function useSphere(): THREE.BufferGeometry {
  const geo = useMemo(() => acquireSphere(), []);
  useEffect(() => () => releaseSphere(), []);
  return geo;
}

// ───────────────────────────── bubble nest (betta) ─────────────────────────────

function BubbleNest({ d, fx, lod, waterY }: { d: Desc; fx: TankFXUniforms; lod: RenderLod; waterY: number }) {
  const sphere = useSphere();
  const N = lod === 0 ? 320 : lod === 1 ? 140 : 50;
  const NE = lod === 2 ? 0 : lod === 1 ? 30 : 80;
  const seed = hashStr(d.key);
  // deterministic foam layout, sorted centre-out so the nest grows outward with progress
  const layout = useMemo(() => {
    const R = rng(seed);
    const pts: { x: number; z: number; y: number; r: number; d: number }[] = [];
    for (let i = 0; i < N; i++) {
      const rho = Math.pow(R(), 0.75);
      const a = R() * Math.PI * 2;
      const r = lerp(0.0011, 0.0042, Math.pow(R(), 2.2));
      const heap = 0.009 * (1 - rho * rho);
      pts.push({ x: Math.cos(a) * rho, z: Math.sin(a) * rho * 0.8, y: heap * R(), r, d: rho });
    }
    pts.sort((a, b) => a.d - b.d);
    return pts;
  }, [N, seed]);
  const bubbles = useInstanced(() => {
    const m = new THREE.InstancedMesh(sphere, bubbleMaterial(fx), N);
    m.count = 0;
    m.renderOrder = 3;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, N]);
  const eggs = useInstanced(() => {
    const m = new THREE.InstancedMesh(sphere, eggMaterial(fx), Math.max(1, NE));
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, NE]);
  const last = useRef({ n: -1, e: -1, ax: 0, az: 0 });
  useFrame((st) => {
    const g = getGame();
    const bm = bubbles.current;
    const em = eggs.current;
    if (!g || !bm || !em) return;
    const c = d.creatureId ? g.creatures[d.creatureId] : undefined;
    const ecl = d.eggClutchId ? g.clutches[d.eggClutchId] : undefined;
    const anchor: V | undefined = c?.repro?.nestAnchor ?? ecl?.anchor ?? (d.clutchId ? g.clutches[d.clutchId]?.anchor : undefined);
    if (!anchor) {
      bm.count = 0;
      em.count = 0;
      return;
    }
    const prog = c ? clamp(c.repro.nestProgress ?? (c.repro.stage === 'nest_ready' ? 1 : 0.3)) : ecl && ecl.stage !== 'eggs' ? 0.55 : 0.85;
    const R = 0.018 + 0.05 * Math.sqrt(prog);
    const n = Math.round(N * clamp(0.08 + prog * 0.92));
    const t = st.clock.elapsedTime;
    const moved = Math.abs(anchor.x - last.current.ax) + Math.abs(anchor.z - last.current.az) > 1e-4;
    if (n !== last.current.n || moved || (t * 4) % 1 < 0.05) {
      last.current.n = n;
      last.current.ax = anchor.x;
      last.current.az = anchor.z;
      for (let i = 0; i < n; i++) {
        const p = layout[i];
        const wob = 1 + 0.04 * Math.sin(t * 0.7 + i * 1.3);
        _p.set(anchor.x + p.x * R, waterY - p.r * 0.35 - p.y * 0.3, anchor.z + p.z * R);
        _s.setScalar(p.r * wob);
        _m.compose(_p, _q.identity(), _s);
        bm.setMatrixAt(i, _m);
      }
      bm.count = n;
      bm.instanceMatrix.needsUpdate = true;
    }
    // eggs tucked among the bubbles (and hatching larvae hang beneath)
    const eggCount = ecl && ecl.stage === 'eggs' ? Math.min(NE, Math.max(3, Math.round(ecl.count / 6))) : 0;
    if (eggCount !== last.current.e) {
      last.current.e = eggCount;
      const Re = rng(seed + 7);
      for (let i = 0; i < eggCount; i++) {
        const rho = Math.pow(Re(), 0.8) * R * 0.6;
        const a = Re() * Math.PI * 2;
        _p.set(anchor.x + Math.cos(a) * rho, waterY - 0.004 - Re() * 0.004, anchor.z + Math.sin(a) * rho * 0.8);
        _s.setScalar(0.0009 + Re() * 0.0002);
        _m.compose(_p, _q.identity(), _s);
        em.setMatrixAt(i, _m);
        em.setColorAt(i, _c.set('#f6ecc8').lerp(_c.clone().set('#e8d6a0'), Re()));
      }
      em.count = eggCount;
      em.instanceMatrix.needsUpdate = true;
      if (em.instanceColor) em.instanceColor.needsUpdate = true;
    }
  });
  return (
    <>
      <Prim obj={bubbles.current} />
      <Prim obj={eggs.current} />
    </>
  );
}

// ───────────────────────────── adhesive eggs (clownfish) ─────────────────────────────

function AdhesiveEggs({ d, fx, lod, tank }: { d: Desc; fx: TankFXUniforms; lod: RenderLod; tank: Tank }) {
  const sphere = useSphere();
  const N = lod === 0 ? 320 : lod === 1 ? 140 : 40;
  const seed = hashStr(d.key);
  const eggs = useInstanced(() => {
    const m = new THREE.InstancedMesh(sphere, eggMaterial(fx), N);
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, N]);
  const eyes = useInstanced(() => {
    const mat = eggMaterial(fx);
    mat.color.set('#1a1c20');
    mat.metalness = 0.6;
    mat.roughness = 0.2;
    const m = new THREE.InstancedMesh(sphere, mat, N);
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, N]);
  const state = useRef({ n: -1, stageBand: -1 });
  const fresh = useMemo(() => new THREE.Color('#ff8a2a'), []);
  const mid = useMemo(() => new THREE.Color('#8a5634'), []);
  const late = useMemo(() => new THREE.Color('#a9a8a2'), []);
  useFrame(() => {
    const g = getGame();
    const em = eggs.current;
    const ey = eyes.current;
    if (!g || !em || !ey || !d.clutchId) return;
    const cl = g.clutches[d.clutchId];
    if (!cl || !cl.anchor) {
      em.count = 0;
      ey.count = 0;
      return;
    }
    const p = clutchProgress(cl, g.clock.hour);
    const n = Math.min(N, Math.max(8, Math.round(cl.count * (lod === 0 ? 0.8 : 0.4))));
    const band = Math.round(p * 20);
    if (n === state.current.n && band === state.current.stageBand) return;
    state.current.n = n;
    state.current.stageBand = band;
    const R = rng(seed);
    const spacing = 0.0026;
    const nrm = surfaceNormal(tank, cl.anchor, new THREE.Vector3());
    const face = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    const col = p < 0.45 ? _c.copy(fresh).lerp(mid, smoothstep(0.2, 0.45, p)) : _c.copy(mid).lerp(late, smoothstep(0.55, 0.9, p));
    const eyeShow = smoothstep(0.55, 0.8, p);
    for (let i = 0; i < n; i++) {
      // sunflower packing on a gently domed rock face
      const r = spacing * Math.sqrt(i + 0.5) * 0.62;
      const a = i * 2.39996;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const lift = -(x * x + z * z) * 4;
      _e.set((R() - 0.5) * 0.4, R() * 6.28, (R() - 0.5) * 0.4);
      _q.setFromEuler(_e).premultiply(face);
      _p.set(x, 0.0016 + lift, z).applyQuaternion(face).add(cl.anchor as THREE.Vector3Like);
      _s.set(0.00085, 0.0014, 0.00085);
      _m.compose(_p, _q, _s);
      em.setMatrixAt(i, _m);
      em.setColorAt(i, col);
      _p.addScaledVector(nrm, 0.0007);
      _s.setScalar(0.00042 * eyeShow);
      _m.compose(_p, _q, _s);
      ey.setMatrixAt(i, _m);
    }
    em.count = n;
    ey.count = eyeShow > 0.02 ? n : 0;
    em.instanceMatrix.needsUpdate = true;
    ey.instanceMatrix.needsUpdate = true;
    if (em.instanceColor) em.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <Prim obj={eggs.current} />
      <Prim obj={eyes.current} />
    </>
  );
}

// ───────────────────────────── scattered eggs (pea puffer etc.) ─────────────────────────────

function ScatteredEggs({ d, fx, lod, dims }: { d: Desc; fx: TankFXUniforms; lod: RenderLod; dims: ReturnType<typeof tankDims> }) {
  const sphere = useSphere();
  const N = lod === 0 ? 90 : lod === 1 ? 40 : 12;
  const seed = hashStr(d.key);
  const eggs = useInstanced(() => {
    const mat = eggMaterial(fx);
    mat.transparent = true;
    mat.opacity = 0.85;
    const m = new THREE.InstancedMesh(sphere, mat, N);
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, N]);
  const last = useRef(-1);
  useFrame(() => {
    const g = getGame();
    const em = eggs.current;
    if (!g || !em || !d.clutchId) return;
    const cl = g.clutches[d.clutchId];
    if (!cl) return;
    const n = Math.min(N, Math.max(3, cl.count));
    if (n === last.current) return;
    last.current = n;
    const anchors = anchorsOf(cl, { x: 0, y: dims.substrateY + 0.03, z: 0 });
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const a = anchors[i % anchors.length];
      _p.set(a.x + (R() - 0.5) * 0.05, Math.max(dims.substrateY + 0.002, a.y + (R() - 0.3) * 0.03), a.z + (R() - 0.5) * 0.04);
      _s.setScalar(0.0007 + R() * 0.0002);
      _m.compose(_p, _q.identity(), _s);
      em.setMatrixAt(i, _m);
      em.setColorAt(i, _c.set('#f3ead0').lerp(_c.clone().set('#e8d59a'), R()));
    }
    em.count = n;
    em.instanceMatrix.needsUpdate = true;
    if (em.instanceColor) em.instanceColor.needsUpdate = true;
  });
  return <Prim obj={eggs.current} />;
}

// ───────────────────────────── axolotl egg strands ─────────────────────────────

function EggStrands({ d, fx, lod, dims }: { d: Desc; fx: TankFXUniforms; lod: RenderLod; dims: ReturnType<typeof tankDims> }) {
  const sphere = useSphere();
  const N = lod === 0 ? 160 : lod === 1 ? 60 : 20;
  const seed = hashStr(d.key);
  const jelly = useInstanced(() => {
    const m = new THREE.InstancedMesh(sphere, jellyMaterial(fx), N);
    m.count = 0;
    m.renderOrder = 2;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, N]);
  const embryo = useInstanced(() => {
    const m = new THREE.InstancedMesh(sphere, eggMaterial(fx), N);
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, N]);
  const last = useRef({ n: -1, band: -1 });
  const embCol = useRef(new THREE.Color('#3b3526'));
  useFrame(() => {
    const g = getGame();
    const jm = jelly.current;
    const em = embryo.current;
    if (!g || !jm || !em || !d.clutchId) return;
    const cl = g.clutches[d.clutchId];
    if (!cl) return;
    const p = clutchProgress(cl, g.clock.hour);
    const n = Math.min(N, Math.max(4, Math.round(cl.count * (lod === 0 ? 0.4 : 0.15))));
    const band = Math.round(p * 12);
    if (n === last.current.n && band === last.current.band) return;
    last.current.n = n;
    last.current.band = band;
    // embryo colour follows the mother (pale morphs lay pale eggs)
    const mom: Creature | undefined = cl.motherId ? g.creatures[cl.motherId] : undefined;
    const pale = mom?.appearance ? new THREE.Color(mom.appearance.bodyColor).getHSL({ h: 0, s: 0, l: 0 }).l > 0.55 : false;
    embCol.current.set(pale ? '#efe6cf' : '#3b3526');
    const anchors = anchorsOf(cl, { x: 0, y: dims.substrateY + 0.05, z: 0 });
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const a = anchors[i % anchors.length];
      const k = Math.floor(i / anchors.length);
      // eggs laid singly up a plant stem: stacked with small offsets
      const stemX = a.x + Math.sin(i * 0.9) * 0.004;
      _p.set(stemX + (R() - 0.5) * 0.008, Math.min(dims.waterY - 0.01, a.y + k * 0.0075 + R() * 0.003), a.z + (R() - 0.5) * 0.008);
      _s.setScalar(0.0033 + R() * 0.0006);
      _m.compose(_p, _q.identity(), _s);
      jm.setMatrixAt(i, _m);
      // embryo: sphere → curled larva shape as development proceeds
      const el = 1 + smoothstep(0.3, 0.9, p) * 0.8;
      _e.set(0, R() * 6.28, (R() - 0.5) * 1.2);
      _q.setFromEuler(_e);
      _s.set(0.0012 * el, 0.0012, 0.0012 / Math.sqrt(el));
      _m.compose(_p, _q, _s);
      em.setMatrixAt(i, _m);
      em.setColorAt(i, embCol.current);
    }
    jm.count = n;
    em.count = n;
    jm.instanceMatrix.needsUpdate = true;
    em.instanceMatrix.needsUpdate = true;
    if (em.instanceColor) em.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <Prim obj={embryo.current} />
      <Prim obj={jelly.current} />
    </>
  );
}

// ───────────────────────────── mystery snail clutch (above the waterline) ─────────────────────────────

function SnailClutch({ d, fx, lod, dims }: { d: Desc; fx: TankFXUniforms; lod: RenderLod; dims: ReturnType<typeof tankDims> }) {
  const sphere = useSphere();
  const N = lod === 0 ? 140 : lod === 1 ? 60 : 20;
  const seed = hashStr(d.key);
  const eggs = useInstanced(() => {
    const mat = eggMaterial(fx);
    mat.roughness = 0.55;
    mat.clearcoat = 0.3;
    const m = new THREE.InstancedMesh(sphere, mat, N);
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [sphere, fx, N]);
  const last = useRef({ n: -1, band: -1 });
  useFrame(() => {
    const g = getGame();
    const em = eggs.current;
    if (!g || !em || !d.clutchId) return;
    const cl = g.clutches[d.clutchId];
    if (!cl) return;
    const p = clutchProgress(cl, g.clock.hour);
    const n = N;
    const band = Math.round(p * 10);
    if (n === last.current.n && band === last.current.band) return;
    last.current.n = n;
    last.current.band = band;
    const a = cl.anchor ?? { x: 0, y: dims.waterY + 0.02, z: -dims.W / 2 + 0.004 };
    const R = rng(seed);
    // on the glass/lid: flatten along the nearest wall normal
    const toBack = Math.abs(a.z + dims.W / 2) < Math.abs(a.z - dims.W / 2);
    const col = _c.set('#f2a2b6').lerp(new THREE.Color('#e6ddd8'), smoothstep(0.4, 1, p));
    for (let i = 0; i < n; i++) {
      const u = R() * 2 - 1;
      const v = R() * 2 - 1;
      if (u * u + v * v > 1) {
        i--;
        continue;
      }
      const dome = Math.sqrt(1 - u * u - v * v);
      _p.set(a.x + u * 0.016, Math.max(dims.waterY + 0.004, a.y + v * 0.011), a.z + (toBack ? 1 : -1) * (0.002 + dome * 0.006));
      _s.setScalar(0.0016 + R() * 0.0004);
      _m.compose(_p, _q.identity(), _s);
      em.setMatrixAt(i, _m);
      em.setColorAt(i, col);
    }
    em.count = n;
    em.instanceMatrix.needsUpdate = true;
    if (em.instanceColor) em.instanceColor.needsUpdate = true;
  });
  return <Prim obj={eggs.current} />;
}

// ───────────────────────────── fry clouds ─────────────────────────────

function FryCloud({ d, fx, lod, dims }: { d: Desc; fx: TankFXUniforms; lod: RenderLod; dims: ReturnType<typeof tankDims> }) {
  const g0 = getGame();
  const cl0 = d.clutchId ? g0?.clutches[d.clutchId] : undefined;
  const sp = cl0 ? findSpecies(cl0.speciesId) : undefined;
  const kind: 0 | 1 = sp?.breeding.system === 'seahorse_pouch' ? 1 : 0;
  const N = lod === 0 ? 40 : 14;
  const seed = hashStr(d.key);
  const geo = useMemo(() => buildFryGeometry(kind), [kind]);
  useEffect(() => () => geo.dispose(), [geo]);
  const matU = useMemo(() => {
    const mom = cl0?.motherId ? g0?.creatures[cl0.motherId] : undefined;
    const base = new THREE.Color(mom?.appearance?.bodyColor ?? sp?.genetics.baseVisual.bodyColor ?? '#c8b89a');
    const body = kind === 1 ? base.clone().multiplyScalar(0.6) : base.clone().lerp(new THREE.Color('#e8e2d0'), 0.55);
    return fryMaterial(fx, kind, body, new THREE.Color('#e8b85a'));
  }, [fx, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const mesh = useInstanced(() => {
    const m = new THREE.InstancedMesh(geo, matU.mat, N);
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [geo, matU, N]);
  const hatchM = (sp?.lifecycle.hatchSizeCm ?? 0.6) / 100;
  useFrame((st) => {
    const g = getGame();
    const m = mesh.current;
    if (!g || !m || !d.clutchId) return;
    const cl = g.clutches[d.clutchId];
    if (!cl) {
      m.count = 0;
      return;
    }
    const t = st.clock.elapsedTime;
    matU.u.uAgcTime.value = t;
    const p = clutchProgress(cl, g.clock.hour);
    const grow = cl.stage === 'fry' ? 1.3 + p * 0.9 : 1 + p * 0.3;
    const size = Math.max(0.003, hatchM * grow);
    const n = Math.min(N, Math.max(1, Math.round(cl.count * (lod === 0 ? 0.5 : 0.2))));
    const a = cl.anchor ?? { x: 0, y: dims.waterY * 0.75, z: 0 };
    const spread = 0.035 + p * 0.05;
    for (let i = 0; i < n; i++) {
      const s = seed * 0.001 + i * 7.13;
      const x = a.x + noise1(t * 0.18 + s, 1) * spread * 1.4;
      const y = clamp(a.y + noise1(t * 0.15 + s, 2) * spread * 0.7, dims.substrateY + 0.01, dims.waterY - 0.004);
      const z = a.z + noise1(t * 0.2 + s, 3) * spread;
      const dx = noise1(t * 0.18 + s + 0.05, 1) - noise1(t * 0.18 + s, 1);
      const dz = noise1(t * 0.2 + s + 0.05, 3) - noise1(t * 0.2 + s, 3);
      const yaw = Math.atan2(-dz, dx);
      _e.set(0, kind === 1 ? yaw * 0.3 + i : yaw, kind === 1 ? Math.sin(t + i) * 0.2 : noise1(t * 0.3 + s, 4) * 0.3);
      _q.setFromEuler(_e);
      _p.set(x, y, z);
      _s.setScalar(size);
      _m.compose(_p, _q, _s);
      m.setMatrixAt(i, _m);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  });
  useEffect(() => () => matU.mat.dispose(), [matU]);
  return <Prim obj={mesh.current} />;
}

// ───────────────────────────── seahorse birth bursts ─────────────────────────────

interface Burst {
  t0: number;
  origin: THREE.Vector3;
  vel: THREE.Vector3[];
  n: number;
}

function BirthBursts({ tank, fx, dims }: { tank: Tank; fx: TankFXUniforms; dims: ReturnType<typeof tankDims> }) {
  const MAX = 48;
  const geo = useMemo(() => buildFryGeometry(1), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const matU = useMemo(() => fryMaterial(fx, 1, new THREE.Color('#4a3a2c'), new THREE.Color('#d8a860')), [fx]);
  useEffect(() => () => matU.mat.dispose(), [matU]);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, matU.mat, MAX);
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, [geo, matU]);
  useEffect(() => () => mesh.dispose(), [mesh]);
  const bursts = useRef<Burst[]>([]);
  const seen = useRef({ lastEventT: 0, pouchClutches: new Map<string, string | undefined>() });
  const trigger = (x: number, y: number, z: number, t: number) => {
    const R = rng(Math.floor(t * 1000));
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) vel.push(new THREE.Vector3((R() - 0.2) * 0.05, 0.02 + R() * 0.05, (R() - 0.5) * 0.05));
    bursts.current.push({ t0: t, origin: new THREE.Vector3(x, y, z), vel, n: 24 });
    if (bursts.current.length > 2) bursts.current.shift();
  };
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    matU.u.uAgcTime.value = t;
    const g = getGame();
    if (g) {
      // detect pouch → fry transitions (a male seahorse just gave birth)
      const map = seen.current.pouchClutches;
      for (const id in g.clutches) {
        const cl = g.clutches[id];
        if (cl.tankId !== tank.id) continue;
        const prev = map.get(id);
        if (cl.visual === 'pouch' || cl.stage === 'in_pouch') map.set(id, cl.guardedById ?? cl.fatherId ?? '');
        else if (prev !== undefined) {
          map.delete(id);
          const rt = prev ? runtime.creatures.get(prev) : undefined;
          const a = rt ? rt.pos : cl.anchor ? new THREE.Vector3(cl.anchor.x, cl.anchor.y, cl.anchor.z) : new THREE.Vector3(0, dims.waterY * 0.5, 0);
          trigger(a.x, a.y, a.z, t);
        }
      }
    }
    // runtime 'birth' visual events (if the AI emits them)
    const ev = runtime.events;
    const nowS = performance.now() / 1000;
    for (let i = ev.length - 1; i >= 0; i--) {
      const e = ev[i];
      if (e.t <= seen.current.lastEventT) break;
      if (e.kind === 'birth' && e.tankId === tank.id) trigger(e.pos[0], e.pos[1], e.pos[2], t);
    }
    if (ev.length) seen.current.lastEventT = Math.max(seen.current.lastEventT, ev[ev.length - 1].t, nowS - 60);
    let k = 0;
    for (const b of bursts.current) {
      const age = t - b.t0;
      if (age > 9) continue;
      const fade = 1 - smoothstep(6, 9, age);
      for (let i = 0; i < b.n && k < MAX; i++) {
        const v = b.vel[i];
        const drag = 1 - Math.exp(-age * 0.8);
        _p.set(b.origin.x + v.x * drag * 1.2, Math.min(dims.waterY - 0.005, b.origin.y + v.y * drag * 1.2 + Math.sin(age * 2 + i) * 0.003), b.origin.z + v.z * drag * 1.2);
        _e.set(0, i * 1.7 + age * 0.3, Math.sin(age * 3 + i) * 0.25);
        _q.setFromEuler(_e);
        _s.setScalar(0.007 * fade + 0.0001);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(k++, _m);
      }
    }
    bursts.current = bursts.current.filter((b) => t - b.t0 <= 9);
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}
