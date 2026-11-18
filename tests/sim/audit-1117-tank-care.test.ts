// @vitest-environment node
/**
 * Audit 2026-11-17, area C (keeping a tank healthy: water, equipment, feeding, dosing and the advice the game gives).
 * Each block pins one finding from that audit.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useGame } from '@/state/game';
import { GearTab, WaterTab } from '@/ui/cards/TankCard';
import { useSettings } from '@/state/settings';
import { Overview } from '@/ui/panels/operations/Overview';
import { WaterTab as OpsWaterTab } from '@/ui/panels/operations/WaterTab';
import { opsSnapshot, opsTier, type OpsSnapshot } from '@/ui/common/ops';
import { unlock } from '@/sim/facility';
import { facility } from './support/automation';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { getWaterReport, tankDailyCost, STOCKING_WATCH, STOCKING_DANGER } from '@/sim/water';
import { waterChange, waterChangeCost, dose, installEquipment, feedTank, removeEquipment, removeEquipmentWarning, topOff, repairEquipment, REPAIR_FROM } from '@/sim/care';
import { DECOR } from '@/data/catalog/decor';
import { installedFit, equipmentFit } from '@/sim/care/fit';
import { storedEquipmentList } from '@/ui/panels/build/BuildPanel';
import { convertWaterClass, convertWaterClassCost } from '@/sim/tankOps';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { fixForWaterIssue, fixForAttention } from '@/ui/common/fixLinks';
import { refreshTankCache } from '@/sim/world';
import { getSpecies } from '@/data/species';
import { FOODS, eatsFood, FOOD_TAG_NAMES, foodTagNames, joinFoodNames } from '@/data/catalog/foods';
import { tankAttention } from '@/ui/common/notify';
import { buyTank } from '@/sim/economy';
import { addCreature, createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';

type Starter = 'betta' | 'ocellaris_clownfish' | 'axolotl' | 'lined_seahorse';
const base = (starter: Starter = 'betta') => newGame({ starterId: starter, starterName: 'Test', seed: 99 });
const firstTank = (s: GameState) => s.tanks[s.tankOrder[0]];

describe('C1: a water change the salt can’t cover is refused, as the keepers’ and the Auto Water Changer’s are', () => {
  it('refuses a 50% change with 0.6 kg of salt, says what it needs and has, and leaves the water alone', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    s.inventory.salt = 0.6;
    const sg = t.water.salinitySG;
    const need = waterChangeCost(s, t.id, 0.5).saltKg;
    expect(need).toBeGreaterThan(0.6);
    const r = waterChange(s, t.id, 0.5);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/^Changing 50% of this tank needs about \d+\.\d kg of salt mix, and you have 0\.6 kg\. Buy marine salt mix in Market › Supplies first/);
    expect(t.water.salinitySG).toBe(sg);
    expect(s.inventory.salt).toBe(0.6);
  });

  it('offers a smaller change only when the salt covers the smallest one, and says "none" when it is gone', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    s.inventory.salt = waterChangeCost(s, t.id, 0.1).saltKg + 0.05;
    expect(waterChange(s, t.id, 0.5).message).toMatch(/, or change less water\.$/);
    s.inventory.salt = 0;
    const r = waterChange(s, t.id, 0.25);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/and you have none\. Buy marine salt mix in Market › Supplies first\.$/);
  });

  it('still changes the water when the salt covers it exactly', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    const sg = t.water.salinitySG;
    s.inventory.salt = waterChangeCost(s, t.id, 0.25).saltKg + 0.001;
    const r = waterChange(s, t.id, 0.25);
    expect(r.ok).toBe(true);
    expect(r.message).not.toMatch(/ran short of salt/);
    expect(Math.abs(t.water.salinitySG - sg)).toBeLessThan(0.002);
  });

  it('low-salinity advice says to dose back up now, not 0.001 a day', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    t.water.salinitySG = 1.016;
    const p = getWaterReport(s, t.id).params.find((x) => x.key === 'salinity')!;
    expect(p.status).not.toBe('good');
    expect(p.advice).toBe('Dose salt mix until it reads at least 1.023 — each dose adds 0.001.');
    s.inventory.salt = 5;
    const r = dose(s, t.id, 'salt');
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/Dose again until it reads at least 1\.023\.$/);
    expect(r.message).not.toMatch(/0\.001 a day/);
  });
});

describe('C3: an installed heater, chiller or light that is failed or switched off is named, not "add one"', () => {
  const unitOf = (s: GameState, kind: string) => firstTank(s).equipment.find((e) => getEquipmentDef(e.defId)?.kind === kind)!;
  const all = (s: GameState) => getWaterReport(s, firstTank(s).id).issues.map((i) => `${i.text} ${i.advice ?? ''}`).join(' ');

  it('the betta’s only heater failed: "Repair the …", never "There is no heater" or "Add a heater"', () => {
    const s = base('betta');
    const heater = unitOf(s, 'heater');
    heater.failed = true;
    heater.failMode = 'off';
    firstTank(s).water.tempC = 22;
    const name = getEquipmentDef(heater.defId)!.name;
    const temp = getWaterReport(s, firstTank(s).id).params.find((p) => p.key === 'temp')!;
    expect(temp.advice).toBe(`Repair the ${name}.`);
    expect(all(s)).not.toMatch(/There is no heater|Add a heater|Install a heater/);
  });

  it('the betta’s only heater switched off: says so, and its link is "Switch it on"', () => {
    const s = base('betta');
    const heater = unitOf(s, 'heater');
    heater.on = false;
    firstTank(s).water.tempC = 22;
    const name = getEquipmentDef(heater.defId)!.name;
    const rep = getWaterReport(s, firstTank(s).id);
    expect(rep.params.find((p) => p.key === 'temp')!.advice).toBe(`The ${name} is switched off — switch it on.`);
    const line = rep.issues.find((i) => i.text.startsWith(`The ${name} is switched off, and the room keeps this tank near`))!;
    expect(line.advice).toBe('Switch it on.');
    expect(all(s)).not.toMatch(/There is no heater|Add a heater/);
    expect(fixForWaterIssue(firstTank(s), line)?.label).toBe('Switch it on');
  });

  it('the axolotl’s chiller failed on a warm day: "Repair the …", not "Add a chiller"', () => {
    const s = base('axolotl');
    const chiller = unitOf(s, 'chiller');
    expect(chiller).toBeDefined();
    chiller.failed = true;
    chiller.failMode = 'off';
    firstTank(s).water.tempC = 24;
    const temp = getWaterReport(s, firstTank(s).id).params.find((p) => p.key === 'temp')!;
    expect(temp.advice).toBe(`Repair the ${getEquipmentDef(chiller.defId)!.name}.`);
  });

  it('a light switched off or burned out is named, with its own headline', () => {
    const s = base('betta');
    const light = unitOf(s, 'light');
    const name = getEquipmentDef(light.defId)!.name;
    light.on = false;
    let p = getWaterReport(s, firstTank(s).id).params.find((x) => x.key === 'light')!;
    expect(p.reason).toBe(`The ${name} is switched off.`);
    expect(p.advice).toMatch(/^Switch it on — /);
    expect(fixForWaterIssue(firstTank(s), { text: p.reason!, advice: p.advice, param: 'light' })?.label).toBe('Switch it on');
    light.on = true;
    light.failed = true;
    light.failMode = 'off';
    p = getWaterReport(s, firstTank(s).id).params.find((x) => x.key === 'light')!;
    expect(p.reason).toBe(`The ${name} has burned out.`);
    expect(p.advice).toMatch(new RegExp(`^Repair the ${name} — `));
    expect(fixForWaterIssue(firstTank(s), { text: p.reason!, advice: p.advice, param: 'light' })?.label).toBe('Repair');
  });
});

describe('C4: a dose that can’t help is refused before it is paid for, and says so', () => {
  it('bottled bacteria in an established filter: refused, nothing charged', () => {
    const s = base('betta');
    const t = firstTank(s);
    s.finance.money = 500;
    t.water.bioMaturity = 0.95;
    const r = dose(s, t.id, 'bacteria');
    expect(r).toEqual({ ok: false, message: 'The filter is already fully established — no need for bottled bacteria.' });
    expect(s.finance.money).toBe(500);
    t.water.bioMaturity = 0.5;
    expect(dose(s, t.id, 'bacteria').ok).toBe(true);
    expect(s.finance.money).toBeLessThan(500);
  });

  it('buffer at the top of what the animals like: refused, nothing charged', () => {
    const s = base('betta');
    const t = firstTank(s);
    s.finance.money = 500;
    t.water.kh = 14;
    const r = dose(s, t.id, 'buffer');
    expect(r.ok).toBe(false);
    expect(r.message).toBe('KH is already 14.0 dKH — more buffer would push it and the pH higher than your animals like.');
    expect(s.finance.money).toBe(500);
    expect(t.water.kh).toBe(14);
  });

  it('conditioner with nothing to bind says what it does, not "the cause still needs fixing"', () => {
    const s = base('betta');
    const t = firstTank(s);
    s.finance.money = 500;
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    const r = dose(s, t.id, 'conditioner');
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/^There’s no ammonia or nitrite in the water right now\. The conditioner will bind any that appears over the next day\./);
    expect(r.message).not.toMatch(/cause still needs fixing/);
  });
});

describe('C5: a new tank’s advice says what to watch and how long, not "wait until ammonia reads zero"', () => {
  it('the bought-tank tip names the Biological filter and the time it takes', () => {
    const s = base('betta');
    s.finance.money = 1e5;
    const r = buyTank(s, 'g29', 'freshwater_tropical');
    expect(r.ok).toBe(true);
    const tip = s.log.find((e) => e.kind === 'tip' && e.tankId === r.tankId)!;
    expect(tip.text).toMatch(/until the tank card’s Biological filter reads Mature before adding animals — about a week, or a few days with bottled bacteria\.$/);
    expect(tip.text).not.toMatch(/read zero/);
  });

  it('an empty, uncycled tank’s advice says the bacteria fade without food', () => {
    const s = base('betta');
    s.finance.money = 1e5;
    const id = buyTank(s, 'g29', 'freshwater_tropical').tankId!;
    const p = getWaterReport(s, id).params.find((x) => x.key === 'cycle')!;
    expect(p.advice).toMatch(/about a week, or a few days with bottled bacteria or mature filter media\. Without food or animals the bacteria fade\.$/);
  });
});

describe('C6: temperature advice aims at what suits the animals, and calls a split a compatibility problem', () => {
  it('an axolotl in a tank with its heater at 25.5 °C is told to turn it down below the axolotl’s maximum', () => {
    const s = base('axolotl');
    const t = firstTank(s);
    t.equipment = t.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'chiller');
    t.equipment.push({ id: 'test_heater', defId: 'heater_50w', installedHour: 0, condition: 1, on: true, setting: 25.5 });
    t.water.tempC = 25.5;
    const advice = getWaterReport(s, t.id).params.find((p) => p.key === 'temp')!.advice!;
    const m = /^Turn the heater down to about ([\d.]+) °C\.$/.exec(advice);
    expect(m, advice).not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(18);
  });

  it('never says to turn the heater "down" to a warmer number', () => {
    const s = base('betta');
    const t = firstTank(s);
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    heater.setting = 24;
    t.water.tempC = 29; // warmer than the betta likes, but not from this heater
    const advice = getWaterReport(s, t.id).params.find((p) => p.key === 'temp')!.advice!;
    expect(advice).not.toMatch(/Turn the heater down/);
  });

  it('too warm for one group and too cold for another: rehome, not "cool it" or "heat it"', () => {
    const s = base('betta');
    const t = firstTank(s);
    const rng = simRng(s);
    addCreature(s, createCreature(s, rng, 'axolotl', { ageDays: 200 }), t.id);
    addCreature(s, createCreature(s, rng, 'discus', { ageDays: 200 }), t.id);
    t.water.tempC = 26;
    const rep = getWaterReport(s, t.id);
    const p = rep.params.find((x) => x.key === 'temp')!;
    expect(p.reason).toMatch(/No temperature suits all of these animals at once — a compatibility problem, not a care one\.$/);
    expect(p.advice).toBe('Rehome one group to a tank with water that suits it.');
    expect(fixForWaterIssue(t, { text: p.reason!, advice: p.advice, param: 'temp' })?.label).toBe('Open Livestock');
  });
});

describe('C2 (the owner’s choice): salt is paid for when bought, not in the nightly running cost', () => {
  it('a salt tank’s running cost is what the same gear costs in fresh water, and water changes still use bought salt', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    expect(tankDailyCost(s, t)).toBe(tankDailyCost(s, { ...t, waterClass: 'freshwater_tropical' }));
    const kg = s.inventory.salt;
    expect(waterChange(s, t.id, 0.1).ok).toBe(true);
    expect(s.inventory.salt).toBeLessThan(kg);
  });
});

describe('C7: converting between cool, tropical and planted water resets the heater and chiller, and says so', () => {
  /** An empty cool tank with a chiller at 17 °C and no heater. */
  const coolTank = () => {
    const s = base('betta');
    s.finance.money = 1e5;
    const id = buyTank(s, 'g29', 'freshwater_cool').tankId!;
    const t = s.tanks[id];
    t.equipment = t.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'heater');
    if (!t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'chiller'))
      t.equipment.push({ id: 'test_chiller', defId: 'chiller_mini', installedHour: 0, condition: 1, on: true, setting: 17 });
    for (const e of t.equipment) if (getEquipmentDef(e.defId)?.kind === 'chiller') e.setting = 17;
    return { s, t };
  };

  it('cool → tropical: the preview and the result name the chiller’s new setting and the missing heater', () => {
    const { s, t } = coolTank();
    const chiller = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'chiller')!;
    const name = getEquipmentDef(chiller.defId)!.name;
    const cost = convertWaterClassCost(s, t.id, 'freshwater_tropical');
    expect(cost.gearNotes.join(' ')).toMatch(new RegExp(`The ${name} is reset to \\d+\\.\\d °C for the new water\\.`));
    expect(cost.gearNotes.join(' ')).toMatch(/This tank has no heater yet — the room keeps it near 22 °C, too cool for tropical freshwater animals\./);
    expect(chiller.setting).toBe(17); // the preview changes nothing
    const r = convertWaterClass(s, t.id, 'freshwater_tropical');
    expect(r.ok).toBe(true);
    expect(r.message).toContain(cost.gearNotes[0]);
    expect(chiller.setting!).toBeGreaterThan(27);
  });

  it('a heater bought next does not fight the kept chiller', () => {
    const { s, t } = coolTank();
    convertWaterClass(s, t.id, 'freshwater_tropical');
    const r = installEquipment(s, t.id, 'heater_100w', { purchased: true });
    expect(r.ok).toBe(true);
    expect(r.message).not.toMatch(/fight/);
  });

  it('a heater still fighting a chiller set below what the animals need says to raise the chiller', () => {
    const { s, t } = coolTank();
    t.waterClass = 'freshwater_tropical'; // the old way: converted with the chiller left at 17 °C
    installEquipment(s, t.id, 'heater_100w', { purchased: true });
    const fight = getWaterReport(s, t.id).issues.find((i) => /fight each other/.test(i.text))!;
    expect(fight.advice).toMatch(/^Raise the chiller setting to at least \d+\.\d °C, or switch the chiller off\.$/);
    const chiller = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'chiller')!;
    expect(fixForWaterIssue(t, fight)).toEqual({ label: 'Open Equipment', to: { kind: 'card', tankId: t.id, tab: 'gear', fix: `equip-${chiller.id}` } });
  });
});

