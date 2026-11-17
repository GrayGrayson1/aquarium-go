/**
 * Audit 2026-11-17, area E (breeding, young and genetics): what the breeding screens and lines now say and decide.
 * One describe per finding (E1, E2…), in the findings' order.
 */
import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { devForceBreeding, separateCreature } from '@/sim/life/breeding/actions';
import { breedingCheck, breedingStatus, clutchStatus } from '@/sim/life/breeding';
import { readinessHint } from '@/sim/life/breeding/check';
import { createClutch, mintJuveniles } from '@/sim/life/breeding/clutch';
import { getSpecies } from '@/data/species';
import { makeContext } from '@/sim/context';

vi.setConfig({ testTimeout: 240_000 });

/** A diligent keeper: fed, healthy, clean water at the given temperature. */
function keeper(state: GameState, tempC: number): void {
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 15);
    c.stats.health = Math.max(c.stats.health, 90);
    c.stats.stress = Math.min(c.stats.stress, 30);
    c.stats.comfort = Math.max(c.stats.comfort, 70);
    if (c.illness) delete c.illness;
  }
  for (const t of Object.values(state.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    t.water.nitrate = Math.min(t.water.nitrate, 20);
    t.water.oxygen = Math.max(t.water.oxygen, 0.9);
    t.water.tempC = tempC;
    for (const eq of t.equipment) if (eq.defId.includes('heater') || eq.defId.includes('chiller')) eq.setting = tempC;
  }
}

function run(state: GameState, maxHours: number, tempC: number, until: () => boolean, chunk = 1): number {
  let t = 0;
  while (t < maxHours) {
    if (until()) return t;
    keeper(state, tempC);
    advanceWorld(state, chunk, { forceFull: true });
    t += chunk;
  }
  return t;
}

const starter = (state: GameState) => Object.values(state.creatures).find((c) => c.isStarter)!;
const logFrom = (state: GameState, from: number) => state.log.slice(from).map((e) => e.text);

describe('E1: a parent moved into the nursery with its young', () => {
  it('a seahorse father who gives birth in the nursery is told to leave, and the warning names him, not the young', () => {
    const state = newGame({ starterId: 'lined_seahorse', starterName: 'Atlas', seed: 4242 });
    const atlas = starter(state);
    addCreature(state, createCreature(state, simRng(state), 'lined_seahorse', { sex: 'female', ageDays: 26, name: 'Seraphina' }), atlas.tankId!);
    expect(devForceBreeding(state, atlas.id).ok).toBe(true);
    run(state, 24, 24, () => atlas.repro.stage === 'pregnant');
    expect(atlas.repro.stage).toBe('pregnant');
    const nursery = createTank(state, 'g29', 'marine_live_rock', { cycled: true, purpose: 'nursery', name: 'Nursery' });
    expect(separateCreature(state, atlas.id, nursery.id).ok).toBe(true);
    expect(devForceBreeding(state, atlas.id).ok).toBe(true); // due now
    const from = state.log.length;
    run(state, 48, 24, () => atlas.repro.stage !== 'pregnant');
    const birth = logFrom(state, from).find((t) => /gave birth/.test(t));
    expect(birth).toMatch(/Move Atlas back out now — adults eat the fry\./);
    run(state, 12, 24, () => logFrom(state, from).some((t) => /eating/.test(t)));
    const eat = logFrom(state, from).find((t) => /eating/.test(t));
    expect(eat).toBe('Atlas is eating his own fry! Move him out of Nursery now.');
    // the Eggs & fry card no longer calls a nursery with the father in it safe
    const cl = Object.values(state.clutches).find((c) => c.tankId === nursery.id)!;
    const st = clutchStatus(state, cl.id)!;
    expect(st.safe).toBe(false);
    expect(st.warnings).toContain('Atlas eats the young here — move him out');
    expect(st.moveOut).toEqual({ id: atlas.id, name: 'Atlas' }); // the review: the card offers his Move dialog
  });

  it('a guppy mother who drops her fry in the nursery is told to leave', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 77 });
    const home = createTank(state, 'g20L', 'freshwater_planted', { cycled: true, name: 'Community' });
    const bella = addCreature(state, createCreature(state, simRng(state), 'fancy_guppy', { sex: 'female', ageDays: 60, name: 'Bella' }), home.id);
    addCreature(state, createCreature(state, simRng(state), 'fancy_guppy', { sex: 'male', ageDays: 60, name: 'Max' }), home.id);
    const nursery = createTank(state, 'g10', 'freshwater_planted', { cycled: true, purpose: 'nursery', name: 'Nursery' });
    expect(devForceBreeding(state, bella.id).ok).toBe(true);
    expect(separateCreature(state, bella.id, nursery.id).ok).toBe(true);
    const from = state.log.length;
    run(state, 6, 25, () => logFrom(state, from).some((t) => /dropped/.test(t)));
    expect(logFrom(state, from).find((t) => /dropped/.test(t))).toMatch(/Move Bella back out — adults eat fry\.$/);
  });
});

