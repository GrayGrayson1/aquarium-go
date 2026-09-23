/**
 * Stands per tier.standStyle: wooden desk, modern cabinet (doors + handles), steel rack with sump, built-in
 * cabinetry with a toe-kick LED, and a dark stone plinth with a brass plaque. Procedural wood/stone/metal surfaces.
 * Tank-local space: the room floor is at y = -standHeight(tier).
 * OWNER: lane "waterfx".
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { TankTier } from '@/types';
import { standHeight, type TankDims } from '@/sim/tankSpace';
import type { RenderLod } from '../../lod';
import { getSurfaceMaterial, type SurfaceOptions } from './materials';
import type { ShellGeom } from './Glass';
import { Plaque } from './Plaque';

const noPick = () => null;
const NP = { noPick: true };

const M = {
  walnutH: { kind: 'wood', color: '#5e3f2a', color2: '#3b2618', roughness: 0.48, grainAxis: 0, clearcoat: 0.25, bump: 1 } as SurfaceOptions,
  walnutV: { kind: 'wood', color: '#5e3f2a', color2: '#3b2618', roughness: 0.48, grainAxis: 1, clearcoat: 0.25, bump: 1 } as SurfaceOptions,
  oakH: { kind: 'wood', color: '#8d6a4a', color2: '#5c412b', roughness: 0.55, grainAxis: 0, clearcoat: 0.15, bump: 1 } as SurfaceOptions,
  oakV: { kind: 'wood', color: '#8d6a4a', color2: '#5c412b', roughness: 0.55, grainAxis: 1, clearcoat: 0.15, bump: 1 } as SurfaceOptions,
  smokedH: { kind: 'wood', color: '#56463a', color2: '#2a201a', roughness: 0.5, grainAxis: 0, clearcoat: 0.2, bump: 1 } as SurfaceOptions,
  smokedV: { kind: 'wood', color: '#56463a', color2: '#2a201a', roughness: 0.5, grainAxis: 1, clearcoat: 0.2, bump: 1 } as SurfaceOptions,
  charcoal: { kind: 'plain', color: '#1a1b1e', roughness: 0.62 } as SurfaceOptions,
  satin: { kind: 'plain', color: '#232427', roughness: 0.42, clearcoat: 0.15 } as SurfaceOptions,
  paintedDark: { kind: 'plain', color: '#2b2824', roughness: 0.5, clearcoat: 0.1 } as SurfaceOptions,
  black: { kind: 'plain', color: '#0b0b0c', roughness: 0.7 } as SurfaceOptions,
  steel: { kind: 'plain', color: '#1d1e21', roughness: 0.5, metalness: 0.55 } as SurfaceOptions,
  brass: { kind: 'brushed', color: '#b8904f', roughness: 0.3, metalness: 1, envIntensity: 1.3 } as SurfaceOptions,
  // a plaque faces the dark room: fully metallic it mirrors black, so keep it part-diffuse to catch the tank's spill
  plaque: { kind: 'brushed', color: '#c9a263', roughness: 0.42, metalness: 0.55, envIntensity: 1.5 } as SurfaceOptions,
  chrome: { kind: 'brushed', color: '#b9bec4', roughness: 0.25, metalness: 1, envIntensity: 1.3 } as SurfaceOptions,
  basalt: { kind: 'stone', color: '#4a4845', color2: '#232222', roughness: 0.7, scale: 1, bump: 1.5 } as SurfaceOptions,
  quartz: { kind: 'stone', color: '#d9d6d0', color2: '#a9a49b', roughness: 0.28, scale: 1.4, clearcoat: 0.4, bump: 0.5 } as SurfaceOptions,
  ply: { kind: 'wood', color: '#c9a77a', color2: '#9a7a52', roughness: 0.7, grainAxis: 0, bump: 0.6 } as SurfaceOptions,
};

type MatKey = keyof typeof M;

interface Part {
  pos: [number, number, number];
  size: [number, number, number];
  mat: MatKey;
  shape?: 'box' | 'rbox' | 'taper';
  rot?: [number, number, number];
  emissive?: string;
}

function partGeometry(p: Part): THREE.BufferGeometry {
  const [w, h, d] = p.size;
  if (p.shape === 'rbox') return new RoundedBoxGeometry(w, h, d, 2, Math.min(0.012, Math.min(w, h, d) * 0.3));
  if (p.shape === 'taper') {
    const g = new THREE.CylinderGeometry(w * 0.7071, w * 0.45, h, 4, 1);
    g.rotateY(Math.PI / 4);
    return g;
  }
  return new THREE.BoxGeometry(w, h, d);
}

function buildParts(style: TankTier['standStyle'], d: TankDims, sg: ShellGeom, SH: number, lod: RenderLod): Part[] {
  const top = sg.bottomY; // stand top (tank-local)
  const floor = -SH;
  const H = top - floor;
  const fw = sg.outerL;
  const fd = sg.outerW;
  const P: Part[] = [];
  const detail = lod < 2;
  switch (style) {
    case 'desk': {
      const W = Math.max(fw + 0.22, 0.72);
      const D = Math.max(fd + 0.16, 0.44);
      const t = 0.03;
      P.push({ pos: [0, top - t / 2, 0], size: [W, t, D], mat: 'oakH', shape: detail ? 'rbox' : 'box' });
      const legH = H - t;
      const lx = W / 2 - 0.05;
      const lz = D / 2 - 0.05;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ pos: [sx * lx, floor + legH / 2, sz * lz], size: [0.045, legH, 0.045], mat: 'oakV', shape: detail ? 'taper' : 'box' });
      if (detail) {
        const ah = 0.075;
        const ay = top - t - ah / 2;
        P.push({ pos: [0, ay, lz], size: [2 * lx - 0.03, ah, 0.02], mat: 'oakH' });
        P.push({ pos: [0, ay, -lz], size: [2 * lx - 0.03, ah, 0.02], mat: 'oakH' });
        P.push({ pos: [lx, ay, 0], size: [0.02, ah, 2 * lz - 0.03], mat: 'oakH' });
        P.push({ pos: [-lx, ay, 0], size: [0.02, ah, 2 * lz - 0.03], mat: 'oakH' });
        // drawer front + knob
        P.push({ pos: [0, ay, lz + 0.013], size: [Math.min(0.42, W * 0.5), ah - 0.014, 0.012], mat: 'oakH' });
        P.push({ pos: [0, ay, lz + 0.026], size: [0.03, 0.012, 0.014], mat: 'brass' });
        // lower stretcher shelf
        P.push({ pos: [0, floor + 0.16, 0], size: [2 * lx - 0.02, 0.018, 2 * lz - 0.02], mat: 'oakH' });
      }
      break;
    }
    case 'cabinet': {
      const W = fw + 0.02;
      const D = fd + 0.02;
      const slab = 0.028;
      const kick = 0.065;
      P.push({ pos: [0, top - slab / 2, 0], size: [W + 0.01, slab, D + 0.01], mat: 'walnutH', shape: detail ? 'rbox' : 'box' });
      const bodyH = H - slab - kick;
      const by = floor + kick + bodyH / 2;
      P.push({ pos: [0, by, -0.004], size: [W, bodyH, D - 0.008], mat: 'satin' });
      P.push({ pos: [0, floor + kick / 2, -0.02], size: [W - 0.04, kick, D - 0.05], mat: 'black' });
      if (detail) {
        const n = W > 1.6 ? 4 : W > 1.1 ? 3 : 2;
        const gap = 0.003;
        const dw = (W - 0.02 - gap * (n - 1)) / n;
        const dh = bodyH - 0.016;
        for (let i = 0; i < n; i++) {
          const x = -W / 2 + 0.01 + dw / 2 + i * (dw + gap);
          P.push({ pos: [x, by, D / 2 + 0.006], size: [dw, dh, 0.018], mat: 'satin' });
          // handles near the meeting stiles: pairs face each other
          const pairLeft = i % 2 === 0;
          const hx = x + (pairLeft ? dw / 2 - 0.035 : -dw / 2 + 0.035);
          const hh = Math.min(0.16, dh * 0.3);
          const hy = by + dh / 2 - hh / 2 - 0.05;
          P.push({ pos: [hx, hy, D / 2 + 0.024], size: [0.01, hh, 0.01], mat: 'brass' });
          P.push({ pos: [hx, hy + hh / 2 - 0.01, D / 2 + 0.018], size: [0.008, 0.008, 0.014], mat: 'brass' });
          P.push({ pos: [hx, hy - hh / 2 + 0.01, D / 2 + 0.018], size: [0.008, 0.008, 0.014], mat: 'brass' });
        }
      }
      break;
    }
    case 'rack': {
      const W = fw + 0.03;
      const D = fd + 0.03;
      const s = 0.035;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ pos: [sx * (W / 2 - s / 2), floor + H / 2, sz * (D / 2 - s / 2)], size: [s, H, s], mat: 'steel' });
      const rails = (y: number) => {
        P.push({ pos: [0, y, D / 2 - s / 2], size: [W - 2 * s, s, s], mat: 'steel' });
        P.push({ pos: [0, y, -D / 2 + s / 2], size: [W - 2 * s, s, s], mat: 'steel' });
        P.push({ pos: [W / 2 - s / 2, y, 0], size: [s, s, D - 2 * s], mat: 'steel' });
        P.push({ pos: [-W / 2 + s / 2, y, 0], size: [s, s, D - 2 * s], mat: 'steel' });
      };
      rails(top - s / 2);
      rails(floor + 0.1);
      if (detail) {
        P.push({ pos: [0, top - 0.004, 0], size: [W - 0.004, 0.008, D - 0.004], mat: 'ply' });
        P.push({ pos: [0, floor + 0.1 + s / 2 + 0.009, 0], size: [W - 2 * s, 0.018, D - 2 * s], mat: 'ply' });
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ pos: [sx * (W / 2 - s / 2), floor + 0.008, sz * (D / 2 - s / 2)], size: [0.03, 0.016, 0.03], mat: 'chrome' });
      }
      break;
    }
    case 'built_in': {
      const W = fw + 0.12;
      const D = fd + 0.08;
      const slab = 0.03;
      const kick = 0.08;
      P.push({ pos: [0, top - slab / 2, 0.01], size: [W + 0.02, slab, D + 0.02], mat: 'quartz', shape: detail ? 'rbox' : 'box' });
      const bodyH = H - slab - kick;
      const by = floor + kick + bodyH / 2;
      P.push({ pos: [0, by, 0], size: [W, bodyH, D], mat: 'paintedDark' });
      P.push({ pos: [0, floor + kick / 2, -0.03], size: [W - 0.02, kick, D - 0.06], mat: 'black' });
      if (detail) {
        const n = Math.max(3, Math.round(W / 0.55));
        const gap = 0.004;
        const dw = (W - 0.02 - gap * (n - 1)) / n;
        const dh = bodyH - 0.02;
        for (let i = 0; i < n; i++) {
          const x = -W / 2 + 0.01 + dw / 2 + i * (dw + gap);
          P.push({ pos: [x, by, D / 2 + 0.005], size: [dw, dh, 0.012], mat: 'smokedV' });
          // slim horizontal edge pull along the top of each door
          P.push({ pos: [x, by + dh / 2 - 0.012, D / 2 + 0.013], size: [dw * 0.55, 0.008, 0.008], mat: 'brass' });
        }
        // toe-kick LED strip (warm glow on the floor)
        P.push({ pos: [0, floor + 0.012, D / 2 - 0.03], size: [W - 0.06, 0.006, 0.006], mat: 'black', emissive: '#ffcf8a' });
      }
      break;
    }
    case 'plinth': {
      const W = fw + 0.16;
      const D = fd + 0.16;
      const base = 0.07;
      P.push({ pos: [0, floor + base + (H - base) / 2, 0], size: [W, H - base, D], mat: 'basalt', shape: detail ? 'rbox' : 'box' });
      P.push({ pos: [0, floor + base / 2, 0], size: [W - 0.06, base, D - 0.06], mat: 'black' });
      if (detail) {
        // (the engraved brass plaque is drawn by <Plaque> at plinthPlaque(); lane:qa-visual) + a thin brass inlay line
        P.push({ pos: [0, top - 0.018, D / 2 + 0.0015], size: [W - 0.04, 0.004, 0.004], mat: 'brass' });
      }
      break;
    }
  }
  return P;
}

/** lane:qa-visual — where the exhibit plaque sits on a plinth stand (tank-local), and its size (w, h metres). */
function plinthPlaque(sg: ShellGeom, SH: number): { pos: [number, number, number]; size: [number, number] } {
  const top = sg.bottomY;
  const floor = -SH;
  const H = top - floor;
  const W = sg.outerL + 0.16;
  const D = sg.outerW + 0.16;
  const base = 0.07;
  const w = Math.min(0.5, W * 0.22);
  const h = Math.min(0.13, (H - base) * 0.34, w * 0.3);
  return { pos: [0, floor + base + (H - base) * 0.56, D / 2 + 0.002], size: [w, h] };
}

