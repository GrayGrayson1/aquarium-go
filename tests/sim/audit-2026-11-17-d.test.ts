/**
 * Audit 2026-11-17, area D (the animals): choosing them, whether they fit, how they fare, why they die, and whether
 * the game says what each one needs. One describe per finding.
 */
import { describe, it, expect } from 'vitest';
import type { CompatReport, GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature, stepTankCreatures, creatureWellbeing } from '@/sim/life';
import { makeContext } from '@/sim/context';
import { simRng, mulberry32 } from '@/sim/rng';
import { previewAddition, evaluateComposition, simpleMember, neutralContext } from '@/sim/compat';
import { getSpecies, ALL_SPECIES } from '@/data/species';
import { composition, generateOffer } from '@/sim/economy/shop';
import { getFoodDef } from '@/data/catalog/foods';
import { offerDiet } from '@/ui/panels/market/offerDietText';
import { lifespanFacts } from '@/ui/common/lifespan';
import { convertTempText } from '@/ui/common/format';
import { illnessSeverityPct, stressWord, stressTone, healthWord, healthTone } from '@/ui/cards/conditionWords';

const texts = (r: CompatReport) => r.reasons.map((x) => x.text).join('\n');
const base = (): GameState => newGame({ starterId: 'betta', starterName: 'Test', seed: 777 });

