/**
 * Glass panes (per-tier thickness), rims/trim, silicone seams and the glass lid.
 * Glass: fresnel reflection of the procedural room environment composited over near-full transparency, bright green
 * light-piped edges on the thickness. Acrylic/panoramic tiers get thicker, bevelled, clear-edged panes and no plastic rims.
 * OWNER: lane "waterfx".
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { TankTier } from '@/types';
import type { TankDims } from '@/sim/tankSpace';
import { patchUnderwaterMaterial, type TankFXUniforms } from '../../shared/underwater';
import type { RenderLod } from '../../lod';
import { createGlassMaterial, createTrimMaterial, getSurfaceMaterial } from './materials';

const noPick = () => null;
const NP = { noPick: true };

export interface ShellGeom {
  /** Glass thickness (m). */
  g: number;
  /** Plastic rim present. */
  rim: boolean;
  rimH: number;
  /** Rim overhang beyond the glass outer face. */
  rimOut: number;
  /** Rim lip inside the glass inner face. */
  rimIn: number;
  bevel: number;
  kind: TankTier['material'];
  /** Outer footprint (x, z) including rims. */
  outerL: number;
  outerW: number;
  /** Lowest point of the tank structure (tank-local y). */
  bottomY: number;
  /** Highest point of the tank structure excluding the lid (tank-local y). */
  topY: number;
}

export function shellGeom(d: TankDims, tier: TankTier): ShellGeom {
  const g = Math.max(0.004, d.glass);
  const kind = tier.material;
  const rim = kind === 'glass';
  const rimH = rim ? Math.min(0.03, 0.013 + d.H * 0.01) : 0;
  const rimOut = rim ? 0.0025 : 0;
  const rimIn = rim ? Math.min(0.016, 0.007 + d.L * 0.004) : 0;
  const bevel = kind === 'glass' ? 0 : Math.min(g * 0.35, 0.008);
  const outerL = d.L + 2 * g + 2 * rimOut;
  const outerW = d.W + 2 * g + 2 * rimOut;
  const bottomY = -g - (rim ? 0.004 : kind === 'panoramic' ? 0.02 : 0);
  const topY = d.H + (rim ? rimH * 0.4 : kind === 'acrylic' ? g : 0);
  return { g, rim, rimH, rimOut, rimIn, bevel, kind, outerL, outerW, bottomY, topY };
}

function paneGeometry(w: number, h: number, t: number, bevel: number): THREE.BufferGeometry {
  if (bevel > 0.0005) return new RoundedBoxGeometry(w, h, t, 2, Math.min(bevel, t * 0.49));
  return new THREE.BoxGeometry(w, h, t);
}

interface PaneSpec {
  key: string;
  w: number;
  h: number;
  pos: [number, number, number];
  rot: [number, number, number];
}

export function GlassBox({ d, tier, fx, lod, sg, backdropTone, floorTone }: { d: TankDims; tier: TankTier; fx: TankFXUniforms; lod: RenderLod; sg: ShellGeom; backdropTone?: string; floorTone?: string }) {
  const { g, bevel, kind } = sg;
  const glassMat = useMemo(() => {
    const clear = kind !== 'glass';
    return createGlassMaterial(fx, {
      tint: clear ? '#e8f4f6' : '#d9efe6',
      edgeTint: kind === 'acrylic' ? '#bfe3ee' : kind === 'panoramic' ? '#9ee0d4' : '#6cc3a2',
      bodyAlpha: lod === 2 ? 0.05 : 0.035,
      edgeAlpha: clear ? 0.5 : 0.72,
      specGain: 1.25,
      envIntensity: 1,
      backdropTone,
      floorTone,
      floorY: d.substrateY,
    });
  }, [fx, kind, lod, backdropTone, floorTone, d.substrateY]);
  useEffect(() => () => glassMat.dispose(), [glassMat]);

  const panes: PaneSpec[] = useMemo(() => {
    const L = d.L;
    const W = d.W;
    const H = d.H;
    return [
      { key: 'front', w: L + 2 * g, h: H, pos: [0, H / 2, W / 2 + g / 2], rot: [0, 0, 0] },
      { key: 'back', w: L + 2 * g, h: H, pos: [0, H / 2, -W / 2 - g / 2], rot: [0, Math.PI, 0] },
      { key: 'left', w: W, h: H, pos: [-L / 2 - g / 2, H / 2, 0], rot: [0, -Math.PI / 2, 0] },
      { key: 'right', w: W, h: H, pos: [L / 2 + g / 2, H / 2, 0], rot: [0, Math.PI / 2, 0] },
      { key: 'bottom', w: L + 2 * g, h: W + 2 * g, pos: [0, -g / 2, 0], rot: [-Math.PI / 2, 0, 0] },
    ];
  }, [d.L, d.W, d.H, g]);

  const geos = useMemo(() => panes.map((p) => paneGeometry(p.w, p.h, g, bevel)), [panes, g, bevel]);
  useEffect(() => () => geos.forEach((x) => x.dispose()), [geos]);

  return (
    <group>
      {panes.map((p, i) => (
        <mesh key={p.key} geometry={geos[i]} material={glassMat} position={p.pos} rotation={p.rot} raycast={noPick} userData={NP} />
      ))}
    </group>
  );
}