describe('E2/E3: the clutch card shows the room, the eaters and the per-clutch cap before the end', () => {
  it('eggs in a small tank say how many will fit, and that only so many of a clutch are kept', () => {
    const state = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 902 });
    const mochi = starter(state);
    const tiny = createTank(state, 'g5', 'freshwater_cool', { cycled: true, purpose: 'nursery', name: 'Tiny' });
    const sp = getSpecies('axolotl');
    const cl = createClutch(state, { sp, tank: tiny, mother: mochi, father: null, hour: state.clock.hour, stage: 'eggs', count: 600, visual: 'eggs_scattered', nextStageHour: state.clock.hour + 100 });
    const st = clutchStatus(state, cl.id)!;
    expect(st.safe).toBe(true);
    expect(st.warnings.join(' ')).toMatch(/^(Room for only \d+ of these|No room in Tiny for these young) when they grow up — move them to a bigger or emptier tank/);
    expect(st.keepNote).toBe('You can keep up to 8 young from this clutch; the rest go to local hobbyists.');
  });

  it('a discus pair alone with its eggs is not called a danger to them', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 31 });
    const home = createTank(state, 'g55', 'freshwater_tropical', { cycled: true, name: 'Discus' });
    const rng = simRng(state);
    const m = addCreature(state, createCreature(state, rng, 'discus', { sex: 'male', ageDays: 400, name: 'Rio' }), home.id);
    const f = addCreature(state, createCreature(state, rng, 'discus', { sex: 'female', ageDays: 400, name: 'Sol' }), home.id);
    const cl = createClutch(state, { sp: getSpecies('discus'), tank: home, mother: f, father: m, hour: state.clock.hour, stage: 'eggs', count: 120, visual: 'eggs_adhesive', nextStageHour: state.clock.hour + 60, guardedById: m.id });
    const st = clutchStatus(state, cl.id)!;
    expect(st.safe).toBe(true);
    expect(st.warnings.join(' ')).not.toMatch(/eat|nursery/);
  });

  it('when the per-clutch cap, not the tank, sends young away, the line says so', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 33 });
    const big = createTank(state, 'g75', 'freshwater_planted', { cycled: true, purpose: 'nursery', name: 'Big' });
    const sp = getSpecies('fancy_guppy');
    const rng = simRng(state);
    const mom = addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'female', ageDays: 90, name: 'Bella' }), createTank(state, 'g10', 'freshwater_planted', { cycled: true }).id);
    const cl = createClutch(state, { sp, tank: big, mother: mom, father: null, hour: state.clock.hour, stage: 'fry', count: 30, visual: 'fry_cloud', nextStageHour: state.clock.hour });
    const from = state.log.length;
    mintJuveniles(state, cl, big, sp, state.clock.hour, makeContext(state, 1));
    expect(logFrom(state, from).join(' ')).toMatch(/10 young fancy guppies .* 20 more were rehomed to local hobbyists\. You keep up to 10 young from each clutch\./);
  });
});

describe('E4: the pairing check names what holds breeding condition down', () => {
  it('a crowded tank is named, not food', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 41 });
    const tank = createTank(state, 'g10', 'freshwater_planted', { cycled: true, name: 'Community' });
    const rng = simRng(state);
    const bella = addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'female', ageDays: 90, name: 'Bella' }), tank.id);
    for (let i = 0; i < 30; i++) addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: i % 2 ? 'male' : 'female', ageDays: 90 }), tank.id);
    keeper(state, 25);
    bella.stats.breedingReadiness = 10;
    expect(readinessHint(state, bella, getSpecies('fancy_guppy'), state.clock.hour)).toBe('Community is too full for them to breed (young count as nearly grown) — sell or move some animals.');
  });

  it('low comfort is named; with everything fine the old advice stays', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 42 });
    const tank = createTank(state, 'g29', 'freshwater_planted', { cycled: true, name: 'Community' });
    const bella = addCreature(state, createCreature(state, simRng(state), 'fancy_guppy', { sex: 'female', ageDays: 90, name: 'Bella' }), tank.id);
    keeper(state, 25);
    const sp = getSpecies('fancy_guppy');
    expect(readinessHint(state, bella, sp, state.clock.hour)).toBe('Keep them healthy, well fed and calm — condition builds over a few hours.');
    bella.stats.comfort = 5;
    bella.stats.health = 70;
    expect(readinessHint(state, bella, sp, state.clock.hour)).toBe('Bella isn’t comfortable enough to breed (comfort 5%) — the notes under Condition on her card say why.');
  });
});

describe('E6: every spawning gate shows at once, and a ripe female says why she waits', () => {
  it('a white cloud pair in a bare, warm tank hears about the cover and the heat together', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 51 });
    const tank = createTank(state, 'g20L', 'freshwater_cool', { cycled: true, name: 'Bare' });
    tank.decor = [];
    const rng = simRng(state);
    const m = addCreature(state, createCreature(state, rng, 'white_cloud_minnow', { sex: 'male', ageDays: 200, name: 'Hiro' }), tank.id);
    const f = addCreature(state, createCreature(state, rng, 'white_cloud_minnow', { sex: 'female', ageDays: 200, name: 'Kumo' }), tank.id);
    tank.water.tempC = 26;
    const chk = breedingCheck(state, m.id, f.id);
    const text = chk.reasons.join(' ');
    expect(text).toMatch(/only spawn in dense cover \(plants or moss\) — cover here is \d+% \(they need about 40%\)\./);
    expect(text).toMatch(/The water is too warm to spawn \(needs ≤ 24 °C\)\./);
    f.repro.stage = 'gravid';
    expect(breedingStatus(state, f.id)).toMatchObject({ label: 'Full of eggs', detail: expect.stringMatching(/^Can’t spawn yet: White cloud mountain minnows only spawn in dense cover \(plants or moss\) — cover here is \d+% \(they need about 40%\)$/) });
  });
});

describe('E7: a line that sends young to a nursery opens Livestock › Eggs & fry', () => {
  it('links nursery advice about eggs and young, not a tank named Nursery or a purpose change', async () => {
    const { eventLink } = await import('@/ui/hud/eventLinks');
    const eggs = { panel: 'livestock', target: 'tab:young', label: 'Open Eggs & fry' };
    expect(eventLink({ kind: 'breeding', text: 'Pip and Pop spawned deep in the plants — 8 tiny eggs! Adult pea puffers eat their eggs, so move them to a nursery tank (Livestock › Eggs & fry).' })).toMatchObject(eggs);
    expect(eventLink({ kind: 'warning', text: 'The adult axolotls are eating Mochi’s eggs! Move the clutch to a nursery tank (Livestock › Eggs & fry).' })).toMatchObject(eggs);
    expect(eventLink({ kind: 'breeding', text: 'Atlas spat out 12 perfect miniature cardinals — they’ll shelter among spines and branches. A nursery gives the young the best start.' })).toMatchObject(eggs);
    expect(eventLink({ kind: 'warning', text: 'Atlas is eating his own fry! Move him out of Nursery now.' })).toBeNull();
    expect(eventLink({ kind: 'info', text: 'Tank 2 is now a nursery tank.' })).toBeNull();
  });
});

