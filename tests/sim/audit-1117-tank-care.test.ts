/**
 * Audit 2026-11-17, area C (keeping a tank healthy: water, equipment, feeding, dosing and the advice the game gives).
 * Each block pins one finding from that audit.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { getWaterReport } from '@/sim/water';
import { waterChange, waterChangeCost, dose } from '@/sim/care';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { fixForWaterIssue } from '@/ui/common/fixLinks';
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
