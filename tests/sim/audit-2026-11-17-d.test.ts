/**
 * Audit 2026-11-17, area D (the animals): choosing them, whether they fit, how they fare, why they die, and whether
 * the game says what each one needs. One describe per finding.
 */
import { describe, it, expect } from 'vitest';
import type { CompatReport, GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature, stepTankCreatures, creatureWellbeing } from '@/sim/life';
import { stressNote } from '@/sim/life/index';
import { makeContext } from '@/sim/context';
import { lastHurtBy } from '@/sim/life/step';
import { moveCreatures } from '@/sim/life/groupMove';
import { applyCommand, validateCommand } from '@/sim/commands';
import { staleOf } from '@/sim/commands/shared';
import { deepClone } from '@/sim/clone';
import { simRng, mulberry32 } from '@/sim/rng';
import { previewAddition, evaluateComposition, simpleMember, neutralContext } from '@/sim/compat';
import { getSpecies, ALL_SPECIES } from '@/data/species';
import { composition, generateOffer } from '@/sim/economy/shop';
import { getFoodDef } from '@/data/catalog/foods';
import { getDecorDef } from '@/data/catalog/decor';
import { offerDiet } from '@/ui/panels/market/offerDietText';
import { capitalPlural } from '@/ui/panels/market/offerWords';
import { lifespanFacts } from '@/ui/common/lifespan';
import { illnessSeverityPct, stressWord, stressTone, healthWord, healthTone, isMemoryCard } from '@/ui/cards/conditionWords';
import { moveButton, moveNeedsAck } from '@/ui/cards/moveRisk';
import { fixForCreatureNote } from '@/ui/cards/noteFixes';

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
    // the review: a first companion that has died shows the plain lifespan, never an empty row
    ember.status = 'dead';
    expect(lifespanFacts(ember, sp, s.clock.hour)).toEqual({ value: `About ${sp.lifecycle.lifespanDays} days`, note: null });
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
      const said = s.log.slice(before).some((e) => /Gus’s tank is too small/.test(e.text));
      expect(said, tier).toBe(warned);
    }
  });
});

