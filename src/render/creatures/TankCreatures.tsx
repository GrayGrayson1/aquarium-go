/**
 * Instantiates creature visuals for a tank and applies runtime transforms every frame. OWNER: lane "fishart".
 *
 * - One CreatureObject per creature in the tank (status alive/listed), built by the registered factory
 *   (fish plans here, special creatures from lane "critterart"). Cached by creature id + appearance hash + LOD +
 *   quality + life stage/sex, disposed when the creature leaves or its look changes.
 * - Every frame: reads runtime.creatures (written by the behaviour lane's TankAI), applies position (tank-local; this
 *   group already lives in tank space), rotation (yaw about +Y, pitch, roll; head +X) and scale (standard length in
 *   metres), then calls obj.update(rt, dt, t).
 * - If no runtime entry exists (AI not running, e.g. far tanks) a cheap deterministic idle wander inside swimBounds
 *   keeps every tank alive.
 * - The drawn transform is steadied by a One-Euro filter (core/poseFilter.ts): no frame-to-frame micro-jitter at rest,
 *   no visible lag when swimming.
 * - Positions are clamped so bodies never poke through the glass (half a body length + width margin).
 */
import { substrateHeightAt } from '@/sim/aquascape/terrain';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Creature, CreatureRuntime, Tank, SpeciesDefinition } from '@/types';
import type { RenderLod } from '../lod';
import { useGame, getGame } from '@/state/game';
import { useSettings } from '@/state/settings';
import { useUI } from '@/state/ui';
import { runtime } from '@/runtime/tankRuntime';
import { tankDims, swimBounds, tankWorldTransform } from '@/sim/tankSpace';
import { findSpecies } from '@/data/species';
import { useTankFX } from '../shared/underwater';
import { getCreatureFactory } from './registry';
import type { CreatureObject } from './types';
import { appearanceHash } from './core/palette';
import { hashStr, hash1, clamp, approach } from './core/math';
import { filterPose, makePoseFilter, type PoseFilter } from './core/poseFilter';
import { detailTiers } from '../shared/detail';
import './index';

interface Entry {
  id: string;
  sig: string;
  obj: CreatureObject;
  species: SpeciesDefinition;
  /** Fallback runtime for the idle wander (allocated once). */
  idle: CreatureRuntime;
  seed: number;
  highlighted: boolean;
  /** Presentation smoothing of the drawn transform (removes frame-to-frame micro-jitter; see poseFilter.ts). */
  pose: PoseFilter;
}

const hashCache = new WeakMap<object, string>();
function hashOf(c: Creature): string {
  const a = c.appearance as object | undefined;
  if (!a) return 'none';
  let h = hashCache.get(a);
  if (!h) {
    h = appearanceHash(c.appearance);
    hashCache.set(a, h);
  }
  return h;
}

/** Signature of everything that requires rebuilding a creature's visual. */
function creatureSig(c: Creature): string {
  return `${c.speciesId}|${hashOf(c)}|${c.lifeStage}|${c.sex}`;
}

/**
 * Stable key per tank of the creatures living in it (+ what forces a rebuild), for every tank at once.
 * lane:perf — computed in ONE pass per published creatures object (it changes at most once per sim tick) instead of
 * one full scan per mounted tank per store update; same strings as before.
 */
const keysCache = new WeakMap<object, Map<string, string>>();
function creatureKeysByTank(creatures: Record<string, Creature>): Map<string, string> {
  let m = keysCache.get(creatures);
  if (m) return m;
  m = new Map();
  for (const id in creatures) {
    const c = creatures[id];
    if (!c.tankId || (c.status !== 'alive' && c.status !== 'listed')) continue;
    if (c.lifeStage === 'egg' || c.lifeStage === 'larva') continue;
    m.set(c.tankId, (m.get(c.tankId) ?? '') + `${id}=${creatureSig(c)};`);
  }
  keysCache.set(creatures, m);
  return m;
}

