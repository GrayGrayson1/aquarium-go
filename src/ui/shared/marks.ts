/**
 * chunk 13 (SHARED-SHOPS.md §3.2 rule 8, §7.4) — each player's own "seen" marks in a shared shop: the alerts' read
 * marks and Clear all, the log's read mark, Research's and the shows' "seen". They never reach the shared copy (one
 * member reading the alerts mustn't clear them for everyone), so `mark()` (src/ui/common/marks.ts) records them here,
 * per player and shop, on the device (localStorage, wrapped: losing them only shows old alerts again), and the copy the
 * screens read has them laid over it (`overlayMarks`), so every reader works as in a solo game. OWNER: lane "social".
 */
import type { GameEvent, GameState } from '@/types';
import type { Mark } from '../common/marks';

export const SHARED_MARKS_KEY = 'aquarium-go.shared-marks.v1';

/** One player's marks in one shop. */
export interface SharedMarks {
  /** Events at or below this id sequence are read. */
  readSeq?: number;
  /** "Clear all" (`notify.logClearedSeq`, `logClearedHour`). */
  clearedSeq?: number;
  clearedHour?: number;
  /** `notify.researchSeen`. */
  researchSeen?: number;
  /** `shows.resultsSeenHour`. */
  resultsSeenHour?: number;
}

/** The counter value inside an event id (`ev_1z` → 71), or null (as notify.ts reads it). */
export function eventSeq(id: string): number | null {
  const i = id.lastIndexOf('_');
  if (i < 0) return null;
  const n = parseInt(id.slice(i + 1), 36);
  return Number.isFinite(n) ? n : null;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function readAll(): Record<string, SharedMarks> {
  try {
    const raw = globalThis.localStorage?.getItem(SHARED_MARKS_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, SharedMarks>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, SharedMarks>): void {
  try {
    globalThis.localStorage?.setItem(SHARED_MARKS_KEY, JSON.stringify(all));
  } catch {
    /* only old alerts show again */
  }
}

const keyOf = (club: string, player: string) => `${club}:${player}`;

export function readMarks(club: string, player: string): SharedMarks {
  const m = readAll()[keyOf(club, player)];
  if (!m || typeof m !== 'object') return {};
  const out: SharedMarks = {};
  for (const k of ['readSeq', 'clearedSeq', 'clearedHour', 'researchSeen', 'resultsSeenHour'] as const) if (finite(m[k])) out[k] = m[k];
  return out;
}

/** The highest event sequence in the log now. */
function topSeq(g: GameState): number {
  let max = -1;
  for (const e of g.log) {
    const s = eventSeq(e.id);
    if (s !== null && s > max) max = s;
  }
  return max;
}

/** What `m` records, from the copy the player is looking at (the shared one, marks laid over). */
export function nextMarks(prev: SharedMarks, m: Mark, g: GameState): SharedMarks {
  const next = { ...prev };
  const top = topSeq(g);
  switch (m) {
    case 'allRead':
    case 'logRead':
      next.readSeq = Math.max(prev.readSeq ?? -1, top);
      break;
    case 'clearAll':
      next.readSeq = Math.max(prev.readSeq ?? -1, top);
      next.clearedSeq = Math.max(prev.clearedSeq ?? -1, top, finite(g.idCounter) ? g.idCounter : -1);
      next.clearedHour = g.clock.hour;
      break;
    case 'researchSeen':
      next.researchSeen = g.progress?.research?.completed?.length ?? 0;
      break;
    case 'showResultsSeen':
      next.resultsSeenHour = g.clock.hour;
      break;
  }
  return next;
}

/** Record a mark for this player in this shop. */
export function recordMark(club: string, player: string, m: Mark, g: GameState): SharedMarks {
  const all = readAll();
  const next = nextMarks(readMarks(club, player), m, g);
  all[keyOf(club, player)] = next;
  writeAll(all);
  return next;
}

const readEvents = new WeakMap<GameEvent, GameEvent>();

/**
 * The copy with this player's marks laid over it. Unchanged parts keep their identity (an event read already, the log
 * when nothing in it changes), so the screens re-render only for what changed.
 */
export function overlayMarks(g: GameState, m: SharedMarks): GameState {
  const log = overlayLog(g.log, m.readSeq ?? -1);
  const notify = overlayNotify(g.notify, m);
  const shows = overlayShows(g.shows, m);
  if (log === g.log && notify === g.notify && shows === g.shows) return g;
  return { ...g, log, notify, shows };
}

let lastLog: { log: GameEvent[]; readSeq: number; out: GameEvent[] } | null = null;

function overlayLog(src: GameEvent[], readSeq: number): GameEvent[] {
  if (lastLog && lastLog.log === src && lastLog.readSeq === readSeq) return lastLog.out;
  let log = src;
  if (readSeq >= 0) {
    let out: GameEvent[] | null = null;
    for (let i = 0; i < src.length; i++) {
      const e = src[i];
      const s = eventSeq(e.id);
      if (e.read || s === null || s > readSeq) {
        if (out) out[i] = e;
        continue;
      }
      let r = readEvents.get(e);
      if (!r) {
        r = { ...e, read: true };
        readEvents.set(e, r);
      }
      out ??= src.slice(0, i);
      out[i] = r;
    }
    if (out) log = out;
  }
  lastLog = { log: src, readSeq, out: log };
  return log;
}

let lastNotify: { n: GameState['notify']; m: SharedMarks; out: GameState['notify'] } | null = null;

function overlayNotify(n: GameState['notify'], m: SharedMarks): GameState['notify'] {
  if (lastNotify && lastNotify.n === n && lastNotify.m === m) return lastNotify.out;
  const base = n ?? {};
  let out = n;
  if (finite(m.clearedSeq) && m.clearedSeq > (base.logClearedSeq ?? -1)) out = { ...base, ...out, logClearedSeq: m.clearedSeq, ...(finite(m.clearedHour) ? { logClearedHour: m.clearedHour } : {}) };
  if (finite(m.researchSeen) && m.researchSeen !== base.researchSeen) out = { ...base, ...out, researchSeen: m.researchSeen };
  lastNotify = { n, m, out };
  return out;
}

let lastShows: { s: GameState['shows']; m: SharedMarks; out: GameState['shows'] } | null = null;

function overlayShows(s: GameState['shows'], m: SharedMarks): GameState['shows'] {
  if (lastShows && lastShows.s === s && lastShows.m === m) return lastShows.out;
  const out = finite(m.resultsSeenHour) && s && m.resultsSeenHour > (s.resultsSeenHour ?? -Infinity) ? { ...s, resultsSeenHour: m.resultsSeenHour } : s;
  lastShows = { s, m, out };
  return out;
}