// D8's tests are in tests/sim/audit-2026-11-17-d-units.test.ts (they render with the player's unit set to °F)

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

  it('goldfish with an arowana or an oscar: what happens has its own words, the water its own', () => {
    // the review: the words must match the incident the engine rolls (an attack is never told as eating)
    const cases = [
      ['silver_arowana', 'fancy_goldfish', 'predation', /swallows goldfish|Medium fish fit/],
      ['silver_arowana', 'comet_goldfish', 'aggression', /attacks comets too big for it to swallow/],
      ['oscar', 'fancy_goldfish', 'predation', /bullies and bites goldfish/],
      ['oscar', 'comet_goldfish', 'aggression', /bullies and bites goldfish/],
    ] as const;
    for (const [pred, gf, kind, words] of cases) {
      const ev = pair(pred, gf);
      const hit = ev.incidents.find((i) => !i.youngOnly && i.actorSpeciesId === pred && i.targetSpeciesId === gf);
      expect(hit?.kind, `${pred} ${gf}`).toBe(kind);
      expect(hit!.text, `${pred} ${gf}`).toMatch(words);
      // a kill is only told as eating when it can happen; an attack never says "eats"
      if (!hit!.lethal) expect(hit!.text, `${pred} ${gf}`).not.toMatch(/\beats?\b/);
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

describe('D11: a death or injury from a tank mate names the tank mate', () => {
  const hurt = () => {
    const s = base();
    const t = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const mango = addCreature(s, createCreature(s, mulberry32(12), 'fancy_guppy', { sex: 'female', ageDays: 60, name: 'Mango' }), t.id);
    mango.history.push({ hour: s.clock.hour - 5, kind: 'note', text: 'Hurt by Rex the tiger barb (fin nip).' });
    mango.life = { ...(mango.life ?? {}), injury: 40, damage: { injury: 80 } };
    return { s, t, mango };
  };

  it('the healing note says who has been nipping her', () => {
    const { s, mango } = hurt();
    expect(lastHurtBy(mango, s.clock.hour)).toEqual({ label: 'Rex the tiger barb', verb: 'nipping' });
    expect(creatureWellbeing(s, mango).notes).toContain('Healing from injuries — Rex the tiger barb has been nipping her.');
  });

  it('a death from accumulated injuries names the attacker', () => {
    const { s, t, mango } = hurt();
    mango.stats.health = 0;
    stepTankCreatures(s, t, 1, makeContext(s, 1));
    expect(mango.status).toBe('dead');
    expect(mango.deathCause).toBe('injuries from Rex the tiger barb');
    expect(s.log.some((e) => e.text === 'Mango has passed away from injuries — Rex the tiger barb kept nipping her. Keep them apart.')).toBe(true);
  });

  it('only a recent hurt names anyone (the review: never a tank mate from weeks ago), and a sting is “stung”', () => {
    const { s, t, mango } = hurt();
    mango.history = [{ hour: s.clock.hour - 24 * 20, kind: 'note', text: 'Hurt by Rex the tiger barb (fin nip).' }];
    expect(lastHurtBy(mango, s.clock.hour)).toBeNull();
    expect(creatureWellbeing(s, mango).notes).toContain('Healing from injuries — check for aggressive or nipping tank mates.');
    mango.history.push({ hour: s.clock.hour - 3, kind: 'note', text: 'Hurt by Blossom the bubble-tip anemone (sting).' });
    expect(lastHurtBy(mango, s.clock.hour)?.verb).toBe('stinging');
    mango.stats.health = 0;
    stepTankCreatures(s, t, 1, makeContext(s, 1));
    expect(s.log.some((e) => e.text === 'Mango has passed away from injuries — Blossom the bubble-tip anemone stung her. Keep them apart.')).toBe(true);
  });
});

describe('D13: a tank a little past a temperature limit is Conditional, and the reading keeps its decimal', () => {
  const at = (tempC: number) => {
    const d = getSpecies('discus');
    return evaluateComposition([simpleMember(d, 6, 'mixed')], { ...neutralContext(d, d), neutral: false, flowIndex: 1, lightLevel: 1, expectedTempC: tempC }).report;
  };

  it('half a degree under a discus’s minimum: caution, “about 25.5 °C”', () => {
    const min = getSpecies('discus').tempC.min;
    const r = at(min - 0.5);
    const temp = r.reasons.find((x) => x.category === 'temperature' && /too cold/.test(x.text))!;
    expect(temp.severity).toBe('caution');
    expect(temp.text).toContain(`about ${min - 0.5} °C`);
  });

  it('more than a degree past it: still a warning (High risk)', () => {
    const min = getSpecies('discus').tempC.min;
    const temp = at(min - 2).reasons.find((x) => x.category === 'temperature' && /too cold/.test(x.text))!;
    expect(temp.severity).toBe('warning');
  });
});

describe('D15: a risky move asks for the same tick as a risky purchase', () => {
  it('High risk and Incompatible need the tick; the button says so until it is given', () => {
    expect(moveNeedsAck('high_risk')).toBe(true);
    expect(moveNeedsAck('incompatible')).toBe(true);
    expect(moveNeedsAck('conditional')).toBe(false);
    expect(moveButton({ tankName: 'Oscar tank', gateOk: true, verdict: 'incompatible', acknowledged: false })).toEqual({ label: 'Confirm the risk first', enabled: false });
    expect(moveButton({ tankName: 'Oscar tank', gateOk: true, verdict: 'incompatible', acknowledged: true })).toEqual({ label: 'Move to Oscar tank', enabled: true });
    expect(moveButton({ tankName: 'Community', gateOk: true, verdict: 'usually_compatible', acknowledged: false })).toEqual({ label: 'Move to Community', enabled: true });
    expect(moveButton({ tankName: 'Reef', gateOk: false, verdict: undefined, acknowledged: false }).enabled).toBe(false);
    expect(moveButton({ tankName: null, gateOk: false, verdict: undefined, acknowledged: false })).toEqual({ label: 'Choose a tank', enabled: false });
  });
});

describe('D17: a dead or rehomed animal’s card drops the live animal’s buttons', () => {
  it('dead and sold are memories; alive and listed keep their actions', () => {
    expect(isMemoryCard('dead')).toBe(true);
    expect(isMemoryCard('sold')).toBe(true);
    expect(isMemoryCard('alive')).toBe(false);
    expect(isMemoryCard('listed')).toBe(false);
  });
});

describe('D18: “What you’ll see in Aquarium Go” promises only what the game does', () => {
  it('no upturned snails to help, no shell-swapping hermits', () => {
    expect(getSpecies('astraea_snail').encyclopedia.inGameBehavior).not.toMatch(/tumbles|until you help/);
    expect(getSpecies('scarlet_hermit_crab').encyclopedia.inGameBehavior).not.toMatch(/empty shell/);
    expect(getSpecies('hermit_crab').encyclopedia.inGameBehavior).not.toMatch(/empty shell/);
  });
});

describe('D19: a species is listed only for water that suits it by default, and a recommended pair fits', () => {
  it('amano shrimp aren’t listed for cool tanks; white clouds aren’t listed for planted (heated) tanks', () => {
    expect(getSpecies('amano_shrimp').waterClasses).not.toContain('freshwater_cool');
    expect(getSpecies('white_cloud_minnow').waterClasses).not.toContain('freshwater_planted');
  });

  it('a pair of clown gobies in a 10-gallon reef is not “too many”', () => {
    const s = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Tango', seed: 5 });
    const t = createTank(s, 'g10', 'reef', { cycled: true });
    const r = previewAddition(s, t.id, { speciesId: 'clown_goby', count: 2 });
    expect(texts(r)).not.toMatch(/Too many clown gobies/);
  });
});

describe('D21: lines name the species they are about', () => {
  const pairOf = (a: string, b: string) => {
    const A = getSpecies(a);
    const B = getSpecies(b);
    return evaluateComposition([simpleMember(A, 1, 'male'), simpleMember(B, 1, 'female')], { ...neutralContext(A, B), neutral: false, flowIndex: 1, lightLevel: 1 }).report;
  };

  it('two male rams: “Two adult male german blue rams are likely to fight”', () => {
    const b = getSpecies('german_blue_ram');
    const r = evaluateComposition([simpleMember(b, 2, 'male')], { ...neutralContext(b, b), neutral: false, flowIndex: 1, lightLevel: 1 }).report;
    expect(texts(r)).toMatch(/Two adult male german blue rams are likely to fight/i);
  });

  it('light, flow and pH lines say which species wants what', () => {
    let light = '';
    let flow = '';
    let ph = '';
    for (const a of ALL_SPECIES) {
      for (const b of ALL_SPECIES) {
        if (a.id >= b.id || a.environment !== b.environment) continue;
        const t = texts(pairOf(a.id, b.id));
        if (!light && /want dim, shaded water/.test(t)) light = t;
        if (!flow && /flow preferences differ/.test(t)) flow = t;
      }
      if (light && flow && ph) break;
    }
    expect(light).toMatch(/[A-Z]\S* .*want dim, shaded water; \S.* want bright light\./);
    expect(light).not.toMatch(/One wants/);
    expect(flow).toMatch(/Their flow preferences differ: \S.* want [a-z ]+ water, \S/);
    // no two real species are that far apart: a fixture with hard, alkaline needs beside a soft-water tetra
    const neon = getSpecies('neon_tetra');
    const hard = { ...structuredClone(getSpecies('platy')), id: 'fx_hard', commonName: 'Fixture rockfish', exceptionRules: [], positiveInteractions: [], pH: { min: 8.2, max: 8.8, idealMin: 8.3, idealMax: 8.6 } };
    ph = texts(evaluateComposition([simpleMember(neon, 6, 'mixed'), simpleMember(hard, 1, 'male')], { ...neutralContext(neon, hard), neutral: false, flowIndex: 1, lightLevel: 1 }).report);
    expect(ph).toMatch(/Their pH needs don’t overlap: \S.* need pH [\d.]+–[\d.]+, \S.* pH [\d.]+–[\d.]+\./);
  });

  it('the offer’s callouts use the plural: “Royal grammas need…”', () => {
    expect(capitalPlural(getSpecies('royal_gramma'))).toBe('Royal grammas');
    expect(capitalPlural(getSpecies('neon_tetra'))).toBe('Neon tetras');
  });
});

describe('D16: the creature card’s notes link to where each problem is fixed', () => {
  const c = { tankId: 't1', speciesId: 'neon_tetra' };
  it('habitat → Build › Decor for its tank; lonely → the shop searched for its kind; injuries → Compatibility; water → Water care', () => {
    expect(fixForCreatureNote(c, 'Habitat: needs more hiding places (0 of ~2).')?.link).toEqual({ label: 'Add decor', to: { kind: 'panel', panel: 'build', target: 'decor:t1' } });
    expect(fixForCreatureNote(c, 'Stressed — mainly lonely — likes groups of 6+.')).toEqual({ link: { label: 'Find more in the shop', to: { kind: 'panel', panel: 'market', target: 'tab:shop' } }, search: 'Neon Tetra' });
    expect(fixForCreatureNote(c, 'Healing from injuries — Rex the tiger barb has been nipping her.')?.link.to).toEqual({ kind: 'card', tankId: 't1', tab: 'life', fix: 'compat' });
    expect(fixForCreatureNote(c, 'Bob is struggling with the water (too warm).')?.link.label).toBe('Water care');
    expect(fixForCreatureNote(c, 'Very hungry — time to feed.')).toBeNull();
    // the review: substrate, light and sharp decor go to what fixes them, not "Add decor"
    expect(fixForCreatureNote(c, 'Habitat: the gravel substrate is unsuitable.')?.link).toEqual({ label: 'Change substrate', to: { kind: 'panel', panel: 'build', target: 'tab:substrate' } });
    expect(fixForCreatureNote(c, 'Habitat: the light is brighter than it likes.')?.link).toEqual({ label: 'Lighting', to: { kind: 'card', tankId: 't1', tab: 'gear', fix: 'lighting' } });
    expect(fixForCreatureNote(c, 'Habitat: the light is dimmer than it likes.')?.link.label).toBe('Lighting');
    expect(fixForCreatureNote(c, 'Habitat: sharp decor can tear long fins.')?.link.label).toBe('See decor');
    expect(fixForCreatureNote({ tankId: null, speciesId: 'neon_tetra' }, 'Habitat: needs plants.')).toBeNull();
  });
});

describe('D2: a school moves in one go', () => {
  const school = () => {
    const s = base();
    const from = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const to = createTank(s, 'g29', 'freshwater_tropical', { cycled: true });
    const neons = Array.from({ length: 8 }, (_, i) => addCreature(s, createCreature(s, mulberry32(100 + i), 'neon_tetra', { ageDays: 60, name: `Neon ${i}` }), from.id));
    return { s, from, to, neons };
  };

  it('eight neon tetras move with one command, with one message, and the preview sees the whole school', () => {
    const { s, from, to, neons } = school();
    const ids = neons.map((c) => c.id);
    const preview = previewAddition(s, to.id, { speciesId: 'neon_tetra', creatureIds: ids });
    expect(texts(preview)).not.toMatch(/needs a group of at least six/);
    const cmd = { k: 'moveCreatures', creatures: ids, to: to.id, from: ids.map(() => from.id) } as const;
    expect(validateCommand(JSON.parse(JSON.stringify(cmd)))).toEqual(cmd);
    const r = applyCommand(s, cmd);
    expect(r.ok).toBe(true);
    // one line for the whole school, not one per animal (the review's blocker 1)
    expect(r.message).toBe(`Moved 8 neon tetras to ${to.name}. Give them a little while to settle in.`);
    expect(neons.every((c) => c.tankId === to.id)).toBe(true);
  });

  it('a courting pair moved with its group gives the warning a single move gives (the review’s case: five rams)', () => {
    const s = base();
    const from = createTank(s, 'g29', 'freshwater_tropical', { cycled: true });
    const to = createTank(s, 'g40B', 'freshwater_tropical', { cycled: true });
    const sexes = ['female', 'female', 'female', 'male', 'female'] as const;
    const rams = sexes.map((sex, i) => addCreature(s, createCreature(s, mulberry32(300 + i), 'german_blue_ram', { sex, ageDays: 200, name: `Ram ${i}` }), from.id));
    const [m, f] = [rams[3], rams[4]];
    m.repro = { ...m.repro, stage: 'courting', partnerId: f.id };
    f.repro = { ...f.repro, stage: 'courting', partnerId: m.id };
    const single = deepClone(s);
    const one = applyCommand(single, { k: 'separateCreature', creature: m.id, to: to.id, from: from.id });
    expect(one.message).toMatch(/^Courtship interrupted — Ram 3 moved to /);
    const r = applyCommand(s, { k: 'moveCreatures', creatures: rams.map((c) => c.id), to: to.id, from: rams.map(() => from.id) });
    expect(r.ok).toBe(true);
    expect(r.message.startsWith(`Moved 5 German blue rams to ${to.name}. Give them a little while to settle in.`)).toBe(true); // Audit 2026-11-17 (J15): the proper noun keeps its capital
    expect(r.message).toContain(one.message);
    expect(r.message).not.toMatch(/Ram 0 moved|Moved Ram 0/);
  });

  it('one animal lost since the group was picked stays out; the rest still move', () => {
    const { s, to, neons } = school();
    neons[2].status = 'dead';
    const r = moveCreatures(s, neons.map((c) => c.id), to.id);
    expect(r.ok).toBe(true);
    expect(r.message).toBe(`Moved 7 neon tetras to ${to.name}. Give them a little while to settle in. One of them is no longer in your care.`);
    expect(neons.filter((c) => c.status !== 'dead').every((c) => c.tankId === to.id)).toBe(true);
  });

  it('a group the water refuses moves no one', () => {
    const { s, from, neons } = school();
    const reef = createTank(s, 'g29', 'reef', { cycled: true });
    const r = moveCreatures(s, neons.map((c) => c.id), reef.id);
    expect(r.ok).toBe(false);
    expect(neons.every((c) => c.tankId === from.id)).toBe(true);
  });

  it('in a shared shop, a group where one animal has moved since is stale (first one wins)', () => {
    const { s, from, to, neons } = school();
    neons[3].tankId = to.id;
    expect(staleOf(s, { k: 'moveCreatures', creatures: neons.map((c) => c.id), to: to.id, from: neons.map(() => from.id) })).toEqual({ key: `c:${neons[3].id}`, noun: 'fish' });
    expect(validateCommand({ k: 'moveCreatures', creatures: ['cr_1'], to: 't', from: ['', 'tank_1'] })).not.toBeNull();
    expect(validateCommand({ k: 'moveCreatures', creatures: ['cr_1'], to: 't', from: ['__proto__'] })).toBeNull();
  });
});

describe('D7 (ADR-0056 decision 3, screens made honest while the owner decides): no promise that spare shells help', () => {
  it('the hermits’ snail warnings and the Shell Pile promise nothing the game doesn’t do; the risk is unchanged', () => {
    const blue = getSpecies('hermit_crab').exceptionRules!.find((r) => r.other === 'tag:snail')!;
    const scarlet = getSpecies('scarlet_hermit_crab').exceptionRules!.find((r) => r.other === 'tag:snail')!;
    for (const r of [blue, scarlet]) expect(r.reason).not.toMatch(/shells? (on hand|reduces?)|spare (empty )?shells/i);
    expect([blue.verdictFloor, blue.incidentRisk, scarlet.verdictFloor, scarlet.incidentRisk]).toEqual(['conditional', 0.04, 'usually_compatible', 0.015]);
    expect(getDecorDef('shell_pile')!.description).not.toMatch(/hermit|fight/i);
    // what the blue-leg's line does claim holds in the game: its snail risk is predation, which hunger drives
    const H = getSpecies('hermit_crab');
    const S = getSpecies('trochus_snail');
    const ev = evaluateComposition([simpleMember(H, 1, 'male'), simpleMember(S, 1, 'female')], { ...neutralContext(H, S), neutral: false, flowIndex: 1, lightLevel: 1 });
    expect(ev.incidents.find((i) => i.actorSpeciesId === 'hermit_crab' && i.targetSpeciesId === 'trochus_snail' && !i.youngOnly)?.kind).toBe('predation');
  });
});

describe('D10 (review): small standing causes that add up are named, not called a passing upset', () => {
  it('a main cause; many small ones that hold it over 55; or a passing upset', () => {
    const s = base();
    const ember = Object.values(s.creatures).find((c) => c.isStarter)!;
    ember.genome.potentials.temperament = 50;
    ember.stats.enrichment = 50;
    const f = (label: string, amount: number) => ({ key: label, label, amount });
    expect(stressNote([f('lonely', 12), f('bright light', 2)], ember)).toBe('Stressed — mainly lonely.');
    const many = Array.from({ length: 16 }, (_, i) => f(`small cause ${i}`, 4.5 - i * 0.01));
    expect(stressNote(many, ember)).toBe('Stressed — several small things add up: small cause 0 and small cause 1.');
    expect(stressNote([f('glass tapping', 2), f('bright light', 1)], ember)).toBe('Stressed — still settling after something upset it (a move, a chase or a scare).');
  });
});