describe('C9: a stuck heater that has been switched off no longer asks to be switched off', () => {
  it('the attention line reads "has failed — repair or replace it" once it is off', () => {
    const s = base('betta');
    const t = firstTank(s);
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    const name = getEquipmentDef(heater.defId)!.name;
    heater.failed = true;
    heater.failMode = 'stuck_on';
    heater.on = true;
    const line = () => tankAttention(s, t.id).items.find((i) => i.equipmentId === heater.id)?.text;
    expect(line()).toBe(`The ${name} is stuck on — switch it off, then repair it.`);
    heater.on = false;
    expect(line()).toBe(`The ${name} has failed — repair or replace it.`);
  });
});

describe('C8: a hungry animal’s tank line says which food, and broadcast feeding names who it missed', () => {
  const setup = () => {
    const s = base('betta');
    const t = firstTank(s);
    const pleco = addCreature(s, createCreature(s, simRng(s), 'bristlenose_pleco', { ageDays: 200 }), t.id);
    const betta = getSpecies('betta');
    const plecoSp = getSpecies('bristlenose_pleco');
    const flakeLike = FOODS.find((f) => eatsFood(betta, f) && !eatsFood(plecoSp, f) && !f.madeFor)!;
    const wafer = FOODS.find((f) => f.name === 'Algae Wafers') ?? FOODS.find((f) => eatsFood(plecoSp, f) && !eatsFood(betta, f))!;
    for (const id of Object.keys(s.inventory.foods)) s.inventory.foods[id] = 0;
    s.inventory.foods[flakeLike.id] = 50;
    return { s, t, pleco, flakeLike, wafer };
  };

  it('none of its food in stock: the line says what to buy, and its link goes to the shop', () => {
    const { s, t, pleco } = setup();
    pleco.stats.hunger = 75;
    refreshTankCache(s, t);
    const line = t.cache.statusReasons?.find((r) => r.startsWith(pleco.name))!;
    expect(line).toMatch(new RegExp(`^${pleco.name} is very hungry — none of its food is in stock\\. Buy .+ in Market › Supplies\\.$`));
    expect(fixForAttention(s, t, { source: 'animals', text: line }, null)?.label).toBe('Buy food');
  });

  it('its food in stock: the line names it, and the link opens the food picker', () => {
    const { s, t, pleco, wafer } = setup();
    s.inventory.foods[wafer.id] = 20;
    pleco.stats.hunger = 95;
    refreshTankCache(s, t);
    const line = t.cache.statusReasons?.find((r) => r.startsWith(pleco.name))!;
    expect(line).toContain(`${pleco.name} is starving — feed it `);
    expect(line).toContain(wafer.name.toLowerCase());
    expect(fixForAttention(s, t, { source: 'animals', text: line }, null)).toEqual({ label: 'Feed', to: { kind: 'feed', tankId: t.id } });
  });

  it('a target-fed seahorse: the line says target-feed, and the link is its card’s Feed', () => {
    const s = base('lined_seahorse');
    const t = firstTank(s);
    const horse = Object.values(s.creatures).find((c) => c.tankId === t.id)!;
    horse.stats.hunger = 75;
    refreshTankCache(s, t);
    const line = t.cache.statusReasons?.find((r) => r.startsWith(horse.name))!;
    expect(line).toMatch(/target-feed it\.$/);
    expect(fixForAttention(s, t, { source: 'animals', text: line }, null)).toEqual({ label: `Feed ${horse.name}`, to: { kind: 'creature', tankId: t.id, creatureId: horse.id } });
  });

  it('a broadcast feed the hungry pleco can’t eat says so', () => {
    const { s, t, pleco, flakeLike } = setup();
    pleco.stats.hunger = 80;
    const r = feedTank(s, t.id, flakeLike.id);
    expect(r.ok).toBe(true);
    expect(r.caution).toBe(true);
    expect(r.message).toContain(`${pleco.name} is hungry but doesn’t eat ${flakeLike.name.toLowerCase()}.`);
  });
});

