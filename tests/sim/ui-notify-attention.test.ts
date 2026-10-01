/**
 * lane:notify — tank attention dots: one rule (src/ui/common/notify.ts) for the tank card button, the tank switcher's
 * arrows, Tanks panel rows, the dock and the bell. Live state: dots follow the problem, not a "read" flag.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame, type NewGameOptions } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { installEquipment, setEquipment } from '@/sim/care';
import { attentionSummary, gearFitItems, nearestAttention, navDots, tankAttention, tankAttentionLevel } from '@/ui/common/notify';
import { DOCK_ITEMS } from '@/ui/hud/Dock';
import { getEquipmentDef } from '@/data/catalog/equipment';

function game(starterId: NewGameOptions['starterId'] = 'betta', seed = 5): { s: GameState; tank: Tank } {
  const s = newGame({ starterId, starterName: 'Pip', seed });
  const tank = s.tanks[s.tankOrder[0]];
  return { s, tank };
}

/** A calm, healthy cache (what the sim writes when nothing is wrong). */
function calm(t: Tank) {
  t.cache.status = 'good';
  t.cache.waterStatus = 'good';
  t.cache.animalStatus = 'good';
  t.cache.foodLevel = 'ok';
  t.cache.statusReason = undefined;
  t.cache.statusReasons = [];
  t.cache.statusSource = undefined;
  for (const e of t.equipment) e.failed = false;
}

describe('notify: tank attention level', () => {
  it('a healthy, fed tank with working gear has no dot', () => {
    const { s, tank } = game();
    calm(tank);
    expect(tankAttentionLevel(s, tank.id)).toBe('good');
    const a = tankAttention(s, tank.id);
    expect(a.level).toBe('good');
    expect(a.items).toEqual([]);
    expect(a.label).toBe('');
  });

  it('follows the sim status (water / animals) and says why, pointing at the right tab', () => {
    const { s, tank } = game();
    calm(tank);
    tank.cache.status = 'watch';
    tank.cache.waterStatus = 'watch';
    tank.cache.statusSource = 'water';
    tank.cache.statusReasons = ['Ammonia is rising'];
    expect(tankAttentionLevel(s, tank.id)).toBe('watch');
    let a = tankAttention(s, tank.id);
    expect(a.items[0]).toMatchObject({ level: 'watch', source: 'water', text: 'Ammonia is rising', tab: 'water' });
    expect(a.tabs).toEqual({ water: 'watch' });
    expect(a.label).toBe('Watch — Ammonia is rising');

    tank.cache.status = 'danger';
    tank.cache.waterStatus = 'good';
    tank.cache.animalStatus = 'danger';
    tank.cache.statusSource = 'animals';
    tank.cache.statusReasons = ['Pip is starving — feed right away.'];
    expect(tankAttentionLevel(s, tank.id)).toBe('danger');
    a = tankAttention(s, tank.id);
    expect(a.level).toBe('danger');
    expect(a.tabs).toEqual({ life: 'danger' });
    expect(a.label).toMatch(/^Danger — Pip is starving/);
  });

  it('food running low is worth a look even while the status reads Healthy', () => {
    const { s, tank } = game();
    calm(tank);
    tank.cache.foodLevel = 'low';
    expect(tankAttentionLevel(s, tank.id)).toBe('watch');
    const a = tankAttention(s, tank.id);
    expect(a.items).toHaveLength(1);
    expect(a.items[0]).toMatchObject({ level: 'watch', source: 'food', tab: null });
    expect(a.items[0].text).toMatch(/ in Market › Supplies\.$/); // says what to do
  });

  it('failed gear is amber until repaired, and is named', () => {
    const { s, tank } = game();
    calm(tank);
    const heater = tank.equipment.find((e) => /heater/.test(e.defId)) ?? tank.equipment[0];
    heater.failed = true;
    expect(tankAttentionLevel(s, tank.id)).toBe('watch');
    const a = tankAttention(s, tank.id);
    expect(a.items.some((i) => i.source === 'gear' && i.tab === 'gear' && i.equipmentId === heater.id && /failed — repair or replace it/.test(i.text))).toBe(true);
    expect(a.tabs.gear).toBe('watch');
    heater.failed = false; // repaired: the dot clears by itself
    expect(tankAttentionLevel(s, tank.id)).toBe('good');
  });

  it('does not repeat failed gear the status line already names', () => {
    const { s, tank } = game();
    calm(tank);
    const e = tank.equipment[0];
    e.failed = true;
    const name = getEquipmentDef(e.defId)!.name;
    tank.cache.status = 'watch';
    tank.cache.statusReasons = [`The ${name} has failed.`];
    const a = tankAttention(s, tank.id);
    expect(a.items.filter((i) => i.text.includes(name))).toHaveLength(1);
  });
});