describe('E9: a water warning names what is wrong with the water', () => {
  it('molly fry in fresh water hear about the water type, not about ammonia and nitrite', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 61 });
    const tank = createTank(state, 'g29', 'freshwater_planted', { cycled: true, name: 'Community' });
    const sp = getSpecies('sailfin_molly');
    const mom = addCreature(state, createCreature(state, simRng(state), 'sailfin_molly', { sex: 'female', ageDays: 200, name: 'Bella' }), createTank(state, 'g29', 'brackish', { cycled: true }).id);
    createClutch(state, { sp, tank, mother: mom, father: null, hour: state.clock.hour, stage: 'fry', count: 40, visual: 'fry_cloud', nextStageHour: state.clock.hour + 48 });
    const from = state.log.length;
    run(state, 4, 25, () => logFrom(state, from).some((t) => /is hurting/.test(t)));
    expect(logFrom(state, from).find((t) => /is hurting/.test(t))).toBe('The water in Community is hurting Bella’s fry: Community is fresh water, and sailfin molly young do much better in brackish water.');
  });
});

describe('E12: a cichlid pair’s lines match the pair rule (either parent tends, neither eats the brood)', () => {
  function discusPair(stage: 'eggs' | 'fry') {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
    const home = createTank(state, 'g55', 'freshwater_tropical', { cycled: true, name: 'Discus' });
    const side = createTank(state, 'g29', 'freshwater_tropical', { cycled: true, name: 'Side' });
    const rng = simRng(state);
    const m = addCreature(state, createCreature(state, rng, 'discus', { sex: 'male', ageDays: 400, name: 'Rio' }), home.id);
    const f = addCreature(state, createCreature(state, rng, 'discus', { sex: 'female', ageDays: 400, name: 'Sol' }), home.id);
    const cl = createClutch(state, { sp: getSpecies('discus'), tank: home, mother: f, father: m, hour: state.clock.hour, stage, count: 120, visual: stage === 'eggs' ? 'eggs_adhesive' : 'fry_cloud', nextStageHour: state.clock.hour + 40, guardedById: m.id });
    m.repro.stage = 'guarding';
    m.repro.clutchId = cl.id;
    return { state, home, side, m, f, cl };
  }

  it('moving or selling one parent says the other goes on tending; the free-swimming fry can stay with the pair', async () => {
    const { saleWarnings } = await import('@/sim/economy/warnings');
    const a = discusPair('eggs');
    expect(saleWarnings(a.state, [a.m.id])).toContain('Rio is guarding 120 eggs with Sol, who will go on tending them alone.');
    expect(separateCreature(a.state, a.m.id, a.side.id).message).toMatch(/^Rio moved to Side; Sol is still fanning the eggs\.( Heads up: .*)?$/);
    const b = discusPair('fry');
    expect(breedingStatus(b.state, b.m.id)).toMatchObject({ label: 'Fry are free-swimming', detail: 'The pair herd them and keep them safe' });
  });

  it('eggs moved into the tank where the parents live are not said to be in danger from them', async () => {
    const { moveClutch } = await import('@/sim/life/breeding/actions');
    const a = discusPair('eggs');
    a.cl.tankId = a.side.id; // the eggs were taken away; now they go back to their parents
    delete a.cl.guardedById;
    a.home.water.tempC = 29;
    const res = moveClutch(a.state, a.cl.id, a.home.id);
    expect(res.ok, res.message).toBe(true);
    expect(res.message).not.toMatch(/may eat them|airstone/);
  });
});

describe('E14: the seasonal cue names the button and says it takes two', () => {
  it('a corydoras pair waiting for the cue is told to press Cool 25% twice in a row', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 81 });
    const tank = createTank(state, 'g20L', 'freshwater_tropical', { cycled: true, name: 'Cory' });
    const rng = simRng(state);
    const m = addCreature(state, createCreature(state, rng, 'panda_corydoras', { sex: 'male', ageDays: 300, name: 'Pan' }), tank.id);
    const f = addCreature(state, createCreature(state, rng, 'panda_corydoras', { sex: 'female', ageDays: 300, name: 'Da' }), tank.id);
    const chk = breedingCheck(state, m.id, f.id);
    expect(chk.reasons).toContain('They are waiting for a seasonal cue.');
    expect(chk.nextStep).toBe('Press Cool 25% twice in a row (tank card › Water › Care) — the water needs to drop about 2 °C to feel like the first cool rains.');
  });
});

describe('E15: plain words for breeding, and a short page that explains them', () => {
  it('statuses use words a child knows, and Aquarium science has “How breeding works”', async () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 91 });
    const tank = createTank(state, 'g29', 'freshwater_planted', { cycled: true });
    const bella = addCreature(state, createCreature(state, simRng(state), 'fancy_guppy', { sex: 'female', ageDays: 90, name: 'Bella' }), tank.id);
    bella.repro.stage = 'gravid';
    bella.repro.carryingUntilHour = state.clock.hour + 72;
    expect(breedingStatus(state, bella.id)?.label).toBe('Pregnant — fry due in ~3 days');
    bella.repro.stage = 'conditioning';
    expect(breedingStatus(state, bella.id)?.label).toBe('Getting into breeding shape');
    const { ARTICLES } = await import('@/ui/panels/encyclopedia/science');
    expect(ARTICLES.find((a) => a.id === 'how_breeding_works')).toMatchObject({ title: 'How breeding works', isNew: true });
  });
});