export function makeIdleRuntime(c: Creature): CreatureRuntime {
  return {
    id: c.id,
    speciesId: c.speciesId,
    tankId: c.tankId ?? '',
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    speedBL: 0.5,
    swimPhase: 0,
    bend: 0,
    finFlare: 0,
    gillFlick: 0,
    mouthOpen: 0.06,
    eyeL: 0,
    eyeR: 0,
    flutter: 0.3,
    tailCurl: 0,
    puff: 0,
    belly: 0,
    colorIntensity: 0.85,
    pose: 'swim',
    behavior: 'idle',
    lengthM: Math.max(0.004, c.sizeCm / 100),
    visible: true,
    selected: false,
    ai: {},
  };
}

/** Cheap deterministic wander (Lissajous path) used when the AI is not driving this creature. */
function idleWander(e: Entry, c: Creature, b: ReturnType<typeof swimBounds>, t: number, dt: number): CreatureRuntime {
  const rt = e.idle;
  const L = Math.max(0.004, c.sizeCm / 100);
  rt.lengthM = L;
  const s = e.seed;
  const zones = e.species.activityZone ?? ['middle'];
  const bottom = zones.includes('bottom') || zones.includes('substrate');
  const surface = zones.includes('surface') && !zones.includes('middle');
  const bt = e.species.behaviorTraits;
  const cruise = clamp(bt?.cruiseSpeed ?? 0.8, 0.15, 2) * 0.55;
  const hx = Math.max(0.001, (b.maxX - b.minX) / 2 - L * 0.6);
  const hz = Math.max(0.001, (b.maxZ - b.minZ) / 2 - L * 0.5);
  const hyFull = Math.max(0.001, (b.maxY - b.minY) / 2 - L * 0.3);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  let cy = (b.minY + b.maxY) / 2;
  let hy = hyFull * 0.7;
  if (bottom) {
    cy = b.minY + L * 0.25 + hyFull * 0.12;
    hy = hyFull * 0.1;
  } else if (surface) {
    cy = b.maxY - L * 0.3 - hyFull * 0.15;
    hy = hyFull * 0.15;
  }
  // angular speeds chosen so the path speed ≈ cruise body lengths per second
  const w1 = (cruise * L) / Math.max(0.02, hx) * (0.7 + 0.3 * hash1(s + 1));
  const w2 = w1 * (0.37 + 0.2 * hash1(s + 2));
  const w3 = w1 * (0.53 + 0.3 * hash1(s + 3));
  const p1 = hash1(s + 4) * 6.283;
  const p2 = hash1(s + 5) * 6.283;
  const p3 = hash1(s + 6) * 6.283;
  const x = cx + hx * 0.9 * Math.sin(t * w1 + p1);
  const y = cy + hy * Math.sin(t * w2 + p2);
  const z = cz + hz * 0.85 * Math.sin(t * w3 + p3);
  const vx = hx * 0.9 * w1 * Math.cos(t * w1 + p1);
  const vy = hy * w2 * Math.cos(t * w2 + p2);
  const vz = hz * 0.85 * w3 * Math.cos(t * w3 + p3);
  rt.pos.set(x, y, z);
  rt.vel.set(vx, vy, vz);
  const hs = Math.hypot(vx, vz);
  const targetYaw = Math.atan2(-vz, vx);
  let dy = targetYaw - rt.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const yawRate = dy * Math.min(1, dt * 3) / Math.max(dt, 1e-3);
  rt.yaw += dy * Math.min(1, dt * 3);
  rt.pitch = approach(rt.pitch, clamp(Math.atan2(vy, hs + 1e-4) * 0.6, -0.4, 0.4), 3, dt);
  const speed = Math.hypot(vx, vy, vz) / L;
  rt.speedBL = speed;
  rt.swimPhase += dt * Math.PI * 2 * (0.6 + 1.3 * speed);
  rt.bend = clamp(yawRate / 2.2, -0.8, 0.8);
  rt.flutter = clamp(0.8 - speed, 0.1, 0.8);
  rt.eyeL = Math.sin(t * 0.7 + s) * 0.3;
  rt.eyeR = Math.sin(t * 0.9 + s * 2) * 0.3;
  rt.colorIntensity = 0.85;
  return rt;
}

const _box = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
const _wp = new THREE.Vector3();

