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
import { getWaterReport } from '@/sim/water';
import { equipmentOfKind } from '@/data/catalog/equipment';

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

/** The tank's temperature line from the sim's own report (its advice words are what the links read). */
const tempIssue = (g: GameState, tankId: string) => getWaterReport(g, tankId).issues.find((i) => i.param === 'temp' && i.status !== 'good');
const gearRowOf = (tank: Tank, e: EquipmentInstance, label: string) => ({ label, to: { kind: 'card', tankId: tank.id, tab: 'gear', fix: `equip-${e.id}` } });
const buy = (tank: Tank, kind: string, label: string) => ({ label, to: { kind: 'panel', panel: 'build', target: `equipment:${tank.id}:${kind}`, glow: `[data-testid="panel-build"] [data-equip-kind="${kind}"]` } });
/** A unit of `kind` added to the tank (a copy of the tank's first unit's instance, with that kind's first def). */
const addUnit = (tank: Tank, kind: string, extra: Partial<EquipmentInstance> = {}): EquipmentInstance => {
  const def = equipmentOfKind(kind as Parameters<typeof equipmentOfKind>[0])[0];
  const e: EquipmentInstance = { ...tank.equipment[0], id: `test_${kind}`, defId: def.id, on: true, failed: false, condition: 1, ...extra };
  delete (e as { failMode?: unknown }).failMode;
  delete (e as { setting?: unknown }).setting;
  Object.assign(e, extra);
  tank.equipment.push(e);
  return e;
};

describe('QOL-002: the sim’s own advice picks the fix (reviewer B4)', () => {
  it('a heater set too low → that heater’s row (its setting), not "Buy a heater"', () => {
    const { g, tank } = setup();
    const heater = unitOf(tank, 'heater')!;
    heater.setting = 20;
    tank.water.tempC = 20;
    const issue = tempIssue(g, tank.id)!;
    expect(issue.advice).toMatch(/^Raise the heater setting/);
    expect(fixForWaterIssue(tank, issue)).toEqual(gearRowOf(tank, heater, 'Open Equipment'));
  });
  it('a heater set too high → that heater’s row', () => {
    const { g, tank } = setup();
    const heater = unitOf(tank, 'heater')!;
    heater.setting = 33;
    tank.water.tempC = 33;
    const issue = tempIssue(g, tank.id)!;
    expect(issue.advice).toMatch(/^Turn the heater down/);
    expect(fixForWaterIssue(tank, issue)).toEqual(gearRowOf(tank, heater, 'Open Equipment'));
  });
  it('too warm with nothing that cools → a chiller, never a heater', () => {
    const { g, tank } = setup();
    tank.equipment = tank.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'heater');
    tank.water.tempC = 33;
    const issue = tempIssue(g, tank.id)!;
    expect(issue.advice).toMatch(/Add a chiller, or a clip-on fan/);
    expect(fixForWaterIssue(tank, issue)).toEqual(buy(tank, 'chiller', 'Buy a chiller'));
  });
  it('too cold with no heater → Buy a heater; a too-small heater → Buy a heater', () => {
    const { tank } = setup();
    const bare = { ...tank, equipment: tank.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'heater') };
    expect(fixForWaterIssue(bare, { text: 'Too cold.', advice: 'Add a heater sized for this tank (about 3–5 W per gallon).', param: 'temp' })).toEqual(buy(tank, 'heater', 'Buy a heater'));
    expect(fixForWaterIssue(tank, { text: 'The heater is too small for this tank.', advice: 'Add a second heater or install a more powerful one.', param: 'temp' })).toEqual(buy(tank, 'heater', 'Buy a heater'));
  });
  it('a chiller set too warm → the chiller’s row; a heater fighting the chiller → the heater’s row', () => {
    const { tank } = setup();
    const chiller = addUnit(tank, 'chiller');
    const heater = unitOf(tank, 'heater')!;
    expect(fixForWaterIssue(tank, { text: 'Too warm.', advice: 'Lower the chiller setting and the heater.', param: 'temp' })).toEqual(gearRowOf(tank, chiller, 'Open Equipment'));
    expect(fixForWaterIssue(tank, { text: 'They fight each other.', advice: 'Set the heater at least 1 °C below the chiller setting.', param: 'temp' })).toEqual(gearRowOf(tank, heater, 'Open Equipment'));
  });
  it('"A heater has failed" (no name in the line) → that heater’s Repair', () => {
    const { tank } = setup();
    const heater = unitOf(tank, 'heater')!;
    heater.failed = true;
    heater.failMode = 'off';
    expect(fixForWaterIssue(tank, { text: 'Too cold.', advice: 'A heater has failed — repair or replace it.', param: 'temp' })).toEqual(gearRowOf(tank, heater, 'Repair'));
  });
  it('a light: dim with room to brighten → Lighting; already at full → Buy a light; burned out → Repair', () => {
    const { tank } = setup();
    const light = unitOf(tank, 'light') ?? addUnit(tank, 'light');
    const raise = { text: 'Corals need stronger light.', advice: 'Raise the intensity or install a stronger light.', param: 'light' as const };
    tank.lighting = { ...tank.lighting, intensity: 0.5 };
    expect(fixForWaterIssue(tank, raise)).toEqual({ label: 'Lighting', to: { kind: 'card', tankId: tank.id, tab: 'gear', fix: 'lighting' } });
    tank.lighting = { ...tank.lighting, intensity: 1.5 }; // the Lighting slider's top
    expect(fixForWaterIssue(tank, raise)).toEqual(buy(tank, 'light', 'Buy a light'));
    light.failed = true;
    light.failMode = 'off';
    expect(fixForWaterIssue(tank, { text: 'The light has burned out.', advice: 'Install a light — animals need a day/night rhythm.', param: 'light' })).toEqual(gearRowOf(tank, light, 'Repair'));
  });
  it('a failed filter → its Repair; a filter-bound overstock → Buy a filter', () => {
    const { tank } = setup();
    const filter = unitOf(tank, 'filter')!;
    filter.failed = true;
    filter.failMode = 'off';
    expect(fixForWaterIssue(tank, { text: 'Filtration is failing.', advice: 'Repair or replace the filter.', param: 'filtration' })).toEqual(gearRowOf(tank, filter, 'Repair'));
    filter.failed = false;
    expect(fixForWaterIssue(tank, { text: 'Overstocked.', advice: 'Upgrade or add a filter, or rehome some animals.', param: 'stocking' })).toEqual(buy(tank, 'filter', 'Buy a filter'));
    expect(fixForWaterIssue(tank, { text: 'Overstocked.', advice: 'Move some animals to another tank or upgrade to a larger aquarium.', param: 'stocking' })?.label).toBe('Open Livestock');
  });
});

