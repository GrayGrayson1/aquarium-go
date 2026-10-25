// @vitest-environment node
/**
 * chunk 15 (LAB-004, LAB-005; ADR-0051 decision 3; the fresh review's blockers 1 and 2) — playing a scenario: the
 * player's own game is saved first; no save button writes a scenario over the player's autosave (the timed autosave,
 * "Save now" and "Save and return to title", the page-close save); a numbered slot still takes it; Start again
 * rebuilds from the recipe, and on "the game on screen" from the game it was built on, never stacking; the addresses
 * build presets and recipes; a shared shop refuses it all.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useLab } from '@/state/lab';
import { useSharedMode } from '@/state/sharedMode';
import { setStorageBackend, createMemoryBackend, saveCurrentGame, saveCurrentGameSync, loadGame, stateHash, SCENARIO_AUTOSAVE_REFUSED, autosaveRefused } from '@/persistence';
import { autosaveAllowed } from '@/game/useAutosave';
import { bootFromAddress, playRecipe, restartScenario, SHARED_REFUSAL } from '@/dev/lab/session';
import { encodeRecipeParam, presetById, type ScenarioRecipe } from '@/dev/scenario';

const R = (r: Omit<ScenarioRecipe, 'version'>): ScenarioRecipe => ({ version: 1, ...r });
const game = () => useGame.getState().game!;
const alive = () => Object.values(game().creatures).filter((c) => c.status === 'alive').length;

/** The player's own game on screen, saved in the autosave slot. */
async function playerGame() {
  const g = newGame({ starterId: 'betta', starterName: 'Mine', seed: 99 });
  useGame.getState().setGame(g);
  useUI.getState().set({ screen: 'game' });
  expect((await saveCurrentGame('auto')).ok).toBe(true);
  return g.saveId;
}

beforeEach(() => {
  setStorageBackend(createMemoryBackend());
  useLab.setState({ open: false, scenario: null });
});
afterEach(() => {
  useSharedMode.setState({ club: null });
  useGame.getState().setGame(null);
  useUI.getState().set({ screen: 'title' });
});

describe('LAB-004: a scenario never lands over the player’s game', () => {
  it('Build and play saves the player’s game first; then no save to the autosave slot takes the scenario', async () => {
    const mine = await playerGame();
    useGame.getState().mutate((d) => void (d.finance.money = 4242)); // play since the last save
    const built = await playRecipe(presetById('ammonia-crisis')!.recipe);
    expect(game().saveId).toBe(built.state.saveId);
    expect(game().clock.speed).toBe(0);
    expect(useLab.getState().scenario).toMatchObject({ name: 'Ammonia crisis', saveId: built.state.saveId });
    // the player's game was saved before the switch, with the last play in it
    expect(await loadGame('auto')).toMatchObject({ saveId: mine, finance: { money: 4242 } });
    // the timed autosave, "Save now" / "Save and return to title" (saveNow('auto') → saveCurrentGame) and page close
    expect(autosaveAllowed()).toBe(false);
    expect(autosaveAllowed({ evenIfOff: true })).toBe(false);
    expect(await saveCurrentGame('auto', { flush: true })).toMatchObject({ ok: false, code: 'scenario', message: SCENARIO_AUTOSAVE_REFUSED });
    // the page-close save writes localStorage straight away: give it one, and it still refuses
    const mem = new Map<string, string>();
    const g = globalThis as { localStorage?: unknown };
    const had = g.localStorage;
    g.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
    try {
      expect(saveCurrentGameSync('auto')).toBe(false);
      expect([...mem.values()].some((v) => v.includes(built.state.saveId))).toBe(false);
      expect(saveCurrentGameSync('slot3')).toBe(true); // the same path writes a numbered slot
    } finally {
      g.localStorage = had;
    }
    expect((await loadGame('auto'))?.saveId).toBe(mine);
    // a numbered slot is the player's choice: it takes it
    expect((await saveCurrentGame('slot2')).ok).toBe(true);
    expect((await loadGame('slot2'))?.saveId).toBe(built.state.saveId);
  });

  it('Start again: a fresh world from the recipe, also never autosaved', async () => {
    await playerGame();
    const first = await playRecipe(presetById('fry-tank')!.recipe);
    useGame.getState().mutate((d) => void (d.finance.money = 1));
    const again = (await restartScenario())!;
    expect(again.state.saveId).not.toBe(first.state.saveId);
    expect(game().finance.money).toBe(50_000);
    expect(stateHash(game())).toBe(stateHash(first.state));
    expect(autosaveRefused(game().saveId)).toBe(true);
    expect((await saveCurrentGame('auto')).ok).toBe(false);
  });

  it('on "the game on screen": Start again and a rebuild use the game it was built on, never the scenario', async () => {
    await playerGame();
    const tanks = game().tankOrder.length;
    const animals = alive();
    const recipe = R({ name: 'Plus one', base: 'current', tanks: [{ name: 'Extra', animals: [{ species: 'neon_tetra', count: 5 }] }] });
    await playRecipe(recipe);
    expect(game().tankOrder).toHaveLength(tanks + 1);
    expect(alive()).toBe(animals + 5);
    for (let i = 0; i < 3; i++) {
      await restartScenario();
      expect(game().tankOrder).toHaveLength(tanks + 1);
      expect(alive()).toBe(animals + 5);
    }
    await playRecipe(recipe); // Build and play again from the lab, the scenario on screen
    expect(game().tankOrder).toHaveLength(tanks + 1);
  });
});

describe('LAB-005: the addresses, and a shared shop', () => {
  it('?scenario=<preset> and ?recipe=<text> build; a bad one opens the lab and says why', async () => {
    expect(await bootFromAddress({ lab: false, scenario: 'show-day', recipe: null })).toBe(true);
    expect(useLab.getState().scenario?.name).toBe('Show day');
    const text = JSON.stringify(R({ name: 'From a link', tanks: [{ name: 'L', animals: [{ species: 'axolotl', count: 2 }] }] }));
    expect(await bootFromAddress({ lab: false, scenario: null, recipe: encodeRecipeParam(text) })).toBe(true);
    expect(game().tankOrder.map((id) => game().tanks[id].name)).toEqual(['L']);
    const toasts = () => useUI.getState().toasts.map((t) => t.text);
    expect(await bootFromAddress({ lab: false, scenario: 'no-such-thing', recipe: null })).toBe(false);
    expect(useLab.getState().open).toBe(true);
    expect(toasts()).toContain(`There's no scenario called "no-such-thing".`);
    expect(await bootFromAddress({ lab: false, scenario: null, recipe: 'not-a-recipe' })).toBe(false);
    expect(toasts()).toContain('The recipe in the address could not be read.');
  });

  it('a fixture base loads the fixtures on first use', async () => {
    const b = await playRecipe(R({ name: 'On a fixture', base: 'fixture:breeding_betta', shop: { money: 123 } }));
    expect(b.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(game().finance.money).toBe(123);
  });

  it('a shared shop refuses it', async () => {
    useSharedMode.setState({ club: 'club-1' });
    await expect(playRecipe(presetById('sandbox')!.recipe)).rejects.toThrow(SHARED_REFUSAL);
  });
});
