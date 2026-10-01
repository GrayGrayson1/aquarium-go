/**
 * fix lane HUD — toast queue rules (P7-04 pre-emption flash, P1-01/P6-02 reading time) and the CSS contract behind
 * the multi-line toasts (P1-01, P6-02, P7-09, S12-03, P4-06).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pickShown, ttlOf, isExpired, PREEMPT_AFTER_MS } from '@/ui/hud/toastQueue';

type K = 'success' | 'danger' | 'warning' | 'info' | 'market' | 'celebrate' | 'death';
const e = (key: string, kind: K, born: number, text = key) => ({ key, kind, born, texts: [text] });

describe('P7-04: a visible toast is never pre-empted by higher-priority arrivals', () => {
  it('keeps the on-screen toast and fills the free slots by priority', () => {
    const sold = e('sold', 'success', 0);
    const dangers = [e('d1', 'danger', 100), e('d2', 'danger', 110), e('d3', 'danger', 120)];
    const first = pickShown([sold], new Set(), 3);
    expect(first.map((x) => x.key)).toEqual(['sold']);
    const shown = pickShown([sold, ...dangers], new Set(['sold']), 3);
    expect(shown.map((x) => x.key)).toEqual(['sold', 'd1', 'd2']);
    // the third danger toast waits until a slot frees up — sold is dismissed
    const after = pickShown(dangers, new Set(['d1', 'd2']), 3);
    expect(after.map((x) => x.key)).toEqual(['d1', 'd2', 'd3']);
  });

  it('with no toast on screen, the highest priority goes first, then the oldest', () => {
    const list = [e('i', 'info', 0), e('w', 'warning', 5), e('d', 'danger', 10), e('d0', 'danger', 1)];
    expect(pickShown(list, new Set(), 2).map((x) => x.key)).toEqual(['d0', 'd']);
    expect(pickShown(list, new Set(), 3).map((x) => x.key)).toEqual(['d0', 'w', 'd']);
  });

  it('a toast that left the screen without being dismissed expires after its lifetime instead of returning', () => {
    const t = e('t', 'success', 0, 'Sold Java Fern for $6.');
    expect(isExpired(t, undefined, 100_000)).toBe(false); // never shown: still queued
    expect(isExpired(t, 1000, 1000 + ttlOf('success', t.texts) - 1)).toBe(false);
    expect(isExpired(t, 1000, 1000 + ttlOf('success', t.texts) + 500)).toBe(true);
  });
});

describe('R07-06: danger and death news never wait behind routine toasts', () => {
  const max = 2; // a phone
  it('takes the slot of the least important routine toast once it has been readable for a moment', () => {
    const tip = e('tip', 'info', 0);
    const sale = e('sale', 'market', 10);
    const danger = e('danger', 'danger', 2000);
    const at = new Map([['tip', 100], ['sale', 120]]);
    const out = { bumped: [] as string[] };
    const shown = pickShown([tip, sale, danger], new Set(['tip', 'sale']), max, at, 100 + PREEMPT_AFTER_MS + 1, out);
    expect(shown.map((x) => x.key)).toEqual(['sale', 'danger']);
    expect(out.bumped).toEqual(['tip']);
  });

  it('waits while the routine toasts have only just appeared (no flash), and without the timing it never pre-empts', () => {
    const list = [e('tip', 'info', 0), e('sale', 'market', 10), e('death', 'death', 2000)];
    const at = new Map([['tip', 100], ['sale', 120]]);
    const out = { bumped: [] as string[] };
    expect(pickShown(list, new Set(['tip', 'sale']), max, at, 100 + PREEMPT_AFTER_MS - 1, out).map((x) => x.key)).toEqual(['tip', 'sale']);
    expect(out.bumped).toEqual([]);
    expect(pickShown(list, new Set(['tip', 'sale']), max).map((x) => x.key)).toEqual(['tip', 'sale']);
  });

  it('warnings, celebrations and other urgent news keep their place; two urgent arrivals take two routine slots', () => {
    const at = new Map([['warn', 0], ['party', 0], ['d0', 0]]);
    const urgentOnly = pickShown([e('warn', 'warning', 0), e('party', 'celebrate', 1), e('d1', 'danger', 5)], new Set(['warn', 'party']), max, at, 10_000);
    expect(urgentOnly.map((x) => x.key)).toEqual(['warn', 'party']);
    const held = pickShown([e('d0', 'danger', 0), e('i', 'info', 1), e('d1', 'danger', 5)], new Set(['d0', 'i']), max, new Map([['d0', 0], ['i', 0]]), 10_000);
    expect(held.map((x) => x.key)).toEqual(['d0', 'd1']);
    const out = { bumped: [] as string[] };
    const both = pickShown([e('a', 'info', 0), e('b', 'success', 1), e('d1', 'danger', 5), e('d2', 'death', 6)], new Set(['a', 'b']), max, new Map([['a', 0], ['b', 0]]), 10_000, out);
    expect(both.map((x) => x.key)).toEqual(['d1', 'd2']);
    expect(out.bumped.sort()).toEqual(['a', 'b']);
  });
});

describe('P1-01 / P6-02: long messages get reading time', () => {
  it('adds up to 3.5 s for long lines and 1.2 s for merged bursts', () => {
    expect(ttlOf('info', ['Fed the tank.'])).toBe(3400);
    const welcome = 'Welcome home, Ripple! Your lined seahorse tank is established and ready.';
    expect(ttlOf('info', [welcome])).toBeGreaterThan(3400);
    expect(ttlOf('info', [welcome])).toBeLessThanOrEqual(3400 + 3500);
    expect(ttlOf('warning', ['a'.repeat(400)])).toBe(6500 + 3500);
    expect(ttlOf('unlock', ['Unlocked: A', 'Unlocked: B'])).toBe(5000 + 1200);
  });
});

describe('toast CSS contract', () => {
  const css = readFileSync(new URL('../../src/ui/styles/hud.css', import.meta.url), 'utf8');
  it('desktop titles are no longer clamped to one line (P1-01, P6-02, P7-09)', () => {
    const desktop = css.slice(css.indexOf('@media (min-width: 721px) and (min-height: 501px) {\n  .ag-toasts'));
    const block = desktop.slice(0, desktop.indexOf('\n}'));
    expect(block).toContain('.ag-toast__title { -webkit-line-clamp: 2; }');
    expect(block).not.toMatch(/\.ag-toast__title \{ -webkit-line-clamp: 1; \}/);
    expect(block).toMatch(/\.ag-toast--warning \.ag-toast__title[^{]*\{ -webkit-line-clamp: 3; \}/);
  });
  it('phones relocate the stack under a full-height bottom sheet (P4-06) and give warnings two lines (S12-03)', () => {
    expect(css).toMatch(/:root:has\(\.pn-sheet--bottom\.is-max, \.ag-sheet--bottom\.is-expanded\) \.ag-toasts[^{]*\{[^}]*top: auto;[^}]*bottom:/);
    const phone = css.slice(css.indexOf('/* Phones: one line for routine news'));
    expect(phone.slice(0, phone.indexOf('\n}'))).toMatch(/\.ag-toast--warning \.ag-toast__title[^{]*\{ -webkit-line-clamp: 2; \}/);
  });
});
