/**
 * Offline progress + resume. OWNER: lane "core".
 *
 * When a save is loaded, the real time since `lastTickRealMs` is converted at 1× speed
 * (GAME_HOURS_PER_REAL_SECOND) and capped at OFFLINE_CAP_HOURS, then simulated in chunks under a
 * **maintenance grace period**: `state.offlineGrace = true` is set for the duration of the catch-up and removed after.
 *
 * Contract for sim lanes while `state.offlineGrace` is true (see the field doc in src/types/game.ts):
 *   - lifecycle: never set a creature's status to 'dead'; floor health at GRACE_HEALTH_FLOOR; treat creatures as
 *     receiving minimal rations (hunger ≤ GRACE_MAX_HUNGER) without consuming inventory food. An animal already past
 *     either limit is held where it is, never moved to the limit (that would heal or feed it for free).
 *   - breeding: may progress, but should not cull adults; clutch losses should be no worse than normal.
 *   - water/care: equipment should not fail.
 * Core ALSO enforces a safety net after every chunk (revives any creature that died in the chunk, floors health,
 * caps hunger, caps ammonia/nitrite at a WATCH level and tops off evaporation), so the promise
 * "you never come back to a dead tank" holds even if a lane ignores the flag.
 *
 * A paused game (speed 0 when saved) does not accumulate offline time.
 *
 * lane:fix-core:
 *  - The grace floors never make anything BETTER than it was when the game was saved (P5-02): an animal saved at
 *    health 4 comes back at health 4, not 20; a tank saved at 3.5 ppm ammonia is not cleaned to 0.5. Only what the
 *    catch-up itself would have worsened is held. (Reloading used to heal a dying tank for free.)
 *  - The "While you were away" card, toast and log line only appear after a real absence (OFFLINE_MIN_REAL_MS); a
 *    quick reload still catches up quietly (P7-10). The card pauses the clock while it is open (S06-02).
 *  - A tab that was hidden for OFFLINE_HIDDEN_MIN_MS or longer catches up the same way when it comes back (P5-09),
 *    instead of only when the save is re-opened.
 */
import { create } from 'zustand';
import type { GameEvent, GameState } from '@/types';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { emitEvent } from '@/sim/context';
import { touchResidents } from '@/sim/residents'; // lane:perf2
import { GAME_HOURS_PER_REAL_SECOND, OFFLINE_CAP_HOURS, formatDuration } from '@/sim/time';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { loadGameDetailed, latestSaveSlot, isStaleGame, noteCatchUp } from './slots';
import { mutateFast } from '@/game/fastMutate';
import type { LoadResult } from './types';

export const GRACE_HEALTH_FLOOR = 20;
export const GRACE_MAX_HUNGER = 60;
/** Toxin ceiling during grace (a WATCH level, never lethal). */
export const GRACE_MAX_TOXIN_PPM = 0.5;
/** Game hours simulated per catch-up chunk. */
export const OFFLINE_CHUNK_HOURS = 1;
/** Below this many game hours no catch-up happens (≈ 1 real second at 1×). */
export const OFFLINE_MIN_HOURS = 0.1;
/** Real absence below which the catch-up stays quiet: no welcome-back card, toast or log line (a quick reload). */
export const OFFLINE_MIN_REAL_MS = 60_000;
/** A tab hidden at least this long catches up when it becomes visible again (shorter breaks simply pause). */
export const OFFLINE_HIDDEN_MIN_MS = 5 * 60_000;

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
  /** lane:fix-core (S06-02) — speed the clock ran at before the welcome-back card paused it (restored on dismiss). */
  resumeSpeed?: number;
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

const GRACE_MIN_OXYGEN = 0.55;
const GRACE_MIN_LEVEL = 0.9;

/**
 * lane:fix-core (P5-02) — what the grace period may hold each animal and tank at: the usual floor, or the saved
 * value when that was already worse. Animals below the health floor (or above the hunger cap) at save time are
 * pinned where they were: the catch-up never kills them and never nurses them back for free.
 * lane:fix3-saves (R03-04) — the pin is one-sided: what really happened during a chunk (a feeder or staff feeding
 * them, recovery) still counts. The lifecycle step holds an animal outside the limits where it is instead of clamping
 * it to them (hunger never rises past max(GRACE_MAX_HUNGER, its value), health never falls past
 * min(GRACE_HEALTH_FLOOR, its value)), so any improvement a chunk makes is real and graceFloor only stops worsening.
 */
interface GraceFloors {
  creatures: Map<string, { health: number; hunger: number }>;
  tanks: Map<string, TankFloor>;
}

/**
 * lane:fix-core2 (X-2) — `ammoniaTotal` / `nitriteTotal` cap free + conditioner-bound toxin (water.lab.boundAmmonia /
 * boundNitrite): a dose running through the catch-up banks what the filter could not process, and releasing it at
 * expiry would otherwise dump far more than the cap into the water (≈1.5 ppm TAN after 12 h in a filterless tank).
 */
