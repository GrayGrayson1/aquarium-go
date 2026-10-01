/**
 * Tank backdrops: black vinyl, deep-blue gradient, frosted (back-lit) film, or a sculpted 3D rock wall inside the tank.
 * Flat backdrops sit outside the back pane (the water volume fogs them); the 3D rock wall sits inside the water and is
 * patched with caustics + fog like any decor.
 * OWNER: lane "waterfx".
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BackdropKind } from '@/types';
import type { TankDims } from '@/sim/tankSpace';
import { patchUnderwaterMaterial, type TankFXUniforms } from '../../shared/underwater';
import { GLSL_VALUE_NOISE } from '../../shared/glsl';
import type { RenderLod } from '../../lod';
import type { ShellGeom } from './Glass';

const noPick = () => null;

function flatBackdropMaterial(kind: 'black' | 'deep_blue' | 'frosted', fx: TankFXUniforms) {
  const k = kind === 'black' ? 0 : kind === 'deep_blue' ? 1 : 2;
  return new THREE.ShaderMaterial({
    uniforms: { uLightColor: fx.uLightColor, uDay: fx.uDay, uTime: fx.uTime, uWaterTint: fx.uWaterTint, uScatter: fx.uScatter, uParty: fx.uParty },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${GLSL_VALUE_NOISE}
      uniform vec3 uLightColor; uniform float uDay; uniform float uTime; uniform vec3 uWaterTint; uniform float uScatter; uniform float uParty;
      varying vec2 vUv;
      void main(){
        float lum = dot(uLightColor, vec3(0.3333));
        float grain = agVFbm(vUv * vec2(40.0, 24.0)) - 0.5;
        vec3 col;
        #if ${k} == 0
          // matte black vinyl with a faint top sheen from the fixture
          col = vec3(0.006, 0.007, 0.008) + vec3(0.012, 0.014, 0.016) * smoothstep(0.55, 1.0, vUv.y) * lum;
          col *= 1.0 + grain * 0.25;
          // clear, brightly lit freshwater seen against black vinyl: the lit water column glows in the tank's tint,
          // strongest high up under the fixture, falling to near-black at the substrate (marine keeps true black)
          {
            float glowK = clamp((uScatter - 1.0) / 2.2, 0.0, 1.0);
            float g = pow(smoothstep(0.08, 1.0, vUv.y), 1.25);
            float cx = 1.0 - 0.5 * pow(abs(vUv.x - 0.5) * 2.0, 2.2);
            col += uWaterTint * (0.03 + 0.34 * g) * cx * lum * glowK * (1.0 - 0.6 * uParty) * (1.0 + grain * 0.08);
          }
        #elif ${k} == 1
          // classic marine blue: lighter at the top, deep navy below
          vec3 top = vec3(0.07, 0.3, 0.62);
          vec3 bot = vec3(0.004, 0.02, 0.07);
          float g = pow(smoothstep(0.0, 1.0, vUv.y), 1.6);
          col = mix(bot, top, g) * (0.18 + 0.82 * lum);
          col *= 1.0 + grain * 0.12;
        #else
          // frosted film, back-lit by the room: soft luminous white-blue, brighter near the top
          vec3 top = vec3(0.62, 0.74, 0.8);
          vec3 bot = vec3(0.16, 0.22, 0.27);
          float g = smoothstep(-0.1, 1.05, vUv.y);
          col = mix(bot, top, g) * (0.2 + 0.55 * lum + 0.12);
          col *= 1.0 + grain * 0.06;
        #endif
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function seedFrom(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/**
 * Sculpted 3D rock background: a gently relieved base wall plus overlapping noise-displaced rock slabs flattened
 * against the back glass, merged into a single mesh with baked vertex colours (warm/cool stone, pale ridges, dark
 * crevices). Local space: x across, y up (centred), z out of the wall.
 */
