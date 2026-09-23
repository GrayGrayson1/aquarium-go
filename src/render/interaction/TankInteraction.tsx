/**
 * Pointer/touch handling on the focused tank: cursor-follow, glass taps, feed tools, creature picking.
 * OWNER: lane "behavior".
 *
 * The pointer is resolved with ray–plane math against the tank's glass (front pane first, then top/sides) using the
 * tank group's world matrix — never mesh raycasts through glass. Clicks are pointer-down/up pairs that barely move
 * (so camera drags from the camera rig are ignored). Touch-first: nothing is hover-only.
 */
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Tank } from '@/types';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { runtime, pushVisualEvent, nowSeconds } from '@/runtime/tankRuntime';
import { tankDims } from '@/sim/tankSpace';
import { feedTank } from '@/sim/care';
import { registerGlassTap, noteInteraction } from '@/sim/life/actions';
import { findSpecies } from '@/data/species';
import { getFoodDef } from '@/data/catalog/foods';
import { sfx } from '@/audio/sfx';
import { aiFeed, aiTap } from '@/ai/registry';

const CLICK_PX = 7;
const CLICK_MS = 550;
const DOUBLE_MS = 380;
const SPAM_WINDOW_S = 3;
const SPAM_TAPS = 4;
const TOAST_THROTTLE_S = 20;
const BLOCKING_TOOLS = new Set(['decor_place', 'decor_move', 'tank_place']);

let lastSpamToast = -1e9;
let lastHintToast = -1e9;

export interface GlassHit {
  /** Tank-local point on the glass/surface the ray entered through. */
  local: THREE.Vector3;
  face: 'front' | 'top' | 'left' | 'right' | 'back';
}

const _ray = new THREE.Ray();
const _inv = new THREE.Matrix4();
const _ndc = new THREE.Vector2();
const _rc = new THREE.Raycaster();
const _p = new THREE.Vector3();
const _w = new THREE.Vector3();
const _r = new THREE.Vector3();

/** Intersect a world-space ray with the tank's water box from outside (tank-local result). */
export function hitTankGlass(ray: THREE.Ray, tankMatrixWorld: THREE.Matrix4, tank: Tank, out: THREE.Vector3): GlassHit['face'] | null {
  const d = tankDims(tank);
  _inv.copy(tankMatrixWorld).invert();
  _ray.copy(ray).applyMatrix4(_inv);
  const o = _ray.origin;
  const v = _ray.direction;
  const hx = d.L / 2;
  const hz = d.W / 2;
  const top = d.waterY;
  // front glass first (z = +W/2), the way people look into aquariums
  const tryPlane = (axis: 'x' | 'y' | 'z', value: number, face: GlassHit['face']): boolean => {
    const dv = v[axis];
    if (Math.abs(dv) < 1e-8) return false;
    const t = (value - o[axis]) / dv;
    if (t <= 0) return false;
    out.copy(o).addScaledVector(v, t);
    const eps = 1e-4;
    if (axis !== 'x' && (out.x < -hx - eps || out.x > hx + eps)) return false;
    if (axis !== 'z' && (out.z < -hz - eps || out.z > hz + eps)) return false;
    if (axis !== 'y' && (out.y < 0 - eps || out.y > d.H + eps)) return false;
    out.y = Math.min(out.y, top);
    return !!face;
  };
  if (o.z > hz && tryPlane('z', hz, 'front')) return 'front';
  if (o.y > top && tryPlane('y', top, 'top')) return 'top';
  if (o.x < -hx && tryPlane('x', -hx, 'left')) return 'left';
  if (o.x > hx && tryPlane('x', hx, 'right')) return 'right';
  if (o.z < -hz && tryPlane('z', -hz, 'back')) return 'back';
  return null;
}

