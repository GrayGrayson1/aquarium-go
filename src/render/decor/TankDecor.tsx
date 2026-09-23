/**
 * Substrate, hardscape, plants, corals, anemones, ornaments — plus the 3D decor editor for the focused tank.
 * OWNER: lane "aquascape".
 *
 * LOD 0: one group per item (cached procedural geometry, per-item growth/sway uniforms).
 * LOD 1/2: the whole scape merged per material class (see MergedDecor).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DecorDef, Tank } from '@/types';
import type { RenderLod } from '../lod';
import { useTankFX } from '../shared/underwater';
import { getDecorDef } from '@/data/catalog/decor';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { getGame } from '@/state/game';
import { audioReactive } from '@/runtime/audioReactive';
import { isLitAt } from '@/sim/aquascape/growth';
import { SubstrateMesh } from './SubstrateMesh';
import { DecorItem, type SharedDecorMats } from './DecorItem';
import { MergedDecor } from './MergedDecor';
import { DecorEditor } from './DecorEditor';
import { createTankUniforms, makeDecorMaterial } from './materials';
import { makeAcrylicMaterial } from './acrylic'; // lane:w2-visual
import { equipmentEmitters } from './emitters';
import { editingDecor } from './registry';
import { acquireDecorGeometry, releaseDecorGeometry } from './gen';

const ACTINIC: Record<string, number> = { reef_actinic: 1, reef_full: 0.6, moonlight: 0.85, cool: 0.3, daylight: 0.18, planted: 0.12, warm: 0.08, sunset: 0.1 };

/** Net steady flow (tank space, metres of lean) from pumps/filters. */
function flowVector(tank: Tank): THREE.Vector3 {
  const v = new THREE.Vector3();
  for (const e of equipmentEmitters(tank)) {
    if (e.kind === 'bubbles' || !e.dir) continue;
    v.x += e.dir[0] * e.rate;
    v.z += e.dir[2] * e.rate;
  }
  const len = v.length();
  if (len > 1e-6) v.multiplyScalar(Math.min(0.006, 0.0018 * Math.sqrt(len)) / len);
  return v;
}

/** Per-frame time budget for building full-detail decor meshes when a tank becomes the hero (lane:perf). */
const PREP_BUDGET_MS = 6;

/**
 * lane:perf — a tank that becomes the hero AFTER mounting (the camera flying in from the room) builds its full-detail
 * decor meshes over several frames (≤ PREP_BUDGET_MS each, at least one item per frame) and keeps drawing its lod-1
 * scape until they are all ready, instead of generating every rock and coral in the flight's first frame (a 250–550 ms
 * hitch in a big display). A tank mounted directly at lod 0 (load, new game) is ready at once, as before, so the shader
 * warm-up still sees its real materials. Returns whether the lod-0 items may be drawn.
 */
function useProgressiveDecor(tank: Tank, lod: RenderLod): boolean {
  const [ready, setReady] = useState(lod === 0);
  const held = useRef<{ def: DecorDef; seed: number }[]>([]);
  const done = useRef(new Set<string>());
  const releaseHeld = () => {
    for (const h of held.current) releaseDecorGeometry(h.def, h.seed, 0);
    held.current = [];
    done.current.clear();
  };
  useEffect(() => {
    if (lod === 0) return;
    setReady(false);
    releaseHeld(); // left the hero role mid-preparation: do not keep full-detail meshes alive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lod]);
  // the items acquired their own references while rendering: our warm references can go
  useEffect(() => {
    if (ready) releaseHeld();
  }, [ready]);
  useEffect(() => () => releaseHeld(), []);
  useFrame(() => {
    if (lod !== 0 || ready) return;
    const t0 = performance.now();
    for (const inst of tank.decor) {
      const key = `${inst.defId}|${inst.seed}`;
      if (done.current.has(key)) continue;
      const def = getDecorDef(inst.defId);
      done.current.add(key);
      if (!def) continue;
      acquireDecorGeometry(def, inst.seed, 0);
      held.current.push({ def, seed: inst.seed });
      if (performance.now() - t0 > PREP_BUDGET_MS) return;
    }
    setReady(true);
  });
  return lod === 0 && ready;
}

export function TankDecor({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const fx = useTankFX();
  const tankU = useMemo(createTankUniforms, []);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const quality = useSettings((s) => s.quality);
  const focusedTankId = useUI((s) => s.focusedTankId);
  const tool = useUI((s) => s.tool);
  const view = useUI((s) => s.view);
  const editing = lod === 0 && view === 'tank' && focusedTankId === tank.id && (tool === 'decor_place' || tool === 'decor_move');

  const shared = useMemo<SharedDecorMats>(
    () => ({ solid: makeDecorMaterial('solid', fx, tankU, null, { lowDetail: quality === 'low' }), solidDouble: makeDecorMaterial('solidDouble', fx, tankU, null, { lowDetail: quality === 'low' }), acrylic: makeAcrylicMaterial(fx) }),
    [fx, tankU, quality],
  );
  useEffect(
    () => () => {
      shared.solid.dispose();
      shared.solidDouble.dispose();
      shared.acrylic?.dispose();
    },
    [shared],
  );

  const eqSig = tank.equipment.map((e) => `${e.defId}:${e.on ? 1 : 0}:${e.failed ? 1 : 0}:${e.setting ?? ''}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const flow = useMemo(() => flowVector(tank), [eqSig, tank.tierId]);
  tankU.uFlowTank.value.copy(flow);
  tankU.uSwayScale.value = reducedMotion ? 0.45 : 1;

  const heroDecorReady = useProgressiveDecor(tank, lod);

  const preset = tank.lighting.preset;
  const moon = tank.lighting.moonlight;
  useFrame(() => {
    const party = useUI.getState().partyMode;
    tankU.uBeat.value = party && !reducedMotion ? audioReactive.beat : 0;
    const g = getGame();
    const lit = g ? isLitAt(tank, g.clock.hour) : true;
    const base = ACTINIC[preset] ?? 0.2;
    tankU.uActinic.value = lit ? base : moon ? Math.max(0.6, base) : 0.1;
    tankU.uGlowGain.value = lit ? 0.55 : moon ? 0.45 : 0.2;
  });

  return (
    <group name="decor">
      <SubstrateMesh tank={tank} lod={lod} fx={fx} />
      {heroDecorReady ? (
        tank.decor.map((inst) => {
          const def = getDecorDef(inst.defId);
          if (!def) return null;
          return (
            <DecorItem
              key={inst.id}
              inst={inst}
              def={def}
              tankId={tank.id}
              fx={fx}
              tankU={tankU}
              shared={shared}
              flowTank={flow}
              hidden={editing && editingDecor.id === inst.id}
              reducedMotion={reducedMotion}
            />
          );
        })
      ) : (
        <MergedDecor tank={tank} lod={lod === 0 ? 1 : lod} fx={fx} tankU={tankU} />
      )}
      {editing && <DecorEditor tank={tank} fx={fx} tankU={tankU} shared={shared} />}
    </group>
  );
}
