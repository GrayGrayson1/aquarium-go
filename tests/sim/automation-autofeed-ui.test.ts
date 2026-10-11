// @vitest-environment node
/**
 * lane:ui-shell (chunk 3; 0.5 spec §10.1, §10.2, §18; B-149) — the tank card's Automation section and its Auto-feed
 * row, server-rendered: the section order (AUTO-003), the four Auto-feed states and their wiring to the Autofeeder's
 * `on` and `setting` (AUTO-004), and the paused alert (AUTO-005): the shared rule, the drawer's row and the sim's
 * once-a-day event.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { installEquipment, setEquipment } from '@/sim/care';
import { autofeedPause, AUTOFEED_PAUSED_HUNGER } from '@/sim/care/autofeed';
import { recommendedServings } from '@/sim/water';
import { inhabitantsOf } from '@/sim/water/env';
import { stepTank } from '@/sim/world';
import { addStaffDirect } from '@/sim/staff';
import { simRng } from '@/sim/rng';
import { getFoodDef } from '@/data/catalog/foods';
import { useGame } from '@/state/game';
import { GearTab } from '@/ui/cards/TankCard';
import { AutomationSection, autoFeedPatch, autoFeedSupply, mealsOf, AUTOMATION_LOCK_HINT } from '@/ui/cards/Automation';
import { AlertsPopover } from '@/ui/hud/AlertsPopover';
import { autofeedPaused, tankAttentionLevel, tankAttention } from '@/ui/common/notify';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function world(o: { feeder?: boolean; unlocked?: boolean; species?: string; n?: number; foods?: Record<string, number> } = {}): { g: GameState; tank: Tank } {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 31 });
  for (const id of Object.keys(g.creatures)) delete g.creatures[id];
  for (const id of [...g.tankOrder]) delete g.tanks[id];
  g.tankOrder = [];
  g.isShowcase = false;
  g.log = [];
  g.finance.money = 1000;
  g.inventory.foods = o.foods ?? { flake_tropical: 90 };
  if (o.unlocked !== false) g.progress.unlocked.push('gear_autofeeder');
  const tank = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
  tank.name = 'Ember’s Tank';
  if (o.feeder !== false) installEquipment(g, tank.id, 'autofeeder', { purchased: true });
  const rng = simRng(g);
  for (let i = 0; i < (o.n ?? 1); i++) {
    const c = createCreature(g, rng, o.species ?? 'betta', { ageDays: 90 });
    if (i === 0) c.name = 'Ember';
    addCreature(g, c, tank.id);
  }
  return { g, tank };
}

const feeder = (t: Tank) => t.equipment.find((e) => e.defId === 'autofeeder')!;
const section = (g: GameState, tank: Tank) => renderToStaticMarkup(createElement(AutomationSection, { g, tank, fits: new Map() }));
const attr = (markup: string, testId: string, name: string) => new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`).exec(markup)?.[0].match(new RegExp(`${name}="([^"]*)"`))?.[1];
const autoFeedSwitch = (m: string) => new RegExp(`<button[^>]*data-testid="tank-auto-feed"[^>]*>`).exec(m)?.[0] ?? '';

afterEach(() => useGame.setState({ game: null }));

describe('AUTO-003: the Equipment tab', () => {
  it('reads Automation, Equipment, Lighting, in that order', () => {
    const { g, tank } = world();
    const out = text(renderToStaticMarkup(createElement(GearTab, { game: g, tank })));
    const a = out.indexOf('Automation');
    const e = out.indexOf('Equipment', a);
    const l = out.indexOf('Lighting', e);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(e).toBeGreaterThan(a);
    expect(l).toBeGreaterThan(e);
  });

  it('the switches are role=switch with the tank in their names; installed rows are tinted, missing ones dashed', () => {
    const { g, tank } = world();
    const out = section(g, tank);
    expect(autoFeedSwitch(out)).toMatch(/role="switch"/);
    expect(attr(out, 'tank-auto-feed', 'aria-label')).toBe('Auto-feed for Ember’s Tank');
    expect(attr(out, 'tank-auto-clean', 'aria-label')).toBe('Auto-clean for Ember’s Tank');
    expect(out).toMatch(/class="ag-auto is-installed" data-testid="tank-auto-feed-row"/);
    expect(out).toMatch(/class="ag-auto is-missing" data-testid="tank-auto-clean-row"/);
  });
});

describe('AUTO-004: the Auto-feed row', () => {
  it('installed and on: the food, servings and days left, and Meals a day bound to the setting', () => {
    const { g, tank } = world();
    setEquipment(g, tank.id, feeder(tank).id, { setting: 3 });
    const out = section(g, tank);
    const food = getFoodDef('flake_tropical')!;
    const per = recommendedServings(g, tank, food);
    const days = Math.floor(90 / (3 * per));
    expect(days).toBeGreaterThanOrEqual(1);
    expect(text(out)).toContain(`Runs your Autofeeder · ${food.name} · 90 servings left · about ${days} day${days === 1 ? '' : 's'}`);
    expect(attr(out, 'tank-auto-feed', 'aria-checked')).toBe('true');
    expect(out).toContain('role="radiogroup" aria-label="Meals a day for Ember’s Tank"');
    for (const n of [1, 2, 3, 4]) expect(attr(out, `tank-auto-feed-meals-${n}`, 'aria-checked')).toBe(String(n === 3));
    expect(text(out)).toContain('Meals a day');
  });

  it('{d} is ⌊servings ÷ (meals × servings per feeding)⌋ and only shows when it is at least 1', () => {
    const { g, tank } = world({ foods: { flake_tropical: 1 } });
    const s = autoFeedSupply(g, tank, feeder(tank))!;
    expect(s.servings).toBe(1);
    expect(s.days).toBeNull();
    expect(text(section(g, tank))).toContain('Runs your Autofeeder · Tropical Flakes · 1 serving left');
    expect(text(section(g, tank))).not.toContain('about');
  });

  it('off, or a legacy 0 meals a day, reads as paused: the switch is off, no meals control, the amber line', () => {
    for (const how of ['off', 'zero'] as const) {
      const { g, tank } = world();
      if (how === 'off') setEquipment(g, tank.id, feeder(tank).id, { on: false });
      else feeder(tank).setting = 0;
      const out = section(g, tank);
      expect(attr(out, 'tank-auto-feed', 'aria-checked')).toBe('false');
      expect(out).not.toContain('tank-auto-feed-meals-');
      expect(text(out)).toContain('90 servings left · paused');
      expect(text(out)).toContain('Paused — feed Ember by hand.');
      expect(mealsOf(feeder(tank))).toBe(how === 'off' ? 2 : 0);
    }
  });

  it('the keeper clause is there only when the tank has a keeper', () => {
    const { g, tank } = world();
    setEquipment(g, tank.id, feeder(tank).id, { on: false });
    addStaffDirect(g, { name: 'Ana Test', role: 'aquarist', skill: 2, trait: 'meticulous', tankIds: [tank.id] });
    expect(text(section(g, tank))).toContain('Paused — feed Ember by hand, or a keeper will on their rounds.');
  });

  it('turning it on from a legacy 0 restores 2 meals a day (B-149); otherwise only `on` changes', () => {
    const { g, tank } = world();
    const f = feeder(tank);
    f.setting = 0;
    f.on = false;
    expect(autoFeedPatch(f, true)).toEqual({ on: true, setting: 2 });
    setEquipment(g, tank.id, f.id, autoFeedPatch(f, true));
    expect(f).toMatchObject({ on: true, setting: 2 });
    f.setting = 3;
    expect(autoFeedPatch(f, true)).toEqual({ on: true });
    expect(autoFeedPatch(f, false)).toEqual({ on: false });
  });

  it('not installed: "Needs an Autofeeder" and "Buy · $35"; before the unlock, the lock and its hint instead', () => {
    const a = world({ feeder: false });
    const out = section(a.g, a.tank);
    expect(text(out)).toContain('Auto-feed Drops a measured portion of dry food on a schedule. Needs an Autofeeder Buy · $35');
    expect(out).toContain('data-testid="tank-auto-feed-buy"');
    expect(attr(out, 'tank-auto-feed', 'aria-disabled')).toBe('true');
    const b = world({ feeder: false, unlocked: false });
    const locked = section(b.g, b.tank);
    expect(text(locked)).toContain(AUTOMATION_LOCK_HINT);
    expect(AUTOMATION_LOCK_HINT).toBe('Research Better Life Support, or build husbandry mastery with regular care.');
    expect(locked).not.toContain('tank-auto-feed-buy');
  });

  it('useless for these animals (seahorses eat no dry food): no servings line', () => {
    const { g, tank } = world({ species: 'lined_seahorse' });
    expect(autoFeedSupply(g, tank, feeder(tank))).toBeNull();
    expect(text(section(g, tank))).toContain('Auto-feed Runs your Autofeeder');
    expect(text(section(g, tank))).not.toContain('servings left');
  });
});

describe('AUTO-005: Auto-feed paused while someone is hungry', () => {
  it('raises at hunger 50 with Auto-feed paused, not at 49, not while it runs with food', () => {
    const { g, tank } = world();
    const ember = Object.values(g.creatures)[0];
    setEquipment(g, tank.id, feeder(tank).id, { on: false });
    expect(AUTOFEED_PAUSED_HUNGER).toBe(50);
    ember.stats.hunger = 49;
    expect(autofeedPaused(g, tank)).toBeNull();
    ember.stats.hunger = 50;
    expect(autofeedPaused(g, tank)).toEqual({ reason: 'off', creatureId: ember.id, name: 'Ember' });
    setEquipment(g, tank.id, feeder(tank).id, { on: true });
    expect(autofeedPaused(g, tank)).toBeNull();
  });

  it('an empty or jammed Autofeeder counts too; the row clears when it runs again or the animals are fed', () => {
    const { g, tank } = world();
    const ember = Object.values(g.creatures)[0];
    ember.stats.hunger = 70;
    g.inventory.foods = {};
    expect(autofeedPause(tank.equipment, inhabitantsOf(g, tank.id), g.inventory.foods)?.reason).toBe('empty');
    g.inventory.foods = { flake_tropical: 50 };
    feeder(tank).failed = true;
    expect(autofeedPaused(g, tank)?.reason).toBe('failed');
    feeder(tank).failed = false;
    expect(autofeedPaused(g, tank)).toBeNull();
    setEquipment(g, tank.id, feeder(tank).id, { on: false });
    ember.stats.hunger = 20;
    expect(autofeedPaused(g, tank)).toBeNull();
  });

  it('the tank’s dot goes amber and the Alerts drawer shows the row with Fix', () => {
    const { g, tank } = world();
    Object.values(g.creatures)[0].stats.hunger = 60;
    setEquipment(g, tank.id, feeder(tank).id, { on: false });
    tank.cache.status = 'good';
    expect(tankAttentionLevel(g, tank.id)).toBe('watch');
    expect(tankAttention(g, tank.id).items.map((i) => i.text)).toContain('Auto-feed is paused — feed Ember by hand.');
    useGame.setState({ game: g });
    Object.assign(useGame.getInitialState(), useGame.getState());
    const out = renderToStaticMarkup(createElement(AlertsPopover));
    const row = /<button[^>]*data-testid="alert-autofeed-paused"[^>]*>[\s\S]*?<\/button>/.exec(out)?.[0] ?? '';
    expect(text(row)).toBe('Ember’s Tank Auto-feed is paused — feed Ember by hand. Fix');
    Object.assign(useGame.getInitialState(), { game: null });
  });

  it('the sim logs it once a game day while it lasts, for the Animal care notification', () => {
    const { g, tank } = world();
    Object.values(g.creatures)[0].stats.hunger = 65;
    setEquipment(g, tank.id, feeder(tank).id, { on: false });
    g.clock.hour = 24 * 2 + 9;
    for (let i = 0; i < 6; i++) {
      g.clock.hour += 6;
      stepTank(g, tank, 6, 'summary', g.clock.hour);
      for (const c of Object.values(g.creatures)) c.stats.hunger = Math.max(c.stats.hunger, 65); // keep them hungry
    }
    const lines = g.log.filter((e) => e.text === 'Ember’s Tank: Auto-feed is paused — feed Ember by hand.');
    expect(lines).toHaveLength(2); // 36 game hours: at the start, then 24 h later
    expect(lines[0]).toMatchObject({ kind: 'warning', tankId: tank.id, toast: true, notice: { topic: 'care', vars: { open: 'equipment' } } });
    expect(lines[1].toast).toBe(false);
  });
});