function rockWallGeometry(L: number, H: number, depth: number, seed: number, detail: number) {
  let s = Math.floor(seed * 2147483646) + 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const noise = createNoise3D(rand);
  const warm = new THREE.Color('#6b6152');
  const cool = new THREE.Color('#545659');
  const pale = new THREE.Color('#9b917f');
  const deep = new THREE.Color('#1c1a18');
  const tmp = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];

  // base wall
  const segX = Math.max(16, Math.round(L * 60));
  const segY = Math.max(12, Math.round(H * 60));
  const base = new THREE.PlaneGeometry(L, H, segX, segY);
  {
    const pos = base.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const n = noise(x * 5, y * 5, 0.5) * 0.5 + 0.5;
      pos.setZ(i, n * depth * 0.28);
      tmp.copy(deep).lerp(cool, 0.35 + n * 0.3);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    base.setAttribute('color', new THREE.BufferAttribute(col, 3));
    base.deleteAttribute('uv');
    parts.push(base);
  }

  // rock slabs on a jittered grid, bigger toward the bottom
  const rows = Math.max(3, Math.round(H / 0.09));
  const v = new THREE.Vector3();
  for (let r = 0; r < rows; r++) {
    const fy = (r + 0.5) / rows;
    const cols = Math.max(3, Math.round(L / (0.1 + fy * 0.03)));
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.12) continue;
      const g0 = new THREE.IcosahedronGeometry(1, detail);
      g0.deleteAttribute('normal');
      g0.deleteAttribute('uv');
      const g = mergeVertices(g0);
      g0.dispose();
      const sx = (L / cols) * (0.55 + rand() * 0.5);
      const sy = (H / rows) * (0.5 + rand() * 0.55);
      const sz = depth * (0.35 + rand() * 0.6);
      const cx = -L / 2 + ((c + 0.5 + (rand() - 0.5) * 0.7) / cols) * L;
      const cy = -H / 2 + fy * H + (rand() - 0.5) * (H / rows) * 0.5;
      const tilt = (rand() - 0.5) * 0.5;
      const k = rand() * 10;
      const pos = g.attributes.position as THREE.BufferAttribute;
      const col = new Float32Array(pos.count * 3);
      const hue = rand();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // chunky fractured rock: ridged noise + slab flattening on the facing side
        const n = 1 + 0.22 * noise(v.x * 1.7 + k, v.y * 1.7, v.z * 1.7) + 0.1 * Math.abs(noise(v.x * 4.3, v.y * 4.3 + k, v.z * 4.3));
        v.multiplyScalar(n);
        if (v.z > 0.55) v.z = 0.55 + (v.z - 0.55) * 0.25; // flattened face
        const ct = Math.cos(tilt);
        const st = Math.sin(tilt);
        const x = (v.x * ct - v.y * st) * sx;
        const y = (v.x * st + v.y * ct) * sy;
        const z = Math.max(0, (v.z * 0.5 + 0.5)) * sz;
        pos.setXYZ(i, cx + x, cy + y, z);
        const ridge = Math.max(0, Math.min(1, v.z * 0.8 + noise(v.x * 6, v.y * 6, k) * 0.25));
        tmp.copy(cool).lerp(warm, hue).lerp(pale, ridge * 0.45);
        tmp.lerp(deep, Math.max(0, 0.35 - v.z * 0.5));
        col.set([tmp.r, tmp.g, tmp.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      // keep inside the wall footprint
      parts.push(g);
    }
  }
  const clean = parts.map((p) => {
    const q = p.index ? p.toNonIndexed() : p.clone();
    for (const name of Object.keys(q.attributes)) if (name !== 'position' && name !== 'color') q.deleteAttribute(name);
    return q;
  });
  const merged = mergeGeometries(clean, false);
  clean.forEach((p) => p.dispose());
  parts.forEach((p) => p.dispose());
  const out = mergeVertices(merged ?? new THREE.BufferGeometry(), 1e-5);
  merged?.dispose();
  // clamp to the tank interior
  const pos = out.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, Math.max(-L / 2, Math.min(L / 2, pos.getX(i))));
    pos.setY(i, Math.max(-H / 2, Math.min(H / 2, pos.getY(i))));
  }
  out.computeVertexNormals();
  return out;
}