describe('E17: hermaphrodites and snails that can’t be sexed by eye', () => {
  it('say so instead of “Not yet visible” forever', async () => {
    const { sexRoleText } = await import('@/ui/common/format');
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed: 93 });
    const reef = createTank(state, 'g29', 'reef', { cycled: true });
    const shrimp = addCreature(state, createCreature(state, simRng(state), 'cleaner_shrimp', { ageDays: 100 }), reef.id);
    expect(sexRoleText(shrimp, getSpecies('cleaner_shrimp'), state.clock.hour)).toEqual({ label: 'Both sexes', detail: 'Any two adults can pair up — both can carry eggs.' });
    const fresh = createTank(state, 'g10', 'freshwater_tropical', { cycled: true });
    const snail = addCreature(state, createCreature(state, simRng(state), 'mystery_snail', { ageDays: 40 }), fresh.id);
    snail.sex = 'unknown';
    expect(sexRoleText(snail, getSpecies('mystery_snail'), state.clock.hour)).toEqual({ label: 'Can’t be told by eye', detail: 'Keep a few together and they pair up on their own.' });
    // the review: the pairing advice only where the game pairs them; a tang, a puffer and an anemone get the plain fact
    const trochus = addCreature(state, createCreature(state, simRng(state), 'trochus_snail', { ageDays: 40 }), reef.id);
    trochus.sex = 'unknown';
    expect(sexRoleText(trochus, getSpecies('trochus_snail'), state.clock.hour)).toEqual({ label: 'Can’t be told by eye', detail: 'Keep a few together and they pair up on their own.' });
    for (const id of ['yellow_tang', 'fahaka_puffer', 'bubbletip_anemone']) {
      const sp = getSpecies(id);
      expect(sp.lifecycle.sexVisibleAtDays, id).toBeGreaterThanOrEqual(sp.lifecycle.lifespanDays);
      const tank = createTank(state, 'g180', sp.waterClasses[0], { cycled: true });
      const c = addCreature(state, createCreature(state, simRng(state), id, { ageDays: 60 }), tank.id);
      c.sex = 'unknown';
      expect(sexRoleText(c, sp, state.clock.hour), id).toEqual({ label: 'Can’t be told by eye' });
    }
  });
});

describe('E18: the Move dialog’s move keeps the space warning', () => {
  it('an adult oscar moved into a small tank hears it needs more room', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 95 });
    const big = createTank(state, 'g125', 'freshwater_tropical', { cycled: true, name: 'Big' });
    const small = createTank(state, 'g20L', 'freshwater_tropical', { cycled: true, name: 'Small tank' });
    const bruno = addCreature(state, createCreature(state, simRng(state), 'oscar', { sex: 'male', ageDays: 900, name: 'Bruno' }), big.id);
    const res = separateCreature(state, bruno.id, small.id);
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/^Moved Bruno to Small tank\. Heads up: an adult oscar needs at least \d+ gallons\.$/);
  });
});

describe('E19: the Move dialog warns before taking a guarding parent off its eggs', () => {
  it('a betta male on his nest warns; a discus male whose mate stays with the eggs doesn’t', async () => {
    const { moveWarning } = await import('@/sim/life/breeding');
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 777 });
    const ember = starter(state);
    expect(devForceBreeding(state, ember.id).ok).toBe(true);
    run(state, 12, 27, () => ember.repro.stage === 'guarding');
    expect(ember.repro.stage).toBe('guarding');
    const n = state.clutches[ember.repro.clutchId!].count;
    expect(moveWarning(state, ember.id)).toBe(`Ember is guarding ${n.toLocaleString('en-US')} eggs — without a parent they may fungus or fall from the nest. Move him anyway?`);
    const d = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
    const home = createTank(d, 'g55', 'freshwater_tropical', { cycled: true });
    const m = addCreature(d, createCreature(d, simRng(d), 'discus', { sex: 'male', ageDays: 400, name: 'Rio' }), home.id);
    const f = addCreature(d, createCreature(d, simRng(d), 'discus', { sex: 'female', ageDays: 400, name: 'Sol' }), home.id);
    const cl = createClutch(d, { sp: getSpecies('discus'), tank: home, mother: f, father: m, hour: d.clock.hour, stage: 'eggs', count: 80, visual: 'eggs_adhesive', nextStageHour: d.clock.hour + 40, guardedById: m.id });
    m.repro.stage = 'guarding';
    m.repro.clutchId = cl.id;
    expect(moveWarning(d, m.id)).toBeNull();
  });
});

describe('E24: genotype words a child can read', () => {
  it('no “het”, “homozygous” or “intermediate” on the card', async () => {
    const { describeLocus } = await import('@/sim/life/genetics');
    const sp = getSpecies('betta');
    const additive = sp.genetics.loci.find((l) => l.mode === 'additive');
    expect(additive).toBeDefined();
    const [x, y] = additive!.alleles.map((al) => al.id);
    expect(describeLocus(additive!, [x, y])).toMatch(/ \+ .* \(a blend of both\)$/);
    expect(describeLocus(additive!, [y, y])).toMatch(/ ×2 \(two copies: the full look\)$/);
  });
});

describe('E22: an anemone that isn’t splitting says why', () => {
  it('a newly bought anemone says it hasn’t settled in yet, and the encyclopedia doesn’t call it “not bred”', async () => {
    const { breedingSystemInfo } = await import('@/sim/life/breeding');
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed: 97 });
    const reef = createTank(state, 'g180', 'reef', { cycled: true });
    const rosie = addCreature(state, createCreature(state, simRng(state), 'bubbletip_anemone', { ageDays: 200, name: 'Rosie' }), reef.id);
    rosie.acquiredHour = state.clock.hour;
    expect(breedingStatus(state, rosie.id)).toMatchObject({ label: 'Splits by itself', detail: 'Not splitting — Rosie hasn’t settled in yet: an anemone splits only after a couple of weeks in one tank.' });
    expect(breedingSystemInfo('bubbletip_anemone')?.breedable).toBe(true);
  });
});