interface TankFloor {
  ammonia: number;
  nitrite: number;
  ammoniaTotal: number;
  nitriteTotal: number;
  oxygen: number;
  level: number;
}

const finiteOr = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

function captureGraceFloors(state: GameState): GraceFloors {
  const creatures = new Map<string, { health: number; hunger: number }>();
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    const health = Number.isFinite(c.stats.health) ? c.stats.health : GRACE_HEALTH_FLOOR;
    const hunger = Number.isFinite(c.stats.hunger) ? c.stats.hunger : GRACE_MAX_HUNGER;
    creatures.set(c.id, { health: Math.min(GRACE_HEALTH_FLOOR, health), hunger: Math.max(GRACE_MAX_HUNGER, hunger) });
  }
  const tanks = new Map<string, TankFloor>();
  for (const id of state.tankOrder) {
    const w = state.tanks[id]?.water;
    if (!w) continue;
    const ammonia = finiteOr(w.ammonia, 0);
    const nitrite = finiteOr(w.nitrite, 0);
    tanks.set(id, {
      ammonia: Math.max(GRACE_MAX_TOXIN_PPM, ammonia),
      nitrite: Math.max(GRACE_MAX_TOXIN_PPM, nitrite),
      ammoniaTotal: Math.max(GRACE_MAX_TOXIN_PPM, ammonia + finiteOr(w.lab?.boundAmmonia, 0)),
      nitriteTotal: Math.max(GRACE_MAX_TOXIN_PPM, nitrite + finiteOr(w.lab?.boundNitrite, 0)),
      oxygen: Math.min(GRACE_MIN_OXYGEN, Number.isFinite(w.oxygen) ? w.oxygen : 1),
      level: Math.min(GRACE_MIN_LEVEL, Number.isFinite(w.level) ? w.level : 1),
    });
  }
  return { creatures, tanks };
}

const DEFAULT_CREATURE_FLOOR = { health: GRACE_HEALTH_FLOOR, hunger: GRACE_MAX_HUNGER };
const DEFAULT_TANK_FLOOR: TankFloor = {
  ammonia: GRACE_MAX_TOXIN_PPM,
  nitrite: GRACE_MAX_TOXIN_PPM,
  ammoniaTotal: GRACE_MAX_TOXIN_PPM,
  nitriteTotal: GRACE_MAX_TOXIN_PPM,
  oxygen: GRACE_MIN_OXYGEN,
  level: GRACE_MIN_LEVEL,
};

/** Apply the grace floor to every living creature and the water (safety net; idempotent). */
function graceFloor(state: GameState, floors: GraceFloors): void {
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    const f = floors.creatures.get(c.id) ?? DEFAULT_CREATURE_FLOOR;
    if (!(c.stats.health >= f.health)) c.stats.health = f.health; // never sicker than the floor (or the save)
    if (!(c.stats.hunger <= f.hunger)) c.stats.hunger = f.hunger; // never hungrier than the cap (or the save)
  }
  for (const id of state.tankOrder) {
    const w = state.tanks[id]?.water;
    if (!w) continue;
    const f = floors.tanks.get(id) ?? DEFAULT_TANK_FLOOR;
    if (!(w.ammonia <= f.ammonia)) w.ammonia = f.ammonia;
    if (!(w.nitrite <= f.nitrite)) w.nitrite = f.nitrite;
    const lab = w.lab;
    if (lab?.boundAmmonia !== undefined && !(lab.boundAmmonia <= f.ammoniaTotal - w.ammonia)) lab.boundAmmonia = Math.max(0, f.ammoniaTotal - w.ammonia);
    if (lab?.boundNitrite !== undefined && !(lab.boundNitrite <= f.nitriteTotal - w.nitrite)) lab.boundNitrite = Math.max(0, f.nitriteTotal - w.nitrite);
    if (!(w.oxygen >= f.oxygen)) w.oxygen = f.oxygen;
    if (!(w.level >= f.level)) w.level = f.level;
  }
}

