/**
 * Playing a scenario (chunk 15, ADR-0051): build a recipe and put it on screen, paused, never autosaved over the
 * player's game; start it again; boot one from the address. The lab screen, `__AQ.scenario` and `?scenario=` /
 * `?recipe=` all come through here. A developer tool: refused in a shared shop, as the dev panel is.
 */
import type { GameState } from '@/types';
import { useGame, getGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useLab } from '@/state/lab';
import { inSharedShop } from '@/state/sharedMode';
import { neverAutosave } from '@/game/useAutosave';
import { loadFixtureRegistry, type FixtureRegistry } from '../fixtures/lazy';
import { buildScenario, type BuildEnv, type BuildResult } from '../scenario/build';
import { presetById } from '../scenario/presets';
import { savedPreset } from '../scenario/store';
import { decodeRecipeParam } from '../scenario/link';
import { isPlainObject } from '../scenario/patch';
import type { ScenarioRecipe } from '../scenario/recipe';

export const SHARED_REFUSAL = 'The scenario lab changes nothing in a shared shop.';

/** Each fixture is built once a session and handed out as a copy (the lab's warnings rebuild on every edit). */
let fixtureCopies: Record<string, () => GameState> | null = null;

function copies(reg: FixtureRegistry): Record<string, () => GameState> {
  const made = new Map<string, GameState>();
  const out: Record<string, () => GameState> = {};
  for (const name of Object.keys(reg)) {
    out[name] = () => {
      let g = made.get(name);
      if (!g) {
        g = reg[name]();
        made.set(name, g);
      }
      return structuredClone(g);
    };
  }
  return out;
}

const usesFixture = (input: unknown) => isPlainObject(input) && typeof input.base === 'string' && input.base.startsWith('fixture:');

/** The fixtures (loaded on first use) and the game on screen, for a build. */
export async function buildEnv(input: unknown, opts: { trial?: boolean } = {}): Promise<BuildEnv> {
  if (usesFixture(input) && !fixtureCopies) fixtureCopies = copies(await loadFixtureRegistry());
  return { ...(fixtureCopies ? { fixtures: fixtureCopies } : {}), current: getGame(), ...(opts.trial ? { trial: true } : {}) };
}

/** The fixtures already loaded, for a build that can't wait (the lab's warnings while typing). */
export const loadedFixtures = (): Record<string, () => GameState> | undefined => fixtureCopies ?? undefined;

/** Build a recipe and play it: the game opens on it, paused (unless the recipe says a speed). */
export async function playRecipe(input: unknown): Promise<BuildResult> {
  if (inSharedShop()) throw new Error(SHARED_REFUSAL);
  const built = buildScenario(input, await buildEnv(input));
  const name = isPlainObject(input) && typeof input.name === 'string' ? input.name : 'Scenario';
  neverAutosave(built.state.saveId);
  useGame.getState().setGame(built.state);
  useUI.getState().set({ screen: 'game', view: built.view, focusedTankId: built.focusTankId, panel: null, tool: 'none' });
  useLab.setState({ open: false, scenario: { name, saveId: built.state.saveId, recipe: structuredClone(input) } });
  const errors = built.issues.filter((i) => i.level === 'error').length;
  const paused = built.state.clock.speed === 0;
  useUI.getState().toast(`Scenario: ${name}${paused ? ' · paused' : ''}${errors ? ` · ${errors} part${errors === 1 ? '' : 's'} skipped (see the lab)` : ''}`, errors ? 'warning' : 'info');
  return built;
}

/** Start the scenario on screen again from its recipe (a new world from the same recipe and seed). */
export async function restartScenario(): Promise<BuildResult | null> {
  const s = useLab.getState().scenario;
  return s ? playRecipe(s.recipe) : null;
}

/** A recipe by name: a kept preset, else a built-in one. */
export function recipeByName(name: string): ScenarioRecipe | null {
  return savedPreset(name) ?? presetById(name)?.recipe ?? null;
}

/** `?scenario=<preset>` / `?recipe=<text>` / `?lab=1` at boot (App.tsx, behind the developer-tools gate). */
export async function bootFromAddress(p: { lab: boolean; scenario: string | null; recipe: string | null }): Promise<boolean> {
  let recipe: unknown = null;
  let problem: string | null = null;
  if (p.recipe) {
    const text = decodeRecipeParam(p.recipe);
    try {
      recipe = text ? JSON.parse(text) : null;
    } catch {
      recipe = null;
    }
    if (!recipe) problem = 'The recipe in the address could not be read.';
  } else if (p.scenario) {
    recipe = recipeByName(p.scenario);
    if (!recipe) problem = `There's no scenario called "${p.scenario}".`;
  }
  if (recipe) {
    await playRecipe(recipe);
    return true;
  }
  if (problem) {
    useUI.getState().toast(problem, 'warning');
    useLab.setState({ open: true });
  } else if (p.lab) useLab.setState({ open: true });
  return false;
}
