/**
 * lane:notify — the notification centre's rules: the bell's number is unread news, "Mark read" reads, "Clear all"
 * hides the drawer's events (never deletes them — progression, exhibits and the welcome-back card scan the log).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { emitEvent } from '@/sim/context';
import { advanceWorld } from '@/sim/world';
import { clearAllEvents, drawerEvents, hasDrawerEvents, isCleared, logSeq, markAllRead, notifyState, unreadNews } from '@/ui/common/notify';

function game(): GameState {
  const s = newGame({ starterId: 'betta', starterName: 'Pip', seed: 11 });
  markAllRead(s); // the welcome line
  return s;
}

describe('notify: unread news (the bell number)', () => {
  it('counts toasted events and every warning, coloured by the worst', () => {
    const s = game();
    expect(unreadNews(s)).toEqual({ count: 0, worst: null });
    emitEvent(s, { kind: 'info', text: 'Routine note' }); // not news: never toasted, not a warning
    expect(unreadNews(s).count).toBe(0);
    emitEvent(s, { kind: 'celebrate', text: 'A ribbon!', toast: true });
    expect(unreadNews(s)).toEqual({ count: 1, worst: 'news' });
    emitEvent(s, { kind: 'warning', text: 'Nitrite is creeping up' });
    expect(unreadNews(s)).toEqual({ count: 2, worst: 'watch' });
    emitEvent(s, { kind: 'death', text: 'Someone died' });
    expect(unreadNews(s)).toEqual({ count: 3, worst: 'danger' });
    markAllRead(s);
    expect(unreadNews(s)).toEqual({ count: 0, worst: null });
    expect(s.log.every((e) => e.read)).toBe(true);
  });
});

describe('notify: Clear all', () => {
  it('hides everything logged so far from the drawer, keeps it in the log, and shows what comes after', () => {
    const s = game();
    for (let i = 0; i < 5; i++) emitEvent(s, { kind: 'warning', text: `Warning ${i}`, toast: true });
    const before = s.log.length;
    const ids = s.log.map((e) => e.id);
    expect(drawerEvents(s).length).toBe(Math.min(40, before));
    expect(hasDrawerEvents(s)).toBe(true);

    clearAllEvents(s);
    expect(s.log.length).toBe(before); // nothing deleted
    expect(s.log.map((e) => e.id)).toEqual(ids);
    expect(drawerEvents(s)).toEqual([]);
    expect(hasDrawerEvents(s)).toBe(false);
    expect(unreadNews(s).count).toBe(0);
    expect(s.log.every((e) => e.read)).toBe(true);
    expect(notifyState(s).logClearedHour).toBe(s.clock.hour);

    // later news shows as usual
    const later = emitEvent(s, { kind: 'danger', text: 'Ammonia spike', toast: true });
    expect(drawerEvents(s).map((e) => e.id)).toEqual([later.id]);
    expect(unreadNews(s)).toEqual({ count: 1, worst: 'danger' });
  });

  it('back-dated events logged after the clear still show (ids, not hours, decide)', () => {
    const s = game();
    emitEvent(s, { kind: 'info', text: 'Old', toast: true });
    clearAllEvents(s);
    const late = emitEvent(s, { kind: 'celebrate', text: 'Show result from earlier today', toast: true }, s.clock.hour - 5);
    expect(isCleared(s, late)).toBe(false);
    expect(drawerEvents(s).map((e) => e.id)).toEqual([late.id]);
  });

  it('kind filters and the limit apply to what is left', () => {
    const s = game();
    clearAllEvents(s);
    emitEvent(s, { kind: 'market', text: 'Bid 1' });
    emitEvent(s, { kind: 'warning', text: 'W' });
    emitEvent(s, { kind: 'market', text: 'Bid 2' });
    expect(drawerEvents(s, ['market']).map((e) => e.text)).toEqual(['Bid 2', 'Bid 1']); // newest first
    expect(drawerEvents(s, null, 2).map((e) => e.text)).toEqual(['Bid 2', 'W']);
  });

  it('never moves the progression log cursor and survives the sim running on', () => {
    const s = game();
    advanceWorld(s, 6, { forceFull: true });
    const scanBefore = s.progress.scan ? { ...s.progress.scan } : undefined;
    clearAllEvents(s);
    expect(s.progress.scan).toEqual(scanBefore);
    const n = s.log.length;
    advanceWorld(s, 24, { forceFull: true });
    // whatever the sim logged since is visible; nothing from before is
    const shown = drawerEvents(s, null, 1000);
    expect(shown.length).toBe(s.log.length - n);
  });

  it('a damaged notify block is ignored, and an id without a sequence falls back to the hour', () => {
    const s = game();
    (s as unknown as { notify: unknown }).notify = 'garbage';
    expect(notifyState(s)).toEqual({});
    expect(drawerEvents(s).length).toBeGreaterThan(0);
    clearAllEvents(s); // repairs it
    expect(typeof notifyState(s).logClearedSeq).toBe('number');
    expect(logSeq('ev_1a')).toBe(46);
    expect(logSeq('weird')).toBeNull();
    s.notify = { logClearedHour: 10 };
    expect(isCleared(s, { id: 'weird', hour: 9, kind: 'info', text: '' })).toBe(true);
    expect(isCleared(s, { id: 'weird', hour: 11, kind: 'info', text: '' })).toBe(false);
  });
});
