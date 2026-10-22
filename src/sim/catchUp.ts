/**
 * The offline catch-up's rules (moved here from src/persistence/offline.ts in chunk 11, SHARED-SHOPS.md §5.1): pure
 * functions of the state, so a shared shop's server, which can't import the store, runs the same catch-up when a shop
 * wakes. src/persistence/offline.ts keeps the store-facing part (loading, the welcome-back card, the hidden tab) and
 * re-exports these. OWNER: lane "core".
 *
 * When a save is loaded, the real time since `lastTickRealMs` is converted at 1× speed (GAME_HOURS_PER_REAL_SECOND)
 * and capped at OFFLINE_CAP_HOURS, then simulated in chunks under a **maintenance grace period**: `state.offlineGrace =
 * true` is set for the duration of the catch-up and removed after (the contract for sim lanes is in offline.ts's
 * header and the field's doc in src/types/game.ts).
 */
import type { GameEvent, GameState } from '@/types';
import { advanceWorld, flushSimDebt } from './world';
import { emitEvent } from './context';
import { touchResidents } from './residents'; // lane:perf2
import { GAME_HOURS_PER_REAL_SECOND, OFFLINE_CAP_HOURS, formatDuration } from './time';

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

/** The tank a catch-up (and the resumed view) focuses: the starter's, else the first. */
export function defaultFocus(state: GameState): string | null {
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
  // B-177: copies, not the state's own events — the state may be mutateFast's private working copy.
  const highlights = state.log.filter((e) => !logIdsAtStart.has(e.id) && highlightKinds.has(e.kind)).slice(-6).map((e) => JSON.parse(JSON.stringify(e)) as GameEvent);

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