interface RockWallEntry {
  wall: string;
  detail: number;
  geo: THREE.BufferGeometry;
  refs: number;
}
/** Built rock walls, by wall (tank + size) and detail. */
const rockWalls = new Map<string, RockWallEntry>();
/** Walls nobody draws right now, oldest first; kept for the next view switch (a big wall takes 0.1–0.3 s to build). */
const idleWalls: RockWallEntry[] = [];
const IDLE_WALLS = 3;

/**
 * lane:tankrender — rock walls are cached and shared: a tank ↔ room flight (lod 0 ↔ 1) or a hero change used to
 * rebuild the wall synchronously every time. A wall built at a higher detail serves lower-detail requests too.
 */
function acquireRockWall(L: number, H: number, depth: number, tankId: string, detail: number): RockWallEntry {
  const wall = `${tankId}|${L.toFixed(4)}|${H.toFixed(4)}|${depth.toFixed(4)}`;
  let best: RockWallEntry | undefined;
  for (const e of rockWalls.values()) if (e.wall === wall && e.detail >= detail && (!best || e.detail < best.detail)) best = e;
  if (!best) {
    best = { wall, detail, geo: rockWallGeometry(L, H, depth, seedFrom(tankId), detail), refs: 0 };
    rockWalls.set(`${wall}|${detail}`, best);
  }
  if (best.refs++ === 0) {
    const i = idleWalls.indexOf(best);
    if (i >= 0) idleWalls.splice(i, 1);
  }
  return best;
}

function releaseRockWall(e: RockWallEntry): void {
  if (--e.refs > 0) return;
  idleWalls.push(e);
  while (idleWalls.length > IDLE_WALLS) {
    const old = idleWalls.shift()!;
    rockWalls.delete(`${old.wall}|${old.detail}`);
    old.geo.dispose();
  }
}

export function Backdrop({ kind, d, sg, fx, lod, tankId }: { kind: BackdropKind; d: TankDims; sg: ShellGeom; fx: TankFXUniforms; lod: RenderLod; tankId: string }) {
  const flatKind = kind === 'black' || kind === 'deep_blue' || kind === 'frosted' ? kind : kind === 'rock_3d' ? 'black' : null;
  const flatMat = useMemo(() => (flatKind ? flatBackdropMaterial(flatKind, fx) : null), [flatKind, fx]);
  useEffect(() => () => flatMat?.dispose(), [flatMat]);

  const rock = kind === 'rock_3d';
  const rockDepth = Math.min(0.1, Math.max(0.035, d.W * 0.2));
  const rockWall = useMemo(() => (rock ? acquireRockWall(d.L - 0.002, d.H - 0.004, rockDepth, tankId, lod === 0 ? 3 : 1) : null), [rock, d.L, d.H, rockDepth, tankId, lod]);
  useEffect(
    () => () => {
      if (rockWall) releaseRockWall(rockWall);
    },
    [rockWall],
  );
  const rockGeo = rockWall?.geo ?? null;
  const rockMat = useMemo(() => {
    if (!rock) return null;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    patchUnderwaterMaterial(m, fx);
    return m;
  }, [rock, fx]);
  useEffect(() => () => rockMat?.dispose(), [rockMat]);

  const z = -d.W / 2 - sg.g - 0.0015;
  return (
    <group>
      {flatMat && (
        <mesh position={[0, d.H / 2 - sg.g / 2, z]} material={flatMat} raycast={noPick} userData={{ noPick: true }}>
          <planeGeometry args={[d.L + 2 * sg.g, d.H + sg.g]} />
        </mesh>
      )}
      {rockGeo && rockMat && (
        <mesh geometry={rockGeo} material={rockMat} position={[0, d.H / 2, -d.W / 2 + 0.0015]} receiveShadow castShadow={lod === 0} raycast={noPick} userData={{ noPick: true }} />
      )}
    </group>
  );
}
