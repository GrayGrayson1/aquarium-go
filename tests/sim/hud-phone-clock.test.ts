// @vitest-environment node
/**
 * Audit 2026-11-17 (area B) — the phone's clock pill: the amber manual-mode pill keeps its Hand and its time at 390 px
 * (B3, AUTO-042); phones show the day above the time (B9), and "Paused" there while the game is paused (B15).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { holdAll } from '@/sim/automation';
import { useGame } from '@/state/game';
import { TopBar } from '@/ui/hud/TopBar';

const hud = readFileSync(new URL('../../src/ui/styles/hud.css', import.meta.url), 'utf8');
/** Selectors of every one-declaration `{ display: none; }` rule. */
const hidden = [...hud.matchAll(/^\s*([^{}\n]+?)\s*\{\s*display: none;\s*\}/gm)].map((m) => m[1]);
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function bar(g: GameState, compact: boolean): string {
  useGame.setState({ game: g });
  Object.assign(useGame.getInitialState(), useGame.getState());
  return renderToStaticMarkup(createElement(TopBar, { compact }));
}
/** The clock pill's markup (the ordinary one, or the manual-mode button), up to the end of its time row. */
function pill(markup: string): string {
  const at = markup.search(/<(div|button) [^>]*class="ag-hudpill ag-clock-pill/);
  return markup.slice(at, markup.indexOf('</div>', markup.indexOf('data-testid="hud-clock"', at)) + 6);
}
/** The time row's text. */
const timeRow = (markup: string) => text(/data-testid="hud-clock">([\s\S]*?)<\/div>/.exec(markup)?.[1] ?? '');

/** Day 12, 14:30, playing at 1×. */
function shop(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
  g.clock.hour = 11 * 24 + 14.5;
  g.clock.speed = 1;
  return g;
}

afterEach(() => {
  useGame.setState({ game: null });
  Object.assign(useGame.getInitialState(), { game: null });
});

describe('B3: the amber manual-mode pill on a phone', () => {
  it('no rule hides its Hand or its time', () => {
    const clock = hidden.filter((s) => /ag-clock-pill__(icon|time)/.test(s));
    expect(clock.length).toBeGreaterThan(0);
    for (const s of clock) expect(s, s).toContain(':not(.is-manual)');
  });
});

describe('B9: the day on a phone', () => {
  it('sits above the time, where the shop’s name goes on a desktop', () => {
    const out = pill(bar(shop(), true));
    expect(out).toMatch(/<span class="ag-clock-pill__day" data-testid="hud-day">Day 12<\/span><div class="ag-clock-pill__time"/);
    expect(timeRow(out)).toBe('2:30 PM');
    expect(out).not.toContain('ag-clock-pill__shop');
  });

  it('desktop keeps the shop’s name over “Day 12 · 2:30 PM”', () => {
    const out = pill(bar(shop(), false));
    expect(out).not.toContain('hud-day');
    expect(text(out)).toContain('Day 12 · 2:30 PM');
  });

  it('the amber manual-mode pill shows it too', () => {
    const g = shop();
    g.progress.unlocked.push('operations_desk');
    holdAll(g);
    const out = pill(bar(g, true));
    expect(out).toContain('data-testid="hud-manual-mode"');
    expect(text(out)).toBe('Day 12 2:30 PM');
  });
});

describe('B15: “Paused” on a phone', () => {
  it('takes the day’s line while the game is paused, and gives it back at 1×', () => {
    const g = shop();
    g.clock.speed = 0;
    expect(pill(bar(g, true))).toContain('<span class="ag-clock-pill__day is-paused" data-testid="hud-day">Paused</span>');
    expect(timeRow(pill(bar(g, true)))).toBe('2:30 PM');
    g.clock.speed = 1;
    expect(pill(bar(g, true))).toContain('data-testid="hud-day">Day 12</span>');
  });

  it('the desktop pill is unchanged (its speed control says “Paused”)', () => {
    const g = shop();
    g.clock.speed = 0;
    const out = bar(g, false);
    expect(pill(out)).not.toContain('Paused');
    expect(out).toMatch(/<span class="ag-speed__label" aria-hidden="true">Paused<\/span>/);
  });
});

describe('B15 review: the shared-shop pill on a phone says “Paused” too', () => {
  it('its time line reads Paused while the shop is paused', async () => {
    const { SharedPill } = await import('@/ui/shared/SharedMenu');
    const g = shop();
    g.clock.speed = 0;
    useGame.setState({ game: g });
    Object.assign(useGame.getInitialState(), useGame.getState());
    const out = renderToStaticMarkup(createElement(SharedPill, { compact: true }));
    expect(timeRow(out)).toBe('Paused');
    g.clock.speed = 1;
    expect(timeRow(renderToStaticMarkup(createElement(SharedPill, { compact: true })))).toBe('2:30 PM');
  });
});