describe('notify: the cheap dot level and the full reasons always agree', () => {
  it('for every mix of status, food and failed gear', () => {
    const { s, tank } = game();
    for (const status of ['good', 'watch', 'danger'] as const)
      for (const food of ['ok', 'low', 'out'] as const)
        for (const failed of [false, true]) {
          calm(tank);
          tank.cache.status = status;
          if (status !== 'good') tank.cache.statusReasons = [status === 'danger' ? 'Ammonia is dangerously high' : 'Nitrate is climbing'];
          tank.cache.foodLevel = food;
          tank.equipment[0].failed = failed;
          const lvl = tankAttentionLevel(s, tank.id);
          expect(tankAttention(s, tank.id).level, `${status}/${food}/${failed}`).toBe(lvl);
          expect(lvl === 'good').toBe(status === 'good' && food === 'ok' && !failed);
        }
  });
});

describe('notify: gear that cannot help (lane "fit")', () => {
  it('an autofeeder in a seahorse-only tank is flagged on the Equipment tab, and clears when switched off', () => {
    const { s, tank } = game('lined_seahorse', 7);
    calm(tank);
    const r = installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    expect(r.ok).toBe(true);
    const af = tank.equipment.find((e) => e.defId === 'autofeeder')!;
    const items = gearFitItems(s, tank);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ source: 'fit', tab: 'gear', level: 'watch', equipmentId: af.id });
    expect(items[0].text).toMatch(/autofeeder/i);
    expect(items[0].text).toMatch(/seahorse/i);
    expect(items[0].text).toMatch(/by hand|target-feed/i); // says what to do instead
    expect(items[0].short).toMatch(/can’t help these animals — see Equipment\.$/);
    expect(tankAttentionLevel(s, tank.id)).toBe('watch');
    expect(tankAttention(s, tank.id).tabs.gear).toBe('watch');
    setEquipment(s, tank.id, af.id, { on: false });
    expect(gearFitItems(s, tank)).toEqual([]);
    expect(tankAttentionLevel(s, tank.id)).toBe('good');
  });

  it('an autofeeder for flake eaters is fine', () => {
    const { s, tank } = game('betta', 9);
    calm(tank);
    installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    expect(gearFitItems(s, tank)).toEqual([]);
    expect(tankAttentionLevel(s, tank.id)).toBe('good');
  });
});

describe('notify: facility summary, switcher cue and dock dots', () => {
  function three() {
    const { s, tank } = game();
    calm(tank);
    const b = createTank(s, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 2, z: 0, rotY: 0 } });
    const c = createTank(s, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 4, z: 0, rotY: 0 } });
    const d = createTank(s, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 6, z: 0, rotY: 0 } });
    for (const t of [b, c, d]) calm(t);
    return { s, a: tank, b, c, d };
  }

  it('counts tanks by their worst level', () => {
    const { s, b, c } = three();
    expect(attentionSummary(s)).toEqual({ watch: 0, danger: 0, total: 0, worst: 'good' });
    b.cache.foodLevel = 'low';
    c.cache.status = 'danger';
    expect(attentionSummary(s)).toEqual({ watch: 1, danger: 1, total: 2, worst: 'danger' });
  });

  it('the switcher arrow points at the most urgent other tank, the short way round', () => {
    const { s, a, b, d } = three();
    expect(nearestAttention(s, a.id)).toBeNull();
    d.cache.status = 'watch'; // order: a b c d — d is one step back
    expect(nearestAttention(s, a.id)).toMatchObject({ dir: -1, tankId: d.id, level: 'watch', steps: 1 });
    b.cache.status = 'danger'; // danger beats watch even when farther
    expect(nearestAttention(s, d.id)).toMatchObject({ dir: 1, tankId: b.id, level: 'danger', steps: 2 });
    // the focused tank never points at itself
    expect(nearestAttention(s, b.id)).toMatchObject({ tankId: d.id, level: 'watch' });
  });

  it('dock: Tanks gets an amber / red dot while another tank needs a look (the one in view has its own)', () => {
    const { s, a, c, d } = three();
    expect(navDots(s, DOCK_ITEMS, a.id).tanks).toBeUndefined();
    c.cache.foodLevel = 'out';
    expect(navDots(s, DOCK_ITEMS, a.id).tanks).toMatchObject({ level: 'watch', target: null, label: `${c.name} needs attention (watch)` });
    expect(navDots(s, DOCK_ITEMS, c.id).tanks).toBeUndefined(); // in view: the Tank card button carries it
    c.cache.status = 'danger';
    d.cache.status = 'watch';
    expect(navDots(s, DOCK_ITEMS, a.id).tanks).toMatchObject({ level: 'danger', label: '2 other tanks need attention (1 in danger, 1 to watch)' });
    expect(navDots(s, DOCK_ITEMS).tanks!.label).toBe('2 tanks need attention (1 in danger, 1 to watch)');
  });
});
