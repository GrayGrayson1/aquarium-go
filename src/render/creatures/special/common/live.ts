/**
 * Read-only helpers that let imperative critter visuals peek at live game/runtime state without allocations
 * in the hot path (throttled lookups). OWNER: lane "critterart".
 */
import type { CreatureRuntime } from '@/types';
import { useGame } from '@/state/game';
import { runtime } from '@/runtime/tankRuntime';
import { tankDims } from '@/sim/tankSpace';

interface TankInfo {
  substrateY: number;
  waterY: number;
  L: number;
  W: number;
  t: number;
}
const tankCache = new Map<string, TankInfo>();

/** Substrate/water heights of a tank (cached ~2 s). Returns null when unknown (previews). */
export function tankInfo(tankId: string | null | undefined, now: number): TankInfo | null {
  if (!tankId) return null;
  const c = tankCache.get(tankId);
  if (c && now - c.t < 2) return c;
  const tank = useGame.getState().game?.tanks[tankId];
  if (!tank) return c ?? null;
  const d = tankDims(tank);
  const info = c ?? { substrateY: 0, waterY: 0, L: 0, W: 0, t: 0 };
  info.substrateY = d.substrateY;
  info.waterY = d.waterY;
  info.L = d.L;
  info.W = d.W;
  info.t = now;
  tankCache.set(tankId, info);
  return info;
}

interface ReproInfo {
  stage: string;
  sex: string;
  /** 0..1 progress through the current stage (pregnancy swell, berried development) — lane breeding. */
  progress: number;
  t: number;
}
const reproCache = new Map<string, ReproInfo>();

/** Live repro stage + sex of a creature (cached ~1 s). */
export function reproInfo(creatureId: string | undefined, now: number): ReproInfo | null {
  if (!creatureId) return null;
  const c = reproCache.get(creatureId);
  if (c && now - c.t < 1) return c;
  const cr = useGame.getState().game?.creatures[creatureId];
  if (!cr) return c ?? null;
  const info = c ?? { stage: 'idle', sex: 'unknown', progress: 0, t: 0 };
  info.stage = cr.repro?.stage ?? 'idle';
  info.progress = Math.max(0, Math.min(1, cr.repro?.progress ?? 0));
  info.sex = cr.sex;
  info.t = now;
  reproCache.set(creatureId, info);
  return info;
}

/**
 * Pointer position (tank-local) expressed in the creature's heading frame, in body lengths:
 * returns false when the pointer is not over this creature's tank. out = [forward, up, side(+z = left of heading)].
 */
export function pointerInCreatureFrame(rt: CreatureRuntime, out: [number, number, number]): boolean {
  const p = runtime.pointer;
  if (!p.active || p.tankId !== rt.tankId) return false;
  const dx = p.local[0] - rt.pos.x;
  const dy = p.local[1] - rt.pos.y;
  const dz = p.local[2] - rt.pos.z;
  const c = Math.cos(rt.yaw);
  const s = Math.sin(rt.yaw);
  const L = Math.max(0.005, rt.lengthM);
  // yaw 0 faces +X; rotating by -yaw about +Y
  out[0] = (dx * c - dz * s) / L;
  out[1] = dy / L;
  out[2] = (dx * s + dz * c) / L;
  return true;
}

/** Newest visual event of a kind for a creature since `sinceT` (no allocation). */
export function latestEvent(kind: string, creatureId: string, sinceT: number): number {
  const ev = runtime.events;
  for (let i = ev.length - 1; i >= 0; i--) {
    const e = ev[i];
    if (e.t < sinceT) break;
    if (e.kind === kind && e.creatureId === creatureId) return e.t;
  }
  return -1;
}
