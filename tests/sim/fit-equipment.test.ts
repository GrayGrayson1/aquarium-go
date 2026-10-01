/**
 * Lane "fit" — equipment & food suitability (src/sim/care/fit.ts, src/sim/care/autofeed.ts) and the autofeeder's
 * accurate notices (src/sim/water/step.ts).
 *
 * The bug that started it: a 40-gallon marine breeder with 3 lined seahorses (frozen/live eaters) and an autofeeder.
 * The autofeeder (dry food only) never fed them and said it was "empty" although the player had flakes and pellets.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { advanceWorld } from '@/sim/world';
import { createCreature, addCreature } from '@/sim/life';
import { starterAquascape } from '@/sim/aquascape';
import { installEquipment, setEquipment, feedTank } from '@/sim/care';
import { equipmentFit, installedFit, tankGearIssues, foodFit, canAutofeed, cannotAutofeedText, groupEaters, autofeederFoods, planAutofeed, pickAutofeedFood, FIT_TONE } from '@/sim/care/fit';
import { FOODS, isAutofeederFood, foodForm } from '@/data/catalog/foods';
import { EQUIPMENT } from '@/data/catalog/equipment';
import { ALL_SPECIES, getSpecies } from '@/data/species';
import { simRng } from '@/sim/rng';

/** A world with one tank of the given animals (no default equipment unless asked), not a showcase (so it logs). */
function world(waterClass: WaterClass, tier: string, animals: [string, number][], opts: { kit?: boolean; foods?: Record<string, number> } = {}): { s: GameState; tank: Tank } {
  const s: GameState = newGame({ starterId: 'betta', starterName: 'T', seed: 7 });
  for (const id of Object.keys(s.creatures)) delete s.creatures[id];
  for (const id of [...s.tankOrder]) delete s.tanks[id];
  s.tankOrder = [];
  s.isShowcase = false;
  s.inventory.foods = opts.foods ?? { flake_tropical: 205, micro_pellets: 600 };
  const tank = createTank(s, tier, waterClass, { cycled: true, placement: { x: 0, z: 0, rotY: 0 }, withDefaultEquipment: opts.kit ?? true, name: 'Test Tank' });
  s.tanks[tank.id] = tank;
  if (!s.tankOrder.includes(tank.id)) s.tankOrder.push(tank.id);
  tank.decor = starterAquascape(s, 'generic', tank);
  const rng = simRng(s);
  for (const [sp, n] of animals) for (let i = 0; i < n; i++) addCreature(s, createCreature(s, rng, sp, { ageDays: 60 }), tank.id);
  return { s, tank: s.tanks[tank.id] };
}

const logText = (s: GameState) => s.log.map((e) => e.text).join('\n');

