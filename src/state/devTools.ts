/**
 * Developer tools gate (ADR-0005 decision 2; PLAT-005). OWNER: core.
 *
 * Read-only diagnostics are always available. Cheats and save editing (window.__AQ's write calls, the dev panel and
 * its buttons, everything unlocked on the dock, fixture boots that autosave) work only in a dev build, or for the one
 * page session that was opened with `?dev=1`. Nothing remembers the flag (no setting, storage or save), so reopening
 * the game without it has none of them. The Settings "Developer tools" switch turns the dev panel on, and only counts
 * where the tools are allowed.
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

/** `allowed`: this session may use the write tools (a dev build, or ?dev=1). Tests set it to check production. */
export const useDevTools = create<{ allowed: boolean }>(() => ({ allowed: import.meta.env.DEV || urlDevFlag() }));

export const devToolsAllowed = (): boolean => useDevTools.getState().allowed;

/** The dev panel and its buttons are on: the tools are allowed and the Settings switch is on. */
export const devModeOn = (): boolean => devToolsAllowed() && useSettings.getState().devMode;

/** React: `devModeOn()` as a hook. */
export function useDevMode(): boolean {
  const allowed = useDevTools((s) => s.allowed);
  const on = useSettings((s) => s.devMode);
  return allowed && on;
}
