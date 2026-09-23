/**
 * Room shell for every facility level: exterior ground, textured floor, four walls with openings, skirting,
 * wainscot and crown trims, and a "dollhouse" cut-away — any wall between the camera and the room drops to a low
 * stub so the view always reaches the tanks. OWNER: lane "facility".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FacilityLevelId } from '@/types';
import { getFacilityLevel } from '@/data/facilities';
import { ROOM_STYLES, type RoomStyle } from './styles';
import { Batch, box, rbox, floorPlane, wallWithOpenings, noPick } from './kit';
import { acquireTexture, releaseTexture, woodPlanks, concrete, stoneTiles, tiles, plaster, woodSlats } from './textures';

export interface Opening {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  kind: 'door' | 'window' | 'storefront' | 'arch';
}

export type WallSide = 'back' | 'front' | 'left' | 'right';

export interface WallSpec {
  side: WallSide;
  /** Wall-local openings (local x runs along the wall; see wallFrame). */
  openings: Opening[];
}

export const WALL_T = 0.14;

/** Frame for a wall: centre, rotation, length and inward normal. Local +z of the wall faces into the room. */
export function wallFrame(side: WallSide, w: number, d: number): { pos: [number, number, number]; rotY: number; length: number; inward: [number, number] } {
  switch (side) {
    case 'back':
      return { pos: [0, 0, -d / 2 - WALL_T / 2], rotY: 0, length: w + WALL_T * 2, inward: [0, 1] };
    case 'front':
      return { pos: [0, 0, d / 2 + WALL_T / 2], rotY: Math.PI, length: w + WALL_T * 2, inward: [0, -1] };
    case 'left':
      return { pos: [-w / 2 - WALL_T / 2, 0, 0], rotY: Math.PI / 2, length: d, inward: [1, 0] };
    case 'right':
      return { pos: [w / 2 + WALL_T / 2, 0, 0], rotY: -Math.PI / 2, length: d, inward: [-1, 0] };
  }
}

/** World x/z along a wall → wall-local x. */
export function toWallX(side: WallSide, worldAlong: number): number {
  switch (side) {
    case 'back':
      return worldAlong;
    case 'front':
      return -worldAlong;
    case 'left':
      return -worldAlong;
    case 'right':
      return worldAlong;
  }
}

export function levelOpenings(level: FacilityLevelId, w: number, d: number, entranceX: number): Record<WallSide, Opening[]> {
  const o: Record<WallSide, Opening[]> = { back: [], front: [], left: [], right: [] };
  const fx = (x0: number, x1: number, y0: number, y1: number, kind: Opening['kind']): Opening => {
    const a = toWallX('front', x0);
    const b = toWallX('front', x1);
    return { x0: Math.min(a, b), x1: Math.max(a, b), y0, y1, kind };
  };
  switch (level) {
    case 'hobby_room':
      o.back.push({ x0: 0.85, x1: 1.85, y0: 0.95, y1: 2.15, kind: 'window' });
      o.right.push({ x0: toWallX('right', 1.45) - 0.45, x1: toWallX('right', 1.45) + 0.45, y0: 0, y1: 2.05, kind: 'door' });
      break;
    case 'specialty_shop':
      o.front.push(fx(entranceX - 0.8, entranceX + 0.8, 0, 2.35, 'door'));
      o.front.push(fx(-w / 2 + 0.5, -1.25, 0.55, 2.6, 'storefront'), fx(1.25, w / 2 - 0.5, 0.55, 2.6, 'storefront'));
      break;
    case 'aquarium_store':
      o.front.push(fx(entranceX - 1.2, entranceX + 1.2, 0, 2.7, 'door'));
      o.front.push(fx(-w / 2 + 0.6, -1.8, 0.6, 3.0, 'storefront'), fx(1.8, w / 2 - 0.6, 0.6, 3.0, 'storefront'));
      break;
    case 'showroom':
      o.front.push(fx(entranceX - 1.6, entranceX + 1.6, 0, 3.1, 'door'));
      break;
    case 'destination':
      o.front.push(fx(entranceX - 2.6, entranceX + 2.6, 0, 4.4, 'arch'));
      break;
    case 'grand_hall':
      o.front.push(fx(entranceX - 3.2, entranceX + 3.2, 0, 6.4, 'arch'));
      for (const side of ['left', 'right'] as const) for (const z of [-9, -2, 7.2]) {
        const c = toWallX(side, z);
        o[side].push({ x0: c - 1.2, x1: c + 1.2, y0: 3.4, y1: 8.0, kind: 'window' });
      }
      break;
  }
  return o;
}