describe('C18 (B-224): food tags read as shop words, from one table in the data layer', () => {
  it('every tag has words without underscores, and the list helper keeps order, drops repeats and grazing', () => {
    for (const [tag, words] of Object.entries(FOOD_TAG_NAMES)) expect(words, tag).not.toMatch(/_/);
    expect(foodTagNames(['copepod_live', 'baby_brine'])).toEqual(['live copepods', 'live baby brine shrimp']);
    expect(foodTagNames(['algae_wafer', 'biofilm', 'detritus', 'vegetable'], { shelfOnly: true })).toEqual(['algae wafers', 'blanched vegetables']);
    expect(joinFoodNames(['a', 'b', 'c'])).toBe('a, b or c');
  });

  it('target-feeding the wrong food names what it eats in shop words', () => {
    const s = base('lined_seahorse');
    const t = firstTank(s);
    const horse = Object.values(s.creatures).find((c) => c.tankId === t.id)!;
    const wrong = FOODS.find((f) => !eatsFood(getSpecies('lined_seahorse'), f))!;
    s.inventory.foods[wrong.id] = 5;
    const r = feedTank(s, t.id, wrong.id, { targetCreatureId: horse.id });
    expect(r.ok).toBe(false);
    expect(r.message).not.toMatch(/_|copepod live/);
    expect(r.message).toMatch(/Lined seahorses eat .*live copepods/);
  });
});

