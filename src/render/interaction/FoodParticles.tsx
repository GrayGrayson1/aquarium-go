/**
 * Visible food particles (flakes, pellets, worms, mysis, live snails, copepods, wafers). OWNER: lane "behavior".
 * One InstancedMesh per food shape, fed from runtime.food (written by the AI step). Colours come from the food defs.
 * Flakes tumble as they sink, floating food rides the surface film, worms wriggle, copepods glint.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FoodParticle, Tank } from '@/types';
import type { RenderLod } from '../lod';
import { runtime } from '@/runtime/tankRuntime';
import { patchUnderwaterMaterial, useTankFX, type TankFXUniforms } from '../shared/underwater';

type Shape = NonNullable<FoodParticle['shape']>;
const SHAPES: Shape[] = ['flake', 'pellet', 'worm', 'chunk', 'snail', 'mote', 'wafer'];
const MAX = 256;

// deterministic jitter for procedural geometry
function jitter(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Unit-size geometry per shape (the particle's size scales it). */
function buildGeometry(shape: Shape): THREE.BufferGeometry {
  const r = jitter(shape.length * 7919);
  switch (shape) {
    case 'flake': {
      // thin, torn, slightly cupped flake
      const g = new THREE.CircleGeometry(0.5, 9);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 1; i < p.count; i++) {
        const k = 0.65 + r() * 0.5;
        p.setXY(i, p.getX(i) * k, p.getY(i) * k * (0.75 + r() * 0.2));
      }
      g.rotateX(-Math.PI / 2);
      const q = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < q.count; i++) {
        const x = q.getX(i);
        const z = q.getZ(i);
        q.setY(i, (x * x + z * z) * 0.35 + (r() - 0.5) * 0.04);
      }
      g.computeVertexNormals();
      return g;
    }
    case 'pellet':
    case 'mote': {
      const g = new THREE.IcosahedronGeometry(0.5, shape === 'mote' ? 0 : 1);
      const p = g.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        // lumpy, but coincident vertices must move together
        const n = Math.sin(v.x * 12.9 + v.y * 7.1) * Math.cos(v.z * 9.3 + v.x * 3.7);
        v.multiplyScalar(1 + n * 0.08);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return g;
    }
    case 'worm': {
      // tapered, gently curved segment along +X (length 1)
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        pts.push(new THREE.Vector3(t - 0.5, Math.sin(t * Math.PI) * 0.08, Math.sin(t * Math.PI * 2) * 0.04));
      }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.045, 6, false);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const taper = 0.55 + 0.45 * Math.cos(x * Math.PI);
        const cy = Math.sin((x + 0.5) * Math.PI) * 0.08;
        const cz = Math.sin((x + 0.5) * Math.PI * 2) * 0.04;
        p.setY(i, cy + (p.getY(i) - cy) * taper);
        p.setZ(i, cz + (p.getZ(i) - cz) * taper);
      }
      g.computeVertexNormals();
      return g;
    }
    case 'chunk': {
      // mysis / brine shrimp: slim curved body with a hint of segments
      const g = new THREE.SphereGeometry(0.5, 10, 6);
      g.scale(1, 0.32, 0.3);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        p.setY(i, p.getY(i) * (1 + Math.sin(x * 40) * 0.06) + x * x * 0.35);
      }
      g.computeVertexNormals();
      return g;
    }
    case 'snail': {
      // tiny conical, slightly twisted shell
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push(new THREE.Vector2(Math.sin(t * Math.PI * 0.95) * 0.42 * (1 - t * 0.55) + 0.02, t * 0.8 - 0.35));
      }
      const g = new THREE.LatheGeometry(pts, 12);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const a = (y + 0.35) * 2.2;
        const x = p.getX(i);
        const z = p.getZ(i);
        p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a) * 0.3, y, z * Math.cos(a) + x * Math.sin(a) * 0.3);
      }
      g.rotateZ(-Math.PI / 2.6);
      g.computeVertexNormals();
      return g;
    }
    case 'wafer':
    default: {
      const g = new THREE.CylinderGeometry(0.5, 0.48, 0.16, 16, 1);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        p.setY(i, p.getY(i) + Math.sin(x * 9 + z * 7) * 0.012);
      }
      g.computeVertexNormals();
      return g;
    }
  }
}