/** LOD 2: the whole glass box as ONE draw with a cheap unlit tinted material (far tanks in a facility). */
const cheapGlassMats = new Map<string, THREE.MeshBasicMaterial>();
export function CheapGlass({ d, sg }: { d: TankDims; sg: ShellGeom }) {
  const key = sg.kind;
  let mat = cheapGlassMats.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color: sg.kind === 'glass' ? '#cfeee2' : '#e2f2f6', transparent: true, opacity: 0.07, depthWrite: false });
    cheapGlassMats.set(key, mat);
  }
  return (
    <mesh position={[0, (d.H - sg.g) / 2, 0]} material={mat} raycast={noPick} userData={NP}>
      <boxGeometry args={[d.L + 2 * sg.g, d.H + sg.g, d.W + 2 * sg.g]} />
    </mesh>
  );
}

/** Black plastic rims (standard glass tanks), acrylic top brace, or a brushed-steel base trim (panoramic). */
export function Trim({ d, sg, lod }: { d: TankDims; sg: ShellGeom; lod: RenderLod }) {
  const trimMat = useMemo(() => createTrimMaterial(), []);
  useEffect(() => () => trimMat.dispose(), [trimMat]);
  const steel = getSurfaceMaterial({ kind: 'brushed', color: '#9aa0a6', roughness: 0.32, metalness: 1, envIntensity: 1.2 }, lod < 2);
  const { g, rimH, rimOut, rimIn, kind } = sg;
  const bars: { pos: [number, number, number]; size: [number, number, number]; mat: THREE.Material }[] = [];
  const L = d.L;
  const W = d.W;
  const H = d.H;
  if (kind === 'glass') {
    const outL = L + 2 * g + 2 * rimOut;
    const outW = W + 2 * g + 2 * rimOut;
    const band = g + rimOut + rimIn; // width of the rim band
    const yTop = H - rimH * 0.6 + rimH / 2;
    // top rim: front/back full length, sides between
    bars.push({ pos: [0, yTop, W / 2 + g + rimOut - band / 2], size: [outL, rimH, band], mat: trimMat });
    bars.push({ pos: [0, yTop, -(W / 2 + g + rimOut - band / 2)], size: [outL, rimH, band], mat: trimMat });
    bars.push({ pos: [L / 2 + g + rimOut - band / 2, yTop, 0], size: [band, rimH, outW - 2 * band], mat: trimMat });
    bars.push({ pos: [-(L / 2 + g + rimOut - band / 2), yTop, 0], size: [band, rimH, outW - 2 * band], mat: trimMat });
    if (L > 0.85 && lod < 2) bars.push({ pos: [0, yTop, 0], size: [Math.min(0.05, L * 0.04), rimH * 0.7, W], mat: trimMat });
    // bottom rim (front + back only at LOD 2)
    const bh = rimH * 0.9;
    const yb = -g - 0.004 + bh / 2;
    const bandB = g + rimOut + 0.002;
    bars.push({ pos: [0, yb, W / 2 + g + rimOut - bandB / 2], size: [outL, bh, bandB], mat: trimMat });
    bars.push({ pos: [0, yb, -(W / 2 + g + rimOut - bandB / 2)], size: [outL, bh, bandB], mat: trimMat });
    if (lod < 2) {
      bars.push({ pos: [L / 2 + g + rimOut - bandB / 2, yb, 0], size: [bandB, bh, outW - 2 * bandB], mat: trimMat });
      bars.push({ pos: [-(L / 2 + g + rimOut - bandB / 2), yb, 0], size: [bandB, bh, outW - 2 * bandB], mat: trimMat });
    }
  } else if (kind === 'acrylic') {
    // acrylic top brace: black perimeter frame (acrylic tanks are closed on top with access cut-outs)
    const t = g * 0.8;
    const band = Math.min(0.09, W * 0.16);
    const y = H + t / 2;
    bars.push({ pos: [0, y, W / 2 + g - band / 2], size: [L + 2 * g, t, band], mat: trimMat });
    bars.push({ pos: [0, y, -(W / 2 + g - band / 2)], size: [L + 2 * g, t, band], mat: trimMat });
    bars.push({ pos: [L / 2 + g - band / 2, y, 0], size: [band, t, W + 2 * g - 2 * band], mat: trimMat });
    bars.push({ pos: [-(L / 2 + g - band / 2), y, 0], size: [band, t, W + 2 * g - 2 * band], mat: trimMat });
    const n = Math.max(1, Math.round(L / 1.2));
    for (let i = 1; i < n + 1; i++) {
      const x = -L / 2 + (i * L) / (n + 1);
      bars.push({ pos: [x, y, 0], size: [band * 0.7, t, W], mat: trimMat });
    }
  } else {
    // panoramic: slim brushed-steel base band
    const h = 0.02;
    bars.push({ pos: [0, -g - h / 2 + 0.004, 0], size: [L + 2 * g + 0.006, h, W + 2 * g + 0.006], mat: steel });
  }
  return (
    <group>
      {bars.map((b, i) => (
        <mesh key={i} position={b.pos} material={b.mat} raycast={noPick} userData={NP} castShadow={lod === 0} receiveShadow={lod === 0}>
          <boxGeometry args={b.size} />
        </mesh>
      ))}
    </group>
  );
}