describe('C10: low-oxygen advice and its link point at what helps', () => {
  const lowOxygen = () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.oxygen = 0.4;
    t.water.tempC = 25;
    return { s, t, advice: () => getWaterReport(s, t.id).params.find((p) => p.key === 'oxygen')!.advice! };
  };

  it('no airstone: add one (no "point a filter outlet"), and the link buys one', () => {
    const { t, advice } = lowOxygen();
    t.equipment = t.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'airstone');
    expect(advice()).toBe('Add an airstone — its bubbles stir the surface, where oxygen gets in.');
    expect(fixForWaterIssue(t, { text: 'x', advice: advice(), param: 'oxygen' })?.label).toBe('Buy an airstone');
  });

  it('an airstone switched off: switch it on, and the link says so', () => {
    const { t, advice } = lowOxygen();
    t.equipment = t.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'airstone');
    t.equipment.push({ id: 'test_air', defId: 'airstone', installedHour: 0, condition: 1, on: false });
    expect(advice()).toBe(`The ${getEquipmentDef('airstone')!.name} is switched off — switch it on.`);
    expect(fixForWaterIssue(t, { text: 'x', advice: advice(), param: 'oxygen' })?.label).toBe('Switch it on');
  });

  it('a running airstone: another one, not its row (which has nothing to set)', () => {
    const { t, advice } = lowOxygen();
    t.equipment = t.equipment.filter((e) => getEquipmentDef(e.defId)?.kind !== 'airstone');
    t.equipment.push({ id: 'test_air', defId: 'airstone', installedHour: 0, condition: 1, on: true });
    expect(fixForWaterIssue(t, { text: 'x', advice: advice(), param: 'oxygen' })?.label).toBe('Buy an airstone');
  });
});

