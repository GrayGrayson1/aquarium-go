import { describe, it, expect } from 'vitest';
import type { GameEvent } from '@/types';
import { CueLimiter, cueFor, diffLog, type LogCursor } from '@/audio/cues';

let seq = 0;
const ev = (kind: GameEvent['kind'], text = 'x'): GameEvent => ({ id: `ev${++seq}`, hour: seq, kind, text });

describe('audio cues — log diff', () => {
  it('establishes a silent baseline for a new save', () => {
    const log = [ev('info'), ev('death')];
    const r = diffLog({ saveId: null, lastId: null }, 'A', log);
    expect(r.fresh).toEqual([]);
    expect(r.cursor).toEqual({ saveId: 'A', lastId: log[1].id });
  });

  it('returns only entries appended since the cursor', () => {
    const log = [ev('info'), ev('info')];
    let c: LogCursor = diffLog({ saveId: null, lastId: null }, 'A', log).cursor;
    const added = [ev('breeding'), ev('market')];
    const r = diffLog(c, 'A', [...log, ...added]);
    expect(r.fresh.map((e) => e.id)).toEqual(added.map((e) => e.id));
    c = r.cursor;
    expect(diffLog(c, 'A', [...log, ...added]).fresh).toEqual([]);
  });

  it('survives the log cap splicing old entries off the front', () => {
    const log = Array.from({ length: 300 }, () => ev('info'));
    const c = diffLog({ saveId: null, lastId: null }, 'A', log).cursor;
    const added = [ev('celebrate'), ev('danger')];
    const capped = [...log, ...added].slice(-300);
    expect(diffLog(c, 'A', capped).fresh.map((e) => e.kind)).toEqual(['celebrate', 'danger']);
  });

  it('resets silently when the save changes or the cursor is lost', () => {
    const log = [ev('info')];
    const c = diffLog({ saveId: null, lastId: null }, 'A', log).cursor;
    expect(diffLog(c, 'B', [ev('death')]).fresh).toEqual([]);
    expect(diffLog(c, 'A', [ev('death'), ev('death')]).fresh).toEqual([]); // cursor id vanished
  });

  it('treats everything as new when the previous log was empty', () => {
    const c = diffLog({ saveId: null, lastId: null }, 'A', []).cursor;
    const r = diffLog(c, 'A', [ev('breeding')]);
    expect(r.fresh.length).toBe(1);
  });
});

describe('audio cues — mapping and rate limiting', () => {
  it('maps log kinds to tasteful cues', () => {
    expect(cueFor(ev('breeding'))?.sfx).toBe('breed');
    expect(cueFor(ev('death'))?.sfx).toBe('death');
    expect(cueFor(ev('market'))?.sfx).toBe('bid');
    expect(cueFor(ev('celebrate'))?.sfx).toBe('celebrate');
    expect(cueFor(ev('danger'))?.sfx).toBe('warning');
    expect(cueFor(ev('info'))).toBeNull();
    expect(cueFor(ev('tip'))).toBeNull();
    expect(cueFor(ev('visitor', 'A visitor gasped: wow!'))?.sfx).toBe('visitor_wow');
    expect(cueFor(ev('visitor', 'A visitor left.'))).toBeNull();
  });

  it('plays only the highest-priority cue of a burst', () => {
    const lim = new CueLimiter(700);
    const pick = lim.pick([ev('market'), ev('celebrate'), ev('breeding')], 1000);
    expect(pick?.spec.sfx).toBe('celebrate');
  });

  it('enforces a global gap and per-kind gaps', () => {
    const lim = new CueLimiter(700);
    expect(lim.pick([ev('market')], 0)).not.toBeNull();
    expect(lim.pick([ev('breeding')], 300)).toBeNull(); // global gap
    expect(lim.pick([ev('breeding')], 800)?.spec.sfx).toBe('breed');
    expect(lim.pick([ev('market')], 1600)).toBeNull(); // market per-kind gap 2.5 s
    expect(lim.pick([ev('market')], 2600)?.spec.sfx).toBe('bid');
    // a death storm is voiced once per 8 s
    let deaths = 0;
    for (let t = 10000; t < 20000; t += 250) if (lim.pick([ev('death')], t)) deaths++;
    expect(deaths).toBe(2);
  });
});