describe('fit: one source of truth for autofeeder food', () => {
  it('dry foods are exactly the eight the autofeeder always dispensed, in catalog order', () => {
    expect(autofeederFoods().map((f) => f.id)).toEqual(['flake_tropical', 'micro_pellets', 'sinking_pellets', 'axolotl_pellets', 'algae_wafers', 'nori_sheet', 'marine_pellets', 'goldfish_pellets']);
    // every catalog food has an explicit form; frozen and live never count as autofeeder food
    for (const f of FOODS) {
      expect(f.form, f.id).toBeTruthy();
      if (/_frozen$|^live_|_live$|earthworm|infusoria|gel_food|coral_food|blanched/.test(f.id)) expect(isAutofeederFood(f), f.id).toBe(false);
    }
    expect(foodForm('mysis_frozen')).toBe('frozen');
    expect(foodForm('live_copepods')).toBe('live');
  });

  it("the sim's pick: the dry food in stock most animals eat (ties keep catalog order)", () => {
    const neon = getSpecies('neon_tetra');
    const cory = getSpecies('panda_corydoras');
    expect(pickAutofeedFood({ flake_tropical: 10, sinking_pellets: 10 }, [neon, neon, neon, cory])).toBe('flake_tropical');
    expect(pickAutofeedFood({ flake_tropical: 10, sinking_pellets: 10 }, [neon, cory, cory, cory])).toBe('sinking_pellets');
    expect(pickAutofeedFood({ mysis_frozen: 50 }, [getSpecies('lined_seahorse')])).toBeNull();
  });

  it('species notes are true to the diet', () => {
    expect(canAutofeed(getSpecies('lined_seahorse'))).toBe(false);
    expect(canAutofeed(getSpecies('pea_puffer'))).toBe(false);
    expect(canAutofeed(getSpecies('betta'))).toBe(true);
    // lane:qa-r3 — the species page's sentence lives in the keeper's guide (dietGuide); the sim / fit sentence is this one
    const seahorse = getSpecies('lined_seahorse');
    const sea = cannotAutofeedText(groupEaters([{ species: seahorse }, { species: seahorse }, { species: seahorse }]));
    expect(sea).toMatch(/Your 3 lined seahorses only eat frozen or live food \(mysis, brine shrimp, live copepods\)/);
    expect(sea).toMatch(/can’t feed them — feed them by hand or target-feed/);
    // every species an autofeeder can't feed gets a sentence, none mention internal tags
    for (const sp of ALL_SPECIES) if (!canAutofeed(sp)) expect(cannotAutofeedText(groupEaters([{ species: sp }]))).not.toMatch(/_/);
  });
});

describe('fit: the autofeeder before you buy it', () => {
  it("a seahorse-only tank: won't help, names them and says what to do", () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 3]]);
    const v = equipmentFit(s, tank.id, 'autofeeder');
    expect(v.level).toBe('useless');
    expect(v.attention).toBe(true);
    expect(v.text).toMatch(/your 3 lined seahorses only eat frozen or live food/i);
    expect(v.text).toMatch(/autofeeder can’t feed them/);
    expect(v.text).toMatch(/by hand or target-feed/);
    expect(v.who).toEqual(['3 lined seahorses']);
    expect(FIT_TONE[v.level]).toBe('watch');
  });

  it('firefish + cleaner shrimp (flake eaters): a good fit', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['firefish', 2], ['cleaner_shrimp', 1]]);
    const v = equipmentFit(s, tank.id, 'autofeeder');
    expect(v.level).toBe('ok');
    expect(v.general).toBeFalsy();
    expect(v.text).toMatch(/keep everyone fed/);
  });

  it('seahorses + firefish: partly — it misses the seahorses', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 2], ['firefish', 2]]);
    const v = equipmentFit(s, tank.id, 'autofeeder');
    expect(v.level).toBe('partial');
    expect(v.note).toBe(true); // always a note beside the gear…
    expect(v.text).toMatch(/firefish/);
    expect(v.text).toMatch(/lined seahorses only eat frozen or live food/);
    // lane:qa-r3 — …but a dot only while the seahorses it misses are going hungry (hand-feeding them clears it)
    for (const c of Object.values(s.creatures)) if (c.speciesId === 'lined_seahorse') c.stats.hunger = 20;
    expect(equipmentFit(s, tank.id, 'autofeeder').attention).toBe(false);
    for (const c of Object.values(s.creatures)) if (c.speciesId === 'lined_seahorse') c.stats.hunger = 75;
    expect(equipmentFit(s, tank.id, 'autofeeder').attention).toBe(true);
  });

  it('one hopper: flakes for the neons miss the corydoras (sinking-food eaters)', () => {
    const { s, tank } = world('freshwater_tropical', 'g20L', [['neon_tetra', 6], ['panda_corydoras', 3]]);
    const v = equipmentFit(s, tank.id, 'autofeeder');
    expect(v.level).toBe('partial');
    expect(v.text).toMatch(/one dry food per feeding/);
    expect(v.text).toMatch(/tropical flakes/);
    expect(v.text).toMatch(/panda corydoras/);
    expect(v.text).toMatch(/sinking pellets|algae wafers/);
  });

  it('dry eaters but no dry food on the shelf: needs food', () => {
    const { s, tank } = world('freshwater_tropical', 'g20L', [['neon_tetra', 6]], { foods: { bloodworm_frozen: 60 } });
    const v = equipmentFit(s, tank.id, 'autofeeder');
    expect(v.level).toBe('partial');
    expect(v.label).toBe('Needs food');
    expect(v.text).toMatch(/no dry food they eat in stock — buy Tropical Flakes/);
  });

  it('an empty tank gets general advice only (no badge)', () => {
    const { s, tank } = world('freshwater_tropical', 'g20L', []);
    const v = equipmentFit(s, tank.id, 'autofeeder');
    expect(v.level).toBe('ok');
    expect(v.general).toBe(true);
    expect(v.text).toMatch(/Seahorses, puffers/);
  });

  it('installing it in the seahorse tank says so right away', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 3]]);
    const r = installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/Heads-up: .*only eat frozen or live food/);
    const af = s.tanks[tank.id].equipment.find((e) => e.defId === 'autofeeder')!;
    expect(installedFit(s, tank.id, af.id)?.level).toBe('useless');
    const issues = tankGearIssues(s, tank.id, { attentionOnly: true });
    expect(issues.map((i) => i.defId)).toEqual(['autofeeder']);
    // paused: still useless, but no longer "running gear" for the tank card / dots
    setEquipment(s, tank.id, af.id, { on: false });
    expect(tankGearIssues(s, tank.id)).toEqual([]);
    const back = setEquipment(s, tank.id, af.id, { on: true });
    expect(back.message).toMatch(/Heads-up: .*can’t feed/);
  });
});