describe('E23/E25: clutch words match what the young are and what can be done', () => {
  it('singulars, hatch notices and a cichlid’s wriggling fry', async () => {
    const { youngSingular, breedNotice } = await import('@/sim/life/breeding/common');
    expect(youngSingular('larvae')).toBe('larva');
    expect(youngSingular('wriggling fry')).toBe('wriggling fry');
    expect(youngSingular('shrimplets')).toBe('shrimplet');
    const { planNotification } = await import('@/ui/notify/rules');
    const ev = { id: 'ev_1', hour: 100, kind: 'breeding' as const, text: 'x', notice: { topic: 'hatch' as const, vars: { name: 'Sol', n: 90, tank: 'Discus', young: 'wriggling fry' } } };
    expect(planNotification(ev, { hour: 100, tankName: () => null })).toMatchObject({ title: 'Sol’s eggs hatched', body: '90 wriggling fry hatched in Discus.' });
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
    const home = createTank(state, 'g55', 'freshwater_tropical', { cycled: true, name: 'Discus' });
    expect(breedNotice('hatch', 'Sol', 120, home, 'wriggling fry')).toEqual({ topic: 'hatch', vars: { name: 'Sol', n: 120, tank: 'Discus', young: 'wriggling fry' } });
    const rng = simRng(state);
    const m = addCreature(state, createCreature(state, rng, 'discus', { sex: 'male', ageDays: 400, name: 'Rio' }), home.id);
    const f = addCreature(state, createCreature(state, rng, 'discus', { sex: 'female', ageDays: 400, name: 'Sol' }), home.id);
    const cl = createClutch(state, { sp: getSpecies('discus'), tank: home, mother: f, father: m, hour: state.clock.hour, stage: 'larvae', count: 90, visual: 'eggs_adhesive', nextStageHour: state.clock.hour + 40, guardedById: m.id });
    m.repro.stage = 'guarding';
    m.repro.clutchId = cl.id;
    expect(breedingStatus(state, m.id)).toMatchObject({ label: 'Tending 90 wriggling fry', detail: 'Keeping them together and safe' });
  });
});

describe('E28: a lost shark egg case is said, and the last one is an egg case', () => {
  it('one case eaten of two is said; losing the last names egg cases, not eggs', async () => {
    const { stepClutch } = await import('@/sim/life/breeding/clutch');
    const { moduleFor } = await import('@/sim/life/breeding/registry');
    const { makeTankInfo } = await import('@/sim/life/breeding/common');
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed: 101 });
    const tank = createTank(state, 'g500', 'marine_fowlr', { cycled: true, name: 'Big' });
    const sp = getSpecies('epaulette_shark');
    const rng = simRng(state);
    const mom = addCreature(state, createCreature(state, rng, 'epaulette_shark', { sex: 'female', ageDays: sp.breeding.maturityDays + 10, name: 'Coral' }), tank.id);
    addCreature(state, createCreature(state, rng, 'epaulette_shark', { sex: 'male', ageDays: sp.breeding.maturityDays + 10, name: 'Reef' }), tank.id);
    const cl = createClutch(state, { sp, tank, mother: mom, father: null, hour: state.clock.hour, stage: 'eggs', count: 2, visual: 'egg_case', nextStageHour: state.clock.hour + 5000 });
    const draws = [0, 0.999, 0];
    const ctx = makeContext(state, 1);
    ctx.rng = { ...ctx.rng, next: () => draws.shift() ?? 0.999 };
    const info = makeTankInfo(state, tank, state.clock.hour, () => []);
    const from = state.log.length;
    stepClutch(state, cl, tank, sp, moduleFor(sp), state.clock.hour, 1, ctx, info);
    expect(logFrom(state, from)).toContain('One of Coral’s egg cases was eaten; 1 is left. A nursery tank keeps the rest safe (Livestock › Eggs & fry).');
    stepClutch(state, cl, tank, sp, moduleFor(sp), state.clock.hour, 1, ctx, info);
    expect(state.clutches[cl.id]).toBeUndefined();
    expect(logFrom(state, from).some((t) => /^Coral’s egg cases didn’t make it: /.test(t))).toBe(true);
  });
});

