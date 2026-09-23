/** Renders a merged Batch (one mesh per material key), disposing geometry on unmount. OWNER: lane "facility". */
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { Batch } from './kit';
import { noPick } from './kit';
import { matByKey, type PropMaterials } from './materials';

export function Batched({ build, deps, mats, castShadow = true, receiveShadow = true, position, rotation }: { build: () => Batch; deps: unknown[]; mats: PropMaterials; castShadow?: boolean; receiveShadow?: boolean; position?: [number, number, number]; rotation?: [number, number, number] }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geoms = useMemo(() => build().build(), deps);
  useEffect(
    () => () => {
      for (const g of geoms.values()) g.dispose();
    },
    [geoms],
  );
  const ref = useRef<THREE.Group>(null);
  useEffect(() => noPick(ref.current), [geoms]);
  return (
    <group ref={ref} position={position} rotation={rotation}>
      {[...geoms.entries()].map(([k, g]) => (
        <mesh key={k} geometry={g} material={matByKey(mats, k)} castShadow={castShadow && k !== 'glass' && k !== 'bulb'} receiveShadow={receiveShadow} />
      ))}
    </group>
  );
}