describe('C11: stored gear shows from any tank, saying what tank it needs', () => {
  it('a reef light in storage is listed for a freshwater tank, last, with what it needs', () => {
    const s = base('betta');
    const t = firstTank(s);
    s.inventory.equipment.push({ id: 'st_reef', defId: 'light_reef', installedHour: 0, condition: 1, on: false });
    s.inventory.equipment.push({ id: 'st_air', defId: 'airstone', installedHour: 0, condition: 1, on: false });
    const rows = storedEquipmentList(s, t);
    expect(rows.map((r) => r.inst.id)).toEqual(['st_air', 'st_reef']);
    expect(rows[0].needs).toBeNull();
    expect(rows[1].needs).toMatch(/^Needs a (salt|marine) tank$/);
  });
});

describe('C12: taking a filter’s bacteria or the only heater out of a stocked tank asks first', () => {
  it('the warning quotes the same cycle drop the removal then makes', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.bioMaturity = 0.88;
    const filter = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'filter')!;
    const warn = removeEquipmentWarning(s, t.id, filter.id)!;
    const m = /cycle (\d+)% → (\d+)%/.exec(warn)!;
    expect(warn).toMatch(/takes its bacteria with it .* so ammonia will rise\. Remove it anyway\?$/);
    const r = removeEquipment(s, t.id, filter.id);
    expect(r.message).toContain(`cycle ${m[1]}% → ${m[2]}%`);
  });

  it('the betta’s only heater asks; an empty tank does not', () => {
    const s = base('betta');
    const t = firstTank(s);
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    expect(removeEquipmentWarning(s, t.id, heater.id)).toMatch(/cools toward the room’s 22 °C — too cool for the animals here/);
    for (const id of Object.keys(s.creatures)) delete s.creatures[id];
    expect(removeEquipmentWarning(s, t.id, heater.id)).toBeNull();
  });
});