/** Silicone beads along the inner vertical corners and bottom edges (glass tanks only). */
export function Silicone({ d, sg, fx }: { d: TankDims; sg: ShellGeom; fx: TankFXUniforms }) {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#0a0b0c', roughness: 0.42, metalness: 0 });
    patchUnderwaterMaterial(m, fx);
    m.userData.mergeSafe = true; // lane:perf2 — world-space patch only (see shared/staticMerge.ts)
    return m;
  }, [fx]);
  useEffect(() => () => mat.dispose(), [mat]);
  if (sg.kind !== 'glass') return null;
  const s = Math.min(0.009, Math.max(0.0045, sg.g * 0.9));
  const r = s * 0.5; // half embedded
  const L = d.L;
  const W = d.W;
  const H = d.H - sg.rimH * 0.6;
  const q = Math.PI / 4;
  const beads: { pos: [number, number, number]; size: [number, number, number]; rot: [number, number, number] }[] = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) beads.push({ pos: [sx * (L / 2 - r * 0.15), H / 2, sz * (W / 2 - r * 0.15)], size: [s, H, s], rot: [0, q, 0] });
  for (const sz of [-1, 1]) beads.push({ pos: [0, 0, sz * (W / 2 - r * 0.15)], size: [L, s, s], rot: [q, 0, 0] });
  for (const sx of [-1, 1]) beads.push({ pos: [sx * (L / 2 - r * 0.15), 0, 0], size: [s, s, W], rot: [0, 0, q] });
  return (
    <group>
      {beads.map((b, i) => (
        <mesh key={i} position={b.pos} rotation={b.rot} material={mat} raycast={noPick} userData={NP}>
          <boxGeometry args={b.size} />
        </mesh>
      ))}
    </group>
  );
}

/** Split glass lid (drawn when `lid` equipment such as `lid_glass` is installed) resting on the rim / top brace. */
export function Lid({ d, sg, fx, lod }: { d: TankDims; sg: ShellGeom; fx: TankFXUniforms; lod: RenderLod }) {
  const glassMat = useMemo(
    () => createGlassMaterial(fx, { tint: '#e0f2ea', edgeTint: '#6fd6ae', bodyAlpha: 0.03, edgeAlpha: 0.8, specGain: 0.9, fogThroughWater: false }),
    [fx],
  );
  const trimMat = useMemo(() => createTrimMaterial('#101113', 0.45), []);
  useEffect(() => () => glassMat.dispose(), [glassMat]);
  useEffect(() => () => trimMat.dispose(), [trimMat]);
  if (lod === 2) return null;
  const t = 0.004;
  const y = sg.topY + t / 2 + 0.0005;
  const lw = d.L - 0.01;
  const halfW = (d.W - 0.012) / 2;
  const hinge = 0.012;
  return (
    <group>
      {/* back half (fixed) and front half (hinged) */}
      <mesh position={[0, y, -halfW / 2 - hinge / 4]} rotation={[-Math.PI / 2, 0, 0]} material={glassMat} raycast={noPick} userData={NP}>
        <boxGeometry args={[lw, halfW - hinge / 2, t]} />
      </mesh>
      <mesh position={[0, y, halfW / 2 + hinge / 4]} rotation={[-Math.PI / 2, 0, 0]} material={glassMat} raycast={noPick} userData={NP}>
        <boxGeometry args={[lw, halfW - hinge / 2, t]} />
      </mesh>
      <mesh position={[0, y + 0.001, 0]} material={trimMat} raycast={noPick} userData={NP}>
        <boxGeometry args={[lw, t * 1.6, hinge]} />
      </mesh>
      <mesh position={[0, y + t, d.W / 2 - 0.03]} material={trimMat} raycast={noPick} userData={NP}>
        <boxGeometry args={[Math.min(0.08, d.L * 0.12), 0.006, 0.014]} />
      </mesh>
    </group>
  );
}
