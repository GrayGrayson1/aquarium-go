/**
 * Build-mode tank placement: a translucent ghost of the tank + stand follows the pointer across the floor,
 * snaps flush against walls (facing into the room), shows its footprint and viewing aisle, and turns green when
 * the spot is valid or red with a reason when it isn't. Click to buy/move, R (or right-click) to rotate, Esc to
 * cancel. Handles both buying a new tier (`ui.placingTankTierId`) and moving an existing tank
 * (`ui.panelTarget = 'move:<tankId>'`). OWNER: lane "facility".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState, WaterClass } from '@/types';
import { useUI } from '@/state/ui';
import { getGame, useGame, useGameSelector } from '@/state/game';
import { findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { standHeight } from '@/sim/tankSpace';
import { buyTank, canAfford, tankKitPrice } from '@/sim/economy';
import { fmtMoney } from '@/sim/economy/util';
import { placeTank, validatePlacement } from '@/sim/facility';
import { tankFootprint, tankOuterSize, WALL_MARGIN_M, FRONT_CLEARANCE_M } from '@/sim/facility/layout';
import { usePlacementStore } from './placementStore';

const GOOD = '#4ADE80';
const BAD = '#F87171';

export function defaultWaterClass(g: GameState | null): WaterClass {
  const ui = useUI.getState();
  if (ui.placingWaterClass) return ui.placingWaterClass;
  const local = usePlacementStore.getState().waterClass;
  if (local) return local;
  const sp = g ? findSpecies(g.starterId) : undefined;
  if (sp?.id === 'axolotl') return 'freshwater_cool';
  if (sp?.environment === 'marine') return 'marine_live_rock';
  return 'freshwater_planted';
}

/** What buying this tier here will actually charge (read from the sim's own kit pricing, as buyTank does). */
function purchaseTotal(tierId: string, g: GameState | null): number {
  try {
    return tankKitPrice(tierId, defaultWaterClass(g), useUI.getState().placingSeeded).total;
  } catch {
    return getTankTier(tierId).price;
  }
}

/** Same formatting as the purchase toast ("Bought a … for $221"). */
const fmtPrice = fmtMoney;

interface GhostState {
  x: number;
  z: number;
  rotY: number;
  ok: boolean;
  reason: string;
}

/** Snap a pointer position: grid snap, and if near a wall, sit flush against it facing into the room. */
function snap(g: GameState, tierId: string, px: number, pz: number, manualRot: number | null): { x: number; z: number; rotY: number } {
  const W = g.facility.width;
  const D = g.facility.depth;
  const grid = 0.05;
  let x = Math.round(px / grid) * grid;
  let z = Math.round(pz / grid) * grid;
  if (manualRot !== null) return { x, z, rotY: manualRot };
  const probe = tankFootprint(tierId, { x: 0, z: 0, rotY: 0 });
  const reach = probe.hz + 0.7;
  const dBack = pz + D / 2;
  const dFront = D / 2 - pz;
  const dLeft = px + W / 2;
  const dRight = W / 2 - px;
  const m = Math.min(dBack, dLeft, dRight, dFront);
  const flush = WALL_MARGIN_M + probe.hz + 0.005;
  if (m < reach) {
    if (m === dBack) return { x, z: -D / 2 + flush, rotY: 0 };
    if (m === dLeft) return { x: -W / 2 + flush, z, rotY: Math.PI / 2 };
    if (m === dRight) return { x: W / 2 - flush, z, rotY: -Math.PI / 2 };
    return { x, z: D / 2 - flush, rotY: Math.PI };
  }
  x = Math.max(-W / 2, Math.min(W / 2, x));
  z = Math.max(-D / 2, Math.min(D / 2, z));
  return { x, z, rotY: 0 };
}

