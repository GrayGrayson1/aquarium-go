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
