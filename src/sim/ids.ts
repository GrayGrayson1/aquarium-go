/** Deterministic id generation stored in state. OWNER: core. */
import type { GameState } from '@/types';

export function nextId(state: GameState, prefix: string): string {
  state.idCounter += 1;
  return `${prefix}_${state.idCounter.toString(36)}`;
}