function GhostBody({ tierId, color }: { tierId: string; color: string }) {
  const o = tankOuterSize(tierId);
  const sh = standHeight(tierId);
  const fp = tankFootprint(tierId, { x: 0, z: 0, rotY: 0 });
  const mats = useMemo(() => {
    const c = new THREE.Color(color);
    return {
      glass: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, depthWrite: false }),
      stand: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.1, depthWrite: false }),
      edge: new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.9 }),
      floor: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false }),
      aisle: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08, depthWrite: false }),
    };
  }, [color]);
  const geo = useMemo(() => {
    const glass = new THREE.BoxGeometry(o.L, o.H, o.W);
    const stand = new THREE.BoxGeometry(fp.hx * 2, sh, fp.hz * 2);
    const glassEdges = new THREE.EdgesGeometry(glass);
    const standEdges = new THREE.EdgesGeometry(stand);
    const outline = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-fp.hx, 0, -fp.hz),
      new THREE.Vector3(fp.hx, 0, -fp.hz),
      new THREE.Vector3(fp.hx, 0, fp.hz),
      new THREE.Vector3(-fp.hx, 0, fp.hz),
      new THREE.Vector3(-fp.hx, 0, -fp.hz),
    ]);
    // front chevron
    const chevron = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.14, 0, fp.hz + 0.12),
      new THREE.Vector3(0, 0, fp.hz + 0.3),
      new THREE.Vector3(0.14, 0, fp.hz + 0.12),
    ]);
    return { glass, stand, glassEdges, standEdges, outline, chevron };
  }, [o.L, o.H, o.W, fp.hx, fp.hz, sh]);
  const lines = useMemo(() => {
    const outline = new THREE.Line(geo.outline, mats.edge);
    const chevron = new THREE.Line(geo.chevron, mats.edge);
    outline.raycast = () => {};
    chevron.raycast = () => {};
    return { outline, chevron };
  }, [geo, mats]);
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [geo, mats],
  );
  const nop = () => {};
  return (
    <group>
      <mesh geometry={geo.stand} material={mats.stand} position={[0, sh / 2, 0]} raycast={nop} renderOrder={5} />
      <lineSegments geometry={geo.standEdges} material={mats.edge} position={[0, sh / 2, 0]} raycast={nop} />
      <mesh geometry={geo.glass} material={mats.glass} position={[0, sh + o.H / 2, 0]} raycast={nop} renderOrder={5} />
      <lineSegments geometry={geo.glassEdges} material={mats.edge} position={[0, sh + o.H / 2, 0]} raycast={nop} />
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} raycast={nop} renderOrder={4}>
        <planeGeometry args={[fp.hx * 2, fp.hz * 2]} />
      </mesh>
      <mesh material={mats.aisle} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, fp.hz + FRONT_CLEARANCE_M / 2]} raycast={nop} renderOrder={4}>
        <planeGeometry args={[fp.hx * 1.8, FRONT_CLEARANCE_M]} />
      </mesh>
      <primitive object={lines.outline} />
      <primitive object={lines.chevron} position={[0, 0.01, 0]} />
    </group>
  );
}