describe('C13: advice names only what the game can do', () => {
  const param = (s: GameState, key: string) => getWaterReport(s, firstTank(s).id).params.find((p) => p.key === key)!;

  it('pH and KH too high: water changes and no buffer, not "softer water" or limestone', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.pH = 8.6;
    t.water.kh = 20;
    expect(param(s, 'ph').advice).toBe('Do a water change, and skip buffer for now.');
    expect(param(s, 'kh').advice).toBe('Do water changes and skip buffer for now.');
  });

  it('salinity too high: top off with fresh water (no "RO"), or a water change when the tank is full', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    t.water.salinitySG = 1.03;
    t.water.level = 0.95;
    expect(param(s, 'salinity').advice).toMatch(/^Evaporation concentrates salt\. Top off with fresh water \(never salt water\)/);
    t.water.level = 1;
    const p = param(s, 'salinity');
    expect(p.advice).toBe('Do a water change — new water is mixed at the right strength.');
    expect(fixForWaterIssue(t, { text: p.reason!, advice: p.advice, param: 'salinity' })?.label).toBe('Water change');
    t.water.level = 0.9;
    expect(topOff(s, t.id).message).not.toMatch(/RO/);
  });

  it('green water: shorter lights and a water change, linked to Lighting (not "vacuum")', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.algae = 80;
    t.water.clarity = 0.5;
    t.water.bioMaturity = 1;
    const p = param(s, 'clarity');
    expect(p.advice).toBe('Shorten the lights to about 8 hours and change water; a UV steriliser clears it faster.'); // Audit 2026-11-17 (J18): British, as the game spells it
    expect(fixForWaterIssue(t, { text: p.reason!, advice: p.advice, param: 'clarity' })?.label).toBe('Lighting');
  });

  it('an airstone beside CO₂: switch it off while the lights are on (there is no night schedule)', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.waterClass = 'freshwater_planted';
    t.equipment.push({ id: 'test_co2', defId: 'co2_kit', installedHour: 0, condition: 1, on: true });
    t.equipment.push({ id: 'test_air', defId: 'airstone', installedHour: 0, condition: 1, on: true });
    const text = [installedFit(s, t, 'test_air')?.text, installedFit(s, t, 'test_co2')?.text].join(' ');
    expect(text).toMatch(/switch (it|the airstone) off while the lights are on/);
    expect(text).not.toMatch(/only at night/);
  });

  it('Seiryu Stone no longer claims a hardness the game doesn’t model', () => {
    expect(DECOR.find((d) => d.id === 'seiryu_stone')!.description).not.toMatch(/raises hardness/);
  });
});