describe('QOL-002: a unit that is installed but not running is the fix, not a new one (reviewer N1)', () => {
  const tempIssues = (g: GameState, tankId: string) => getWaterReport(g, tankId).issues.filter((i) => i.param === 'temp' && i.status !== 'good');
  it('the only heater failed: every temperature line from the sim goes to its Repair', () => {
    const { g, tank } = setup();
    const heater = unitOf(tank, 'heater')!;
    heater.failed = true;
    heater.failMode = 'off';
    tank.water.tempC = 22; // the room
    const issues = tempIssues(g, tank.id);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.map((i) => i.advice).join(' ')).toMatch(/Add a heater sized for this tank|Install a heater/);
    for (const i of issues) expect(fixForWaterIssue(tank, i)).toEqual(gearRowOf(tank, heater, 'Repair'));
  });
  it('the only heater switched off: its row (the switch), not "Buy a heater"', () => {
    const { g, tank } = setup();
    const heater = unitOf(tank, 'heater')!;
    heater.on = false;
    tank.water.tempC = 22;
    const issues = tempIssues(g, tank.id);
    expect(issues.length).toBeGreaterThan(0);
    for (const i of issues) expect(fixForWaterIssue(tank, i)).toEqual(gearRowOf(tank, heater, 'Open Equipment'));
  });
  it('too warm with the chiller failed: its Repair, not "Buy a chiller"', () => {
    const { g, tank } = setup();
    tank.equipment = tank.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'heater');
    const chiller = addUnit(tank, 'chiller', { failed: true, failMode: 'off' });
    tank.water.tempC = 33;
    const issue = tempIssue(g, tank.id)!;
    expect(issue.advice).toMatch(/Add a chiller, or a clip-on fan/);
    expect(fixForWaterIssue(tank, issue)).toEqual(gearRowOf(tank, chiller, 'Repair'));
  });
  it('"A heater has failed" picks the heater, not a failed chiller listed first', () => {
    const { tank } = setup();
    const heater = unitOf(tank, 'heater')!;
    const chiller = addUnit(tank, 'chiller', { failed: true, failMode: 'off' });
    tank.equipment = [chiller, ...tank.equipment.filter((e) => e !== chiller)];
    heater.failed = true;
    heater.failMode = 'off';
    expect(fixForWaterIssue(tank, { text: 'Too cold.', advice: 'A heater has failed — repair or replace it.', param: 'temp' })).toEqual(gearRowOf(tank, heater, 'Repair'));
  });
  it('a burned-out light only answers "Install a light": a second, working light that is too bright goes to Lighting', () => {
    const { tank } = setup();
    const working = unitOf(tank, 'light') ?? addUnit(tank, 'light');
    const burned = addUnit(tank, 'light', { id: 'test_light_2', failed: true, failMode: 'off' });
    expect(working.failed).toBeFalsy();
    expect(fixForWaterIssue(tank, { text: 'This light is bright for Ember.', advice: 'Lower the intensity or add floating plants and caves for shade.', param: 'light' })).toEqual({ label: 'Lighting', to: { kind: 'card', tankId: tank.id, tab: 'gear', fix: 'lighting' } });
    tank.equipment = tank.equipment.filter((e) => e !== working);
    expect(fixForWaterIssue(tank, { text: 'The light has burned out.', advice: 'Install a light — animals need a day/night rhythm.', param: 'light' })).toEqual(gearRowOf(tank, burned, 'Repair'));
  });
  it('an overstock bound by a broken filter: its Repair, not a new filter', () => {
    const { tank } = setup();
    const filter = unitOf(tank, 'filter')!;
    filter.failed = true;
    filter.failMode = 'off';
    expect(fixForWaterIssue(tank, { text: 'Overstocked.', advice: 'Upgrade or add a filter, or rehome some animals.', param: 'stocking' })).toEqual(gearRowOf(tank, filter, 'Repair'));
    expect(fixForWaterIssue(tank, { text: 'Filter capacity is insufficient.', advice: 'Add a second filter or upgrade to a larger one.', param: 'filtration' })).toEqual(gearRowOf(tank, filter, 'Repair'));
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