describe('E11: the nest-site gate asks each species for what it lays on (B-223)', () => {
  const piece = (defId: string, i: number) => ({ id: `d_${defId}_${i}`, defId, x: -0.2 + i * 0.1, y: 0, z: 0, rotY: 0, scale: 1, seed: i, growth: 1, health: 100 });
  function pair(speciesId: string, waterClass: 'freshwater_tropical' | 'freshwater_planted' | 'reef' | 'marine_fowlr', decor: string[], substrate?: 'bare' | 'sand') {
    const state = newGame({ starterId: waterClass.startsWith('fresh') ? 'betta' : 'ocellaris_clownfish', starterName: 'Solo', seed: 111 });
    const tank = createTank(state, 'g75', waterClass, { cycled: true, name: 'Test' });
    tank.decor = decor.map(piece);
    if (substrate) tank.substrate = { kind: substrate, depthCm: 3, color: '#ccc' };
    const sp = getSpecies(speciesId);
    const rng = simRng(state);
    const m = addCreature(state, createCreature(state, rng, speciesId, { sex: 'male', ageDays: sp.breeding.maturityDays + 20, name: 'M' }), tank.id);
    const f = addCreature(state, createCreature(state, rng, speciesId, { sex: 'female', ageDays: sp.breeding.maturityDays + 20, name: 'F' }), tank.id);
    tank.water.tempC = (sp.tempC.idealMin + sp.tempC.idealMax) / 2;
    return breedingCheck(state, m.id, f.id).reasons.join(' ');
  }

  it('an angelfish lays on a broad leaf or a stone; moss and floating plants are no nest site', () => {
    expect(pair('freshwater_angelfish', 'freshwater_planted', ['amazon_sword'])).not.toMatch(/no broad leaf|no flat rock/);
    expect(pair('freshwater_angelfish', 'freshwater_planted', ['river_stone'])).not.toMatch(/no broad leaf|no flat rock/);
    expect(pair('freshwater_angelfish', 'freshwater_planted', ['java_moss', 'floating_plants'])).toMatch(/There is no broad leaf or smooth stone to lay eggs on\./);
  });

  it('a discus lays on an upright stone, slate or a broad leaf (its notes: a vertical surface)', () => {
    expect(pair('discus', 'freshwater_planted', ['amazon_sword'])).not.toMatch(/no smooth stone/);
    expect(pair('discus', 'freshwater_planted', ['java_moss'])).toMatch(/There is no smooth stone, slate or broad leaf to lay eggs on\./);
  });

  it('an oscar still needs a stone; a moss clump no longer passes', () => {
    expect(pair('oscar', 'freshwater_tropical', ['java_moss'])).toMatch(/There is no flat rock or tile to lay eggs on\./);
    expect(pair('oscar', 'freshwater_tropical', ['slate_stack'])).not.toMatch(/no flat rock/);
  });

  it('a green chromis male nests on sand or rubble, not on a rock', () => {
    expect(pair('green_chromis', 'reef', ['live_rock'], 'bare')).toMatch(/There is no sand or rubble for the male to clear a nest in\./);
    expect(pair('green_chromis', 'reef', [], 'sand')).not.toMatch(/no sand or rubble/);
  });

  it('a bristlenose needs a cave or a rock crevice, not moss', () => {
    expect(pair('bristlenose_pleco', 'freshwater_tropical', ['java_moss'])).toMatch(/There is no cave for the male to claim\./);
    expect(pair('bristlenose_pleco', 'freshwater_tropical', ['terracotta_cave'])).not.toMatch(/no cave/);
  });
});

describe('E8: the partner the player picked fathers a livebearer’s brood', () => {
  it('Bella’s chosen male, not the first male in the tank, is the father', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 121 });
    const tank = createTank(state, 'g29', 'freshwater_planted', { cycled: true, name: 'Community' });
    const rng = simRng(state);
    addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'male', ageDays: 60, name: 'Max' }), tank.id);
    const blue = addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'male', ageDays: 60, name: 'Blue' }), tank.id);
    const bella = addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'female', ageDays: 60, name: 'Bella' }), tank.id);
    bella.repro.partnerId = blue.id;
    blue.repro.partnerId = bella.id;
    run(state, 24, 25, () => {
      bella.stats.breedingReadiness = 100;
      return bella.repro.stage === 'gravid';
    });
    expect(bella.repro.stage).toBe('gravid');
    expect(bella.repro.partnerId).toBe(blue.id);
  });
});

describe('E10: young eat what their species’ notes say', () => {
  it('copepods for the marine cave spawners and the mandarin, infusoria for the bumblebee goby; the trochus is unchanged', async () => {
    const { moduleFor } = await import('@/sim/life/breeding/registry');
    const foods = (id: string) => moduleFor(getSpecies(id)).plan.phases.map((p) => p.foods);
    for (const id of ['royal_gramma', 'firefish', 'watchman_goby']) expect(foods(id)[1], id).toEqual(['copepod_live', 'baby_brine']);
    expect(foods('bumblebee_goby')[1]).toEqual(['infusoria', 'baby_brine']);
    expect(foods('mandarin_dragonet')).toEqual([['copepod_live'], ['copepod_live', 'baby_brine']]);
    expect(foods('bristlenose_pleco')[1]).toContain('algae_wafer'); // the freshwater cave spawner is unchanged
    // the review: letting trochus young settle made a colony run away (4 snails became about 200 in a month), so it keeps
    // the plain generic module and its parents' predation, as before; the owner decides whether a few should settle
    const { genericEggLayerModule } = await import('@/sim/life/breeding/systems/spawners');
    expect(moduleFor(getSpecies('trochus_snail'))).toBe(genericEggLayerModule);
    expect(getSpecies('trochus_snail').breeding.predationWithoutNursery).toBe(0.98);
    expect(moduleFor(getSpecies('yellowtail_damselfish')).plan.phases[0].foods).toEqual(['infusoria']); // not in E10's list
  });
});

describe('E16: a spent gourami female rests once the male stops guarding', () => {
  it('she recovers in a pair tank; a betta female still has to be moved', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 131 });
    const tank = createTank(state, 'g29', 'freshwater_planted', { cycled: true, name: 'Gourami' });
    const rng = simRng(state);
    const m = addCreature(state, createCreature(state, rng, 'honey_gourami', { sex: 'male', ageDays: 120, name: 'Sunny' }), tank.id);
    const f = addCreature(state, createCreature(state, rng, 'honey_gourami', { sex: 'female', ageDays: 120, name: 'Honey' }), tank.id);
    f.repro.stage = 'spent';
    m.repro.stage = 'resting';
    m.repro.stageEndsHour = state.clock.hour + 200;
    run(state, 2, 26, () => false);
    expect(f.repro.stage).toBe('resting');
    // a betta female ('breeding_only_temporary') still stays spent while a male shares her tank: she must be moved
    const bt = createTank(state, 'g10', 'freshwater_planted', { cycled: true, name: 'Betta' });
    const bm = addCreature(state, createCreature(state, rng, 'betta', { sex: 'male', ageDays: 60, name: 'Blade' }), bt.id);
    const bf = addCreature(state, createCreature(state, rng, 'betta', { sex: 'female', ageDays: 60, name: 'Ruby' }), bt.id);
    bf.repro.stage = 'spent';
    bm.repro.stage = 'resting';
    bm.repro.stageEndsHour = state.clock.hour + 200;
    run(state, 2, 26, () => false);
    expect(bf.repro.stage).toBe('spent');
  });
});

