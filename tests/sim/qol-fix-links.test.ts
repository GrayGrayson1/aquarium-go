/**
 * chunk 19 (ADR-0055 decision 2, QOL-002) — every problem the tank card names links to where it's fixed: water issues
 * to their control, failed and worn gear to its row (with Repair), missing gear to Build › Equipment on that kind, food
 * to Market › Supplies, hungry animals to the food picker.
 */
import { describe, expect, it } from 'vitest';
import type { EquipmentInstance, GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { fixForAttention, fixForWaterIssue } from '@/ui/common/fixLinks';
import { tankAttention, tankAttentionLevel, WORN_BELOW } from '@/ui/common/notify';

const setup = (): { g: GameState; tank: Tank } => {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
  return { g, tank: g.tanks[g.tankOrder[0]] };
};
const unitOf = (tank: Tank, kind: string): EquipmentInstance | undefined => tank.equipment.find((e) => getEquipmentDef(e.defId)?.kind === kind);

describe('QOL-002: water issues link to their fix', () => {
  it('ammonia, nitrite and nitrate → the water change', () => {
    const { tank } = setup();
    for (const param of ['ammonia', 'nitrite', 'nitrate'] as const) {
      expect(fixForWaterIssue(tank, { text: 'x', advice: 'Do a 30–50% water change.', param })).toEqual({ label: 'Water change', to: { kind: 'card', tankId: tank.id, tab: 'water', fix: 'water-change' } });
    }
  });
  it('evaporation → Top off; algae → Clean glass; low KH → Dose buffer; a new filter → Bottled bacteria', () => {
    const { tank } = setup();
    expect(fixForWaterIssue(tank, { text: 'x', advice: 'Top off with fresh water.', param: 'level' })?.label).toBe('Top off');
    expect(fixForWaterIssue(tank, { text: 'x', advice: 'Scrape the glass, shorten the lighting.', param: 'algae' })?.label).toBe('Clean glass');
    expect(fixForWaterIssue(tank, { text: 'x', advice: 'Dose buffer and keep up with water changes.', param: 'kh' })?.label).toBe('Dose buffer');
    expect(fixForWaterIssue(tank, { text: 'x', param: 'cycle' })?.label).toBe('Bottled bacteria');
  });
  it('no heater → Build › Equipment on Heaters', () => {
    const { tank } = setup();
    const bare = { ...tank, equipment: tank.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'heater') };
    const link = fixForWaterIssue(bare, { text: 'There is no heater…', advice: 'Install a heater set to the middle of their range.', param: 'temp' });
    expect(link).toEqual({ label: 'Buy a heater', to: { kind: 'panel', panel: 'build', target: `equipment:${tank.id}:heater`, glow: '[data-testid="panel-build"] [data-equip-kind="heater"]' } });
  });
  it('a failed unit the issue names → its row: Repair, or Switch it off when stuck on', () => {
    const { tank } = setup();
    const heater = unitOf(tank, 'heater')!;
    const name = getEquipmentDef(heater.defId)!.name;
    heater.failed = true;
    heater.failMode = 'off';
    expect(fixForWaterIssue(tank, { text: `The ${name} has failed.`, advice: 'Repair or replace it.' })).toEqual({ label: 'Repair', to: { kind: 'card', tankId: tank.id, tab: 'gear', fix: `equip-${heater.id}` } });
    heater.failMode = 'stuck_on';
    heater.on = true;
    expect(fixForWaterIssue(tank, { text: `The ${name}'s thermostat has stuck on.`, advice: 'Switch it off now.' })?.label).toBe('Switch it off');
  });
  it('mixing animals that need different water → Livestock', () => {
    const { tank } = setup();
    expect(fixForWaterIssue(tank, { text: 'No pH suits all of these animals.', advice: 'Rehome one group to a tank with water that suits it.', param: 'ph' })?.to).toEqual({ kind: 'panel', panel: 'livestock', target: null });
  });
});

describe('QOL-002: attention items link to their fix', () => {
  it('food running low → Market › Supplies on the food to buy', () => {
    const { g, tank } = setup();
    for (const id of Object.keys(g.inventory.foods)) g.inventory.foods[id] = 0;
    const link = fixForAttention(g, tank, { source: 'food', text: 'Food is running low' }, null);
    expect(link?.to).toMatchObject({ kind: 'panel', panel: 'market' });
    expect((link?.to as { target: string }).target).toMatch(/^food:|^tab:supplies$/);
  });
  it('a hungry animal → the food picker', () => {
    const { g, tank } = setup();
    expect(fixForAttention(g, tank, { source: 'animals', text: 'Ember is starving — feed right away.' }, null)).toEqual({ label: 'Feed', to: { kind: 'feed', tankId: tank.id } });
  });
  it('an animal named for another reason → its card', () => {
    const { g, tank } = setup();
    const c = Object.values(g.creatures).find((x) => x.tankId === tank.id)!;
    expect(fixForAttention(g, tank, { source: 'animals', text: `${c.name} is stressed.` }, null)).toEqual({ label: `See ${c.name}`, to: { kind: 'creature', tankId: tank.id, creatureId: c.id } });
  });
  it('the water line → the water report’s first issue', () => {
    const { g, tank } = setup();
    const link = fixForAttention(g, tank, { source: 'water', text: 'Ammonia spike — act now' }, { issues: [{ status: 'danger', text: 'Ammonia 1.1 ppm', advice: 'Do a 30–50% water change.', param: 'ammonia' }] });
    expect(link?.label).toBe('Water change');
  });
});

describe('QOL-002: worn gear', () => {
  it('is named on the card with Repair, and makes the tank worth a look', () => {
    const { g, tank } = setup();
    expect(tankAttentionLevel(g, tank.id)).toBe('good');
    const unit = unitOf(tank, 'filter')!;
    unit.condition = WORN_BELOW - 0.05;
    const item = tankAttention(g, tank.id).items.find((i) => i.equipmentId === unit.id);
    expect(item?.text).toMatch(/is wearing out \(\d+%\) — repair it before it fails\.$/);
    expect(tankAttentionLevel(g, tank.id)).toBe('watch');
    expect(fixForAttention(g, tank, item!, null)).toEqual({ label: 'Repair', to: { kind: 'card', tankId: tank.id, tab: 'gear', fix: `equip-${unit.id}` } });
  });
  it('is not named while above the line, nor once it has failed (the failure has its own line)', () => {
    const { g, tank } = setup();
    const unit = unitOf(tank, 'filter')!;
    unit.condition = WORN_BELOW + 0.01;
    expect(tankAttention(g, tank.id).items.some((i) => /wearing out/.test(i.text))).toBe(false);
    unit.condition = 0.05;
    unit.failed = true;
    expect(tankAttention(g, tank.id).items.some((i) => /wearing out/.test(i.text))).toBe(false);
  });
});
