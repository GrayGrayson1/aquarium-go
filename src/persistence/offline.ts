/**
 * Offline progress + resume. OWNER: lane "core".
 *
 * When a save is loaded, the real time since `lastTickRealMs` is converted at 1× speed
 * (GAME_HOURS_PER_REAL_SECOND) and capped at OFFLINE_CAP_HOURS, then simulated in chunks under a
 * **maintenance grace period**: `state.offlineGrace = true` is set for the duration of the catch-up and removed after.
 *
 * Contract for sim lanes while `state.offlineGrace` is true (see the field doc in src/types/game.ts):
 *   - lifecycle: never set a creature's status to 'dead'; floor health at GRACE_HEALTH_FLOOR; treat creatures as
 *     receiving minimal rations (hunger ≤ GRACE_MAX_HUNGER) without consuming inventory food.
 *   - breeding: may progress, but should not cull adults; clutch losses should be no worse than normal.
 *   - water/care: equipment should not fail.
 * Core ALSO enforces a safety net after every chunk (revives any creature that died in the chunk, floors health,
 * caps hunger, caps ammonia/nitrite at a WATCH level and tops off evaporation), so the promise
 * "you never come back to a dead tank" holds even if a lane ignores the flag.
 *
 * A paused game (speed 0 when saved) does not accumulate offline time.
 */
import { create } from 'zustand';
import type { GameEvent, GameState } from '@/types';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { emitEvent } from '@/sim/context';
import { touchResidents } from '@/sim/residents'; // lane:perf2
import { GAME_HOURS_PER_REAL_SECOND, OFFLINE_CAP_HOURS, formatDuration } from '@/sim/time';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { loadGameDetailed, latestSaveSlot } from './slots';
import type { LoadResult } from './types';

export const GRACE_HEALTH_FLOOR = 20;
export const GRACE_MAX_HUNGER = 60;
/** Toxin ceiling during grace (a WATCH level, never lethal). */
export const GRACE_MAX_TOXIN_PPM = 0.5;
/** Game hours simulated per catch-up chunk. */
export const OFFLINE_CHUNK_HOURS = 1;
/** Below this many game hours no catch-up / summary happens (≈ 1 real minute). */
export const OFFLINE_MIN_HOURS = 0.1;

export interface OfflineSummary {
  /** Game hours actually simulated. */
  hours: number;
  /** Game hours the real absence was worth before the cap. */
  uncappedHours: number;
  capped: boolean;
  realElapsedMs: number;
  startHour: number;
  endHour: number;
  moneyBefore: number;
  moneyAfter: number;
  moneyDelta: number;
  births: number;
  newClutches: number;
  bidsReceived: number;
  sales: number;
  /** Deaths the grace safety net had to undo (0 when every lane honours `offlineGrace`). */
  deathsPrevented: number;
  /** Notable log events from the catch-up (newest last). */
  highlights: GameEvent[];
  /** One-line text shown in the toast / log. */
  text: string;
}

/** Convert real elapsed time into offline game hours (1× rate, capped). */
export function offlineHoursFor(realElapsedMs: number, capHours = OFFLINE_CAP_HOURS): { hours: number; uncapped: number } {
  const uncapped = Math.max(0, realElapsedMs / 1000) * GAME_HOURS_PER_REAL_SECOND;
  return { hours: Math.min(capHours, uncapped), uncapped };
}

function aliveIds(state: GameState): string[] {
  const out: string[] = [];
  for (const c of Object.values(state.creatures)) if (c.status === 'alive' || c.status === 'listed') out.push(c.id);
  return out;
}

/** Apply the grace floor to every living creature and the water (safety net; idempotent). */
function graceFloor(state: GameState): void {
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    if (!(c.stats.health >= GRACE_HEALTH_FLOOR)) c.stats.health = GRACE_HEALTH_FLOOR;
    if (!(c.stats.hunger <= GRACE_MAX_HUNGER)) c.stats.hunger = GRACE_MAX_HUNGER;
  }
  for (const id of state.tankOrder) {
    const w = state.tanks[id]?.water;
    if (!w) continue;
    if (!(w.ammonia <= GRACE_MAX_TOXIN_PPM)) w.ammonia = GRACE_MAX_TOXIN_PPM;
    if (!(w.nitrite <= GRACE_MAX_TOXIN_PPM)) w.nitrite = GRACE_MAX_TOXIN_PPM;
    if (!(w.oxygen >= 0.55)) w.oxygen = 0.55;
    if (!(w.level >= 0.9)) w.level = 0.9;
  }
}

