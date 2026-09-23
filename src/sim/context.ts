/** Simulation context passed to every subsystem step. OWNER: core. */
import type { GameEvent, GameState } from '@/types';
import { simRng, type Rng } from './rng';
import { nextId } from './ids';

export type SimLod = 'full' | 'reduced' | 'summary';

export interface SimContext {
  rng: Rng;
  /** Game hour at the START of this step. */
  hour: number;
  /** Hours covered by this step (may be > 1 for reduced/summary LOD — substep internally if needed). */
  dt: number;
  lod: SimLod;
  emit: (e: Omit<GameEvent, 'id' | 'hour'>) => void;
}

export const LOG_CAP = 300;

export function emitEvent(state: GameState, e: Omit<GameEvent, 'id' | 'hour'>, hour = state.clock.hour): GameEvent {
  const ev: GameEvent = { ...e, id: nextId(state, 'ev'), hour };
  state.log.push(ev);
  if (state.log.length > LOG_CAP) state.log.splice(0, state.log.length - LOG_CAP);
  return ev;
}

export function makeContext(state: GameState, dt: number, lod: SimLod = 'full'): SimContext {
  return {
    rng: simRng(state),
    hour: state.clock.hour,
    dt,
    lod,
    emit: (e) => {
      emitEvent(state, e);
    },
  };
}
