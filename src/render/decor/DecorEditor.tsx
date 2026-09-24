/**
 * In-tank 3D decor editor. OWNER: lane "aquascape".
 *
 *  tool 'decor_place' + ui.placingDecorDefId: a translucent ghost follows the pointer across the substrate (and
 *     onto rock/wood for epiphytes & corals). R / wheel rotate, Shift+wheel or [ ] scale, two-finger twist/pinch
 *     on touch. Tint = valid (aqua) / invalid (coral) with the reason under it. Click places (buys) it.
 *  tool 'decor_move': hover highlights an item; drag moves it (epiphytes ride along); R / wheel rotate while held;
 *     Delete / Backspace sells the hovered/held item back at 50 %. Esc exits either tool.
 *
 * Only listens while one of these tools is active on the focused tank; everything else belongs to the behaviour lane.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Tank, DecorDef } from '@/types';
import type { TankFXUniforms } from '../shared/underwater';
import { getDecorDef } from '@/data/catalog/decor';
import { useUI } from '@/state/ui';
import { useGame, getGame } from '@/state/game';
import { checkPlacement, placementLimits, maxScaleFor, placeDecor, moveDecor, removeDecor, SELL_BACK_FRACTION, takeFrag, plantFrag, fragEligibility, fragLabel } from '@/sim/aquascape';
import { fragStoreOffer } from '@/sim/economy'; // lane:frags
import { sfx } from '@/audio/sfx';
import { acquireDecorGeometry, releaseDecorGeometry, MAT_CLASSES } from './gen';
import { decorPick, editingDecor } from './registry';
import type { DecorTankUniforms } from './materials';
import type { SharedDecorMats } from './DecorItem';

const VALID = new THREE.Color('#5EEAD4');
const INVALID = new THREE.Color('#F87171');

interface Ghost {
  defId: string;
  x: number;
  z: number;
  y: number;
  rotY: number;
  scale: number;
  ok: boolean;
  msg: string;
  visible: boolean;
}

function GhostMesh({ def, seed, ghost }: { def: DecorDef; seed: number; ghost: Ghost }) {
  const geo = useMemo(() => acquireDecorGeometry(def, seed, 0), [def, seed]);
  useEffect(() => () => releaseDecorGeometry(def, seed, 0), [def, seed]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, roughness: 0.6, emissiveIntensity: 0.55, side: THREE.DoubleSide }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  mat.emissive.copy(ghost.ok ? VALID : INVALID);
  mat.color.set(ghost.ok ? '#ffffff' : '#ffb3b3');
  return (
    <group position={[ghost.x, ghost.y, ghost.z]} rotation={[0, ghost.rotY, 0]} scale={ghost.scale} visible={ghost.visible} renderOrder={10}>
      {MAT_CLASSES.map((k) => (geo[k] ? <mesh key={k} geometry={geo[k]} material={mat} renderOrder={10} /> : null))}
    </group>
  );
}

function Footprint({ x, y, z, rx, rz, rotY, color, visible }: { x: number; y: number; z: number; rx: number; rz: number; rotY: number; color: THREE.Color; visible: boolean }) {
  const geo = useMemo(() => new THREE.RingGeometry(0.93, 1, 64).rotateX(-Math.PI / 2), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false, depthTest: false }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  mat.color.copy(color);
  return <mesh geometry={geo} material={mat} position={[x, y + 0.002, z]} rotation={[0, rotY, 0]} scale={[rx, 1, rz]} visible={visible} renderOrder={11} />;
}

const label: React.CSSProperties = {
  transform: 'translate(-50%, 14px)',
  whiteSpace: 'nowrap',
  padding: '5px 10px',
  borderRadius: 10,
  background: 'rgba(10,16,22,0.72)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#e8f4f2',
  font: '500 12px/1.3 "Inter Variable", Inter, system-ui, sans-serif',
  pointerEvents: 'none',
};

export function DecorEditor({ tank }: { tank: Tank; fx: TankFXUniforms; tankU: DecorTankUniforms; shared: SharedDecorMats }) {
  const tool = useUI((s) => s.tool);
  const placingId = useUI((s) => s.placingDecorDefId);
  const { camera, gl } = useThree();
  const root = useRef<THREE.Group>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [heldId, setHeldId] = useState<string | null>(null);
  // hitOk: lastX/lastZ hold a real pointer hit for the current tool (a tap never has to wait for React's ghost state)
  const ghostAt = useRef(0); // lane:pc-perf
  const state = useRef({ rotY: 0, scale: 1, lastX: 0, lastZ: 0, hitOk: false, pointer: new THREE.Vector2(), hasPointer: false, touches: new Map<number, { x: number; y: number }>(), pinch0: 0, twist0: 0, scale0: 1, rot0: 0, grabOffset: [0, 0] as [number, number], downAt: 0 });
  const tankRef = useRef(tank);
  tankRef.current = tank;
  const placingDef = placingId ? getDecorDef(placingId) : undefined;
  // lane:frags — planting a stored frag/cutting: placed free, at its frag size (frags are never rescaled by hand)
  const placingFragId = useUI((s) => s.placingFragId ?? null);
  const fragItem = () => {
    const f = placingFragId ? getGame()?.inventory.frags?.find((x) => x.id === placingFragId) : undefined;
    return f && f.defId === placingId ? f : undefined;
  };
  const heldInst = heldId ? tank.decor.find((d) => d.id === heldId) : undefined;
  const heldDef = heldInst ? getDecorDef(heldInst.defId) : undefined;
  const activeDef = tool === 'decor_place' ? placingDef : heldDef;
  const ghostSeed = tool === 'decor_place' ? 777 : heldInst?.seed ?? 1;

  // reset per-tool state
  useEffect(() => {
    state.current.rotY = 0;
    state.current.scale = fragItem()?.scale ?? 1;
    state.current.hitOk = false;
    setGhost(null);
    setHeldId(null);
    editingDecor.id = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, placingId, placingFragId]);
  useEffect(
    () => () => {
      editingDecor.id = null;
      // lane:frags — leaving the editor ends any frag planting, so a later catalogue purchase never plants a stored frag
      if (useUI.getState().placingFragId) useUI.getState().set({ placingFragId: null });
    },
    [],
  );

  /** Tank-local hit on the substrate (or on decor for epiphytes) under the pointer. */
  const hitLocal = (): { x: number; z: number; itemId?: string } | null => {
    const pick = decorPick(tankRef.current.id);
    ray.setFromCamera(state.current.pointer, camera);
    const targets: THREE.Object3D[] = [];
    if (pick.substrate) targets.push(pick.substrate);
    for (const [id, o] of pick.items) if (id !== editingDecor.id) targets.push(o);
    const hits = ray.intersectObjects(targets, true);
    const hit = hits[0];
    if (!hit || !root.current) {
      // fall back to the substrate plane at mid depth
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      if (!root.current) return null;
      const m = root.current.matrixWorld;
      const n = new THREE.Vector3(0, 1, 0).transformDirection(m);
      const o = new THREE.Vector3(0, 0.03, 0).applyMatrix4(m);
      plane.setFromNormalAndCoplanarPoint(n, o);
      const p = new THREE.Vector3();
      if (!ray.ray.intersectPlane(plane, p)) return null;
      const l = root.current.worldToLocal(p);
      return { x: l.x, z: l.z };
    }
    const l = root.current.worldToLocal(hit.point.clone());
    let obj: THREE.Object3D | null = hit.object;
    let itemId: string | undefined;
    while (obj) {
      if (obj.userData?.decorId) {
        itemId = obj.userData.decorId as string;
        break;
      }
      obj = obj.parent;
    }
    return { x: l.x, z: l.z, itemId };
  };

  /** Re-hit the pointer, clamp, validate and show the ghost. Returns true when lastX/lastZ now hold a valid hit. */
  const updateGhost = (): boolean => {
    const g = getGame();
    const t = tankRef.current;
    const def = activeDef;
    if (!g || !def) {
      setGhost(null);
      return false;
    }
    const h = hitLocal();
    if (!h) return false;
    const st = state.current;
    let x = h.x - (tool === 'decor_move' ? st.grabOffset[0] : 0);
    let z = h.z - (tool === 'decor_move' ? st.grabOffset[1] : 0);
    const maxS = maxScaleFor(t, def);
    st.scale = Math.min(maxS, Math.max(def.scaleRange[0], st.scale));
    const frag = tool === 'decor_place' ? fragItem() : undefined;
    if (frag) st.scale = frag.scale;
    else if (tool === 'decor_move' && heldInst?.frag && heldInst.frag.grownHour === undefined) st.scale = heldInst.scale;
    const lim = placementLimits(t, def, st.scale, st.rotY);
    x = Math.max(-lim.maxX, Math.min(lim.maxX, x));
    z = Math.max(-lim.maxZ, Math.min(lim.maxZ, z));
    st.lastX = x;
    st.lastZ = z;
    st.hitOk = true;
    const chk = checkPlacement(g, t, def.id, { x, z, rotY: st.rotY, scale: st.scale }, tool === 'decor_move' ? { excludeId: heldId ?? undefined, purchase: 'none' } : { purchase: frag ? 'none' : 'buy' });
    setGhost({ defId: def.id, x, z, y: chk.y, rotY: st.rotY, scale: chk.scale, ok: chk.ok, msg: chk.ok ? (tool === 'decor_place' ? (frag ? `${fragLabel(frag)} · plant free` : `${def.name} · $${def.price}`) : def.name) : chk.message, visible: true });
    return true;
  };

  const doPlace = () => {
    const def = placingDef;
    if (!def) return;
    // use the latest pointer hit (a finger tap has no hover, so the React ghost may not exist yet)
    if (!state.current.hitOk && !updateGhost()) return;
    let res = { ok: false, message: '' } as { ok: boolean; message: string };
    const frag = fragItem();
    if (frag) {
      // lane:frags — plant the stored frag here, then leave the tool (it's been used up)
      useGame.getState().mutate((d) => {
        res = plantFrag(d, tank.id, frag.id, { x: state.current.lastX, z: state.current.lastZ, rotY: state.current.rotY });
      });
      useUI.getState().toast(res.message, res.ok ? 'success' : 'warning');
      try {
        sfx(res.ok ? 'place' : 'error');
      } catch {
        /* audio optional */
      }
      if (res.ok) useUI.getState().set({ tool: 'none', placingDecorDefId: null, placingFragId: null });
      return;
    }
    const owned = !!getGame()?.inventory.decor.some((d) => d.defId === def.id);
    useGame.getState().mutate((d) => {
      res = placeDecor(d, tank.id, def.id, { x: state.current.lastX, z: state.current.lastZ, rotY: state.current.rotY, scale: state.current.scale }, owned);
    });
    useUI.getState().toast(res.message, res.ok ? 'success' : 'warning');
    try {
      sfx(res.ok ? 'place' : 'error');
    } catch {
      /* audio optional */
    }
    requestAnimationFrame(updateGhost);
  };

  const doMoveEnd = () => {
    const id = heldId;
    if (!id) return;
    let res = { ok: false, message: '' } as { ok: boolean; message: string };
    useGame.getState().mutate((d) => {
      res = moveDecor(d, tank.id, id, { x: state.current.lastX, z: state.current.lastZ, rotY: state.current.rotY, scale: state.current.scale });
    });
    if (!res.ok) useUI.getState().toast(res.message, 'warning');
    try {
      sfx(res.ok ? 'place' : 'error');
    } catch {
      /* audio optional */
    }
    setHeldId(null);
    editingDecor.id = null;
    setGhost(null);
  };

  const doSell = (id: string) => {
    const inst = tankRef.current.decor.find((d) => d.id === id);
    const def = inst ? getDecorDef(inst.defId) : undefined;
    let res = { ok: false, message: '' } as { ok: boolean; message: string };
    useGame.getState().mutate((d) => {
      res = removeDecor(d, tank.id, id, true);
    });
    useUI.getState().toast(res.ok ? res.message : res.message || `Couldn't remove ${def?.name ?? 'item'}`, res.ok ? 'info' : 'warning');
    try {
      sfx(res.ok ? 'coin' : 'error');
    } catch {
      /* audio optional */
    }
    setHeldId(null);
    setHoverId(null);
    editingDecor.id = null;
    setGhost(null);
  };

  // DOM listeners (capture phase on window so camera controls don't also react while editing)
  useEffect(() => {
    const el = gl.domElement;
    const onCanvas = (e: Event) => e.target === el;
    const setPointer = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      state.current.pointer.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      state.current.hasPointer = true;
    };
    const move = (e: PointerEvent) => {
      if (!onCanvas(e)) return;
      const st = state.current;
      if (e.pointerType === 'touch') st.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (st.touches.size >= 2) {
        const [a, b] = [...st.touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        if (st.pinch0 > 0) {
          st.scale = st.scale0 * (dist / st.pinch0);
          st.rotY = st.rot0 - (ang - st.twist0);
        }
        e.stopImmediatePropagation();
        updateGhost();
        return;
      }
      setPointer(e.clientX, e.clientY);
      if (tool === 'decor_place' || heldId) {
        updateGhost();
        if (heldId) e.stopImmediatePropagation();
      } else if (tool === 'decor_move') {
        const h = hitLocal();
        setHoverId(h?.itemId ?? null);
      }
    };
    const down = (e: PointerEvent) => {
      if (!onCanvas(e) || e.button > 0) return;
      const st = state.current;
      if (e.pointerType === 'touch') {
        st.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (st.touches.size === 2) {
          const [a, b] = [...st.touches.values()];
          st.pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
          st.twist0 = Math.atan2(b.y - a.y, b.x - a.x);
          st.scale0 = st.scale;
          st.rot0 = st.rotY;
          e.stopImmediatePropagation();
          return;
        }
      }
      setPointer(e.clientX, e.clientY);
      st.downAt = performance.now();
      if (tool === 'decor_place') {
        e.stopImmediatePropagation();
        // touch has no hover: hit-test right away so a tap without movement places where the finger landed
        updateGhost();
        return;
      }
      if (tool === 'decor_move') {
        const h = hitLocal();
        if (h?.itemId) {
          const inst = tankRef.current.decor.find((d) => d.id === h.itemId);
          if (inst) {
            st.rotY = inst.rotY;
            st.scale = inst.scale;
            st.grabOffset = [h.x - inst.x, h.z - inst.z];
            editingDecor.id = inst.id;
            setHeldId(inst.id);
            e.stopImmediatePropagation();
            requestAnimationFrame(updateGhost);
          }
        }
      }
    };
    const up = (e: PointerEvent) => {
      const st = state.current;
      if (e.pointerType === 'touch') {
        st.touches.delete(e.pointerId);
        if (st.touches.size < 2) st.pinch0 = 0;
      }
      if (!onCanvas(e)) return;
      if (tool === 'decor_place' && e.button === 0 && performance.now() - st.downAt < 600 && st.touches.size === 0) {
        e.stopImmediatePropagation();
        setPointer(e.clientX, e.clientY);
        updateGhost();
        doPlace();
      } else if (tool === 'decor_move' && heldId) {
        e.stopImmediatePropagation();
        doMoveEnd();
      }
    };
    const wheel = (e: WheelEvent) => {
      if (!onCanvas(e)) return;
      if (!(tool === 'decor_place' && placingDef) && !heldId) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const st = state.current;
      if (e.shiftKey || e.ctrlKey) st.scale *= Math.exp(-Math.sign(e.deltaY || e.deltaX) * 0.06);
      else st.rotY += Math.sign(e.deltaY) * (Math.PI / 12);
      updateGhost();
    };
    const key = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      const st = state.current;
      if (e.key === 'r' || e.key === 'R') {
        st.rotY += (e.shiftKey ? -1 : 1) * (Math.PI / 12);
        updateGhost();
      } else if (e.key === ']' || e.key === '=' || e.key === '+') {
        st.scale *= 1.08;
        updateGhost();
      } else if (e.key === '[' || e.key === '-') {
        st.scale /= 1.08;
        updateGhost();
      } else if (e.key === 'Escape') {
        if (heldId) {
          setHeldId(null);
          editingDecor.id = null;
          setGhost(null);
        } else useUI.getState().set({ tool: 'none', placingDecorDefId: null });
      } else if ((e.key === 'f' || e.key === 'F') && tool === 'decor_move' && !e.metaKey && !e.ctrlKey) {
        // lane:frags — F takes a frag/cutting from the hovered (or held) piece
        const id = heldId ?? hoverId;
        if (id) {
          let res = { ok: false, message: '' } as { ok: boolean; message: string };
          useGame.getState().mutate((d) => {
            res = takeFrag(d, tank.id, id);
          });
          useUI.getState().toast(res.message, res.ok ? 'success' : 'info');
          try {
            sfx(res.ok ? 'place' : 'error');
          } catch {
            /* audio optional */
          }
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'decor_move') {
        const id = heldId ?? hoverId;
        if (id) {
          e.preventDefault();
          doSell(id);
        }
      }
    };
    window.addEventListener('pointermove', move, { capture: true });
    window.addEventListener('pointerdown', down, { capture: true });
    window.addEventListener('pointerup', up, { capture: true });
    window.addEventListener('wheel', wheel, { capture: true, passive: false });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move, { capture: true });
      window.removeEventListener('pointerdown', down, { capture: true });
      window.removeEventListener('pointerup', up, { capture: true });
      window.removeEventListener('wheel', wheel, { capture: true });
      window.removeEventListener('keydown', key);
    };
  });

  // keep the ghost glued to the scape while the camera glides
  useFrame(() => {
    // lane:pc-perf — ~15×/s by time (a per-frame coin flip ran 2.4× as often at 144 Hz)
    const now = performance.now();
    if (state.current.hasPointer && (tool === 'decor_place' || heldId) && ghost && now - ghostAt.current > 66) {
      ghostAt.current = now;
      updateGhost();
    }
  });

  const hoverInst = tool === 'decor_move' && !heldId && hoverId ? tank.decor.find((d) => d.id === hoverId) : undefined;
  const hoverDef = hoverInst ? getDecorDef(hoverInst.defId) : undefined;
  // lane:frags — frags sell at the store's frag price; living pieces show whether F can take a frag right now
  const g0 = hoverInst ? getGame() : null;
  const hoverSell = hoverInst && hoverDef ? (hoverInst.frag && hoverInst.frag.grownHour === undefined && g0 ? fragStoreOffer(g0, hoverInst) : Math.round(hoverDef.price * SELL_BACK_FRACTION)) : 0;
  const hoverFrag = hoverInst && g0 ? fragEligibility(g0, tank, hoverInst) : null;
  const hoverFragHint = hoverFrag?.ok ? ` · F: ${hoverFrag.rule.action.toLowerCase()}` : hoverFrag?.code === 'recovering' ? ' · healing from a cut' : '';
  const ghostDef = ghost ? getDecorDef(ghost.defId) : undefined;
  const fpColor = ghost?.ok ? VALID : INVALID;
  return (
    <group ref={root} name="decor-editor">
      {ghost && ghostDef && activeDef && (
        <>
          <GhostMesh def={ghostDef} seed={ghostSeed} ghost={ghost} />
          <Footprint x={ghost.x} y={ghost.y} z={ghost.z} rx={(ghostDef.size.w * ghost.scale) / 2} rz={(ghostDef.size.d * ghost.scale) / 2} rotY={ghost.rotY} color={fpColor} visible />
          <Html position={[ghost.x, ghost.y, ghost.z]} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <div style={{ ...label, borderColor: ghost.ok ? 'rgba(94,234,212,0.5)' : 'rgba(248,113,113,0.6)' }}>
              {ghost.ok ? '✓ ' : '✕ '}
              {ghost.msg}
              <span style={{ opacity: 0.6 }}>{tool === 'decor_place' ? (placingFragId ? '  ·  R rotate' : '  ·  R rotate · Shift+wheel size') : '  ·  release to drop'}</span>
            </div>
          </Html>
        </>
      )}
      {hoverInst && hoverDef && (
        <>
          <Footprint x={hoverInst.x} y={hoverInst.y} z={hoverInst.z} rx={(hoverDef.size.w * hoverInst.scale) / 2} rz={(hoverDef.size.d * hoverInst.scale) / 2} rotY={hoverInst.rotY} color={VALID} visible />
          <Html position={[hoverInst.x, hoverInst.y + hoverDef.size.h * hoverInst.scale, hoverInst.z]} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <div style={{ ...label, transform: 'translate(-50%, -140%)' }}>
              {hoverDef.name}
              <span style={{ opacity: 0.6 }}>{`  ·  drag to move · Del sells for $${hoverSell}${hoverFragHint}`}</span>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}