const emissiveCache = new Map<string, THREE.MeshBasicMaterial>();
function emissiveMat(c: string) {
  let m = emissiveCache.get(c);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3), toneMapped: true });
    emissiveCache.set(c, m);
  }
  return m;
}

export function Stand({ tier, d, sg, lod, detail, tankId, tankName }: { tier: TankTier; d: TankDims; sg: ShellGeom; lod: RenderLod; detail: boolean; tankId?: string; tankName?: string }) {
  const SH = standHeight(tier.id);
  const parts = useMemo(() => {
    const all = buildParts(tier.standStyle, d, sg, SH, lod);
    // far tanks: a couple of solid masses read as the stand (desk/rack legs collapse into one block)
    if (lod === 2 && (tier.standStyle === 'desk' || tier.standStyle === 'rack')) {
      const top = all[0];
      const h = SH + sg.bottomY;
      return [top, { pos: [0, -SH + h / 2 - 0.02, 0], size: [top.size[0] * 0.9, h - 0.04, top.size[2] * 0.9], mat: top.mat } as Part];
    }
    return all;
  }, [tier.standStyle, d, sg, SH, lod]);
  const geos = useMemo(() => parts.map(partGeometry), [parts]);
  // geometries are owned by this component; free them when the part list changes/unmounts
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  const shadows = lod === 0;
  const plaque = tier.standStyle === 'plinth' && lod < 2 ? plinthPlaque(sg, SH) : null;
  return (
    <group>
      {plaque && <Plaque tankId={tankId ?? ''} title={tankName ?? ''} position={plaque.pos} size={plaque.size} />}
      {parts.map((p, i) => (
        <mesh
          key={i}
          geometry={geos[i]}
          material={p.emissive ? emissiveMat(p.emissive) : getSurfaceMaterial(M[p.mat], detail && lod < 2)}
          position={p.pos}
          rotation={p.rot}
          castShadow={shadows && !p.emissive}
          receiveShadow={shadows}
          raycast={noPick}
          userData={NP}
        />
      ))}
    </group>
  );
}