describe('D1: a shop offer is previewed with its own animals’ sexes', () => {
  it('a male & female pair reads as a pair that may court, not as two of unknown sex', () => {
    const s = base();
    const tank = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const rng = simRng(s);
    const pair = [createCreature(s, rng, 'german_blue_ram', { sex: 'male', ageDays: 200 }), createCreature(s, rng, 'german_blue_ram', { sex: 'female', ageDays: 200 })];
    expect(pair.map((c) => c.sex)).toEqual(['male', 'female']);
    const r = previewAddition(s, tank.id, { speciesId: 'german_blue_ram', creatures: pair });
    expect(texts(r)).toMatch(/A male and a female — they may court and breed/);
    expect(texts(r)).not.toMatch(/sexes aren't visible/);
    // the offer's animals aren't in the game yet: they never count as residents being moved
    expect(r.reasons.every((x) => !(x.creatureIds ?? []).some((id) => pair.some((c) => c.id === id)))).toBe(true);
  });

  it('a pea puffer trio (1 male, 2 females) shows the harassment rule the tank card shows after buying', () => {
    const s = base();
    const tank = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const rng = simRng(s);
    const trio = [createCreature(s, rng, 'pea_puffer', { sex: 'male', ageDays: 200 }), createCreature(s, rng, 'pea_puffer', { sex: 'female', ageDays: 200 }), createCreature(s, rng, 'pea_puffer', { sex: 'female', ageDays: 200 })];
    const r = previewAddition(s, tank.id, { speciesId: 'pea_puffer', creatures: trio });
    expect(texts(r)).toMatch(/Male pea puffers harass females/);
  });
});

describe('D5: the offer says what the animal eats and whether you have any', () => {
  it('a seahorse with only flakes in the cupboard: frozen or live food, none in stock, the cheapest pack, hand-fed', () => {
    const s = base();
    s.inventory.foods = { flake_tropical: 20 };
    const d = offerDiet(s, getSpecies('lined_seahorse'), 'marine');
    expect(d.eats).toMatch(/^Eats frozen and live food: /);
    expect(d.eats).not.toMatch(/flake/i);
    expect(d.have).toBeNull();
    expect(d.restock).not.toBeNull();
    expect(getSpecies('lined_seahorse').foods.some((t) => getFoodDef(d.restock!.id)!.tags.includes(t as never))).toBe(true);
    expect(d.handFed).toBe(true);
  });

  it('a betta when flakes are in stock: names the food you have, no pack to buy', () => {
    const s = base();
    s.inventory.foods = { flake_tropical: 20 };
    const d = offerDiet(s, getSpecies('betta'), 'freshwater');
    expect(d.eats).toMatch(/^Eats dry/);
    expect(d.have).toBe('You have tropical flakes in stock.');
    expect(d.restock).toBeNull();
    expect(d.handFed).toBe(false);
  });
});

describe('D20: old age never takes the first companion (the owner’s decision); everyone else ages as before', () => {
  /** Step one tank hour by hour with clean water and everyone fed. */
  function careFor(s: GameState, tank: Tank, hours: number): void {
    for (let t = 0; t < hours; t++) {
      tank.water.ammonia = 0;
      tank.water.nitrite = 0;
      tank.water.nitrate = Math.min(tank.water.nitrate, 10);
      tank.water.tempC = 26;
      for (const c of Object.values(s.creatures)) if (c.tankId === tank.id && c.status === 'alive') c.stats.hunger = 15;
      stepTankCreatures(s, tank, 1, makeContext(s, 1));
      s.clock.hour += 1;
    }
  }

  it('the companion outlives 1.1 × its lifespan under good care; another betta of the same age dies of old age', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4321 });
    const life = getSpecies('betta').lifecycle.lifespanDays;
    const home = s.tanks[s.tankOrder[0]];
    const ember = Object.values(s.creatures).find((c) => c.isStarter)!;
    ember.bornHour = s.clock.hour - life * 0.95 * 24;
    const other = createTank(s, 'g10', 'freshwater_tropical', { cycled: true });
    const ash = addCreature(s, createCreature(s, mulberry32(77), 'betta', { sex: 'female', ageDays: life * 0.95, name: 'Ash' }), other.id);
    const hours = Math.ceil(life * 0.2 * 24); // to 1.15 × the lifespan
    careFor(s, home, hours);
    careFor(s, other, hours);
    expect(ember.status).toBe('alive');
    expect(ember.lifeStage).toBe('elder');
    expect(ash.status).toBe('dead');
    expect(ash.deathCause).toBe('old age');
  });

  it('the card: a lifespan for everyone, a heads-up for an elder, and the companion’s own line', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4321 });
    const sp = getSpecies('betta');
    const ember = Object.values(s.creatures).find((c) => c.isStarter)!;
    ember.sex = 'male';
    expect(lifespanFacts(ember, sp, s.clock.hour)).toEqual({ value: null, note: 'Ember is your first companion and will stay with you as long as you look after him.' });
    const young = createCreature(s, mulberry32(5), 'betta', { sex: 'female', ageDays: 30, name: 'Ash' });
    expect(lifespanFacts(young, sp, s.clock.hour)).toEqual({ value: `About ${sp.lifecycle.lifespanDays} days`, note: null });
    const old = createCreature(s, mulberry32(6), 'betta', { sex: 'female', ageDays: sp.lifecycle.lifespanDays - 12, name: 'Ash' });
    expect(old.lifeStage).toBe('elder');
    expect(lifespanFacts(old, sp, s.clock.hour).note).toBe('Ash is in her last stretch: about 12 days left.');
    old.status = 'dead';
    expect(lifespanFacts(old, sp, s.clock.hour).note).toBeNull();
  });
});

describe('D3: group animals that need one companion come as a pair (the owner’s decision)', () => {
  const PAIRED = ['fancy_goldfish', 'comet_goldfish', 'koi', 'african_dwarf_frog'];

  it('goldfish, comets, koi and African dwarf frogs are always offered two together', () => {
    for (const id of PAIRED) {
      const sp = getSpecies(id);
      expect(sp.social.minGroup, id).toBe(2);
      const rng = mulberry32(3);
      for (let i = 0; i < 50; i++) {
        const comp = composition(sp, rng);
        expect(comp.count, id).toBe(2);
        expect(comp.label('fancy goldfish', 'Fancy goldfish')).toBe('Pair of fancy goldfish');
      }
    }
  });

  it('no species that needs company is only ever sold alone', () => {
    for (const sp of ALL_SPECIES) {
      if ((sp.social?.minGroup ?? 1) < 2) continue;
      const rng = mulberry32(11);
      let most = 0;
      for (let i = 0; i < 200; i++) most = Math.max(most, composition(sp, rng).count);
      expect(most, sp.id).toBeGreaterThanOrEqual(sp.social.minGroup);
    }
  });

  it('a goldfish pair for an empty cool tank needs no risk tick for being alone', () => {
    const s = base();
    const tank = createTank(s, 'g40B', 'freshwater_cool', { cycled: true });
    const offer = generateOffer(s, mulberry32(8), 'fancy_goldfish', { expiresHour: s.clock.hour + 48 })!;
    expect(offer.kind).toBe('group');
    expect(offer.creatures).toHaveLength(2);
    const r = previewAddition(s, tank.id, { speciesId: 'fancy_goldfish', creatures: offer.creatures });
    expect(texts(r)).not.toMatch(/needs a group of at least/);
  });
});

