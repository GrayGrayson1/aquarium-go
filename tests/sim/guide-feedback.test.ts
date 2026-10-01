/**
 * Lane guide — nothing fails silently and advice fits the animal: species-aware hunger / recovery notes, illness
 * cures in each species' own temperature range, money-related messages that name the amount, and the UI `act()`
 * helper never committing half an action.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { creatureWellbeing } from '@/sim/life';
import { illnessDef } from '@/sim/life/illness';
import { moveCreature, renameCreature } from '@/sim/life/actions';
import { toggleSignage } from '@/sim/facility/actions';
import { startResearch, cancelResearch, unlock } from '@/sim/facility';
import { cashSuggestions } from '@/sim/economy/finance';
import { getSpecies } from '@/data/species';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { act } from '@/ui/common/actions';

function world(): GameState {
  const s = newGame({ starterId: 'lined_seahorse', starterName: 'Pip', seed: 11 });
  s.isShowcase = true;
  return s;
}
const starter = (s: GameState) => Object.values(s.creatures).find((c) => c.isStarter)!;

describe('guide: hunger notes fit the species', () => {
  it('a very hungry seahorse with none of its food in stock is told what to buy', () => {
    const s = world();
    const c = starter(s);
    s.inventory.foods = { flake_tropical: 200, micro_pellets: 300 }; // the bug report: plenty of food, none it eats
    c.stats.hunger = 80;
    const w = creatureWellbeing(s, c);
    expect(w.status).toBe('watch');
    expect(w.headline).toBe('Very hungry');
    expect(w.notes[0]).toMatch(/none of its food is in stock/);
    expect(w.notes[0]).toMatch(/Buy frozen brine shrimp/); // the cheapest food a seahorse really eats
    expect(w.notes[0]).not.toMatch(/krill/);
  });

  it('with its food in stock, a seahorse is told to target-feed (it eats slowly)', () => {
    const s = world();
    const c = starter(s);
    s.inventory.foods = { mysis_frozen: 20 };
    c.stats.hunger = 92;
    const w = creatureWellbeing(s, c);
    expect(w.status).toBe('danger');
    expect(w.notes[0]).toMatch(/^Starving — .*target-feed/);
  });

  it('a hungry betta with pellets in stock just gets the plain advice', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Fin', seed: 3 });
    s.isShowcase = true;
    const c = starter(s);
    s.inventory.foods = { micro_pellets: 50 };
    c.stats.hunger = 75;
    expect(creatureWellbeing(s, c).notes[0]).toBe('Very hungry — time to feed.');
  });

  it('low health with nothing else wrong names what wore it down', () => {
    const s = world();
    const c = starter(s);
    s.inventory.foods = { mysis_frozen: 20 };
    c.stats.hunger = 10;
    c.stats.stress = 10;
    c.stats.health = 60;
    c.life = { ...(c.life ?? {}), damage: { starvation: 12, water: 2 } } as typeof c.life;
    const w = creatureWellbeing(s, c);
    expect(w.status).toBe('watch');
    expect(w.notes.join(' ')).toMatch(/Recovering from going hungry/);
    expect(w.headline).not.toBe('Keep an eye on this one');
  });
});

describe('guide: illness advice uses the species’ own range', () => {
  it('swim-bladder trouble in a fancy goldfish does not say "keep the water warm"', () => {
    const cure = illnessDef('swim_bladder')!.cure(getSpecies('fancy_goldfish'));
    expect(cure).not.toMatch(/warm/);
    expect(cure).toMatch(/18–23 °C/);
    expect(cure).toMatch(/daphnia/);
  });
  it('impaction in an African dwarf frog does not say "keep the water cool"', () => {
    const cure = illnessDef('impaction')!.cure(getSpecies('african_dwarf_frog'));
    expect(cure).not.toMatch(/cool/);
    expect(cure).toMatch(/24–26 °C/);
  });
  it('stress colouring never mentions fins (shrimp and snails get it too)', () => {
    expect(illnessDef('stress_coloration')!.symptom).not.toMatch(/fin/);
  });
});

describe('guide: actions say what happened', () => {
  it('signs name their cost, and removing one says there is no refund', () => {
    const s = world();
    unlock(s, 'signage', { silent: true });
    const tankId = s.tankOrder[0];
    const add = toggleSignage(s, tankId);
    expect(add.ok).toBe(true);
    expect(add.message).toMatch(/\$15/);
    const off = toggleSignage(s, tankId);
    expect(off.message).toMatch(/aren’t refunded/);
  });

  it('cancelling research names the refund', () => {
    const s = world();
    s.finance.money = 5000;
    expect(startResearch(s, 'public_education').ok).toBe(true);
    const r = cancelResearch(s);
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/\$200 \(half the cost\) refunded/);
  });

  it('a missing animal gets a real reason, not "Not found"', () => {
    const s = world();
    expect(renameCreature(s, 'nope', 'X').message).toBe('That animal is no longer in your care.');
    expect(moveCreature(s, 'nope', s.tankOrder[0]).message).toBe('That animal is no longer in your care.');
  });

  it('a move to a too-small tank keeps its warning in the result', () => {
    const s = world();
    const small = createTank(s, 'g10', 'marine_fowlr', { cycled: true, placement: { x: 3, z: 0, rotY: 0 } });
    const r = moveCreature(s, starter(s).id, small.id);
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/Heads up/);
  });

  it('cash tips only suggest selling a tank once whole-aquarium auctions are open', () => {
    const s = world();
    const empty = createTank(s, 'g10', 'marine_fowlr', { cycled: true, placement: { x: 3, z: 0, rotY: 0 } });
    expect(empty).toBeTruthy();
    const tips = cashSuggestions(s).join(' ');
    expect(tips).toMatch(/empty tank/);
    expect(tips).not.toMatch(/auction it/);
    unlock(s, 'tank_auctions', { silent: true });
    expect(cashSuggestions(s).join(' ')).toMatch(/auction it as a whole aquarium/);
  });
});

describe('guide: act() never commits half an action', () => {
  beforeEach(() => {
    useUI.setState({ toasts: [] });
  });

  it('a mutator that throws midway leaves the game unchanged and says so', () => {
    const s = world();
    useGame.getState().setGame(s);
    const before = useGame.getState().game!.finance.money;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = act((d) => {
      d.finance.money -= 100;
      throw new Error('boom');
    });
    expect(r?.ok).toBe(false);
    expect(useGame.getState().game!.finance.money).toBe(before);
    expect(useUI.getState().toasts.at(-1)?.text).toMatch(/nothing was changed/);
    warn.mockRestore();
    useGame.getState().setGame(null);
  });

  it('with no aquarium loaded it explains instead of doing nothing', () => {
    useGame.getState().setGame(null);
    expect(act(() => ({ ok: true, message: 'x' }))).toBeNull();
    expect(useUI.getState().toasts.at(-1)?.text).toMatch(/No aquarium is loaded/);
  });

  it('kindFor picks the toast kind from the result', () => {
    const s = world();
    useGame.getState().setGame(s);
    act(() => ({ ok: true, message: 'Moved. Heads up: small tank.' }), { kindFor: (r) => (/Heads up/.test(r.message) ? 'warning' : 'success') });
    expect(useUI.getState().toasts.at(-1)?.kind).toBe('warning');
    useGame.getState().setGame(null);
  });
});