/** Undo deaths that happened during a grace chunk. Returns how many were revived. */
function reviveGraceDeaths(state: GameState, wereAlive: string[], logIdsBefore: Set<string>, floors: GraceFloors): number {
  const revived = new Set<string>();
  for (const id of wereAlive) {
    const c = state.creatures[id];
    if (!c || c.status !== 'dead') continue;
    c.status = 'alive';
    touchResidents(); // lane:perf2 — a revival re-joins its tank
    delete c.deathCause;
    const floor = floors.creatures.get(id)?.health ?? GRACE_HEALTH_FLOOR;
    c.stats.health = Math.max(floor, Number.isFinite(c.stats.health) ? c.stats.health : 0);
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
    const floors = captureGraceFloors(state);
    try {
      graceFloor(state, floors);
      let remaining = hours;
      while (remaining > 1e-9) {
        const step = Math.min(chunk, remaining);
        const wereAlive = aliveIds(state);
        const logIdsBefore = new Set(state.log.map((e) => e.id));
        advanceWorld(state, step, { focusTankId });
        deathsPrevented += reviveGraceDeaths(state, wereAlive, logIdsBefore, floors);
        graceFloor(state, floors);
        remaining -= step;
      }
      const wereAlive = aliveIds(state);
      const logIdsBefore = new Set(state.log.map((e) => e.id));
      flushSimDebt(state);
      deathsPrevented += reviveGraceDeaths(state, wereAlive, logIdsBefore, floors);
      graceFloor(state, floors);
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
  // lane:fix-core (P7-10) — say it is game time: "18 min" read as real minutes after a 3-second reload.
  const text =
    `While you were away (${formatDuration(hours)} of game time${uncapped > hours + 0.05 ? ', capped' : ''}): ` +
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
  if (hours > 0 && opts.emitSummary !== false && realElapsedMs >= OFFLINE_MIN_REAL_MS) emitEvent(state, { kind: 'info', text, toast: true });
  return summary;
}

/** Is this catch-up worth a welcome-back card? (A real absence with game time simulated.) */
export function summaryWorthShowing(summary: OfflineSummary | undefined | null): summary is OfflineSummary {
  return !!summary && summary.hours > 0 && summary.realElapsedMs >= OFFLINE_MIN_REAL_MS;
}

/**
 * lane:fix-core (S06-02) — the welcome-back card pauses the clock while it is open, so a 10× aquarium does not race
 * ahead unfed while the player reads what happened. Call on the state that is about to be published; `clear()`
 * restores the speed when the card is dismissed (unless the player already set one).
 */
function pauseForCard(state: GameState, summary: OfflineSummary): void {
  if (state.clock.speed > 0) {
    summary.resumeSpeed = state.clock.speed;
    state.clock.speed = 0;
  }
}

function publishSummary(summary: OfflineSummary): void {
  useResume.setState({ summary });
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aquarium-go:offline-summary', { detail: summary }));
  } catch {
    /* ignore */
  }
}

// ───────────────────────────────── resume ─────────────────────────────────

/** Last "While you were away" summary, for the UI to show a welcome-back card. */
export const useResume = create<{ summary: OfflineSummary | null; clear: () => void }>((set, get) => ({
  summary: null,
  clear: () => {
    const s = get().summary;
    set({ summary: null });
    // Dismissing the card resumes the clock the card paused (if the player has not already pressed play).
    const speed = s?.resumeSpeed;
    if (speed && speed > 0) {
      useGame.getState().mutate((d) => {
        if (d.clock.speed === 0) d.clock.speed = speed as 0 | 1 | 3 | 10;
      });
    }
  },
}));

// lane:fix-core (P5-11) — a summary belongs to the aquarium it was made for: drop it when another game (or none)
// takes over, so a fresh New Game is never greeted with the previous aquarium's "While you were away".
useGame.subscribe((s, prev) => {
  if (s.game?.saveId !== prev.game?.saveId && useResume.getState().summary) useResume.setState({ summary: null });
});

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
  const card = summaryWorthShowing(summary) ? summary : null;
  if (opts.apply !== false && card) pauseForCard(state, card);
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
    if (card) publishSummary(card);
    else if (state.clock.speed === 0) {
      // A game saved paused comes back paused: say so instead of leaving a silently stopped clock.
      try {
        useUI.getState().toast('Your aquarium is paused — press play when you’re ready.', 'info');
      } catch {
        /* ignore */
      }
    }
  }
  return { ...res, state, slot, summary };
}

/**
 * lane:fix-core (P5-09) — bounded catch-up for a tab that was hidden for `hiddenMs` and is visible again. Below
 * OFFLINE_HIDDEN_MIN_MS nothing happens (a short switch away simply paused the game, as before). Uses the same cap,
 * grace rules and welcome-back card as loading a save. Returns the summary when a catch-up ran.
 */
export function catchUpAfterHidden(hiddenMs: number): OfflineSummary | null {
  if (!(hiddenMs >= OFFLINE_HIDDEN_MIN_MS)) return null;
  const g = useGame.getState().game;
  if (!g || g.isShowcase || g.clock.speed === 0) return null;
  if (useUI.getState().screen !== 'game') return null;
  if (isStaleGame(g.saveId)) return null; // another tab owns this aquarium; its world is the one moving on
  let summary: OfflineSummary | null = null;
  try {
    mutateFast((d) => {
      summary = simulateOffline(d, hiddenMs);
      d.lastTickRealMs = Date.now();
      if (summaryWorthShowing(summary)) pauseForCard(d, summary);
    });
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[aquarium-go] catch-up after a hidden spell failed', e);
    return null;
  }
  // lane:fix3-saves (R03-01) — catch-up is not play: a forgotten tab must not look further along because of it.
  if (summary) noteCatchUp(g.saveId, (summary as OfflineSummary).hours);
  if (summaryWorthShowing(summary)) publishSummary(summary);
  return summary;
}

/** Continue the most recently saved slot. */
export async function continueGame(opts: ResumeOptions = {}): Promise<ResumeResult> {
  const slot = await latestSaveSlot();
  if (!slot) return { ok: false, slot: 'auto', code: 'empty', error: 'No saved game yet.' };
  return loadAndResume(slot, opts);
}
