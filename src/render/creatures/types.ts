/**
 * Creature visual contract. OWNER: core. Lanes "fishart" and "critterart" implement factories.
 *
 * Factories are IMPERATIVE three.js (not React) so the same object can be used in the tank, in the facility view
 * (lod 2) and by the offscreen portrait renderer.
 *
 * Local space of `root`: head points +X, up +Y, the creature's standard length (the measure species.adultSizeCm
 * refers to — nose-to-tail for fish, head-to-tail-tip height for a seahorse) spans exactly 1 unit, origin at the
 * body's centre of mass. The caller scales root by sizeCm/100 and sets position/rotation from CreatureRuntime.
 */
import type * as THREE from 'three';
import type { Creature, CreatureRuntime, CreatureVisualParams, QualityLevel, SpeciesDefinition } from '@/types';
import type { TankFXUniforms } from '../shared/underwater';
import type { RenderLod } from '../lod';

export interface CreatureFactoryArgs {
  species: SpeciesDefinition;
  /** null for encyclopedia/market previews of a species' base look. */
  creature: Creature | null;
  appearance: CreatureVisualParams;
  lod: RenderLod;
  quality: QualityLevel;
  /** Per-tank underwater uniforms (caustics/fog). Use DEFAULT_TANK_FX outside tanks. */
  fx: TankFXUniforms;
}

export interface CreatureObject {
  root: THREE.Object3D;
  /** Update deformation/animation from runtime state. dt in seconds, time = elapsed seconds. */
  update(rt: CreatureRuntime, dt: number, time: number): void;
  /** Selection/hover outline or rim glow. */
  setHighlight?(on: boolean): void;
  /** Approximate pick radius in local units (1 = body length). */
  pickRadius?: number;
  /**
   * Optional (far tanks only): projected body length in screen pixels this frame. Implementations may drop
   * sub-pixel detail meshes (fins, eyes) to save draw calls; they must restore them when it grows again.
   */
  setScreenSize?(px: number): void;
  /**
   * Optional (hero tank, lod 0; lane:perf): projected body length in CSS pixels this frame. Implementations may swap
   * to a lower-resolution mesh of the SAME shape and materials while the creature is small on screen (it keeps every
   * part — only triangle density changes, below what a pixel can show). Must use hysteresis so it never flickers.
   */
  setDetailPx?(px: number): void;
  dispose(): void;
}

export type CreatureFactory = (args: CreatureFactoryArgs) => CreatureObject;
