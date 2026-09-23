/**
 * Runtime (per-frame, non-persisted) registry for creatures, food particles, visual events and pointer.
 * OWNER: lane "behavior" (AI). Renderers READ; AI WRITES.
 *
 * Conventions for renderers (see also src/types/runtime.ts):
 *  - Orientation: `object.rotation.set(rt.roll, rt.yaw, rt.pitch, 'YZX')` — yaw about +Y (0 = head toward +X,
 *    positive yaw turns the head toward −Z), then pitch nose-up about the body's Z, then roll about the body's X.
 *    `applyRuntimeTransform()` below does exactly this (plus position + uniform scale = lengthM).
 *  - `bend` > 0 while turning toward the fish's left (yaw increasing).
 *  - `colorIntensity`: ~0.85 is the creature's normal resting colour, 1 = full display brilliance,
 *    ≤0.5 = washed out by stress/illness/night.
 *  - `swimPhase` advances with tail-beat (or leg-gait) frequency; drive undulation amplitude from `speedBL`.
 */
import * as THREE from 'three';
import type { CreatureRuntime, FoodParticle, VisualEvent, PointerState } from '@/types';

export const runtime = {
  /** creatureId -> runtime state (only for creatures in tanks being animated). */
  creatures: new Map<string, CreatureRuntime>(),
  /** tankId -> live food particles. */
  food: new Map<string, FoodParticle[]>(),
  /** Recent visual events (ring buffer, newest last). */
  events: [] as VisualEvent[],
  pointer: { active: false, tankId: null, local: [0, 0, 0], lastMoveT: 0, taps: [] } as PointerState,
  /** Monotonic frame counter written by the AI loop. */
  frame: 0,
};

export function getCreatureRuntime(id: string): CreatureRuntime | undefined {
  return runtime.creatures.get(id);
}

export function pushVisualEvent(e: VisualEvent): void {
  runtime.events.push(e);
  if (runtime.events.length > 64) runtime.events.splice(0, runtime.events.length - 64);
}

/** Events newer than `sinceT` (seconds, performance.now()/1000) for a tank. */
export function recentEvents(tankId: string, sinceT: number): VisualEvent[] {
  return runtime.events.filter((e) => e.tankId === tankId && e.t >= sinceT);
}

/** Runtime creatures currently in a tank (allocates — call sparingly, not per frame per creature). */
export function tankCreatureRuntimes(tankId: string): CreatureRuntime[] {
  const out: CreatureRuntime[] = [];
  for (const rt of runtime.creatures.values()) if (rt.tankId === tankId) out.push(rt);
  return out;
}

/** Apply a runtime's position, orientation and scale to a tank-local Object3D (the canonical convention). */
export function applyRuntimeTransform(obj: THREE.Object3D, rt: CreatureRuntime): void {
  obj.position.copy(rt.pos);
  obj.rotation.set(rt.roll, rt.yaw, rt.pitch, 'YZX');
  obj.scale.setScalar(rt.lengthM);
  obj.visible = rt.visible;
}

/** Unit forward (head) direction of a runtime in tank-local space, written into `out`. */
export function runtimeForward(rt: CreatureRuntime, out: THREE.Vector3): THREE.Vector3 {
  const cp = Math.cos(rt.pitch);
  return out.set(cp * Math.cos(rt.yaw), Math.sin(rt.pitch), -cp * Math.sin(rt.yaw));
}

/** Current time base shared by AI/events (seconds). */
export const nowSeconds = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