export function TankInteraction({ tank }: { tank: Tank }) {
  const { gl, camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const tankRef = useRef(tank);
  tankRef.current = tank;

  useEffect(() => {
    const el = gl.domElement;
    const down = new Map<number, { x: number; y: number; t: number; type: string }>();
    let lastClick = { t: -1e9, id: '' as string | null };
    let dragging = false;
    let hoverCursor = '';
    let touchReleaseTimer: number | null = null;

    const blocked = () => {
      const ui = useUI.getState();
      return ui.view !== 'tank' || ui.focusedTankId !== tankRef.current.id || BLOCKING_TOOLS.has(ui.tool) || ui.screen !== 'game';
    };

    const toRay = (clientX: number, clientY: number): THREE.Ray => {
      const rect = el.getBoundingClientRect();
      _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      _rc.setFromCamera(_ndc, camera);
      return _rc.ray;
    };

    const glassPoint = (clientX: number, clientY: number, out: THREE.Vector3): GlassHit['face'] | null => {
      const g = group.current;
      if (!g) return null;
      g.updateWorldMatrix(true, false);
      return hitTankGlass(toRay(clientX, clientY), g.matrixWorld, tankRef.current, out);
    };

    /** Screen-space nearest creature within its pick radius. */
    const pick = (clientX: number, clientY: number, touch: boolean): string | null => {
      const g = group.current;
      if (!g) return null;
      const rect = el.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      _r.setFromMatrixColumn(camera.matrixWorld, 0).normalize(); // camera right (world)
      let best: string | null = null;
      let bestScore = Infinity;
      for (const rt of runtime.creatures.values()) {
        if (rt.tankId !== tankRef.current.id || !rt.visible) continue;
        _w.copy(rt.pos).applyMatrix4(g.matrixWorld);
        _p.copy(_w).project(camera);
        if (_p.z > 1 || _p.z < -1) continue;
        const sx = ((_p.x + 1) / 2) * rect.width;
        const sy = ((1 - _p.y) / 2) * rect.height;
        _w.addScaledVector(_r, rt.lengthM * 0.5).project(camera);
        const lenPx = Math.hypot(((_w.x + 1) / 2) * rect.width - sx, ((1 - _w.y) / 2) * rect.height - sy);
        const mul = findSpecies(rt.speciesId)?.behaviorTraits.pickRadiusMul ?? 1;
        const rPx = Math.max(touch ? 30 : 16, lenPx * 1.15 * mul);
        const d = Math.hypot(mx - sx, my - sy);
        if (d > rPx) continue;
        const score = d / rPx + _p.z * 0.05;
        if (score < bestScore) {
          bestScore = score;
          best = rt.id;
        }
      }
      return best;
    };

    const setCursor = (c: string) => {
      if (c === hoverCursor) return;
      hoverCursor = c;
      el.style.cursor = c;
    };

    const onMove = (e: PointerEvent) => {
      const st = down.get(e.pointerId);
      if (st && Math.hypot(e.clientX - st.x, e.clientY - st.y) > CLICK_PX) dragging = true;
      if (down.size > 1 || dragging || blocked()) {
        if (runtime.pointer.tankId === tankRef.current.id) runtime.pointer.active = false;
        if (hoverCursor) setCursor('');
        return;
      }
      const face = glassPoint(e.clientX, e.clientY, _p);
      if (!face) {
        if (runtime.pointer.tankId === tankRef.current.id) runtime.pointer.active = false;
        if (hoverCursor) setCursor('');
        return;
      }
      const d = tankDims(tankRef.current);
      runtime.pointer.active = true;
      runtime.pointer.tankId = tankRef.current.id;
      runtime.pointer.local = [_p.x, Math.max(d.substrateY, Math.min(d.waterY, _p.y)), face === 'front' ? d.W / 2 : _p.z];
      runtime.pointer.lastMoveT = nowSeconds();
      if (e.pointerType === 'mouse') {
        const tool = useUI.getState().tool;
        if (tool === 'feed') setCursor('copy');
        else if (tool === 'target_feed') setCursor(pick(e.clientX, e.clientY, false) ? 'copy' : 'crosshair');
        else if (tool === 'tap') setCursor('pointer');
        else setCursor(pick(e.clientX, e.clientY, false) ? 'pointer' : '');
      }
    };

    const onDown = (e: PointerEvent) => {
      down.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType });
      if (down.size === 1) dragging = false;
      if (touchReleaseTimer !== null) {
        window.clearTimeout(touchReleaseTimer);
        touchReleaseTimer = null;
      }
      if (e.pointerType !== 'mouse') onMove(e);
    };

    const onUp = (e: PointerEvent) => {
      const st = down.get(e.pointerId);
      down.delete(e.pointerId);
      const wasDrag = dragging;
      if (down.size === 0) dragging = false;
      if (e.pointerType !== 'mouse') {
        // keep the finger "present" for a moment so curious fish can come and look
        touchReleaseTimer = window.setTimeout(() => {
          if (runtime.pointer.tankId === tankRef.current.id) runtime.pointer.active = false;
        }, 1800);
      }
      if (!st || wasDrag || down.size > 0) return;
      if (performance.now() - st.t > CLICK_MS) return;
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > CLICK_PX) return;
      if (blocked()) return;
      handleClick(e.clientX, e.clientY, st.type !== 'mouse');
    };

    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && runtime.pointer.tankId === tankRef.current.id) runtime.pointer.active = false;
      setCursor('');
    };

    const onCancel = (e: PointerEvent) => {
      down.delete(e.pointerId);
      dragging = false;
      if (runtime.pointer.tankId === tankRef.current.id) runtime.pointer.active = false;
    };

    const handleClick = (x: number, y: number, touch: boolean) => {
      const t = tankRef.current;
      const ui = useUI.getState();
      const face = glassPoint(x, y, _p);
      const d = tankDims(t);
      const tool = ui.tool;
      const mutate = useGame.getState().mutate;
      const game = useGame.getState().game;
      if (!game) return;

      if (tool === 'feed') {
        if (!face) return;
        const foodId = ui.feedFoodId ?? pickDefaultFood(game.inventory.foods);
        if (!foodId) {
          ui.toast('Choose a food first.', 'info');
          return;
        }
        const def = getFoodDef(foodId);
        const zone: 'surface' | 'middle' | 'bottom' = !def || def.delivery === 'floating' ? 'surface' : _p.y < d.waterY * 0.35 ? 'bottom' : 'middle';
        let res = { ok: false, message: 'Could not feed' };
        mutate((dr) => {
          res = feedTank(dr, t.id, foodId, { zone });
        });
        if (!res.ok) {
          ui.toast(res.message, 'warning');
          return;
        }
        // food goes in from the top, above where you tapped
        const z = face === 'front' ? d.W / 2 - d.W * 0.28 : _p.z;
        const local: [number, number, number] = [_p.x, d.waterY - 0.002, z];
        aiFeed(t.id, foodId, local);
        pushVisualEvent({ kind: 'feed', tankId: t.id, pos: local, t: nowSeconds(), strength: 0.6 });
        sfx('feed');
        return;
      }

      if (tool === 'target_feed') {
        const id = pick(x, y, touch);
        if (!id) {
          if (nowSeconds() - lastHintToast > 6) {
            lastHintToast = nowSeconds();
            ui.toast('Tap an animal to hold food right in front of it.', 'info');
          }
          return;
        }
        const foodId = ui.feedFoodId ?? pickDefaultFood(game.inventory.foods, game.creatures[id]?.speciesId);
        if (!foodId) {
          ui.toast('Choose a food first.', 'info');
          return;
        }
        let res = { ok: false, message: 'Could not feed' };
        mutate((dr) => {
          res = feedTank(dr, t.id, foodId, { targetCreatureId: id });
          if (res.ok) noteInteraction(dr, id, 'target_fed');
        });
        if (!res.ok) {
          ui.toast(res.message, 'warning');
          return;
        }
        const rt = runtime.creatures.get(id);
        if (rt) {
          // tongs / pipette: just in front of the snout
          const cp = Math.cos(rt.pitch);
          const fx = cp * Math.cos(rt.yaw);
          const fz = -cp * Math.sin(rt.yaw);
          const reach = rt.lengthM * (rt.speciesId.includes('seahorse') ? 0.55 : 0.8);
          const local: [number, number, number] = [
            Math.max(-d.L / 2 + 0.01, Math.min(d.L / 2 - 0.01, rt.pos.x + fx * reach)),
            Math.max(d.substrateY + 0.01, Math.min(d.waterY - 0.01, rt.pos.y + Math.sin(rt.pitch) * reach + rt.lengthM * (rt.speciesId.includes('seahorse') ? 0.3 : 0.05))),
            Math.max(-d.W / 2 + 0.01, Math.min(d.W / 2 - 0.01, rt.pos.z + fz * reach)),
          ];
          aiFeed(t.id, foodId, local, { targetCreatureId: id });
          pushVisualEvent({ kind: 'feed', tankId: t.id, pos: local, creatureId: id, t: nowSeconds(), strength: 0.3 });
        }
        sfx('feed', { volume: 0.5 });
        return;
      }

      if (tool === 'tap') {
        if (face) tapGlass(t.id, face === 'front' ? [_p.x, _p.y, d.W / 2] : [_p.x, _p.y, _p.z], 1);
        return;
      }

      // default: select a creature (double-click/tap → follow camera); otherwise a gentle tap on the glass
      const id = pick(x, y, touch);
      const now = performance.now();
      if (id) {
        if (lastClick.id === id && now - lastClick.t < DOUBLE_MS) {
          ui.set({ selectedCreatureId: id, cameraMode: 'follow', followCreatureId: id });
          mutate((dr) => noteInteraction(dr, id, 'follow'));
          lastClick = { t: -1e9, id: null };
          return;
        }
        lastClick = { t: now, id };
        ui.set({ selectedCreatureId: id });
        mutate((dr) => noteInteraction(dr, id, 'observe'));
        sfx('click', { volume: 0.4 });
        return;
      }
      lastClick = { t: now, id: null };
      if (face && !ui.photoMode) tapGlass(t.id, face === 'front' ? [_p.x, _p.y, d.W / 2] : [_p.x, _p.y, _p.z], 0.5);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onCancel);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onCancel);
      if (touchReleaseTimer !== null) window.clearTimeout(touchReleaseTimer);
      if (runtime.pointer.tankId === tankRef.current.id) runtime.pointer.active = false;
      if (hoverCursor) el.style.cursor = '';
    };
  }, [gl, camera]);

  return <group ref={group} name={`interaction:${tank.id}`} />;
}

