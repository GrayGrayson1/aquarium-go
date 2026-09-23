/**
 * Shows state helpers: lazy init (old saves have no `shows`), the circuit's own deterministic RNG stream and ids.
 * OWNER: lane "shows".
 *
 * The show circuit draws from its own persisted mulberry32 stream (ShowsState.rng, seeded from the save seed), not
 * from the main sim RNG, so scheduling shows never shifts the random sequence the tanks, market and visitors see.
 * It is still fully deterministic: same save + same calls → same shows, fields and results.
 */
import type { GameState, ShowsState } from '@/types';
import { mulberry32, hashString, type Rng } from '../rng';

/** First show is scheduled this many game hours after the circuit starts. */
const FIRST_SHOW_AFTER_H = 2;

export function emptyShowsState(state: GameState): ShowsState {
  return {
    rng: (hashString(`shows:${state.seed >>> 0}`) ^ 0x5eed5) >>> 0,
    seq: 0,
    cursorHour: (Number.isFinite(state.clock?.hour) ? state.clock.hour : 0) + FIRST_SHOW_AFTER_H,
    shows: [],
    entries: [],
    trophies: [],
    tankAwards: {},
    stats: { entered: 0, placings: 0, wins: 0, bestInShow: 0, prize: 0 },
  };
}

/** The shows state, created lazily and repaired defensively (never throws on odd data). */
export function ensureShowsState(state: GameState): ShowsState {
  if (!state.shows || typeof state.shows !== 'object') state.shows = emptyShowsState(state);
  const s = state.shows;
  if (!Number.isFinite(s.rng)) s.rng = emptyShowsState(state).rng;
  if (!Number.isFinite(s.seq)) s.seq = 0;
  if (!Number.isFinite(s.cursorHour)) s.cursorHour = state.clock.hour;
  if (!Array.isArray(s.shows)) s.shows = [];
  if (!Array.isArray(s.entries)) s.entries = [];
  if (!Array.isArray(s.trophies)) s.trophies = [];
  if (!s.tankAwards || typeof s.tankAwards !== 'object') s.tankAwards = {};
  if (!s.stats || typeof s.stats !== 'object') s.stats = { entered: 0, placings: 0, wins: 0, bestInShow: 0, prize: 0 };
  return s;
}

/** RNG bound to the shows stream: every draw advances `shows.rng` (works on immer drafts). */
export function showsRng(s: ShowsState): Rng {
  const inner = mulberry32(s.rng >>> 0);
  const wrap =
    <A extends unknown[], R>(fn: (...a: A) => R) =>
    (...a: A): R => {
      const r = fn(...a);
      s.rng = inner.state();
      return r;
    };
  return {
    next: wrap(inner.next),
    range: wrap(inner.range),
    int: wrap(inner.int),
    chance: wrap(inner.chance),
    pick: wrap(inner.pick) as Rng['pick'],
    weighted: wrap(inner.weighted) as Rng['weighted'],
    gauss: wrap(inner.gauss),
    shuffle: wrap(inner.shuffle) as Rng['shuffle'],
    state: inner.state,
  };
}

/** A show-local id (independent of state.idCounter, so entering shows never shifts other ids). */
export function showsId(s: ShowsState, prefix: 'show' | 'ent' | 'tro'): string {
  s.seq += 1;
  return `${prefix}-${s.seq.toString(36)}`;
}

/** A fixed sub-stream for one purpose of one show (field, judging…): independent of how many entries there are. */
export function subRng(seed: number, salt: string): Rng {
  return mulberry32((seed ^ hashString(salt)) >>> 0);
}