describe('E30: young arrive before their sex shows (B-214)', () => {
  it('a guppy brood raised for twelve days arrives with its sex still hidden', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 141 });
    const big = createTank(state, 'g75', 'freshwater_planted', { cycled: true, purpose: 'nursery', name: 'Big' });
    const sp = getSpecies('fancy_guppy');
    const mom = addCreature(state, createCreature(state, simRng(state), 'fancy_guppy', { sex: 'female', ageDays: 90, name: 'Bella' }), createTank(state, 'g10', 'freshwater_planted', { cycled: true }).id);
    const cl = createClutch(state, { sp, tank: big, mother: mom, father: null, hour: state.clock.hour - 12 * 24, stage: 'fry', count: 5, visual: 'fry_cloud', nextStageHour: state.clock.hour });
    const kids = mintJuveniles(state, cl, big, sp, state.clock.hour, makeContext(state, 1));
    expect(kids.length).toBeGreaterThan(0);
    for (const k of kids) expect(k.sex).toBe('unknown');
  });
});

describe('Review E: the pairing step keeps a name’s capital', () => {
  it('“then: Bella isn’t comfortable…”, not “then: bella …”', () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 151 });
    const home = createTank(state, 'g29', 'freshwater_planted', { cycled: true, name: 'Community' });
    const away = createTank(state, 'g29', 'freshwater_planted', { cycled: true, name: 'Away' });
    // dense cover, so the livebearer's own "dense plants" step doesn't come first
    home.decor = Array.from({ length: 10 }, (_, i) => ({ id: `moss${i}`, defId: 'java_moss', x: -0.3 + i * 0.06, y: 0, z: 0, rotY: 0, scale: 2.4, seed: i, growth: 1, health: 100 }));
    const rng = simRng(state);
    const bella = addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'female', ageDays: 90, name: 'Bella' }), home.id);
    const max = addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'male', ageDays: 90, name: 'Max' }), away.id);
    keeper(state, 25);
    bella.stats.breedingReadiness = 10;
    bella.stats.comfort = 5;
    bella.stats.health = 70;
    max.stats.breedingReadiness = 100;
    expect(breedingCheck(state, bella.id, max.id).nextStep).toMatch(/ — then: Bella isn’t comfortable enough to breed/);
  });
});

describe('Review E: another species hunting young in a nursery is what has to go', () => {
  it('says to move the hunters out, not to move the clutch to a nursery', async () => {
    const { stepClutch } = await import('@/sim/life/breeding/clutch');
    const { moduleFor } = await import('@/sim/life/breeding/registry');
    const { makeTankInfo } = await import('@/sim/life/breeding/common');
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 161 });
    const nursery = createTank(state, 'g29', 'freshwater_planted', { cycled: true, purpose: 'nursery', name: 'Nursery' });
    const sp = getSpecies('fancy_guppy');
    const rng = simRng(state);
    const mom = addCreature(state, createCreature(state, rng, 'fancy_guppy', { sex: 'female', ageDays: 90, name: 'Bella' }), createTank(state, 'g10', 'freshwater_planted', { cycled: true }).id);
    addCreature(state, createCreature(state, rng, 'betta', { sex: 'male', ageDays: 90, name: 'Blade' }), nursery.id);
    const cl = createClutch(state, { sp, tank: nursery, mother: mom, father: null, hour: state.clock.hour, stage: 'fry', count: 40, visual: 'fry_cloud', nextStageHour: state.clock.hour + 200 });
    const from = state.log.length;
    stepClutch(state, cl, nursery, sp, moduleFor(sp), state.clock.hour, 1, makeContext(state, 1), makeTankInfo(state, nursery, state.clock.hour, () => []));
    expect(logFrom(state, from).find((t) => /hunting/.test(t))).toBe('The betta is hunting Bella’s fry! Move the betta out of Nursery.');
  });
});

describe('Review E: smaller clutch-card and notice words', () => {
  it('a nest’s eggs are moved once free-swimming; “after lights-out” only while it is light; “1 larva hatched”', async () => {
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 171 });
    const ember = starter(state);
    const home = state.tanks[ember.tankId!];
    const cl = createClutch(state, { sp: getSpecies('betta'), tank: home, mother: null, father: ember, hour: state.clock.hour, stage: 'eggs', count: 150, visual: 'bubble_nest', nextStageHour: state.clock.hour + 14, guardedById: ember.id });
    const room = clutchStatus(state, cl.id)!.warnings.find((w) => /when they grow up/.test(w));
    expect(room).toMatch(/when they grow up — once they’re free-swimming, move them to a bigger or emptier tank$/);

    const reef = createTank(state, 'g29', 'reef', { cycled: true, name: 'Reef' });
    const eggs = createClutch(state, { sp: getSpecies('ocellaris_clownfish'), tank: reef, mother: null, father: null, hour: state.clock.hour - 200, stage: 'eggs', count: 300, visual: 'eggs_adhesive', nextStageHour: state.clock.hour - 1 });
    const h = ((state.clock.hour % 24) + 24) % 24;
    reef.lighting = { ...reef.lighting, onHour: Math.floor(h + 23) % 24, offHour: Math.floor(h + 2) % 24 }; // lights on now
    expect(clutchStatus(state, eggs.id)!.waitsForDark).toBe(true);
    reef.lighting = { ...reef.lighting, onHour: Math.floor(h + 2) % 24, offHour: Math.floor(h + 23) % 24 }; // lights off now
    expect(clutchStatus(state, eggs.id)!.waitsForDark).toBe(false);

    const { planNotification } = await import('@/ui/notify/rules');
    const ev = { id: 'ev_2', hour: 100, kind: 'breeding' as const, text: 'x', notice: { topic: 'hatch' as const, vars: { name: 'Sol', n: 1, tank: 'Reef', young: 'larvae' } } };
    expect(planNotification(ev, { hour: 100, tankName: () => null })?.body).toBe('1 larva hatched in Reef.');
  });
});