describe('C14: one Intensity control for a tank’s lights', () => {
  it('a light dimmed on its own is shown in Lighting with Full power, and "Buy a light" waits until it is back up', () => {
    const s = base('betta');
    const t = firstTank(s);
    const light = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'light')!;
    light.setting = 0.3;
    t.lighting = { ...t.lighting, intensity: 1.5 };
    const raise = { text: 'Corals need stronger light.', advice: 'Raise the intensity or install a stronger light.', param: 'light' as const };
    expect(fixForWaterIssue(t, raise)?.label).toBe('Lighting');
    useGame.setState({ game: s });
    const html = renderToStaticMarkup(createElement(GearTab, { game: s, tank: t }));
    expect(html).toContain(`data-testid="tank-light-dimmed-${light.id}"`);
    expect(html.replace(/<[^>]+>/g, ' ')).toMatch(/is dimmed to 30% on its own\./);
    useGame.setState({ game: null });
    light.setting = 1;
    expect(fixForWaterIssue(t, raise)?.label).toBe('Buy a light');
  });
});

describe('C15: the screens use the sim’s own lines', () => {
  it('stocking: Full until the report’s danger line; the cycle meter reads Mature where the report says ready', () => {
    expect(STOCKING_WATCH).toBe(0.85);
    expect(STOCKING_DANGER).toBe(1.05);
    const s = base('betta');
    const t = firstTank(s);
    for (const id of Object.keys(s.creatures)) delete s.creatures[id];
    t.water.bioMaturity = 0.77;
    const rep = getWaterReport(s, t.id);
    expect(rep.headline).toBe('Water is ready for animals');
    useGame.setState({ game: s });
    const html = renderToStaticMarkup(createElement(WaterTab, { game: s, tank: t })).replace(/<[^>]+>/g, ' ');
    useGame.setState({ game: null });
    expect(html).toMatch(/Biological filter\s+Mature/);
  });

  it('with Exact off, a row that isn’t a range shows its own words, not "Out of range"', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.bioMaturity = 0.3;
    useSettings.getState().update({ advancedWater: false });
    useGame.setState({ game: s });
    const html = renderToStaticMarkup(createElement(WaterTab, { game: s, tank: t })).replace(/<[^>]+>/g, ' ');
    useGame.setState({ game: null });
    expect(html).toMatch(/Biological filter\s+30% established/);
  });

  it('repair is offered from the sim’s own line', () => {
    const s = base('betta');
    const t = firstTank(s);
    s.finance.money = 500;
    const f = t.equipment[0];
    f.condition = REPAIR_FROM + 0.01;
    expect(repairEquipment(s, t.id, f.id).ok).toBe(false);
    f.condition = REPAIR_FROM;
    expect(repairEquipment(s, t.id, f.id).ok).toBe(true);
  });
});

describe('C16 (the part with no decision): a repair that switches a unit back on says so', () => {
  it('a stuck heater switched off, then repaired', () => {
    const s = base('betta');
    const t = firstTank(s);
    s.finance.money = 500;
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    heater.failed = true;
    heater.failMode = 'stuck_on';
    heater.on = false;
    expect(repairEquipment(s, t.id, heater.id).message).toMatch(/^Repaired the .+ for \$\d+ and switched it on\.$/);
    expect(heater.on).toBe(true);
    heater.failed = true;
    heater.failMode = 'off';
    expect(repairEquipment(s, t.id, heater.id).message).not.toMatch(/switched it on/);
  });
});

describe('C17: a failed one-per-tank unit says how to get past it', () => {
  it('the shop’s verdict and the install refusal say repair it or move it to storage', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.equipment.push({ id: 'test_ato', defId: 'ato', installedHour: 0, condition: 0.2, on: true, failed: true, failMode: 'off' });
    const name = getEquipmentDef('ato')!.name;
    const want = `The ${name} here has failed — repair it on the tank card, or move it to storage first.`;
    expect(equipmentFit(s, t, 'ato').text).toBe(want);
    expect(installEquipment(s, t.id, 'ato', { purchased: true }).message).toBe(want);
    t.equipment.find((e) => e.id === 'test_ato')!.failed = false;
    expect(equipmentFit(s, t, 'ato').text).toMatch(/one is all it needs/);
  });
});