/** Undo deaths that happened during a grace chunk. Returns how many were revived. */
function reviveGraceDeaths(state: GameState, wereAlive: string[], logIdsBefore: Set<string>): number {
  const revived = new Set<string>();
  for (const id of wereAlive) {
    const c = state.creatures[id];
    if (!c || c.status !== 'dead') continue;
    c.status = 'alive';
    touchResidents(); // lane:perf2 — a revival re-joins its tank
    delete c.deathCause;
    c.stats.health = Math.max(GRACE_HEALTH_FLOOR, Number.isFinite(c.stats.health) ? c.stats.health : 0);
    revived.add(id);
  }
  if (revived.size) {
    // Drop the death notices for animals that were saved, so the player isn't told about deaths that didn't happen.
    state.log = state.log.filter((e) => logIdsBefore.has(e.id) || !(e.kind === 'death' && e.creatureId && revived.has(e.creatureId)));
  }
  return revived.size;
}

export interface SimulateOfflineOptions {
  capHours?: number;
  chunkHours?: number;
  /** Tank simulated at full fidelity (defaults to the starter's tank / first tank). */
  focusTankId?: string | null;
  /** Emit the "While you were away" log event (default true). */
  emitSummary?: boolean;
}

function defaultFocus(state: GameState): string | null {
  const starter = Object.values(state.creatures).find((c) => c.isStarter && c.status === 'alive' && c.tankId);
  return starter?.tankId ?? state.tankOrder[0] ?? null;
}

/**
 * Simulate `realElapsedMs` of absence on `state` (plain object or immer draft) under the grace period.
 * Pure w.r.t. the outside world: no storage, no UI. Returns the summary.
 */