describe('D4: the tank-size verdict is graded by how short the tank is (the owner’s decision)', () => {
  const clownGame = () => newGame({ starterId: 'ocellaris_clownfish', starterName: 'Tango', seed: 777 });
  const sizeReasons = (r: CompatReport) => r.reasons.filter((x) => x.category === 'size' && /gallons/.test(x.text));

  it('29 gallons for a 30-gallon royal gramma: a note inside a good verdict, no risk', () => {
    const s = clownGame();
    const t = createTank(s, 'g29', 'marine_live_rock', { cycled: true });
    const r = previewAddition(s, t.id, { speciesId: 'royal_gramma', sizeCm: 8 });
    const size = sizeReasons(r);
    expect(size).toHaveLength(1);
    expect(size[0].severity).toBe('info');
    expect(size[0].text).toBe('This tank is a little under the 30 gallons an adult royal gramma likes (it holds 29). Fine with good care.');
  });

  it('20 gallons for the same fish is still High risk: needs at least 30', () => {
    const s = clownGame();
    const t = createTank(s, 'g20L', 'marine_live_rock', { cycled: true });
    const r = previewAddition(s, t.id, { speciesId: 'royal_gramma', sizeCm: 8 });
    const size = sizeReasons(r);
    expect(size).toHaveLength(1);
    expect(size[0].severity).toBe('warning');
    expect(size[0].text).toMatch(/needs at least 30 gallons; this tank holds 20/);
    expect(['high_risk', 'incompatible']).toContain(r.verdict);
  });

  it('the sim warns “tank is too small” only when it is well short', () => {
    for (const [tier, warned] of [['g29', false], ['g20L', true]] as const) {
      const s = clownGame();
      const t = createTank(s, tier, 'marine_live_rock', { cycled: true });
      addCreature(s, createCreature(s, mulberry32(9), 'royal_gramma', { ageDays: 200, name: 'Gus' }), t.id);
      const before = s.log.length;
      stepTankCreatures(s, t, 1, makeContext(s, 1));
      const said = s.log.slice(before).some((e) => /Gus's tank is too small/.test(e.text));
      expect(said, tier).toBe(warned);
    }
  });
});

describe('D8: compatibility reasons show the player’s temperature unit', () => {
  it('a too-warm reason and its fix convert to °F with no °C left (what CompatView now renders)', () => {
    const s = base();
    const t = createTank(s, 'g20L', 'freshwater_planted', { cycled: true });
    const r = previewAddition(s, t.id, { speciesId: 'white_cloud_minnow', count: 6 });
    const temp = r.reasons.find((x) => x.category === 'temperature' && x.severity !== 'info');
    expect(temp).toBeDefined();
    expect(temp!.text).toMatch(/°C/);
    const f = convertTempText(temp!.text, 'F')!;
    expect(f).toMatch(/°F/);
    expect(f).not.toMatch(/°\s*C/);
    expect(convertTempText(temp!.mitigation, 'F')).not.toMatch(/°\s*C/);
  });
});

describe('D6: a rule about water or temperature never becomes an attack', () => {
  const pair = (a: string, b: string) => {
    const A = getSpecies(a);
    const B = getSpecies(b);
    return evaluateComposition([simpleMember(A, 1, 'male'), simpleMember(B, 1, 'female')], { ...neutralContext(A, B), neutral: false, flowIndex: 1, lightLevel: 1 });
  };

  it('koi with an oscar, a black ghost, a bichir or an arowana: incompatible for the water, no attack rolled for it', () => {
    for (const other of ['oscar', 'black_ghost_knifefish', 'ornate_bichir', 'silver_arowana', 'clown_loach']) {
      const ev = pair('koi', other);
      expect(ev.report.verdict, other).toBe('incompatible');
      const water = ev.report.reasons.find((r) => /Koi are cool-water fish/.test(r.text));
      expect(water?.category, other).toBe('temperature');
      expect(ev.incidents.some((i) => /cool-water/.test(i.text ?? '')), other).toBe(false);
    }
    const ray = pair('motoro_stingray', 'koi');
    expect(ray.incidents.some((i) => /alkaline/.test(i.text ?? ''))).toBe(false);
  });

  it('goldfish with an arowana or an oscar: the eating has its own words, the water its own', () => {
    for (const [pred, words] of [['silver_arowana', /An arowana swallows goldfish|Medium fish fit/], ['oscar', /An oscar eats goldfish/]] as const) {
      const ev = pair(pred, 'fancy_goldfish');
      const eat = ev.incidents.find((i) => i.kind === 'predation' && i.actorSpeciesId === pred && i.targetSpeciesId === 'fancy_goldfish');
      expect(eat, pred).toBeDefined();
      expect(eat!.text, pred).toMatch(words);
      expect(ev.report.reasons.find((r) => r.category === 'predation')?.text, pred).not.toMatch(/cool-water/);
      expect(ev.report.reasons.some((r) => r.category === 'temperature' && /Goldfish are cool-water fish/.test(r.text)), pred).toBe(true);
    }
  });

  it('corydoras or otocinclus with a goldfish: still High risk, but no one is “harassed” for it', () => {
    for (const small of ['panda_corydoras', 'otocinclus']) {
      const ev = pair(small, 'comet_goldfish');
      expect(['high_risk', 'incompatible'], small).toContain(ev.report.verdict);
      expect(ev.incidents.some((i) => /choke/.test(i.text ?? '')), small).toBe(false);
    }
  });
});

describe('D12: an illness that is almost cured never reads “severity 99%”', () => {
  it('severity is shown as the sim keeps it (0–100), at least 1 %', () => {
    expect(illnessSeverityPct(40)).toBe(40);
    expect(illnessSeverityPct(3.4)).toBe(3);
    expect(illnessSeverityPct(0.99)).toBe(1);
    expect(illnessSeverityPct(0.5)).toBe(1);
    expect(illnessSeverityPct(1)).toBe(1);
  });
});

describe('D10: the card’s meters and its Condition box tell the same story', () => {
  it('stress above 55 always comes with a reason in the box; the meter says Stressed on the same line', () => {
    const s = base();
    const ember = Object.values(s.creatures).find((c) => c.isStarter)!;
    ember.stats.stress = 60;
    const w = creatureWellbeing(s, ember);
    expect(w.status).not.toBe('good');
    expect(w.notes.some((n) => n.startsWith('Stressed — '))).toBe(true);
    expect([stressWord(50), stressTone(50)]).toEqual(['Settled', 'good']);
    expect([stressWord(60), stressTone(60)]).toEqual(['Stressed', 'watch']);
    expect([stressWord(85), stressTone(85)]).toEqual(['Panicking', 'danger']);
  });

  it('health 60–74 is Watch on both; a habitat note never becomes the headline', () => {
    expect([healthWord(70), healthTone(70)]).toEqual(['Low', 'watch']);
    expect([healthWord(35), healthTone(35)]).toEqual(['Poor', 'danger']);
    expect([healthWord(80), healthTone(80)]).toEqual(['Good', 'good']);
    const s = base();
    const bare = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const kuhli = addCreature(s, createCreature(s, mulberry32(4), 'kuhli_loach', { ageDays: 120, name: 'Noodle' }), bare.id);
    kuhli.stats.health = 70;
    const w = creatureWellbeing(s, kuhli);
    expect(w.status).toBe('watch');
    expect(w.notes.some((n) => n.startsWith('Habitat:'))).toBe(true);
    expect(w.notes[0].startsWith('Habitat:')).toBe(false);
    expect(w.headline).not.toMatch(/^Habitat/);
  });
});
