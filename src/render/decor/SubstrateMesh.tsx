/** Substrate bed + glass cross-section. OWNER: lane "aquascape". */
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { Tank } from '@/types';
import type { RenderLod } from '../lod';
import type { TankFXUniforms } from '../shared/underwater';
import { tankDims } from '@/sim/tankSpace';
import { buildSubstrateGeometry, createSubstrateUniforms, makeSubstrateMaterial, substrateLook } from './substrate';
import { decorPick } from './registry';

export function SubstrateMesh({ tank, lod, fx }: { tank: Tank; lod: RenderLod; fx: TankFXUniforms }) {
  const kind = tank.substrate.kind;
  const depth = tank.substrate.depthCm;
  const geo = useMemo(
    () => buildSubstrateGeometry(tank, lod),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tank.id, tank.tierId, kind, depth, lod],
  );
  useEffect(
    () => () => {
      geo.top.dispose();
      geo.skirt.dispose();
    },
    [geo],
  );
  const su = useMemo(createSubstrateUniforms, []);
  const mats = useMemo(() => ({ top: makeSubstrateMaterial(fx, su, false), skirt: makeSubstrateMaterial(fx, su, true) }), [fx, su]);
  useEffect(
    () => () => {
      mats.top.dispose();
      mats.skirt.dispose();
    },
    [mats],
  );
  const look = substrateLook(kind, tank.substrate.color);
  su.uMode.value = look.mode;
  su.uGrain.value = look.grain;
  su.uRipple.value = look.ripple;
  su.uColA.value.set(look.a);
  su.uColB.value.set(look.b);
  su.uColC.value.set(look.c);
  su.uDepth.value = tankDims(tank).substrateY * 1.25;
  su.uAlgae.value = Math.min(1, Math.max(0, (tank.water.algae - 15) / 85));

  const topRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const pick = decorPick(tank.id);
    pick.substrate = topRef.current;
    return () => {
      if (pick.substrate === topRef.current) pick.substrate = null;
    };
  }, [tank.id, geo]);

  if (kind === 'bare' || depth <= 0.15) return null;
  return (
    <group name="substrate">
      <mesh ref={topRef} geometry={geo.top} material={mats.top} receiveShadow name="substrate-top" />
      <mesh geometry={geo.skirt} material={mats.skirt} name="substrate-section" />
    </group>
  );
}
