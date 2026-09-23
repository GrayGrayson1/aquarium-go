/**
 * One decor item at hero LOD: cached procedural geometry, shared solid materials, per-item living materials
 * (growth emergence, sway, health tint), anemone nestling. OWNER: lane "aquascape".
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DecorDef, DecorInstance } from '@/types';
import type { TankFXUniforms } from '../shared/underwater';
import { acquireDecorGeometry, releaseDecorGeometry, MAT_CLASSES, type MatClass } from './gen';
import { createItemUniforms, makeDecorMaterial, type DecorTankUniforms } from './materials';
import { isLiving } from '@/data/catalog/decor';
import { runtime, recentEvents } from '@/runtime/tankRuntime';
import { findSpecies } from '@/data/species';
import { decorPick } from './registry';
import { DECOR_DETAIL_MID_PX, detailTiers, nextDetailTier } from '../shared/detail';
import { getRenderQuality } from '../shared/quality';
import { FragPlug, FRAG_PLUG_LIFT, hasFragPlug } from './FragPlug'; // lane:frags

export interface SharedDecorMats {
  solid: THREE.Material;
  solidDouble: THREE.Material;
  /** lane:w2-visual — see-through acrylic for the frag rack's solid part (falls back to `solid` when absent). */
  acrylic?: THREE.Material;
}

const hostSeekerCache = new Map<string, boolean>();
function isHostSeeker(speciesId: string): boolean {
  let v = hostSeekerCache.get(speciesId);
  if (v === undefined) {
    v = findSpecies(speciesId)?.anemoneRelationship === 'host_seeker';
    hostSeekerCache.set(speciesId, v);
  }
  return v;
}

/** Venation per plant: x lateral veins (<0 parallel), y sweep, z contrast (<0 darker veins), w mottling. */
const LEAF_STYLE: Record<string, [number, number, number, number]> = {
  plant_java_fern: [9, 1.7, 0.42, 0.9],
  plant_anubias: [8, 1.1, 0.3, 0.45],
  plant_sword: [7, 1.3, 0.45, 0.5],
  plant_crypt: [6, 1.2, 0.3, 0.8],
  plant_vallisneria: [-5, 0, 0.22, 0.45],
  plant_hairgrass: [-3, 0, 0.1, 0.2],
  plant_rotala: [3, 1, 0.25, 0.35],
  plant_ludwigia: [5, 1.2, 0.3, 0.4],
  plant_floating: [5, 1.5, 0.22, 0.3],
  plant_monte_carlo: [3, 1, 0.18, 0.3],
  plant_water_sprite: [-2, 0, 0.2, 0.3],
  plant_moss: [-2, 0, 0.08, 0.2],
  botanical_almond_leaf: [7, 1.8, -0.45, 1],
  plant_mangrove: [7, 1.5, 0.3, 0.25], // lane:brackish — leathery, glossy, pinnate veins
};

function swayProfile(def: DecorDef): { amp: number; speed: number } {
  if (def.category === 'anemone') return { amp: 0.0055, speed: 1.25 };
  if (def.category === 'coral') return { amp: def.visual === 'coral_gorgonian' ? 0.006 : 0.005, speed: 1.35 };
  if (def.visual === 'plant_floating') return { amp: 0.004, speed: 0.35 };
  if (def.visual.startsWith('macro_')) return { amp: 0.009, speed: 0.95 };
  return { amp: 0.014, speed: 0.85 };
}

const tmpV = new THREE.Vector3();
const tmpW = new THREE.Vector3();

/** The props the comparator below looks at (it compares every prop generically; only `inst` is special). */
interface DecorItemProps {
  inst: DecorInstance;
  def: DecorDef;
  tankId: string;
  fx: TankFXUniforms;
  tankU: DecorTankUniforms;
  shared: SharedDecorMats;
  flowTank: THREE.Vector3;
  hidden?: boolean;
  reducedMotion?: boolean;
}

/**
 * lane:perf — the sim nudges `growth`/`health` of living decor on every tick, which re-rendered every hero decor item
 * 4×/s. Those two only drive smoothed uniforms, so the item re-renders only once the change is visible (growth ≥0.5%,
 * health ≥1 point); every other field and prop must be identical.
 */
