/**
 * Manual mode (DESIGN-S3D §7.7, §9.7; AUTO-036). OWNER: lane "automation" (chunk 5).
 *
 * Hold all stops five systems: water changes, salt mixing, live food (no starts, harvests or doses; cultures keep
 * growing), Autofeeders (keepers feed on their rounds) and production lines (no breeding moves, sorting or listings).
 * Filters, heaters, lights, Auto Top-Offs, keepers' rounds and auctions already listed never stop; the stock manager's
 * orders have their own switch (`staff.ordersOff`). Held jobs are skipped, not queued: on resume each system carries on
 * at its next scheduled time. A leaf module (types and the settler only), so the water, care and production steps can
 * read it. Every change first catches the background tanks up (ADR-0026 decision 5, the chunk 5 review): a tank owing
 * hours would otherwise run them under the new setting, giving a meal that fell due while held after Resume, or
 * skipping one that fell due before Hold.
 */
import type { GameState, HoldSystem } from '@/types';
import { settleTanks } from '../settle';

export const HOLD_SYSTEMS: readonly HoldSystem[] = ['water', 'salt', 'food', 'feeders', 'lines'];

/** Is this system on hold? */
export function isHeld(state: GameState, sys: HoldSystem): boolean {
  return state.automation?.hold?.[sys] === true;
}

/** The systems on hold, in the design's order. */
export function heldSystems(state: GameState): HoldSystem[] {
  return HOLD_SYSTEMS.filter((s) => isHeld(state, s));
}

/** Manual mode is on while any system is held. */
export function manualModeOn(state: GameState): boolean {
  return heldSystems(state).length > 0;
}

/** Game hour manual mode began (null when it's off). */
export function manualSince(state: GameState): number | null {
  const since = state.automation?.hold?.since;
  return manualModeOn(state) && typeof since === 'number' && Number.isFinite(since) ? since : null;
}

function holdState(state: GameState) {
  const a = (state.automation ??= {});
  return (a.hold ??= {});
}

/** Hold all: every system at once (immediate, no confirm). */
export function holdAll(state: GameState): void {
  settleTanks(state, state.tankOrder);
  const h = holdState(state);
  if (!manualModeOn(state)) h.since = state.clock.hour;
  for (const s of HOLD_SYSTEMS) h[s] = true;
}

/** Resume all: manual mode ends. */
export function resumeAll(state: GameState): void {
  if (!state.automation?.hold) return;
  settleTanks(state, state.tankOrder);
  delete state.automation.hold;
}

/** Hold or resume one system; resuming the last held system turns manual mode off. */
export function setHold(state: GameState, sys: HoldSystem, on: boolean): void {
  if (isHeld(state, sys) === on) return;
  settleTanks(state, state.tankOrder);
  if (on) {
    const h = holdState(state);
    if (!manualModeOn(state)) h.since = state.clock.hour;
    h[sys] = true;
    return;
  }
  const h = state.automation?.hold;
  if (!h) return;
  delete h[sys];
  if (!manualModeOn(state)) delete state.automation!.hold;
}
