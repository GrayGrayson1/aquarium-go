// @vitest-environment node
/**
 * Audit 2026-11-17, B1 — the Alerts drawer with many rows: everything under its title scrolls as one (the drawer used
 * to clip, so the danger rows, Recent events and "Full event log" fell off the bottom), and the Tanks rows come by
 * level across every kind: a tank in danger before a column of low-food rows.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { useGame } from '@/state/game';
import { AlertsPopover } from '@/ui/hud/AlertsPopover';

/** A shop of `n` betta tanks sharing a nearly empty cupboard (every tank: "Low food"). */
function shop(n: number): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 31 });
  for (const id of Object.keys(g.creatures)) delete g.creatures[id];
  for (const id of [...g.tankOrder]) delete g.tanks[id];
  g.tankOrder = [];
  g.isShowcase = false;
  g.log = [];
  g.finance.money = 1000;
  const rng = simRng(g);
  for (let i = 0; i < n; i++) {
    const tank = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: i * 2, z: 0, rotY: 0 } });
    tank.name = `Tank ${i + 1}`;
    addCreature(g, createCreature(g, rng, 'betta', { ageDays: 90 }), tank.id);
    tank.cache.foodLevel = 'low';
  }
  g.inventory.foods = { flake_tropical: 3 };
  return g;
}

function render(g: GameState): string {
  useGame.setState({ game: g });
  Object.assign(useGame.getInitialState(), useGame.getState());
  return renderToStaticMarkup(createElement(AlertsPopover));
}

afterEach(() => {
  useGame.setState({ game: null });
  Object.assign(useGame.getInitialState(), { game: null });
});

describe('B1: the Alerts drawer with many rows', () => {
  it('lists a tank in danger before every low-food row, though its tank comes last', () => {
    const g = shop(8);
    const last = g.tanks[g.tankOrder[7]];
    last.cache.status = 'danger';
    last.cache.statusSource = 'water';
    const out = render(g);
    const rows = [...out.matchAll(/<button[^>]*class="ag-alert-row ([^"]*)"[^>]*>[\s\S]*?class="ag-alert-row__title">([^<]+)</g)].map((m) => `${m[1]} ${m[2]}`);
    expect(rows.filter((r) => r.startsWith('is-watch'))).toHaveLength(8); // one "Low food" row a tank
    expect(rows[0]).toBe('is-danger Tank 8');
    expect(out.indexOf('Danger')).toBeLessThan(out.indexOf('Low food'));
  });

  it('keeps the title and close out of the scrolling body, which holds the rows, Recent events and Full event log', () => {
    const out = render(shop(2));
    const head = out.indexOf('class="ag-alerts-pop__head"');
    const body = out.indexOf('data-testid="alerts-body"');
    expect(head).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(head);
    expect(out.indexOf('data-testid="alerts-close"')).toBeLessThan(body);
    for (const inside of ['>Tanks<', '>Recent events<', 'data-testid="alerts-open-log"']) expect(out.indexOf(inside), inside).toBeGreaterThan(body);
  });

  it('the body scrolls and no section in it shrinks to nothing', () => {
    const hud = readFileSync(new URL('../../src/ui/styles/hud.css', import.meta.url), 'utf8');
    expect(hud).toMatch(/\.ag-alerts-pop__body \{[^}]*min-height: 0;[^}]*overflow-y: auto; overscroll-behavior: contain; \}/);
    expect(hud).toMatch(/\.ag-alerts-pop__body > \* \{ flex-shrink: 0; \}/);
  });

  it('on a phone (upright or sideways) the drawer ends above the tab bar, so its last rows aren’t under it', () => {
    const hud = readFileSync(new URL('../../src/ui/styles/hud.css', import.meta.url), 'utf8');
    const clear = 'calc(100dvh - var(--edge-t) - var(--topbar-h) - var(--dock-h) - var(--edge) - var(--safe-b) - 16px)';
    // (the phone rule, and the sideways block's, which comes later and wins there)
    const phone = hud.indexOf(`.ag-alerts-pop { position: fixed;`);
    const sideways = hud.indexOf(`.ag-alerts-pop { max-height: ${clear}; }`);
    expect(hud.slice(phone, hud.indexOf('\n', phone))).toContain(`max-height: min(72vh, 640px, ${clear})`);
    expect(sideways).toBeGreaterThan(phone);
    expect(hud.lastIndexOf('@media (max-height: 500px) and (orientation: landscape) {', sideways)).toBeGreaterThan(phone);
  });
});