function buildMaterial(shape: Shape, fx: TankFXUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: shape === 'pellet' || shape === 'wafer' ? 0.75 : shape === 'snail' ? 0.45 : 0.6,
    metalness: 0,
    transparent: shape === 'chunk' || shape === 'mote' || shape === 'flake',
    opacity: shape === 'chunk' ? 0.88 : shape === 'mote' ? 0.9 : 0.97,
    side: shape === 'flake' ? THREE.DoubleSide : THREE.FrontSide,
    emissive: shape === 'mote' ? new THREE.Color('#403a30') : new THREE.Color('#000000'),
  });
  patchUnderwaterMaterial(m, fx);
  // make the underwater patch aware of instancing (world position per instance)
  const prev = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (shader, renderer) => {
    prev(shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(/vec4 agWp = modelMatrix \* vec4\(transformed, 1\.0\);/, '#ifdef USE_INSTANCING\n  vec4 agWp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);\n#else\n  vec4 agWp = modelMatrix * vec4(transformed, 1.0);\n#endif')
      .replace(
        /vAgWorldNormal = normalize\(mat3\(modelMatrix\) \* vec3\(normal\)\);/,
        '#ifdef USE_INSTANCING\n  vAgWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(normal));\n#else\n  vAgWorldNormal = normalize(mat3(modelMatrix) * vec3(normal));\n#endif',
      );
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${prevKey()}|ag-food-inst`;
  return m;
}

const colorCache = new Map<string, THREE.Color>();
function colorOf(hex: string): THREE.Color {
  let c = colorCache.get(hex);
  if (!c) {
    c = new THREE.Color(hex);
    colorCache.set(hex, c);
  }
  return c;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export function FoodParticles({ tank, lod }: { tank: Tank; lod: RenderLod }) {
  const fx = useTankFX();
  const meshes = useMemo(() => {
    const out = {} as Record<Shape, THREE.InstancedMesh>;
    for (const shape of SHAPES) {
      const mesh = new THREE.InstancedMesh(buildGeometry(shape), buildMaterial(shape, fx), MAX);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, _c.set('#ffffff'));
      mesh.name = `food:${shape}`;
      out[shape] = mesh;
    }
    return out;
  }, [fx]);
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    for (const s of SHAPES) g.add(meshes[s]);
    return () => {
      for (const s of SHAPES) {
        g.remove(meshes[s]);
        meshes[s].geometry.dispose();
        (meshes[s].material as THREE.Material).dispose();
        meshes[s].dispose();
      }
    };
  }, [meshes]);

  const counts = useRef<Record<Shape, number>>({ flake: 0, pellet: 0, worm: 0, chunk: 0, snail: 0, mote: 0, wafer: 0 });

  useFrame(({ clock }) => {
    const list = runtime.food.get(tank.id);
    const cnt = counts.current;
    for (const s of SHAPES) cnt[s] = 0;
    if (list && list.length && lod <= 1) {
      const t = clock.elapsedTime;
      for (const p of list) {
        const shape = (p.shape ?? 'pellet') as Shape;
        const mesh = meshes[shape];
        const i = cnt[shape];
        if (i >= MAX) continue;
        const fade = Math.min(1, Math.max(0, p.fade ?? 0));
        // tiny pellets / motes get a slight readability boost (they are 1–2 mm in reality)
        const boost = shape === 'pellet' || shape === 'mote' ? 1.35 : 1;
        const size = (p.size ?? 0.003) * boost * (1 - fade) * Math.max(0.35, Math.min(1, p.amount + 0.35));
        if (size <= 1e-5) continue;
        const seed = p.seed ?? 0.5;
        // orientation by shape & motion
        if (shape === 'flake') {
          if (p.motion === 'float' || p.settled) _e.set(Math.sin(seed * 40) * 0.08, seed * 6.28, Math.cos(seed * 30) * 0.08);
          else _e.set(Math.sin(t * 2.4 + seed * 20) * 0.9, seed * 6.28 + t * 0.6, Math.cos(t * 1.9 + seed * 13) * 0.7); // tumbling
        } else if (shape === 'worm') {
          const wr = p.motion === 'wriggle' ? 0.9 : 0.25;
          _e.set(seed * 3 + Math.sin(t * 5 + seed * 9) * wr * 0.4, seed * 6.28 + Math.sin(t * 3.2 + seed * 7) * wr, p.settled ? 0 : Math.sin(t * 1.3 + seed) * 0.4);
        } else if (shape === 'snail') {
          const vx = p.vel.x;
          const vz = p.vel.z;
          _e.set(0, Math.hypot(vx, vz) > 1e-5 ? Math.atan2(-vz, vx) : seed * 6.28, 0);
        } else if (shape === 'mote') {
          _e.set(t * 3 + seed * 10, t * 2 + seed * 5, 0);
        } else if (shape === 'chunk') {
          _e.set(Math.sin(t * 0.8 + seed * 9) * 0.5, seed * 6.28 + (p.settled ? 0 : t * 0.4), Math.sin(t * 1.1 + seed * 3) * 0.3);
        } else {
          _e.set(seed * 5, seed * 9 + (p.settled || p.motion === 'float' ? 0 : t * 0.7), seed * 3);
        }
        _q.setFromEuler(_e);
        const glint = shape === 'mote' ? 1 + 0.25 * Math.sin(t * 9 + seed * 50) : 1;
        _s.setScalar(size * glint);
        _m.compose(p.pos, _q, _s);
        mesh.setMatrixAt(i, _m);
        // colour: soaked/settled food darkens slightly; fading food dims
        _c.copy(colorOf(p.color));
        if (p.settled && p.age > 20) _c.multiplyScalar(0.8);
        mesh.setColorAt(i, _c);
        cnt[shape] = i + 1;
      }
    }
    for (const s of SHAPES) {
      const mesh = meshes[s];
      const n = cnt[s];
      if (mesh.count !== n || n > 0) {
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      mesh.visible = n > 0;
    }
  });

  return <group ref={group} name={`food-particles:${tank.id}`} />;
}
