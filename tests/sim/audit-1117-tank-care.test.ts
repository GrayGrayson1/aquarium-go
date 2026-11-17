/**
 * Audit 2026-11-17, area C (keeping a tank healthy: water, equipment, feeding, dosing and the advice the game gives).
 * Each block pins one finding from that audit.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { getWaterReport, tankDailyCost } from '@/sim/water';
import { waterChange, waterChangeCost, dose, installEquipment, feedTank } from '@/sim/care';
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

  it('its food in stock: the line names it, and the link feeds that animal from its card', () => {
    const { s, t, pleco, wafer } = setup();
    s.inventory.foods[wafer.id] = 20;
    pleco.stats.hunger = 95;
    refreshTankCache(s, t);
    const line = t.cache.statusReasons?.find((r) => r.startsWith(pleco.name))!;
    expect(line).toContain(`${pleco.name} is starving — feed it `);
    expect(line).toContain(wafer.name.toLowerCase());
    expect(fixForAttention(s, t, { source: 'animals', text: line }, null)).toEqual({ label: `Feed ${pleco.name}`, to: { kind: 'creature', tankId: t.id, creatureId: pleco.id } });
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
