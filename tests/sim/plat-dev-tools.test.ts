// @vitest-environment node
/**
 * lane:core (PLAT-005, ADR-0005 decision 2) — developer tools in production builds: read-only diagnostics always;
 * cheats and save editing (window.__AQ's write calls, the dev panel, fixtures that autosave) only in a dev build or a
 * session opened with ?dev=1, which nothing remembers.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '@/types';
import { useDevTools, urlDevFlag, devModeOn, devToolsAllowed } from '@/state/devTools';
import { useSettings } from '@/state/settings';
import { useGame } from '@/state/game';
import { newGame } from '@/sim/newGame';
import { stateHash } from '@/persistence';
import { debugApi, readOnlyDebugApi, READ_ONLY_KEYS } from '@/dev/debugHooks';

const ROOT = join(__dirname, '..', '..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** Calls that change the game, the settings or a save (or load another world). */
const WRITE_KEYS = ['mutate', 'setGame', 'setUI', 'dev', 'newGame', 'loadFixture', 'focusLargestTank', 'advance', 'act', 'save', 'autosave', 'loadAndResume', 'continueGame', 'backdateSave', 'deleteSave', 'importText'];

afterEach(() => {
  useDevTools.setState({ allowed: true });
  useSettings.setState({ devMode: false });
  useGame.getState().setGame(null);
});

describe('PLAT-005: who gets the developer tools', () => {
  it('?dev=1 is read from the address, nowhere else', () => {
    expect(urlDevFlag('?dev=1')).toBe(true);
    expect(urlDevFlag('?fixture=big_facility&dev=1')).toBe(true);
    expect(urlDevFlag('?dev=0')).toBe(false);
    expect(urlDevFlag('')).toBe(false);
  });

  it('a test run is a dev build: the tools are allowed', () => {
    expect(devToolsAllowed()).toBe(true);
  });

  it('the dev panel stays off without the tools, whatever the stored switch says', () => {
    useSettings.setState({ devMode: true });
    useDevTools.setState({ allowed: false });
    expect(devModeOn()).toBe(false);
    useDevTools.setState({ allowed: true });
    expect(devModeOn()).toBe(true);
  });

  it('nothing remembers ?dev=1: the boot no longer writes devMode, and the gate never writes storage', () => {
    expect(src('src/App.tsx')).not.toMatch(/devMode\s*:\s*true/);
    expect(src('src/state/devTools.ts')).not.toMatch(/localStorage|sessionStorage|indexedDB|\.update\(/);
  });

  it('a fixture boot autosaves only where the tools are allowed', () => {
    expect(src('src/game/useAutosave.ts')).toMatch(/q\.get\('autosave'\) === '1' && devToolsAllowed\(\)/);
  });
});

describe('PLAT-005: window.__AQ without the tools is read-only', () => {
  it('has no write call, and exactly the read-only keys', () => {
    const api = readOnlyDebugApi();
    for (const k of WRITE_KEYS) expect(api, k).not.toHaveProperty(k);
    expect(Object.keys(api).sort()).toEqual([...READ_ONLY_KEYS].sort());
  });

  it('the full API (a dev build, or ?dev=1) keeps every write call the QA scripts use', () => {
    const api = debugApi();
    for (const k of WRITE_KEYS) expect(api, k).toHaveProperty(k);
  });

  it('its calls change neither the game nor the settings: state, UI and settings come back as copies', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Probe', seed: 5 });
    useGame.getState().setGame(g);
    const before = stateHash(useGame.getState().game!);
    const settingsBefore = JSON.stringify({ ...useSettings.getState(), update: 0, setVolume: 0, reset: 0 });
    const api = readOnlyDebugApi() as Record<string, (...a: unknown[]) => unknown>;

    const copy = api.state() as GameState;
    copy.finance.money = 1e9;
    (api.game() as GameState).creatures = {};
    const settings = api.settings() as Record<string, unknown>;
    expect(Object.values(settings).some((v) => typeof v === 'function')).toBe(false);
    settings.devMode = true;
    const ui = api.ui() as Record<string, unknown>;
    expect(Object.values(ui).some((v) => typeof v === 'function')).toBe(false);

    api.summary();
    api.getMoney();
    api.listCreatures();
    api.query('evaluateTank', g.tankOrder[0]);
    api.actions();
    api.hash();
    api.stateHash();
    api.exportText();
    api.stats();
    api.memory();

    expect(stateHash(useGame.getState().game!)).toBe(before);
    expect(useGame.getState().game!.finance.money).toBe(g.finance.money);
    expect(JSON.stringify({ ...useSettings.getState(), update: 0, setVolume: 0, reset: 0 })).toBe(settingsBefore);
  });
});
