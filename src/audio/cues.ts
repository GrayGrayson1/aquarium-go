/**
 * Species/game event cues driven by new `state.log` entries — pure diff + rate limiting (unit-tested).
 * OWNER: lane "audio".
 */
import type { GameEvent } from '@/types';
import type { SfxId } from './sfx';

export interface CueSpec {
  sfx: SfxId;
  volume: number;
  /** Minimum ms between two cues of this log kind. */
  minGapMs: number;
  /** Higher wins when several entries arrive in the same tick. */
  priority: number;
}

export const CUE_FOR_KIND: Partial<Record<GameEvent['kind'], CueSpec>> = {
  celebrate: { sfx: 'celebrate', volume: 0.85, minGapMs: 4000, priority: 9 },
  unlock: { sfx: 'unlock', volume: 0.85, minGapMs: 4000, priority: 8 },
  death: { sfx: 'death', volume: 0.8, minGapMs: 8000, priority: 7 },
  danger: { sfx: 'warning', volume: 0.8, minGapMs: 6000, priority: 6 },
  breeding: { sfx: 'breed', volume: 0.8, minGapMs: 4000, priority: 5 },
  market: { sfx: 'bid', volume: 0.7, minGapMs: 2500, priority: 4 },
  warning: { sfx: 'warning', volume: 0.5, minGapMs: 10000, priority: 3 },
  visitor: { sfx: 'visitor_wow', volume: 0.6, minGapMs: 8000, priority: 2 },
};

const WOW_RE = /\b(wow|amaz|stun|ooh|gorgeous|beautiful|incredible|delight|gasp)/i;

/** Map an event to a cue (visitor events only cue when the text reads like a "wow"). */
export function cueFor(e: GameEvent): CueSpec | null {
  const spec = CUE_FOR_KIND[e.kind];
  if (!spec) return null;
  if (e.kind === 'visitor' && !WOW_RE.test(e.text)) return null;
  return spec;
}

export interface LogCursor {
  saveId: string | null;
  lastId: string | null;
}

/**
 * Entries appended since the cursor. The log is capped (oldest spliced off), so we locate the last seen id rather
 * than trusting lengths. A different save, or a lost cursor, resets the baseline without emitting anything.
 */
export function diffLog(cursor: LogCursor, saveId: string, log: readonly GameEvent[]): { fresh: GameEvent[]; cursor: LogCursor } {
  const lastId = log.length ? log[log.length - 1].id : null;
  if (cursor.saveId !== saveId) return { fresh: [], cursor: { saveId, lastId } };
  if (cursor.lastId === lastId) return { fresh: [], cursor };
  if (cursor.lastId === null) return { fresh: log.slice(), cursor: { saveId, lastId } };
  let i = log.length - 1;
  while (i >= 0 && log[i].id !== cursor.lastId) i--;
  if (i < 0) return { fresh: [], cursor: { saveId, lastId } }; // cursor fell off the cap or log was replaced
  return { fresh: log.slice(i + 1), cursor: { saveId, lastId } };
}

/** Chooses at most one cue per call, honouring per-kind gaps and a global gap. */
export class CueLimiter {
  private lastByKind = new Map<string, number>();
  private lastAny = -1e9;
  constructor(public globalGapMs = 700) {}

  pick(entries: readonly GameEvent[], nowMs: number): { kind: GameEvent['kind']; spec: CueSpec } | null {
    if (nowMs - this.lastAny < this.globalGapMs) return null;
    let best: { kind: GameEvent['kind']; spec: CueSpec } | null = null;
    for (const e of entries) {
      const spec = cueFor(e);
      if (!spec) continue;
      const last = this.lastByKind.get(e.kind) ?? -1e9;
      if (nowMs - last < spec.minGapMs) continue;
      if (!best || spec.priority > best.spec.priority) best = { kind: e.kind, spec };
    }
    if (best) {
      this.lastByKind.set(best.kind, nowMs);
      this.lastAny = nowMs;
    }
    return best;
  }
}

/**
 * Passive income (ticket sales, listings, staff sales) arrives in small ticks — every second or two at 10× in an
 * open facility. One soft chime per gap is plenty; fast-forwarding gets an even sparser one.
 */
export class IncomeCueGate {
  private last = -1e9;
  constructor(
    public gapMs = 12000,
    public fastGapMs = 30000,
  ) {}

  allow(nowMs: number, speed: number): boolean {
    const gap = speed >= 3 ? this.fastGapMs : this.gapMs;
    if (nowMs - this.last < gap) return false;
    this.last = nowMs;
    return true;
  }
}
