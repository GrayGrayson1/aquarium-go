/**
 * Room view: tanks are things you can click. An invisible box over every tank + stand takes the click: the first
 * click flies the room camera to that tank, a click on the tank already in focus (or a double-click) enters it.
 * Double-clicking / double-tapping empty floor returns to the overview. The click that ends a camera drag never
 * counts, and nothing here listens while a placement tool is active. lane:facrender (S10-06). OWNER: lane "facility".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { getGame, useGameSelector } from '@/state/game';
import { useUI } from '@/state/ui';
import { standHeight } from '@/sim/tankSpace';
import { tankOuterSize } from '@/sim/facility/layout';
import { wasCameraDrag } from '../camera/cameraFX';
import { facilityFocusedTank, focusFacilityTank, resetFacilityView } from '../camera/CameraRig';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const HIDDEN = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

interface PickBox {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  sx: number;
  sy: number;
  sz: number;
}

/** Placement signature: re-render only when a tank is added, removed or moved (not every sim tick). */
function signature(g: { tankOrder: string[]; tanks: Record<string, { tierId: string; placement: { x: number; z: number; rotY: number } } | undefined> }): string {
  let s = '';
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (t) s += `${id}:${t.tierId}:${t.placement.x},${t.placement.z},${t.placement.rotY}|`;
  }
  return s;
}

function enterTank(id: string) {
  useUI.getState().set({ focusedTankId: id, view: 'tank' });
}

export function RoomTankPick() {
  const view = useUI((s) => s.view);
  const tool = useUI((s) => s.tool);
  const sig = useGameSelector(signature, '');
  const gl = useThree((s) => s.gl);
  const boxes = useMemo<PickBox[]>(() => {
    const g = getGame();
    if (!g || !sig) return [];
    const out: PickBox[] = [];
    for (const id of g.tankOrder) {
      const t = g.tanks[id];
      if (!t) continue;
      const o = tankOuterSize(t.tierId);
      const top = standHeight(t.tierId) + o.H;
      out.push({ id, x: t.placement.x, y: top / 2, z: t.placement.z, rotY: t.placement.rotY, sx: o.L + 0.06, sy: top, sz: o.W + 0.06 });
    }
    return out;
  }, [sig]);
  const floorSize = useGameSelector((g) => Math.max(g.facility.width, g.facility.depth) * 2 + 4, 10);
  const hover = useRef(0);
  useEffect(
    () => () => {
      if (hover.current > 0) gl.domElement.style.cursor = '';
    },
    [gl],
  );
  if (view !== 'facility' || tool !== 'none') return null;
  const onTank = (e: ThreeEvent<MouseEvent>, id: string) => {
    e.stopPropagation();
    if (wasCameraDrag()) return;
    const ui = useUI.getState();
    if (facilityFocusedTank() === id && ui.focusedTankId === id) enterTank(id);
    else {
      if (ui.focusedTankId !== id) ui.set({ focusedTankId: id });
      focusFacilityTank(id);
    }
  };
  return (
    <group name="room-tank-pick">
      {boxes.map((b) => (
        <mesh
          key={b.id}
          geometry={BOX}
          material={HIDDEN}
          position={[b.x, b.y, b.z]}
          rotation={[0, b.rotY, 0]}
          scale={[b.sx, b.sy, b.sz]}
          onClick={(e) => onTank(e, b.id)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!wasCameraDrag()) enterTank(b.id);
          }}
          onPointerOver={() => {
            hover.current++;
            gl.domElement.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            hover.current = Math.max(0, hover.current - 1);
            if (hover.current === 0) gl.domElement.style.cursor = '';
          }}
        />
      ))}
      {/* empty floor: a double-click / double-tap brings the overview back */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        material={HIDDEN}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!wasCameraDrag()) resetFacilityView();
        }}
      >
        <planeGeometry args={[floorSize, floorSize]} />
      </mesh>
    </group>
  );
}
