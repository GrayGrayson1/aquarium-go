/**
 * The ceramic plug under a coral frag (lane "frags"). A fixed-size real-world object (~2 cm cap): it does not scale
 * with the coral's growth, so a fresh frag reads as "small coral on a plug" and a grown-out colony encrusts over it.
 * Uses the tank's shared solid decor material (underwater-patched, vertex colours) and one cached geometry.
 */
import type * as THREE from 'three';
import type { DecorDef, DecorInstance } from '@/types';
import { isCoralDef } from '@/data/catalog/propagation';
import { fragPlugGeometry, PLUG_CAP_H } from './gen/fragRack';

/** The plug's base sits a hair above the frag's base height (epiphyte bases are tucked into the surface). */
const PLUG_BASE_LIFT = 0.003;
/** How far the coral is raised so it sits on the cap. */
export const FRAG_PLUG_LIFT = PLUG_BASE_LIFT + PLUG_CAP_H * 0.85;

export function hasFragPlug(inst: DecorInstance, def: DecorDef): boolean {
  return !!inst.frag && isCoralDef(def);
}

export function FragPlug({ inst, material, hidden }: { inst: DecorInstance; material: THREE.Material; hidden?: boolean }) {
  return <mesh geometry={fragPlugGeometry(0)} material={material} position={[inst.x, inst.y + PLUG_BASE_LIFT, inst.z]} rotation={[0, inst.rotY, 0]} visible={!hidden} receiveShadow name={`frag-plug:${inst.id}`} />;
}
