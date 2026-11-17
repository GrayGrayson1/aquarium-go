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
import { clutchStatus } from '@/sim/life/breeding';
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
    expect(readinessHint(state, bella, getSpecies('fancy_guppy'), state.clock.hour)).toMatch(/^Community is crowded \(\d+% stocked\) — animals breed less in a full tank\. Sell or move some animals\.$/);
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