export function simulateOffline(state: GameState, realElapsedMs: number, opts: SimulateOfflineOptions = {}): OfflineSummary {
  const cap = opts.capHours ?? OFFLINE_CAP_HOURS;
  const paused = state.clock.speed === 0;
  const { hours: rawHours, uncapped } = offlineHoursFor(paused ? 0 : realElapsedMs, cap);
  const hours = rawHours >= OFFLINE_MIN_HOURS ? rawHours : 0;
  const startHour = state.clock.hour;
  const moneyBefore = state.finance.money;
  const creaturesBefore = new Set(Object.keys(state.creatures));
  const clutchesBefore = new Set(Object.keys(state.clutches));
  const soldBefore = new Set(state.market.listings.filter((l) => l.status === 'sold').map((l) => l.id));
  const logIdsAtStart = new Set(state.log.map((e) => e.id));
  let deathsPrevented = 0;

  if (hours > 0) {
    const chunk = Math.max(0.25, opts.chunkHours ?? OFFLINE_CHUNK_HOURS);
    const focusTankId = opts.focusTankId === undefined ? defaultFocus(state) : opts.focusTankId;
    state.offlineGrace = true;
    try {
      graceFloor(state);
      let remaining = hours;
      while (remaining > 1e-9) {
        const step = Math.min(chunk, remaining);
        const wereAlive = aliveIds(state);
        const logIdsBefore = new Set(state.log.map((e) => e.id));
        advanceWorld(state, step, { focusTankId });
        deathsPrevented += reviveGraceDeaths(state, wereAlive, logIdsBefore);
        graceFloor(state);
        remaining -= step;
      }
      const wereAlive = aliveIds(state);
      const logIdsBefore = new Set(state.log.map((e) => e.id));
      flushSimDebt(state);
      deathsPrevented += reviveGraceDeaths(state, wereAlive, logIdsBefore);
      graceFloor(state);
    } finally {
      delete state.offlineGrace;
    }
  }

  const endHour = state.clock.hour;
  let births = 0;
  for (const c of Object.values(state.creatures)) if (!creaturesBefore.has(c.id)) births++;
  let newClutches = 0;
  for (const id of Object.keys(state.clutches)) if (!clutchesBefore.has(id)) newClutches++;
  let bidsReceived = 0;
  let sales = 0;
  for (const l of state.market.listings) {
    for (const b of l.bids) if (b.createdHour >= startHour - 1e-9 && b.createdHour <= endHour + 1e-9) bidsReceived++;
    if (l.status === 'sold' && !soldBefore.has(l.id)) sales++;
  }
  const moneyAfter = state.finance.money;
  const moneyDelta = Math.round((moneyAfter - moneyBefore) * 100) / 100;
  const highlightKinds = new Set<GameEvent['kind']>(['celebrate', 'breeding', 'market', 'danger', 'warning', 'unlock']);
  const highlights = state.log.filter((e) => !logIdsAtStart.has(e.id) && highlightKinds.has(e.kind)).slice(-6);

  const parts: string[] = [];
  if (moneyDelta !== 0) parts.push(`${moneyDelta > 0 ? '+' : '−'}$${Math.abs(moneyDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  if (births) parts.push(`${births} birth${births === 1 ? '' : 's'}`);
  if (newClutches) parts.push(`${newClutches} new clutch${newClutches === 1 ? '' : 'es'}`);
  if (bidsReceived) parts.push(`${bidsReceived} new bid${bidsReceived === 1 ? '' : 's'}`);
  if (sales) parts.push(`${sales} sale${sales === 1 ? '' : 's'}`);
  const text =
    `While you were away (${formatDuration(hours)}${uncapped > hours + 0.05 ? ', capped' : ''}): ` +
    (parts.length ? parts.join(' · ') : 'all quiet — everyone is doing fine') +
    '.';

  const summary: OfflineSummary = {
    hours,
    uncappedHours: uncapped,
    capped: uncapped > hours + 1e-9,
    realElapsedMs,
    startHour,
    endHour,
    moneyBefore,
    moneyAfter,
    moneyDelta,
    births,
    newClutches,
    bidsReceived,
    sales,
    deathsPrevented,
    highlights,
    text,
  };
  if (hours > 0 && opts.emitSummary !== false) emitEvent(state, { kind: 'info', text, toast: true });
  return summary;
}

// ───────────────────────────────── resume ─────────────────────────────────

/** Last "While you were away" summary, for the UI to show a welcome-back card. */
export const useResume = create<{ summary: OfflineSummary | null; clear: () => void }>((set) => ({
  summary: null,
  clear: () => set({ summary: null }),
}));

export interface ResumeResult extends LoadResult {
  slot: string;
  summary?: OfflineSummary;
}

export interface ResumeOptions {
  /** Put the game into the store and switch the UI to the game screen (default true). */
  apply?: boolean;
  /** Override "now" (tests). */
  now?: number;
}

/**
 * Load a slot, migrate it, simulate bounded offline progress under the grace period, then (by default) make it the
 * running game. This is what the title screen's Continue / Load buttons call.
 */
export async function loadAndResume(slot = 'auto', opts: ResumeOptions = {}): Promise<ResumeResult> {
  const res = await loadGameDetailed(slot);
  if (!res.ok || !res.state) return { ...res, slot };
  const state = res.state;
  state.isShowcase = false;
  const now = opts.now ?? Date.now();
  const since = Number.isFinite(state.lastTickRealMs) && state.lastTickRealMs > 0 ? state.lastTickRealMs : state.lastSavedRealMs;
  const elapsed = Math.max(0, now - (Number.isFinite(since) ? since : now));
  let summary: OfflineSummary | undefined;
  try {
    summary = simulateOffline(state, elapsed);
  } catch (e) {
    // A sim bug must never block loading a save: keep the loaded state as-is.
    delete state.offlineGrace;
    if (typeof console !== 'undefined') console.warn('[aquarium-go] offline catch-up failed; resuming without it', e);
  }
  state.lastTickRealMs = now;
  if (opts.apply !== false) {
    useGame.getState().setGame(state);
    const focus = defaultFocus(state);
    useUI.getState().set({
      screen: 'game',
      view: 'tank',
      focusedTankId: focus,
      panel: null,
      panelTarget: null,
      tool: 'none',
      selectedCreatureId: null,
      followCreatureId: null,
      partyMode: false,
      photoMode: false,
    });
    if (summary && summary.hours > 0) {
      useResume.setState({ summary });
      try {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aquarium-go:offline-summary', { detail: summary }));
      } catch {
        /* ignore */
      }
    }
  }
  return { ...res, state, slot, summary };
}

/** Continue the most recently saved slot. */
export async function continueGame(opts: ResumeOptions = {}): Promise<ResumeResult> {
  const slot = await latestSaveSlot();
  if (!slot) return { ok: false, slot: 'auto', code: 'empty', error: 'No saved game yet.' };
  return loadAndResume(slot, opts);
}