describe('C19 (B-231 c, f, g): idle units before "Buy", no "too small" in a fight, no cut-off issue list', () => {
  it('two lights at full, one switched off: its switch, not "Buy a light"', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.equipment.push({ id: 'test_light_2', defId: 'light_basic_led', installedHour: 0, condition: 1, on: false });
    t.lighting = { ...t.lighting, intensity: 1.5 };
    const raise = { text: 'Corals need stronger light.', advice: 'Raise the intensity or install a stronger light.', param: 'light' as const };
    expect(fixForWaterIssue(t, raise)).toEqual({ label: 'Switch it on', to: { kind: 'card', tankId: t.id, tab: 'gear', fix: 'equip-test_light_2' } });
  });

  it('"Add a small powerhead" with one failed: its Repair, not "Buy a powerhead"', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.equipment.push({ id: 'test_pump', defId: 'powerhead_small', installedHour: 0, condition: 0.1, on: true, failed: true, failMode: 'off' });
    expect(fixForWaterIssue(t, { text: 'Too still.', advice: 'Add a small powerhead for more movement.', param: 'flow' })?.label).toBe('Repair');
  });

  it('a heater fighting a chiller is not also called too small', () => {
    const s = base('betta');
    const t = firstTank(s);
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    heater.setting = 30;
    t.equipment.push({ id: 'test_chiller', defId: 'chiller_mini', installedHour: 0, condition: 1, on: true, setting: 24 });
    const texts = getWaterReport(s, t.id).issues.map((i) => i.text).join(' ');
    expect(texts).toMatch(/fight each other/);
    expect(texts).not.toMatch(/heater is too small/);
  });

  it('the Water tab lists every issue, past four', () => {
    const s = base('betta');
    const t = firstTank(s);
    t.water.ammonia = 3;
    t.water.nitrite = 3;
    t.water.nitrate = 200;
    t.water.oxygen = 0.3;
    t.water.pH = 5;
    t.water.tempC = 33;
    t.water.algae = 90;
    const n = getWaterReport(s, t.id).issues.length;
    expect(n).toBeGreaterThan(4);
    useGame.setState({ game: s });
    const html = renderToStaticMarkup(createElement(WaterTab, { game: s, tank: t }));
    useGame.setState({ game: null });
    expect((html.match(/class="ag-reason ag-reason--/g) ?? []).length).toBe(n);
  });
});

describe('C20 (the wording, no decision needed): Operations’ all-clear says what it checks', () => {
  it('reads "Automation is running smoothly.", not "Everything…", while a tank still needs a look', () => {
    const f = facility({ fresh: 2, marine: 4, salt: 200, rosa: 1, hour: 24 * 3 + 8.5 });
    unlock(f.g, 'operations_desk', { silent: true });
    useGame.setState({ game: f.g });
    Object.assign(useGame.getInitialState(), useGame.getState());
    const snap = opsSnapshot(f.g);
    const html = renderToStaticMarkup(createElement(Overview, { g: f.g, snap: { ...snap, problems: [] } as OpsSnapshot, tier: opsTier(f.g), nav: { tab: () => {}, view: () => {} }, small: false }));
    useGame.setState({ game: null });
    Object.assign(useGame.getInitialState(), { game: null });
    expect(html).toContain('data-testid="ops-all-clear"');
    expect(html).toContain('Automation is running smoothly.');
    expect(html).not.toContain('Everything is running smoothly.');
  });
});

describe('C21: Operations shows no "× 0" changer, and its early button says where it goes', () => {
  it('a Water room with no Auto Water Changer: no "× 0 · Running", and the schedule says none', () => {
    const f = facility({ fresh: 1, marine: 1, salt: 50 });
    for (const t of [...f.fresh, ...f.marine]) t.equipment = t.equipment.filter((e) => e.defId !== 'auto_water_changer');
    unlock(f.g, 'operations_desk', { silent: true });
    useGame.setState({ game: f.g });
    Object.assign(useGame.getInitialState(), useGame.getState());
    const html = renderToStaticMarkup(createElement(OpsWaterTab, { g: f.g, snap: opsSnapshot(f.g), nav: { tab: () => {}, view: () => {} }, small: false })).replace(/<[^>]+>/g, ' ');
    useGame.setState({ game: null });
    Object.assign(useGame.getInitialState(), { game: null });
    expect(html).not.toMatch(/Auto Water Changer × 0/);
    expect(html).not.toMatch(/0 tanks/);
    expect(html).toMatch(/Water changes\s+None scheduled/);
  });
});

describe('C21: the early Overview’s auto-clean button says it sets up, not that it buys', () => {
  it('reads "Set up", not "Buy · $120"', () => {
    const f = facility({ fresh: 1, marine: 0, water: false });
    const t = f.fresh[0];
    t.equipment = t.equipment.filter((e) => e.defId !== 'auto_water_changer');
    installEquipment(f.g, t.id, 'autofeeder', { purchased: true });
    const tier = opsTier(f.g);
    expect(tier.assisted).toBe(true);
    useGame.setState({ game: f.g });
    Object.assign(useGame.getInitialState(), useGame.getState());
    const html = renderToStaticMarkup(createElement(Overview, { g: f.g, snap: opsSnapshot(f.g), tier, nav: { tab: () => {}, view: () => {} }, small: false })).replace(/<[^>]+>/g, ' ');
    useGame.setState({ game: null });
    Object.assign(useGame.getInitialState(), { game: null });
    expect(html).toMatch(/Auto-clean needs an Auto Water Changer\s+Set up/);
    expect(html).not.toContain('Buy · $120');
  });
});