describe('fit: autofeeder notices in the sim (accurate, never "empty" when it is not)', () => {
  it('seahorse-only tank: explains it can’t feed them, keeps the flakes, and repeats only every few days', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 3]]);
    installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    const flakes = s.inventory.foods.flake_tropical;
    advanceWorld(s, 24 * 2, { forceFull: true });
    expect(s.inventory.foods.flake_tropical).toBe(flakes); // it never dropped food nobody eats
    const text = logText(s);
    expect(text).not.toMatch(/autofeeder on .* is empty/);
    const notes = s.log.filter((e) => /autofeeder on Test Tank can’t feed anything here/.test(e.text));
    expect(notes.length).toBe(1); // 72 h throttle
    expect(notes[0].text).toMatch(/3 lined seahorses only eat frozen or live food \(mysis, brine shrimp, live copepods\)/);
    expect(notes[0].text).toMatch(/Feed them by hand or target-feed/);
    expect(notes[0].toast).toBe(true); // the first notice is toasted
  });

  it('flake eaters with no dry food left: says which food to buy', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['firefish', 3]], { foods: { mysis_frozen: 60 } });
    installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    advanceWorld(s, 30, { forceFull: true });
    const n = s.log.find((e) => /autofeeder on Test Tank is out of dry food/.test(e.text));
    expect(n?.text).toMatch(/your 3 firefish eat — buy (Tropical Flakes|Micro Pellets|Marine Pellets)/);
  });

  it('mixed tank: feeds the firefish, notes the seahorses (as a tip), and spends the flakes', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 2], ['firefish', 3]]);
    installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    const flakes = s.inventory.foods.flake_tropical;
    advanceWorld(s, 30, { forceFull: true });
    expect(s.inventory.foods.flake_tropical).toBeLessThan(flakes);
    const n = s.log.filter((e) => /autofeeder on Test Tank only feeds/.test(e.text));
    expect(n.length).toBe(1);
    expect(n[0].kind).toBe('tip');
    expect(n[0].text).toMatch(/firefish/);
    expect(n[0].text).toMatch(/lined seahorses only eat frozen or live food/);
  });
});

