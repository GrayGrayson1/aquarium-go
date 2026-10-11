// @vitest-environment node
/**
 * lane:ui-shell (chunk 3; 0.5 spec §10.3, §7.8, §16, §18; ADR-0023 decision 4) — the Auto-clean row (AUTO-007), its
 * buy flow and toasts, the Water tab's "Auto-clean is on" note, the Supplies and Build line, and the kind label
 * (AUTO-006). Server-rendered.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { installEquipment, setEquipment } from '@/sim/care';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { AutomationSection, AutoCleanNote, buyAutoClean, AUTOMATION_LOCK_HINT } from '@/ui/cards/Automation';
import { EquipRow } from '@/ui/panels/market/Supplies';
import { EQUIPMENT_KIND_LABEL } from '@/ui/common/format';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const tag = (markup: string, testId: string) => new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`).exec(markup)?.[0] ?? '';

function world(o: { changer?: boolean; unlocked?: boolean; money?: number } = {}): { g: GameState; tank: Tank } {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 8 });
  g.isShowcase = false;
  g.finance.money = o.money ?? 1000;
  if (o.unlocked !== false) g.progress.unlocked.push('gear_autofeeder');
  const tank = g.tanks[g.tankOrder[0]] ?? createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
  tank.name = 'Ember’s Tank';
  tank.equipment = tank.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'water_changer');
  if (o.changer) installEquipment(g, tank.id, 'auto_water_changer', { purchased: true });
  return { g, tank };
}

const section = (g: GameState, tank: Tank) => renderToStaticMarkup(createElement(AutomationSection, { g, tank, fits: new Map() }));
const changer = (t: Tank) => t.equipment.find((e) => e.defId === 'auto_water_changer');

afterEach(() => {
  useGame.setState({ game: null });
  useUI.setState({ toasts: [] });
});

describe('AUTO-006: its kind has a label', () => {
  it('Water changer', () => expect(EQUIPMENT_KIND_LABEL.water_changer).toBe('Water changer'));
});

describe('AUTO-007: the Auto-clean row', () => {
  it('not installed: dashed, "Needs an Auto Water Changer", "Buy · $120", and a disabled switch that stays focusable', () => {
    const { g, tank } = world();
    const out = section(g, tank);
    const row = /data-testid="tank-auto-clean-row"[\s\S]*?(?=data-testid="tank-auto-feed-row"|$)/.exec(out)?.[0] ?? out;
    expect(out).toContain('class="ag-auto is-missing" data-testid="tank-auto-clean-row"');
    expect(text(out)).toContain('Auto-clean Small daily water changes and a weekly glass scrape. Needs an Auto Water Changer Buy · $120');
    expect(out).toContain('data-testid="tank-auto-clean-buy"');
    const sw = tag(out, 'tank-auto-clean');
    expect(sw).toMatch(/role="switch"/);
    expect(sw).toMatch(/aria-disabled="true"/);
    expect(sw).not.toMatch(/\sdisabled=""/); // focusable, not disabled
    const why = /aria-describedby="([^"]+)"/.exec(sw)?.[1];
    expect(why && out.includes(`id="${why}"`)).toBe(true);
    expect(row).toBeTruthy();
  });

  it('before the unlock (shared with the Autofeeder): the lock and the Auto-feed row’s hint instead of Buy (ADR-0023)', () => {
    const { g, tank } = world({ unlocked: false });
    const out = section(g, tank);
    expect(out).not.toContain('tank-auto-clean-buy');
    const cleanPart = out.slice(out.indexOf('tank-auto-clean-row'));
    expect(text(cleanPart)).toContain(AUTOMATION_LOCK_HINT);
  });

  it('installed: "Runs your Auto Water Changer · 10% each morning · glass once a week · $0.06/day", the switch on its `on`', () => {
    const { g, tank } = world({ changer: true });
    let out = section(g, tank);
    expect(text(out)).toContain('Auto-clean Runs your Auto Water Changer · 10% each morning · glass once a week · $0.06/day');
    expect(tag(out, 'tank-auto-clean')).toMatch(/aria-checked="true"/);
    expect(tag(out, 'tank-auto-clean')).not.toMatch(/aria-disabled/);
    setEquipment(g, tank.id, changer(tank)!.id, { on: false });
    out = section(g, tank);
    expect(tag(out, 'tank-auto-clean')).toMatch(/aria-checked="false"/);
  });

  it('buying from the tank card: short of money, the design’s toast and nothing bought', () => {
    const { g, tank } = world({ money: 119 });
    useGame.getState().setGame(g);
    buyAutoClean(tank.id);
    const t = useUI.getState().toasts.at(-1)!;
    expect(t).toMatchObject({ label: 'Not enough money', text: 'The Auto Water Changer costs $120.' });
    expect(changer(useGame.getState().game!.tanks[tank.id])).toBeUndefined();
    expect(useGame.getState().game!.finance.money).toBe(119);
  });

  it('buying from the tank card: installed, switched on, paid for, and the celebrate toast', () => {
    const { g, tank } = world({ money: 500 });
    useGame.getState().setGame(g);
    buyAutoClean(tank.id);
    const after = useGame.getState().game!;
    const dev = changer(after.tanks[tank.id])!;
    expect(dev).toBeTruthy();
    expect(dev.on).toBe(true);
    expect(after.finance.money).toBe(380);
    expect(useUI.getState().toasts.at(-1)).toMatchObject({ kind: 'celebrate', label: 'Installed', text: 'Auto Water Changer on Ember’s Tank', detail: 'Auto-clean is on. Switch it off any time on the tank card.' });
  });
});

describe('the Water tab note (§10.3)', () => {
  it('shows only while the device runs', () => {
    const { g, tank } = world({ changer: true });
    const note = () => renderToStaticMarkup(createElement(AutoCleanNote, { tank }));
    expect(text(note())).toBe('Auto-clean is on The Auto Water Changer swaps 10% each morning and scrapes the glass once a week. You can still do it by hand.');
    expect(note()).toContain('data-testid="water-autoclean-note"');
    setEquipment(g, tank.id, changer(tank)!.id, { on: false });
    expect(note()).toBe('');
    setEquipment(g, tank.id, changer(tank)!.id, { on: true });
    changer(tank)!.failed = true;
    expect(note()).toBe('');
    const none = world();
    expect(renderToStaticMarkup(createElement(AutoCleanNote, { tank: none.tank }))).toBe('');
  });
});

describe('Market › Supplies and Build › Equipment (§7.8, §16)', () => {
  it('the Auto Water Changer’s row says what it unlocks and what it costs to run', () => {
    const { g, tank } = world();
    const e = getEquipmentDef('auto_water_changer')!;
    const out = renderToStaticMarkup(createElement(EquipRow, { g, e, fits: true, installed: false, tankId: tank.id }));
    expect(text(out)).toContain('Unlocks the Auto-clean switch on the tank card · upkeep $0.06/day');
    expect(text(out)).toContain('Swaps a small share of the water every morning from a conditioned reservoir and scrapes the front glass once a week.');
  });
});