describe('Review E: H4’s readinessDrag reads the readiness target’s own terms', () => {
  it('gives the same answer as its old inline copy over many random animals', async () => {
    const { readinessDrag, makeTankInfo, conditioningLevel, gallonsOf, isMature, isResting } = await import('@/sim/life/breeding/common');
    const { fitsEnvironment } = await import('@/sim/compat/salinity');
    const { mulberry32 } = await import('@/sim/rng');
    const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    // the pre-review inline copy (Audit 2026-11-17, H4), kept here as the reference
    const old = (tank: Parameters<typeof readinessDrag>[0], c: Parameters<typeof readinessDrag>[1], sp: Parameters<typeof readinessDrag>[2], hour: number, info: Parameters<typeof readinessDrag>[4]) => {
      if (!isMature(c, sp, hour) || c.repro?.lineHold || isResting(c, hour) || !fitsEnvironment(sp, tank.environment)) return null;
      const s = c.stats;
      const t = tank.water.tempC;
      const cond = sp.breeding.conditions;
      const load = info.loadRatio();
      const terms: [string, number][] = [
        ['water', tank.environment === sp.environment ? 1 : 0.7],
        ['health', ramp(s.health, 45, 85)],
        ['stress', 1 - ramp(s.stress, 45, 90)],
        ['hunger', 1 - ramp(s.hunger, 55, 90)],
        ['comfort', 0.4 + 0.6 * ramp(s.comfort, 25, 65)],
        ['illness', c.illness ? 0.3 : 1],
        ['temp_range', t < sp.tempC.min || t > sp.tempC.max ? 0.15 : 1],
        ['too_cool', cond.minTempC !== undefined && t < cond.minTempC - 0.25 ? 0.4 : 1],
        ['too_warm', cond.maxTempC !== undefined && t > cond.maxTempC + 0.25 ? 0.35 : 1],
        ['conditioning', cond.needsConditioningFood?.length ? 0.45 + 0.55 * conditioningLevel(tank, c, sp, hour) : 1],
        ['crowded', load > 1.05 ? 0.15 : load > 0.85 ? 0.6 : 1],
        ['small_tank', cond.minTankGallons && gallonsOf(tank) < cond.minTankGallons ? 0.5 : 1],
      ];
      let best: { drag: string; factor: number } | null = null;
      for (const [drag, factor] of terms) if (factor < 1 - 1e-9 && (!best || factor < best.factor)) best = { drag, factor };
      return best;
    };
    const state = newGame({ starterId: 'betta', starterName: 'Ember', seed: 181 });
    const rnd = mulberry32(181);
    const ids = ['fancy_guppy', 'neon_tetra', 'betta', 'discus', 'white_cloud_minnow', 'panda_corydoras', 'sailfin_molly'];
    for (let i = 0; i < 300; i++) {
      const id = ids[Math.floor(rnd.next() * ids.length)];
      const sp = getSpecies(id);
      const tank = createTank(state, rnd.next() < 0.5 ? 'g10' : 'g55', sp.waterClasses[0], { cycled: true });
      const c = addCreature(state, createCreature(state, simRng(state), id, { sex: 'female', ageDays: sp.breeding.maturityDays + 5 }), tank.id);
      Object.assign(c.stats, { health: rnd.next() * 100, stress: rnd.next() * 100, hunger: rnd.next() * 100, comfort: rnd.next() * 100 });
      if (rnd.next() < 0.2) c.illness = { kind: 'ich', severity: 0.3 } as never;
      tank.water.tempC = sp.tempC.min - 3 + rnd.next() * (sp.tempC.max - sp.tempC.min + 6);
      const info = makeTankInfo(state, tank, state.clock.hour, () => []);
      expect(readinessDrag(tank, c, sp, state.clock.hour, info), `case ${i}`).toEqual(old(tank, c, sp, state.clock.hour, info));
    }
  });
});

describe('Review E: an old save’s brood whose foods changed (E10) hears about it', () => {
  it('a royal gramma brood already warned under the old foods is warned again, and the card says hungry within hours', async () => {
    const { noteBreedingFood } = await import('@/sim/life/breeding');
    const state = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Solo', seed: 5 });
    const sp = getSpecies('royal_gramma');
    const t = createTank(state, 'g40B', 'marine_fowlr', { cycled: true, purpose: 'nursery', name: 'Nursery' });
    const mom = addCreature(state, createCreature(state, simRng(state), 'royal_gramma', { sex: 'female', ageDays: 200, name: 'Gem' }), createTank(state, 'g40B', 'marine_fowlr', { cycled: true }).id);
    const cl = createClutch(state, { sp, tank: t, mother: mom, father: null, hour: state.clock.hour - 60, stage: 'fry', count: 100, visual: 'fry_cloud', nextStageHour: state.clock.hour + 150 });
    cl.stageSinceHour = state.clock.hour - 60;
    cl.fed = 0.9;
    cl.flags = ['food_fry']; // the old flag: warned once before, under the old foods
    const from = state.log.length;
    let cardAt = -1;
    for (let h = 1; h <= 12; h++) {
      noteBreedingFood(state, t.id, ['algae_wafer']); // what the old foods asked for
      advanceWorld(state, 1, { forceFull: true });
      if (cardAt < 0 && (clutchStatus(state, cl.id)?.warnings ?? []).some((w) => /^Hungry/.test(w))) cardAt = h;
    }
    expect(cardAt).toBeGreaterThan(0);
    expect(cardAt).toBeLessThanOrEqual(6);
    expect(logFrom(state, from).some((x) => /^Gem’s fry are hungry/.test(x))).toBe(true);
    expect(state.clutches[cl.id].survival).toBeGreaterThan(0.85); // a slow loss: time to buy copepods or baby brine
  });
});
