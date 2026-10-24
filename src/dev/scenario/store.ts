/**
 * The owner's own presets, kept in this browser (chunk 15, ADR-0051 decision 3): localStorage, apart from the saves and
 * never in one. A dev build at 127.0.0.1:5173 has its own storage, apart from the live sites'.
 */
import type { ScenarioRecipe } from './recipe';
import { isPlainObject } from './patch';

export const LAB_STORAGE_KEY = 'aquarium-go.lab.v1';

interface LabStore {
  presets: Record<string, ScenarioRecipe>;
  /** The recipe being edited, so a reload keeps it. */
  draft?: ScenarioRecipe;
}

function read(): LabStore {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LAB_STORAGE_KEY) : null;
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (isPlainObject(v) && isPlainObject(v.presets)) return { presets: v.presets as Record<string, ScenarioRecipe>, ...(isPlainObject(v.draft) ? { draft: v.draft as unknown as ScenarioRecipe } : {}) };
  } catch {
    /* unreadable: start empty */
  }
  return { presets: {} };
}

function write(s: LabStore): boolean {
  try {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/** The kept presets, by name (A to Z). */
export function savedPresets(): ScenarioRecipe[] {
  const p = read().presets;
  return Object.keys(p)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => p[k]);
}

export function savedPreset(name: string): ScenarioRecipe | undefined {
  const p = read().presets;
  return Object.hasOwn(p, name) ? p[name] : undefined;
}

/** Keep a recipe under its name (replacing one of the same name). */
export function savePreset(recipe: ScenarioRecipe): boolean {
  const s = read();
  s.presets[recipe.name] = recipe;
  return write(s);
}

export function deletePreset(name: string): boolean {
  const s = read();
  if (!Object.hasOwn(s.presets, name)) return false;
  delete s.presets[name];
  return write(s);
}

export function loadDraft(): ScenarioRecipe | undefined {
  return read().draft;
}

export function saveDraft(recipe: ScenarioRecipe): void {
  const s = read();
  s.draft = recipe;
  write(s);
}
