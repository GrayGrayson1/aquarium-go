/**
 * Developer tools gate (ADR-0005 decision 2; PLAT-005; chunk 7, REL-019). OWNER: core.
 *
 * Read-only diagnostics are always available. Cheats and save editing (window.__AQ's write calls, the dev panel and
 * its buttons, everything unlocked on the dock, registry fixtures, fixture boots that autosave, `?sandbox=`) work only
 * in a dev build. The live site ignores `?dev=1` (ADR-0037 decision 3): only a production build made with
 * VITE_E2E_DEV_URL=1 (the e2e build `base-path.spec` opens; deploy.yml and render.yaml never set it) honours it, for
 * the one page session opened with it. Nothing remembers the flag (no setting, storage or save). The Settings
 * "Developer tools" switch turns the dev panel on, and only counts where the tools are allowed.
 */
import { create } from 'zustand';
import { useSettings } from './settings';

/** Was this page opened with ?dev=1? (read from the address, never stored) */
export function urlDevFlag(search: string = typeof location !== 'undefined' ? location.search : ''): boolean {
  try {
    return new URLSearchParams(search).get('dev') === '1';
  } catch {
    return false;
  }
}

/**
 * May this page session use the write tools? A dev build always; a production build only when it was built with the
 * e2e flag and opened with ?dev=1; the players' build never.
 */
export function devToolsAtBoot(devBuild: boolean, urlFlagBuild: boolean, search?: string): boolean {
  return devBuild || (urlFlagBuild && urlDevFlag(search));
}

/** `allowed`: this session may use the write tools (see devToolsAtBoot). Tests set it to check production. */
export const useDevTools = create<{ allowed: boolean }>(() => ({ allowed: devToolsAtBoot(import.meta.env.DEV, import.meta.env.VITE_E2E_DEV_URL === '1') }));

export const devToolsAllowed = (): boolean => useDevTools.getState().allowed;

/** The `?sandbox=<name>` page to render instead of the game: a developer tool, so only where the tools are allowed. */
export function urlSandboxName(search: string = typeof location !== 'undefined' ? location.search : ''): string | null {
  if (!devToolsAllowed()) return null;
  try {
    return new URLSearchParams(search).get('sandbox');
  } catch {
    return null;
  }
}

/**
 * Chunk 15 (ADR-0051) — the scenario lab's addresses, read only where the tools are allowed (the live site ignores
 * them): `?lab=1` opens the lab, `?scenario=<preset>` builds a preset and `?recipe=<text>` a recipe carried in the
 * address (base64url JSON, decoded by src/dev/scenario/link.ts).
 */
export function urlLabParams(search: string = typeof location !== 'undefined' ? location.search : ''): { lab: boolean; scenario: string | null; recipe: string | null } | null {
  if (!devToolsAllowed()) return null;
  try {
    const q = new URLSearchParams(search);
    const p = { lab: q.get('lab') === '1', scenario: q.get('scenario') || null, recipe: q.get('recipe') || null };
    return p.lab || p.scenario || p.recipe ? p : null;
  } catch {
    return null;
  }
}

/** Does this address build a scenario at boot (a preset or a recipe; not the lab alone)? */
export function urlScenarioBoot(search?: string): boolean {
  const p = urlLabParams(search);
  return !!(p && (p.scenario || p.recipe));
}

/** The dev panel and its buttons are on: the tools are allowed and the Settings switch is on. */
export const devModeOn = (): boolean => devToolsAllowed() && useSettings.getState().devMode;

/** React: `devModeOn()` as a hook. */
export function useDevMode(): boolean {
  const allowed = useDevTools((s) => s.allowed);
  const on = useSettings((s) => s.devMode);
  return allowed && on;
}