/** A glass tap: startle wave in the AI, visual + sound, sim tap pressure, and a gentle warning on repeated taps. */
export function tapGlass(tankId: string, local: [number, number, number], strength: number): void {
  const now = nowSeconds();
  const taps = runtime.pointer.taps;
  taps.push(now);
  while (taps.length && now - taps[0] > SPAM_WINDOW_S) taps.shift();
  const spam = taps.length >= SPAM_TAPS;
  const s = spam ? Math.max(strength, 1) * 1.4 : strength;
  aiTap(tankId, local, s, spam);
  pushVisualEvent({ kind: 'tap', tankId, pos: local, t: now, strength: s });
  sfx('tap_glass', { volume: Math.min(1, 0.35 + 0.45 * s) });
  useGame.getState().mutate((d) => registerGlassTap(d, tankId, spam ? 1.5 : strength * 0.5));
  if (spam && now - lastSpamToast > TOAST_THROTTLE_S) {
    lastSpamToast = now;
    useUI.getState().toast('Give them a moment — repeated tapping stresses fish.', 'warning');
  }
}

/** First food in the inventory with servings left (preferring one the species eats). */
function pickDefaultFood(foods: Record<string, number>, speciesId?: string): string | null {
  const sp = speciesId ? findSpecies(speciesId) : undefined;
  let fallback: string | null = null;
  for (const [id, n] of Object.entries(foods)) {
    if (!(n > 0)) continue;
    const def = getFoodDef(id);
    if (sp && def && def.tags.some((t) => sp.foods.includes(t))) return id;
    fallback ??= id;
  }
  return fallback;
}
