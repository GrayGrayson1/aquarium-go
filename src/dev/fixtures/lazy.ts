/**
 * On-demand access to the dev fixture registry from the browser app. OWNER: lane "perf2".
 *
 * The registry (./index.ts) imports every fixture builder and the playthrough bot, so the app never imports it
 * statically. It is fetched as its own chunk the first time a `?fixture=` URL, `__AQ.loadFixture`, `__AQ.fixtures()` or
 * a sandbox asks for it. Node code (tests, scripts) keeps importing './index' directly.
 *
 * While a `?fixture=` URL boot is in flight, `window.__AQ.ready` stays false (see src/dev/debugHooks.ts), so e2e tests
 * and QA scripts that wait for `ready` still see the fixture already loaded.
 */
import type { GameState } from '@/types';
import { STARTER_IDS, type StarterId } from '@/data/species';

export type FixtureRegistry = Record<string, () => GameState>;

let registry: FixtureRegistry | null = null;
let loading: Promise<FixtureRegistry> | null = null;

/** Load (once) and return the fixture registry. */
export function loadFixtureRegistry(): Promise<FixtureRegistry> {
  if (registry) return Promise.resolve(registry);
  loading ??= import('./index')
    .then((m) => (registry = m.FIXTURES))
    .catch((e: unknown) => {
      loading = null; // allow a retry (e.g. a flaky network on a deployed build)
      throw e;
    });
  return loading;
}

/** Starter showcases don't need the registry (they are `makeShowcase(id)`, see ./showcase.ts). */
export function isStarterFixture(name: string): name is StarterId {
  return (STARTER_IDS as readonly string[]).includes(name);
}

let bootsInFlight = 0;

/** Hold `__AQ.ready` until `done()` is called. Call before the first render, so nothing sees `ready` too early. */
export function holdReady(): () => void {
  bootsInFlight++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    bootsInFlight--;
  };
}

/** True while a URL fixture boot is still loading. */
export function fixtureBootPending(): boolean {
  return bootsInFlight > 0;
}