export function TankCreatures({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const fx = useTankFX();
  const quality = useSettings((s) => s.quality);
  const group = useRef<THREE.Group>(null);
  const entries = useRef(new Map<string, Entry>());

  // Stable key of the creatures living in this tank (+ what forces a rebuild). WeakMap-cached hashes keep it cheap.
  const key = useGame((s) => (s.game ? creatureKeysByTank(s.game.creatures).get(tank.id) ?? '' : ''));

  // (Re)build objects when the tank population, LOD, quality or tank FX change.
  useLayoutEffect(() => {
    const g = getGame();
    const root = group.current;
    if (!g || !root) return;
    const map = entries.current;
    const want = new Map<string, string>();
    for (const part of key.split(';')) {
      if (!part) continue;
      const i = part.indexOf('=');
      want.set(part.slice(0, i), part.slice(i + 1));
    }
    const lodSig = `|${lod}|${quality}`;
    // remove / rebuild changed
    for (const [id, e] of map) {
      const sig = want.get(id);
      if (sig === undefined || sig + lodSig !== e.sig) {
        e.obj.dispose();
        map.delete(id);
      }
    }
    for (const [id, sig] of want) {
      if (map.has(id)) continue;
      const c = g.creatures[id];
      if (!c) continue;
      const species = findSpecies(c.speciesId);
      if (!species) continue;
      const factory = getCreatureFactory(c.speciesId, species.behaviorSet);
      if (!factory) continue;
      let obj: CreatureObject;
      try {
        obj = factory({ species, creature: c, appearance: c.appearance ?? species.genetics.baseVisual, lod, quality, fx });
      } catch (err) {
        console.warn('[fishart] creature visual failed', c.speciesId, err);
        continue;
      }
      obj.root.userData.creatureId = id;
      obj.root.userData.pickRadius = obj.pickRadius ?? 0.5;
      obj.root.visible = false; // shown once positioned in the first frame
      root.add(obj.root);
      const seed = hashStr(id);
      map.set(id, { id, sig: sig + lodSig, obj, species, idle: makeIdleRuntime(c), seed, highlighted: false, pose: makePoseFilter() });
    }
  }, [key, lod, quality, fx]);

  // dispose everything on unmount
  useEffect(() => {
    const map = entries.current;
    return () => {
      for (const e of map.values()) e.obj.dispose();
      map.clear();
    };
  }, []);

  const dims = useMemo(() => tankDims(tank), [tank]);
  const bounds = useMemo(() => swimBounds(dims), [dims]);

  useFrame((state, delta) => {
    const map = entries.current;
    if (!map.size) return;
    // lane:pc-perf — a tank hidden by the tank-view radius (SceneRoot) draws nothing: skip its animation work too
    // (on the 1,000 gal view that was ~2,400 hidden objects posed and matrix-updated every frame)
    for (let p: THREE.Object3D | null = group.current; p; p = p.parent) if (!p.visible) return;
    const g = getGame();
    if (!g) return;
    const dt = Math.min(0.1, delta);
    const t = state.clock.elapsedTime;
    const ui = useUI.getState();
    // the followed creature is already framed by the camera: no need to outline it too
    const followed = ui.cameraMode === 'follow' || ui.cameraMode === 'close' ? ui.followCreatureId : null;
    const sel = ui.selectedCreatureId === followed ? null : ui.selectedCreatureId;
    const b = bounds;
    // facility tanks: creatures smaller than ~2 px on screen are skipped (no draw calls, no animation work) and
    // small ones drop sub-pixel detail meshes (see CreatureObject.setScreenSize)
    let pxPerM = Infinity;
    if (lod >= 1) {
      const cam = state.camera as THREE.PerspectiveCamera;
      const wp = tankWorldTransform(tank).position;
      const dist = Math.max(0.1, Math.hypot(cam.position.x - wp[0], cam.position.y - wp[1], cam.position.z - wp[2]));
      const fovR = ((cam.fov || 38) * Math.PI) / 180;
      pxPerM = state.size.height / (2 * Math.tan(fovR / 2)) / dist;
    }
    // lane:perf — hero tank: each creature's projected length picks its mesh detail tier (see CreatureObject.setDetailPx)
    const heroCam = state.camera as THREE.PerspectiveCamera;
    const heroPxPerM = lod === 0 ? state.size.height / (2 * Math.tan((((heroCam.getEffectiveFOV?.() ?? heroCam.fov) || 38) * Math.PI) / 360)) : 0;
    for (const e of map.values()) {
      const c = g.creatures[e.id];
      if (!c) continue;
      let rt = runtime.creatures.get(e.id);
      if (!rt || rt.tankId !== tank.id) rt = idleWander(e, c, b, t, dt);
      const root = e.obj.root;
      const L = rt.lengthM > 0 ? rt.lengthM : Math.max(0.004, c.sizeCm / 100);
      root.visible = rt.visible !== false && (lod < 2 || L * pxPerM > 2.4);
      if (!root.visible) continue;
      if (lod >= 1) e.obj.setScreenSize?.(L * pxPerM);
      else if (e.obj.setDetailPx) {
        _wp.setFromMatrixPosition(root.matrixWorld);
        e.obj.setDetailPx(detailTiers.on ? (L * heroPxPerM) / Math.max(0.05, _wp.distanceTo(heroCam.position)) : Infinity);
      }
      // what is drawn is the smoothed transform (still and slow bodies are steadied; fast ones pass straight through)
      const f = e.pose;
      filterPose(f, rt.pos.x, rt.pos.y, rt.pos.z, rt.yaw || 0, rt.pitch || 0, rt.roll || 0, L, t, dt);
      // keep the whole body inside the glass: half length along the heading + body width
      const cy = Math.abs(Math.cos(f.yaw));
      const sy = Math.abs(Math.sin(f.yaw));
      const cp = Math.abs(Math.cos(f.pitch));
      const ex = L * (0.55 * cy * cp + 0.1);
      const ez = L * (0.55 * sy * cp + 0.1);
      _box.minX = b.minX + ex;
      _box.maxX = b.maxX - ex;
      _box.minZ = b.minZ + ez;
      _box.maxZ = b.maxZ - ez;
      const px = _box.minX < _box.maxX ? clamp(f.x, _box.minX, _box.maxX) : (b.minX + b.maxX) / 2;
      const pz = _box.minZ < _box.maxZ ? clamp(f.z, _box.minZ, _box.maxZ) : (b.minZ + b.maxZ) / 2;
      // sloped substrate (aquascape terrain) + the creature's own foot/sole offset so bottom dwellers stand on the sand
      const ground = substrateHeightAt(tank, px, pz);
      const footOffset = typeof e.obj.root.userData.groundOffset === 'number' ? (e.obj.root.userData.groundOffset as number) : 0.05;
      _box.minY = ground + L * footOffset;
      // …and the top of the body (dorsal fin, seahorse coronet) under the surface; surface-breathers still get close
      const topOffset = typeof e.obj.root.userData.topOffset === 'number' ? (e.obj.root.userData.topOffset as number) : 0.08;
      const spitch = Math.abs(Math.sin(f.pitch));
      let topK = topOffset * 0.92 * cp + 0.45 * spitch;
      // lane:brackish — a steeply pitched body whose snout the AI holds at the film (archerfish aiming): the snout is the
      // top of the body then, not snout + dorsal fin stacked
      const snoutUp = rt.surfaceSnout ?? 0;
      if (snoutUp > 0) topK += (Math.max(0.45 * spitch, topOffset * 0.92 * cp - 0.1 * spitch) - topK) * Math.min(1, snoutUp);
      _box.maxY = dims.waterY - L * topK - 0.002;
      const py = clamp(f.y, _box.minY, Math.max(_box.minY, _box.maxY));
      root.position.set(px, py, pz);
      root.rotation.set(f.roll, f.yaw, f.pitch, 'YZX');
      root.scale.setScalar(L);
      const hl = sel === e.id;
      if (hl !== e.highlighted) {
        e.highlighted = hl;
        e.obj.setHighlight?.(hl);
      }
      e.obj.update(rt, dt, t);
    }
  });

  return <group ref={group} name={`creatures:${tank.id}`} />;
}