describe('fit: every other kind of equipment', () => {
  it('heaters: useless for axolotls, needed by neons, optional for medaka, backup when one already holds', () => {
    const axo = world('freshwater_cool', 'g40B', [['axolotl', 1]]);
    expect(equipmentFit(axo.s, axo.tank.id, 'heater_100w').level).toBe('useless');
    expect(equipmentFit(axo.s, axo.tank.id, 'heater_100w').text).toMatch(/can’t cool water/);
    const neon = world('freshwater_tropical', 'g20L', [['neon_tetra', 6]], { kit: false });
    const nv = equipmentFit(neon.s, neon.tank.id, 'heater_100w');
    expect(nv.level).toBe('ok');
    expect(nv.text).toMatch(/warmer than the room/);
    const med = world('freshwater_tropical', 'g20L', [['medaka', 6]], { kit: false });
    expect(equipmentFit(med.s, med.tank.id, 'heater_100w').label).toBe('Optional');
    expect(equipmentFit(med.s, med.tank.id, 'heater_100w').soft).toBe(true);
    const kit = world('freshwater_tropical', 'g20L', [['neon_tetra', 6]]);
    expect(equipmentFit(kit.s, kit.tank.id, 'heater_100w').text).toMatch(/backup/);
  });

  it('chillers: needed for axolotls in a 22 °C room, pointless in a heated tropical reef', () => {
    const axo = world('freshwater_cool', 'g40B', [['axolotl', 1]], { kit: false });
    expect(equipmentFit(axo.s, axo.tank.id, 'chiller_mini').level).toBe('ok');
    const clown = world('marine_fowlr', 'g40B', [['ocellaris_clownfish', 2]]);
    const cv = equipmentFit(clown.s, clown.tank.id, 'chiller_mini');
    expect(cv.level).toBe('useless');
    expect(cv.text).toMatch(/nothing to do here/);
  });

  it('fans: no use in a heated tropical tank', () => {
    const { s, tank } = world('freshwater_tropical', 'g20L', [['neon_tetra', 6]]);
    expect(equipmentFit(s, tank.id, 'fan_clip').level).toBe('useless');
  });

  it('flow: a powerhead over a betta in a 10-gallon is harmful; strong pumps never pass as fine for seahorses', () => {
    const b = world('freshwater_tropical', 'g10', [['betta', 1]]);
    const bv = equipmentFit(b.s, b.tank.id, 'powerhead_small');
    expect(['harmful', 'partial']).toContain(bv.level);
    expect(bv.text).toMatch(/current/);
    const sh = world('marine_fowlr', 'g40B', [['lined_seahorse', 3]]);
    expect(equipmentFit(sh.s, sh.tank.id, 'wavemaker').level).not.toBe('ok');
    const loach = world('freshwater_cool', 'g40B', [['hillstream_loach', 4]], { kit: false });
    const lv = equipmentFit(loach.s, loach.tank.id, 'powerhead_large');
    expect(lv.level === 'ok' || lv.level === 'partial').toBe(true);
  });

  it('CO₂ with no live plants won’t help; lids matter for jumpers; skimmers are salt-water only', () => {
    const { s, tank } = world('freshwater_tropical', 'g20L', [['betta', 1]]);
    s.tanks[tank.id].decor = []; // bare tank: no live plants
    const co2 = equipmentFit(s, tank.id, 'co2_kit');
    expect(co2.level).toBe('useless');
    expect(co2.text).toMatch(/only feeds live plants/);
    s.tanks[tank.id].equipment = s.tanks[tank.id].equipment.filter((e) => e.defId !== 'lid_glass');
    const lid = equipmentFit(s, tank.id, 'lid_glass');
    expect(lid.level).toBe('ok');
    expect(lid.text).toMatch(/jump or climb out/);
    const sk = equipmentFit(s, tank.id, 'skimmer_hob');
    expect(sk.blocked).toBe(true);
    expect(sk.label).toBe('Can’t install');
  });

  it('a second lid is blocked, and brackish water barely runs a skimmer', () => {
    const { s, tank } = world('brackish', 'g40B', [['bumblebee_goby', 4]]);
    expect(equipmentFit(s, tank.id, 'lid_glass').blocked).toBe(true);
    const sk = equipmentFit(s, tank.id, 'skimmer_hob');
    expect(sk.level).toBe('useless');
    expect(sk.text).toMatch(/sea-strength/);
  });

  it('every catalog item gets a verdict in a few typical tanks without throwing', () => {
    const tanks = [
      world('marine_fowlr', 'g40B', [['lined_seahorse', 3]]),
      world('freshwater_tropical', 'g20L', [['neon_tetra', 6], ['panda_corydoras', 3]]),
      world('freshwater_cool', 'g40B', [['axolotl', 1]]),
      world('reef', 'g75', [['ocellaris_clownfish', 2], ['yellow_tang', 1]]),
      world('freshwater_planted', 'g10', []),
    ];
    for (const { s, tank } of tanks)
      for (const e of EQUIPMENT) {
        const v = equipmentFit(s, tank.id, e.id);
        expect(v.text.length, `${e.id} in ${tank.waterClass}`).toBeGreaterThan(10);
        expect(v.text).not.toMatch(/undefined|NaN|_/);
      }
  });
});