export function PlacementGhost() {
  const tool = useUI((s) => s.tool);
  const tierFromUI = useUI((s) => s.placingTankTierId);
  const panelTarget = useUI((s) => s.panelTarget);
  const moveId = tool === 'tank_place' && panelTarget?.startsWith('move:') ? panelTarget.slice(5) : null;
  const moveTier = useGameSelector((g) => (moveId ? g.tanks[moveId]?.tierId ?? null : null), null);
  const fac = useGameSelector((g) => g.facility, null);
  const tierId = tool === 'tank_place' ? moveTier ?? tierFromUI : null;
  const active = !!tierId && !!fac;
  const manualRot = usePlacementStore((s) => s.rotY);
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const last = useRef<{ px: number; pz: number } | null>(null);

  const cancel = useCallback(() => {
    useUI.getState().set({ tool: 'none', placingTankTierId: null, panelTarget: moveId ? null : useUI.getState().panelTarget });
    usePlacementStore.getState().reset();
    setGhost(null);
  }, [moveId]);

  const evaluate = useCallback(
    (px: number, pz: number) => {
      const g = getGame();
      if (!g || !tierId) return;
      last.current = { px, pz };
      const p = snap(g, tierId, px, pz, usePlacementStore.getState().rotY);
      const check = validatePlacement(g, tierId, p, moveId ?? undefined);
      let reason = check.reason ?? '';
      let ok = check.ok;
      if (ok && !moveId) {
        // the same total buyTank charges: tank + starter equipment + substrate (+ seeded media)
        const price = purchaseTotal(tierId, g);
        if (!canAfford(g, price)) {
          ok = false;
          reason = `You need ${fmtPrice(price)} for the ${getTankTier(tierId).name} kit.`;
        }
      }
      usePlacementStore.getState().set({ valid: ok, message: reason || null });
      setGhost((prev) => (prev && prev.x === p.x && prev.z === p.z && prev.rotY === p.rotY && prev.ok === ok && prev.reason === reason ? prev : { ...p, ok, reason }));
    },
    [tierId, moveId],
  );

  // re-evaluate when rotation changes
  useEffect(() => {
    if (last.current) evaluate(last.current.px, last.current.pz);
  }, [manualRot, evaluate]);

  // keyboard: R rotate, Escape cancel
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') cancel();
      else if (e.key === 'r' || e.key === 'R') {
        const cur = usePlacementStore.getState().rotY;
        if (cur === null) usePlacementStore.getState().set({ rotY: ghost?.rotY ?? 0 });
        usePlacementStore.getState().rotate(e.shiftKey ? -Math.PI / 2 : Math.PI / 2);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, cancel, ghost?.rotY]);

  useEffect(() => {
    if (!active) {
      setGhost(null);
      last.current = null;
    }
  }, [active]);

  const confirm = useCallback(() => {
    const g = getGame();
    if (!g || !tierId || !ghost) return;
    if (!ghost.ok) {
      useUI.getState().toast(ghost.reason || 'That spot doesn’t work.', 'warning');
      return;
    }
    const placement = { x: ghost.x, z: ghost.z, rotY: ghost.rotY };
    let msg = '';
    let ok = false;
    let newId: string | undefined;
    useGame.getState().mutate((d) => {
      try {
        if (moveId) {
          const r = placeTank(d, moveId, placement.x, placement.z, placement.rotY);
          ok = r.ok;
          msg = r.message;
        } else {
          const r = buyTank(d, tierId, defaultWaterClass(d), placement, { seeded: useUI.getState().placingSeeded });
          ok = r.ok;
          msg = r.message;
          newId = r.tankId;
        }
      } catch (err) {
        ok = false;
        msg = 'Could not place the tank.';
        console.warn('placement failed', err);
      }
    });
    const ui = useUI.getState();
    ui.toast(msg || (ok ? 'Placed.' : 'That spot doesn’t work.'), ok ? 'success' : 'warning');
    if (ok) {
      ui.set({ tool: 'none', placingTankTierId: null, panelTarget: moveId ? null : ui.panelTarget, ...(newId ? { focusedTankId: newId } : {}) });
      usePlacementStore.getState().reset();
      setGhost(null);
    }
  }, [ghost, tierId, moveId]);

  if (!active || !fac) return null;
  const size = Math.max(fac.width, fac.depth) * 4 + 20;
  const color = ghost?.ok ? GOOD : BAD;
  const o = tierId ? tankOuterSize(tierId) : { L: 1, H: 1, W: 1 };
  const labelY = tierId ? standHeight(tierId) + o.H + 0.35 : 1.5;
  return (
    <group name="placement-ghost">
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => evaluate(e.point.x, e.point.z)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          evaluate(e.point.x, e.point.z);
          confirm();
        }}
        onContextMenu={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          e.nativeEvent.preventDefault?.();
          if (usePlacementStore.getState().rotY === null) usePlacementStore.getState().set({ rotY: ghost?.rotY ?? 0 });
          usePlacementStore.getState().rotate();
        }}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {ghost && tierId && (
        <group position={[ghost.x, 0, ghost.z]} rotation={[0, ghost.rotY, 0]}>
          <GhostBody tierId={tierId} color={color} />
          <Html position={[0, labelY, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div
              data-testid="placement-hint"
              style={{
                whiteSpace: 'nowrap',
                font: '500 12px/1.3 "Inter Variable", Inter, system-ui, sans-serif',
                color: '#e8f1f2',
                background: 'rgba(8,16,20,0.72)',
                border: `1px solid ${ghost.ok ? 'rgba(74,222,128,0.55)' : 'rgba(248,113,113,0.6)'}`,
                borderRadius: 999,
                padding: '5px 11px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
              }}
            >
              <span style={{ color: ghost.ok ? GOOD : BAD, marginRight: 6 }}>{ghost.ok ? '✓' : '✕'}</span>
              {ghost.ok ? `${getTankTier(tierId).name} — click to ${moveId ? 'move' : `buy kit (${fmtPrice(purchaseTotal(tierId, getGame()))})`} · R rotate · Esc cancel` : ghost.reason}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
