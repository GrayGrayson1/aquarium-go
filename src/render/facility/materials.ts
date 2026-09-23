/**
 * Shared prop materials for facility furniture (ref-counted per mounted room). OWNER: lane "facility".
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { acquireTexture, releaseTexture, fabric, plaster, woodPlanks, concrete } from './textures';

export interface PropMaterials {
  oak: THREE.MeshStandardMaterial;
  walnut: THREE.MeshStandardMaterial;
  smoked: THREE.MeshStandardMaterial;
  paint: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  blackMetal: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  velvet: THREE.MeshStandardMaterial;
  pillow: THREE.MeshStandardMaterial;
  linen: THREE.MeshStandardMaterial;
  curtain: THREE.MeshStandardMaterial;
  shade: THREE.MeshStandardMaterial;
  bulb: THREE.MeshBasicMaterial;
  terracotta: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  quartz: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  book: THREE.MeshStandardMaterial;
  screen: THREE.MeshBasicMaterial;
  rubber: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  marble: THREE.MeshStandardMaterial;
  keys: string[];
}

export function usePropMaterials(): PropMaterials {
  const mats = useMemo<PropMaterials>(() => {
    const keys: string[] = [];
    const tex = (key: string, build: () => HTMLCanvasElement) => {
      keys.push(key);
      return acquireTexture(key, build);
    };
    const oakMap = tex('prop:oak', () => woodPlanks({ base: '#a87a4f', seed: 'prop-oak', planks: 4, rows: 1, variation: 0.12 }));
    const walnutMap = tex('prop:walnut', () => woodPlanks({ base: '#5a3a24', seed: 'prop-walnut', planks: 4, rows: 1, variation: 0.1 }));
    const velvetMap = tex('prop:velvet', () => fabric('#2d5a5a', 'velvet', 2));
    const linenMap = tex('prop:linen', () => fabric('#cdbd9f', 'linen', 1));
    const curtainMap = tex('prop:curtain', () => fabric('#a3a98f', 'curtain', 1));
    const pillowMap = tex('prop:pillow', () => fabric('#c9824f', 'pillow', 2));
    const terraMap = tex('prop:terracotta', () => plaster('#b0613f', 'terracotta', 1.6));
    const concMap = tex('prop:concrete', () => concrete('#8e8b85', 'prop-concrete'));
    const marbleMap = tex('prop:marble', () => plaster('#a39886', 'prop-marble', 0.7));
    const m = {
      oak: new THREE.MeshStandardMaterial({ map: oakMap, roughness: 0.55 }),
      walnut: new THREE.MeshStandardMaterial({ map: walnutMap, roughness: 0.5 }),
      smoked: new THREE.MeshStandardMaterial({ color: '#3b2d23', roughness: 0.45, map: walnutMap }),
      paint: new THREE.MeshStandardMaterial({ color: '#ebe5d7', roughness: 0.6 }),
      brass: new THREE.MeshStandardMaterial({ color: '#c9a05a', roughness: 0.32, metalness: 1 }),
      blackMetal: new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.45, metalness: 0.7 }),
      steel: new THREE.MeshStandardMaterial({ color: '#9aa1a8', roughness: 0.35, metalness: 0.9 }),
      velvet: new THREE.MeshStandardMaterial({ map: velvetMap, roughness: 0.92 }),
      pillow: new THREE.MeshStandardMaterial({ map: pillowMap, roughness: 0.95 }),
      linen: new THREE.MeshStandardMaterial({ map: linenMap, roughness: 0.95 }),
      curtain: new THREE.MeshStandardMaterial({ map: curtainMap, roughness: 0.96, side: THREE.DoubleSide }),
      shade: new THREE.MeshStandardMaterial({ map: linenMap, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color('#ffb869'), emissiveIntensity: 0.55 }),
      bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1d6').multiplyScalar(2.2), toneMapped: false }),
      terracotta: new THREE.MeshStandardMaterial({ map: terraMap, roughness: 0.85 }),
      soil: new THREE.MeshStandardMaterial({ color: '#2b2119', roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#2f5a2c', roughness: 0.55, side: THREE.DoubleSide }),
      leafLight: new THREE.MeshStandardMaterial({ color: '#4d7a3a', roughness: 0.55, side: THREE.DoubleSide }),
      ceramic: new THREE.MeshStandardMaterial({ color: '#e9e4da', roughness: 0.3 }),
      concrete: new THREE.MeshStandardMaterial({ map: concMap, roughness: 0.85 }),
      quartz: new THREE.MeshStandardMaterial({ color: '#e6e1d8', roughness: 0.25 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6ea', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false }),
      book: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }),
      screen: new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fe6e0').multiplyScalar(0.9) }),
      rubber: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
      stone: new THREE.MeshStandardMaterial({ color: '#3a3733', roughness: 0.6 }),
      marble: new THREE.MeshStandardMaterial({ map: marbleMap, roughness: 0.42 }),
      keys,
    };
    return m;
  }, []);
  useEffect(
    () => () => {
      for (const k of mats.keys) releaseTexture(k);
      for (const [k, v] of Object.entries(mats)) if (k !== 'keys') (v as THREE.Material).dispose();
    },
    [mats],
  );
  return mats;
}

export function matByKey(m: PropMaterials, key: string): THREE.Material {
  return (m as unknown as Record<string, THREE.Material>)[key] ?? m.paint;
}
