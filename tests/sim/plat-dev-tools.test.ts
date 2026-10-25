// @vitest-environment node
/**
 * lane:core (PLAT-005, ADR-0005 decision 2) — developer tools in production builds: read-only diagnostics always;
 * cheats and save editing (window.__AQ's write calls, the dev panel, fixtures that autosave) only in a dev build or a
 * session opened with ?dev=1, which nothing remembers. chunk 7 (REL-019, ADR-0037 decision 3, B-190): the live site
 * ignores ?dev=1; only a production build made with VITE_E2E_DEV_URL=1 (the e2e build base-path.spec opens) honours it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '@/types';
import { useDevTools, urlDevFlag, devModeOn, devToolsAllowed, devToolsAtBoot, urlSandboxName, urlLabParams, urlScenarioBoot } from '@/state/devTools';
import { useSettings } from '@/state/settings';
import { useGame } from '@/state/game';
import { newGame } from '@/sim/newGame';
import { stateHash } from '@/persistence';
import { debugApi, readOnlyDebugApi, READ_ONLY_KEYS } from '@/dev/debugHooks';
import { urlFixtureName } from '@/game/useAutosave';

const ROOT = join(__dirname, '..', '..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** Calls that change the game, the settings or a save (or load another world). */
const WRITE_KEYS = ['mutate', 'setGame', 'setUI', 'dev', 'newGame', 'loadFixture', 'focusLargestTank', 'advance', 'act', 'save', 'autosave', 'loadAndResume', 'continueGame', 'backdateSave', 'deleteSave', 'importText', 'scenario'];

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

  it('REL-019: the live site ignores ?dev=1; a dev build always has the tools, the e2e-flagged build only with ?dev=1', () => {
    // the players' build (no flag)
    expect(devToolsAtBoot(false, false, '?dev=1')).toBe(false);
    expect(devToolsAtBoot(false, false, '?fixture=big_facility&dev=1')).toBe(false);
    expect(devToolsAtBoot(false, false, '')).toBe(false);
    // the e2e base-path build (VITE_E2E_DEV_URL=1)
    expect(devToolsAtBoot(false, true, '?dev=1')).toBe(true);
    expect(devToolsAtBoot(false, true, '?dev=0')).toBe(false);
    expect(devToolsAtBoot(false, true, '')).toBe(false);
    // a dev build
    expect(devToolsAtBoot(true, false, '')).toBe(true);
    expect(devToolsAtBoot(true, false, '?dev=0')).toBe(true);
    // the store starts from that rule and the build's own flag, nothing else
    expect(src('src/state/devTools.ts')).toMatch(/allowed: devToolsAtBoot\(import\.meta\.env\.DEV, import\.meta\.env\.VITE_E2E_DEV_URL === '1'\)/);
  });

  it("REL-019: the flag is the e2e runs' alone: neither deploy.yml nor render.yaml sets it, and only the base-path build does", () => {
    for (const f of ['.github/workflows/deploy.yml', 'render.yaml']) expect(src(f), f).not.toContain('VITE_E2E_DEV_URL');
    const pw = src('playwright.config.ts');
    expect(pw.match(/VITE_E2E_DEV_URL: '1'/g)?.length).toBe(1);
    expect(pw).toMatch(/env: E2E_DEV_URL_ENV,[\s\S]*\.e2e-dist-prod[\s\S]*env: E2E_ENV,/);
  });

  it('REL-019: ?sandbox= is a developer tool too', () => {
    expect(urlSandboxName('?sandbox=audio-lab')).toBe('audio-lab');
    expect(urlSandboxName('')).toBeNull();
    useDevTools.setState({ allowed: false });
    expect(urlSandboxName('?sandbox=audio-lab')).toBeNull();
    expect(urlSandboxName('?sandbox=audio-lab&dev=1')).toBeNull();
    expect(src('src/App.tsx')).toContain('urlSandboxName()');
    expect(src('src/App.tsx')).not.toMatch(/get\('sandbox'\)/);
  });

  it('chunk 15 (ADR-0051): the scenario lab\u2019s addresses are a developer tool too (one rule for App and the router)', () => {
    expect(urlLabParams('?lab=1')).toEqual({ lab: true, scenario: null, recipe: null });
    expect(urlLabParams('?scenario=ammonia-crisis')).toEqual({ lab: false, scenario: 'ammonia-crisis', recipe: null });
    expect(urlScenarioBoot('?recipe=e30')).toBe(true);
    expect(urlScenarioBoot('?scenario=sandbox')).toBe(true);
    expect(urlScenarioBoot('?lab=1')).toBe(false); // the lab alone builds nothing at boot
    expect(urlLabParams('')).toBeNull();
    expect(urlLabParams('?fixture=big_facility')).toBeNull();
    useDevTools.setState({ allowed: false });
    for (const q of ['?lab=1', '?scenario=sandbox', '?recipe=e30', '?lab=1&dev=1', '?scenario=sandbox&dev=1']) {
      expect(urlLabParams(q), q).toBeNull();
      expect(urlScenarioBoot(q), q).toBe(false);
    }
    expect(src('src/App.tsx')).toContain('urlLabParams()');
    // and the players' build leaves the lab's code out at build time
    expect(src('src/App.tsx')).toMatch(/const LAB_BUILD = import\.meta\.env\.DEV \|\| import\.meta\.env\.VITE_E2E_DEV_URL === '1';/);
    expect(src('src/App.tsx')).toMatch(/const LAB = LAB_BUILD && typeof location !== 'undefined' && devToolsAllowed\(\);/);
    expect(src('src/App.tsx')).toMatch(/const LabRoot = LAB_BUILD \? lazy\(/);
    expect(src('src/App.tsx')).not.toMatch(/get\('(lab|scenario|recipe)'\)/);
    expect(src('src/ui/nav/router.ts')).toContain('urlScenarioBoot(location.search)');
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
    expect(src('src/game/useAutosave.ts')).toMatch(/get\('autosave'\) === '1' && devToolsAllowed\(\)/);
  });

  it('a registry fixture boots only where the tools are allowed; a starter showcase always (one rule for App, autosave and the router)', () => {
    expect(urlFixtureName('?fixture=big_facility')).toBe('big_facility');
    expect(urlFixtureName('?showcase=betta')).toBe('betta');
    expect(urlFixtureName('')).toBeNull();
    useDevTools.setState({ allowed: false });
    expect(urlFixtureName('?fixture=big_facility')).toBeNull();
    expect(urlFixtureName('?showcase=big_facility')).toBeNull();
    expect(urlFixtureName('?fixture=axolotl')).toBe('axolotl');
    expect(urlFixtureName('?showcase=betta&dev=0')).toBe('betta');
    for (const f of ['src/App.tsx', 'src/ui/nav/router.ts']) expect(src(f)).toContain('urlFixtureName(');
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

    // every object a call hands out is a copy: changing it changes nothing (summary's tutorial was live before)
    const summary = api.summary() as { tutorial: { step: number; flags: Record<string, boolean> } };
    summary.tutorial.step = 99;
    summary.tutorial.flags.cheat = true;
    const creatures = api.listCreatures() as { health: number }[];
    for (const c of creatures) c.health = 0;
    const stats = api.stats() as Record<string, unknown>;
    for (const k of Object.keys(stats)) stats[k] = 'changed';
    api.getMoney();
    api.query('evaluateTank', g.tankOrder[0]);
    api.actions();
    api.hash();
    api.stateHash();
    api.exportText();
    api.memory();
    api.resumeSummary();
    api.facilityOverflow();

    expect(useGame.getState().game!.progress.tutorial.step).toBe(g.progress.tutorial.step);
    expect(useGame.getState().game!.progress.tutorial.flags.cheat).toBeUndefined();
    expect(stateHash(useGame.getState().game!)).toBe(before);
    expect(Object.values((debugApi().stats as () => Record<string, unknown>)())).not.toContain('changed');
    expect(useGame.getState().game!.finance.money).toBe(g.finance.money);
    expect(JSON.stringify({ ...useSettings.getState(), update: 0, setVolume: 0, reset: 0 })).toBe(settingsBefore);
  });
});