function decorItemPropsEqual(a: DecorItemProps, b: DecorItemProps): boolean {
  const pa = a as unknown as Record<string, unknown>;
  const pb = b as unknown as Record<string, unknown>;
  for (const k in pa) if (k !== 'inst' && pa[k] !== pb[k]) return false;
  for (const k in pb) if (!(k in pa)) return false;
  const x = a.inst as unknown as Record<string, unknown>;
  const y = b.inst as unknown as Record<string, unknown>;
  if (x === y) return true;
  let nx = 0;
  for (const k in x) {
    nx++;
    if (k !== 'growth' && k !== 'health' && x[k] !== y[k]) return false;
  }
  let ny = 0;
  for (const _k in y) ny++;
  if (nx !== ny) return false;
  return Math.abs((a.inst.growth ?? 1) - (b.inst.growth ?? 1)) < 0.005 && Math.abs((a.inst.health ?? 100) - (b.inst.health ?? 100)) < 1;
}

export const DecorItem = memo(function DecorItem({
  inst,
  def,
  tankId,
  fx,
  tankU,
  shared,
  flowTank,
  hidden,
  reducedMotion,
}: {
  inst: DecorInstance;
  def: DecorDef;
  tankId: string;
  fx: TankFXUniforms;
  tankU: DecorTankUniforms;
  shared: SharedDecorMats;
  flowTank: THREE.Vector3;
  hidden?: boolean;
  reducedMotion?: boolean;
}) {
  const seed = inst.seed;
  const geo = useMemo(() => acquireDecorGeometry(def, seed, 0), [def, seed]);
  useEffect(() => () => releaseDecorGeometry(def, seed, 0), [def, seed]);
  // lane:perf — hero detail tier: while the item is small on screen it draws its lod-1 mesh (same materials; the
  // mesh the facility view uses at that size). A 30 px macroalga drew >100k triangles. See src/render/shared/detail.ts.
  const [detailTier, setDetailTier] = useState(0);
  const tierRef = useRef(0);
  const geoLow = useMemo(() => (detailTier === 1 ? acquireDecorGeometry(def, seed, 1) : null), [detailTier, def, seed]);
  useEffect(() => () => void (geoLow && releaseDecorGeometry(def, seed, 1)), [geoLow, def, seed]);
  const drawGeo = geoLow ?? geo;
  const sizeM = Math.max(def.size.w, def.size.h, def.size.d);
  const living = isLiving(def) || def.category === 'enrichment';
  const itemU = useMemo(createItemUniforms, []);
  const liveMats = useMemo(() => {
    const m: Partial<Record<MatClass, THREE.Material>> = {};
    if (geo.foliage) m.foliage = makeDecorMaterial('foliage', fx, tankU, itemU);
    if (geo.coral) m.coral = makeDecorMaterial('coral', fx, tankU, itemU);
    return m;
  }, [geo, fx, tankU, itemU]);
  useEffect(() => () => Object.values(liveMats).forEach((m) => m?.dispose()), [liveMats]);

  // static per-item uniforms
  const prof = swayProfile(def);
  itemU.uSway.value.set(prof.amp, prof.speed, (seed % 1000) * 0.0137, 0.006);
  const c = Math.cos(inst.rotY);
  const s = Math.sin(inst.rotY);
  // tank-space flow → object space (inverse Y rotation, undo scale)
  itemU.uFlowLocal.value.set((flowTank.x * c - flowTank.z * s) / inst.scale, 0, (flowTank.x * s + flowTank.z * c) / inst.scale);
  itemU.uHealth.value = (inst.health ?? 100) / 100;
  const ls = LEAF_STYLE[def.visual];
  if (ls) itemU.uLeaf.value.set(ls[0], ls[1], ls[2], ls[3]);
  if (reducedMotion) itemU.uSway.value.x *= 0.45;

  const group = useRef<THREE.Group>(null);
  const growthRef = useRef(inst.growth ?? 1);
  const contract = useRef(0);
  const targetGrowth = inst.growth ?? 1;
  const visScale = (g: number) => (isLiving(def) ? 0.72 + 0.28 * g : 1);

  useEffect(() => {
    const pick = decorPick(tankId);
    if (group.current) {
      group.current.userData.decorId = inst.id;
      pick.items.set(inst.id, group.current);
    }
    return () => {
      if (pick.items.get(inst.id) === group.current) pick.items.delete(inst.id);
    };
  }, [tankId, inst.id]);

  const isAnemone = def.category === 'anemone';
  const hostAnchor = def.anchors.find((a) => a.kind === 'host');
  useFrame((st, dt) => {
    const g = group.current;
    if (!g) return;
    // smooth growth (sim ticks are discrete)
    const k = Math.min(1, dt * 1.5);
    growthRef.current += (targetGrowth - growthRef.current) * k;
    itemU.uGrowth.value = living ? growthRef.current : 1;
    const vs = visScale(growthRef.current) * inst.scale;
    g.scale.setScalar(vs);
    const budgetPx = detailTiers.on ? DECOR_DETAIL_MID_PX[getRenderQuality()] : 0;
    if (budgetPx > 0 || tierRef.current !== 0) {
      // projected size from last frame's world matrix (no scene walk); re-renders only when the tier flips
      const cam = st.camera as THREE.PerspectiveCamera;
      tmpW.setFromMatrixPosition(g.matrixWorld);
      const px = (sizeM * vs * st.size.height) / (2 * Math.tan(((cam.getEffectiveFOV?.() ?? cam.fov) * Math.PI) / 360) * Math.max(0.05, tmpW.distanceTo(cam.position)));
      const t = nextDetailTier(px, tierRef.current, { full: budgetPx, mid: 0 });
      if (t !== tierRef.current) {
        tierRef.current = t;
        setDetailTier(t);
      }
    }
    if (isAnemone || (hostAnchor && def.category === 'coral')) {
      // nestle: tentacles part around a nearby clownfish; recoil after a glass tap
      let best = Infinity;
      let fx0 = 0;
      let fy0 = -10;
      let fz0 = 0;
      const hx = inst.x;
      const hy = inst.y + (hostAnchor?.offset[1] ?? 0.05) * inst.scale;
      const hz = inst.z;
      for (const cr of runtime.creatures.values()) {
        if (cr.tankId !== tankId || !isHostSeeker(cr.speciesId)) continue;
        const d2 = (cr.pos.x - hx) ** 2 + (cr.pos.y - hy) ** 2 + (cr.pos.z - hz) ** 2;
        if (d2 < best) {
          best = d2;
          fx0 = cr.pos.x;
          fy0 = cr.pos.y;
          fz0 = cr.pos.z;
        }
      }
      const near = best < 0.09 * 0.09 ? 1 - Math.sqrt(best) / 0.09 : 0;
      const now = st.clock.elapsedTime;
      const tapped = recentEvents(tankId, performance.now() / 1000 - 1.2).some((e) => e.kind === 'tap' || e.kind === 'startle');
      const target = Math.max(near * 0.28, tapped ? 0.75 : 0);
      contract.current += (target - contract.current) * Math.min(1, dt * (target > contract.current ? 4 : 0.8));
      itemU.uContract.value = contract.current;
      // fish position into object space
      tmpV.set(fx0 - inst.x, fy0 - inst.y, fz0 - inst.z);
      const lx = (tmpV.x * c - tmpV.z * s) / vs;
      const lz = (tmpV.x * s + tmpV.z * c) / vs;
      itemU.uFish.value.set(lx, tmpV.y / vs, lz, near);
      void now;
    }
  });

  const initScale = visScale(growthRef.current) * inst.scale;
  // lane:frags — a coral frag sits on its ceramic plug (fixed size, not scaled with the coral)
  const plugged = hasFragPlug(inst, def);
  return (
    <>
    {plugged && <FragPlug inst={inst} material={shared.solid} hidden={hidden} />}
    <group ref={group} position={[inst.x, inst.y + (plugged ? FRAG_PLUG_LIFT : 0), inst.z]} rotation={[0, inst.rotY, 0]} scale={initScale} visible={!hidden} name={`decor:${inst.id}`}>
      {MAT_CLASSES.map((k) => {
        const g = drawGeo[k];
        if (!g) return null;
        const clear = k === 'solid' && def.visual === 'frag_rack' && !!shared.acrylic; // lane:w2-visual
        const mat = clear ? shared.acrylic : k === 'solid' ? shared.solid : k === 'solidDouble' ? shared.solidDouble : liveMats[k];
        if (!mat) return null;
        return <mesh key={k} geometry={g} material={mat} castShadow={k !== 'coral' && !clear} receiveShadow />;
      })}
    </group>
    </>
  );
}, decorItemPropsEqual);
