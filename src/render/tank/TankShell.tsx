/**
 * Glass, rim, stand/cabinet, lid, backdrop and water volume + surface. OWNER: lane "waterfx".
 * Every decorative mesh here has `raycast = null` + `userData.noPick` so it never swallows pointer events.
 */
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { Tank } from '@/types';
import type { RenderLod } from '../lod';
import { tankDims, type TankDims } from '@/sim/tankSpace';
import { getTankTier } from '@/data/catalog/tanks';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { useTankFX } from '../shared/underwater';
import { useQualityBudget } from '../shared/quality';
import { CheapGlass, GlassBox, Lid, Silicone, Trim, shellGeom } from './shell/Glass';
import { BACKDROP_TONE, FarSurface, Meniscus, WaterSurface, WaterVolume } from './shell/Water';
import { Backdrop } from './shell/Backdrop';
import { Stand } from './shell/Stand';
import { useStaticMerge } from '../shared/staticMerge'; // lane:perf2

/** Tank dims memoised by value (the tank object changes every sim tick). */
export function useStableDims(tank: Tank): TankDims {
  const level = Math.round((tank.water?.level ?? 1) * 400) / 400;
  const depth = tank.substrate?.depthCm ?? 0;
  return useMemo(() => tankDims({ tierId: tank.tierId, substrate: { kind: 'sand', depthCm: depth, color: '' }, water: { level } }), [tank.tierId, level, depth]);
}

export function hasEquipmentKind(tank: Tank, kind: string): boolean {
  for (const e of tank.equipment ?? []) if (getEquipmentDef(e.defId)?.kind === kind) return true;
  return false;
}

export function TankShell({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const fx = useTankFX();
  const budget = useQualityBudget();
  const d = useStableDims(tank);
  const tier = getTankTier(tank.tierId);
  const sg = useMemo(() => shellGeom(d, tier), [d, tier]);
  // installed lid equipment (e.g. `lid_glass`) is drawn here by the shell; without one the tank is open-top
  const lidEquip = hasEquipmentKind(tank, 'lid');
  // lane:perf2 — room-view tanks: rim bars, silicone beads and plain cabinet parts sharing a material draw as one mesh
  const root = useRef<THREE.Group>(null);
  useStaticMerge(root, lod >= 1);
  return (
    <group ref={root}>
      <Stand tier={tier} d={d} sg={sg} lod={lod} detail={budget.detail} tankId={tank.id} tankName={tank.name} />
      <Backdrop kind={lod === 2 && tank.backdrop === 'rock_3d' ? 'black' : tank.backdrop} d={d} sg={sg} fx={fx} lod={lod} tankId={tank.id} />
      <WaterVolume d={d} fx={fx} lod={lod} />
      {lod === 0 ? <WaterSurface d={d} fx={fx} lod={lod} segments={budget.surfaceSegments} backdrop={tank.backdrop} /> : <FarSurface d={d} fx={fx} />}
      {lod === 0 && <Meniscus d={d} fx={fx} />}
      {lod < 2 && <Silicone d={d} sg={sg} fx={fx} />}
      {lod === 2 ? (
        <CheapGlass d={d} sg={sg} />
      ) : (
        <GlassBox d={d} tier={tier} fx={fx} lod={lod} sg={sg} backdropTone={BACKDROP_TONE[tank.backdrop]} floorTone={tank.substrate?.color} />
      )}
      <Trim d={d} sg={sg} lod={lod} />
      {lidEquip && lod < 2 && <Lid d={d} sg={sg} fx={fx} lod={lod} />}
    </group>
  );
}