describe('fit: foods — who eats it', () => {
  it('names the eaters here and elsewhere, flags foods nobody eats, and says if an autofeeder can drop it', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 3]]);
    const other = createTank(s, 'g20L', 'marine_fowlr', { cycled: true, placement: { x: 2, z: 0, rotY: 0 }, name: 'Reef Nano' });
    s.tanks[other.id] = other;
    if (!s.tankOrder.includes(other.id)) s.tankOrder.push(other.id);
    const rng = simRng(s);
    for (let i = 0; i < 2; i++) addCreature(s, createCreature(s, rng, 'firefish', { ageDays: 60 }), other.id);

    const mysis = foodFit(s, 'mysis_frozen', tank.id);
    expect(mysis.level).toBe('ok');
    expect(mysis.autofeeder).toBe(false);
    expect(mysis.text).toMatch(/Eaten here by 3 lined seahorses/);
    expect(mysis.text).toMatch(/2 firefish \(Reef Nano\)/);
    expect(mysis.formText).toMatch(/Frozen — thaw it and feed by hand/);

    const flakesHere = foodFit(s, 'flake_tropical', tank.id);
    expect(flakesHere.autofeeder).toBe(true);
    expect(flakesHere.text).toMatch(/Nothing in Test Tank eats it — 2 firefish \(Reef Nano\) do/);

    const veg = foodFit(s, 'blanched_veg');
    expect(veg.level).toBe('useless');
    expect(veg.text).toBe('Nobody you keep eats this.');
  });
});

describe('fit: feeding the wrong food says what they do eat', () => {
  it('flakes for seahorses: nothing eats it, and they eat mysis, brine shrimp and live copepods', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 3]]);
    const r = feedTank(s, tank.id, 'flake_tropical');
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/Nothing in this tank eats it — uneaten tropical flakes will rot into ammonia\. Lined seahorses eat mysis, brine shrimp and live copepods\./);
  });
});

describe('fit: life-step hints never suggest an autofeeder to a frozen-food eater', () => {
  it('a very hungry seahorse in a tank with an autofeeder is told what it eats instead', () => {
    const { s, tank } = world('marine_fowlr', 'g40B', [['lined_seahorse', 1]], { foods: {} });
    installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    for (const c of Object.values(s.creatures)) c.stats.hunger = 85;
    advanceWorld(s, 2, { forceFull: true });
    const hungry = s.log.find((e) => /very hungry/.test(e.text));
    expect(hungry?.text).toMatch(/The autofeeder can’t feed (it|him|her) — (it|he|she) only eats frozen or live food/);
  });
});