// ───────────────────────────── materials ─────────────────────────────

interface RoomMaterials {
  floor: THREE.MeshPhysicalMaterial;
  wall: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  wainscot: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  dark: THREE.MeshStandardMaterial;
  ground: THREE.MeshBasicMaterial;
  nightGlass: THREE.MeshBasicMaterial;
  keys: string[];
}

function floorCanvas(s: RoomStyle['floor']): HTMLCanvasElement {
  switch (s.kind) {
    case 'planks':
      return woodPlanks({ base: s.base, seed: s.seed, planks: 13, rows: 2 });
    case 'terrazzo':
      return concrete(s.base, s.seed, true);
    case 'concrete':
      return concrete(s.base, s.seed, false);
    case 'stone':
      return stoneTiles(s.base, s.seed, { tiles: s.tiles ?? 2, vein: s.vein, inlay: s.inlay });
    case 'tiles':
      return tiles(s.base, s.seed, s.tiles ?? 4);
  }
}

function groundCanvas(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  const col = new THREE.Color(color);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.55, `rgba(${rgb},0.85)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

function nightGlassCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#0b1b33');
  g.addColorStop(0.6, '#15325a');
  g.addColorStop(1, '#27517a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  // mullions
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(30, 0, 4, 256);
  for (let y = 60; y < 256; y += 64) ctx.fillRect(0, y, 64, 3);
  return c;
}

function useRoomMaterials(level: FacilityLevelId, style: RoomStyle): RoomMaterials {
  const mats = useMemo(() => {
    const keys: string[] = [];
    const tex = (key: string, build: () => HTMLCanvasElement, opts?: { repeat?: boolean }) => {
      keys.push(key);
      return acquireTexture(key, build, opts);
    };
    const f = style.floor;
    const floorMap = tex(`floor:${level}`, () => floorCanvas(f));
    const floor = new THREE.MeshPhysicalMaterial({
      map: floorMap,
      roughness: f.roughness,
      metalness: 0,
      clearcoat: f.clearcoat ?? 0,
      clearcoatRoughness: 0.5,
      bumpMap: floorMap,
      bumpScale: 0.6,
    });
    const wallMap = tex(`wall:${level}`, () => plaster(style.wall.base, `wall-${level}`, style.wall.strength ?? 1));
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: style.wall.roughness });
    let accent = wall;
    if (style.accent) {
      const a = style.accent;
      const map = tex(`accent:${level}`, () => (a.kind === 'slats' ? woodSlats(a.base, `slats-${level}`) : plaster(a.base, `accent-${level}`, 0.5)));
      accent = new THREE.MeshStandardMaterial({ map, roughness: a.roughness, bumpMap: a.kind === 'slats' ? map : null, bumpScale: 1.5 });
    }
    const trim = new THREE.MeshStandardMaterial({ color: style.trim, roughness: 0.55 });
    const wainscot = new THREE.MeshStandardMaterial({ color: style.wainscot?.color ?? style.trim, roughness: 0.6 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(style.baseGlow ?? '#ffffff').multiplyScalar(1.4), toneMapped: false });
    const dark = new THREE.MeshStandardMaterial({ color: '#0e0f10', roughness: 0.8 });
    const groundMap = tex(`ground:${style.ground}`, () => groundCanvas(style.ground), { repeat: false });
    const ground = new THREE.MeshBasicMaterial({ map: groundMap, transparent: true, depthWrite: false });
    const nightMap = tex('nightglass', nightGlassCanvas);
    const nightGlass = new THREE.MeshBasicMaterial({ map: nightMap, toneMapped: true });
    return { floor, wall, accent, trim, wainscot, glow, dark, ground, nightGlass, keys };
  }, [level, style]);
  useEffect(
    () => () => {
      for (const k of mats.keys) releaseTexture(k);
      for (const m of [mats.floor, mats.wall, mats.accent, mats.trim, mats.wainscot, mats.glow, mats.dark, mats.ground, mats.nightGlass]) m.dispose();
    },
    [mats],
  );
  return mats;
}

// ───────────────────────────── walls ─────────────────────────────

interface WallGeoms {
  full: Map<string, THREE.BufferGeometry>;
  stub: Map<string, THREE.BufferGeometry>;
}

/** One raised panel moulding: a single bevelled ring (continuous profile, mitred corners), back face at z = 0. */
function panelFrame(pw: number, ph: number, fw: number, fd: number): THREE.BufferGeometry {
  const ox = pw / 2 + fw / 2;
  const oy = ph / 2 + fw / 2;
  const ix = pw / 2 - fw / 2;
  const iy = ph / 2 - fw / 2;
  const shape = new THREE.Shape([new THREE.Vector2(-ox, -oy), new THREE.Vector2(ox, -oy), new THREE.Vector2(ox, oy), new THREE.Vector2(-ox, oy)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-ix, -iy), new THREE.Vector2(-ix, iy), new THREE.Vector2(ix, iy), new THREE.Vector2(ix, -iy)]));
  const b = Math.min(0.005, fd * 0.35, fw * 0.3);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, fd - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 2, curveSegments: 1, steps: 1 });
  g.translate(0, 0, b);
  g.computeVertexNormals();
  return g;
}

function buildWall(style: RoomStyle, side: WallSide, length: number, height: number, openings: Opening[], accent: boolean): WallGeoms {
  const t = WALL_T;
  const full = new Batch();
  const stub = new Batch();
  const mainKey = accent ? 'accent' : 'wall';
  for (const g of wallWithOpenings(length, height, t, openings)) full.add(mainKey, g);
  // stub: low wall + cap so the cut-away still reads as architecture
  const stubH = Math.max(0.16, style.skirting + 0.05);
  const stubOpen = openings.filter((o) => o.y0 < stubH).map((o) => ({ ...o, y1: stubH + 1 }));
  for (const g of wallWithOpenings(length, stubH, t, stubOpen)) stub.add(mainKey, g);
  const inner = t / 2;
  // helpers to add horizontal runs that skip door-like openings at their height
  // `r` > 0 rounds the run's edges: a rounded profile shades as a soft gradient instead of collapsing into a
  // flickering one-pixel sliver when its top face is seen almost edge-on from eye height
  const run = (b: Batch, key: string, y: number, h: number, depth: number, zOff = 0, r = 0) => {
    const xs: [number, number][] = [[-length / 2, length / 2]];
    for (const o of openings) {
      if (o.y0 > y + h || o.y1 < y) continue;
      for (let i = xs.length - 1; i >= 0; i--) {
        const [a, c] = xs[i];
        if (o.x1 <= a || o.x0 >= c) continue;
        xs.splice(i, 1);
        if (o.x0 > a) xs.push([a, o.x0]);
        if (o.x1 < c) xs.push([o.x1, c]);
      }
    }
    for (const [a, c] of xs) if (c - a > 0.01) b.add(key, r > 0 ? rbox(c - a, h, depth, r, 2) : box(c - a, h, depth), [(a + c) / 2, y + h / 2, inner + depth / 2 + zOff]);
  };
  // skirting (both full and stub)
  for (const b of [full, stub]) {
    run(b, 'trim', 0, style.skirting, 0.018);
    run(b, 'trim', style.skirting - 0.016, 0.018, 0.028, -0.002, 0.006);
  }
  // wainscot: board, chair rail and panel frames. Mouldings are rounded and chunky enough (≥3 cm) to stay solid at
  // room distances; nothing is coplanar with another face (the rail and frames sink a hair into what they sit on).
  if (style.wainscot) {
    const wh = style.wainscot.height;
    run(full, 'wainscot', style.skirting, wh - style.skirting, 0.008);
    run(full, 'wainscot', wh - 0.032, 0.058, 0.036, -0.002, 0.014);
    // raised panel frames between rail and skirting
    const pw = 0.62;
    const ph = wh - style.skirting - 0.16;
    const fw = 0.034;
    const fd = 0.014;
    for (let x = -length / 2 + 0.2; x + pw <= length / 2 - 0.1; x += pw + 0.12) {
      const blocked = openings.some((o) => o.y0 < wh && x + pw > o.x0 - 0.05 && x < o.x1 + 0.05);
      if (blocked) continue;
      const cy = style.skirting + 0.08 + ph / 2;
      const cx = x + pw / 2;
      full.add('wainscot', panelFrame(pw, ph, fw, fd), [cx, cy, inner + 0.007]);
    }
  }
  // crown moulding
  if (style.crown) {
    run(full, 'trim', height - 0.09, 0.09, 0.03);
    run(full, 'trim', height - 0.13, 0.05, 0.016);
    run(full, 'trim', height - 0.03, 0.03, 0.055);
  }
  // wall cap (top edge) so the wall reads as solid from above
  full.add('dark', box(length, 0.012, t + 0.01), [0, height + 0.006, 0]);
  stub.add('dark', box(length, 0.012, t + 0.01), [0, stubH + 0.006, 0]);
  // opening trims (casings) and sills
  for (const o of openings) {
    const cw = o.kind === 'arch' ? 0.28 : o.kind === 'storefront' ? 0.06 : 0.07;
    const cd = o.kind === 'arch' ? 0.06 : 0.02;
    const key = o.kind === 'storefront' ? 'dark' : 'trim';
    const h = o.y1 - o.y0;
    full.add(key, box(cw, h + cw, cd), [o.x0 - cw / 2, o.y0 + h / 2 + cw / 2 - (o.y0 === 0 ? cw / 2 : 0), inner + cd / 2]);
    full.add(key, box(cw, h + cw, cd), [o.x1 + cw / 2, o.y0 + h / 2 + cw / 2 - (o.y0 === 0 ? cw / 2 : 0), inner + cd / 2]);
    full.add(key, box(o.x1 - o.x0 + cw * 2, cw, cd), [(o.x0 + o.x1) / 2, o.y1 + cw / 2, inner + cd / 2]);
    // reveal (the depth of the opening)
    full.add('trim', box(0.012, h, t), [o.x0 + 0.006, o.y0 + h / 2, 0]);
    full.add('trim', box(0.012, h, t), [o.x1 - 0.006, o.y0 + h / 2, 0]);
    full.add('trim', box(o.x1 - o.x0, 0.012, t), [(o.x0 + o.x1) / 2, o.y1 - 0.006, 0]);
    if (o.y0 > 0.01) {
      full.add('trim', box(o.x1 - o.x0 + 0.1, 0.03, t + 0.06), [(o.x0 + o.x1) / 2, o.y0 - 0.015, 0.03]);
    }
    if (o.kind === 'arch') {
      // keystone-like header block
      full.add('trim', box(0.6, 0.5, 0.08), [(o.x0 + o.x1) / 2, o.y1 + 0.3, inner + 0.04]);
    }
  }
  return { full: full.build(), stub: stub.build() };
}

function WallMeshes({ geoms, mats }: { geoms: Map<string, THREE.BufferGeometry>; mats: RoomMaterials }) {
  return (
    <>
      {[...geoms.entries()].map(([k, g]) => (
        <mesh key={k} geometry={g} material={(mats as unknown as Record<string, THREE.Material>)[k]} receiveShadow castShadow={k === 'wall' || k === 'accent'} />
      ))}
    </>
  );
}

const _v = new THREE.Vector3();

function Wall({ side, w, d, height, style, openings, mats, accent, cut }: { side: WallSide; w: number; d: number; height: number; style: RoomStyle; openings: Opening[]; mats: RoomMaterials; accent: boolean; cut: 'auto' | 'never' }) {
  const frame = wallFrame(side, w, d);
  const geoms = useMemo(() => buildWall(style, side, frame.length, height, openings, accent), [style, side, frame.length, height, openings, accent]);
  useEffect(
    () => () => {
      for (const g of geoms.full.values()) g.dispose();
      for (const g of geoms.stub.values()) g.dispose();
    },
    [geoms],
  );
  const fullRef = useRef<THREE.Group>(null);
  const stubRef = useRef<THREE.Group>(null);
  useEffect(() => {
    noPick(fullRef.current);
    noPick(stubRef.current);
  }, [geoms]);
  useFrame(({ camera }) => {
    if (!fullRef.current || !stubRef.current) return;
    let show = true;
    if (cut === 'auto') {
      _v.copy(camera.position);
      // inner face point
      const px = frame.pos[0] + frame.inward[0] * (WALL_T / 2);
      const pz = frame.pos[2] + frame.inward[1] * (WALL_T / 2);
      const s = (_v.x - px) * frame.inward[0] + (_v.z - pz) * frame.inward[1];
      show = s > 0.05 || _v.y < 0; // camera on the room side of this wall
    }
    fullRef.current.visible = show;
    stubRef.current.visible = !show;
  });
  return (
    <group position={frame.pos} rotation={[0, frame.rotY, 0]}>
      <group ref={fullRef}>
        <WallMeshes geoms={geoms.full} mats={mats} />
        {openings
          .filter((o) => o.kind === 'window' && style.baseGlow)
          .map((o, i) => (
            <mesh key={i} position={[(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, -0.02]} material={mats.nightGlass}>
              <planeGeometry args={[o.x1 - o.x0, o.y1 - o.y0]} />
            </mesh>
          ))}
        {style.baseGlow && (
          <mesh position={[0, 0.012, WALL_T / 2 + 0.03]} material={mats.glow}>
            <boxGeometry args={[frame.length - WALL_T * 2 - 0.1, 0.006, 0.012]} />
          </mesh>
        )}
      </group>
      <group ref={stubRef} visible={false}>
        <WallMeshes geoms={geoms.stub} mats={mats} />
      </group>
    </group>
  );
}

// ───────────────────────────── room ─────────────────────────────

export function RoomShell({ level, width, depth }: { level: FacilityLevelId; width: number; depth: number }) {
  const style = ROOM_STYLES[level];
  const def = getFacilityLevel(level);
  const mats = useRoomMaterials(level, style);
  const openings = useMemo(() => levelOpenings(level, width, depth, def.entrance.x), [level, width, depth, def.entrance.x]);
  const floorGeo = useMemo(() => floorPlane(width + WALL_T * 2, depth + WALL_T * 2, 1 / style.floor.repeatM), [width, depth, style.floor.repeatM]);
  useEffect(() => () => floorGeo.dispose(), [floorGeo]);
  const groundSize = Math.max(width, depth) * 3.2 + 12;
  const floorRef = useRef<THREE.Mesh>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    noPick(floorRef.current);
    noPick(groundRef.current);
  }, []);
  const H = def.wallHeight;
  return (
    <group name="facility-room">
      {style.fill && <hemisphereLight args={[style.fill[0], style.fill[1], style.fill[2]]} />}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={mats.ground} renderOrder={-2}>
        <planeGeometry args={[groundSize, groundSize]} />
      </mesh>
      <mesh ref={floorRef} geometry={floorGeo} material={mats.floor} receiveShadow />
      {(['back', 'left', 'right', 'front'] as WallSide[]).map((side) => (
        <Wall key={side} side={side} w={width} d={depth} height={H} style={style} openings={openings[side]} mats={mats} accent={side === 'back' && !!style.accent} cut={side === 'back' ? 'auto' : 'auto'} />
      ))}
    </group>
  );
}
